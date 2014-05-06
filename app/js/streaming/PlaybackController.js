MediaPlayer.dependencies.PlaybackController = function () {
    "use strict";

    var period,
        videoModel,

        onDataUpdateCompleted = function(sender, data, representation) {
            period = representation.adaptation.period;
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
            this.notify(this.eventList.ENAME_PLAYBACK_STARTED);
        },

        onPlaybackPaused = function() {
            this.notify(this.eventList.ENAME_PLAYBACK_PAUSED);
        },

        onPlaybackSeeking = function() {
            this.notify(this.eventList.ENAME_PLAYBACK_SEEKING, this.getTime());
        },

        onPlaybackSeeked = function() {
            this.notify(this.eventList.ENAME_PLAYBACK_SEEKED);
        },

        onPlaybackTimeUpdated = function() {
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
                remainingUnbufferedDuration = period.start + period.duration - bufferEndTime;
            }

            this.notify(this.eventList.ENAME_PLAYBACK_PROGRESS, videoModel.getElement().buffered, remainingUnbufferedDuration);
        },

        onPlaybackRateChanged = function() {
            this.notify(this.eventList.ENAME_PLAYBACK_RATE_CHANGED);
        },

        onPlaybackMetaDataLoaded = function() {
            this.notify(this.eventList.ENAME_PLAYBACK_METADATA_LOADED);
        },

        onPlaybackError = function() {
            this.notify(this.eventList.ENAME_PLAYBACK_ERROR);
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
        eventList: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

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
        },

        initialize: function(periodInfo, model) {
            period = periodInfo;

            if (videoModel === model) return;

            removeAllListeners.call(this);
            setupVideoModel.call(this, model);
        },

        getTimeToPeriodEnd: function() {
            var currentTime = videoModel.getCurrentTime();

            return ((period.start + period.duration) - currentTime);
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
            videoModel.pause();
        },

        seek: function(time) {
            videoModel.setCurrentTime(time);
        },

        reset: function() {
            removeAllListeners.call(this);
            videoModel = null;
            period = null;
        }
    };
};

MediaPlayer.dependencies.PlaybackController.prototype = {
    constructor: MediaPlayer.dependencies.PlaybackController
};