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
import DashManifestModel from '../models/DashManifestModel';
import DashMetrics from '../DashMetrics';
import TimelineConverter from '../utils/TimelineConverter';
import AbrController from '../../streaming/controllers/AbrController';
import PlaybackController from '../../streaming/controllers/PlaybackController';
import ManifestModel from '../../streaming/models/ManifestModel';
import MetricsModel from '../../streaming/models/MetricsModel';
import DOMStorage from '../../streaming/utils/DOMStorage';
import Error from '../../streaming/vo/Error';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import MediaPlayerEvents from '../../streaming/MediaPlayerEvents';
import FactoryMaker from '../../core/FactoryMaker';
import Representation from '../vo/Representation';

function RepresentationController() {

    const SEGMENTS_UPDATE_FAILED_ERROR_CODE = 1;

    let context = this.context;
    let eventBus = EventBus(context).getInstance();

    let instance,
        data,
        dataIndex,
        updating,
        voAvailableRepresentations,
        currentVoRepresentation,
        streamProcessor,
        abrController,
        indexHandler,
        playbackController,
        manifestModel,
        metricsModel,
        domStorage,
        timelineConverter,
        dashManifestModel,
        dashMetrics;

    function setup() {
        data = null;
        dataIndex = -1;
        updating = true;
        voAvailableRepresentations = [];

        abrController = AbrController(context).getInstance();
        playbackController = PlaybackController(context).getInstance();
        manifestModel = ManifestModel(context).getInstance();
        metricsModel = MetricsModel(context).getInstance();
        domStorage = DOMStorage(context).getInstance();
        timelineConverter = TimelineConverter(context).getInstance();
        dashManifestModel = DashManifestModel(context).getInstance();
        dashMetrics = DashMetrics(context).getInstance();

        eventBus.on(Events.QUALITY_CHANGE_REQUESTED, onQualityChanged, instance);
        eventBus.on(Events.REPRESENTATION_UPDATED, onRepresentationUpdated, instance);
        eventBus.on(Events.WALLCLOCK_TIME_UPDATED, onWallclockTimeUpdated, instance);
        eventBus.on(Events.BUFFER_LEVEL_UPDATED, onBufferLevelUpdated, instance);
    }

    function setConfig(config) {
        // allow the abrController created in setup to be overidden
        if (config.abrController) {
            abrController = config.abrController;
        }
    }

    function initialize(StreamProcessor) {
        streamProcessor = StreamProcessor;
        indexHandler = streamProcessor.getIndexHandler();
    }

    function getStreamProcessor() {
        return streamProcessor;
    }

    function getData() {
        return data;
    }

    function getDataIndex() {
        return dataIndex;
    }

    function isUpdating() {
        return updating;
    }

    function getCurrentRepresentation() {
        return currentVoRepresentation;
    }

    function reset() {

        eventBus.off(Events.QUALITY_CHANGE_REQUESTED, onQualityChanged, instance);
        eventBus.off(Events.REPRESENTATION_UPDATED, onRepresentationUpdated, instance);
        eventBus.off(Events.WALLCLOCK_TIME_UPDATED, onWallclockTimeUpdated, instance);
        eventBus.off(Events.BUFFER_LEVEL_UPDATED, onBufferLevelUpdated, instance);


        data = null;
        dataIndex = -1;
        updating = true;
        voAvailableRepresentations = [];
        abrController = null;
        playbackController = null;
        manifestModel = null;
        metricsModel = null;
        domStorage = null;
        timelineConverter = null;
        dashManifestModel = null;
        dashMetrics = null;
    }

    function updateData(dataValue, voAdaptation, type) {
        var quality,
            averageThroughput;

        var bitrate = null;
        var streamInfo = streamProcessor.getStreamInfo();
        var maxQuality = abrController.getTopQualityIndexFor(type, streamInfo.id);

        updating = true;
        eventBus.trigger(Events.DATA_UPDATE_STARTED, {sender: this});

        voAvailableRepresentations = updateRepresentations(voAdaptation);

        if (data === null && type !== 'fragmentedText') {
            averageThroughput = abrController.getAverageThroughput(type);
            bitrate = averageThroughput || abrController.getInitialBitrateFor(type, streamInfo);
            quality = abrController.getQualityForBitrate(streamProcessor.getMediaInfo(), bitrate);
        } else {
            quality = abrController.getQualityFor(type, streamInfo);
        }

        if (quality > maxQuality) {
            quality = maxQuality;
        }

        currentVoRepresentation = getRepresentationForQuality(quality);
        data = dataValue;

        if (type !== 'video' && type !== 'audio' && type !== 'fragmentedText') {
            updating = false;
            eventBus.trigger(Events.DATA_UPDATE_COMPLETED, {sender: this, data: data, currentRepresentation: currentVoRepresentation});
            return;
        }

        for (var i = 0; i < voAvailableRepresentations.length; i++) {
            indexHandler.updateRepresentation(voAvailableRepresentations[i], true);
        }
    }

    function addRepresentationSwitch() {
        var now = new Date();
        var currentRepresentation = getCurrentRepresentation();
        var currentVideoTimeMs = playbackController.getTime() * 1000;

        metricsModel.addRepresentationSwitch(currentRepresentation.adaptation.type, now, currentVideoTimeMs, currentRepresentation.id);
    }

    function addDVRMetric() {
        var range = timelineConverter.calcSegmentAvailabilityRange(currentVoRepresentation, streamProcessor.isDynamic());
        metricsModel.addDVRInfo(streamProcessor.getType(), playbackController.getTime(), streamProcessor.getStreamInfo().manifestInfo, range);
    }

    function getRepresentationForQuality(quality) {
        return voAvailableRepresentations[quality];
    }

    function getQualityForRepresentation(voRepresentation) {
        return voAvailableRepresentations.indexOf(voRepresentation);
    }

    function isAllRepresentationsUpdated() {
        for (var i = 0, ln = voAvailableRepresentations.length; i < ln; i++) {
            var segmentInfoType = voAvailableRepresentations[i].segmentInfoType;
            if (voAvailableRepresentations[i].segmentAvailabilityRange === null || !Representation.hasInitialization(voAvailableRepresentations[i]) ||
                    ((segmentInfoType === 'SegmentBase' || segmentInfoType === 'BaseURL') && !voAvailableRepresentations[i].segments)
            ) {
                return false;
            }
        }

        return true;
    }

    function updateRepresentations(voAdaptation) {
        var reps;
        var manifest = manifestModel.getValue();

        dataIndex = dashManifestModel.getIndexForAdaptation(data, manifest, voAdaptation.period.index);
        reps = dashManifestModel.getRepresentationsForAdaptation(voAdaptation);

        return reps;
    }

    function updateAvailabilityWindow(isDynamic) {
        var rep;

        for (var i = 0, ln = voAvailableRepresentations.length; i < ln; i++) {
            rep = voAvailableRepresentations[i];
            rep.segmentAvailabilityRange = timelineConverter.calcSegmentAvailabilityRange(rep, isDynamic);
        }
    }

    function resetAvailabilityWindow() {
        voAvailableRepresentations.forEach(rep => {
            rep.segmentAvailabilityRange = null;
        });
    }

    function postponeUpdate(postponeTimePeriod) {
        var delay = postponeTimePeriod;
        var update = function () {
            if (isUpdating()) return;

            updating = true;
            eventBus.trigger(Events.DATA_UPDATE_STARTED, { sender: instance });

            // clear the segmentAvailabilityRange for all reps.
            // this ensures all are updated before the live edge search starts
            resetAvailabilityWindow();

            for (var i = 0; i < voAvailableRepresentations.length; i++) {
                indexHandler.updateRepresentation(voAvailableRepresentations[i], true);
            }
        };

        updating = false;
        eventBus.trigger(MediaPlayerEvents.AST_IN_FUTURE, { delay: delay });
        setTimeout(update, delay);
    }

    function onRepresentationUpdated(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor || !isUpdating()) return;

        var r = e.representation;
        var streamMetrics = metricsModel.getMetricsFor('stream');
        var metrics = metricsModel.getMetricsFor(getCurrentRepresentation().adaptation.type);
        var manifestUpdateInfo = dashMetrics.getCurrentManifestUpdate(streamMetrics);
        var alreadyAdded = false;
        var postponeTimePeriod = 0;
        var repInfo;
        var err;
        var repSwitch;

        if (r.adaptation.period.mpd.manifest.type === 'dynamic')
        {
            let segmentAvailabilityTimePeriod = r.segmentAvailabilityRange.end - r.segmentAvailabilityRange.start;
            // We must put things to sleep unless till e.g. the startTime calculation in ScheduleController.onLiveEdgeSearchCompleted fall after the segmentAvailabilityRange.start
            let liveDelay = playbackController.computeLiveDelay(currentVoRepresentation.segmentDuration, streamProcessor.getStreamInfo().manifestInfo.DVRWindowSize);
            postponeTimePeriod = (liveDelay - segmentAvailabilityTimePeriod) * 1000;
        }

        if (postponeTimePeriod > 0) {
            addDVRMetric();
            postponeUpdate(postponeTimePeriod);
            err = new Error(SEGMENTS_UPDATE_FAILED_ERROR_CODE, 'Segments update failed', null);
            eventBus.trigger(Events.DATA_UPDATE_COMPLETED, {sender: this, data: data, currentRepresentation: currentVoRepresentation, error: err});

            return;
        }

        if (manifestUpdateInfo) {
            for (var i = 0; i < manifestUpdateInfo.trackInfo.length; i++) {
                repInfo = manifestUpdateInfo.trackInfo[i];
                if (repInfo.index === r.index && repInfo.mediaType === streamProcessor.getType()) {
                    alreadyAdded = true;
                    break;
                }
            }

            if (!alreadyAdded) {
                metricsModel.addManifestUpdateRepresentationInfo(manifestUpdateInfo, r.id, r.index, r.adaptation.period.index,
                        streamProcessor.getType(),r.presentationTimeOffset, r.startNumber, r.segmentInfoType);
            }
        }

        if (isAllRepresentationsUpdated()) {
            updating = false;
            abrController.setPlaybackQuality(streamProcessor.getType(), streamProcessor.getStreamInfo(), getQualityForRepresentation(currentVoRepresentation));
            metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {latency: currentVoRepresentation.segmentAvailabilityRange.end - playbackController.getTime()});

            repSwitch = dashMetrics.getCurrentRepresentationSwitch(metrics);

            if (!repSwitch) {
                addRepresentationSwitch();
            }

            eventBus.trigger(Events.DATA_UPDATE_COMPLETED, {sender: this, data: data, currentRepresentation: currentVoRepresentation});
        }
    }

    function onWallclockTimeUpdated(e) {
        if (e.isDynamic) {
            updateAvailabilityWindow(e.isDynamic);
        }
    }

    function onBufferLevelUpdated(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor) return;
        addDVRMetric();
    }

    function onQualityChanged(e) {
        if (e.mediaType !== streamProcessor.getType() || streamProcessor.getStreamInfo().id !== e.streamInfo.id) return;

        if (e.oldQuality !== e.newQuality) {
            currentVoRepresentation = getRepresentationForQuality(e.newQuality);
            domStorage.setSavedBitrateSettings(e.mediaType, currentVoRepresentation.bandwidth);
            addRepresentationSwitch();
        }
    }

    instance = {
        initialize: initialize,
        setConfig: setConfig,
        getData: getData,
        getDataIndex: getDataIndex,
        isUpdating: isUpdating,
        updateData: updateData,
        getStreamProcessor: getStreamProcessor,
        getCurrentRepresentation: getCurrentRepresentation,
        getRepresentationForQuality: getRepresentationForQuality,
        reset: reset
    };

    setup();
    return instance;
}

RepresentationController.__dashjs_factory_name = 'RepresentationController';
export default FactoryMaker.getClassFactory(RepresentationController);
