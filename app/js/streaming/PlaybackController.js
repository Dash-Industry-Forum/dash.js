MediaPlayer.dependencies.PlaybackController = function () {
    "use strict";

    var WALLCLOCK_TIME_UPDATE_INTERVAL = 1000,
        currentTime = 0,
        liveStartTime = NaN,
        wallclockTimeIntervalId,
        streamInfo,
        videoModel,
        trackInfo,
        isDynamic,

        getStreamStartTime = function (streamInfo) {
            var presentationStartTime,
                startTimeOffset = parseInt(this.uriQueryFragModel.getURIFragmentData.s);

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

        getActualPresentationTime = function() {
            var self = this,
                currentTime = self.getTime(),
                metrics = self.metricsModel.getMetricsFor(trackInfo.mediaInfo.type),
                DVRWindow = self.metricsExt.getCurrentDVRInfo(metrics).range,
                actualTime;

            if ((currentTime >= DVRWindow.start) && (currentTime <= DVRWindow.end)) {
                return currentTime;
            }

            actualTime = Math.max(DVRWindow.end - streamInfo.manifestInfo.minBufferTime * 2, DVRWindow.start);

            return actualTime;
        },

        startUpdatingWallclockTime = function() {
            var self = this,
                tick = function() {
                    onWallclockTime.call(self);
                };

            if (wallclockTimeIntervalId !== null) {
                stopUpdatingWallclockTime.call(this);
            }

            wallclockTimeIntervalId = setInterval(tick, WALLCLOCK_TIME_UPDATE_INTERVAL);
        },

        stopUpdatingWallclockTime = function() {
            clearInterval(wallclockTimeIntervalId);
            wallclockTimeIntervalId = null;
        },

        initialStart = function() {
            var initialSeekTime = getStreamStartTime.call(this, streamInfo);
            this.debug.log("Starting playback at offset: " + initialSeekTime);
            this.seek(initialSeekTime);
        },

        updateCurrentTime = function() {
            if (this.isPaused()) return;

            var currentTime = this.getTime(),
                actualTime = getActualPresentationTime.call(this),
                timeChanged = (!isNaN(actualTime) && actualTime !== currentTime);

            if (timeChanged) {
                this.seek(actualTime);
            }
        },

        onDataUpdateCompleted = function(sender, mediaData, TrackData) {
            trackInfo = this.adapter.convertDataToTrack(TrackData);
            streamInfo = trackInfo.mediaInfo.streamInfo;
            isDynamic = sender.streamProcessor.isDynamic();
            updateCurrentTime.call(this);
        },

        onLiveEdgeFound = function(/*sender, liveEdgeTime*/) {
            if (videoModel.getElement().readyState !== 0) {
                initialStart.call(this);
            }
        },

        removeAllListeners = function() {
            if (!videoModel) return;

            videoModel.unlisten("play", onPlaybackStart);
            videoModel.unlisten("pause", onPlaybackPaused);
            videoModel.unlisten("error", onPlaybackError);
            videoModel.unlisten("seeking", onPlaybackSeeking);
            videoModel.unlisten("seeked", onPlaybackSeeked);
            videoModel.unlisten("timeupdate", onPlaybackTimeUpdated);
            videoModel.unlisten("progress", onPlaybackProgress);
            videoModel.unlisten("ratechange", onPlaybackRateChanged);
            videoModel.unlisten("loadedmetadata", onPlaybackMetaDataLoaded);
        },

        onPlaybackStart = function() {
            //this.debug.log("Got play event.");
            updateCurrentTime.call(this);
            this.notify(this.eventList.ENAME_PLAYBACK_STARTED, this.getTime());
        },

        onPlaybackPaused = function() {
            //this.debug.log("Got pause event.");
            this.notify(this.eventList.ENAME_PLAYBACK_PAUSED);
        },

        onPlaybackSeeking = function() {
            //this.debug.log("Got seeking event.");
            this.notify(this.eventList.ENAME_PLAYBACK_SEEKING, this.getTime(), false);
        },

        onPlaybackSeeked = function() {
            //this.debug.log("Seek complete.");
            this.notify(this.eventList.ENAME_PLAYBACK_SEEKED);
        },

        onPlaybackTimeUpdated = function() {
            var time = this.getTime();

            if (time === currentTime) return;

            currentTime = time;
            this.notify(this.eventList.ENAME_PLAYBACK_TIME_UPDATED, this.getTimeToStreamEnd());
        },

        onPlaybackProgress = function() {
            var ranges = videoModel.getElement().buffered,
                lastRange,
                bufferEndTime,
                remainingUnbufferedDuration;

            if (ranges.length) {
                lastRange = ranges.length -1;
                bufferEndTime = ranges.end(lastRange);
                remainingUnbufferedDuration = getStreamStartTime.call(this, streamInfo) + streamInfo.duration - bufferEndTime;
            }

            this.notify(this.eventList.ENAME_PLAYBACK_PROGRESS, videoModel.getElement().buffered, remainingUnbufferedDuration);
        },

        onPlaybackRateChanged = function() {
            this.notify(this.eventList.ENAME_PLAYBACK_RATE_CHANGED);
        },

        onPlaybackMetaDataLoaded = function() {
            this.debug.log("Got loadmetadata event.");

            if (!isDynamic || this.timelineConverter.isTimeSyncCompleted()) {
                initialStart.call(this);
            }

            this.notify(this.eventList.ENAME_PLAYBACK_METADATA_LOADED);
            startUpdatingWallclockTime.call(this);
        },

        onPlaybackError = function(event) {
            this.notify(this.eventList.ENAME_PLAYBACK_ERROR, event.srcElement.error);
        },

        onWallclockTime = function() {
            this.notify(this.eventList.ENAME_WALLCLOCK_TIME_UPDATED,isDynamic, new Date());
        },

        setupVideoModel = function(model) {
            videoModel = model;

            videoModel.listen("play", onPlaybackStart);
            videoModel.listen("pause", onPlaybackPaused);
            videoModel.listen("error", onPlaybackError);
            videoModel.listen("seeking", onPlaybackSeeking);
            videoModel.listen("seeked", onPlaybackSeeked);
            videoModel.listen("timeupdate", onPlaybackTimeUpdated);
            videoModel.listen("progress", onPlaybackProgress);
            videoModel.listen("ratechange", onPlaybackRateChanged);
            videoModel.listen("loadedmetadata", onPlaybackMetaDataLoaded);
        };

    return {
        debug: undefined,
        timelineConverter: undefined,
        uriQueryFragModel: undefined,
        metricsModel: undefined,
        metricsExt: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,
        adapter: undefined,

        eventList: {
            ENAME_PLAYBACK_STARTED: "playbackStarted",
            ENAME_PLAYBACK_STOPPED: "playbackStopped",
            ENAME_PLAYBACK_PAUSED: "playbackPaused",
            ENAME_PLAYBACK_SEEKING: "playbackSeeking",
            ENAME_PLAYBACK_SEEKED: "playbackSeeked",
            ENAME_PLAYBACK_TIME_UPDATED: "playbackTimeUpdated",
            ENAME_PLAYBACK_PROGRESS: "playbackProgress",
            ENAME_PLAYBACK_RATE_CHANGED: "playbackRateChanged",
            ENAME_PLAYBACK_METADATA_LOADED: "playbackMetaDataLoaded",
            ENAME_PLAYBACK_ERROR: "playbackError",
            ENAME_WALLCLOCK_TIME_UPDATED: "wallclockTimeUpdated"
        },

        setup: function() {
            this.dataUpdateCompleted = onDataUpdateCompleted;
            this.liveEdgeFound = onLiveEdgeFound;
            onPlaybackStart = onPlaybackStart.bind(this);
            onPlaybackPaused = onPlaybackPaused.bind(this);
            onPlaybackError = onPlaybackError.bind(this);
            onPlaybackSeeking = onPlaybackSeeking.bind(this);
            onPlaybackSeeked = onPlaybackSeeked.bind(this);
            onPlaybackTimeUpdated = onPlaybackTimeUpdated.bind(this);
            onPlaybackProgress = onPlaybackProgress.bind(this);
            onPlaybackRateChanged = onPlaybackRateChanged.bind(this);
            onPlaybackMetaDataLoaded = onPlaybackMetaDataLoaded.bind(this);
        },

        initialize: function(streamInfoValue, model) {
            streamInfo = streamInfoValue;

            if (videoModel === model) return;

            removeAllListeners.call(this);
            setupVideoModel.call(this, model);
        },

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

        setLiveStartTime: function(value) {
            liveStartTime = value;
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
            if (time === this.getTime()) return;
            videoModel.setCurrentTime(time);
            this.notify(this.eventList.ENAME_PLAYBACK_SEEKING, time, true);
        },

        reset: function() {
            stopUpdatingWallclockTime.call(this);
            removeAllListeners.call(this);
            videoModel = null;
            streamInfo = null;
            currentTime = 0;
            liveStartTime = NaN;
        }
    };
};

MediaPlayer.dependencies.PlaybackController.prototype = {
    constructor: MediaPlayer.dependencies.PlaybackController
};