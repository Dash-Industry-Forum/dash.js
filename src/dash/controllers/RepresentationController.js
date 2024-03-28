/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
import Constants from '../../streaming/constants/Constants';
import FactoryMaker from '../../core/FactoryMaker';
import MediaPlayerEvents from '../../streaming/MediaPlayerEvents';
import {getTimeBasedSegment} from '../utils/SegmentsUtils';
import SwitchRequest from '../../streaming/rules/SwitchRequest';

function RepresentationController(config) {

    config = config || {};
    let context = this.context;
    const eventBus = config.eventBus;
    const events = config.events;
    const abrController = config.abrController;
    const dashMetrics = config.dashMetrics;
    const playbackController = config.playbackController;
    const timelineConverter = config.timelineConverter;
    const type = config.type;
    const streamInfo = config.streamInfo;
    const segmentsController = config.segmentsController;
    const isDynamic = config.isDynamic;
    const adapter = config.adapter;

    let instance,
        realAdaptation,
        updating,
        voAvailableRepresentations,
        mediaInfo,
        currentRepresentationInfo,
        currentVoRepresentation;

    function setup() {
        resetInitialSettings();

        eventBus.on(MediaPlayerEvents.MANIFEST_VALIDITY_CHANGED, onManifestValidityChanged, instance);
    }

    function getStreamId() {
        return streamInfo.id;
    }

    function getType() {
        return type;
    }

    function checkConfig() {
        if (!abrController || !dashMetrics || !playbackController || !timelineConverter) {
            throw new Error(Constants.MISSING_CONFIG_ERROR);
        }
    }

    function getData() {
        return realAdaptation;
    }

    function isUpdating() {
        return updating;
    }

    function getCurrentRepresentation() {
        return currentVoRepresentation;
    }

    function getCurrentRepresentationInfo() {
        return currentRepresentationInfo
    }

    function resetInitialSettings() {
        realAdaptation = null;
        updating = true;
        voAvailableRepresentations = [];
        currentRepresentationInfo = null;
    }

    function reset() {
        eventBus.off(MediaPlayerEvents.MANIFEST_VALIDITY_CHANGED, onManifestValidityChanged, instance);

        resetInitialSettings();
    }

    function updateData(newRealAdaptation, availableRepresentations, type, mInfo, bitrateInfo) {
        return new Promise((resolve, reject) => {
            updating = true;
            mediaInfo = mInfo;
            voAvailableRepresentations = availableRepresentations;
            realAdaptation = newRealAdaptation;
            const rep = bitrateInfo ? getRepresentationForId(bitrateInfo.representationId) : voAvailableRepresentations[0];
            _setCurrentVoRepresentation(rep);

            if (type !== Constants.VIDEO && type !== Constants.AUDIO && (type !== Constants.TEXT || !mInfo.isFragmented)) {
                endDataUpdate();
                resolve();
                return;
            }

            const promises = [];
            for (let i = 0, ln = voAvailableRepresentations.length; i < ln; i++) {
                const currentRep = voAvailableRepresentations[i];
                promises.push(_updateRepresentation(currentRep));
            }

            Promise.all(promises)
                .then(() => {
                    let repSwitch;
                    const switchRequest = SwitchRequest(context).create();
                    switchRequest.bitrateInfo = abrController.getBitrateInfoByRepresentationId(mediaInfo, currentVoRepresentation.id)
                    switchRequest.reason = { rule: this.getClassName() }
                    abrController.setPlaybackQuality(switchRequest);

                    const dvrInfo = dashMetrics.getCurrentDVRInfo(type);
                    if (dvrInfo) {
                        dashMetrics.updateManifestUpdateInfo({ latency: dvrInfo.range.end - playbackController.getTime() });
                    }

                    const currentRep = getCurrentRepresentation();
                    repSwitch = dashMetrics.getCurrentRepresentationSwitch(currentRep.adaptation.type);

                    if (!repSwitch) {
                        _addRepresentationSwitch();
                    }
                    endDataUpdate();
                    resolve();
                })
                .catch((e) => {
                    reject(e)
                })
        })
    }

    function updateDataAfterAdaptationSetQualitySwitch(newRealAdaptation, availableRepresentations, type, mInfo, bitrateInfo) {
        return new Promise((resolve, reject) => {
            updating = true;
            mediaInfo = mInfo;
            voAvailableRepresentations = availableRepresentations;

            const rep = bitrateInfo ? getRepresentationForId(bitrateInfo.representationId) : voAvailableRepresentations[0];
            _setCurrentVoRepresentation(rep);
            _addRepresentationSwitch();
            realAdaptation = newRealAdaptation;

            const promises = [];
            for (let i = 0, ln = voAvailableRepresentations.length; i < ln; i++) {
                const currentRep = voAvailableRepresentations[i];
                promises.push(_updateRepresentation(currentRep));
            }

            Promise.all(promises)
                .then(() => {
                    updating = false;
                    resolve();
                })
                .catch((e) => {
                    reject(e)
                })
        })
    }

    function _updateRepresentation(currentRep) {
        return new Promise((resolve, reject) => {
            const hasInitialization = currentRep.hasInitialization();
            const hasSegments = currentRep.hasSegments();

            // If representation has initialization and segments information we are done
            // otherwise, it means that a request has to be made to get initialization and/or segments information
            const promises = [];

            promises.push(segmentsController.updateInitData(currentRep, hasInitialization));
            promises.push(segmentsController.updateSegmentData(currentRep, hasSegments));

            Promise.all(promises)
                .then((data) => {
                    if (data[0] && !data[0].error) {
                        currentRep = _onInitLoaded(currentRep, data[0]);
                    }
                    if (data[1] && !data[1].error) {
                        currentRep = _onSegmentsLoaded(currentRep, data[1]);
                    }
                    _setMediaFinishedInformation(currentRep);
                    _onRepresentationUpdated(currentRep);
                    resolve();
                })
                .catch((e) => {
                    reject(e);
                });
        });
    }

    function _setMediaFinishedInformation(representation) {
        representation.mediaFinishedInformation = segmentsController.getMediaFinishedInformation(representation);
    }

    function _onInitLoaded(representation, e) {
        if (!e || e.error || !e.representation) {
            return representation;
        }
        return e.representation;
    }

    function _onSegmentsLoaded(representation, e) {
        if (!e || e.error) return;

        const fragments = e.segments;
        const segments = [];
        let count = 0;

        let i,
            len,
            s,
            seg;

        for (i = 0, len = fragments ? fragments.length : 0; i < len; i++) {
            s = fragments[i];

            seg = getTimeBasedSegment(
                timelineConverter,
                isDynamic,
                representation,
                s.startTime,
                s.duration,
                s.timescale,
                s.media,
                s.mediaRange,
                count);

            if (seg) {
                segments.push(seg);
                seg = null;
                count++;
            }
        }

        if (segments.length > 0) {
            representation.segments = segments;
        }

        return representation;
    }

    function _addRepresentationSwitch() {
        checkConfig();
        const now = new Date();
        const currentRepresentation = getCurrentRepresentation();
        const currentVideoTimeMs = playbackController.getTime() * 1000;
        if (currentRepresentation) {
            dashMetrics.addRepresentationSwitch(currentRepresentation.adaptation.type, now, currentVideoTimeMs, currentRepresentation.id);
        }

        eventBus.trigger(MediaPlayerEvents.REPRESENTATION_SWITCH, {
            mediaType: type,
            streamId: streamInfo.id,
            mediaInfo,
            currentRepresentation,
            numberOfRepresentations: voAvailableRepresentations.length
        }, { streamId: streamInfo.id, mediaType: type })
    }

    function getRepresentationForId(id) {
        const rep = voAvailableRepresentations.filter((rep) => {
            return rep.id === id
        })[0]

        if (rep) {
            return rep
        }

        return voAvailableRepresentations[0];
    }

    function endDataUpdate() {
        updating = false;
        eventBus.trigger(events.DATA_UPDATE_COMPLETED,
            {
                data: realAdaptation,
                currentRepresentation: currentVoRepresentation
            },
            { streamId: streamInfo.id, mediaType: type }
        );
    }

    function _onRepresentationUpdated(r) {
        let manifestUpdateInfo = dashMetrics.getCurrentManifestUpdate();
        let alreadyAdded = false;
        let repInfo;

        if (manifestUpdateInfo) {
            for (let i = 0; i < manifestUpdateInfo.representationInfo.length; i++) {
                repInfo = manifestUpdateInfo.representationInfo[i];
                if (repInfo.index === r.index && repInfo.mediaType === getType()) {
                    alreadyAdded = true;
                    break;
                }
            }

            if (!alreadyAdded) {
                dashMetrics.addManifestUpdateRepresentationInfo(r, getType());
            }
        }
    }

    function prepareQualityChange(id) {
        const newRep = getRepresentationForId(id)
        _setCurrentVoRepresentation(newRep);
        _addRepresentationSwitch();
    }

    function _setCurrentVoRepresentation(value) {
        currentVoRepresentation = value;
        currentRepresentationInfo = adapter.convertRepresentationToRepresentationInfo(currentVoRepresentation);
    }

    function setMediaInfo(mInfo) {
        mediaInfo = mInfo;
    }

    function onManifestValidityChanged(e) {
        if (e.newDuration) {
            const representation = getCurrentRepresentation();
            if (representation && representation.adaptation.period) {
                const period = representation.adaptation.period;
                period.duration = e.newDuration;
            }
        }
    }

    instance = {
        getStreamId,
        getType,
        getData,
        isUpdating,
        updateData,
        updateDataAfterAdaptationSetQualitySwitch,
        getCurrentRepresentation,
        getRepresentationForId,
        getCurrentRepresentationInfo,
        prepareQualityChange,
        setMediaInfo,
        reset
    };

    setup();
    return instance;
}

RepresentationController.__dashjs_factory_name = 'RepresentationController';
export default FactoryMaker.getClassFactory(RepresentationController);
