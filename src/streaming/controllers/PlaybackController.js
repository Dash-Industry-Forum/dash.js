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
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import FactoryMaker from '../../core/FactoryMaker';
import Debug from '../../core/Debug';
import MediaPlayerEvents from '../../streaming/MediaPlayerEvents';
import MetricsConstants from '../constants/MetricsConstants';

const LIVE_UPDATE_PLAYBACK_TIME_INTERVAL_MS = 500;

function PlaybackController() {

    const context = this.context;
    const eventBus = EventBus(context).getInstance();

    let instance,
        logger,
        streamController,
        serviceDescriptionController,
        dashMetrics,
        adapter,
        videoModel,
        timelineConverter,
        wallclockTimeIntervalId,
        liveDelay,
        originalLiveDelay,
        streamInfo,
        isDynamic,
        playOnceInitialized,
        lastLivePlaybackTime,
        availabilityStartTime,
        availabilityTimeComplete,
        lowLatencyModeEnabled,
        seekTarget,
        internalSeek,
        playbackStalled,
        manifestUpdateInProgress,
        initialCatchupModeActivated,
        settings;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);

        reset();
    }

    /**
     * Reset all settings
     */
    function reset() {
        pause();
        playOnceInitialized = false;
        liveDelay = 0;
        originalLiveDelay = 0;
        availabilityStartTime = 0;
        manifestUpdateInProgress = false;
        availabilityTimeComplete = true;
        lowLatencyModeEnabled = false;
        initialCatchupModeActivated = false;
        seekTarget = NaN;

        if (videoModel) {
            eventBus.off(Events.DATA_UPDATE_COMPLETED, _onDataUpdateCompleted, instance);
            eventBus.off(Events.LOADING_PROGRESS, _onFragmentLoadProgress, instance);
            eventBus.off(Events.MANIFEST_UPDATED, _onManifestUpdated, instance);
            eventBus.off(Events.STREAMS_COMPOSED, _onStreamsComposed, instance);
            eventBus.off(MediaPlayerEvents.PLAYBACK_ENDED, _onPlaybackEnded, instance);
            eventBus.off(MediaPlayerEvents.STREAM_INITIALIZING, _onStreamInitializing, instance);
            eventBus.off(MediaPlayerEvents.REPRESENTATION_SWITCH, _onRepresentationSwitch, instance);
            eventBus.off(MediaPlayerEvents.BUFFER_LEVEL_STATE_CHANGED, _onBufferLevelStateChanged, instance);
            stopUpdatingWallclockTime();
            removeAllListeners();
        }

        wallclockTimeIntervalId = null;
        videoModel = null;
        streamInfo = null;
        isDynamic = null;
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
        }
    }

    /**
     * Initializes the PlaybackController when the first stream is to be played.
     * @private
     */
    function _initializeForFirstStream() {
        addAllListeners();
        isDynamic = streamInfo.manifestInfo.isDynamic;

        playbackStalled = false;
        internalSeek = false;

        eventBus.on(Events.DATA_UPDATE_COMPLETED, _onDataUpdateCompleted, instance);
        eventBus.on(Events.LOADING_PROGRESS, _onFragmentLoadProgress, instance);
        eventBus.on(Events.MANIFEST_UPDATED, _onManifestUpdated, instance);
        eventBus.on(Events.STREAMS_COMPOSED, _onStreamsComposed, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_ENDED, _onPlaybackEnded, instance, { priority: EventBus.EVENT_PRIORITY_HIGH });
        eventBus.on(MediaPlayerEvents.STREAM_INITIALIZING, _onStreamInitializing, instance);
        eventBus.on(MediaPlayerEvents.REPRESENTATION_SWITCH, _onRepresentationSwitch, instance);
        eventBus.on(MediaPlayerEvents.BUFFER_LEVEL_STATE_CHANGED, _onBufferLevelStateChanged, instance);

        if (playOnceInitialized) {
            playOnceInitialized = false;
            play();
        }
    }

    /**
     * Returns stalled state
     * @return {boolean}
     */
    function getPlaybackStalled() {
        return playbackStalled
    }

    /**
     * Returns remaining duration of a period
     * @param {object} sInfo
     * @return {number}
     */
    function getTimeToStreamEnd(sInfo = null) {
        return parseFloat((getStreamEndTime(sInfo) - getTime()).toFixed(5));
    }

    /**
     * Returns end time of a period
     * @param {object} sInfo
     * @return {number}
     */
    function getStreamEndTime(sInfo) {
        const refInfo = sInfo ? sInfo : streamInfo;
        return refInfo.start + refInfo.duration;
    }

    /**
     * Triggers play() on the video element
     */
    function play(adjustLiveDelay = false) {
        if (streamInfo && videoModel && videoModel.getElement()) {
            if (adjustLiveDelay && isDynamic) {
                _adjustLiveDelayAfterUserInteraction(getTime());
            }
            videoModel.play();
        } else {
            playOnceInitialized = true;
        }
    }

    /**
     * Triggers pause() on the video element
     */
    function pause() {
        if (streamInfo && videoModel) {
            videoModel.pause();
        }
    }

    /**
     * Triggers a seek to the specified media time. If internal is enabled there will be now "seeked" event dispatched
     * @param {number} time
     * @param {boolean} stickToBuffered
     * @param {boolean} internal
     * @param {boolean} adjustLiveDelay
     */
    function seek(time, stickToBuffered = false, internal = false, adjustLiveDelay = false) {
        if (!streamInfo || !videoModel) return;

        let currentTime = !isNaN(seekTarget) ? seekTarget : videoModel.getTime();
        if (time === currentTime) return;

        internalSeek = (internal === true);

        if (!internalSeek) {
            seekTarget = time;
        }
        logger.info('Requesting seek to time: ' + time + (internalSeek ? ' (internal)' : ''));

        // We adjust the current latency. If catchup is enabled we will maintain this new latency
        if (isDynamic && adjustLiveDelay) {
            _adjustLiveDelayAfterUserInteraction(time);
        }

        videoModel.setCurrentTime(time, stickToBuffered);
    }

    /**
     * Seeks back to the live edge as defined by the originally calculated live delay
     * @param {boolean} stickToBuffered
     * @param {boolean} internal
     * @param {boolean} adjustLiveDelay
     */
    function seekToOriginalLive(stickToBuffered = false, internal = false, adjustLiveDelay = false) {
        const dvrWindowEnd = _getDvrWindowEnd();

        if (dvrWindowEnd === 0) {
            return;
        }

        liveDelay = originalLiveDelay;
        const seektime = dvrWindowEnd - liveDelay;

        seek(seektime, stickToBuffered, internal, adjustLiveDelay);
    }

    /**
     * Seeks to the live edge as currently defined by liveDelay
     * @param {boolean} stickToBuffered
     * @param {boolean} internal
     * @param {boolean} adjustLiveDelay
     */
    function seekToCurrentLive(stickToBuffered = false, internal = false, adjustLiveDelay = false) {
        const dvrWindowEnd = _getDvrWindowEnd();

        if (dvrWindowEnd === 0) {
            return;
        }

        const seektime = dvrWindowEnd - liveDelay;

        seek(seektime, stickToBuffered, internal, adjustLiveDelay);
    }

    function _getDvrWindowEnd() {
        if (!streamInfo || !videoModel || !isDynamic) {
            return;
        }

        const type = streamController && streamController.hasVideoTrack() ? Constants.VIDEO : Constants.AUDIO;
        const dvrInfo = dashMetrics.getCurrentDVRInfo(type);

        return dvrInfo && dvrInfo.range ? dvrInfo.range.end : 0;
    }


    function _adjustLiveDelayAfterUserInteraction(time) {
        const now = new Date(timelineConverter.getClientReferenceTime());
        const period = adapter.getRegularPeriods()[0];
        const nowAsPresentationTime = timelineConverter.calcPresentationTimeFromWallTime(now, period);

        liveDelay = nowAsPresentationTime - time;
    }

    /**
     * Returns current time of video element
     * @return {number|null}
     */
    function getTime() {
        return streamInfo && videoModel ? videoModel.getTime() : null;
    }

    /**
     * Returns paused state of the video element
     * @return {boolean|null}
     */
    function isPaused() {
        return streamInfo && videoModel ? videoModel.isPaused() : null;
    }

    /**
     * Returns seeking state of the video element
     * @return {boolean|null}
     */
    function isSeeking() {
        return streamInfo && videoModel ? videoModel.isSeeking() : null;
    }

    /**
     * Returns stalled state of the video element
     * @return {boolean|null}
     */
    function isStalled() {
        return streamInfo && videoModel ? videoModel.isStalled() : null;
    }

    /**
     * Returns current playback rate of the video element
     * @return {number|null}
     */
    function getPlaybackRate() {
        return streamInfo && videoModel ? videoModel.getPlaybackRate() : null;
    }

    /**
     * Returns the played ranges of the video element
     * @return {array}
     */
    function getPlayedRanges() {
        return streamInfo && videoModel ? videoModel.getPlayedRanges() : null;
    }

    /**
     * Returns ended attribute of the video element
     * @return {boolean|null}
     */
    function getEnded() {
        return streamInfo && videoModel ? videoModel.getEnded() : null;
    }

    /**
     * Returns whether a stream is type dynamic or not
     * @return {boolean}
     */
    function getIsDynamic() {
        return isDynamic;
    }

    /**
     * Returns the StreamController
     * @return {object}
     */
    function getStreamController() {
        return streamController;
    }

    /**
     * Returns whether a manifest update is in progress
     * @return {boolean}
     */
    function getIsManifestUpdateInProgress() {
        return manifestUpdateInProgress;
    }

    /**
     * Returns the availabilityStartTime
     * @return {number}
     */
    function getAvailabilityStartTime() {
        return availabilityStartTime;
    }

    /**
     * Returns the current live delay. A seek triggered by the user adjusts this value.
     * @return {number}
     */
    function getLiveDelay() {
        return liveDelay;
    }

    /**
     * Returns the original live delay as calculated at playback start
     */
    function getOriginalLiveDelay() {
        return originalLiveDelay;
    }

    /**
     * Returns the current live latency
     * @return {number}
     */
    function getCurrentLiveLatency() {
        if (!isDynamic || isNaN(availabilityStartTime)) {
            return NaN;
        }
        let currentTime = getTime();
        if (isNaN(currentTime) || currentTime === 0) {
            return 0;
        }

        const now = new Date().getTime() + timelineConverter.getClientTimeOffset() * 1000;
        return Math.max(((now - availabilityStartTime - currentTime * 1000) / 1000).toFixed(3), 0);
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
        const MIN_BUFFER_TIME_FACTOR = 4;
        const FRAGMENT_DURATION_FACTOR = 4;
        const adjustedFragmentDuration = !isNaN(fragmentDuration) && isFinite(fragmentDuration) ? fragmentDuration : NaN;

        let suggestedPresentationDelay = adapter.getSuggestedPresentationDelay();
        const serviceDescriptionSettings = serviceDescriptionController.getServiceDescriptionSettings();

        // Live delay specified by the user
        if (!isNaN(settings.get().streaming.delay.liveDelay)) {
            delay = settings.get().streaming.delay.liveDelay;
        }

        // Live delay fragment count specified by the user
        else if (settings.get().streaming.delay.liveDelayFragmentCount !== null && !isNaN(settings.get().streaming.delay.liveDelayFragmentCount) && !isNaN(adjustedFragmentDuration)) {
            delay = adjustedFragmentDuration * settings.get().streaming.delay.liveDelayFragmentCount;
        }

        // Live delay set via ServiceDescription element
        else if (serviceDescriptionSettings && !isNaN(serviceDescriptionSettings.liveDelay) && serviceDescriptionSettings.liveDelay > 0) {
            delay = serviceDescriptionSettings.liveDelay;
        }
        // Live delay set in the manifest using @suggestedPresentation Delay
        else if (settings.get().streaming.delay.useSuggestedPresentationDelay === true && suggestedPresentationDelay !== null && !isNaN(suggestedPresentationDelay) && suggestedPresentationDelay > 0) {
            delay = suggestedPresentationDelay;
        }

        // We found a fragment duration, use that to calculcate live delay
        else if (!isNaN(adjustedFragmentDuration)) {
            delay = adjustedFragmentDuration * FRAGMENT_DURATION_FACTOR;
        }

        // Fall back to @minBufferTime to calculate the live delay
        else {
            delay = manifestInfo && !isNaN(manifestInfo.minBufferTime) ? manifestInfo.minBufferTime * MIN_BUFFER_TIME_FACTOR : streamInfo.manifestInfo.minBufferTime * MIN_BUFFER_TIME_FACTOR;
        }

        startTime = adapter.getAvailabilityStartTime();
        if (startTime !== null) {
            availabilityStartTime = startTime;
        }

        if (manifestInfo && manifestInfo.dvrWindowSize > 0) {
            // Latency can not be higher than DVR window size
            ret = Math.min(delay, manifestInfo.dvrWindowSize);
        } else {
            ret = delay;
        }
        liveDelay = ret;
        originalLiveDelay = ret;

        return ret;
    }

    function setConfig(config) {
        if (!config) return;

        if (config.streamController) {
            streamController = config.streamController;
        }
        if (config.serviceDescriptionController) {
            serviceDescriptionController = config.serviceDescriptionController;
        }
        if (config.dashMetrics) {
            dashMetrics = config.dashMetrics;
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

    /**
     * Compare the current time of the video against the DVR window. If we are out of the DVR window we need to seek.
     * @param {object} mediaType
     */
    function updateCurrentTime(mediaType = null) {
        if (isPaused() || !isDynamic || videoModel.getReadyState() === 0 || isSeeking() || manifestUpdateInProgress) return;

        // Note: In some cases we filter certain media types completely (for instance due to an unsupported video codec). This happens after the first entry to the DVR metric has been added.
        // Now the DVR window for the filtered media type is not updated anymore. Consequently, always use a mediaType that is available to get a valid DVR window.
        if (!mediaType) {
            mediaType = streamController.hasVideoTrack() ? Constants.VIDEO : Constants.AUDIO;
        }
        // Compare the current time of the video element against the range defined in the DVR window.
        const currentTime = getTime();
        const actualTime = _getAdjustedPresentationTime(currentTime, mediaType);
        const timeChanged = (!isNaN(actualTime) && actualTime !== currentTime);
        if (timeChanged && !isSeeking() && (isStalled() || playbackStalled || videoModel.getReadyState() === 1)) {
            logger.debug(`UpdateCurrentTime: Seek to actual time: ${actualTime} from currentTime: ${currentTime}`);
            seek(actualTime, false, false);
        }
    }

    /**
     * Adjust the presentation time based on the DVR window. If we are out of the DVR window we return a corrected time
     * @param {number} currentTime
     * @param {string} mediatype
     * @return {number}
     * @private
     */
    function _getAdjustedPresentationTime(currentTime, mediatype) {
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
            if (lowLatencyModeEnabled) {
                actualTime = Math.max(DVRWindow.end - liveDelay, DVRWindow.start);
            } else {
                actualTime = DVRWindow.start;
            }
        } else {
            actualTime = currentTime;
        }

        return actualTime;
    }

    /**
     * Start interval handler for wallclock time update
     */
    function startUpdatingWallclockTime() {
        if (wallclockTimeIntervalId !== null) return;

        wallclockTimeIntervalId = setInterval(() => {
            _onWallclockTime();
        }, settings.get().streaming.wallclockTimeUpdateInterval);
    }

    /**
     * Stop the interval handler for the wallclock time update
     */
    function stopUpdatingWallclockTime() {
        clearInterval(wallclockTimeIntervalId);
        wallclockTimeIntervalId = null;
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

    function _onBufferLevelStateChanged(e) {
        // do not stall playback when get an event from Stream that is not active
        if (e.streamId !== streamController.getActiveStreamInfo().id) {
            return;
        }

        playbackStalled = e.state === MetricsConstants.BUFFER_EMPTY;

        if (settings.get().streaming.buffer.setStallState) {
            videoModel.setStallState(e.mediaType, e.state === MetricsConstants.BUFFER_EMPTY);
        }
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
        internalSeek = false;
        eventBus.trigger(Events.PLAYBACK_PLAYING, { playingTime: getTime() });
    }

    function _onPlaybackPaused() {
        logger.info('Native video element event: pause');
        eventBus.trigger(Events.PLAYBACK_PAUSED, { ended: getEnded() });
    }

    function _onPlaybackSeeking() {
        // Check if internal seeking to be ignored
        if (internalSeek) {
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
        internalSeek = false;
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

    function _onVolumeChanged() {
        eventBus.trigger(Events.PLAYBACK_VOLUME_CHANGED);
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
            streamController.addDVRMetric();
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

    /**
     * Returns the combined minimum buffer level of all StreamProcessors. If a filter list is provided the types specified in the filter list are excluded.
     * @param {array} filterList StreamProcessor types to exclude
     * @return {null}
     */
    function getBufferLevel(filterList = null) {
        let bufferLevel = null;
        streamController.getActiveStreamProcessors().forEach(p => {
            if (!filterList || filterList.length === 0 || filterList.indexOf(p.getType()) === -1) {
                const bl = p.getBufferLevel();
                if (bufferLevel === null) {
                    bufferLevel = bl;
                } else {
                    bufferLevel = Math.min(bufferLevel, bl);
                }
            }
        });

        return bufferLevel;
    }

    /**
     * Returns the value of lowLatencyModeEnabled
     * @return {boolean} lowLatencyModeEnabled
     */
    function getLowLatencyModeEnabled() {
        return lowLatencyModeEnabled
    }


    function _onFragmentLoadProgress(e) {
        // If using fetch and stream mode is not available, readjust live latency so it is 20% higher than segment duration
        if (e.stream === false && lowLatencyModeEnabled && !isNaN(e.request.duration)) {
            const minDelay = 1.2 * e.request.duration;
            if (minDelay > liveDelay) {
                logger.warn('Browser does not support fetch API with StreamReader. Increasing live delay to be 20% higher than segment duration:', minDelay.toFixed(2));
                liveDelay = minDelay;
                originalLiveDelay = minDelay;
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
        if (!e || !activeStreamInfo || !e.currentRepresentation || !e.streamId || e.streamId !== activeStreamInfo.id || !e.mediaType || (e.mediaType !== Constants.VIDEO && e.mediaType !== Constants.AUDIO)) {
            return;
        }

        availabilityTimeComplete = e.currentRepresentation.availabilityTimeComplete;
        lowLatencyModeEnabled = !availabilityTimeComplete;

        // If we enable low latency mode for the first time we also enable the catchup mechanism. This can be deactivated again for instance if the user seeks within the DVR window. We leave deactivation up to the application but also do not activate automatically again.
        if (lowLatencyModeEnabled && !initialCatchupModeActivated) {
            initialCatchupModeActivated = true;
        }
    }

    function getInitialCatchupModeActivated() {
        return initialCatchupModeActivated;
    }

    /**
     * A new manifest has been loaded, updating is still in progress.
     * @private
     */
    function _onManifestUpdated() {
        manifestUpdateInProgress = true;
    }

    /**
     * Manifest update was completed
     * @private
     */
    function _onStreamsComposed() {
        manifestUpdateInProgress = false;
    }

    function _checkEnableLowLatency(mediaInfo) {
        if (mediaInfo && mediaInfo.supplementalProperties &&
            mediaInfo.supplementalProperties[Constants.SUPPLEMENTAL_PROPERTY_DVB_LL_SCHEME] === 'true') {
            logger.debug('Low Latency critical SupplementalProperty set: Enabling low Latency');
            lowLatencyModeEnabled = true;
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
        videoModel.addEventListener('volumechange', _onVolumeChanged);
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
        videoModel.removeEventListener('volumechange', _onVolumeChanged);
    }

    instance = {
        initialize,
        setConfig,
        getTimeToStreamEnd,
        getBufferLevel,
        getPlaybackStalled,
        getTime,
        getLowLatencyModeEnabled,
        getInitialCatchupModeActivated,
        getIsManifestUpdateInProgress,
        getPlaybackRate,
        getPlayedRanges,
        getEnded,
        getIsDynamic,
        getStreamController,
        computeAndSetLiveDelay,
        getLiveDelay,
        getOriginalLiveDelay,
        getCurrentLiveLatency,
        play,
        isPaused,
        isStalled,
        pause,
        isSeeking,
        getStreamEndTime,
        seek,
        seekToOriginalLive,
        seekToCurrentLive,
        reset,
        updateCurrentTime,
        getAvailabilityStartTime
    };

    setup();

    return instance;
}

PlaybackController.__dashjs_factory_name = 'PlaybackController';
export default FactoryMaker.getSingletonFactory(PlaybackController);
