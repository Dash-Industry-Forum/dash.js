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
import Constants from '../constants/Constants';
import {PlayListTrace} from '../vo/metrics/PlayList';
import AbrController from './AbrController';
import BufferController from './BufferController';
import BufferLevelRule from '../rules/scheduling/BufferLevelRule';
import NextFragmentRequestRule from '../rules/scheduling/NextFragmentRequestRule';
import FragmentModel from '../models/FragmentModel';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import FactoryMaker from '../../core/FactoryMaker';
import Debug from '../../core/Debug';
import MediaController from './MediaController';

function ScheduleController(config) {

    config = config || {};
    const context = this.context;
    const eventBus = EventBus(context).getInstance();
    const metricsModel = config.metricsModel;
    const adapter = config.adapter;
    const dashMetrics = config.dashMetrics;
    const dashManifestModel = config.dashManifestModel;
    const timelineConverter = config.timelineConverter;
    const mediaPlayerModel = config.mediaPlayerModel;
    const abrController = config.abrController;
    const playbackController = config.playbackController;
    const streamController = config.streamController;
    const textController = config.textController;
    const type = config.type;
    const streamProcessor = config.streamProcessor;
    const mediaController = config.mediaController;

    let instance,
        logger,
        fragmentModel,
        currentRepresentationInfo,
        initialRequest,
        isStopped,
        playListMetrics,
        playListTraceMetrics,
        playListTraceMetricsClosed,
        isFragmentProcessingInProgress,
        timeToLoadDelay,
        scheduleTimeout,
        seekTarget,
        bufferLevelRule,
        nextFragmentRequestRule,
        scheduleWhilePaused,
        lastFragmentRequest,
        topQualityIndex,
        lastInitQuality,
        replaceRequestArray,
        switchTrack,
        bufferResetInProgress,
        mediaRequest;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        resetInitialSettings();
    }

    function initialize() {
        fragmentModel = streamProcessor.getFragmentModel();
        scheduleWhilePaused = mediaPlayerModel.getScheduleWhilePaused();

        bufferLevelRule = BufferLevelRule(context).create({
            abrController: abrController,
            dashMetrics: dashMetrics,
            metricsModel: metricsModel,
            mediaPlayerModel: mediaPlayerModel,
            textController: textController
        });

        nextFragmentRequestRule = NextFragmentRequestRule(context).create({
            adapter: adapter,
            textController: textController
        });

        if (dashManifestModel.getIsTextTrack(config.mimeType)) {
            eventBus.on(Events.TIMED_TEXT_REQUESTED, onTimedTextRequested, this);
        }

        //eventBus.on(Events.LIVE_EDGE_SEARCH_COMPLETED, onLiveEdgeSearchCompleted, this);
        eventBus.on(Events.QUALITY_CHANGE_REQUESTED, onQualityChanged, this);
        eventBus.on(Events.DATA_UPDATE_STARTED, onDataUpdateStarted, this);
        eventBus.on(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
        eventBus.on(Events.FRAGMENT_LOADING_COMPLETED, onFragmentLoadingCompleted, this);
        eventBus.on(Events.STREAM_COMPLETED, onStreamCompleted, this);
        eventBus.on(Events.STREAM_INITIALIZED, onStreamInitialized, this);
        eventBus.on(Events.BUFFER_LEVEL_STATE_CHANGED, onBufferLevelStateChanged, this);
        eventBus.on(Events.BUFFER_CLEARED, onBufferCleared, this);
        eventBus.on(Events.BYTES_APPENDED_END_FRAGMENT, onBytesAppended, this);
        eventBus.on(Events.INIT_REQUESTED, onInitRequested, this);
        eventBus.on(Events.QUOTA_EXCEEDED, onQuotaExceeded, this);
        eventBus.on(Events.PLAYBACK_SEEKING, onPlaybackSeeking, this);
        eventBus.on(Events.PLAYBACK_STARTED, onPlaybackStarted, this);
        eventBus.on(Events.PLAYBACK_RATE_CHANGED, onPlaybackRateChanged, this);
        eventBus.on(Events.PLAYBACK_TIME_UPDATED, onPlaybackTimeUpdated, this);
        eventBus.on(Events.URL_RESOLUTION_FAILED, onURLResolutionFailed, this);
        eventBus.on(Events.FRAGMENT_LOADING_ABANDONED, onFragmentLoadingAbandoned, this);
    }

    function isStarted() {
        return (isStopped === false);
    }

    function start() {
        if (!currentRepresentationInfo || streamProcessor.isBufferingCompleted()) {
            logger.warn('Start denied to Schedule Controller');
            return;
        }
        logger.debug('Schedule Controller starts');
        addPlaylistTraceMetrics();
        isStopped = false;

        if (initialRequest) {
            initialRequest = false;
        }

        startScheduleTimer(0);
    }

    function stop() {
        if (isStopped) {
            return;
        }
        logger.debug('Schedule Controller stops');
        isStopped = true;
        clearTimeout(scheduleTimeout);
    }

    function hasTopQualityChanged(type, id) {
        topQualityIndex[id] = topQualityIndex[id] || {};
        const newTopQualityIndex = abrController.getTopQualityIndexFor(type, id);

        if (topQualityIndex[id][type] != newTopQualityIndex) {
            logger.info('Top quality ' + type + ' index has changed from ' + topQualityIndex[id][type] + ' to ' + newTopQualityIndex);
            topQualityIndex[id][type] = newTopQualityIndex;
            return true;
        }
        return false;

    }

    function schedule() {
        if (isStopped || isFragmentProcessingInProgress || !streamProcessor.getBufferController() || playbackController.isPaused() && !scheduleWhilePaused) {
            logger.debug('Schedule stop!');
            return;
        }

        validateExecutedFragmentRequest();

        const isReplacement = replaceRequestArray.length > 0;
        const streamInfo = streamProcessor.getStreamInfo();
        if (bufferResetInProgress || isNaN(lastInitQuality) || switchTrack || isReplacement ||
            hasTopQualityChanged(currentRepresentationInfo.mediaInfo.type, streamInfo.id) ||
            bufferLevelRule.execute(streamProcessor, type, streamController.isVideoTrackPresent())) {

            const getNextFragment = function () {
                const fragmentController = streamProcessor.getFragmentController();
                if (currentRepresentationInfo.quality !== lastInitQuality) {
                    logger.debug('Quality has changed, get init request for representationid = ' + currentRepresentationInfo.id);
                    lastInitQuality = currentRepresentationInfo.quality;
                    streamProcessor.switchInitData(currentRepresentationInfo.id);
                } else if (switchTrack) {
                    logger.debug('Switch track has been asked, get init request for ' + type + ' with representationid = ' + currentRepresentationInfo.id);
                    bufferResetInProgress = mediaController.getSwitchMode(type) === MediaController.TRACK_SWITCH_MODE_ALWAYS_REPLACE ? true : false;
                    streamProcessor.switchInitData(currentRepresentationInfo.id, bufferResetInProgress);
                    lastInitQuality = currentRepresentationInfo.quality;
                    switchTrack = false;
                } else {
                    const replacement = replaceRequestArray.shift();

                    if (fragmentController.isInitializationRequest(replacement)) {
                        // To be sure the specific init segment had not already been loaded.
                        streamProcessor.switchInitData(replacement.representationId);
                    } else {
                        let request;
                        // Don't schedule next fragments while pruning to avoid buffer inconsistencies
                        if (!streamProcessor.getBufferController().getIsPruningInProgress()) {
                            request = nextFragmentRequestRule.execute(streamProcessor, replacement);
                            if (!request && streamInfo.manifestInfo && streamInfo.manifestInfo.isDynamic) {
                                logger.info('Playing at the bleeding live edge and frag is not available yet');
                            }
                        }

                        if (request) {
                            logger.debug('getNextFragment - request is ' + request.url);
                            fragmentModel.executeRequest(request);
                        } else { // Use case - Playing at the bleeding live edge and frag is not available yet. Cycle back around.
                            setFragmentProcessState(false);
                            startScheduleTimer(mediaPlayerModel.getLowLatencyEnabled() ? 100 : 500);
                        }
                    }
                }
            };

            setFragmentProcessState(true);
            if (!isReplacement && !switchTrack) {
                abrController.checkPlaybackQuality(type);
            }

            getNextFragment();

        } else {
            startScheduleTimer(500);
        }
    }

    function validateExecutedFragmentRequest() {
        // Validate that the fragment request executed and appended into the source buffer is as
        // good of quality as the current quality and is the correct media track.
        const safeBufferLevel = currentRepresentationInfo.fragmentDuration * 1.5;
        const request = fragmentModel.getRequests({
            state: FragmentModel.FRAGMENT_MODEL_EXECUTED,
            time: playbackController.getTime() + safeBufferLevel,
            threshold: 0
        })[0];

        if (request && replaceRequestArray.indexOf(request) === -1 && !dashManifestModel.getIsTextTrack(type)) {
            const fastSwitchModeEnabled = mediaPlayerModel.getFastSwitchEnabled();
            const bufferLevel = streamProcessor.getBufferLevel();
            const abandonmentState = abrController.getAbandonmentStateFor(type);

            // Only replace on track switch when NEVER_REPLACE
            const trackChanged = !mediaController.isCurrentTrack(request.mediaInfo) && mediaController.getSwitchMode(request.mediaInfo.type) === MediaController.TRACK_SWITCH_MODE_NEVER_REPLACE;
            const qualityChanged = request.quality < currentRepresentationInfo.quality;

            if (fastSwitchModeEnabled && (trackChanged || qualityChanged) && bufferLevel >= safeBufferLevel && abandonmentState !== AbrController.ABANDON_LOAD) {
                replaceRequest(request);
                logger.debug('Reloading outdated fragment at index: ', request.index);
            } else if (request.quality > currentRepresentationInfo.quality) {
                // The buffer has better quality it in then what we would request so set append point to end of buffer!!
                setSeekTarget(playbackController.getTime() + streamProcessor.getBufferLevel());
            }
        }
    }

    function startScheduleTimer(value) {
        clearTimeout(scheduleTimeout);
        scheduleTimeout = setTimeout(schedule, value);
    }

    function onInitRequested(e) {
        if (!e.sender || e.sender.getStreamProcessor() !== streamProcessor) {
            return;
        }

        getInitRequest(currentRepresentationInfo.quality);
    }

    function setFragmentProcessState (state) {
        if (isFragmentProcessingInProgress !== state ) {
            isFragmentProcessingInProgress = state;
        } else {
            logger.debug('isFragmentProcessingInProgress is already equal to', state);
        }
    }

    function getInitRequest(quality) {
        const request = adapter.getInitRequest(streamProcessor, quality);
        if (request) {
            setFragmentProcessState(true);
            fragmentModel.executeRequest(request);
        }
    }

    function switchTrackAsked() {
        switchTrack = true;
    }

    function replaceRequest(request) {
        replaceRequestArray.push(request);
    }

    function onQualityChanged(e) {
        if (type !== e.mediaType || streamProcessor.getStreamInfo().id !== e.streamInfo.id) {
            return;
        }

        currentRepresentationInfo = streamProcessor.getRepresentationInfoForQuality(e.newQuality);

        if (currentRepresentationInfo === null || currentRepresentationInfo === undefined) {
            throw new Error('Unexpected error! - currentRepresentationInfo is null or undefined');
        }

        clearPlayListTraceMetrics(new Date(), PlayListTrace.REPRESENTATION_SWITCH_STOP_REASON);
        addPlaylistTraceMetrics();
    }

    function completeQualityChange(trigger) {
        if (playbackController && fragmentModel) {
            const item = fragmentModel.getRequests({
                state: FragmentModel.FRAGMENT_MODEL_EXECUTED,
                time: playbackController.getTime(),
                threshold: 0
            })[0];
            if (item && playbackController.getTime() >= item.startTime) {
                if ((!lastFragmentRequest.mediaInfo || (item.mediaInfo.type === lastFragmentRequest.mediaInfo.type && item.mediaInfo.id !== lastFragmentRequest.mediaInfo.id)) && trigger) {
                    eventBus.trigger(Events.TRACK_CHANGE_RENDERED, {
                        mediaType: type,
                        oldMediaInfo: lastFragmentRequest.mediaInfo,
                        newMediaInfo: item.mediaInfo
                    });
                }
                if ((item.quality !== lastFragmentRequest.quality || item.adaptationIndex !== lastFragmentRequest.adaptationIndex) && trigger) {
                    eventBus.trigger(Events.QUALITY_CHANGE_RENDERED, {
                        mediaType: type,
                        oldQuality: lastFragmentRequest.quality,
                        newQuality: item.quality
                    });
                }
                lastFragmentRequest = {
                    mediaInfo: item.mediaInfo,
                    quality: item.quality,
                    adaptationIndex: item.adaptationIndex
                };
            }
        }
    }

    function onDataUpdateCompleted(e) {
        if (e.error || e.sender.getStreamProcessor() !== streamProcessor) {
            return;
        }

        currentRepresentationInfo = adapter.convertDataToRepresentationInfo(e.currentRepresentation);
    }

    function onStreamInitialized(e) {
        if (e.error || streamProcessor.getStreamInfo().id !== e.streamInfo.id) {
            return;
        }

        currentRepresentationInfo = streamProcessor.getCurrentRepresentationInfo();

        if (initialRequest) {
            if (playbackController.getIsDynamic()) {
                timelineConverter.setTimeSyncCompleted(true);
                setLiveEdgeSeekTarget();
            } else {
                seekTarget = playbackController.getStreamStartTime(false);
                streamProcessor.getBufferController().setSeekStartTime(seekTarget);
            }
        }

        if (isStopped) {
            start();
        }
    }

    function setLiveEdgeSeekTarget() {
        const liveEdgeFinder = streamProcessor.getLiveEdgeFinder();
        if (liveEdgeFinder) {
            const liveEdge = liveEdgeFinder.getLiveEdge();
            const dvrWindowSize = currentRepresentationInfo.mediaInfo.streamInfo.manifestInfo.DVRWindowSize / 2;
            const startTime = liveEdge - playbackController.computeLiveDelay(currentRepresentationInfo.fragmentDuration, dvrWindowSize);
            const request = adapter.getFragmentRequestForTime(streamProcessor, currentRepresentationInfo, startTime, {
                ignoreIsFinished: true
            });

            if (request) {
                // When low latency mode is selected but browser doesn't support fetch
                // start at the beginning of the segment to avoid consuming the whole buffer
                if (mediaPlayerModel.getLowLatencyEnabled()) {
                    const liveStartTime = request.duration < mediaPlayerModel.getLiveDelay() ? request.startTime : request.startTime + request.duration - mediaPlayerModel.getLiveDelay();
                    playbackController.setLiveStartTime(liveStartTime);
                } else {
                    playbackController.setLiveStartTime(request.startTime);
                }
            } else {
                logger.debug('setLiveEdgeSeekTarget : getFragmentRequestForTime returned undefined request object');
            }
            seekTarget = playbackController.getStreamStartTime(false, liveEdge);
            streamProcessor.getBufferController().setSeekStartTime(seekTarget);

            //special use case for multi period stream. If the startTime is out of the current period, send a seek command.
            //in onPlaybackSeeking callback (StreamController), the detection of switch stream is done.
            if (seekTarget > (currentRepresentationInfo.mediaInfo.streamInfo.start + currentRepresentationInfo.mediaInfo.streamInfo.duration)) {
                playbackController.seek(seekTarget);
            }

            const manifestUpdateInfo = dashMetrics.getCurrentManifestUpdate(metricsModel.getMetricsFor(Constants.STREAM));
            metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {
                currentTime: seekTarget,
                presentationStartTime: liveEdge,
                latency: liveEdge - seekTarget,
                clientTimeOffset: timelineConverter.getClientTimeOffset()
            });
        }
    }

    function onStreamCompleted(e) {
        if (e.fragmentModel !== fragmentModel) {
            return;
        }

        stop();
        setFragmentProcessState(false);
        logger.info('Stream is complete');
    }

    function onFragmentLoadingCompleted(e) {
        if (e.sender !== fragmentModel) {
            return;
        }
        logger.info('OnFragmentLoadingCompleted - Url:', e.request ? e.request.url : 'undefined');
        if (dashManifestModel.getIsTextTrack(type)) {
            setFragmentProcessState(false);
        }

        if (e.error && e.request.serviceLocation && !isStopped) {
            replaceRequest(e.request);
            setFragmentProcessState(false);
            startScheduleTimer(0);
        }

        if (bufferResetInProgress) {
            mediaRequest = e.request;
        }
    }

    function onPlaybackTimeUpdated() {
        completeQualityChange(true);
    }

    function onBytesAppended(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor) {
            return;
        }

        if (bufferResetInProgress && !isNaN(e.startTime)) {
            bufferResetInProgress = false;
            fragmentModel.addExecutedRequest(mediaRequest);
        }

        setFragmentProcessState(false);
        startScheduleTimer(0);
    }

    function onFragmentLoadingAbandoned(e) {
        if (e.streamProcessor !== streamProcessor) {
            return;
        }
        logger.info('onFragmentLoadingAbandoned for ' + type + ', request: ' + e.request.url + ' has been aborted');
        if (!playbackController.isSeeking() && !switchTrack) {
            logger.info('onFragmentLoadingAbandoned for ' + type + ', request: ' + e.request.url + ' has to be downloaded again, origin is not seeking process or switch track call');
            replaceRequest(e.request);
        }
        setFragmentProcessState(false);
        startScheduleTimer(0);
    }

    function onDataUpdateStarted(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor) {
            return;
        }

        stop();
    }

    function onBufferCleared(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor) {
            return;
        }

        if (e.unintended) {
            // There was an unintended buffer remove, probably creating a gap in the buffer, remove every saved request
            streamProcessor.getFragmentModel().removeExecutedRequestsAfterTime(e.from,
                streamProcessor.getStreamInfo().duration);
        } else {
            streamProcessor.getFragmentModel().syncExecutedRequestsWithBufferedRange(
                streamProcessor.getBufferController().getBuffer().getAllBufferRanges(),
                streamProcessor.getStreamInfo().duration);
        }

        if (e.hasEnoughSpaceToAppend && isStopped) {
            start();
        }
    }

    function onBufferLevelStateChanged(e) {
        if ((e.sender.getStreamProcessor() === streamProcessor) && e.state === BufferController.BUFFER_EMPTY && !playbackController.isSeeking()) {
            logger.info('Buffer is empty! Stalling!');
            clearPlayListTraceMetrics(new Date(), PlayListTrace.REBUFFERING_REASON);
        }
    }

    function onQuotaExceeded(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor) {
            return;
        }

        stop();
        setFragmentProcessState(false);
    }

    function onURLResolutionFailed() {
        fragmentModel.abortRequests();
        stop();
    }

    function onTimedTextRequested(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor) {
            return;
        }

        getInitRequest(e.index);
    }

    function onPlaybackStarted() {
        if (isStopped || !scheduleWhilePaused) {
            start();
        }
    }

    function onPlaybackSeeking(e) {
        seekTarget = e.seekTime;
        setTimeToLoadDelay(0);

        if (isStopped) {
            start();
        }

        const manifestUpdateInfo = dashMetrics.getCurrentManifestUpdate(metricsModel.getMetricsFor(Constants.STREAM));
        const latency = currentRepresentationInfo.DVRWindow && playbackController ? currentRepresentationInfo.DVRWindow.end - playbackController.getTime() : NaN;
        metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {
            latency: latency
        });

        //if, during the seek command, the scheduleController is waiting : stop waiting, request chunk as soon as possible
        if (!isFragmentProcessingInProgress) {
            startScheduleTimer(0);
        } else {
            logger.debug('onPlaybackSeeking for ' + type + ', call fragmentModel.abortRequests in order to seek quicker');
            fragmentModel.abortRequests();
        }
    }

    function onPlaybackRateChanged(e) {
        if (playListTraceMetrics) {
            playListTraceMetrics.playbackspeed = e.playbackRate.toString();
        }
    }

    function getSeekTarget() {
        return seekTarget;
    }

    function setSeekTarget(value) {
        seekTarget = value;
    }

    function setTimeToLoadDelay(value) {
        timeToLoadDelay = value;
    }

    function getTimeToLoadDelay() {
        return timeToLoadDelay;
    }

    function getBufferTarget() {
        return bufferLevelRule.getBufferTarget(streamProcessor, type, streamController.isVideoTrackPresent());
    }

    function getType() {
        return type;
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

    function resetInitialSettings() {
        isFragmentProcessingInProgress = false;
        timeToLoadDelay = 0;
        seekTarget = NaN;
        playListMetrics = null;
        playListTraceMetrics = null;
        playListTraceMetricsClosed = true;
        initialRequest = true;
        lastInitQuality = NaN;
        lastFragmentRequest = {
            mediaInfo: undefined,
            quality: NaN,
            adaptationIndex: NaN
        };
        topQualityIndex = {};
        replaceRequestArray = [];
        isStopped = true;
        switchTrack = false;
        bufferResetInProgress = false;
        mediaRequest = null;
    }

    function reset() {
        //eventBus.off(Events.LIVE_EDGE_SEARCH_COMPLETED, onLiveEdgeSearchCompleted, this);
        eventBus.off(Events.DATA_UPDATE_STARTED, onDataUpdateStarted, this);
        eventBus.off(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
        eventBus.off(Events.BUFFER_LEVEL_STATE_CHANGED, onBufferLevelStateChanged, this);
        eventBus.off(Events.QUALITY_CHANGE_REQUESTED, onQualityChanged, this);
        eventBus.off(Events.FRAGMENT_LOADING_COMPLETED, onFragmentLoadingCompleted, this);
        eventBus.off(Events.STREAM_COMPLETED, onStreamCompleted, this);
        eventBus.off(Events.STREAM_INITIALIZED, onStreamInitialized, this);
        eventBus.off(Events.QUOTA_EXCEEDED, onQuotaExceeded, this);
        eventBus.off(Events.BYTES_APPENDED_END_FRAGMENT, onBytesAppended, this);
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
        resetInitialSettings();
    }

    instance = {
        initialize: initialize,
        getType: getType,
        getSeekTarget: getSeekTarget,
        setSeekTarget: setSeekTarget,
        setTimeToLoadDelay: setTimeToLoadDelay,
        getTimeToLoadDelay: getTimeToLoadDelay,
        replaceRequest: replaceRequest,
        switchTrackAsked: switchTrackAsked,
        isStarted: isStarted,
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
