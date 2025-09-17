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
import Constants from '../constants/Constants.js';
import FragmentModel from '../models/FragmentModel.js';
import EventBus from '../../core/EventBus.js';
import Events from '../../core/events/Events.js';
import FactoryMaker from '../../core/FactoryMaker.js';
import Debug from '../../core/Debug.js';
import MetricsConstants from '../constants/MetricsConstants.js';
import MediaPlayerEvents from '../MediaPlayerEvents.js';

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
    const representationController = config.representationController
    const settings = config.settings;

    let instance,
        streamInfo,
        logger,
        timeToLoadDelay,
        scheduleTimeout,
        hasVideoTrack,
        lastFragmentRequest,
        lastInitializedRepresentationId,
        switchTrack,
        initSegmentRequired,
        managedMediaSourceAllowsRequest,
        checkPlaybackQuality;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        resetInitialSettings();
        streamInfo = config.streamInfo;
    }

    function initialize(_hasVideoTrack) {
        hasVideoTrack = _hasVideoTrack;

        eventBus.on(Events.URL_RESOLUTION_FAILED, _onURLResolutionFailed, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_STARTED, _onPlaybackStarted, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_RATE_CHANGED, _onPlaybackRateChanged, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_TIME_UPDATED, _onPlaybackTimeUpdated, instance);
        eventBus.on(MediaPlayerEvents.MANAGED_MEDIA_SOURCE_START_STREAMING, _onManagedMediaSourceStartStreaming, instance);
        eventBus.on(MediaPlayerEvents.MANAGED_MEDIA_SOURCE_END_STREAMING, _onManagedMediaSourceEndStreaming, instance);
    }

    function _onManagedMediaSourceStartStreaming() {
        managedMediaSourceAllowsRequest = true;
    }

    function _onManagedMediaSourceEndStreaming() {
        managedMediaSourceAllowsRequest = false;
    }

    function getType() {
        return type;
    }

    function getStreamId() {
        return streamInfo.id;
    }

    function startScheduleTimer(value) {

        //return if both buffering and playback have ended
        if (bufferController.getIsBufferingCompleted()) {
            return;
        }

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

    /**
     * Schedule the request for an init or a media segment
     */
    function schedule() {
        const scheduleTimeout = mediaPlayerModel.getScheduleTimeout();
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
                startScheduleTimer(scheduleTimeout);
            }
        } catch (e) {
            startScheduleTimer(scheduleTimeout);
        }
    }

    /**
     * Triggers the events to start requesting an init or a media segment. This will be picked up by the corresponding StreamProcessor.
     * @private
     */
    function _getNextFragment() {
        const currentRepresentation = representationController.getCurrentRepresentation();

        // A quality changed occured or we are switching the AdaptationSet. In that case we need to load a new init segment
        if (initSegmentRequired || currentRepresentation.id !== lastInitializedRepresentationId || switchTrack) {
            if (switchTrack) {
                logger.debug('Switch track for ' + type + ', representation id = ' + currentRepresentation.id);
                switchTrack = false;
            } else {
                logger.debug('Quality has changed, get init request for representationid = ' + currentRepresentation.id);
            }
            eventBus.trigger(Events.INIT_FRAGMENT_NEEDED,
                { representationId: currentRepresentation.id, sender: instance },
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
            return (((type === Constants.TEXT) && !textController.isTextEnabled()) ||
                (playbackController.isPaused() && (!playbackController.getStreamController().getInitialPlayback() || !playbackController.getStreamController().getAutoPlay()) && !settings.get().streaming.scheduling.scheduleWhilePaused));
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
            if (!managedMediaSourceAllowsRequest) {
                return false;
            }
            const currentRepresentation = representationController.getCurrentRepresentation();
            return currentRepresentation && (lastInitializedRepresentationId == null || switchTrack || _shouldBuffer());
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
        const currentRepresentation = representationController.getCurrentRepresentation();
        if (!type || !currentRepresentation) {
            return true;
        }
        let segmentDurationToAddToBufferLevel = currentRepresentation && currentRepresentation.segmentDuration && !isNaN(currentRepresentation.segmentDuration) ? currentRepresentation.segmentDuration : 0;
        const bufferLevel = dashMetrics.getCurrentBufferLevel(type);
        const bufferTarget = getBufferTarget();

        // If the buffer target is smaller than the segment duration we do not take it into account. For low latency playback do not delay the buffering.
        if (bufferTarget <= segmentDurationToAddToBufferLevel || playbackController.getLowLatencyModeEnabled() || (type === Constants.AUDIO && hasVideoTrack)) {
            segmentDurationToAddToBufferLevel = 0;
        }

        return bufferLevel + segmentDurationToAddToBufferLevel < bufferTarget;
    }

    /**
     * Determine the buffer target depending on the type and whether we have audio and video AdaptationSets available
     * @return {number}
     */
    function getBufferTarget() {
        let bufferTarget = NaN;
        const currentRepresentation = representationController.getCurrentRepresentation();

        if (!type || !currentRepresentation) {
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
                const currentRepresentation = representationController.getCurrentRepresentation();
                if (isNaN(currentRepresentation.fragmentDuration)) {
                    // call metrics function to have data in the latest scheduling info...
                    // if no metric, returns 0. In this case, rule will return false.
                    const schedulingInfo = dashMetrics.getCurrentSchedulingInfo(MetricsConstants.SCHEDULING_INFO);
                    return schedulingInfo ? schedulingInfo.duration : 0;
                } else {
                    return currentRepresentation.fragmentDuration;
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
            const currentRepresentation = representationController.getCurrentRepresentation();
            // For multiperiod we need to consider that audio and video segments might have different durations.
            // This can lead to scenarios in which we completely buffered the video segments and the video buffer level for the current period is not changing anymore. However we might still need a small audio segment to finish buffering audio as well.
            // If we set the buffer time of audio equal to the video buffer time scheduling for the remaining audio segment will only be triggered when audio fragmentDuration > videoBufferLevel. That will delay preloading of the upcoming period.
            // Should find a better solution than just adding 1
            if (isNaN(currentRepresentation.fragmentDuration)) {
                return videoBufferLevel + 1;
            } else {
                return Math.max(videoBufferLevel + 1, currentRepresentation.fragmentDuration);
            }
        } catch (e) {
            return 0;
        }
    }

    /**
     * Determines the generic buffer target, for instance for video tracks or when we got an audio only stream
     * @return {number}
     * @private
     */
    function _getGenericBufferTarget() {
        try {
            const currentRepresentation = representationController.getCurrentRepresentation();
            const streamInfo = currentRepresentation.mediaInfo.streamInfo;
            if (abrController.isPlayingAtTopQuality(currentRepresentation)) {
                const isLongFormContent = streamInfo.manifestInfo.duration >= settings.get().streaming.buffer.longFormContentDurationThreshold;
                return isLongFormContent ? settings.get().streaming.buffer.bufferTimeAtTopQualityLongForm : settings.get().streaming.buffer.bufferTimeAtTopQuality;
            } else {
                return mediaPlayerModel.getBufferTimeDefaultUnadjusted();
            }
        } catch (e) {
            return mediaPlayerModel.getBufferTimeDefaultUnadjusted();
        }
    }

    function setSwitchTrack(value) {
        switchTrack = value;
    }

    function getSwitchTrack() {
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
                if ((!lastFragmentRequest.representation || (item.representation.mediaInfo.type === lastFragmentRequest.representation.mediaInfo.type && item.representation.mediaInfo.index !== lastFragmentRequest.representation.mediaInfo.index)) && trigger) {
                    logger.debug(`Track change rendered for streamId ${streamInfo.id} and type ${type}`);
                    eventBus.trigger(Events.TRACK_CHANGE_RENDERED, {
                        mediaType: type,
                        oldMediaInfo: lastFragmentRequest && lastFragmentRequest.representation && lastFragmentRequest.representation.mediaInfo ? lastFragmentRequest.representation.mediaInfo : null,
                        newMediaInfo: item.representation.mediaInfo,
                        streamId: streamInfo.id
                    });
                }
                if ((!lastFragmentRequest.representation || (item.representation.id !== lastFragmentRequest.representation.id)) && trigger) {
                    logger.debug(`Quality change rendered for streamId ${streamInfo.id} and type ${type}`);
                    eventBus.trigger(Events.QUALITY_CHANGE_RENDERED, {
                        mediaType: type,
                        oldRepresentation: lastFragmentRequest.representation ? lastFragmentRequest.representation : null,
                        newRepresentation: item.representation,
                        streamId: streamInfo.id
                    });
                }
                lastFragmentRequest.representation = item.representation
            }
        }
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

    function setLastInitializedRepresentationId(value) {
        lastInitializedRepresentationId = value;
    }

    function resetInitialSettings() {
        checkPlaybackQuality = true;
        timeToLoadDelay = 0;
        lastInitializedRepresentationId = null;
        lastFragmentRequest = {
            representation: null,
        };
        switchTrack = false;
        initSegmentRequired = false;
        managedMediaSourceAllowsRequest = true;
    }

    function reset() {
        eventBus.off(Events.URL_RESOLUTION_FAILED, _onURLResolutionFailed, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_STARTED, _onPlaybackStarted, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_RATE_CHANGED, _onPlaybackRateChanged, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_TIME_UPDATED, _onPlaybackTimeUpdated, instance);
        eventBus.off(MediaPlayerEvents.MANAGED_MEDIA_SOURCE_START_STREAMING, _onManagedMediaSourceStartStreaming, instance);
        eventBus.off(MediaPlayerEvents.MANAGED_MEDIA_SOURCE_END_STREAMING, _onManagedMediaSourceEndStreaming, instance);

        clearScheduleTimer();
        _completeQualityChange(false);
        resetInitialSettings();
        streamInfo = null;
    }

    function getPlaybackController() {
        return playbackController;
    }

    instance = {
        clearScheduleTimer,
        getBufferTarget,
        getPlaybackController,
        getStreamId,
        getSwitchTrack,
        getTimeToLoadDelay,
        getType,
        initialize,
        reset,
        setCheckPlaybackQuality,
        setInitSegmentRequired,
        setLastInitializedRepresentationId,
        setSwitchTrack,
        setTimeToLoadDelay,
        startScheduleTimer,
    };

    setup();

    return instance;
}

ScheduleController.__dashjs_factory_name = 'ScheduleController';
export default FactoryMaker.getClassFactory(ScheduleController);
