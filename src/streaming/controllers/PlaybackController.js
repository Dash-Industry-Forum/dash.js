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
import BufferController from './BufferController';
import URIFragmentModel from '../models/URIFragmentModel';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import FactoryMaker from '../../core/FactoryMaker';
import Debug from '../../core/Debug';

const LIVE_UPDATE_PLAYBACK_TIME_INTERVAL_MS = 500;
const DEFAULT_CATCHUP_PLAYBACK_RATE = 0.05;

// Start catching up mechanism for low latency live streaming
// when latency goes beyong targetDelay * (1 + LIVE_CATCHUP_START_THRESHOLD)
const LIVE_CATCHUP_START_THRESHOLD = 0.35;

function PlaybackController() {

    const context = this.context;
    const eventBus = EventBus(context).getInstance();

    let instance,
        logger,
        streamController,
        metricsModel,
        dashMetrics,
        manifestModel,
        dashManifestModel,
        adapter,
        videoModel,
        currentTime,
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
        originalPlaybackRate,
        availabilityStartTime,
        compatibleWithPreviousStream;

    let catchUpPlaybackRate = DEFAULT_CATCHUP_PLAYBACK_RATE;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        reset();
    }

    function initialize(StreamInfo, compatible) {
        streamInfo = StreamInfo;
        addAllListeners();
        isDynamic = streamInfo.manifestInfo.isDynamic;
        liveStartTime = streamInfo.start;
        compatibleWithPreviousStream = compatible;
        eventBus.on(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
        eventBus.on(Events.BYTES_APPENDED_END_FRAGMENT, onBytesAppended, this);
        eventBus.on(Events.BUFFER_LEVEL_STATE_CHANGED, onBufferLevelStateChanged, this);
        eventBus.on(Events.PERIOD_SWITCH_STARTED, onPeriodSwitchStarted, this);
        eventBus.on(Events.PLAYBACK_PROGRESS, onPlaybackProgression, this);
        eventBus.on(Events.PLAYBACK_TIME_UPDATED, onPlaybackProgression, this);
        eventBus.on(Events.PLAYBACK_ENDED, onPlaybackEnded, this);

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
        return parseFloat(( getStreamEndTime() - getTime()).toFixed(5));
    }

    function getStreamEndTime() {
        const startTime = getStreamStartTime(true);
        const offset = isDynamic ? startTime - streamInfo.start : 0;
        return startTime + (streamInfo.duration - offset);
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
                logger.info('Requesting seek to time: ' + time);
                videoModel.setCurrentTime(time, stickToBuffered);
            }
        }
    }

    function getTime() {
        return streamInfo && videoModel ? videoModel.getTime() : null;
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

    function setCatchUpPlaybackRate(value) {
        catchUpPlaybackRate = value;

        // If value == 0.0, deactivate catchup mechanism
        if (value === 0.0 && getPlaybackRate() > 1.0) {
            stopPlaybackCatchUp();
        }
    }

    function getCatchUpPlaybackRate() {
        return catchUpPlaybackRate;
    }

    /**
     * Computes the desirable delay for the live edge to avoid a risk of getting 404 when playing at the bleeding edge
     * @param {number} fragmentDuration - seconds?
     * @param {number} dvrWindowSize - seconds?
     * @returns {number} object
     * @memberof PlaybackController#
     */
    function computeLiveDelay(fragmentDuration, dvrWindowSize) {
        const mpd = dashManifestModel.getMpd(manifestModel.getValue());

        let delay;
        let ret;
        const END_OF_PLAYLIST_PADDING = 10;

        if (mediaPlayerModel.getUseSuggestedPresentationDelay() && mpd.hasOwnProperty(Constants.SUGGESTED_PRESENTATION_DELAY)) {
            delay = mpd.suggestedPresentationDelay;
        } else if (mediaPlayerModel.getLowLatencyEnabled()) {
            delay = 0;
        } else if (mediaPlayerModel.getLiveDelay()) {
            delay = mediaPlayerModel.getLiveDelay(); // If set by user, this value takes precedence
        } else if (!isNaN(fragmentDuration)) {
            delay = fragmentDuration * mediaPlayerModel.getLiveDelayFragmentCount();
        } else {
            delay = streamInfo.manifestInfo.minBufferTime * 2;
        }

        if (mpd.availabilityStartTime) {
            availabilityStartTime = mpd.availabilityStartTime.getTime();
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
        const currentTime = getTime();
        if (isNaN(currentTime) || currentTime === 0) {
            return 0;
        }

        return ((Math.round(new Date().getTime() - (currentTime * 1000 + availabilityStartTime))) / 1000).toFixed(3);
    }

    function startPlaybackCatchUp() {
        if (videoModel) {
            const playbackRate = 1 + getCatchUpPlaybackRate();
            const currentRate = getPlaybackRate();
            if (playbackRate !== currentRate) {
                logger.info('Starting live catchup mechanism. Setting playback rate to', playbackRate);
                originalPlaybackRate = currentRate;
                videoModel.getElement().playbackRate = playbackRate;

                eventBus.trigger(Events.PLAYBACK_CATCHUP_START, { sender: instance });
            }
        }
    }

    function stopPlaybackCatchUp() {
        if (videoModel) {
            const playbackRate = originalPlaybackRate || 1;
            if (playbackRate !== getPlaybackRate()) {
                logger.info('Stopping live catchup mechanism. Setting playback rate to', playbackRate);
                videoModel.getElement().playbackRate = playbackRate;

                eventBus.trigger(Events.PLAYBACK_CATCHUP_END, { sender: instance });
            }
        }
    }

    function reset() {
        currentTime = 0;
        liveStartTime = NaN;
        playOnceInitialized = false;
        commonEarliestTime = {};
        liveDelay = 0;
        availabilityStartTime = 0;
        catchUpPlaybackRate = DEFAULT_CATCHUP_PLAYBACK_RATE;
        bufferedRange = {};
        if (videoModel) {
            eventBus.off(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
            eventBus.off(Events.BUFFER_LEVEL_STATE_CHANGED, onBufferLevelStateChanged, this);
            eventBus.off(Events.BYTES_APPENDED_END_FRAGMENT, onBytesAppended, this);
            eventBus.off(Events.PERIOD_SWITCH_STARTED, onPeriodSwitchStarted, this);
            eventBus.off(Events.PLAYBACK_PROGRESS, onPlaybackProgression, this);
            eventBus.off(Events.PLAYBACK_TIME_UPDATED, onPlaybackProgression, this);
            eventBus.off(Events.PLAYBACK_ENDED, onPlaybackEnded, this);
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
        if (config.metricsModel) {
            metricsModel = config.metricsModel;
        }
        if (config.dashMetrics) {
            dashMetrics = config.dashMetrics;
        }
        if (config.manifestModel) {
            manifestModel = config.manifestModel;
        }
        if (config.dashManifestModel) {
            dashManifestModel = config.dashManifestModel;
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
    }

    function getStartTimeFromUriParameters() {
        const fragData = URIFragmentModel(context).getInstance().getURIFragmentData();
        let uriParameters;
        if (fragData) {
            uriParameters = {};
            const r = parseInt(fragData.r, 10);
            if (r >= 0 && streamInfo && r < streamInfo.manifestInfo.DVRWindowSize && fragData.t === null) {
                fragData.t = Math.floor(Date.now() / 1000) - streamInfo.manifestInfo.DVRWindowSize + r;
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
        const uriParameters = getStartTimeFromUriParameters();

        if (uriParameters) {
            if (!ignoreStartOffset) {
                startTimeOffset = !isNaN(uriParameters.fragS) ? uriParameters.fragS : uriParameters.fragT;
            } else {
                startTimeOffset = streamInfo.start;
            }
        } else {
            // handle case where no media fragments are parsed from the manifest URL
            startTimeOffset = 0;
        }

        if (isDynamic) {
            if (!isNaN(startTimeOffset)) {
                presentationStartTime = startTimeOffset - (streamInfo.manifestInfo.availableFrom.getTime() / 1000);

                if (presentationStartTime > liveStartTime ||
                    presentationStartTime < (!isNaN(liveEdge) ? (liveEdge - streamInfo.manifestInfo.DVRWindowSize) : NaN)) {
                    presentationStartTime = null;
                }
            }
            presentationStartTime = presentationStartTime || liveStartTime;

        } else {
            if (!isNaN(startTimeOffset) && startTimeOffset < Math.max(streamInfo.manifestInfo.duration, streamInfo.duration) && startTimeOffset >= 0) {
                presentationStartTime = startTimeOffset;
            } else {
                let earliestTime = commonEarliestTime[streamInfo.id]; //set by ready bufferStart after first onBytesAppended
                presentationStartTime = earliestTime !== undefined ? Math.max(earliestTime.audio !== undefined ? earliestTime.audio : 0, earliestTime.video !== undefined ? earliestTime.video : 0, streamInfo.start) : streamInfo.start;
            }
        }

        return presentationStartTime;
    }

    function getActualPresentationTime(currentTime) {
        const metrics = metricsModel.getReadOnlyMetricsFor(Constants.VIDEO) || metricsModel.getReadOnlyMetricsFor(Constants.AUDIO);
        const DVRMetrics = dashMetrics.getCurrentDVRInfo(metrics);
        const DVRWindow = DVRMetrics ? DVRMetrics.range : null;
        let actualTime;

        if (!DVRWindow) return NaN;
        if (currentTime > DVRWindow.end) {
            actualTime = Math.max(DVRWindow.end - streamInfo.manifestInfo.minBufferTime * 2, DVRWindow.start);
        } else if (currentTime + 0.250 < DVRWindow.start) {
            // Checking currentTime plus 250ms as the 'timeupdate' is fired with a frequency between 4Hz and 66Hz
            // https://developer.mozilla.org/en-US/docs/Web/Events/timeupdate
            // http://w3c.github.io/html/single-page.html#offsets-into-the-media-resource
            actualTime = DVRWindow.start;
        } else {
            return currentTime;
        }

        return actualTime;
    }

    function startUpdatingWallclockTime() {
        if (wallclockTimeIntervalId !== null) return;

        const tick = function () {
            onWallclockTime();
        };

        wallclockTimeIntervalId = setInterval(tick, mediaPlayerModel.getWallclockTimeUpdateInterval());
    }

    function stopUpdatingWallclockTime() {
        clearInterval(wallclockTimeIntervalId);
        wallclockTimeIntervalId = null;
    }

    function updateCurrentTime() {
        if (isPaused() || !isDynamic || videoModel.getReadyState() === 0) return;
        const currentTime = getTime();
        const actualTime = getActualPresentationTime(currentTime);
        const timeChanged = (!isNaN(actualTime) && actualTime !== currentTime);
        if (timeChanged) {
            seek(actualTime);
        }
    }

    function onDataUpdateCompleted(e) {
        if (e.error) return;

        const representationInfo = adapter.convertDataToRepresentationInfo(e.currentRepresentation);
        const info = representationInfo.mediaInfo.streamInfo;

        if (streamInfo.id !== info.id) return;
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
        const time = getTime();
        currentTime = time;
        eventBus.trigger(Events.PLAYBACK_TIME_UPDATED, {
            timeToEnd: getTimeToStreamEnd(),
            time: time
        });
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
            logger.info('[PlaybackController] onPlaybackEnded -- PLAYBACK_ENDED but native video element didn\'t fire ended');
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
        if (isDynamic && mediaPlayerModel.getLowLatencyEnabled() && getCatchUpPlaybackRate() > 0.0) {
            if (!isCatchingUp() && needToCatchUp()) {
                startPlaybackCatchUp();
            } else if (stopCatchingUp()) {
                stopPlaybackCatchUp();
            }
        }
    }

    function needToCatchUp() {
        return getCurrentLiveLatency() > (mediaPlayerModel.getLiveDelay() * (1 + LIVE_CATCHUP_START_THRESHOLD));
    }

    function stopCatchingUp() {
        return getCurrentLiveLatency() <= (mediaPlayerModel.getLiveDelay() );
    }

    function isCatchingUp() {
        return getCatchUpPlaybackRate() + 1 === getPlaybackRate();
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

        const hasVideoTrack = streamController.isVideoTrackPresent();
        const hasAudioTrack = streamController.isAudioTrackPresent();

        initialStartTime = getStreamStartTime(false);
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
                    if (!isSeeking() && !compatibleWithPreviousStream) {
                        seek(earliestTime, true, true);
                    }
                    commonEarliestTime[streamInfo.id].started = true;
                }
            }
        } else {
            //current stream has only audio or only video content
            if (commonEarliestTime[streamInfo.id][type]) {
                earliestTime = commonEarliestTime[streamInfo.id][type] > initialStartTime ? commonEarliestTime[streamInfo.id][type] : initialStartTime;
                if (!isSeeking() && !compatibleWithPreviousStream) {
                    seek(earliestTime, false, true);
                }
                commonEarliestTime[streamInfo.id].started = true;
            }
        }
    }

    function onBufferLevelStateChanged(e) {
        // do not stall playback when get an event from Stream that is not active
        if (e.streamInfo.id !== streamInfo.id) return;
        videoModel.setStallState(e.mediaType, e.state === BufferController.BUFFER_EMPTY);
    }

    function onPlaybackStalled(e) {
        logger.info('Native video element event: stalled', e);
        eventBus.trigger(Events.PLAYBACK_STALLED, {
            e: e
        });
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
        getPlaybackRate: getPlaybackRate,
        getPlayedRanges: getPlayedRanges,
        getEnded: getEnded,
        getIsDynamic: getIsDynamic,
        getStreamController: getStreamController,
        setCatchUpPlaybackRate: setCatchUpPlaybackRate,
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
