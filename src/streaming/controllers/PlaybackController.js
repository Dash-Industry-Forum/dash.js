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
        liveStartTime,
        wallclockTimeIntervalId,
        commonEarliestTime,
        liveDelay,
        bufferedRange,
        streamInfo,
        isDynamic,
        mediaPlayerModel,
        playOnceInitialized,
        lastLivePlaybackTime,
        availabilityStartTime,
        compatibleWithPreviousStream,
        isLowLatencySeekingInProgress,
        playbackStalled,
        minPlaybackRateChange,
        uriFragmentModel,
        settings;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);

        reset();
    }

    function initialize(StreamInfo, compatible) {
        streamInfo = StreamInfo;
        addAllListeners();
        isDynamic = streamInfo.manifestInfo.isDynamic;
        isLowLatencySeekingInProgress = false;
        playbackStalled = false;
        liveStartTime = streamInfo.start;
        compatibleWithPreviousStream = compatible;

        const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';

        // Detect safari browser (special behavior for low latency streams)
        const isSafari = /safari/.test(ua) && !/chrome/.test(ua);
        minPlaybackRateChange = isSafari ? 0.25 : 0.02;

        eventBus.on(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
        eventBus.on(Events.BYTES_APPENDED_END_FRAGMENT, onBytesAppended, this);
        eventBus.on(Events.LOADING_PROGRESS, onFragmentLoadProgress, this);
        eventBus.on(Events.BUFFER_LEVEL_STATE_CHANGED, onBufferLevelStateChanged, this);
        eventBus.on(Events.PERIOD_SWITCH_STARTED, onPeriodSwitchStarted, this);
        eventBus.on(Events.PLAYBACK_PROGRESS, onPlaybackProgression, this);
        eventBus.on(Events.PLAYBACK_TIME_UPDATED, onPlaybackProgression, this);
        eventBus.on(Events.PLAYBACK_ENDED, onPlaybackEnded, this);
        eventBus.on(Events.STREAM_INITIALIZING, onStreamInitializing, this);

        if (playOnceInitialized) {
            playOnceInitialized = false;
            play();
        }
    }

    function onPeriodSwitchStarted(e) {
        if (!isDynamic && e.fromStreamInfo && commonEarliestTime[e.fromStreamInfo.id] !== undefined) {
            delete bufferedRange[e.fromStreamInfo.id];
            delete commonEarliestTime[e.fromStreamInfo.id];
        }
    }

    function getTimeToStreamEnd() {
        return parseFloat((getStreamEndTime() - getTime()).toFixed(5));
    }

    function getStreamEndTime() {
        const startTime = getStreamStartTime(true);
        const offset = isDynamic && streamInfo ? startTime - streamInfo.start : 0;
        return startTime + (streamInfo ? streamInfo.duration - offset : offset);
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

    function seek(time, stickToBuffered, internalSeek) {
        if (streamInfo && videoModel) {
            if (internalSeek === true) {
                if (time !== videoModel.getTime()) {
                    // Internal seek = seek video model only (disable 'seeking' listener),
                    // buffer(s) are already appended at given time (see onBytesAppended())
                    videoModel.removeEventListener('seeking', onPlaybackSeeking);
                    logger.info('Requesting seek to time: ' + time);
                    videoModel.setCurrentTime(time, stickToBuffered);
                }
            } else {
                eventBus.trigger(Events.PLAYBACK_SEEK_ASKED);
                if (streamInfo) {
                    delete bufferedRange[streamInfo.id];
                    delete commonEarliestTime[streamInfo.id];
                }
                logger.info('Requesting seek to time: ' + time);
                videoModel.setCurrentTime(time, stickToBuffered);
            }
        }
    }

    function seekToLive() {
        const DVRMetrics = dashMetrics.getCurrentDVRInfo();
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

    function setLiveStartTime(value) {
        liveStartTime = value;
    }

    function getLiveStartTime() {
        return liveStartTime;
    }

    /**
     * Computes the desirable delay for the live edge to avoid a risk of getting 404 when playing at the bleeding edge
     * @param {number} fragmentDuration - seconds?
     * @param {number} dvrWindowSize - seconds?
     * @returns {number} object
     * @memberof PlaybackController#
     */
    function computeLiveDelay(fragmentDuration, dvrWindowSize) {
        let delay,
            ret,
            startTime;
        const END_OF_PLAYLIST_PADDING = 10;

        let suggestedPresentationDelay = adapter.getSuggestedPresentationDelay();

        if (settings.get().streaming.useSuggestedPresentationDelay && suggestedPresentationDelay !== null) {
            delay = suggestedPresentationDelay;
        } else if (settings.get().streaming.lowLatencyEnabled) {
            delay = 0;
        } else if (mediaPlayerModel.getLiveDelay()) {
            delay = mediaPlayerModel.getLiveDelay(); // If set by user, this value takes precedence
        } else if (!isNaN(fragmentDuration)) {
            delay = fragmentDuration * settings.get().streaming.liveDelayFragmentCount;
        } else {
            delay = streamInfo.manifestInfo.minBufferTime * 2;
        }

        startTime = adapter.getAvailabilityStartTime();

        if (startTime !== null) {
            availabilityStartTime = startTime;
        }

        if (dvrWindowSize > 0) {
            // cap target latency to:
            // - dvrWindowSize / 2 for short playlists
            // - dvrWindowSize - END_OF_PLAYLIST_PADDING for longer playlists
            const targetDelayCapping = Math.max(dvrWindowSize - END_OF_PLAYLIST_PADDING, dvrWindowSize / 2);
            ret = Math.min(delay, targetDelayCapping);
        } else {
            ret = delay;
        }
        liveDelay = ret;
        return ret;
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
        liveStartTime = NaN;
        playOnceInitialized = false;
        commonEarliestTime = {};
        liveDelay = 0;
        availabilityStartTime = 0;
        bufferedRange = {};
        if (videoModel) {
            eventBus.off(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
            eventBus.off(Events.BUFFER_LEVEL_STATE_CHANGED, onBufferLevelStateChanged, this);
            eventBus.off(Events.BYTES_APPENDED_END_FRAGMENT, onBytesAppended, this);
            eventBus.off(Events.LOADING_PROGRESS, onFragmentLoadProgress, this);
            eventBus.off(Events.PERIOD_SWITCH_STARTED, onPeriodSwitchStarted, this);
            eventBus.off(Events.PLAYBACK_PROGRESS, onPlaybackProgression, this);
            eventBus.off(Events.PLAYBACK_TIME_UPDATED, onPlaybackProgression, this);
            eventBus.off(Events.PLAYBACK_ENDED, onPlaybackEnded, this);
            eventBus.off(Events.STREAM_INITIALIZING, onStreamInitializing, this);
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
        if (config.uriFragmentModel) {
            uriFragmentModel = config.uriFragmentModel;
        }
        if (config.settings) {
            settings = config.settings;
        }
    }

    function getStartTimeFromUriParameters() {
        const fragData = uriFragmentModel.getURIFragmentData();
        let uriParameters;
        if (fragData) {
            uriParameters = {};
            const r = parseInt(fragData.r, 10);
            if (r >= 0 && streamInfo && r < streamInfo.manifestInfo.DVRWindowSize && fragData.t === null) {
                fragData.t = Math.max(Math.floor(Date.now() / 1000) - streamInfo.manifestInfo.DVRWindowSize, (streamInfo.manifestInfo.availableFrom.getTime() / 1000) + streamInfo.start) + r;
            }
            uriParameters.fragS = parseFloat(fragData.s);
            uriParameters.fragT = parseFloat(fragData.t);
        }
        return uriParameters;
    }

    /**
     * @param {boolean} ignoreStartOffset - ignore URL fragment start offset if true
     * @param {number} liveEdge - liveEdge value
     * @returns {number} object
     * @memberof PlaybackController#
     */
    function getStreamStartTime(ignoreStartOffset, liveEdge) {
        let presentationStartTime;
        let startTimeOffset = NaN;

        if (!ignoreStartOffset) {
            const uriParameters = getStartTimeFromUriParameters();
            if (uriParameters) {
                startTimeOffset = !isNaN(uriParameters.fragS) ? uriParameters.fragS : uriParameters.fragT;
            } else {
                startTimeOffset = 0;
            }
        } else {
            startTimeOffset = streamInfo ? streamInfo.start : startTimeOffset;
        }

        if (isDynamic) {
            if (!isNaN(startTimeOffset) && streamInfo) {
                presentationStartTime = startTimeOffset - (streamInfo.manifestInfo.availableFrom.getTime() / 1000);

                if (presentationStartTime > liveStartTime ||
                    presentationStartTime < (!isNaN(liveEdge) ? (liveEdge - streamInfo.manifestInfo.DVRWindowSize) : NaN)) {
                    presentationStartTime = null;
                }
            }
            presentationStartTime = presentationStartTime || liveStartTime;

        } else {
            if (streamInfo) {
                if (!isNaN(startTimeOffset) && startTimeOffset < Math.max(streamInfo.manifestInfo.duration, streamInfo.duration) && startTimeOffset >= 0) {
                    presentationStartTime = startTimeOffset;
                } else {
                    let earliestTime = commonEarliestTime[streamInfo.id]; //set by ready bufferStart after first onBytesAppended
                    presentationStartTime = earliestTime !== undefined ? Math.max(earliestTime.audio !== undefined ? earliestTime.audio : 0, earliestTime.video !== undefined ? earliestTime.video : 0, streamInfo.start) : streamInfo.start;
                }
            }
        }

        return presentationStartTime;
    }

    function getActualPresentationTime(currentTime) {
        const DVRMetrics = dashMetrics.getCurrentDVRInfo();
        const DVRWindow = DVRMetrics ? DVRMetrics.range : null;
        let actualTime;

        if (!DVRWindow) return NaN;
        if (currentTime > DVRWindow.end) {
            actualTime = Math.max(DVRWindow.end - streamInfo.manifestInfo.minBufferTime * 2, DVRWindow.start);
        } else if (currentTime + 0.250 < DVRWindow.start && DVRWindow.start - currentTime > DVRWindow.start - 315360000) {
            // Checking currentTime plus 250ms as the 'timeupdate' is fired with a frequency between 4Hz and 66Hz
            // https://developer.mozilla.org/en-US/docs/Web/Events/timeupdate
            // http://w3c.github.io/html/single-page.html#offsets-into-the-media-resource
            // Checking also duration of the DVR makes sense. We detected temporary situations in which currentTime
            // is bad reported by the browser which causes playback to jump to start (315360000 = 1 year)
            actualTime = DVRWindow.start;
        } else {
            actualTime = currentTime;
        }

        return actualTime;
    }

    function startUpdatingWallclockTime() {
        if (wallclockTimeIntervalId !== null) return;

        const tick = function () {
            onWallclockTime();
        };

        wallclockTimeIntervalId = setInterval(tick, settings.get().streaming.wallclockTimeUpdateInterval);
    }

    function stopUpdatingWallclockTime() {
        clearInterval(wallclockTimeIntervalId);
        wallclockTimeIntervalId = null;
    }

    function updateCurrentTime() {
        if (isPaused() || !isDynamic || videoModel.getReadyState() === 0) return;
        const currentTime = getNormalizedTime();
        const actualTime = getActualPresentationTime(currentTime);

        const timeChanged = (!isNaN(actualTime) && actualTime !== currentTime);
        if (timeChanged) {
            seek(actualTime);
        }
    }

    function onDataUpdateCompleted(e) {
        if (e.error) return;

        const representationInfo = adapter.convertDataToRepresentationInfo(e.currentRepresentation);
        const info = representationInfo ? representationInfo.mediaInfo.streamInfo : null;

        if (info === null || streamInfo.id !== info.id) return;
        streamInfo = info;

        updateCurrentTime();
    }

    function onCanPlay() {
        eventBus.trigger(Events.CAN_PLAY);
    }

    function onPlaybackStart() {
        logger.info('Native video element event: play');
        updateCurrentTime();
        startUpdatingWallclockTime();
        eventBus.trigger(Events.PLAYBACK_STARTED, {
            startTime: getTime()
        });
    }

    function onPlaybackWaiting() {
        logger.info('Native video element event: waiting');
        eventBus.trigger(Events.PLAYBACK_WAITING, {
            playingTime: getTime()
        });
    }

    function onPlaybackPlaying() {
        logger.info('Native video element event: playing');
        eventBus.trigger(Events.PLAYBACK_PLAYING, {
            playingTime: getTime()
        });
    }

    function onPlaybackPaused() {
        logger.info('Native video element event: pause');
        eventBus.trigger(Events.PLAYBACK_PAUSED, {
            ended: getEnded()
        });
    }

    function onPlaybackSeeking() {
        const seekTime = getTime();
        logger.info('Seeking to: ' + seekTime);
        startUpdatingWallclockTime();
        eventBus.trigger(Events.PLAYBACK_SEEKING, {
            seekTime: seekTime
        });
    }

    function onPlaybackSeeked() {
        logger.info('Native video element event: seeked');
        eventBus.trigger(Events.PLAYBACK_SEEKED);
        // Reactivate 'seeking' event listener (see seek())
        videoModel.addEventListener('seeking', onPlaybackSeeking);
    }

    function onPlaybackTimeUpdated() {
        if (streamInfo) {
            eventBus.trigger(Events.PLAYBACK_TIME_UPDATED, {
                timeToEnd: getTimeToStreamEnd(),
                time: getTime()
            });
        }
    }

    function updateLivePlaybackTime() {
        const now = Date.now();
        if (!lastLivePlaybackTime || now > lastLivePlaybackTime + LIVE_UPDATE_PLAYBACK_TIME_INTERVAL_MS) {
            lastLivePlaybackTime = now;
            onPlaybackTimeUpdated();
        }
    }

    function onPlaybackProgress() {
        eventBus.trigger(Events.PLAYBACK_PROGRESS);
    }

    function onPlaybackRateChanged() {
        const rate = getPlaybackRate();
        logger.info('Native video element event: ratechange: ', rate);
        eventBus.trigger(Events.PLAYBACK_RATE_CHANGED, {
            playbackRate: rate
        });
    }

    function onPlaybackMetaDataLoaded() {
        logger.info('Native video element event: loadedmetadata');
        eventBus.trigger(Events.PLAYBACK_METADATA_LOADED);
        startUpdatingWallclockTime();
    }

    // Event to handle the native video element ended event
    function onNativePlaybackEnded() {
        logger.info('Native video element event: ended');
        pause();
        stopUpdatingWallclockTime();
        eventBus.trigger(Events.PLAYBACK_ENDED, {'isLast': streamController.getActiveStreamInfo().isLast});
    }

    // Handle DASH PLAYBACK_ENDED event
    function onPlaybackEnded(e) {
        if (wallclockTimeIntervalId && e.isLast) {
            // PLAYBACK_ENDED was triggered elsewhere, react.
            logger.info('onPlaybackEnded -- PLAYBACK_ENDED but native video element didn\'t fire ended');
            videoModel.setCurrentTime(getStreamEndTime());
            pause();
            stopUpdatingWallclockTime();
        }
    }

    function onPlaybackError(event) {
        const target = event.target || event.srcElement;
        eventBus.trigger(Events.PLAYBACK_ERROR, {
            error: target.error
        });
    }

    function onWallclockTime() {
        eventBus.trigger(Events.WALLCLOCK_TIME_UPDATED, {
            isDynamic: isDynamic,
            time: new Date()
        });

        // Updates playback time for paused dynamic streams
        // (video element doesn't call timeupdate when the playback is paused)
        if (getIsDynamic() && isPaused()) {
            updateLivePlaybackTime();
        }
    }

    function checkTimeInRanges(time, ranges) {
        if (ranges && ranges.length > 0) {
            for (let i = 0, len = ranges.length; i < len; i++) {
                if (time >= ranges.start(i) && time < ranges.end(i)) {
                    return true;
                }
            }
        }
        return false;
    }

    function onPlaybackProgression() {
        if (
            isDynamic &&
            settings.get().streaming.lowLatencyEnabled &&
            settings.get().streaming.liveCatchUpPlaybackRate > 0 &&
            !isPaused() &&
            !isSeeking()
        ) {
            if (needToCatchUp()) {
                startPlaybackCatchUp();
            } else {
                stopPlaybackCatchUp();
            }
        }
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

    function needToCatchUp() {
        return settings.get().streaming.liveCatchUpPlaybackRate > 0 && getTime() > 0 &&
            Math.abs(getCurrentLiveLatency() - mediaPlayerModel.getLiveDelay()) > settings.get().streaming.liveCatchUpMinDrift;
    }

    function startPlaybackCatchUp() {
        if (videoModel) {
            const cpr = settings.get().streaming.liveCatchUpPlaybackRate;
            const liveDelay = mediaPlayerModel.getLiveDelay();
            const deltaLatency = getCurrentLiveLatency() - liveDelay;
            const d = deltaLatency * 5;
            // Playback rate must be between (1 - cpr) - (1 + cpr)
            // ex: if cpr is 0.5, it can have values between 0.5 - 1.5
            const s = (cpr * 2) / (1 + Math.pow(Math.E, -d));
            let newRate = (1 - cpr) + s;
            // take into account situations in which there are buffer stalls,
            // in which increasing playbackRate to reach target latency will
            // just cause more and more stall situations
            if (playbackStalled) {
                const bufferLevel = getBufferLevel();
                if (bufferLevel > liveDelay / 2) {
                    playbackStalled = false;
                } else if (deltaLatency > 0) {
                    newRate = 1.0;
                }
            }

            // don't change playbackrate for small variations (don't overload element with playbackrate changes)
            if (Math.abs(videoModel.getPlaybackRate() - newRate) > minPlaybackRateChange) {
                videoModel.setPlaybackRate(newRate);
            }

            if (settings.get().streaming.liveCatchUpMaxDrift > 0 && !isLowLatencySeekingInProgress &&
                deltaLatency > settings.get().streaming.liveCatchUpMaxDrift) {
                logger.info('Low Latency catchup mechanism. Latency too high, doing a seek to live point');
                isLowLatencySeekingInProgress = true;
                seekToLive();
            } else {
                isLowLatencySeekingInProgress = false;
            }
        }
    }

    function stopPlaybackCatchUp() {
        if (videoModel) {
            videoModel.setPlaybackRate(1.0);
        }
    }

    function onBytesAppended(e) {
        let earliestTime,
            initialStartTime;
        let ranges = e.bufferedRanges;
        if (!ranges || !ranges.length) return;
        if (commonEarliestTime[streamInfo.id] && commonEarliestTime[streamInfo.id].started === true) {
            //stream has already been started.
            return;
        }

        const type = e.sender.getType();

        if (bufferedRange[streamInfo.id] === undefined) {
            bufferedRange[streamInfo.id] = [];
        }

        bufferedRange[streamInfo.id][type] = ranges;

        if (commonEarliestTime[streamInfo.id] === undefined) {
            commonEarliestTime[streamInfo.id] = [];
            commonEarliestTime[streamInfo.id].started = false;
        }

        if (commonEarliestTime[streamInfo.id][type] === undefined) {
            commonEarliestTime[streamInfo.id][type] = Math.max(ranges.start(0), streamInfo.start);
        }

        const hasVideoTrack = streamController.isTrackTypePresent(Constants.VIDEO);
        const hasAudioTrack = streamController.isTrackTypePresent(Constants.AUDIO);

        initialStartTime = getStreamStartTime(true);
        if (hasAudioTrack && hasVideoTrack) {
            //current stream has audio and video contents
            if (!isNaN(commonEarliestTime[streamInfo.id].audio) && !isNaN(commonEarliestTime[streamInfo.id].video)) {

                if (commonEarliestTime[streamInfo.id].audio < commonEarliestTime[streamInfo.id].video) {
                    // common earliest is video time
                    // check buffered audio range has video time, if ok, we seek, otherwise, we wait some other data
                    earliestTime = commonEarliestTime[streamInfo.id].video > initialStartTime ? commonEarliestTime[streamInfo.id].video : initialStartTime;
                    ranges = bufferedRange[streamInfo.id].audio;
                } else {
                    // common earliest is audio time
                    // check buffered video range has audio time, if ok, we seek, otherwise, we wait some other data
                    earliestTime = commonEarliestTime[streamInfo.id].audio > initialStartTime ? commonEarliestTime[streamInfo.id].audio : initialStartTime;
                    ranges = bufferedRange[streamInfo.id].video;
                }
                if (checkTimeInRanges(earliestTime, ranges)) {
                    if (!(checkTimeInRanges(getNormalizedTime(), bufferedRange[streamInfo.id].audio) && checkTimeInRanges(getNormalizedTime(), bufferedRange[streamInfo.id].video))) {
                        if (!compatibleWithPreviousStream && earliestTime !== 0) {
                            seek(earliestTime, true, true);
                        }
                    }
                    commonEarliestTime[streamInfo.id].started = true;
                }
            }
        } else {
            //current stream has only audio or only video content
            if (commonEarliestTime[streamInfo.id][type]) {
                earliestTime = commonEarliestTime[streamInfo.id][type] > initialStartTime ? commonEarliestTime[streamInfo.id][type] : initialStartTime;
                if (!compatibleWithPreviousStream) {
                    seek(earliestTime, false, true);
                }
                commonEarliestTime[streamInfo.id].started = true;
            }
        }
    }

    function onFragmentLoadProgress(e) {
        // If using fetch and stream mode is not available, readjust live latency so it is 20% higher than segment duration
        if (e.stream === false && settings.get().streaming.lowLatencyEnabled && !isNaN(e.request.duration)) {
            const minDelay = 1.2 * e.request.duration;
            if (minDelay > mediaPlayerModel.getLiveDelay()) {
                logger.warn('Browser does not support fetch API with StreamReader. Increasing live delay to be 20% higher than segment duration:', minDelay.toFixed(2));
                const s = { streaming: { liveDelay: minDelay } };
                settings.update(s);
            }
        }
    }

    function onBufferLevelStateChanged(e) {
        // do not stall playback when get an event from Stream that is not active
        if (e.streamInfo.id !== streamInfo.id) return;

        if (settings.get().streaming.lowLatencyEnabled) {
            if (e.state === MetricsConstants.BUFFER_EMPTY && !isSeeking()) {
                if (!playbackStalled) {
                    playbackStalled = true;
                    stopPlaybackCatchUp();
                }
            }
        } else {
            videoModel.setStallState(e.mediaType, e.state === MetricsConstants.BUFFER_EMPTY);
        }
    }

    function onPlaybackStalled(e) {
        eventBus.trigger(Events.PLAYBACK_STALLED, {
            e: e
        });
    }

    function onStreamInitializing(e) {
        applyServiceDescription(e.streamInfo, e.mediaInfo);
    }

    function applyServiceDescription(streamInfo, mediaInfo) {
        if (streamInfo && streamInfo.manifestInfo && streamInfo.manifestInfo.serviceDescriptions) {
            // is there a service description for low latency defined?
            let llsd;

            for (let i = 0; i < streamInfo.manifestInfo.serviceDescriptions.length; i++) {
                const sd = streamInfo.manifestInfo.serviceDescriptions[i];
                if (sd.schemeIdUri === Constants.SERVICE_DESCRIPTION_LL_SCHEME) {
                    llsd = sd;
                    break;
                }
            }

            if (llsd) {
                if (mediaInfo && mediaInfo.supplementalProperties &&
                    mediaInfo.supplementalProperties[Constants.SUPPLEMENTAL_PROPERTY_LL_SCHEME] === 'true') {
                    if (llsd.latency && llsd.latency.target > 0) {
                        logger.debug('Apply LL properties coming from service description. Target Latency (ms):', llsd.latency.target);
                        settings.update({
                            streaming: {
                                lowLatencyEnabled: true,
                                liveDelay: llsd.latency.target / 1000,
                                liveCatchUpMinDrift: llsd.latency.max > llsd.latency.target ? (llsd.latency.max - llsd.latency.target) / 1000 : undefined
                            }
                        });
                    }
                    if (llsd.playbackRate && llsd.playbackRate.max > 1.0) {
                        logger.debug('Apply LL properties coming from service description. Max PlaybackRate:', llsd.playbackRate.max);
                        settings.update({
                            streaming: {
                                lowLatencyEnabled: true,
                                liveCatchUpPlaybackRate: llsd.playbackRate.max - 1.0
                            }
                        });
                    }
                }
            }
        }
    }

    function addAllListeners() {
        videoModel.addEventListener('canplay', onCanPlay);
        videoModel.addEventListener('play', onPlaybackStart);
        videoModel.addEventListener('waiting', onPlaybackWaiting);
        videoModel.addEventListener('playing', onPlaybackPlaying);
        videoModel.addEventListener('pause', onPlaybackPaused);
        videoModel.addEventListener('error', onPlaybackError);
        videoModel.addEventListener('seeking', onPlaybackSeeking);
        videoModel.addEventListener('seeked', onPlaybackSeeked);
        videoModel.addEventListener('timeupdate', onPlaybackTimeUpdated);
        videoModel.addEventListener('progress', onPlaybackProgress);
        videoModel.addEventListener('ratechange', onPlaybackRateChanged);
        videoModel.addEventListener('loadedmetadata', onPlaybackMetaDataLoaded);
        videoModel.addEventListener('stalled', onPlaybackStalled);
        videoModel.addEventListener('ended', onNativePlaybackEnded);
    }

    function removeAllListeners() {
        videoModel.removeEventListener('canplay', onCanPlay);
        videoModel.removeEventListener('play', onPlaybackStart);
        videoModel.removeEventListener('waiting', onPlaybackWaiting);
        videoModel.removeEventListener('playing', onPlaybackPlaying);
        videoModel.removeEventListener('pause', onPlaybackPaused);
        videoModel.removeEventListener('error', onPlaybackError);
        videoModel.removeEventListener('seeking', onPlaybackSeeking);
        videoModel.removeEventListener('seeked', onPlaybackSeeked);
        videoModel.removeEventListener('timeupdate', onPlaybackTimeUpdated);
        videoModel.removeEventListener('progress', onPlaybackProgress);
        videoModel.removeEventListener('ratechange', onPlaybackRateChanged);
        videoModel.removeEventListener('loadedmetadata', onPlaybackMetaDataLoaded);
        videoModel.removeEventListener('stalled', onPlaybackStalled);
        videoModel.removeEventListener('ended', onNativePlaybackEnded);
    }

    instance = {
        initialize: initialize,
        setConfig: setConfig,
        getStartTimeFromUriParameters: getStartTimeFromUriParameters,
        getStreamStartTime: getStreamStartTime,
        getTimeToStreamEnd: getTimeToStreamEnd,
        getTime: getTime,
        getNormalizedTime: getNormalizedTime,
        getPlaybackRate: getPlaybackRate,
        getPlayedRanges: getPlayedRanges,
        getEnded: getEnded,
        getIsDynamic: getIsDynamic,
        getStreamController: getStreamController,
        setLiveStartTime: setLiveStartTime,
        getLiveStartTime: getLiveStartTime,
        computeLiveDelay: computeLiveDelay,
        getLiveDelay: getLiveDelay,
        getCurrentLiveLatency: getCurrentLiveLatency,
        play: play,
        isPaused: isPaused,
        pause: pause,
        isSeeking: isSeeking,
        seek: seek,
        reset: reset
    };

    setup();

    return instance;
}

PlaybackController.__dashjs_factory_name = 'PlaybackController';
export default FactoryMaker.getSingletonFactory(PlaybackController);
