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

function RepresentationController(config) {

    config = config || {};
    const eventBus = config.eventBus;
    const events = config.events;
    const abrController = config.abrController;
    const dashMetrics = config.dashMetrics;
    const playbackController = config.playbackController;
    const timelineConverter = config.timelineConverter;
    const type = config.type;
    const streamId = config.streamId;
    const dashConstants = config.dashConstants;

    let instance,
        realAdaptation,
        updating,
        voAvailableRepresentations,
        currentVoRepresentation;

    function setup() {
        resetInitialSettings();

        eventBus.on(events.QUALITY_CHANGE_REQUESTED, onQualityChanged, instance);
        eventBus.on(events.REPRESENTATION_UPDATE_COMPLETED, onRepresentationUpdated, instance);
        eventBus.on(events.MANIFEST_VALIDITY_CHANGED, onManifestValidityChanged, instance);
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

    function resetInitialSettings() {
        realAdaptation = null;
        updating = true;
        voAvailableRepresentations = [];
    }

    function reset() {

        eventBus.off(events.QUALITY_CHANGE_REQUESTED, onQualityChanged, instance);
        eventBus.off(events.REPRESENTATION_UPDATE_COMPLETED, onRepresentationUpdated, instance);
        eventBus.off(events.MANIFEST_VALIDITY_CHANGED, onManifestValidityChanged, instance);

        resetInitialSettings();
    }

    function getType() {
        return type;
    }

    function getStreamId() {
        return streamId;
    }

    function updateData(newRealAdaptation, availableRepresentations, type, quality) {
        checkConfig();

        startDataUpdate();

        voAvailableRepresentations = availableRepresentations;

        currentVoRepresentation = getRepresentationForQuality(quality);
        realAdaptation = newRealAdaptation;

        if (type !== Constants.VIDEO && type !== Constants.AUDIO && type !== Constants.FRAGMENTED_TEXT) {
            endDataUpdate();
            return;
        }

        for (let i = 0, ln = voAvailableRepresentations.length; i < ln; i++) {
            eventBus.trigger(events.REPRESENTATION_UPDATE_STARTED, {
                sender: instance,
                representation: voAvailableRepresentations[i]
            });
        }
    }

    function addRepresentationSwitch() {
        checkConfig();
        const now = new Date();
        const currentRepresentation = getCurrentRepresentation();
        const currentVideoTimeMs = playbackController.getTime() * 1000;
        if (currentRepresentation) {
            dashMetrics.addRepresentationSwitch(currentRepresentation.adaptation.type, now, currentVideoTimeMs, currentRepresentation.id);
        }
    }

    function getRepresentationForQuality(quality) {
        return quality === null || quality === undefined || quality >= voAvailableRepresentations.length ? null : voAvailableRepresentations[quality];
    }

    function getQualityForRepresentation(voRepresentation) {
        return voAvailableRepresentations.indexOf(voRepresentation);
    }

    function isAllRepresentationsUpdated() {
        for (let i = 0, ln = voAvailableRepresentations.length; i < ln; i++) {
            let segmentInfoType = voAvailableRepresentations[i].segmentInfoType;
            if (!voAvailableRepresentations[i].hasInitialization() ||
                ((segmentInfoType === dashConstants.SEGMENT_BASE || segmentInfoType === dashConstants.BASE_URL) && !voAvailableRepresentations[i].segments)
            ) {
                return false;
            }
        }

        return true;
    }

    function startDataUpdate() {
        updating = true;
        eventBus.trigger(events.DATA_UPDATE_STARTED, {sender: instance});
    }

    function endDataUpdate(error) {
        updating = false;
        let eventArg = {sender: instance, data: realAdaptation, currentRepresentation: currentVoRepresentation};
        if (error) {
            eventArg.error = error;
        }
        eventBus.trigger(events.DATA_UPDATE_COMPLETED, eventArg);
    }

    function onRepresentationUpdated(e) {
        if (e.sender.getType() !== getType() || e.sender.getStreamInfo().id !== streamId || !isUpdating()) return;

        if (e.error) {
            endDataUpdate(e.error);
            return;
        }

        let streamInfo = e.sender.getStreamInfo();
        let r = e.representation;
        let manifestUpdateInfo = dashMetrics.getCurrentManifestUpdate();
        let alreadyAdded = false;
        let repInfo,
            repSwitch;


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

        if (isAllRepresentationsUpdated()) {
            abrController.setPlaybackQuality(getType(), streamInfo, getQualityForRepresentation(currentVoRepresentation));
            const dvrInfo = dashMetrics.getCurrentDVRInfo();
            if (dvrInfo) {
                dashMetrics.updateManifestUpdateInfo({latency: dvrInfo.range.end - playbackController.getTime()});
            }

            repSwitch = dashMetrics.getCurrentRepresentationSwitch(getCurrentRepresentation().adaptation.type);

            if (!repSwitch) {
                addRepresentationSwitch();
            }
            endDataUpdate();
        }
    }

    function onQualityChanged(e) {
        if (e.mediaType !== getType() || streamId !== e.streamInfo.id) return;

        currentVoRepresentation = getRepresentationForQuality(e.newQuality);
        addRepresentationSwitch();
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
        getData: getData,
        isUpdating: isUpdating,
        updateData: updateData,
        getCurrentRepresentation: getCurrentRepresentation,
        getRepresentationForQuality: getRepresentationForQuality,
        getType: getType,
        getStreamId: getStreamId,
        reset: reset
    };

    setup();
    return instance;
}

RepresentationController.__dashjs_factory_name = 'RepresentationController';
export default FactoryMaker.getClassFactory(RepresentationController);
