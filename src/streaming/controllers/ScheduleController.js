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

import PlayList from '../vo/metrics/PlayList.js';
import ScheduleRulesCollection from '../rules/SchedulingRules/ScheduleRulesCollection.js';
import SwitchRequest from '../rules/SwitchRequest.js';
import PlaybackController from './PlaybackController.js';
import AbrController from './AbrController.js';
import BufferController from './BufferController.js';
import LiveEdgeFinder from '../LiveEdgeFinder.js';
import EventBus from '../../core/EventBus.js';
import Events from '../../core/events/Events.js';
import FactoryMaker from '../../core/FactoryMaker.js';
import Debug from '../../core/Debug.js';

function ScheduleController(config) {

    let context = this.context;
    let log = Debug(context).getInstance().log;
    let eventBus = EventBus(context).getInstance();

    let metricsModel = config.metricsModel;
    let manifestModel = config.manifestModel;
    let adapter = config.adapter;
    let metricsExt = config.metricsExt;
    let manifestExt = config.manifestExt;
    let timelineConverter = config.timelineConverter;
    let scheduleRulesCollection = config.scheduleRulesCollection;
    let rulesController = config.rulesController;
    let mediaPlayerModel = config.mediaPlayerModel;

    let instance,
        fragmentsToLoad,
        type,
        ready,
        fragmentModel,
        isDynamic,
        currentRepresentationInfo,
        initialPlayback,
        isStopped,
        playListMetrics,
        playListTraceMetrics,
        playListTraceMetricsClosed,
        isFragmentLoading,
        timeToloadDelay,
        validateTimeout,
        seekTarget,
        playbackController,
        abrController,
        streamProcessor,
        fragmentController,
        liveEdgeFinder,
        bufferController,
        scheduleWhilePaused;


    function setup() {
        fragmentsToLoad = 0;
        initialPlayback = true;
        isStopped = false;
        playListMetrics = null;
        playListTraceMetrics = null;
        playListTraceMetricsClosed = true;
        isFragmentLoading = false;
        timeToloadDelay = 0;
        seekTarget = NaN;
    }

    function initialize(Type, StreamProcessor) {
        type = Type;
        streamProcessor = StreamProcessor;
        liveEdgeFinder = LiveEdgeFinder(context).getInstance();
        playbackController = PlaybackController(context).getInstance();
        abrController = AbrController(context).getInstance();
        fragmentController = streamProcessor.getFragmentController();
        bufferController = streamProcessor.getBufferController();
        fragmentModel = fragmentController.getModel(this);
        isDynamic = streamProcessor.isDynamic();
        scheduleWhilePaused = mediaPlayerModel.getScheduleWhilePaused();

        if (manifestExt.getIsTextTrack(type)) {
            eventBus.on(Events.TIMED_TEXT_REQUESTED, onTimedTextRequested, this);
        }

        eventBus.on(Events.LIVE_EDGE_SEARCH_COMPLETED, onLiveEdgeSearchCompleted, this);
        eventBus.on(Events.QUALITY_CHANGED, onQualityChanged, this);
        eventBus.on(Events.DATA_UPDATE_STARTED, onDataUpdateStarted, this);
        eventBus.on(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
        eventBus.on(Events.FRAGMENT_LOADING_COMPLETED, onFragmentLoadingCompleted, this);
        eventBus.on(Events.STREAM_COMPLETED, onStreamCompleted, this);
        eventBus.on(Events.STREAM_INITIALIZED, onStreamInitialized, this);
        eventBus.on(Events.BUFFER_LEVEL_STATE_CHANGED, onBufferLevelStateChanged, this);
        eventBus.on(Events.BUFFER_CLEARED, onBufferCleared, this);
        eventBus.on(Events.BYTES_APPENDED, onBytesAppended, this);
        eventBus.on(Events.INIT_REQUESTED, onInitRequested, this);
        eventBus.on(Events.QUOTA_EXCEEDED, onQuotaExceeded, this);
        eventBus.on(Events.BUFFER_LEVEL_STATE_CHANGED, onBufferLevelStateChanged, this);
        eventBus.on(Events.PLAYBACK_STARTED, onPlaybackStarted, this);
        eventBus.on(Events.PLAYBACK_SEEKING, onPlaybackSeeking, this);
        eventBus.on(Events.PLAYBACK_RATE_CHANGED, onPlaybackRateChanged, this);
    }

    function clearPlayListTraceMetrics(endTime, stopreason) {
        var duration = 0;
        var startTime = null;

        if (playListTraceMetricsClosed === false) {
            startTime = playListTraceMetrics.start;
            duration = endTime.getTime() - startTime.getTime();

            playListTraceMetrics.duration = duration;
            playListTraceMetrics.stopreason = stopreason;

            playListTraceMetricsClosed = true;
        }
    }

    function doStart() {
        if (!ready) return;
        isStopped = false;
        if (initialPlayback) {
            initialPlayback = false;
        }
        log('Schedule controller starting for ' + type);
        //if starting from a pause we want to call validate to kick off the cycle that was stopped by pausing stream.
        if (playbackController.getPlayedRanges().length > 0) {
            validate();
        }
    }

    function startOnReady() {
        if (initialPlayback) {
            getInitRequest(currentRepresentationInfo.quality);
            addPlaylistMetrics(PlayList.INITIAL_PLAY_START_REASON);
        }

        doStart();
    }

    function doStop() {
        if (isStopped) return;
        isStopped = true;
        log('Schedule controller stopping for ' + type);
        clearInterval(validateTimeout);
        clearPlayListTraceMetrics(new Date(), PlayList.Trace.USER_REQUEST_STOP_REASON);
    }

    function getInitRequest(quality) {
        var request = adapter.getInitRequest(streamProcessor, quality);

        if (request !== null) {
            fragmentModel.executeRequest(request);
        }

        return request;
    }

    function replaceCanceledRequests(canceledRequests) {
        var ln = canceledRequests.length;
        // EPSILON is used to avoid javascript floating point issue, e.g. if request.startTime = 19.2,
        // request.duration = 3.83, than request.startTime + request.startTime = 19.2 + 1.92 = 21.119999999999997
        var EPSILON = 0.1;
        var request,
            time,
            i;

        for (i = 0; i < ln; i++) {
            request = canceledRequests[i];
            time = request.startTime + (request.duration / 2) + EPSILON;
            request = adapter.getFragmentRequestForTime(streamProcessor, currentRepresentationInfo, time, {timeThreshold: 0, ignoreIsFinished: true});
            fragmentModel.executeRequest(request);
        }
    }

    function validate() {
        if (isStopped || (playbackController.isPaused() && (playbackController.getPlayedRanges().length > 0) && !scheduleWhilePaused)) return;
        getRequiredFragmentCount(onGetRequiredFragmentCount);
        //log("validate", type);
    }

    function getRequiredFragmentCount(callback) {
        var rules = scheduleRulesCollection.getRules(ScheduleRulesCollection.FRAGMENTS_TO_SCHEDULE_RULES);

        rulesController.applyRules(rules, streamProcessor, callback, fragmentsToLoad, function (currentValue, newValue) {
            currentValue = currentValue === SwitchRequest.NO_CHANGE ? 0 : currentValue;
            return Math.max(currentValue, newValue);
        });
    }

    function onGetRequiredFragmentCount(result) {
        fragmentsToLoad = result.value;
        if (fragmentsToLoad > 0 && !bufferController.getIsAppendingInProgress() && !isFragmentLoading) {
            isFragmentLoading = true;
            abrController.getPlaybackQuality(streamProcessor,  getNextFragment(onGetNextFragment));
        } else {
            validateTimeout = setTimeout(function () {
                //log("timeout going back to validate")
                validate();
            }, 1000); //TODO should this be something based on fragment duration?
        }
    }

    function getNextFragment(callback) {
        var rules = scheduleRulesCollection.getRules(ScheduleRulesCollection.NEXT_FRAGMENT_RULES);

        rulesController.applyRules(rules, streamProcessor, callback, null, function (currentValue, newValue) {
            return newValue;
        });
    }

    function onGetNextFragment(result) {
        if (result.value) {
            fragmentModel.executeRequest(result.value);
        }
    }

    function onQualityChanged(e) {
        if (type !== e.mediaType || streamProcessor.getStreamInfo().id !== e.streamInfo.id) return;

        currentRepresentationInfo = streamProcessor.getRepresentationInfoForQuality(e.newQuality);
        if (currentRepresentationInfo === null || currentRepresentationInfo === undefined) {
            throw 'Unexpected error! - currentRepresentationInfo is null or undefined';
        }

        clearPlayListTraceMetrics(new Date(), PlayList.Trace.REPRESENTATION_SWITCH_STOP_REASON);
    }

    function onDataUpdateCompleted(e) {
        if (e.error) return;
        currentRepresentationInfo = adapter.convertDataToTrack(manifestModel.getValue(), e.currentRepresentation);
    }

    function onStreamInitialized(e) {
        if (e.error) return;

        currentRepresentationInfo = streamProcessor.getCurrentRepresentationInfo();

        if (!isDynamic || liveEdgeFinder.getLiveEdge() !== null) {
            ready = true;
        }

        if (ready) {
            startOnReady();
        }
    }

    function onStreamCompleted(e) {
        if (e.fragmentModel !== fragmentModel) return;
        log('Stream is complete');
        clearPlayListTraceMetrics(new Date(), PlayList.Trace.END_OF_CONTENT_STOP_REASON);
    }

    function onFragmentLoadingCompleted(e) {
        if (e.sender !== fragmentModel) return;

        if (!isNaN(e.request.index)) {
            isFragmentLoading = false;
        }
        if (!e.error) return;
        doStop();
    }

    function onBytesAppended(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor) return;

        addPlaylistTraceMetrics();
        validate();
    }

    function onDataUpdateStarted(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor) return;
        doStop();
    }

    function onInitRequested(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor) return;

        getInitRequest(e.requiredQuality);
    }

    function onBufferCleared(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor) return;
        // after the data has been removed from the buffer we should remove the requests from the list of
        // the executed requests for which playback time is inside the time interval that has been removed from the buffer
        fragmentModel.removeExecutedRequestsBeforeTime(e.to);

        if (e.hasEnoughSpaceToAppend && !bufferController.getIsBufferingCompleted()) {
            doStart();
        }
    }

    function onBufferLevelStateChanged(e) {
        if ((e.sender.getStreamProcessor() === streamProcessor) && e.state === BufferController.BUFFER_EMPTY && !playbackController.isSeeking()) {
            log('Stalling Buffer');
            clearPlayListTraceMetrics(new Date(), PlayList.Trace.REBUFFERING_REASON);
        }
    }

    function onQuotaExceeded(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor) return;
        doStop();
    }

    function addPlaylistMetrics(stopReason) {
        var currentTime = new Date();
        var presentationTime = playbackController.getTime();

        clearPlayListTraceMetrics(currentTime, PlayList.Trace.USER_REQUEST_STOP_REASON);
        playListMetrics = metricsModel.addPlayList(type, currentTime, presentationTime, stopReason);
    }

    function addPlaylistTraceMetrics() {
        var currentVideoTime = playbackController.getTime();
        var rate = playbackController.getPlaybackRate();
        var currentTime = new Date();

        if (playListTraceMetricsClosed === true && currentRepresentationInfo && playListMetrics) {
            playListTraceMetricsClosed = false;
            playListTraceMetrics = metricsModel.appendPlayListTrace(playListMetrics, currentRepresentationInfo.id, null, currentTime, currentVideoTime, null, rate, null);
        }
    }

    function onTimedTextRequested(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor) return;
        getInitRequest(e.index);
    }

    function onPlaybackStarted() {
        doStart();
    }

    function onPlaybackSeeking(e) {

        if (!initialPlayback) {
            isFragmentLoading = false;
        }

        var metrics = metricsModel.getMetricsFor('stream');
        var manifestUpdateInfo = metricsExt.getCurrentManifestUpdate(metrics);

        seekTarget = e.seekTime;
        log('seek: ' + seekTarget);
        addPlaylistMetrics(PlayList.SEEK_START_REASON);

        metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {latency: currentRepresentationInfo.DVRWindow.end - playbackController.getTime()});

        if (isDynamic) { // need to validate again for dynamic after first seek
            validate();
        }
    }

    function onPlaybackRateChanged(/*e*/) {
        addPlaylistTraceMetrics();
    }

    function onLiveEdgeSearchCompleted (e) {
        if (e.error) return;

        // step back from a found live edge time to be able to buffer some data
        var liveEdgeTime = e.liveEdge;
        var manifestInfo = currentRepresentationInfo.mediaInfo.streamInfo.manifestInfo;
        var startTime = liveEdgeTime - Math.min((playbackController.getLiveDelay(currentRepresentationInfo.fragmentDuration)), manifestInfo.DVRWindowSize / 2);
        var metrics = metricsModel.getMetricsFor('stream');
        var manifestUpdateInfo = metricsExt.getCurrentManifestUpdate(metrics);
        var currentLiveStart = playbackController.getLiveStartTime();

        var request,
            actualStartTime;

        // get a request for a start time
        request = adapter.getFragmentRequestForTime(streamProcessor, currentRepresentationInfo, startTime, {ignoreIsFinished: true});
        actualStartTime = request.startTime;

        if (isNaN(currentLiveStart) || (actualStartTime > currentLiveStart)) {
            playbackController.setLiveStartTime(actualStartTime);
        }

        metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {currentTime: actualStartTime, presentationStartTime: liveEdgeTime, latency: liveEdgeTime - actualStartTime, clientTimeOffset: timelineConverter.getClientTimeOffset()});

        ready = true;
        startOnReady();
    }

    function getSeekTarget() {
        return seekTarget;
    }

    function setSeekTarget(value) {
        seekTarget = value;
    }

    function getFragmentModel() {
        return fragmentModel;
    }

    function setTimeToLoadDelay(value) {
        timeToloadDelay = value;
    }

    function getTimeToLoadDelay() {
        return timeToloadDelay;
    }

    function getStreamProcessor() {
        return streamProcessor;
    }

    function reset() {
        eventBus.off(Events.LIVE_EDGE_SEARCH_COMPLETED, onLiveEdgeSearchCompleted, this);
        eventBus.off(Events.DATA_UPDATE_STARTED, onDataUpdateStarted, this);
        eventBus.off(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
        eventBus.off(Events.BUFFER_LEVEL_STATE_CHANGED, onBufferLevelStateChanged, this);
        eventBus.off(Events.QUALITY_CHANGED, onQualityChanged, this);
        eventBus.off(Events.FRAGMENT_LOADING_COMPLETED, onFragmentLoadingCompleted, this);
        eventBus.off(Events.STREAM_COMPLETED, onStreamCompleted, this);
        eventBus.off(Events.STREAM_INITIALIZED, onStreamInitialized, this);
        eventBus.off(Events.QUOTA_EXCEEDED, onQuotaExceeded, this);
        eventBus.off(Events.BYTES_APPENDED, onBytesAppended, this);
        eventBus.off(Events.BUFFER_CLEARED, onBufferCleared, this);
        eventBus.off(Events.INIT_REQUESTED, onInitRequested, this);
        eventBus.off(Events.PLAYBACK_RATE_CHANGED, onPlaybackRateChanged, this);
        eventBus.off(Events.PLAYBACK_SEEKING, onPlaybackSeeking, this);
        eventBus.off(Events.PLAYBACK_STARTED, onPlaybackStarted, this);


        if (manifestExt.getIsTextTrack(type)) {
            eventBus.off(Events.TIMED_TEXT_REQUESTED, onTimedTextRequested, this);
        }

        doStop();
        fragmentController.detachModel(fragmentModel);
        isFragmentLoading = false;
        fragmentsToLoad = 0;
        timeToloadDelay = 0;
        seekTarget = NaN;
        playbackController = null;
    }

    instance = {
        initialize: initialize,
        getStreamProcessor: getStreamProcessor,
        getSeekTarget: getSeekTarget,
        setSeekTarget: setSeekTarget,
        getFragmentModel: getFragmentModel,
        setTimeToLoadDelay: setTimeToLoadDelay,
        getTimeToLoadDelay: getTimeToLoadDelay,
        replaceCanceledRequests: replaceCanceledRequests,
        start: doStart,
        stop: doStop,
        reset: reset
    };

    setup();

    return instance;
}

export default FactoryMaker.getClassFactory(ScheduleController);