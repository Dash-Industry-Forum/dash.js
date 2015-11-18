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
import BufferController from './BufferController.js';
import EventBus from '../utils/EventBus.js';
import Events from "../Events.js";
import URIQueryAndFragmentModel from '../models/URIQueryAndFragmentModel.js';
import FactoryMaker from '../../core/FactoryMaker.js';

const WALLCLOCK_TIME_UPDATE_INTERVAL = 50; //This value influences the startup time for live.

export default FactoryMaker.getSingletonFactory(PlaybackController);

function PlaybackController() {

    let instance = {
        initialize: initialize,
        setConfig: setConfig,
        getStreamStartTime: getStreamStartTime,
        getTimeToStreamEnd: getTimeToStreamEnd,
        isPlaybackStarted: isPlaybackStarted,
        getStreamId: getStreamId,
        getStreamDuration: getStreamDuration,
        getTime: getTime,
        getPlaybackRate: getPlaybackRate,
        getPlayedRanges: getPlayedRanges,
        getIsDynamic: getIsDynamic,
        setLiveStartTime: setLiveStartTime,
        getLiveStartTime: getLiveStartTime,
        setLiveDelayAttributes: setLiveDelayAttributes,
        getLiveDelay: getLiveDelay,
        start: start,
        isPaused: isPaused,
        pause: pause,
        isSeeking: isSeeking,
        seek: seek,
        reset: reset
    };

    setup();

    return instance;

    let streamController;
    let log;
    let timelineConverter;
    let metricsModel;
    let metricsExt;
    let manifestModel;
    let manifestExt;
    let adapter;
    let videoModel;
    let currentTime;
    let liveStartTime;
    let wallclockTimeIntervalId;
    let commonEarliestTime;
    let firstAppended;
    let streamInfo;
    let isDynamic;
    let liveDelayFragmentCount;
    let useSuggestedPresentationDelay;

    function setup() {
        currentTime = 0;
        liveStartTime = NaN;
        wallclockTimeIntervalId = null;
        commonEarliestTime = {};
        firstAppended = {};
        liveDelayFragmentCount = NaN;
    }

    function initialize(streamInfoValue) {
        streamInfo = streamInfoValue;
        removeAllListeners();
        setupVideoModel();
        isDynamic = streamInfo.manifestInfo.isDynamic;
        liveStartTime = streamInfoValue.start;
        EventBus.on(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
        EventBus.on(Events.LIVE_EDGE_SEARCH_COMPLETED, onLiveEdgeSearchCompleted, this);
        EventBus.on(Events.BYTES_APPENDED, onBytesAppended, this);
        EventBus.on(Events.BUFFER_LEVEL_STATE_CHANGED, onBufferLevelStateChanged, this);
    }

    function getTimeToStreamEnd() {
        var currentTime = videoModel.getCurrentTime();

        return ((getStreamStartTime(streamInfo) + streamInfo.duration) - currentTime);
    }

    function isPlaybackStarted() {
        return getTime() > 0;
    }

    function getStreamId() {
        return streamInfo.id;
    }

    function getStreamDuration() {
        return streamInfo.duration;
    }

    function getTime() {
        return videoModel.getCurrentTime();
    }

    function getPlaybackRate() {
        return videoModel.getPlaybackRate();
    }

    function getPlayedRanges() {
        return videoModel.getElement().played;
    }

    function getIsDynamic(){
        return isDynamic;
    }

    function setLiveStartTime(value) {
        liveStartTime = value;
    }

    function getLiveStartTime() {
        return liveStartTime;
    }

    function setLiveDelayAttributes(count, useSPD) {
        liveDelayFragmentCount = count;
        useSuggestedPresentationDelay = useSPD;
    }

    /**
     * Gets a desirable delay for the live edge to avoid a risk of getting 404 when playing at the bleeding edge
     * @returns {Number} object
     * @memberof PlaybackController#
     * */
    function getLiveDelay(fragmentDuration) {
        var delay;
        var mpd = manifestExt.getMpd(manifestModel.getValue());

        if (useSuggestedPresentationDelay && mpd.hasOwnProperty("suggestedPresentationDelay")) {
            delay = mpd.suggestedPresentationDelay;
        } else if (!isNaN(fragmentDuration)) {
            delay = fragmentDuration * liveDelayFragmentCount;
        } else {
            delay = streamInfo.manifestInfo.minBufferTime * 2;
        }

        return delay;
    }

    function start() {
        videoModel.play();
    }

    function isPaused() {
        return videoModel.isPaused();
    }

    function pause() {
        if (videoModel) {
            videoModel.pause();
        }
    }

    function isSeeking(){
        return videoModel.getElement().seeking;
    }

    function seek(time) {
        if (!videoModel || time === getTime()) return;
        log("Do seek: " + time);
        videoModel.setCurrentTime(time);
    }

    function reset() {
        EventBus.off(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
        EventBus.off(Events.BUFFER_LEVEL_STATE_CHANGED, onBufferLevelStateChanged, this);
        EventBus.off(Events.LIVE_EDGE_SEARCH_COMPLETED, onLiveEdgeSearchCompleted, this);
        EventBus.off(Events.BYTES_APPENDED, onBytesAppended, this);

        stopUpdatingWallclockTime();
        removeAllListeners();
        videoModel = null;
        streamInfo = null;
        isDynamic = undefined;
        useSuggestedPresentationDelay = undefined;
        setup();
    }


    function setConfig(config) {
        if (!config) return;

        if (config.streamController) {
            streamController = config.streamController;
        }

        if (config.log) {
            log = config.log;
        }

        if (config.timelineConverter) {
            timelineConverter = config.timelineConverter;
        }

        if (config.metricsModel) {
            metricsModel = config.metricsModel;
        }

        if (config.metricsExt) {
            metricsExt = config.metricsExt;
        }

        if (config.manifestModel) {
            manifestModel = config.manifestModel;
        }

        if (config.manifestExt) {
            manifestExt = config.manifestExt;
        }

        if (config.adapter) {
            adapter = config.adapter;
        }

        if (config.videoModel) {
            videoModel = config.videoModel;
        }
    }

    /**
     * @param streamInfo object
     * @returns {Number} object
     * @memberof PlaybackController#
     */
    function getStreamStartTime(streamInfo) {
        var presentationStartTime;
        var startTimeOffset = parseInt(URIQueryAndFragmentModel.getInstance().getURIFragmentData().s);

        if (isDynamic) {

            if (!isNaN(startTimeOffset) && startTimeOffset > 1262304000) {

                presentationStartTime = startTimeOffset - (streamInfo.manifestInfo.availableFrom.getTime()/1000);

                if (presentationStartTime > liveStartTime ||
                    presentationStartTime < (liveStartTime - streamInfo.manifestInfo.DVRWindowSize)) {

                    presentationStartTime = null;
                }
            }
            presentationStartTime = presentationStartTime || liveStartTime;

        } else {
            if (!isNaN(startTimeOffset) && startTimeOffset < streamInfo.duration && startTimeOffset >= 0) {
                presentationStartTime = startTimeOffset;
            }else{
                presentationStartTime = streamInfo.start;
            }
        }

        return presentationStartTime;
    }

    function getActualPresentationTime(currentTime) {
        var metrics = metricsModel.getReadOnlyMetricsFor("video") || metricsModel.getReadOnlyMetricsFor("audio");
        var DVRMetrics = metricsExt.getCurrentDVRInfo(metrics);
        var DVRWindow = DVRMetrics ? DVRMetrics.range : null;
        var actualTime;

        if (!DVRWindow) return NaN;

        if ((currentTime >= DVRWindow.start) && (currentTime <= DVRWindow.end)) {
            return currentTime;
        }

        actualTime = Math.max(DVRWindow.end - streamInfo.manifestInfo.minBufferTime * 2, DVRWindow.start);

        return actualTime;
    }

    function startUpdatingWallclockTime() {
        if (wallclockTimeIntervalId !== null) return;

        var tick = function() {
            onWallclockTime();
        };

        wallclockTimeIntervalId = setInterval(tick, WALLCLOCK_TIME_UPDATE_INTERVAL);
    }

    function stopUpdatingWallclockTime() {
        clearInterval(wallclockTimeIntervalId);
        wallclockTimeIntervalId = null;
    }

    function initialStart() {
        if (firstAppended[streamInfo.id] || isSeeking()) return;
        var initialSeekTime = getStreamStartTime(streamInfo);
        EventBus.trigger(Events.PLAYBACK_SEEKING, {seekTime: initialSeekTime});
        log("Starting playback at offset: " + initialSeekTime);
    }

    function updateCurrentTime() {
        if (isPaused() || !isDynamic || videoModel.getElement().readyState === 0) return;

        var currentTime = getTime(),
            actualTime = getActualPresentationTime(currentTime),
            timeChanged = (!isNaN(actualTime) && actualTime !== currentTime);

        if (timeChanged) {
            seek(actualTime);
        }
    }

    function onDataUpdateCompleted(e) {
        if (e.error) return;

        var representationInfo = adapter.convertDataToTrack(manifestModel.getValue(), e.currentRepresentation);
        var info = representationInfo.mediaInfo.streamInfo;

        if (streamInfo.id !== info.id) return;

        streamInfo = representationInfo.mediaInfo.streamInfo;
        updateCurrentTime();
    }

    function onLiveEdgeSearchCompleted(e) {
        if (e.error || videoModel.getElement().readyState === 0) return;

        initialStart();
    }

    function removeAllListeners() {
        if (!videoModel) return;

        videoModel.unlisten("canplay", onCanPlay);
        videoModel.unlisten("play", onPlaybackStart);
        videoModel.unlisten("playing", onPlaybackPlaying);
        videoModel.unlisten("pause", onPlaybackPaused);
        videoModel.unlisten("error", onPlaybackError);
        videoModel.unlisten("seeking", onPlaybackSeeking);
        videoModel.unlisten("seeked", onPlaybackSeeked);
        videoModel.unlisten("timeupdate", onPlaybackTimeUpdated);
        videoModel.unlisten("progress", onPlaybackProgress);
        videoModel.unlisten("ratechange", onPlaybackRateChanged);
        videoModel.unlisten("loadedmetadata", onPlaybackMetaDataLoaded);
        videoModel.unlisten("ended", onPlaybackEnded);
    }

    function onCanPlay(/*e*/) {
        EventBus.trigger(Events.CAN_PLAY);
    }

    function onPlaybackStart() {
        log("Native video element event: play");
        updateCurrentTime();
        startUpdatingWallclockTime();
        EventBus.trigger(Events.PLAYBACK_STARTED, {startTime: getTime()});
    }

    function onPlaybackPlaying() {
        log("Native video element event: playing");
        EventBus.trigger(Events.PLAYBACK_PLAYING, {playingTime: getTime()});
    }

    function onPlaybackPaused() {
        log("Native video element event: pause");
        EventBus.trigger(Events.PLAYBACK_PAUSED);
    }

    function onPlaybackSeeking() {
        startUpdatingWallclockTime();
        EventBus.trigger(Events.PLAYBACK_SEEKING, {seekTime: getTime()});
    }

    function onPlaybackSeeked() {
        log("Native video element event: seeked");
        EventBus.trigger(Events.PLAYBACK_SEEKED);
    }

    function onPlaybackTimeUpdated() {
        //log("Native video element event: timeupdate");
        var time = getTime();
        if (time === currentTime) return;
        currentTime = time;
        EventBus.trigger(Events.PLAYBACK_TIME_UPDATED, {timeToEnd: getTimeToStreamEnd()});
    }

    function onPlaybackProgress() {
        //log("Native video element event: progress");
        var ranges = videoModel.getElement().buffered;
        var lastRange;
        var bufferEndTime;
        var remainingUnbufferedDuration;

        if (ranges.length) {
            lastRange = ranges.length -1;
            bufferEndTime = ranges.end(lastRange);
            remainingUnbufferedDuration = getStreamStartTime(streamInfo) + streamInfo.duration - bufferEndTime;
        }
        EventBus.trigger(Events.PLAYBACK_PROGRESS, { bufferedRanges: videoModel.getElement().buffered, remainingUnbufferedDuration: remainingUnbufferedDuration });
    }

    function onPlaybackRateChanged() {
        log("Native video element event: ratechange: ", getPlaybackRate());
        EventBus.trigger(Events.PLAYBACK_RATE_CHANGED);
    }

    function onPlaybackMetaDataLoaded() {
        log("Native video element event: loadedmetadata");
        if (!isDynamic || timelineConverter.isTimeSyncCompleted()) {
            initialStart();
        }
        EventBus.trigger(Events.PLAYBACK_METADATA_LOADED);
        startUpdatingWallclockTime();
    }

    function onPlaybackEnded() {
        log("Native video element event: ended");
        stopUpdatingWallclockTime();
        EventBus.trigger(Events.PLAYBACK_ENDED);
    }

    function onPlaybackError(event) {
        var target = event.target || event.srcElement;

        EventBus.trigger(Events.PLAYBACK_ERROR, {error: target.error});
    }

    function onWallclockTime() {
        EventBus.trigger(Events.WALLCLOCK_TIME_UPDATED, {isDynamic: isDynamic, time: new Date()});
    }

    function onBytesAppended(e) {
        var bufferedStart;
        var ranges = e.bufferedRanges;
        var id = streamInfo.id;
        var time = getTime();
        var sp = e.sender.getStreamProcessor();
        var type = sp.getType();
        var stream = streamController.getStreamById(streamInfo.id);
        var streamStart = getStreamStartTime(streamInfo);
        var segStart = e.startTime;
        var currentEarliestTime = commonEarliestTime[id];

        // if index is zero it means that the first segment of the Period has been appended
        if (segStart === streamStart) {
            firstAppended[id] = firstAppended[id] || {};
            firstAppended[id][type] = true;
            firstAppended[id].ready = !((stream.hasMedia("audio") && !firstAppended[id].audio) || (stream.hasMedia("video") && !firstAppended[id].video));
        }

        if (!ranges || !ranges.length || (firstAppended[id] && firstAppended[id].seekCompleted)) return;

        bufferedStart = Math.max(ranges.start(0), streamInfo.start);
        commonEarliestTime[id] = (commonEarliestTime[id] === undefined) ? bufferedStart : Math.max(commonEarliestTime[id], bufferedStart);

        // do nothing if common earliest time has not changed or if the firts segment has not been appended or if current
        // time exceeds the common earliest time
        if ((currentEarliestTime === commonEarliestTime[id] && (time === currentEarliestTime)) || !firstAppended[id] || !firstAppended[id].ready || (time > commonEarliestTime[id])) return;

        //reset common earliest time every time user seeks
        //to avoid mismatches when buffers have been discarded/pruned
        if (isSeeking()) {
            commonEarliestTime = {};
        } else {
            // seek to the max of period start or start of buffered range to avoid stalling caused by a shift between audio and video media time
            seek(Math.max(commonEarliestTime[id], streamStart));
            // prevents seeking the second time for the same Period
            firstAppended[id].seekCompleted = true;
        }
    }

    function onBufferLevelStateChanged(e) {
        // do not stall playback when get an event from Stream that is not active
        if (e.streamInfo.id !== streamInfo.id) return;
        videoModel.setStallState(e.mediaType, e.state === BufferController.BUFFER_EMPTY);
    }

    function setupVideoModel() {
        videoModel.listen("canplay", onCanPlay);
        videoModel.listen("play", onPlaybackStart);
        videoModel.listen("playing", onPlaybackPlaying);
        videoModel.listen("pause", onPlaybackPaused);
        videoModel.listen("error", onPlaybackError);
        videoModel.listen("seeking", onPlaybackSeeking);
        videoModel.listen("seeked", onPlaybackSeeked);
        videoModel.listen("timeupdate", onPlaybackTimeUpdated);
        videoModel.listen("progress", onPlaybackProgress);
        videoModel.listen("ratechange", onPlaybackRateChanged);
        videoModel.listen("loadedmetadata", onPlaybackMetaDataLoaded);
        videoModel.listen("ended", onPlaybackEnded);
    }
}