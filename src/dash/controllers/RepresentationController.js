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
import Constants from '../../streaming/constants/Constants.js';
import FactoryMaker from '../../core/FactoryMaker.js';
import MediaPlayerEvents from '../../streaming/MediaPlayerEvents.js';
import {getTimeBasedSegment} from '../utils/SegmentsUtils.js';

function RepresentationController(config) {

    config = config || {};
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

    let instance,
        voAvailableRepresentations,
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

    function getCurrentRepresentation(selectByType = true) {
        let representation = null;
        if (!selectByType || currentVoRepresentation?.mediaInfo.type === type) {
            representation = currentVoRepresentation;
        }
        else {
            let currentVoRepDep = currentVoRepresentation?.dependentRepresentation;
            if (currentVoRepDep) {
                if (!currentVoRepDep.mediaInfo) {
                    throw new Error('dependentRepresentation has no mediaInfo!');
                }
                if (currentVoRepDep.mediaInfo.type === type) {
                    representation = currentVoRepDep;
                }
            }
        }
        return representation;
    }

    function resetInitialSettings() {
        currentVoRepresentation = null;
        voAvailableRepresentations = [];
    }

    function reset() {
        eventBus.off(MediaPlayerEvents.MANIFEST_VALIDITY_CHANGED, onManifestValidityChanged, instance);

        resetInitialSettings();
    }

    function updateData(availableRepresentations, isFragmented, selectedRepresentationId) {
        return new Promise((resolve, reject) => {
            voAvailableRepresentations = availableRepresentations;

            // Override selected with the dependent representation
            const selectedRepresentation = getRepresentationById(selectedRepresentationId);
            _setCurrentVoRepresentation(selectedRepresentation);

            if (type !== Constants.VIDEO && type !== Constants.ENHANCEMENT && type !== Constants.AUDIO && (type !== Constants.TEXT || !isFragmented)) {
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
                    _onAllRepresentationsUpdated();
                    resolve();
                })
                .catch((e) => {
                    reject(e);
                })
        })
    }

    function _onAllRepresentationsUpdated() {
        abrController.setPlaybackQuality(type, streamInfo, currentVoRepresentation);
        const dvrInfo = dashMetrics.getCurrentDVRInfo(type);
        if (dvrInfo) {
            dashMetrics.updateManifestUpdateInfo({ latency: dvrInfo.range.end - playbackController.getTime() });
        }

        endDataUpdate();
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
                    currentRep.fragmentDuration = currentRep.segmentDuration ? currentRep.segmentDuration : currentRep.segments && currentRep.segments.length > 0 ? currentRep.segments[0].duration : NaN;
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
        if (!e || e.error) {
            return;
        }

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

    function _addRepresentationSwitch(currentRepresentation) {
        checkConfig();
        const now = new Date();
        const currentVideoTimeMs = playbackController.getTime() * 1000;
        if (currentRepresentation) {
            dashMetrics.addRepresentationSwitch(currentRepresentation.adaptation.type, now, currentVideoTimeMs, currentRepresentation.id);
        }

        eventBus.trigger(MediaPlayerEvents.REPRESENTATION_SWITCH, {
            mediaType: type,
            streamId: streamInfo.id,
            currentRepresentation,
        }, { streamId: streamInfo.id, mediaType: type })
    }

    function getRepresentationById(id) {
        if (!voAvailableRepresentations || voAvailableRepresentations.length === 0) {
            return null;
        }

        const reps = voAvailableRepresentations.filter((rep) => {
            return rep.id === id;
        })

        if (reps.length > 0) {
            return reps[0]
        }

        return null;
    }

    function endDataUpdate(error) {
        eventBus.trigger(events.DATA_UPDATE_COMPLETED,
            {
                currentRepresentation: currentVoRepresentation,
                error: error
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

    /**
     * We get the new selected Representation which will not hold the ranges and the segment references in case of SegmentBase.
     * In any case use the id to find the right Representation instance in our array of Representations.
     * @param newRep
     */
    function prepareQualityChange(newRep) {
        const voRepresentations = voAvailableRepresentations.filter((rep) => {
            return rep.id === newRep.id;
        })

        if (voRepresentations.length > 0) {
            _setCurrentVoRepresentation(voRepresentations[0]);
        }
    }

    function _setCurrentVoRepresentation(value) {
        if (!currentVoRepresentation || currentVoRepresentation.id !== value.id) {
            let dependentRep = value.dependentRepresentation;
            let switchRep = (dependentRep && dependentRep.mediaInfo && dependentRep.mediaInfo.type === type) ? dependentRep : value;
            _addRepresentationSwitch(switchRep);
        }
        currentVoRepresentation = value;
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
        getCurrentRepresentation,
        getRepresentationById,
        getStreamId,
        getType,
        prepareQualityChange,
        reset,
        updateData,
    };

    setup();
    return instance;
}

RepresentationController.__dashjs_factory_name = 'RepresentationController';
export default FactoryMaker.getClassFactory(RepresentationController);
