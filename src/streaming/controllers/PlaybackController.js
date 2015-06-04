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
MediaPlayer.dependencies.PlaybackController = function () {
    "use strict";

    var WALLCLOCK_TIME_UPDATE_INTERVAL = 1000,
        currentTime = 0,
        liveStartTime = NaN,
        wallclockTimeIntervalId = null,
        commonEarliestTime = {},
        firstAppended = {},
        streamInfo,
        videoModel,
        isDynamic,
        liveDelayFragmentCount = NaN,
        useSuggestedPresentationDelay,

        getStreamStartTime = function (streamInfo) {
            var presentationStartTime,
                startTimeOffset = parseInt(this.uriQueryFragModel.getURIFragmentData().s);

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
        },

        getActualPresentationTime = function(currentTime) {
            var self = this,
                metrics = self.metricsModel.getReadOnlyMetricsFor("video") || self.metricsModel.getReadOnlyMetricsFor("audio"),
                DVRMetrics = self.metricsExt.getCurrentDVRInfo(metrics),
                DVRWindow = DVRMetrics ? DVRMetrics.range : null,
                actualTime;

            if (!DVRWindow) return NaN;

            if ((currentTime >= DVRWindow.start) && (currentTime <= DVRWindow.end)) {
                return currentTime;
            }

            actualTime = Math.max(DVRWindow.end - streamInfo.manifestInfo.minBufferTime * 2, DVRWindow.start);

            return actualTime;
        },

        startUpdatingWallclockTime = function() {
            if (wallclockTimeIntervalId !== null) return;

            var self = this,
                tick = function() {
                    onWallclockTime.call(self);
                };

            wallclockTimeIntervalId = setInterval(tick, WALLCLOCK_TIME_UPDATE_INTERVAL);
        },

        stopUpdatingWallclockTime = function() {
            clearInterval(wallclockTimeIntervalId);
            wallclockTimeIntervalId = null;
        },

        initialStart = function() {
            if (firstAppended[streamInfo.id] || this.isSeeking()) return;

            var initialSeekTime = getStreamStartTime.call(this, streamInfo);
            this.log("Starting playback at offset: " + initialSeekTime);
            this.seek(initialSeekTime);
        },

        updateCurrentTime = function() {
            if (this.isPaused() || !isDynamic || videoModel.getElement().readyState === 0) return;

            var currentTime = this.getTime(),
                actualTime = getActualPresentationTime.call(this, currentTime),
                timeChanged = (!isNaN(actualTime) && actualTime !== currentTime);

            if (timeChanged) {
                this.seek(actualTime);
            }
        },

        onDataUpdateCompleted = function(e) {
            if (e.error) return;

            var track = this.adapter.convertDataToTrack(this.manifestModel.getValue(), e.data.currentRepresentation),
                info = track.mediaInfo.streamInfo;

            if (streamInfo.id !== info.id) return;

            streamInfo = track.mediaInfo.streamInfo;
            updateCurrentTime.call(this);
        },

        onLiveEdgeSearchCompleted = function(e) {
            if (e.error || videoModel.getElement().readyState === 0) return;

            initialStart.call(this);
        },

        removeAllListeners = function() {
            if (!videoModel) return;

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
        },

        onCanPlay = function(/*e*/) {
            this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_CAN_PLAY);
        },

        onPlaybackStart = function() {
            this.log("<video> play");
            updateCurrentTime.call(this);
            startUpdatingWallclockTime.call(this);
            this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_STARTED, {startTime: this.getTime()});
        },

        onPlaybackPlaying = function() {
            this.log("<video> playing");
            this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_PLAYING, {playingTime: this.getTime()});
        },

        onPlaybackPaused = function() {
            this.log("<video> pause");
            this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_PAUSED);
        },

        onPlaybackSeeking = function() {
            this.log("<video> seek");
            startUpdatingWallclockTime.call(this);
            this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, {seekTime: this.getTime()});
        },

        onPlaybackSeeked = function() {
            this.log("<video> seeked");
            this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKED);
        },

        onPlaybackTimeUpdated = function() {
            //this.log("<video> timeupdate");
            var time = this.getTime();

            if (time === currentTime) return;

            currentTime = time;
            this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_TIME_UPDATED, {timeToEnd: this.getTimeToStreamEnd()});
        },

        onPlaybackProgress = function() {
            //this.log("<video> progress");
            var ranges = videoModel.getElement().buffered,
                lastRange,
                bufferEndTime,
                remainingUnbufferedDuration;

            if (ranges.length) {
                lastRange = ranges.length -1;
                bufferEndTime = ranges.end(lastRange);
                remainingUnbufferedDuration = getStreamStartTime.call(this, streamInfo) + streamInfo.duration - bufferEndTime;
            }

            this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_PROGRESS, {bufferedRanges: videoModel.getElement().buffered, remainingUnbufferedDuration: remainingUnbufferedDuration});
        },

        onPlaybackRateChanged = function() {
            this.log("<video> ratechange: ", this.getPlaybackRate());
            this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_RATE_CHANGED);
        },

        onPlaybackMetaDataLoaded = function() {
            this.log("<video> loadedmetadata");

            if (!isDynamic || this.timelineConverter.isTimeSyncCompleted()) {
                initialStart.call(this);
            }

            this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_METADATA_LOADED);
            startUpdatingWallclockTime.call(this);
        },

        onPlaybackEnded = function(/*e*/) {
            this.log("<video> ended");
            stopUpdatingWallclockTime.call(this);
            this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_ENDED);
        },

        onPlaybackError = function(event) {
            this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_ERROR, {error: event.srcElement.error});
        },

        onWallclockTime = function() {
            this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, {isDynamic: isDynamic, time: new Date()});
        },

        onBytesAppended = function(e) {
            var bufferedStart,
                ranges = e.data.bufferedRanges,
                id = streamInfo.id,
                time = this.getTime(),
                type = e.sender.streamProcessor.getType(),
                stream = this.system.getObject("streamController").getStreamById(streamInfo.id),
                currentEarliestTime = commonEarliestTime[id];

            // if index is zero it means that the first segment of the Period has been appended
            if (e.data.index === 0) {
                firstAppended[id] = firstAppended[id] || {};
                firstAppended[id][type] = true;
                firstAppended.ready = !((stream.hasMedia("audio") && !firstAppended[id].audio) || (stream.hasMedia("video") && !firstAppended[id].video));
            }

            if (!ranges || !ranges.length) return;

            bufferedStart = Math.max(ranges.start(0), streamInfo.start);
            commonEarliestTime[id] = (commonEarliestTime[id] === undefined) ? bufferedStart : Math.max(commonEarliestTime[id], bufferedStart);

            // do nothing if common earliest time has not changed or if the firts segment has not been appended or if current
            // time exceeds the common earliest time
            if ((currentEarliestTime === commonEarliestTime[id] && (time === currentEarliestTime)) || !firstAppended.ready || (time > commonEarliestTime[id])) return;

            // seek to the start of buffered range to avoid stalling caused by a shift between audio and video media time
            this.seek(commonEarliestTime[id]);
        },

        onBufferLevelStateChanged = function(e) {
            var type = e.sender.streamProcessor.getType(),
                senderStreamInfo = e.sender.streamProcessor.getStreamInfo();

            // do not stall playback when get an event from Stream that is not active
            if (senderStreamInfo.id !== streamInfo.id) return;

            videoModel.setStallState(type, !e.data.hasSufficientBuffer);
        },

        setupVideoModel = function() {
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
        };

    return {
        system: undefined,
        log: undefined,
        timelineConverter: undefined,
        uriQueryFragModel: undefined,
        metricsModel: undefined,
        metricsExt: undefined,
        manifestModel: undefined,
        manifestExt: undefined,
        videoModel: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,
        adapter: undefined,

        setup: function() {
            this[Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED] = onDataUpdateCompleted;
            this[MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED] = onLiveEdgeSearchCompleted;
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_APPENDED] = onBytesAppended;
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED] = onBufferLevelStateChanged;

            onCanPlay = onCanPlay.bind(this);
            onPlaybackStart = onPlaybackStart.bind(this);
            onPlaybackPlaying = onPlaybackPlaying.bind(this);
            onPlaybackPaused = onPlaybackPaused.bind(this);
            onPlaybackError = onPlaybackError.bind(this);
            onPlaybackSeeking = onPlaybackSeeking.bind(this);
            onPlaybackSeeked = onPlaybackSeeked.bind(this);
            onPlaybackTimeUpdated = onPlaybackTimeUpdated.bind(this);
            onPlaybackProgress = onPlaybackProgress.bind(this);
            onPlaybackRateChanged = onPlaybackRateChanged.bind(this);
            onPlaybackMetaDataLoaded = onPlaybackMetaDataLoaded.bind(this);
            onPlaybackEnded = onPlaybackEnded.bind(this);
        },

        initialize: function(streamInfoValue) {
            videoModel = this.videoModel;
            streamInfo = streamInfoValue;
            commonEarliestTime = {};
            removeAllListeners.call(this);
            setupVideoModel.call(this);
            isDynamic = streamInfo.manifestInfo.isDynamic;
            liveStartTime = streamInfoValue.start;
        },

        /**
         * @param streamInfo object
         * @returns {Number} object
         * @memberof PlaybackController#
         */
        getStreamStartTime: getStreamStartTime,

        getTimeToStreamEnd: function() {
            var currentTime = videoModel.getCurrentTime();

            return ((getStreamStartTime.call(this, streamInfo) + streamInfo.duration) - currentTime);
        },

        getStreamId: function() {
            return streamInfo.id;
        },

        getStreamDuration: function() {
            return streamInfo.duration;
        },

        getTime: function() {
            return videoModel.getCurrentTime();
        },

        getPlaybackRate: function() {
            return videoModel.getPlaybackRate();
        },

        getPlayedRanges: function() {
            return videoModel.getElement().played;
        },

        setLiveStartTime: function(value) {
            liveStartTime = value;
        },

        getLiveStartTime: function() {
            return liveStartTime;
        },

        setLiveDelayAttributes: function(count, useSPD) {
            liveDelayFragmentCount = count;
            useSuggestedPresentationDelay = useSPD;
        },

        /**
         * Gets a desirable delay for the live edge to avoid a risk of getting 404 when playing at the bleeding edge
         * @returns {Number} object
         * @memberof PlaybackController#
         * */
        getLiveDelay: function(fragmentDuration) {
            var delay,
                mpd = this.manifestExt.getMpd(this.manifestModel.getValue());

            if (useSuggestedPresentationDelay && mpd.hasOwnProperty("suggestedPresentationDelay")) {
                delay = mpd.suggestedPresentationDelay;
            } else if (!isNaN(fragmentDuration)) {
                delay = fragmentDuration * liveDelayFragmentCount;
            } else {
                delay = streamInfo.manifestInfo.minBufferTime * 2;
            }

            return delay;
        },

        start: function() {
            videoModel.play();
        },

        isPaused: function() {
            return videoModel.isPaused();
        },

        pause: function() {
            if (videoModel) {
                videoModel.pause();
            }
        },

        isSeeking: function(){
            return videoModel.getElement().seeking;
        },

        seek: function(time) {
            if (!videoModel || time === this.getTime()) return;
            this.log("Do seek: " + time);
            videoModel.setCurrentTime(time);
        },

        reset: function() {
            stopUpdatingWallclockTime.call(this);
            removeAllListeners.call(this);
            videoModel = null;
            streamInfo = null;
            currentTime = 0;
            liveStartTime = NaN;
            commonEarliestTime = {};
            firstAppended = {};
            isDynamic = undefined;
            useSuggestedPresentationDelay = undefined;
            liveDelayFragmentCount = NaN;
        }
    };
};

MediaPlayer.dependencies.PlaybackController.prototype = {
    constructor: MediaPlayer.dependencies.PlaybackController
};


MediaPlayer.dependencies.PlaybackController.eventList = {
    ENAME_CAN_PLAY: "canPlay",
    ENAME_PLAYBACK_STARTED: "playbackStarted",
    ENAME_PLAYBACK_PLAYING: "playbackPlaying",
    ENAME_PLAYBACK_STOPPED: "playbackStopped",
    ENAME_PLAYBACK_PAUSED: "playbackPaused",
    ENAME_PLAYBACK_ENDED: "playbackEnded",
    ENAME_PLAYBACK_SEEKING: "playbackSeeking",
    ENAME_PLAYBACK_SEEKED: "playbackSeeked",
    ENAME_PLAYBACK_TIME_UPDATED: "playbackTimeUpdated",
    ENAME_PLAYBACK_PROGRESS: "playbackProgress",
    ENAME_PLAYBACK_RATE_CHANGED: "playbackRateChanged",
    ENAME_PLAYBACK_METADATA_LOADED: "playbackMetaDataLoaded",
    ENAME_PLAYBACK_ERROR: "playbackError",
    ENAME_WALLCLOCK_TIME_UPDATED: "wallclockTimeUpdated"
};
