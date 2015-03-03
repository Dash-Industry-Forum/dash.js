MediaPlayer.dependencies.ScheduleController = function () {
    "use strict";

    var fragmentsToLoad = 0,
        type,
        ready,
        fragmentModel,
        isDynamic,
        currentTrackInfo,
        initialPlayback = true,
        lastValidationTime = null,
        lastABRRuleApplyTime = 0,
        isStopped = false,
        playListMetrics = null,
        playListTraceMetrics = null,
        playListTraceMetricsClosed = true,

        clearPlayListTraceMetrics = function (endTime, stopreason) {
            var duration = 0,
                startTime = null;

            if (playListTraceMetricsClosed === false) {
                startTime = playListTraceMetrics.start;
                duration = endTime.getTime() - startTime.getTime();

                playListTraceMetrics.duration = duration;
                playListTraceMetrics.stopreason = stopreason;

                playListTraceMetricsClosed = true;
            }
        },

        doStart = function () {
            if (!ready) return;

            isStopped = false;

            if (initialPlayback) {
                initialPlayback = false;
            }

            this.log("start");

            //this.log("begin validation");
            validate.call(this);
        },

        startOnReady = function() {
            if (initialPlayback) {
                getInitRequest.call(this, currentTrackInfo.quality);
                addPlaylistMetrics.call(this, MediaPlayer.vo.metrics.PlayList.INITIAL_PLAY_START_REASON);
            }

            doStart.call(this);
        },

        doStop = function (cancelPending) {
            if (isStopped) return;

            isStopped = true;

            this.log("stop");
            // cancel the requests that have already been created, but not loaded yet.
            if (cancelPending) {
                fragmentModel.cancelPendingRequests();
            }

            clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
        },

        getNextFragment = function (callback) {
            var self =this,
                rules = self.scheduleRulesCollection.getRules(MediaPlayer.rules.ScheduleRulesCollection.prototype.NEXT_FRAGMENT_RULES);

            self.rulesController.applyRules(rules, self.streamProcessor, callback, null, function(currentValue, newValue) {
                return newValue;
            });
        },

        getInitRequest = function(quality) {
            var self = this,
                request;

            request = self.adapter.getInitRequest(self.streamProcessor, quality);

            if (request !== null) {
                //self.log("Loading initialization: " + request.mediaType + ":" + request.startTime);
                //self.log(request);
                self.fragmentController.prepareFragmentForLoading(fragmentModel, request);
            }

            return request;
        },

        getRequiredFragmentCount = function(callback) {
            var self =this,
                rules = self.scheduleRulesCollection.getRules(MediaPlayer.rules.ScheduleRulesCollection.prototype.FRAGMENTS_TO_SCHEDULE_RULES);

            self.rulesController.applyRules(rules, self.streamProcessor, callback, fragmentsToLoad, function(currentValue, newValue) {
                currentValue = currentValue === MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE ? 0 : currentValue;
                return Math.max(currentValue, newValue);
            });
        },

        replaceCanceledPendingRequests = function(canceledRequests) {
            var ln = canceledRequests.length,
            // EPSILON is used to avoid javascript floating point issue, e.g. if request.startTime = 19.2,
            // request.duration = 3.83, than request.startTime + request.startTime = 19.2 + 1.92 = 21.119999999999997
                EPSILON = 0.1,
                request,
                time,
                i;

            for (i = 0; i < ln; i += 1) {
                request = canceledRequests[i];
                time = request.startTime + (request.duration / 2) + EPSILON;
                request = this.adapter.getFragmentRequestForTime(this.streamProcessor, currentTrackInfo, time, {timeThreshold: 0});
                this.fragmentController.prepareFragmentForLoading(fragmentModel, request);
            }
        },

        onGetRequiredFragmentCount = function(result) {
            var self = this;

            fragmentsToLoad = result.value;
            if (fragmentsToLoad <= 0) {
                self.fragmentController.executePendingRequests();
                return;
            }

            getNextFragment.call(self, onNextFragment.bind(self));
        },

        onNextFragment = function(result) {
            var request = result.value;

            if ((request !== null) && !(request instanceof MediaPlayer.vo.FragmentRequest)) {
                request = this.adapter.getFragmentRequestForTime(this.streamProcessor, currentTrackInfo, request.startTime);
            }

            if (request) {
                fragmentsToLoad--;
                //self.log("Loading fragment: " + request.mediaType + ":" + request.startTime);
                this.fragmentController.prepareFragmentForLoading(fragmentModel, request);
            } else {
                this.fragmentController.executePendingRequests();
            }
        },

        validate = function () {
            var now = new Date().getTime(),
                isEnoughTimeSinceLastValidation = lastValidationTime ? (now - lastValidationTime > fragmentModel.getLoadingTime()) : true,
                //manifestInfo = currentTrackInfo.mediaInfo.streamInfo.manifestInfo,
                qualitySwitchThreshold = 1000; //TODO need to get average segment duration and cut that in half for interval to apply rule


            if (now - lastABRRuleApplyTime > qualitySwitchThreshold) {
                lastABRRuleApplyTime = now;
                this.abrController.getPlaybackQuality(this.streamProcessor);
            }


            if (!isEnoughTimeSinceLastValidation || isStopped || (this.playbackController.isPaused() && (!this.scheduleWhilePaused || isDynamic))) return;

            lastValidationTime = now;
            getRequiredFragmentCount.call(this, onGetRequiredFragmentCount.bind(this));

        },

        clearMetrics = function () {
            var self = this;

            if (type === null || type === "") {
                return;
            }

            self.metricsModel.clearCurrentMetricsForType(type);
        },

        onDataUpdateCompleted = function(e) {
            if (e.error) return;

            currentTrackInfo = this.adapter.convertDataToTrack(e.data.currentRepresentation);
        },

        onStreamUpdated = function(e) {
            if (e.error) return;

            currentTrackInfo = this.streamProcessor.getCurrentTrack();

            if (!isDynamic) {
                ready = true;
            }

            if (ready) {
                startOnReady.call(this);
            }
        },

        onStreamCompleted = function(e) {
            if (e.data.fragmentModel !== this.streamProcessor.getFragmentModel()) return;

            this.log("Stream is complete");
            clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.END_OF_CONTENT_STOP_REASON);
        },

        onMediaFragmentLoadingStart = function(e) {
            var self = this;

            if (e.data.fragmentModel !== self.streamProcessor.getFragmentModel()) return;

            validate.call(self);
        },

        onFragmentLoadingCompleted = function (e) {
            if (!e.error) return;

            doStop.call(this);
        },

        onBytesAppended = function(/*e*/) {
            addPlaylistTraceMetrics.call(this);
        },

        onDataUpdateStarted = function(/*e*/) {
            doStop.call(this, false);
        },

        onInitRequested = function(e) {
            getInitRequest.call(this, e.data.requiredQuality);
        },

        onBufferCleared = function(e) {
            // after the data has been removed from the buffer we should remove the requests from the list of
            // the executed requests for which playback time is inside the time interval that has been removed from the buffer
            fragmentModel.removeExecutedRequestsBeforeTime(e.data.to);

            if (e.data.hasEnoughSpaceToAppend) {
                doStart.call(this);
            }
        },

        onBufferLevelStateChanged = function(e) {
            var self = this;

            if (!e.data.hasSufficientBuffer && !self.playbackController.isSeeking()) {
                self.log("Stalling Buffer");
                clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.REBUFFERING_REASON);
            }
        },

        onBufferLevelUpdated = function(e) {
            var self = this;
            self.metricsModel.addBufferLevel(type, new Date(), e.data.bufferLevel);
            validate.call(this);
        },

        onQuotaExceeded = function(/*e*/) {
            doStop.call(this, false);
        },

        onQualityChanged = function(e) {
            if (type !== e.data.mediaType || this.streamProcessor.getStreamInfo().id !== e.data.streamInfo.id) return;

            var self = this,
                canceledReqs;

            canceledReqs = fragmentModel.cancelPendingRequests(e.data.oldQuality);
            currentTrackInfo = self.streamProcessor.getTrackForQuality(e.data.newQuality);

            if (currentTrackInfo === null || currentTrackInfo === undefined) {
                throw "Unexpected error!";
            }

            replaceCanceledPendingRequests.call(self, canceledReqs);
            clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.REPRESENTATION_SWITCH_STOP_REASON);
        },

        addPlaylistMetrics = function(stopReason) {
            var currentTime = new Date(),
                presentationTime = this.playbackController.getTime();
            clearPlayListTraceMetrics(currentTime, MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
            playListMetrics = this.metricsModel.addPlayList(type, currentTime, presentationTime, stopReason);
        },

        addPlaylistTraceMetrics = function() {
            var self = this,
                currentVideoTime = self.playbackController.getTime(),
                rate = self.playbackController.getPlaybackRate(),
                currentTime = new Date();

            if (playListTraceMetricsClosed === true && currentTrackInfo && playListMetrics) {
                playListTraceMetricsClosed = false;
                playListTraceMetrics = self.metricsModel.appendPlayListTrace(playListMetrics, currentTrackInfo.id, null, currentTime, currentVideoTime, null, rate, null);
            }
        },

        onClosedCaptioningRequested = function(e) {
            var self = this,
                req = getInitRequest.call(self, e.data.CCIndex);

            fragmentModel.executeRequest(req);
        },

        onPlaybackStarted = function(/*e*/) {
            doStart.call(this);
        },

        onPlaybackSeeking = function(e) {
            if (!initialPlayback) {
                fragmentModel.cancelPendingRequests();
            }

            var metrics = this.metricsModel.getMetricsFor("stream"),
                manifestUpdateInfo = this.metricsExt.getCurrentManifestUpdate(metrics);

            this.log("seek: " + e.data.seekTime);
            addPlaylistMetrics.call(this, MediaPlayer.vo.metrics.PlayList.SEEK_START_REASON);

            this.metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {latency: currentTrackInfo.DVRWindow.end - this.playbackController.getTime()});
        },

        onPlaybackRateChanged = function(/*e*/) {
            addPlaylistTraceMetrics.call(this);
        },

        onWallclockTimeUpdated = function(/*e*/) {
            validate.call(this);
        },

        onLiveEdgeSearchCompleted = function(e) {
            if (e.error) return;

            // step back from a found live edge time to be able to buffer some data
            var self = this,
                liveEdgeTime = e.data.liveEdge,
                manifestInfo = currentTrackInfo.mediaInfo.streamInfo.manifestInfo,
                startTime = liveEdgeTime - Math.min((manifestInfo.minBufferTime * 2), manifestInfo.DVRWindowSize / 2),
                request,
                metrics = self.metricsModel.getMetricsFor("stream"),
                manifestUpdateInfo = self.metricsExt.getCurrentManifestUpdate(metrics),
                currentLiveStart = self.playbackController.getLiveStartTime(),
                actualStartTime;
            // get a request for a start time
            request = self.adapter.getFragmentRequestForTime(self.streamProcessor, currentTrackInfo, startTime);
            actualStartTime = request.startTime;

            if (isNaN(currentLiveStart) || (actualStartTime > currentLiveStart)) {
                self.playbackController.setLiveStartTime(actualStartTime);
            }

            self.metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {currentTime: actualStartTime, presentationStartTime: liveEdgeTime, latency: liveEdgeTime - actualStartTime, clientTimeOffset: self.timelineConverter.getClientTimeOffset()});
            ready = true;

            if (currentTrackInfo) {
                startOnReady.call(self);
            }
        };

    return {
        log: undefined,
        system: undefined,
        metricsModel: undefined,
        metricsExt: undefined,
        scheduleWhilePaused: undefined,
        timelineConverter: undefined,
        abrController: undefined,
        adapter: undefined,
        scheduleRulesCollection: undefined,
        rulesController: undefined,

        setup: function() {
            this[MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED] = onLiveEdgeSearchCompleted;

            this[MediaPlayer.dependencies.AbrController.eventList.ENAME_QUALITY_CHANGED] = onQualityChanged;

            this[Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_STARTED] = onDataUpdateStarted;
            this[Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED] = onDataUpdateCompleted;
            this[MediaPlayer.dependencies.Stream.eventList.ENAME_STREAM_UPDATED] = onStreamUpdated;

            this[MediaPlayer.dependencies.FragmentController.eventList.ENAME_MEDIA_FRAGMENT_LOADING_START] = onMediaFragmentLoadingStart;
            this[MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_COMPLETED] = onFragmentLoadingCompleted;
            this[MediaPlayer.dependencies.FragmentController.eventList.ENAME_STREAM_COMPLETED] = onStreamCompleted;

            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_CLEARED] = onBufferCleared;
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_APPENDED] = onBytesAppended;
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED] = onBufferLevelStateChanged;
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_UPDATED] = onBufferLevelUpdated;
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_INIT_REQUESTED] = onInitRequested;
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_QUOTA_EXCEEDED] = onQuotaExceeded;

            this[MediaPlayer.dependencies.TextController.eventList.ENAME_CLOSED_CAPTIONING_REQUESTED] = onClosedCaptioningRequested;

            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_STARTED] = onPlaybackStarted;
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING] = onPlaybackSeeking;
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_RATE_CHANGED] = onPlaybackRateChanged;
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED] = onWallclockTimeUpdated;
        },

        initialize: function(typeValue, streamProcessor) {
            var self = this;

            type = typeValue;
            self.setMediaType(type);
            self.streamProcessor = streamProcessor;
            self.playbackController = streamProcessor.playbackController;
            self.fragmentController = streamProcessor.fragmentController;
            self.liveEdgeFinder = streamProcessor.liveEdgeFinder;
            self.bufferController = streamProcessor.bufferController;
            isDynamic = streamProcessor.isDynamic();
            fragmentModel = this.fragmentController.getModel(this);

            if (self.scheduleRulesCollection.bufferLevelRule) {
                self.scheduleRulesCollection.bufferLevelRule.setScheduleController(self);
            }

            if (self.scheduleRulesCollection.pendingRequestsRule) {
                self.scheduleRulesCollection.pendingRequestsRule.setScheduleController(self);
            }

            if (self.scheduleRulesCollection.playbackTimeRule) {
                self.scheduleRulesCollection.playbackTimeRule.setScheduleController(self);
            }
        },

        getFragmentModel: function() {
            return fragmentModel;
        },

        getFragmentToLoadCount:function () {
            return fragmentsToLoad;
        },

        reset: function() {
            var self = this;

            doStop.call(self, true);
            self.bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN, self.scheduleRulesCollection.bufferLevelRule);
            self.bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED, self.scheduleRulesCollection.bufferLevelRule);
            fragmentModel.abortRequests();
            self.fragmentController.detachModel(fragmentModel);
            clearMetrics.call(self);
            fragmentsToLoad = 0;
        },

        start: doStart,
        stop: doStop
    };
};

MediaPlayer.dependencies.ScheduleController.prototype = {
    constructor: MediaPlayer.dependencies.ScheduleController
};