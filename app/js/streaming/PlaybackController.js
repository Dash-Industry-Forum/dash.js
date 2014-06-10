MediaPlayer.dependencies.PlaybackController = function () {
    "use strict";

    var WALLCLOCK_TIME_UPDATE_INTERVAL = 1000,
        currentTime = 0,
        wallclockTimeIntervalId,
        period,
        videoModel,
        representation,
        isDynamic,

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

        updateCurrentTime = function() {
            if (this.isPaused()) return;

            var currentTime = this.getTime(),
                actualTime = this.timelineConverter.calcActualPresentationTime(representation, currentTime, isDynamic),
                timeChanged = (!isNaN(actualTime) && actualTime !== currentTime);

            if (timeChanged) {
                this.seek(actualTime);
            }
        },

        onDataUpdateCompleted = function(sender, data, representationValue) {
            representation = representationValue;
            period = representation.adaptation.period;
            isDynamic = sender.streamProcessor.isDynamic();
            updateCurrentTime.call(this);
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
            this.notify(this.eventList.ENAME_PLAYBACK_TIME_UPDATED, this.getTimeToPeriodEnd());
        },

        onPlaybackProgress = function() {
            var ranges = videoModel.getElement().buffered,
                lastRange,
                bufferEndTime,
                remainingUnbufferedDuration;

            if (ranges.length) {
                lastRange = ranges.length -1;
                bufferEndTime = ranges.end(lastRange);
                remainingUnbufferedDuration = this.timelineConverter.calcPresentationStartTime(period) + period.duration - bufferEndTime;
            }

            this.notify(this.eventList.ENAME_PLAYBACK_PROGRESS, videoModel.getElement().buffered, remainingUnbufferedDuration);
        },

        onPlaybackRateChanged = function() {
            this.notify(this.eventList.ENAME_PLAYBACK_RATE_CHANGED);
        },

        onPlaybackMetaDataLoaded = function() {
            this.debug.log("Got loadmetadata event.");
            var initialSeekTime = this.timelineConverter.calcPresentationStartTime(period);
            this.debug.log("Starting playback at offset: " + initialSeekTime);
            this.seek(initialSeekTime);
            this.notify(this.eventList.ENAME_PLAYBACK_METADATA_LOADED);
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
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,
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
            onPlaybackStart = onPlaybackStart.bind(this);
            onPlaybackPaused = onPlaybackPaused.bind(this);
            onPlaybackError = onPlaybackError.bind(this);
            onPlaybackSeeking = onPlaybackSeeking.bind(this);
            onPlaybackSeeked = onPlaybackSeeked.bind(this);
            onPlaybackTimeUpdated = onPlaybackTimeUpdated.bind(this);
            onPlaybackProgress = onPlaybackProgress.bind(this);
            onPlaybackRateChanged = onPlaybackRateChanged.bind(this);
            onPlaybackMetaDataLoaded = onPlaybackMetaDataLoaded.bind(this);

            startUpdatingWallclockTime.call(this);
        },

        initialize: function(periodInfo, model) {
            period = periodInfo;

            if (videoModel === model) return;

            removeAllListeners.call(this);
            setupVideoModel.call(this, model);
        },

        getTimeToPeriodEnd: function() {
            var currentTime = videoModel.getCurrentTime();

            return ((this.timelineConverter.calcPresentationStartTime(period) + period.duration) - currentTime);
        },

        getPeriodDuration: function() {
            return period.duration;
        },

        getTime: function() {
            return videoModel.getCurrentTime();
        },

        getPlaybackRate: function() {
            return videoModel.getPlaybackRate();
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
            period = null;
            currentTime = 0;
        }
    };
};

MediaPlayer.dependencies.PlaybackController.prototype = {
    constructor: MediaPlayer.dependencies.PlaybackController
};