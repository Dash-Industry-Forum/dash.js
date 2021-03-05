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
import MetricsConstants from '../constants/MetricsConstants';
import BufferLevelRule from '../rules/scheduling/BufferLevelRule';
import FragmentModel from '../models/FragmentModel';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import FactoryMaker from '../../core/FactoryMaker';
import Debug from '../../core/Debug';

function ScheduleController(config) {

    config = config || {};
    const context = this.context;
    const eventBus = EventBus(context).getInstance();
    const adapter = config.adapter;
    const dashMetrics = config.dashMetrics;
    const mediaPlayerModel = config.mediaPlayerModel;
    const fragmentModel = config.fragmentModel;
    const abrController = config.abrController;
    const playbackController = config.playbackController;
    const textController = config.textController;
    const streamInfo = config.streamInfo;
    const type = config.type;
    const mimeType = config.mimeType;
    const mediaController = config.mediaController;
    const bufferController = config.bufferController;
    const settings = config.settings;

    let instance,
        logger,
        currentRepresentationInfo,
        isStopped,
        isFragmentProcessingInProgress,
        timeToLoadDelay,
        scheduleTimeout,
        hasVideoTrack,
        bufferLevelRule,
        lastFragmentRequest,
        topQualityIndex,
        lastInitQuality,
        replaceRequestArray,
        switchTrack,
        shouldReplaceBuffer,
        mediaRequest,
        checkPlaybackQuality,
        isReplacementRequest;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        resetInitialSettings();
    }

    function initialize(_hasVideoTrack) {
        hasVideoTrack = _hasVideoTrack;

        bufferLevelRule = BufferLevelRule(context).create({
            abrController: abrController,
            dashMetrics: dashMetrics,
            mediaPlayerModel: mediaPlayerModel,
            textController: textController,
            settings: settings
        });

        eventBus.on(Events.DATA_UPDATE_STARTED, onDataUpdateStarted, this);
        eventBus.on(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
        eventBus.on(Events.FRAGMENT_LOADING_COMPLETED, onFragmentLoadingCompleted, this);
        eventBus.on(Events.STREAM_REQUESTING_COMPLETED, onStreamRequestingCompleted, this);
        eventBus.on(Events.BUFFER_CLEARED, onBufferCleared, this);
        eventBus.on(Events.BYTES_APPENDED_END_FRAGMENT, onBytesAppended, this);
        eventBus.on(Events.QUOTA_EXCEEDED, onQuotaExceeded, this);
        eventBus.on(Events.PLAYBACK_STARTED, onPlaybackStarted, this);
        eventBus.on(Events.PLAYBACK_RATE_CHANGED, onPlaybackRateChanged, this);
        eventBus.on(Events.PLAYBACK_TIME_UPDATED, onPlaybackTimeUpdated, this);
        eventBus.on(Events.URL_RESOLUTION_FAILED, onURLResolutionFailed, this);
        eventBus.on(Events.FRAGMENT_LOADING_ABANDONED, onFragmentLoadingAbandoned, this);
        eventBus.on(Events.BUFFERING_COMPLETED, onBufferingCompleted, this);
    }

    function getType() {
        return type;
    }

    function getStreamId() {
        return streamInfo.id;
    }

    function setCurrentRepresentation(representationInfo) {
        currentRepresentationInfo = representationInfo;
    }

    function isStarted() {
        return (isStopped === false);
    }

    function start() {
        if (isStarted()) return;
        if (!currentRepresentationInfo || bufferController.getIsBufferingCompleted()) return;

        logger.debug(`ScheduleController for stream id ${streamInfo.id} starts`);
        isStopped = false;

        startScheduleTimer(0);
    }

    function stop() {
        if (isStopped) return;

        logger.debug(type + ' Schedule Controller stops');
        isStopped = true;
        clearTimeout(scheduleTimeout);
    }


    function startScheduleTimer(value) {
        clearTimeout(scheduleTimeout);

        scheduleTimeout = setTimeout(schedule, value);
    }

    function hasTopQualityChanged() {
        const streamId = streamInfo.id;
        const newTopQualityIndex = abrController.getTopQualityIndexFor(type, streamId);

        if (isNaN(topQualityIndex) || topQualityIndex != newTopQualityIndex) {
            logger.info('Top quality ' + type + ' index has changed from ' + topQualityIndex + ' to ' + newTopQualityIndex);
            topQualityIndex = newTopQualityIndex;
            return true;
        }
        return false;

    }

    /**
     * Schedule the request for an init or a media segment
     */
    function schedule() {
        try {
            // Check if we are supposed to stop scheduling
            if (_shouldStop()) {
                stop();
                return;
            }

            if (isFragmentProcessingInProgress) {
                return;
            }

            // Validate the last executed request. In case of an ABR switch we might want to replace existing stuff in the buffer.
            _validateExecutedFragmentRequest();

            const isReplacement = replaceRequestArray.length > 0;
            if (_shouldScheduleNextRequest(isReplacement)) {
                setFragmentProcessState(true);
                if (!isReplacement && checkPlaybackQuality) {
                    // in case the playback quality is supposed to be changed, the corresponding StreamProcessor will update the currentRepresentation
                    abrController.checkPlaybackQuality(type, streamInfo.id);
                }
                _getNextFragment();

            } else {
                startScheduleTimer(settings.get().streaming.lowLatencyEnabled ? 100 : 500);
            }
        } catch (e) {
            setFragmentProcessState(false);
            startScheduleTimer(settings.get().streaming.lowLatencyEnabled ? 100 : 500);
        }
    }

    /**
     * Triggers the events to start requesting an init or a media segment. This will be picked up by the corresponding StreamProcessor.
     * @private
     */
    function _getNextFragment() {

        // A quality changed occured or we are switching the AdaptationSet. In that case we need to load a new init segment
        if ((currentRepresentationInfo.quality !== lastInitQuality || switchTrack) && (!shouldReplaceBuffer)) {
            if (switchTrack) {
                logger.debug('Switch track for ' + type + ', representation id = ' + currentRepresentationInfo.id);
                shouldReplaceBuffer = mediaController.getSwitchMode(type) === Constants.TRACK_SWITCH_MODE_ALWAYS_REPLACE;
                if (shouldReplaceBuffer && bufferController.replaceBuffer) {
                    bufferController.setReplaceBuffer(true);
                }
                switchTrack = false;
            } else {
                logger.debug('Quality has changed, get init request for representationid = ' + currentRepresentationInfo.id);
            }
            eventBus.trigger(Events.INIT_FRAGMENT_NEEDED,
                { representationId: currentRepresentationInfo.id, sender: instance },
                { streamId: streamInfo.id, mediaType: type }
            );
            lastInitQuality = currentRepresentationInfo.quality;
            checkPlaybackQuality = false;
        }

        // The quality has not changed and we are not changing the track
        else {
            // check if we need to replace anything we loaded before
            const replacement = replaceRequestArray.shift();

            if (replacement && replacement.isInitializationRequest()) {
                // To be sure the specific init segment had not already been loaded
                eventBus.trigger(Events.INIT_FRAGMENT_NEEDED,
                    { representationId: replacement.representationId, sender: instance },
                    { streamId: streamInfo.id, mediaType: type }
                );
                checkPlaybackQuality = false;
            } else {
                eventBus.trigger(Events.MEDIA_FRAGMENT_NEEDED,
                    { replacement: replacement },
                    { streamId: streamInfo.id, mediaType: type }
                );
                checkPlaybackQuality = true;
            }
        }
    }

    /**
     * Check if we need to stop scheduling for now.
     * @return {boolean}
     * @private
     */
    function _shouldStop() {
        try {
            return isStopped || (playbackController.isPaused() && !settings.get().streaming.scheduleWhilePaused) || ((type === Constants.FRAGMENTED_TEXT || type === Constants.TEXT) && !textController.isTextEnabled()) || bufferController.getIsBufferingCompleted();
        } catch (e) {
            return false;
        }
    }

    /**
     * Check if we can start scheduling the next request
     * @param {boolean} isReplacement
     * @return {boolean}
     * @private
     */
    function _shouldScheduleNextRequest(isReplacement) {
        try {
            return shouldReplaceBuffer || isNaN(lastInitQuality) || switchTrack || isReplacement || hasTopQualityChanged() || bufferLevelRule.execute(type, currentRepresentationInfo, hasVideoTrack);
        } catch (e) {
            return false;
        }
    }

    /**
     * If a switch in quality has occurred we check if we need to replace existing segments in the buffer.
     * This will only happen if fastSwitch is enabled and the buffered quality is lower than the new quality.
     * @private
     */
    function _validateExecutedFragmentRequest() {
        // Validate that the fragment request executed and appended into the source buffer is as
        // good of quality as the current quality and is the correct media track.
        const time = playbackController.getTime();
        let safeBufferLevel = 1.5;

        if (isNaN(currentRepresentationInfo.fragmentDuration)) { //fragmentDuration of representationInfo is not defined,
            // call metrics function to have data in the latest scheduling info...
            // if no metric, returns 0. In this case, rule will return false.
            const schedulingInfo = dashMetrics.getCurrentSchedulingInfo(currentRepresentationInfo.mediaInfo.type);
            safeBufferLevel = schedulingInfo ? schedulingInfo.duration * 1.5 : 1.5;
        }
        const request = fragmentModel.getRequests({
            state: FragmentModel.FRAGMENT_MODEL_EXECUTED,
            time: time + safeBufferLevel,
            threshold: 0
        })[0];

        if (request && replaceRequestArray.indexOf(request) === -1 && !adapter.getIsTextTrack(mimeType)) {
            const fastSwitchModeEnabled = settings.get().streaming.fastSwitchEnabled;
            const bufferLevel = bufferController.getBufferLevel();
            const abandonmentState = abrController.getAbandonmentStateFor(type);

            // Only replace the existing quality in the buffer on a track switch when set to NEVER_REPLACE
            const trackChanged = !mediaController.isCurrentTrack(request.mediaInfo) && mediaController.getSwitchMode(request.mediaInfo.type) === Constants.TRACK_SWITCH_MODE_NEVER_REPLACE;
            const qualityChanged = request.quality < currentRepresentationInfo.quality;

            if (fastSwitchModeEnabled && (trackChanged || qualityChanged) && bufferLevel >= safeBufferLevel && abandonmentState !== MetricsConstants.ABANDON_LOAD) {
                replaceRequest(request);
                isReplacementRequest = true;
                logger.debug('Reloading outdated fragment at index: ', request.index);
            } else if (request.quality > currentRepresentationInfo.quality && !shouldReplaceBuffer) {
                // The buffer has better quality it in than what we would request so set append point to end of buffer!!
                logger.debug(`Adjusting seek target for ${type}. Set time to ${playbackController.getTime() + bufferLevel}`);
                //eventBus.trigger(Events.SEEK_TARGET, { time: playbackController.getTime() + bufferLevel }, { streamId: streamInfo.id });
            }
        }
    }

    /**
     * Sets the processing state. When we have scheduled a new segment request this is set to true.
     * @param state
     */
    function setFragmentProcessState(state) {
        if (isFragmentProcessingInProgress !== state) {
            isFragmentProcessingInProgress = state;
        } else {
            logger.debug('isFragmentProcessingInProgress is already equal to', state);
        }
    }

    /**
     * The AdaptationSet is about to be changed.
     */
    function switchTrackAsked() {
        switchTrack = true;
    }

    function replaceRequest(request) {
        replaceRequestArray.push(request);
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

    function onStreamRequestingCompleted() {
        stop();
        setFragmentProcessState(false);
        logger.info(`Stream ${streamInfo.id} is complete`);
    }

    function onFragmentLoadingCompleted(e) {
        if (e.request.mediaInfo.streamInfo.id !== streamInfo.id || e.request.mediaType !== type) return;

        logger.info('OnFragmentLoadingCompleted for stream id ' + streamInfo.id + ' and media type ' + type + ' - Url:', e.request ? e.request.url : 'undefined', e.request.range ? ', Range:' + e.request.range : '');

        if (adapter.getIsTextTrack(mimeType)) {
            setFragmentProcessState(false);
        }

        if (e.error && e.request.serviceLocation && !isStopped) {
            replaceRequest(e.request);
            setFragmentProcessState(false);
            startScheduleTimer(0);
        }

        if (shouldReplaceBuffer) {
            mediaRequest = e.request;
        }
    }

    function onPlaybackTimeUpdated() {
        completeQualityChange(true);
    }

    function getIsReplacingBuffer() {
        return shouldReplaceBuffer;
    }

    function onBytesAppended(e) {
        if (shouldReplaceBuffer && !isNaN(e.startTime)) {
            shouldReplaceBuffer = false;
            fragmentModel.addExecutedRequest(mediaRequest);
        }

        logger.debug(`Appended bytes for ${e.mediaType} and set fragment process state to false for ${type}`);
        setFragmentProcessState(false);
        if (isReplacementRequest && !isNaN(e.startTime)) {
            //replace requests process is in progress, call schedule in n seconds.
            //it is done in order to not add a fragment at the new quality at the end of the buffer before replace process is over.
            //Indeed, if schedule is called too early, the executed request tested is the same that the one tested during previous schedule (at the new quality).
            const currentTime = playbackController.getTime();
            const fragEndTime = e.startTime + currentRepresentationInfo.fragmentDuration;
            const safeBufferLevel = currentRepresentationInfo.fragmentDuration * 1.5;
            if ((currentTime + safeBufferLevel) >= fragEndTime) {
                startScheduleTimer(0);
            } else {
                startScheduleTimer((fragEndTime - (currentTime + safeBufferLevel)) * 1000);
            }
            isReplacementRequest = false;
        } else {
            startScheduleTimer(0);
        }
    }

    function onFragmentLoadingAbandoned(e) {
        logger.info('onFragmentLoadingAbandoned request: ' + e.request.url + ' has been aborted');
        if (!playbackController.isSeeking() && !switchTrack) {
            logger.info('onFragmentLoadingAbandoned request: ' + e.request.url + ' has to be downloaded again, origin is not seeking process or switch track call');
            replaceRequest(e.request);
        }
        setFragmentProcessState(false);
        startScheduleTimer(0);
    }

    function onBufferingCompleted(/*e*/) {
        stop();
    }

    function onBufferCleared(e) {
        if (shouldReplaceBuffer && settings.get().streaming.flushBufferAtTrackSwitch) {
            // For some devices (like chromecast) it is necessary to seek the video element to reset the internal decoding buffer,
            // otherwise audio track switch will be effective only once after previous buffered track is consumed
            playbackController.seek(playbackController.getTime() + 0.001, false, true);
        }

        // (Re)start schedule once buffer has been pruned after a QuotaExceededError
        if (e.hasEnoughSpaceToAppend && e.quotaExceeded) {
            start();
        }
    }

    function onQuotaExceeded(/*e*/) {
        // Stop scheduler (will be restarted once buffer is pruned)
        stop();
        setFragmentProcessState(false);
    }

    function onURLResolutionFailed() {
        fragmentModel.abortRequests();
        stop();
    }

    function onPlaybackStarted() {
        if (isStopped || !settings.get().streaming.scheduleWhilePaused) {
            start();
        }
    }

    function onPlaybackRateChanged(e) {
        dashMetrics.updatePlayListTraceMetrics({ playbackspeed: e.playbackRate.toString() });
    }

    function onDataUpdateStarted() {
        stop();
    }

    function onDataUpdateCompleted() {
        start();
    }

    function setTimeToLoadDelay(value) {
        timeToLoadDelay = value;
    }

    function getTimeToLoadDelay() {
        return timeToLoadDelay;
    }

    function getBufferTarget() {
        return bufferLevelRule.getBufferTarget(type, currentRepresentationInfo, hasVideoTrack);
    }

    function resetInitialSettings() {
        checkPlaybackQuality = true;
        isFragmentProcessingInProgress = false;
        timeToLoadDelay = 0;
        lastInitQuality = NaN;
        lastFragmentRequest = {
            mediaInfo: undefined,
            quality: NaN,
            adaptationIndex: NaN
        };
        topQualityIndex = NaN;
        replaceRequestArray = [];
        isStopped = true;
        switchTrack = false;
        shouldReplaceBuffer = false;
        mediaRequest = null;
        isReplacementRequest = false;
    }

    function reset() {
        eventBus.off(Events.DATA_UPDATE_STARTED, onDataUpdateStarted, this);
        eventBus.off(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
        eventBus.off(Events.FRAGMENT_LOADING_COMPLETED, onFragmentLoadingCompleted, this);
        eventBus.off(Events.STREAM_REQUESTING_COMPLETED, onStreamRequestingCompleted, this);
        eventBus.off(Events.BUFFER_CLEARED, onBufferCleared, this);
        eventBus.off(Events.BYTES_APPENDED_END_FRAGMENT, onBytesAppended, this);
        eventBus.off(Events.QUOTA_EXCEEDED, onQuotaExceeded, this);
        eventBus.off(Events.PLAYBACK_STARTED, onPlaybackStarted, this);
        eventBus.off(Events.PLAYBACK_RATE_CHANGED, onPlaybackRateChanged, this);
        eventBus.off(Events.PLAYBACK_TIME_UPDATED, onPlaybackTimeUpdated, this);
        eventBus.off(Events.URL_RESOLUTION_FAILED, onURLResolutionFailed, this);
        eventBus.off(Events.FRAGMENT_LOADING_ABANDONED, onFragmentLoadingAbandoned, this);
        eventBus.off(Events.BUFFERING_COMPLETED, onBufferingCompleted, this);

        stop();
        completeQualityChange(false);
        resetInitialSettings();
    }

    function getPlaybackController() {
        return playbackController;
    }

    instance = {
        initialize,
        getType,
        getStreamId,
        setCurrentRepresentation,
        setTimeToLoadDelay,
        getTimeToLoadDelay,
        setFragmentProcessState,
        switchTrackAsked,
        isStarted,
        start,
        startScheduleTimer,
        stop,
        reset,
        getBufferTarget,
        getPlaybackController,
        getIsReplacingBuffer
    };

    setup();

    return instance;
}

ScheduleController.__dashjs_factory_name = 'ScheduleController';
export default FactoryMaker.getClassFactory(ScheduleController);
