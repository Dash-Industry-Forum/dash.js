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
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import FactoryMaker from '../../core/FactoryMaker';
import Debug from '../../core/Debug';
import MediaPlayerEvents from '../../streaming/MediaPlayerEvents';

const LIVE_UPDATE_PLAYBACK_TIME_INTERVAL_MS = 500;

function PlaybackController() {

    const context = this.context;
    const eventBus = EventBus(context).getInstance();

    let instance,
        logger,
        streamController,
        dashMetrics,
        adapter,
        videoModel,
        timelineConverter,
        wallclockTimeIntervalId,
        liveDelay,
        streamInfo,
        isDynamic,
        mediaPlayerModel,
        playOnceInitialized,
        lastLivePlaybackTime,
        availabilityStartTime,
        seekTarget,
        internalSeek,
        isLowLatencySeekingInProgress,
        playbackStalled,
        minPlaybackRateChange,
        settings;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);

        reset();
    }

    /**
     * Initializes the PlaybackController. This function is called whenever the stream is switched.
     * @param {object} sInfo
     * @param {boolean} periodSwitch
     */
    function initialize(sInfo, periodSwitch) {
        streamInfo = sInfo;

        if (periodSwitch !== true) {
            _initializeForFirstStream();
        } else {
            _initializeAfterStreamSwitch();
        }
    }

    /**
     * Initializes the PlaybackController when the first stream is to be played.
     * @private
     */
    function _initializeForFirstStream() {
        addAllListeners();
        isDynamic = streamInfo.manifestInfo.isDynamic;
        isLowLatencySeekingInProgress = false;
        playbackStalled = false;
        internalSeek = false;

        // Detect safari browser (special behavior for low latency streams)
        const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
        const isSafari = /safari/.test(ua) && !/chrome/.test(ua);
        minPlaybackRateChange = isSafari ? 0.25 : 0.02;

        eventBus.on(Events.DATA_UPDATE_COMPLETED, _onDataUpdateCompleted, this);
        eventBus.on(Events.LOADING_PROGRESS, _onFragmentLoadProgress, this);
        eventBus.on(MediaPlayerEvents.BUFFER_LEVEL_STATE_CHANGED, _onBufferLevelStateChanged, this);
        eventBus.on(MediaPlayerEvents.PLAYBACK_PROGRESS, _onPlaybackProgression, this);
        eventBus.on(MediaPlayerEvents.PLAYBACK_TIME_UPDATED, _onPlaybackProgression, this);
        eventBus.on(MediaPlayerEvents.PLAYBACK_ENDED, _onPlaybackEnded, this, { priority: EventBus.EVENT_PRIORITY_HIGH });
        eventBus.on(MediaPlayerEvents.STREAM_INITIALIZING, _onStreamInitializing, this);
        eventBus.on(MediaPlayerEvents.REPRESENTATION_SWITCH, _onRepresentationSwitch, this);

        if (playOnceInitialized) {
            playOnceInitialized = false;
            play();
        }
    }

    /**
     * Initializes the PlaybackController after the stream is switched. This will only happen with multiperiod MPDs.
     * @private
     */
    function _initializeAfterStreamSwitch() {

    }

    function getTimeToStreamEnd(sInfo = null) {
        return parseFloat((getStreamEndTime(sInfo) - getTime()).toFixed(5));
    }

    function getStreamEndTime(sInfo) {
        const refInfo = sInfo ? sInfo : streamInfo;
        return refInfo.start + refInfo.duration;
    }

    function play() {
        if (streamInfo && videoModel && videoModel.getElement()) {
            videoModel.play();
        } else {
            playOnceInitialized = true;
        }
    }

    function isPaused() {
        return streamInfo && videoModel ? videoModel.isPaused() : null;
    }

    function pause() {
        if (streamInfo && videoModel) {
            videoModel.pause();
        }
    }

    function isSeeking() {
        return streamInfo && videoModel ? videoModel.isSeeking() : null;
    }

    function isStalled() {
        return streamInfo && videoModel ? videoModel.isStalled() : null;
    }

    function seek(time, stickToBuffered, internal) {
        if (!streamInfo || !videoModel) return;

        let currentTime = !isNaN(seekTarget) ? seekTarget : videoModel.getTime();
        if (time === currentTime) return;

        internalSeek = (internal === true);

        if (!internalSeek) {
            seekTarget = time;
            eventBus.trigger(Events.PLAYBACK_SEEK_ASKED);
        }
        logger.info('Requesting seek to time: ' + time + (internalSeek ? ' (internal)' : ''));
        videoModel.setCurrentTime(time, stickToBuffered);
    }

    function seekToLive() {
        const type = streamController && streamController.hasVideoTrack() ? Constants.VIDEO : Constants.AUDIO;
        const DVRMetrics = dashMetrics.getCurrentDVRInfo(type);
        const DVRWindow = DVRMetrics ? DVRMetrics.range : null;

        seek(DVRWindow.end - mediaPlayerModel.getLiveDelay(), true, false);
    }

    function getTime() {
        return streamInfo && videoModel ? videoModel.getTime() : null;
    }

    function getNormalizedTime() {
        let t = getTime();

        if (isDynamic && !isNaN(availabilityStartTime)) {
            const timeOffset = availabilityStartTime / 1000;
            // Fix current time for firefox and safari (returned as an absolute time)
            if (t > timeOffset) {
                t -= timeOffset;
            }
        }
        return t;
    }

    function getPlaybackRate() {
        return streamInfo && videoModel ? videoModel.getPlaybackRate() : null;
    }

    function getPlayedRanges() {
        return streamInfo && videoModel ? videoModel.getPlayedRanges() : null;
    }

    function getEnded() {
        return streamInfo && videoModel ? videoModel.getEnded() : null;
    }

    function getIsDynamic() {
        return isDynamic;
    }

    function getStreamController() {
        return streamController;
    }

    /**
     * Computes the desirable delay for the live edge to avoid a risk of getting 404 when playing at the bleeding edge
     * @param {number} fragmentDuration - seconds?
     * @param {object} manifestInfo
     * @returns {number} object
     * @memberof PlaybackController#
     */
    function computeAndSetLiveDelay(fragmentDuration, manifestInfo) {
        let delay,
            ret,
            startTime;
        const END_OF_PLAYLIST_PADDING = 10;
        const MIN_BUFFER_TIME_FACTOR = 4;
        const FRAGMENT_DURATION_FACTOR = 4;
        const adjustedFragmentDuration = !isNaN(fragmentDuration) && isFinite(fragmentDuration) ? fragmentDuration : NaN;

        let suggestedPresentationDelay = adapter.getSuggestedPresentationDelay();


        // Apply live delay from ServiceDescription
        if (settings.get().streaming.delay.applyServiceDescription && isNaN(settings.get().streaming.delay.liveDelay) && isNaN(settings.get().streaming.delay.liveDelayFragmentCount)) {
            _applyServiceDescription(manifestInfo);
        }

        if (mediaPlayerModel.getLiveDelay()) {
            delay = mediaPlayerModel.getLiveDelay(); // If set by user, this value takes precedence
        } else if (settings.get().streaming.delay.liveDelayFragmentCount !== null && !isNaN(settings.get().streaming.delay.liveDelayFragmentCount) && !isNaN(adjustedFragmentDuration)) {
            delay = adjustedFragmentDuration * settings.get().streaming.delay.liveDelayFragmentCount;
        } else if (settings.get().streaming.delay.useSuggestedPresentationDelay === true && suggestedPresentationDelay !== null && !isNaN(suggestedPresentationDelay) && suggestedPresentationDelay > 0) {
            delay = suggestedPresentationDelay;
        } else if (!isNaN(adjustedFragmentDuration)) {
            delay = adjustedFragmentDuration * FRAGMENT_DURATION_FACTOR;
        } else {
            delay = manifestInfo && !isNaN(manifestInfo.minBufferTime) ? manifestInfo.minBufferTime * MIN_BUFFER_TIME_FACTOR : streamInfo.manifestInfo.minBufferTime * MIN_BUFFER_TIME_FACTOR;
        }

        startTime = adapter.getAvailabilityStartTime();

        if (startTime !== null) {
            availabilityStartTime = startTime;
        }

        if (manifestInfo && manifestInfo.dvrWindowSize > 0) {
            // cap target latency to:
            // - dvrWindowSize / 2 for short playlists
            // - dvrWindowSize - END_OF_PLAYLIST_PADDING for longer playlists
            const targetDelayCapping = Math.max(manifestInfo.dvrWindowSize - END_OF_PLAYLIST_PADDING, manifestInfo.dvrWindowSize / 2);
            ret = Math.min(delay, targetDelayCapping);
        } else {
            ret = delay;
        }
        liveDelay = ret;
        return ret;
    }

    function _applyServiceDescription(manifestInfo) {
        if (!manifestInfo || !manifestInfo.serviceDescriptions) {
            return;
        }

        let llsd = null;

        for (let i = 0; i < manifestInfo.serviceDescriptions.length; i++) {
            const sd = manifestInfo.serviceDescriptions[i];
            if (sd.schemeIdUri === Constants.SERVICE_DESCRIPTION_LL_SCHEME) {
                llsd = sd;
                break;
            }
        }

        if (llsd) {
            if (llsd.latency && llsd.latency.target > 0) {
                logger.debug('Apply LL properties coming from service description. Target Latency (ms):', llsd.latency.target);
                settings.update({
                    streaming: {
                        delay: {
                            liveDelay: llsd.latency.target / 1000,
                        },
                        liveCatchup: {
                            minDrift: (llsd.latency.target + 500) / 1000,
                            maxDrift: llsd.latency.max > llsd.latency.target ? (llsd.latency.max - llsd.latency.target + 500) / 1000 : undefined
                        }
                    }
                });
            }
            if (llsd.playbackRate && llsd.playbackRate.max > 1.0) {
                logger.debug('Apply LL properties coming from service description. Max PlaybackRate:', llsd.playbackRate.max);
                settings.update({
                    streaming: {
                        liveCatchup: {
                            playbackRate: llsd.playbackRate.max - 1.0
                        }
                    }
                });
            }
        }
    }

    function getAvailabilityStartTime() {
        return availabilityStartTime;
    }

    function getLiveDelay() {
        return liveDelay;
    }

    function getCurrentLiveLatency() {
        if (!isDynamic || isNaN(availabilityStartTime)) {
            return NaN;
        }
        let currentTime = getNormalizedTime();
        if (isNaN(currentTime) || currentTime === 0) {
            return 0;
        }

        const now = new Date().getTime() + timelineConverter.getClientTimeOffset() * 1000;
        return Math.max(((now - availabilityStartTime - currentTime * 1000) / 1000).toFixed(3), 0);
    }

    function reset() {
        pause();
        playOnceInitialized = false;
        liveDelay = 0;
        availabilityStartTime = 0;
        seekTarget = NaN;
        if (videoModel) {
            eventBus.off(Events.DATA_UPDATE_COMPLETED, _onDataUpdateCompleted, this);
            eventBus.off(Events.LOADING_PROGRESS, _onFragmentLoadProgress, this);
            eventBus.off(MediaPlayerEvents.BUFFER_LEVEL_STATE_CHANGED, _onBufferLevelStateChanged, this);
            eventBus.off(MediaPlayerEvents.PLAYBACK_PROGRESS, _onPlaybackProgression, this);
            eventBus.off(MediaPlayerEvents.PLAYBACK_TIME_UPDATED, _onPlaybackProgression, this);
            eventBus.off(MediaPlayerEvents.PLAYBACK_ENDED, _onPlaybackEnded, this);
            eventBus.off(MediaPlayerEvents.STREAM_INITIALIZING, _onStreamInitializing, this);
            eventBus.off(MediaPlayerEvents.REPRESENTATION_SWITCH, _onRepresentationSwitch, this);
            videoModel.setPlaybackRate(1.0, true);
            stopUpdatingWallclockTime();
            removeAllListeners();
        }
        wallclockTimeIntervalId = null;
        videoModel = null;
        streamInfo = null;
        isDynamic = null;
    }

    function setConfig(config) {
        if (!config) return;

        if (config.streamController) {
            streamController = config.streamController;
        }
        if (config.dashMetrics) {
            dashMetrics = config.dashMetrics;
        }
        if (config.mediaPlayerModel) {
            mediaPlayerModel = config.mediaPlayerModel;
        }
        if (config.adapter) {
            adapter = config.adapter;
        }
        if (config.videoModel) {
            videoModel = config.videoModel;
        }
        if (config.timelineConverter) {
            timelineConverter = config.timelineConverter;
        }
        if (config.settings) {
            settings = config.settings;
        }
    }

    function getActualPresentationTime(currentTime, mediatype) {
        const DVRMetrics = dashMetrics.getCurrentDVRInfo(mediatype);
        const DVRWindow = DVRMetrics ? DVRMetrics.range : null;
        let actualTime;

        if (!DVRWindow) {
            return NaN;
        }

        if (currentTime > DVRWindow.end) {
            actualTime = Math.max(DVRWindow.end - liveDelay, DVRWindow.start);

        } else if (currentTime > 0 && currentTime + 0.250 < DVRWindow.start && Math.abs(currentTime - DVRWindow.start) < 315360000) {

            // Checking currentTime plus 250ms as the 'timeupdate' is fired with a frequency between 4Hz and 66Hz
            // https://developer.mozilla.org/en-US/docs/Web/Events/timeupdate
            // http://w3c.github.io/html/single-page.html#offsets-into-the-media-resource
            // Checking also duration of the DVR makes sense. We detected temporary situations in which currentTime
            // is bad reported by the browser which causes playback to jump to start (315360000 = 1 year)
            if (settings.get().streaming.lowLatencyEnabled) {
                actualTime = Math.max(DVRWindow.end - liveDelay, DVRWindow.start);
            } else {
                actualTime = DVRWindow.start;
            }
        } else {
            actualTime = currentTime;
        }

        return actualTime;
    }

    function startUpdatingWallclockTime() {
        if (wallclockTimeIntervalId !== null) return;

        const tick = function () {
            _onWallclockTime();
        };

        wallclockTimeIntervalId = setInterval(tick, settings.get().streaming.wallclockTimeUpdateInterval);
    }

    function stopUpdatingWallclockTime() {
        clearInterval(wallclockTimeIntervalId);
        wallclockTimeIntervalId = null;
    }

    /**
     * Compare the current time of the video against the DVR window. If we are out of the DVR window we need to seek.
     * @param {object} mediaType
     */
    function updateCurrentTime(mediaType = null) {
        if (isPaused() || !isDynamic || videoModel.getReadyState() === 0 || isSeeking()) return;

        // Note: In some cases we filter certain media types completely (for instance due to an unsupported video codec). This happens after the first entry to the DVR metric has been added.
        // Now the DVR window for the filtered media type is not updated anymore. Consequently, always use a mediaType that is available to get a valid DVR window.
        if (!mediaType) {
            mediaType = streamController.hasVideoTrack() ? Constants.VIDEO : Constants.AUDIO;
        }
        // Compare the current time of the video element against the range defined in the DVR window.
        const currentTime = getNormalizedTime();
        const actualTime = getActualPresentationTime(currentTime, mediaType);
        const timeChanged = (!isNaN(actualTime) && actualTime !== currentTime);
        if (timeChanged && !isSeeking() && (isStalled() || playbackStalled)) {
            logger.debug(`UpdateCurrentTime: Seek to actual time: ${actualTime} from currentTime: ${currentTime}`);
            seek(actualTime);
        }
    }

    function _onDataUpdateCompleted(e) {
        const representationInfo = adapter.convertRepresentationToRepresentationInfo(e.currentRepresentation);
        const info = representationInfo ? representationInfo.mediaInfo.streamInfo : null;

        if (info === null || streamInfo.id !== info.id) return;
        streamInfo = info;
    }

    function _onCanPlay() {
        eventBus.trigger(Events.CAN_PLAY);
    }

    function _onCanPlayThrough() {
        eventBus.trigger(Events.CAN_PLAY_THROUGH);
    }

    function _onPlaybackStart() {
        logger.info('Native video element event: play');
        updateCurrentTime();
        startUpdatingWallclockTime();
        eventBus.trigger(Events.PLAYBACK_STARTED, { startTime: getTime() });
    }

    function _onPlaybackWaiting() {
        logger.info('Native video element event: waiting');
        eventBus.trigger(Events.PLAYBACK_WAITING, { playingTime: getTime() });
    }

    function _onPlaybackPlaying() {
        logger.info('Native video element event: playing');
        eventBus.trigger(Events.PLAYBACK_PLAYING, { playingTime: getTime() });
    }

    function _onPlaybackPaused() {
        logger.info('Native video element event: pause');
        eventBus.trigger(Events.PLAYBACK_PAUSED, { ended: getEnded() });
    }

    function _onPlaybackSeeking() {
        // Check if internal seeking to be ignored
        if (internalSeek) {
            internalSeek = false;
            return;
        }

        let seekTime = getTime();
        // On some browsers/devices, in case of live streams, setting current time on video element fails when there is no buffered data at requested time
        // Then re-set seek target time and video element will be seeked afterwhile once data is buffered (see BufferContoller)
        if (!isNaN(seekTarget) && seekTarget !== seekTime) {
            seekTime = seekTarget;
        }
        seekTarget = NaN;

        logger.info('Seeking to: ' + seekTime);
        startUpdatingWallclockTime();
        eventBus.trigger(Events.PLAYBACK_SEEKING, {
            seekTime: seekTime,
            streamId: streamInfo.id
        });
    }

    function _onPlaybackSeeked() {
        logger.info('Native video element event: seeked');
        eventBus.trigger(Events.PLAYBACK_SEEKED);
    }

    function _onPlaybackTimeUpdated() {
        if (streamInfo) {
            eventBus.trigger(Events.PLAYBACK_TIME_UPDATED, {
                timeToEnd: getTimeToStreamEnd(),
                time: getTime(),
                streamId: streamInfo.id
            });
        }
    }

    function _onPlaybackProgress() {
        eventBus.trigger(Events.PLAYBACK_PROGRESS, { streamId: streamInfo.id });
    }

    function _onPlaybackRateChanged() {
        const rate = getPlaybackRate();
        logger.info('Native video element event: ratechange: ', rate);
        eventBus.trigger(Events.PLAYBACK_RATE_CHANGED, { playbackRate: rate });
    }

    function _onPlaybackMetaDataLoaded() {
        logger.info('Native video element event: loadedmetadata');
        eventBus.trigger(Events.PLAYBACK_METADATA_LOADED);
        startUpdatingWallclockTime();
    }

    function _onPlaybackLoadedData() {
        logger.info('Native video element event: loadeddata');
        eventBus.trigger(Events.PLAYBACK_LOADED_DATA);
    }

    // Event to handle the native video element ended event
    function _onNativePlaybackEnded() {
        logger.info('Native video element event: ended');
        pause();
        stopUpdatingWallclockTime();
        const streamInfo = streamController ? streamController.getActiveStreamInfo() : null;
        if (!streamInfo) return;
        eventBus.trigger(Events.PLAYBACK_ENDED, { 'isLast': streamInfo.isLast });
    }

    // Handle DASH PLAYBACK_ENDED event
    function _onPlaybackEnded(e) {
        if (wallclockTimeIntervalId && e.isLast) {
            // PLAYBACK_ENDED was triggered elsewhere, react.
            logger.info('onPlaybackEnded -- PLAYBACK_ENDED but native video element didn\'t fire ended');
            const seekTime = e.seekTime ? e.seekTime : getStreamEndTime();
            videoModel.setCurrentTime(seekTime);
            pause();
            stopUpdatingWallclockTime();
        }
    }

    function _onPlaybackError(event) {
        const target = event.target || event.srcElement;
        eventBus.trigger(Events.PLAYBACK_ERROR, { error: target.error });
    }

    function _onWallclockTime() {
        eventBus.trigger(Events.WALLCLOCK_TIME_UPDATED, {
            isDynamic: isDynamic,
            time: new Date()
        });

        // Updates playback time for paused dynamic streams
        // (video element doesn't call timeupdate when the playback is paused)
        if (getIsDynamic()) {
            if (isPaused()) {
                _updateLivePlaybackTime();
            } else {
                updateCurrentTime();
            }
        }
    }

    function _updateLivePlaybackTime() {
        const now = Date.now();
        if (!lastLivePlaybackTime || now > lastLivePlaybackTime + LIVE_UPDATE_PLAYBACK_TIME_INTERVAL_MS) {
            lastLivePlaybackTime = now;
            _onPlaybackTimeUpdated();
        }
    }


    function _onPlaybackProgression() {
        if (
            isDynamic &&
            _isCatchupEnabled() &&
            settings.get().streaming.liveCatchup.playbackRate > 0 &&
            !isPaused() &&
            !isSeeking()
        ) {
            if (_needToCatchUp()) {
                startPlaybackCatchUp();
            } else {
                stopPlaybackCatchUp();
            }
        }
    }

    function _isCatchupEnabled() {
        return settings.get().streaming.liveCatchup.enabled || settings.get().streaming.lowLatencyEnabled;
    }

    function getBufferLevel() {
        let bufferLevel = null;
        streamController.getActiveStreamProcessors().forEach(p => {
            const bl = p.getBufferLevel();
            if (bufferLevel === null) {
                bufferLevel = bl;
            } else {
                bufferLevel = Math.min(bufferLevel, bl);
            }
        });

        return bufferLevel;
    }

    /**
     * Returns the mode for live playback catchup.
     * @return {String}
     * @private
     */
    function _getCatchupMode() {
        const playbackBufferMin = settings.get().streaming.liveCatchup.playbackBufferMin;

        return settings.get().streaming.liveCatchup.mode === Constants.LIVE_CATCHUP_MODE_LOLP && playbackBufferMin !== null && !isNaN(playbackBufferMin) ? Constants.LIVE_CATCHUP_MODE_LOLP : Constants.LIVE_CATCHUP_MODE_DEFAULT;
    }

    /**
     * Checks whether the catchup mechanism should be enabled
     * @return {boolean}
     */
    function _needToCatchUp() {
        try {
            if (_isCatchupEnabled() && settings.get().streaming.liveCatchup.playbackRate > 0 && getTime() > 0) {

                const catchupMode = _getCatchupMode();
                const currentLiveLatency = getCurrentLiveLatency();
                const liveDelay = mediaPlayerModel.getLiveDelay();
                const liveCatchupLatencyThreshold = mediaPlayerModel.getLiveCatchupLatencyThreshold();
                const liveCatchUpMinDrift = settings.get().streaming.liveCatchup.minDrift;

                if (catchupMode === Constants.LIVE_CATCHUP_MODE_LOLP) {
                    const currentBuffer = getBufferLevel();
                    const playbackBufferMin = settings.get().streaming.liveCatchup.playbackBufferMin;

                    return _lolpNeedToCatchUpCustom(currentLiveLatency, liveDelay, liveCatchUpMinDrift, currentBuffer, playbackBufferMin, liveCatchupLatencyThreshold);
                } else {
                    return _defaultNeedToCatchUp(currentLiveLatency, liveDelay, liveCatchupLatencyThreshold, liveCatchUpMinDrift);
                }
            }
        } catch (e) {
            return false;
        }
    }

    /**
     * Default algorithm to determine if catchup mode should be enabled
     * @param {number} currentLiveLatency
     * @param {number} liveDelay
     * @param {number} liveCatchupLatencyThreshold
     * @param {number} minDrift
     * @return {boolean}
     * @private
     */
    function _defaultNeedToCatchUp(currentLiveLatency, liveDelay, liveCatchupLatencyThreshold, minDrift) {
        try {
            const latencyDrift = Math.abs(currentLiveLatency - liveDelay);

            return latencyDrift > minDrift && (isNaN(liveCatchupLatencyThreshold) || currentLiveLatency <= liveCatchupLatencyThreshold);
        } catch (e) {
            return false;
        }
    }

    /**
     * LoL+ logic to determine if catchup mode should be enabled
     * @param {number} currentLiveLatency
     * @param {number} liveDelay
     * @param {number} minDrift
     * @param {number} currentBuffer
     * @param {number} playbackBufferMin
     * @param {number} liveCatchupLatencyThreshold
     * @return {boolean}
     * @private
     */
    function _lolpNeedToCatchUpCustom(currentLiveLatency, liveDelay, minDrift, currentBuffer, playbackBufferMin, liveCatchupLatencyThreshold) {
        try {
            const latencyDrift = Math.abs(currentLiveLatency - liveDelay);

            return (isNaN(liveCatchupLatencyThreshold) || currentLiveLatency <= liveCatchupLatencyThreshold) && (latencyDrift > minDrift || currentBuffer < playbackBufferMin);
        } catch (e) {
            return false;
        }
    }

    /**
     * Apply catchup mode
     */
    function startPlaybackCatchUp() {
        if (videoModel) {
            let results;
            const currentPlaybackRate = videoModel.getPlaybackRate();
            const liveCatchupPlaybackRate = settings.get().streaming.liveCatchup.playbackRate;
            const currentLiveLatency = getCurrentLiveLatency();
            const liveDelay = mediaPlayerModel.getLiveDelay();
            const bufferLevel = getBufferLevel();
            // Custom playback control: Based on buffer level
            if (_getCatchupMode() === Constants.LIVE_CATCHUP_MODE_LOLP) {
                const liveCatchUpMinDrift = settings.get().streaming.liveCatchup.minDrift;
                const playbackBufferMin = settings.get().streaming.liveCatchup.playbackBufferMin;
                results = _calculateNewPlaybackRateLolP(liveCatchupPlaybackRate, currentLiveLatency, liveDelay, liveCatchUpMinDrift, playbackBufferMin, bufferLevel, currentPlaybackRate);
            } else {
                // Default playback control: Based on target and current latency
                results = _calculateNewPlaybackRateDefault(liveCatchupPlaybackRate, currentLiveLatency, liveDelay, bufferLevel, currentPlaybackRate);
            }

            // Obtain newRate and apply to video model
            let newRate = results.newRate;
            if (newRate) {  // non-null
                videoModel.setPlaybackRate(newRate);
            }

            const deltaLatency = currentLiveLatency - liveDelay;
            if (settings.get().streaming.liveCatchup.maxDrift > 0 && !isLowLatencySeekingInProgress &&
                deltaLatency > settings.get().streaming.liveCatchup.maxDrift) {
                logger.info('Low Latency catchup mechanism. Latency too high, doing a seek to live point');
                isLowLatencySeekingInProgress = true;
                seekToLive();
            } else {
                isLowLatencySeekingInProgress = false;
            }
        }
    }

    /**
     * Default algorithm to calculate the new playback rate
     * @param {number} liveCatchUpPlaybackRate
     * @param {number} currentLiveLatency
     * @param {number} liveDelay
     * @param {number} bufferLevel
     * @param {number} currentPlaybackRate
     * @return {{newRate: number}}
     * @private
     */
    function _calculateNewPlaybackRateDefault(liveCatchUpPlaybackRate, currentLiveLatency, liveDelay, bufferLevel, currentPlaybackRate) {
        const cpr = liveCatchUpPlaybackRate;
        const deltaLatency = currentLiveLatency - liveDelay;
        const d = deltaLatency * 5;

        // Playback rate must be between (1 - cpr) - (1 + cpr)
        // ex: if cpr is 0.5, it can have values between 0.5 - 1.5
        const s = (cpr * 2) / (1 + Math.pow(Math.E, -d));
        let newRate = (1 - cpr) + s;
        // take into account situations in which there are buffer stalls,
        // in which increasing playbackRate to reach target latency will
        // just cause more and more stall situations
        if (playbackStalled) {
            // const bufferLevel = getBufferLevel();
            if (bufferLevel > liveDelay / 2) {
                // playbackStalled = false;
                playbackStalled = false;
            } else if (deltaLatency > 0) {
                newRate = 1.0;
            }
        }

        // don't change playbackrate for small variations (don't overload element with playbackrate changes)
        if (Math.abs(currentPlaybackRate - newRate) <= minPlaybackRateChange) {
            newRate = null;
        }

        return {
            newRate: newRate
        };

    }

    /**
     * Lol+ algorithm to calculate the new playback rate
     * @param {number} liveCatchUpPlaybackRate
     * @param {number} currentLiveLatency
     * @param {number} liveDelay
     * @param {number} minDrift
     * @param {number} playbackBufferMin
     * @param {number} bufferLevel
     * @param {number} currentPlaybackRate
     * @return {{newRate: number}}
     * @private
     */
    function _calculateNewPlaybackRateLolP(liveCatchUpPlaybackRate, currentLiveLatency, liveDelay, minDrift, playbackBufferMin, bufferLevel, currentPlaybackRate) {
        const cpr = liveCatchUpPlaybackRate;
        let newRate;

        // Hybrid: Buffer-based
        if (bufferLevel < playbackBufferMin) {
            // Buffer in danger, slow down
            const deltaBuffer = bufferLevel - playbackBufferMin;  // -ve value
            const d = deltaBuffer * 5;

            // Playback rate must be between (1 - cpr) - (1 + cpr)
            // ex: if cpr is 0.5, it can have values between 0.5 - 1.5
            const s = (cpr * 2) / (1 + Math.pow(Math.E, -d));
            newRate = (1 - cpr) + s;

            logger.debug('[LoL+ playback control_buffer-based] bufferLevel: ' + bufferLevel + ', newRate: ' + newRate);
        } else {
            // Hybrid: Latency-based
            // Buffer is safe, vary playback rate based on latency

            // Check if latency is within range of target latency
            const minDifference = 0.02;
            if (Math.abs(currentLiveLatency - liveDelay) <= (minDifference * liveDelay)) {
                newRate = 1;
            } else {
                const deltaLatency = currentLiveLatency - liveDelay;
                const d = deltaLatency * 5;

                // Playback rate must be between (1 - cpr) - (1 + cpr)
                // ex: if cpr is 0.5, it can have values between 0.5 - 1.5
                const s = (cpr * 2) / (1 + Math.pow(Math.E, -d));
                newRate = (1 - cpr) + s;
            }

            logger.debug('[LoL+ playback control_latency-based] latency: ' + currentLiveLatency + ', newRate: ' + newRate);
        }

        if (playbackStalled) {
            if (bufferLevel > liveDelay / 2) {
                playbackStalled = false;
            }
        }

        // don't change playbackrate for small variations (don't overload element with playbackrate changes)
        if (Math.abs(currentPlaybackRate - newRate) <= minPlaybackRateChange) {
            newRate = null;
        }

        return {
            newRate: newRate
        };
    }

    function stopPlaybackCatchUp() {
        if (videoModel) {
            videoModel.setPlaybackRate(1.0);
        }
    }

    function _onFragmentLoadProgress(e) {
        // If using fetch and stream mode is not available, readjust live latency so it is 20% higher than segment duration
        if (e.stream === false && settings.get().streaming.lowLatencyEnabled && !isNaN(e.request.duration)) {
            const minDelay = 1.2 * e.request.duration;
            if (minDelay > mediaPlayerModel.getLiveDelay()) {
                logger.warn('Browser does not support fetch API with StreamReader. Increasing live delay to be 20% higher than segment duration:', minDelay.toFixed(2));
                settings.update({
                    streaming: {
                        delay: {
                            liveDelay: minDelay,
                        }
                    }
                });
            }
        }
    }

    function _onBufferLevelStateChanged(e) {
        // do not stall playback when get an event from Stream that is not active
        if (e.streamId !== streamInfo.id) return;

        if (_isCatchupEnabled()) {
            if (e.state === MetricsConstants.BUFFER_EMPTY && !isSeeking()) {
                if (!playbackStalled) {
                    playbackStalled = true;
                    stopPlaybackCatchUp();
                }
            }
        } else {
            if (settings.get().streaming.buffer.setStallState) {
                videoModel.setStallState(e.mediaType, e.state === MetricsConstants.BUFFER_EMPTY);
            }
        }
    }

    function onPlaybackStalled(e) {
        eventBus.trigger(Events.PLAYBACK_STALLED, { e: e });
    }

    function _onStreamInitializing(e) {
        _checkEnableLowLatency(e.mediaInfo);
    }

    /**
     * We enable low latency playback if for the current representation availabilityTimeComplete is set to false
     * @param e
     * @private
     */
    function _onRepresentationSwitch(e) {
        const activeStreamInfo = streamController.getActiveStreamInfo();
        if (!settings.get().streaming.lowLatencyEnabledByManifest || !e || !activeStreamInfo || !e.currentRepresentation || !e.streamId || e.streamId !== activeStreamInfo.id || !e.mediaType || (e.mediaType !== Constants.VIDEO && e.mediaType !== Constants.AUDIO)) {
            return;
        }

        const lowLatencyEnabled = !e.currentRepresentation.availabilityTimeComplete;

        if (lowLatencyEnabled) {
            settings.update({
                streaming: {
                    lowLatencyEnabled: lowLatencyEnabled
                }
            });
        }
    }


    function _checkEnableLowLatency(mediaInfo) {
        if (mediaInfo && mediaInfo.supplementalProperties &&
            mediaInfo.supplementalProperties[Constants.SUPPLEMENTAL_PROPERTY_LL_SCHEME] === 'true') {
            logger.debug('Low Latency critical SupplementalProperty set: Enabling low Latency');
            settings.update({
                streaming: {
                    lowLatencyEnabled: true
                }
            });
        }
    }

    function addAllListeners() {
        videoModel.addEventListener('canplay', _onCanPlay);
        videoModel.addEventListener('canplaythrough', _onCanPlayThrough);
        videoModel.addEventListener('play', _onPlaybackStart);
        videoModel.addEventListener('waiting', _onPlaybackWaiting);
        videoModel.addEventListener('playing', _onPlaybackPlaying);
        videoModel.addEventListener('pause', _onPlaybackPaused);
        videoModel.addEventListener('error', _onPlaybackError);
        videoModel.addEventListener('seeking', _onPlaybackSeeking);
        videoModel.addEventListener('seeked', _onPlaybackSeeked);
        videoModel.addEventListener('timeupdate', _onPlaybackTimeUpdated);
        videoModel.addEventListener('progress', _onPlaybackProgress);
        videoModel.addEventListener('ratechange', _onPlaybackRateChanged);
        videoModel.addEventListener('loadedmetadata', _onPlaybackMetaDataLoaded);
        videoModel.addEventListener('loadeddata', _onPlaybackLoadedData);
        videoModel.addEventListener('stalled', onPlaybackStalled);
        videoModel.addEventListener('ended', _onNativePlaybackEnded);
    }

    function removeAllListeners() {
        videoModel.removeEventListener('canplay', _onCanPlay);
        videoModel.removeEventListener('canplaythrough', _onCanPlayThrough);
        videoModel.removeEventListener('play', _onPlaybackStart);
        videoModel.removeEventListener('waiting', _onPlaybackWaiting);
        videoModel.removeEventListener('playing', _onPlaybackPlaying);
        videoModel.removeEventListener('pause', _onPlaybackPaused);
        videoModel.removeEventListener('error', _onPlaybackError);
        videoModel.removeEventListener('seeking', _onPlaybackSeeking);
        videoModel.removeEventListener('seeked', _onPlaybackSeeked);
        videoModel.removeEventListener('timeupdate', _onPlaybackTimeUpdated);
        videoModel.removeEventListener('progress', _onPlaybackProgress);
        videoModel.removeEventListener('ratechange', _onPlaybackRateChanged);
        videoModel.removeEventListener('loadedmetadata', _onPlaybackMetaDataLoaded);
        videoModel.removeEventListener('loadeddata', _onPlaybackLoadedData);
        videoModel.removeEventListener('stalled', onPlaybackStalled);
        videoModel.removeEventListener('ended', _onNativePlaybackEnded);
    }

    instance = {
        initialize,
        setConfig,
        getTimeToStreamEnd,
        getBufferLevel,
        getTime,
        getNormalizedTime,
        getPlaybackRate,
        getPlayedRanges,
        getEnded,
        getIsDynamic,
        getStreamController,
        computeAndSetLiveDelay,
        getLiveDelay,
        getCurrentLiveLatency,
        play,
        isPaused,
        pause,
        isSeeking,
        getStreamEndTime,
        seek,
        reset,
        updateCurrentTime,
        getAvailabilityStartTime
    };

    setup();

    return instance;
}

PlaybackController.__dashjs_factory_name = 'PlaybackController';
export default FactoryMaker.getSingletonFactory(PlaybackController);
