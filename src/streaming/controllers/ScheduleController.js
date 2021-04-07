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
        bufferLevelRule,
        lastFragmentRequest,
        topQualityIndex,
        lastInitQuality,
        switchTrack,
        initSegmentRequired,
        mediaRequest,
        checkPlaybackQuality;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        resetInitialSettings();
        streamInfo = config.streamInfo;
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


        eventBus.on(Events.BYTES_APPENDED_END_FRAGMENT, _onBytesAppended, instance);
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
            if (_shouldClearScheduleTimer()) {
                clearScheduleTimer();
                return;
            }

            if (_shouldScheduleNextRequest()) {
                if (checkPlaybackQuality) {
                    // in case the playback quality is supposed to be changed, the corresponding StreamProcessor will update the currentRepresentation
                    abrController.checkPlaybackQuality(type, streamInfo.id);
                }
                _getNextFragment();

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
        if (initSegmentRequired || ((currentRepresentationInfo.quality !== lastInitQuality || switchTrack))) {
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
            lastInitQuality = currentRepresentationInfo.quality;
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
            return (((type === Constants.FRAGMENTED_TEXT || type === Constants.TEXT) && !textController.isTextEnabled()));
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
            return  currentRepresentationInfo && (isNaN(lastInitQuality) || switchTrack || hasTopQualityChanged() || bufferLevelRule.execute(type, currentRepresentationInfo, hasVideoTrack));
        } catch (e) {
            return false;
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

    function onPlaybackTimeUpdated() {
        completeQualityChange(true);
    }

    function _onBytesAppended(e) {
        logger.debug(`Appended bytes for ${e.mediaType}`);
        startScheduleTimer(0);
    }

    function onURLResolutionFailed() {
        fragmentModel.abortRequests();
        clearScheduleTimer();
    }

    function onPlaybackStarted() {
        if (!settings.get().streaming.scheduleWhilePaused) {
            startScheduleTimer();
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

    function setCheckPlaybackQuality(value) {
        checkPlaybackQuality = value;
    }

    function setInitSegmentRequired(value) {
        initSegmentRequired = value;
    }

    function resetInitialSettings() {
        checkPlaybackQuality = true;
        timeToLoadDelay = 0;
        lastInitQuality = NaN;
        lastFragmentRequest = {
            mediaInfo: undefined,
            quality: NaN,
            adaptationIndex: NaN
        };
        topQualityIndex = NaN;
        switchTrack = false;
        mediaRequest = null;
        initSegmentRequired = false;
    }

    function reset() {
        eventBus.off(Events.BYTES_APPENDED_END_FRAGMENT, _onBytesAppended, instance);
        eventBus.off(Events.PLAYBACK_STARTED, onPlaybackStarted, instance);
        eventBus.off(Events.PLAYBACK_RATE_CHANGED, onPlaybackRateChanged, instance);
        eventBus.off(Events.PLAYBACK_TIME_UPDATED, onPlaybackTimeUpdated, instance);
        eventBus.off(Events.URL_RESOLUTION_FAILED, onURLResolutionFailed, instance);

        clearScheduleTimer();
        completeQualityChange(false);
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
        setInitSegmentRequired,
    };

    setup();

    return instance;
}

ScheduleController.__dashjs_factory_name = 'ScheduleController';
export default FactoryMaker.getClassFactory(ScheduleController);
