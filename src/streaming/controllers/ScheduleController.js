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
    const dashMetrics = config.dashMetrics;
    const mediaPlayerModel = config.mediaPlayerModel;
    const fragmentModel = config.fragmentModel;
    const abrController = config.abrController;
    const playbackController = config.playbackController;
    const textController = config.textController;
    const streamInfo = config.streamInfo;
    const type = config.type;
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
        switchTrack,
        shouldReplaceBuffer,
        initSegmentRequired,
        mediaRequest,
        checkPlaybackQuality;

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


        eventBus.on(Events.BUFFER_CLEARED, _onBufferCleared, instance);
        eventBus.on(Events.BYTES_APPENDED_END_FRAGMENT, onBytesAppended, instance);
        eventBus.on(Events.QUOTA_EXCEEDED, _onQuotaExceeded, instance);
        eventBus.on(Events.PLAYBACK_STARTED, onPlaybackStarted, instance);
        eventBus.on(Events.PLAYBACK_RATE_CHANGED, onPlaybackRateChanged, instance);
        eventBus.on(Events.PLAYBACK_TIME_UPDATED, onPlaybackTimeUpdated, instance);
        eventBus.on(Events.URL_RESOLUTION_FAILED, onURLResolutionFailed, instance);
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
        clearScheduleTimer();
    }


    function startScheduleTimer(value) {
        clearScheduleTimer();

        scheduleTimeout = setTimeout(schedule, value);
    }

    function clearScheduleTimer() {
        clearTimeout(scheduleTimeout);
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

            // schedule will be called again once the segment has been appended to the buffer
            if (isFragmentProcessingInProgress) {
                return;
            }

            if (_shouldScheduleNextRequest()) {
                setFragmentProcessState(true);
                if (checkPlaybackQuality) {
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
        if (initSegmentRequired || ((currentRepresentationInfo.quality !== lastInitQuality || switchTrack) && (!shouldReplaceBuffer))) {
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

        // Request a media segment instead
        else {
            logger.debug(`Media segment needed for ${type} and stream id ${streamInfo.id}`);
            eventBus.trigger(Events.MEDIA_FRAGMENT_NEEDED,
                {},
                { streamId: streamInfo.id, mediaType: type }
            );
            checkPlaybackQuality = true;
        }

    }

    /**
     * Check if we need to stop scheduling for now.
     * @return {boolean}
     * @private
     */
    function _shouldStop() {
        try {
            return isStopped || (((type === Constants.FRAGMENTED_TEXT || type === Constants.TEXT) && !textController.isTextEnabled()));
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
    function _shouldScheduleNextRequest() {
        try {
            return shouldReplaceBuffer || isNaN(lastInitQuality) || switchTrack || hasTopQualityChanged() || bufferLevelRule.execute(type, currentRepresentationInfo, hasVideoTrack);
        } catch (e) {
            return false;
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
    function setSwitchTrack(value) {
        switchTrack = value;
    }

    function getSwitchStrack() {
        return switchTrack;
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
        startScheduleTimer(0);
    }

    function _onBufferCleared(e) {
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

    function _onQuotaExceeded(/*e*/) {
        // Stop scheduler (will be restarted once buffer is pruned)
        stop();
        setFragmentProcessState(false);
    }

    function onURLResolutionFailed() {
        fragmentModel.abortRequests();
        stop();
    }

    function onPlaybackStarted() {
        if (!settings.get().streaming.scheduleWhilePaused) {
            start();
        }
    }

    function onPlaybackRateChanged(e) {
        dashMetrics.updatePlayListTraceMetrics({ playbackspeed: e.playbackRate.toString() });
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
        isStopped = true;
        switchTrack = false;
        shouldReplaceBuffer = false;
        mediaRequest = null;
        initSegmentRequired = false;
    }

    function reset() {
        eventBus.off(Events.BUFFER_CLEARED, _onBufferCleared, instance);
        eventBus.off(Events.BYTES_APPENDED_END_FRAGMENT, onBytesAppended, instance);
        eventBus.off(Events.QUOTA_EXCEEDED, _onQuotaExceeded, instance);
        eventBus.off(Events.PLAYBACK_STARTED, onPlaybackStarted, instance);
        eventBus.off(Events.PLAYBACK_RATE_CHANGED, onPlaybackRateChanged, instance);
        eventBus.off(Events.PLAYBACK_TIME_UPDATED, onPlaybackTimeUpdated, instance);
        eventBus.off(Events.URL_RESOLUTION_FAILED, onURLResolutionFailed, instance);

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
        setSwitchTrack,
        getSwitchStrack,
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
