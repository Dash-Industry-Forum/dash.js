MediaPlayer.dependencies.PlaybackController = function () {
    "use strict";

    var period,
        videoModel,
        representation,
        isDynamic,

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
            this.notify(this.eventList.ENAME_PLAYBACK_SEEKING, this.getTime());
        },

        onPlaybackSeeked = function() {
            //this.debug.log("Seek complete.");
            videoModel.listen("seeking", onPlaybackSeeking);
            videoModel.unlisten("seeked", onPlaybackSeeked);
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
            this.debug.log("Got loadmetadata event.");
            var initialSeekTime = this.timelineConverter.calcPresentationStartTime(period);
            this.debug.log("Starting playback at offset: " + initialSeekTime);
            this.seek(initialSeekTime);
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
        debug: undefined,
        timelineConverter: undefined,
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
            this.debug.log("Current time has changed, block programmatic seek.");

            if (time === this.getTime()) return;

            videoModel.unlisten("seeking", onPlaybackSeeking);
            videoModel.listen("seeked", onPlaybackSeeked);
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