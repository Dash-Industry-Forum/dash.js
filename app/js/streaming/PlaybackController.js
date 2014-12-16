MediaPlayer.dependencies.PlaybackController = function () {
    "use strict";

    var WALLCLOCK_TIME_UPDATE_INTERVAL = 1000,
        currentTime = 0,
        liveStartTime = NaN,
        wallclockTimeIntervalId,
        commonEarliestTime = null,
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

        getActualPresentationTime = function(currentTime) {
            var self = this,
                metrics = self.metricsModel.getMetricsFor(trackInfo.mediaInfo.type),
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
            if (this.isPaused() || !isDynamic) return;

            var currentTime = this.getTime(),
                actualTime = getActualPresentationTime.call(this, currentTime),
                timeChanged = (!isNaN(actualTime) && actualTime !== currentTime);

            if (timeChanged) {
                this.seek(actualTime);
            }
        },

        onDataUpdateCompleted = function(e) {
            if (e.error) return;

            trackInfo = this.adapter.convertDataToTrack(e.data.currentRepresentation);
            streamInfo = trackInfo.mediaInfo.streamInfo;
            isDynamic = e.sender.streamProcessor.isDynamic();
            updateCurrentTime.call(this);
        },

        onLiveEdgeSearchCompleted = function(e) {
            if (e.error || videoModel.getElement().readyState === 0) return;

            initialStart.call(this);
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
            this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_STARTED, {startTime: this.getTime()});
        },

        onPlaybackPaused = function() {
            //this.debug.log("Got pause event.");
            this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_PAUSED);
        },

        onPlaybackSeeking = function() {
            //this.debug.log("Got seeking event.");
            this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, {seekTime: this.getTime()});
        },

        onPlaybackSeeked = function() {
            //this.debug.log("Seek complete.");
            this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKED);
        },

        onPlaybackTimeUpdated = function() {
            var time = this.getTime();

            if (time === currentTime) return;

            currentTime = time;
            this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_TIME_UPDATED, {timeToEnd: this.getTimeToStreamEnd()});
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

            this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_PROGRESS, {bufferedRanges: videoModel.getElement().buffered, remainingUnbufferedDuration: remainingUnbufferedDuration});
        },

        onPlaybackRateChanged = function() {
            this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_RATE_CHANGED);
        },

        onPlaybackMetaDataLoaded = function() {
            this.debug.log("Got loadmetadata event.");

            if (!isDynamic || this.timelineConverter.isTimeSyncCompleted()) {
                initialStart.call(this);
            }

            this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_METADATA_LOADED);
            startUpdatingWallclockTime.call(this);
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
                currentEarliestTime = commonEarliestTime,
                playbackStart = getStreamStartTime.call(this, streamInfo),
                req;

            if (!ranges || !ranges.length) return;

            // since segments are appended out of order, we cannot blindly seek after the first appended segment.
            // Do nothing till we make sure that the segment for initial time has been appended.
            req = this.adapter.getFragmentRequestForTime(e.sender.streamProcessor, trackInfo, playbackStart, false);

            if (!req || req.index !== e.data.index) return;

            bufferedStart = ranges.start(0);
            commonEarliestTime = (commonEarliestTime === null) ? bufferedStart : Math.max(commonEarliestTime, bufferedStart);

            if (currentEarliestTime === commonEarliestTime) return;

            // seek to the start of buffered range to avoid stalling caused by a shift between audio and video media time
            this.seek(commonEarliestTime);
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

        setup: function() {
            this[Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED] = onDataUpdateCompleted;
            this[MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED] = onLiveEdgeSearchCompleted;
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_APPENDED] = onBytesAppended;

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

        getLiveStartTime: function() {
            return liveStartTime;
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
        },

        reset: function() {
            stopUpdatingWallclockTime.call(this);
            removeAllListeners.call(this);
            videoModel = null;
            streamInfo = null;
            currentTime = 0;
            liveStartTime = NaN;
            commonEarliestTime = null;
        }
    };
};

MediaPlayer.dependencies.PlaybackController.prototype = {
    constructor: MediaPlayer.dependencies.PlaybackController
};


MediaPlayer.dependencies.PlaybackController.eventList = {
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
};
