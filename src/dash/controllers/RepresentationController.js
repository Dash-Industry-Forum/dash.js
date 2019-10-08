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
import Errors from '../../core/errors/Errors';
import DashConstants from '../constants/DashConstants';
import DashJSError from '../../streaming/vo/DashJSError';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import FactoryMaker from '../../core/FactoryMaker';

function RepresentationController() {

    let context = this.context;
    let eventBus = EventBus(context).getInstance();

    let instance,
        realAdaptation,
        updating,
        voAvailableRepresentations,
        currentVoRepresentation,
        abrController,
        playbackController,
        timelineConverter,
        dashMetrics,
        type,
        streamId,
        manifestModel;

    function setup() {
        resetInitialSettings();

        eventBus.on(Events.QUALITY_CHANGE_REQUESTED, onQualityChanged, instance);
        eventBus.on(Events.REPRESENTATION_UPDATE_COMPLETED, onRepresentationUpdated, instance);
        eventBus.on(Events.WALLCLOCK_TIME_UPDATED, onWallclockTimeUpdated, instance);
        eventBus.on(Events.MANIFEST_VALIDITY_CHANGED, onManifestValidityChanged, instance);
    }

    function setConfig(config) {
        if (config.abrController) {
            abrController = config.abrController;
        }
        if (config.dashMetrics) {
            dashMetrics = config.dashMetrics;
        }
        if (config.playbackController) {
            playbackController = config.playbackController;
        }
        if (config.timelineConverter) {
            timelineConverter = config.timelineConverter;
        }
        if (config.manifestModel) {
            manifestModel = config.manifestModel;
        }
        if (config.type) {
            type = config.type;
        }
        if (config.streamId) {
            streamId = config.streamId;
        }
    }

    function checkConfig() {
        if (!abrController || !dashMetrics || !playbackController ||
            !timelineConverter || !manifestModel) {
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
        abrController = null;
        playbackController = null;
        timelineConverter = null;
        dashMetrics = null;
    }

    function reset() {

        eventBus.off(Events.QUALITY_CHANGE_REQUESTED, onQualityChanged, instance);
        eventBus.off(Events.REPRESENTATION_UPDATE_COMPLETED, onRepresentationUpdated, instance);
        eventBus.off(Events.WALLCLOCK_TIME_UPDATED, onWallclockTimeUpdated, instance);
        eventBus.off(Events.MANIFEST_VALIDITY_CHANGED, onManifestValidityChanged, instance);

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

        updateAvailabilityWindow(playbackController.getIsDynamic(), true);
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
            if (voAvailableRepresentations[i].segmentAvailabilityRange === null || !voAvailableRepresentations[i].hasInitialization() ||
                ((segmentInfoType === DashConstants.SEGMENT_BASE || segmentInfoType === DashConstants.BASE_URL) && !voAvailableRepresentations[i].segments)
            ) {
                return false;
            }
        }

        return true;
    }

    function setExpectedLiveEdge(liveEdge) {
        timelineConverter.setExpectedLiveEdge(liveEdge);
        dashMetrics.updateManifestUpdateInfo({presentationStartTime: liveEdge});
    }

    function updateRepresentation(representation, isDynamic) {
        representation.segmentAvailabilityRange = timelineConverter.calcSegmentAvailabilityRange(representation, isDynamic);

        if ((representation.segmentAvailabilityRange.end < representation.segmentAvailabilityRange.start) && !representation.useCalculatedLiveEdgeTime) {
            let error = new DashJSError(Errors.SEGMENTS_UNAVAILABLE_ERROR_CODE, Errors.SEGMENTS_UNAVAILABLE_ERROR_MESSAGE, {availabilityDelay: representation.segmentAvailabilityRange.start - representation.segmentAvailabilityRange.end});
            endDataUpdate(error);
            return;
        }

        if (isDynamic) {
            setExpectedLiveEdge(representation.segmentAvailabilityRange.end);
        }
    }

    function updateAvailabilityWindow(isDynamic, notifyUpdate) {
        checkConfig();

        for (let i = 0, ln = voAvailableRepresentations.length; i < ln; i++) {
            updateRepresentation(voAvailableRepresentations[i], isDynamic);
            if (notifyUpdate) {
                eventBus.trigger(Events.REPRESENTATION_UPDATE_STARTED, { sender: instance, representation:  voAvailableRepresentations[i]});
            }
        }
    }

    function resetAvailabilityWindow() {
        voAvailableRepresentations.forEach(rep => {
            rep.segmentAvailabilityRange = null;
        });
    }

    function startDataUpdate() {
        updating = true;
        eventBus.trigger(Events.DATA_UPDATE_STARTED, { sender: instance });
    }

    function endDataUpdate(error) {
        updating = false;
        let eventArg = {sender: instance, data: realAdaptation, currentRepresentation: currentVoRepresentation};
        if (error) {
            eventArg.error = error;
        }
        eventBus.trigger(Events.DATA_UPDATE_COMPLETED, eventArg);
    }

    function postponeUpdate(postponeTimePeriod) {
        let delay = postponeTimePeriod;
        let update = function () {
            if (isUpdating()) return;

            startDataUpdate();

            // clear the segmentAvailabilityRange for all reps.
            // this ensures all are updated before the live edge search starts
            resetAvailabilityWindow();

            updateAvailabilityWindow(playbackController.getIsDynamic(), true);
        };
        eventBus.trigger(Events.AST_IN_FUTURE, { delay: delay });
        setTimeout(update, delay);
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
        let postponeTimePeriod = 0;
        let repInfo,
            err,
            repSwitch;

        if (r.adaptation.period.mpd.manifest.type === DashConstants.DYNAMIC && !r.adaptation.period.mpd.manifest.ignorePostponeTimePeriod)
        {
            let segmentAvailabilityTimePeriod = r.segmentAvailabilityRange.end - r.segmentAvailabilityRange.start;
            // We must put things to sleep unless till e.g. the startTime calculation in ScheduleController.onLiveEdgeSearchCompleted fall after the segmentAvailabilityRange.start
            let liveDelay = playbackController.computeLiveDelay(currentVoRepresentation.segmentDuration, streamInfo.manifestInfo.DVRWindowSize);
            postponeTimePeriod = (liveDelay - segmentAvailabilityTimePeriod) * 1000;
        }

        if (postponeTimePeriod > 0) {
            postponeUpdate(postponeTimePeriod);
            err = new DashJSError(Errors.SEGMENTS_UPDATE_FAILED_ERROR_CODE, Errors.SEGMENTS_UPDATE_FAILED_ERROR_MESSAGE);
            endDataUpdate(err);
            return;
        }

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
            dashMetrics.updateManifestUpdateInfo({latency: currentVoRepresentation.segmentAvailabilityRange.end - playbackController.getTime()});

            repSwitch = dashMetrics.getCurrentRepresentationSwitch(getCurrentRepresentation().adaptation.type);

            if (!repSwitch) {
                addRepresentationSwitch();
            }
            endDataUpdate();
        }
    }

    function onWallclockTimeUpdated(e) {
        if (e.isDynamic) {
            updateAvailabilityWindow(e.isDynamic);
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
        setConfig: setConfig,
        getData: getData,
        isUpdating: isUpdating,
        updateData: updateData,
        updateRepresentation: updateRepresentation,
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
