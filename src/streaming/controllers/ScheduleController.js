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
import FragmentModel from '../models/FragmentModel';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import FactoryMaker from '../../core/FactoryMaker';
import Debug from '../../core/Debug';
import MetricsConstants from '../constants/MetricsConstants';
import MediaPlayerEvents from '../MediaPlayerEvents';

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
    const type = config.type;
    const bufferController = config.bufferController;
    const settings = config.settings;

    let instance,
        streamInfo,
        logger,
        currentRepresentationInfo,
        timeToLoadDelay,
        scheduleTimeout,
        hasVideoTrack,
        lastFragmentRequest,
        topQualityIndex,
        lastInitializedQuality,
        switchTrack,
        initSegmentRequired,
        checkPlaybackQuality;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        resetInitialSettings();
        streamInfo = config.streamInfo;
    }

    function initialize(_hasVideoTrack) {
        hasVideoTrack = _hasVideoTrack;

        eventBus.on(Events.BYTES_APPENDED_END_FRAGMENT, _onBytesAppended, instance);
        eventBus.on(Events.URL_RESOLUTION_FAILED, _onURLResolutionFailed, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_STARTED, _onPlaybackStarted, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_RATE_CHANGED, _onPlaybackRateChanged, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_TIME_UPDATED, _onPlaybackTimeUpdated, instance);
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

    function startScheduleTimer(value) {
        if (bufferController.getIsBufferingCompleted()) return;

        clearScheduleTimer();
        const timeoutValue = !isNaN(value) ? value : 0;
        scheduleTimeout = setTimeout(schedule, timeoutValue);
    }

    function clearScheduleTimer() {
        if (scheduleTimeout) {
            clearTimeout(scheduleTimeout);
            scheduleTimeout = null;
        }
    }

    function hasTopQualityChanged() {
        const streamId = streamInfo.id;
        const newTopQualityIndex = abrController.getMaxAllowedIndexFor(type, streamId);

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
            if (_shouldClearScheduleTimer()) {
                clearScheduleTimer();
                return;
            }

            if (_shouldScheduleNextRequest()) {
                let qualityChange = false;
                if (checkPlaybackQuality) {
                    // in case the playback quality is supposed to be changed, the corresponding StreamProcessor will update the currentRepresentation.
                    // The StreamProcessor will also start the schedule timer again once the quality switch has beeen prepared. Consequently, we only call _getNextFragment if the quality is not changed.
                    qualityChange = abrController.checkPlaybackQuality(type, streamInfo.id);
                }
                if (!qualityChange) {
                    _getNextFragment();
                }

            } else {
                startScheduleTimer(settings.get().streaming.lowLatencyEnabled ? settings.get().streaming.scheduling.lowLatencyTimeout : settings.get().streaming.scheduling.defaultTimeout);
            }
        } catch (e) {
            startScheduleTimer(settings.get().streaming.lowLatencyEnabled ? settings.get().streaming.scheduling.lowLatencyTimeout : settings.get().streaming.scheduling.defaultTimeout);
        }
    }

    /**
     * Triggers the events to start requesting an init or a media segment. This will be picked up by the corresponding StreamProcessor.
     * @private
     */
    function _getNextFragment() {
        // A quality changed occured or we are switching the AdaptationSet. In that case we need to load a new init segment
        if (initSegmentRequired || currentRepresentationInfo.quality !== lastInitializedQuality || switchTrack) {
            if (switchTrack) {
                logger.debug('Switch track for ' + type + ', representation id = ' + currentRepresentationInfo.id);
                switchTrack = false;
            } else {
                logger.debug('Quality has changed, get init request for representationid = ' + currentRepresentationInfo.id);
            }
            eventBus.trigger(Events.INIT_FRAGMENT_NEEDED,
                { representationId: currentRepresentationInfo.id, sender: instance },
                { streamId: streamInfo.id, mediaType: type }
            );
            checkPlaybackQuality = false;
            initSegmentRequired = false;
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
    function _shouldClearScheduleTimer() {
        try {
            return (((type === Constants.TEXT) && !textController.isTextEnabled()));
        } catch (e) {
            return false;
        }
    }

    /**
     * Check if we can start scheduling the next request
     * @return {boolean}
     * @private
     */
    function _shouldScheduleNextRequest() {
        try {
            return currentRepresentationInfo && (isNaN(lastInitializedQuality) || switchTrack || hasTopQualityChanged() || _shouldBuffer());
        } catch (e) {
            return false;
        }
    }

    /**
     * Check if the current buffer level is below our buffer target.
     * @return {boolean}
     * @private
     */
    function _shouldBuffer() {
        if (!type || !currentRepresentationInfo) {
            return true;
        }
        const bufferLevel = dashMetrics.getCurrentBufferLevel(type);
        return bufferLevel < getBufferTarget();
    }

    /**
     * Determine the buffer target depending on the type and whether we have audio and video AdaptationSets available
     * @return {number}
     */
    function getBufferTarget() {
        let bufferTarget = NaN;

        if (!type || !currentRepresentationInfo) {
            return bufferTarget;
        }

        if (type === Constants.TEXT) {
            bufferTarget = _getBufferTargetForFragmentedText();
        } else if (type === Constants.AUDIO && hasVideoTrack) {
            bufferTarget = _getBufferTargetForAudio();
        } else {
            bufferTarget = _getGenericBufferTarget();
        }

        return bufferTarget;
    }

    /**
     * Returns the buffer target for fragmented text tracks
     * @return {number}
     * @private
     */
    function _getBufferTargetForFragmentedText() {
        try {
            if (textController.isTextEnabled()) {
                if (isNaN(currentRepresentationInfo.fragmentDuration)) { //fragmentDuration of currentRepresentationInfo is not defined,
                    // call metrics function to have data in the latest scheduling info...
                    // if no metric, returns 0. In this case, rule will return false.
                    const schedulingInfo = dashMetrics.getCurrentSchedulingInfo(MetricsConstants.SCHEDULING_INFO);
                    return schedulingInfo ? schedulingInfo.duration : 0;
                } else {
                    return currentRepresentationInfo.fragmentDuration;
                }
            } else { // text is disabled, rule will return false
                return 0;
            }
        } catch (e) {
            return 0;
        }
    }

    /**
     * Returns the buffer target for audio tracks in case we have a video track available as well
     * @return {number}
     * @private
     */
    function _getBufferTargetForAudio() {
        try {
            const videoBufferLevel = dashMetrics.getCurrentBufferLevel(Constants.VIDEO);
            // For multiperiod we need to consider that audio and video segments might have different durations.
            // This can lead to scenarios in which we completely buffered the video segments and the video buffer level for the current period is not changing anymore. However we might still need a small audio segment to finish buffering audio as well.
            // If we set the buffer time of audio equal to the video buffer time scheduling for the remaining audio segment will only be triggered when audio fragmentDuration > videoBufferLevel. That will delay preloading of the upcoming period.
            // Should find a better solution than just adding 1
            if (isNaN(currentRepresentationInfo.fragmentDuration)) {
                return videoBufferLevel + 1;
            } else {
                return Math.max(videoBufferLevel + 1, currentRepresentationInfo.fragmentDuration);
            }
        } catch (e) {
            return 0;
        }
    }

    /**
     * Determines the generic buffer target, for instance for video tracks
     * @return {number}
     * @private
     */
    function _getGenericBufferTarget() {
        try {
            const streamInfo = currentRepresentationInfo.mediaInfo.streamInfo;
            if (abrController.isPlayingAtTopQuality(streamInfo)) {
                const isLongFormContent = streamInfo.manifestInfo.duration >= settings.get().streaming.buffer.longFormContentDurationThreshold;
                return isLongFormContent ? settings.get().streaming.buffer.bufferTimeAtTopQualityLongForm : settings.get().streaming.buffer.bufferTimeAtTopQuality;
            } else {
                return mediaPlayerModel.getStableBufferTime();
            }
        } catch (e) {
            return mediaPlayerModel.getStableBufferTime();
        }
    }

    function setSwitchTrack(value) {
        switchTrack = value;
    }

    function getSwitchStrack() {
        return switchTrack;
    }

    function _onPlaybackTimeUpdated() {
        _completeQualityChange(true);
    }

    function _completeQualityChange(trigger) {
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
                        newMediaInfo: item.mediaInfo,
                        streamId: streamInfo.id
                    });
                }
                if ((item.quality !== lastFragmentRequest.quality || item.adaptationIndex !== lastFragmentRequest.adaptationIndex) && trigger) {
                    logger.debug(`Quality change rendered for streamId ${streamInfo.id} and type ${type}`);
                    eventBus.trigger(Events.QUALITY_CHANGE_RENDERED, {
                        mediaType: type,
                        oldQuality: lastFragmentRequest.quality,
                        newQuality: item.quality,
                        streamId: streamInfo.id
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

    function _onBytesAppended(e) {
        logger.debug(`Appended bytes for ${e.mediaType} and stream id ${streamInfo.id}`);

        // we save the last initialized quality. That way we make sure that the media fragments we are about to append match the init segment
        if (isNaN(e.index) || isNaN(lastInitializedQuality)) {
            lastInitializedQuality = e.quality;
            logger.info('[' + type + '] ' + 'lastInitializedRepresentationInfo changed to ' + e.quality);
        }

        startScheduleTimer(0);
    }

    function _onURLResolutionFailed() {
        fragmentModel.abortRequests();
        clearScheduleTimer();
    }

    function _onPlaybackStarted() {
        if (!settings.get().streaming.scheduling.scheduleWhilePaused) {
            startScheduleTimer();
        }
    }

    function _onPlaybackRateChanged(e) {
        dashMetrics.updatePlayListTraceMetrics({ playbackspeed: e.playbackRate.toString() });
    }

    function setTimeToLoadDelay(value) {
        timeToLoadDelay = value;
    }

    function getTimeToLoadDelay() {
        return timeToLoadDelay;
    }

    function setCheckPlaybackQuality(value) {
        checkPlaybackQuality = value;
    }

    function setInitSegmentRequired(value) {
        initSegmentRequired = value;
    }

    function resetInitialSettings() {
        checkPlaybackQuality = true;
        timeToLoadDelay = 0;
        lastInitializedQuality = NaN;
        lastFragmentRequest = {
            mediaInfo: undefined,
            quality: NaN,
            adaptationIndex: NaN
        };
        topQualityIndex = NaN;
        switchTrack = false;
        initSegmentRequired = false;
    }

    function reset() {
        eventBus.off(Events.BYTES_APPENDED_END_FRAGMENT, _onBytesAppended, instance);
        eventBus.off(Events.URL_RESOLUTION_FAILED, _onURLResolutionFailed, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_STARTED, _onPlaybackStarted, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_RATE_CHANGED, _onPlaybackRateChanged, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_TIME_UPDATED, _onPlaybackTimeUpdated, instance);

        clearScheduleTimer();
        _completeQualityChange(false);
        resetInitialSettings();
        streamInfo = null;
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
        setSwitchTrack,
        getSwitchStrack,
        startScheduleTimer,
        clearScheduleTimer,
        reset,
        getBufferTarget,
        getPlaybackController,
        setCheckPlaybackQuality,
        setInitSegmentRequired
    };

    setup();

    return instance;
}

ScheduleController.__dashjs_factory_name = 'ScheduleController';
export default FactoryMaker.getClassFactory(ScheduleController);
