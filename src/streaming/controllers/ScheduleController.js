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

import {PlayListTrace} from '../vo/metrics/PlayList';
import PlaybackController from './PlaybackController';
import AbrController from './AbrController';
import BufferController from './BufferController';
import MediaController from './MediaController';
import BufferLevelRule from '../rules/scheduling/BufferLevelRule';
import NextFragmentRequestRule from '../rules/scheduling/NextFragmentRequestRule';
import TextSourceBuffer from '../TextSourceBuffer';
import MetricsModel from '../models/MetricsModel';
import FragmentModel from '../models/FragmentModel';
import DashMetrics from '../../dash/DashMetrics';
import DashAdapter from '../../dash/DashAdapter';
import SourceBufferController from '../controllers/SourceBufferController';
import LiveEdgeFinder from '../utils/LiveEdgeFinder';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import FactoryMaker from '../../core/FactoryMaker';
import StreamController from '../controllers/StreamController';
import Debug from '../../core/Debug';

function ScheduleController(config) {

    const context = this.context;
    const log = Debug(context).getInstance().log;
    const eventBus = EventBus(context).getInstance();
    const metricsModel = config.metricsModel;
    const manifestModel = config.manifestModel;
    const adapter = config.adapter;
    const dashMetrics = config.dashMetrics;
    const dashManifestModel = config.dashManifestModel;
    const timelineConverter = config.timelineConverter;
    const mediaPlayerModel = config.mediaPlayerModel;

    let instance,
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
        isFragmentProcessingInProgress,
        timeToLoadDelay,
        scheduleTimeout,
        seekTarget,
        playbackController,
        mediaController,
        abrController,
        streamProcessor,
        streamController,
        fragmentController,
        liveEdgeFinder,
        bufferController,
        bufferLevelRule,
        nextFragmentRequestRule,
        scheduleWhilePaused,
        lastQualityIndex,
        lastInitQuality,
        replaceRequestArray;

    function setup() {
        initialPlayback = true;
        lastInitQuality = NaN;
        lastQualityIndex = NaN;
        replaceRequestArray = [];
        isStopped = false;
        playListMetrics = null;
        playListTraceMetrics = null;
        playListTraceMetricsClosed = true;
        isFragmentProcessingInProgress = false;
        timeToLoadDelay = 0;
        seekTarget = NaN;
    }

    function initialize(Type, StreamProcessor) {
        type = Type;
        streamProcessor = StreamProcessor;
        liveEdgeFinder = LiveEdgeFinder(context).getInstance();
        playbackController = PlaybackController(context).getInstance();
        mediaController = MediaController(context).getInstance();
        abrController = AbrController(context).getInstance();
        streamController = StreamController(context).getInstance();
        fragmentController = streamProcessor.getFragmentController();
        bufferController = streamProcessor.getBufferController();
        fragmentModel = fragmentController.getModel(type);
        fragmentModel.setScheduleController(this);
        isDynamic = streamProcessor.isDynamic();
        scheduleWhilePaused = mediaPlayerModel.getScheduleWhilePaused();

        bufferLevelRule = BufferLevelRule(context).create({
            dashMetrics: DashMetrics(context).getInstance(),
            metricsModel: MetricsModel(context).getInstance(),
            textSourceBuffer: TextSourceBuffer(context).getInstance()
        });

        nextFragmentRequestRule = NextFragmentRequestRule(context).create({
            adapter: DashAdapter(context).getInstance(),
            sourceBufferController: SourceBufferController(context).getInstance(),
            textSourceBuffer: TextSourceBuffer(context).getInstance()

        });

        if (dashManifestModel.getIsTextTrack(type)) {
            eventBus.on(Events.TIMED_TEXT_REQUESTED, onTimedTextRequested, this);
        }

        eventBus.on(Events.LIVE_EDGE_SEARCH_COMPLETED, onLiveEdgeSearchCompleted, this);
        eventBus.on(Events.QUALITY_CHANGE_REQUESTED, onQualityChanged, this);
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
        eventBus.on(Events.PLAYBACK_TIME_UPDATED, onPlaybackTimeUpdated, this);
        eventBus.on(Events.URL_RESOLUTION_FAILED, onURLResolutionFailed, this);
        eventBus.on(Events.FRAGMENT_LOADING_ABANDONED, onFragmentLoadingAbandoned, this);
    }

    function start() {
        if (!ready) return;
        addPlaylistTraceMetrics();
        isStopped = false;

        if (initialPlayback) {
            getInitRequest(currentRepresentationInfo.quality);
        } else {
            //schedule will be first called after the init segment is appended. But in the case where we stop and start
            //the ScheduleController E.g dateUpdate on manifest refresh for live streams. we need to start schedule again.
            startScheduleTimer(0);
        }

        if (initialPlayback) {
            initialPlayback = false;
        }
        log('Schedule controller starting for ' + type);
    }

    function stop() {
        if (isStopped) return;
        isStopped = true;
        clearTimeout(scheduleTimeout);
        log('Schedule controller stopping for ' + type);
    }

    function schedule() {

        if (isStopped || isFragmentProcessingInProgress || !bufferController || playbackController.isPaused() && !scheduleWhilePaused) return;

        validateExecutedFragmentRequest();

        const isReplacement = replaceRequestArray.length > 0;
        const readyToLoad = bufferLevelRule.execute(streamProcessor, type, streamController.isVideoTrackPresent());

        if (readyToLoad || isReplacement) {
            const getNextFragment = function () {
                if (currentRepresentationInfo.quality !== lastInitQuality) {
                    lastInitQuality = currentRepresentationInfo.quality;
                    bufferController.switchInitData(streamProcessor.getStreamInfo().id, currentRepresentationInfo.quality);
                } else {

                    const request = nextFragmentRequestRule.execute(streamProcessor, replaceRequestArray.shift());
                    if (request) {
                        fragmentModel.executeRequest(request);
                    } else { //Use case - Playing at the bleeding live edge and frag is not available yet. Cycle back around.
                        isFragmentProcessingInProgress = false;
                        startScheduleTimer(250);
                    }
                }
            };

            isFragmentProcessingInProgress = true;
            if (isReplacement) {
                getNextFragment();
            } else {
                abrController.getPlaybackQuality(streamProcessor, getNextFragment);
            }

        } else {
            startScheduleTimer(500);
        }
    }

    function validateExecutedFragmentRequest() {
        //Validate that the fragment request executed and appended into the source buffer is as
        // good of quality as the current quality and is the correct media track.
        const safeBufferLevel = currentRepresentationInfo.fragmentDuration * 1.5;
        const request = fragmentModel.getRequests({state: FragmentModel.FRAGMENT_MODEL_EXECUTED, time: playbackController.getTime() + safeBufferLevel, threshold: 0})[0];

        if (request && replaceRequestArray.indexOf(request) === -1 && !dashManifestModel.getIsTextTrack(type)) {
            if (!mediaController.isCurrentTrack(request.mediaInfo) || mediaPlayerModel.getFastSwitchEnabled() && request.quality < currentRepresentationInfo.quality &&
                bufferController.getBufferLevel() >= safeBufferLevel && abrController.getAbandonmentStateFor(type) !== AbrController.ABANDON_LOAD) {
                replaceRequest(request);
                log('Reloading outdated fragment at index: ', request.index);
            } else if (request.quality > currentRepresentationInfo.quality) {
                //The buffer has better quality it in then what we would request so set append point to end of buffer!!
                setSeekTarget(playbackController.getTime() + bufferController.getBufferLevel());
            }
        }
    }

    function startScheduleTimer(value) {
        clearTimeout(scheduleTimeout);
        scheduleTimeout = setTimeout(schedule, value);
    }

    function onInitRequested(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor) return;
        getInitRequest(currentRepresentationInfo.quality);
    }

    function getInitRequest(quality) {
        lastInitQuality = quality;

        const request = adapter.getInitRequest(streamProcessor, quality);
        if (request) {
            isFragmentProcessingInProgress = true;
            fragmentModel.executeRequest(request);
        }
    }

    function replaceRequest(request) {
        replaceRequestArray.push(request);
    }

    function onQualityChanged(e) {
        if (type !== e.mediaType || streamProcessor.getStreamInfo().id !== e.streamInfo.id) return;

        currentRepresentationInfo = streamProcessor.getRepresentationInfoForQuality(e.newQuality);

        if (currentRepresentationInfo === null || currentRepresentationInfo === undefined) {
            throw new Error('Unexpected error! - currentRepresentationInfo is null or undefined');
        }

        clearPlayListTraceMetrics(new Date(), PlayListTrace.REPRESENTATION_SWITCH_STOP_REASON);
        addPlaylistTraceMetrics();
    }

    function completeQualityChange(trigger) {
        const item = fragmentModel.getRequests({state: FragmentModel.FRAGMENT_MODEL_EXECUTED, time: playbackController.getTime(), threshold: 0})[0];
        if (item && playbackController.getTime() >= item.startTime ) {
            if (item.quality !== lastQualityIndex && trigger) {
                eventBus.trigger(Events.QUALITY_CHANGE_RENDERED, {mediaType: type, oldQuality: lastQualityIndex, newQuality: item.quality});
            }
            lastQualityIndex = item.quality;
        }
    }

    function onDataUpdateCompleted(e) {
        if (e.error || e.sender.getStreamProcessor() !== streamProcessor) return;
        currentRepresentationInfo = adapter.convertDataToTrack(manifestModel.getValue(), e.currentRepresentation);
    }

    function onStreamInitialized(e) {
        if (e.error || streamProcessor.getStreamInfo().id !== e.streamInfo.id) return;
        currentRepresentationInfo = streamProcessor.getCurrentRepresentationInfo();
        if (!isDynamic || liveEdgeFinder.getLiveEdge() !== null) {
            ready = true;
        }
        if (isStopped) {
            start();
        }
    }

    function onStreamCompleted(e) {
        if (e.fragmentModel !== fragmentModel) return;
        stop();
        isFragmentProcessingInProgress = false;
        log('Stream is complete');
    }

    function onFragmentLoadingCompleted(e) {
        if (e.sender !== fragmentModel) return;

        if (dashManifestModel.getIsTextTrack(type)) {
            isFragmentProcessingInProgress = false;
        }

        if (e.error && e.serviceLocation && !isStopped) {
            replaceRequest(e.request);
        }
    }

    function onPlaybackTimeUpdated() {
        completeQualityChange(true);
    }

    function onBytesAppended(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor) return;
        isFragmentProcessingInProgress = false;
        startScheduleTimer(0);
    }

    function onFragmentLoadingAbandoned(e) {
        if (e.streamProcessor !== streamProcessor) return;
        replaceRequest(e.request);
        isFragmentProcessingInProgress = false;
        startScheduleTimer(0);
    }

    function onDataUpdateStarted(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor) return;
        stop();
    }

    function onBufferCleared(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor) return;
        // after the data has been removed from the buffer we should remove the requests from the list of
        // the executed requests for which playback time is inside the time interval that has been removed from the buffer
        fragmentModel.removeExecutedRequestsBeforeTime(e.to);

        if (e.hasEnoughSpaceToAppend && !bufferController.getIsBufferingCompleted() && isStopped) {
            start();
        }
    }

    function onBufferLevelStateChanged(e) {
        if ((e.sender.getStreamProcessor() === streamProcessor) && e.state === BufferController.BUFFER_EMPTY && !playbackController.isSeeking()) {
            log('Buffer is empty! Stalling!');
            clearPlayListTraceMetrics(new Date(), PlayListTrace.REBUFFERING_REASON);
        }
    }

    function onQuotaExceeded(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor) return;
        stop();
    }

    function onURLResolutionFailed() {
        fragmentModel.abortRequests();
        stop();
    }

    function onTimedTextRequested(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor) return;
        getInitRequest(e.index);
    }

    function onPlaybackStarted() {
        if (isStopped) {
            start();
        }
    }

    function onPlaybackSeeking(e) {
        seekTarget = e.seekTime;
        setTimeToLoadDelay(0);

        if (isStopped) {
            start();
        }

        const manifestUpdateInfo = dashMetrics.getCurrentManifestUpdate(metricsModel.getMetricsFor('stream'));
        const latency = currentRepresentationInfo.DVRWindow ? currentRepresentationInfo.DVRWindow.end - playbackController.getTime() : NaN;
        metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {latency: latency});
    }

    function onPlaybackRateChanged(e) {
        if (playListTraceMetrics) {
            playListTraceMetrics.playbackspeed = e.playbackRate.toString();
        }
    }

    function onLiveEdgeSearchCompleted (e) {
        if (e.error) return;

        const dvrWindowSize = currentRepresentationInfo.mediaInfo.streamInfo.manifestInfo.DVRWindowSize / 2;
        const startTime = e.liveEdge - playbackController.computeLiveDelay(currentRepresentationInfo.fragmentDuration, dvrWindowSize);
        const manifestUpdateInfo = dashMetrics.getCurrentManifestUpdate(metricsModel.getMetricsFor('stream'));
        const currentLiveStart = playbackController.getLiveStartTime();
        const request = adapter.getFragmentRequestForTime(streamProcessor, currentRepresentationInfo, startTime, {ignoreIsFinished: true});

        seekTarget = currentLiveStart;
        if (isNaN(currentLiveStart) || request.startTime > currentLiveStart) {
            playbackController.setLiveStartTime(request.startTime);
            seekTarget = request.startTime;
        }

        metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {
            currentTime: seekTarget,
            presentationStartTime: e.liveEdge,
            latency: e.liveEdge - seekTarget,
            clientTimeOffset: timelineConverter.getClientTimeOffset()
        });

        ready = true;
        if (isStopped) {
            start();
        }
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
        timeToLoadDelay = value;
    }

    function getTimeToLoadDelay() {
        return timeToLoadDelay;
    }

    function getStreamProcessor() {
        return streamProcessor;
    }

    function getBufferTarget() {
        return bufferLevelRule.getBufferTarget(streamProcessor, type, streamController.isVideoTrackPresent());
    }

    function setPlayList(playList) {
        playListMetrics = playList;
    }

    function finalisePlayList(time, reason) {
        clearPlayListTraceMetrics(time, reason);
        playListMetrics = null;
    }

    function clearPlayListTraceMetrics(endTime, stopreason) {
        if (playListMetrics && playListTraceMetricsClosed === false) {
            const startTime = playListTraceMetrics.start;
            const duration = endTime.getTime() - startTime.getTime();
            playListTraceMetrics.duration = duration;
            playListTraceMetrics.stopreason = stopreason;
            playListMetrics.trace.push(playListTraceMetrics);
            playListTraceMetricsClosed = true;
        }
    }

    function addPlaylistTraceMetrics() {
        if (playListMetrics && playListTraceMetricsClosed === true && currentRepresentationInfo) {
            playListTraceMetricsClosed = false;
            playListTraceMetrics = new PlayListTrace();
            playListTraceMetrics.representationid = currentRepresentationInfo.id;
            playListTraceMetrics.start = new Date();
            playListTraceMetrics.mstart = playbackController.getTime() * 1000;
            playListTraceMetrics.playbackspeed = playbackController.getPlaybackRate().toString();
        }
    }

    function reset() {
        eventBus.off(Events.LIVE_EDGE_SEARCH_COMPLETED, onLiveEdgeSearchCompleted, this);
        eventBus.off(Events.DATA_UPDATE_STARTED, onDataUpdateStarted, this);
        eventBus.off(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
        eventBus.off(Events.BUFFER_LEVEL_STATE_CHANGED, onBufferLevelStateChanged, this);
        eventBus.off(Events.QUALITY_CHANGE_REQUESTED, onQualityChanged, this);
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
        eventBus.off(Events.PLAYBACK_TIME_UPDATED, onPlaybackTimeUpdated, this);
        eventBus.off(Events.URL_RESOLUTION_FAILED, onURLResolutionFailed, this);
        eventBus.off(Events.FRAGMENT_LOADING_ABANDONED, onFragmentLoadingAbandoned, this);
        if (dashManifestModel.getIsTextTrack(type)) {
            eventBus.off(Events.TIMED_TEXT_REQUESTED, onTimedTextRequested, this);
        }

        stop();
        completeQualityChange(false);
        isFragmentProcessingInProgress = false;
        timeToLoadDelay = 0;
        seekTarget = NaN;
        playbackController = null;
        playListMetrics = null;
    }

    instance = {
        initialize: initialize,
        getStreamProcessor: getStreamProcessor,
        getSeekTarget: getSeekTarget,
        setSeekTarget: setSeekTarget,
        getFragmentModel: getFragmentModel,
        setTimeToLoadDelay: setTimeToLoadDelay,
        getTimeToLoadDelay: getTimeToLoadDelay,
        replaceRequest: replaceRequest,
        start: start,
        stop: stop,
        reset: reset,
        setPlayList: setPlayList,
        getBufferTarget: getBufferTarget,
        finalisePlayList: finalisePlayList
    };

    setup();

    return instance;
}

ScheduleController.__dashjs_factory_name = 'ScheduleController';
export default FactoryMaker.getClassFactory(ScheduleController);
