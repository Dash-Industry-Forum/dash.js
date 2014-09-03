MediaPlayer.dependencies.ScheduleController = function () {
    "use strict";

    var fragmentsToLoad = 0,
        type,
        ready,
        fragmentModel,
        isDynamic,
        currentRepresentation,
        initialPlayback = true,
        lastValidationTime = null,

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

            var currentTime = new Date();
            clearPlayListTraceMetrics(currentTime, MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
            playListMetrics = this.metricsModel.addPlayList(type, currentTime, 0, MediaPlayer.vo.metrics.PlayList.INITIAL_PLAY_START_REASON);

            if (initialPlayback) {
                initialPlayback = false;
            }

            this.debug.log("ScheduleController " + type + " start.");

            //this.debug.log("ScheduleController begin " + type + " validation");
            validate.call(this);
        },

        startOnReady = function() {
            if (initialPlayback) {
                getInitRequest.call(this, currentRepresentation.index);
            }

            doStart.call(this);
        },

        doStop = function (cancelPending) {
            if (isStopped) return;

            isStopped = true;

            this.debug.log("ScheduleController " + type + " stop.");
            // cancel the requests that have already been created, but not loaded yet.
            if (cancelPending) {
                this.fragmentController.cancelPendingRequestsForModel(fragmentModel);
            }

            clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
        },

        getNextFragment = function (callback) {
            var self =this,
                rules = self.scheduleRulesCollection.getRules(MediaPlayer.rules.ScheduleRulesCollection.prototype.NEXT_SEGMENT_RULES);

            self.rulesController.applyRules(rules, type, self.streamProcessor.getPeriodInfo().id, callback, null, function(currentValue, newValue) {
                return newValue;
            });
        },

        getInitRequest = function(quality) {
            var self = this,
                request;

            request = self.indexHandler.getInitRequest(self.representationController.getRepresentationForQuality(quality));

            if (request !== null) {
                //self.debug.log("Loading initialization: " + request.streamType + ":" + request.startTime);
                //self.debug.log(request);
                self.fragmentController.prepareFragmentForLoading(self, request);
            }

            return request;
        },

        getRequiredFragmentCount = function(callback) {
            var self =this,
                rules = self.scheduleRulesCollection.getRules(MediaPlayer.rules.ScheduleRulesCollection.prototype.SEGMENTS_TO_SCHEDULE_RULES);

            self.rulesController.applyRules(rules, type, self.streamProcessor.getPeriodInfo().id, callback, fragmentsToLoad, function(currentValue, newValue) {
                return Math.min(currentValue, newValue);
            });
        },

        onGetRequiredFragmentCount = function(result) {
            var self = this;

            fragmentsToLoad = result.value;

            if (fragmentsToLoad <= 0) {
                self.fragmentController.executePendingRequests();
                return;
            }

            self.abrController.getPlaybackQuality(type, self.streamProcessor.getPeriodInfo().id, self.streamProcessor.getData());
            getNextFragment.call(self, onNextFragment.bind(self));
        },

        onNextFragment = function(result) {
            var request = result.value;

            if ((request !== null) && !(request instanceof MediaPlayer.vo.SegmentRequest)) {
                request = this.indexHandler.getSegmentRequestForTime(currentRepresentation, request.startTime);
            }

            if (request) {
                fragmentsToLoad--;
                //self.debug.log("Loading fragment: " + request.streamType + ":" + request.startTime);
                this.fragmentController.prepareFragmentForLoading(this, request);
            }
        },

        validate = function () {
            var now = new Date().getTime(),
                isEnoughTimeSinceLastValidation = lastValidationTime ? (now - lastValidationTime > this.fragmentController.getLoadingTime(this)) : true;

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

        onDataUpdateCompleted = function(sender, data, newRepresentation) {
            var self = this,
                time;

            time = self.indexHandler.getCurrentTime(currentRepresentation || newRepresentation);
            currentRepresentation = newRepresentation;
            addRepresentationSwitch.call(self);

            if (!isDynamic) {
                ready = true;
            }

            if (ready) {
                startOnReady.call(self, time);
            }
        },

        onStreamCompleted = function(sender, model /*, request*/) {
            if (model !== this.streamProcessor.getFragmentModel()) return;

            this.debug.log(type + " Stream is complete.");
            clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.END_OF_CONTENT_STOP_REASON);
        },

        onMediaSegmentLoadingStart = function(sender, model/*, request*/) {
            var self = this;

            if (model !== self.streamProcessor.getFragmentModel()) return;

            validate.call(self);
        },

        onBytesError = function (/*sender, request*/) {
            doStop.call(this);
        },

        onBytesAppended = function(/*sender, quality, index*/) {
            addPlaylistTraceMetrics.call(this);
        },

        onDataUpdateStarted = function(/*sender*/) {
            doStop.call(this, false);
        },

        onInitRequested = function(sender, quality) {
            getInitRequest.call(this, quality);
        },

        onBufferCleared = function(sender, startTime, endTime, hasEnoughSpace) {
            // after the data has been removed from the buffer we should remove the requests from the list of
            // the executed requests for which playback time is inside the time interval that has been removed from the buffer
            this.fragmentController.removeExecutedRequestsBeforeTime(fragmentModel, endTime);

            if (hasEnoughSpace) {
                doStart.call(this);
            }
        },

        onBufferLevelStateChanged = function(sender, hasSufficientBuffer) {
            var self = this;

            if (!hasSufficientBuffer && !self.playbackController.isSeeking()) {
                self.debug.log("Stalling " + type + " Buffer: " + type);
                clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.REBUFFERING_REASON);
            }
        },

        onBufferLevelUpdated = function(sender, newBufferLevel) {
            var self = this,
                range = self.timelineConverter.calcSegmentAvailabilityRange(currentRepresentation, isDynamic);

            self.metricsModel.addBufferLevel(type, new Date(), newBufferLevel);

            self.metricsModel.addDVRInfo(type, self.playbackController.getTime(), currentRepresentation.adaptation.period.mpd, range);

            validate.call(this);
        },

        onQuotaExceeded = function(/*sender, criticalBufferLevel*/) {
            doStop.call(this, false);
        },

        onQualityChanged = function(sender, typeValue, oldQuality, newQuality) {
            if (type !== typeValue) return;

            var self = this;

            currentRepresentation = self.representationController.getRepresentationForQuality(newQuality);

            if (currentRepresentation === null || currentRepresentation === undefined) {
                throw "Unexpected error!";
            }

            clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.REPRESENTATION_SWITCH_STOP_REASON);
            addRepresentationSwitch.call(self);
        },

        addRepresentationSwitch = function() {
            var now = new Date(),
                currentVideoTime = this.playbackController.getTime();

            this.metricsModel.addRepresentationSwitch(type, now, currentVideoTime, currentRepresentation.id);
        },

        addPlaylistTraceMetrics = function() {
            var self = this,
                currentVideoTime = self.playbackController.getTime(),
                rate = self.playbackController.getPlaybackRate(),
                currentTime = new Date();

            if (playListTraceMetricsClosed === true && currentRepresentation && playListMetrics) {
                playListTraceMetricsClosed = false;
                playListTraceMetrics = self.metricsModel.appendPlayListTrace(playListMetrics, currentRepresentation.id, null, currentTime, currentVideoTime, null, rate, null);
            }
        },

        onClosedCaptioningRequested = function(sender, quality) {
            var self = this,
                req = getInitRequest.call(self, quality);

            fragmentModel.executeRequest(req);
        },

        onPlaybackStarted = function(/*sender, startTime*/) {
            doStart.call(this);
        },

        onPlaybackSeeking = function(sender, time) {
            if (!initialPlayback) {
                this.fragmentController.cancelPendingRequestsForModel(fragmentModel);
            }

            var currentTime,
                metrics = this.metricsModel.getMetricsFor("stream"),
                manifestUpdateInfo = this.metricsExt.getCurrentManifestUpdate(metrics);

            this.debug.log("ScheduleController " + type + " seek: " + time);
            currentTime = new Date();
            clearPlayListTraceMetrics(currentTime, MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
            playListMetrics = this.metricsModel.addPlayList(type, currentTime, time, MediaPlayer.vo.metrics.PlayList.SEEK_START_REASON);
            doStart.call(this);

            this.metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {latency: currentRepresentation.segmentAvailabilityRange.end - this.playbackController.getTime()});
        },

        onPlaybackRateChanged = function() {
            addPlaylistTraceMetrics.call(this);
        },

        onWallclockTimeUpdated = function(/*sender*/) {
            validate.call(this);
        },

        onLiveEdgeFound = function(sender, liveEdgeTime) {
            // step back from a found live edge time to be able to buffer some data
            var self = this,
                startTime = Math.max((liveEdgeTime - self.bufferController.getMinBufferTime() * 2), currentRepresentation.segmentAvailabilityRange.start),
                request,
                metrics = self.metricsModel.getMetricsFor("stream"),
                manifestUpdateInfo = self.metricsExt.getCurrentManifestUpdate(metrics),
                actualStartTime,
                segmentStart;
            // get a request for a start time
            request = self.indexHandler.getSegmentRequestForTime(currentRepresentation, startTime);
            segmentStart = request.startTime;
            // set liveEdge to be in the middle of the segment time to avoid a possible gap between
            // currentTime and buffered.start(0)
            actualStartTime =segmentStart + (request.duration / 2);
            currentRepresentation.adaptation.period.liveEdge = actualStartTime;
            self.metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {currentTime: actualStartTime, presentationStartTime: liveEdgeTime, latency: liveEdgeTime - actualStartTime, clientTimeOffset: currentRepresentation.adaptation.period.mpd.clientServerTimeShift});
            ready = true;
            startOnReady.call(self);
        };

    return {
        debug: undefined,
        system: undefined,
        metricsModel: undefined,
        metricsExt: undefined,
        bufferExt: undefined,
        scheduleWhilePaused: undefined,
        timelineConverter: undefined,
        sourceBufferExt: undefined,
        abrController: undefined,
        scheduleRulesCollection: undefined,
        rulesController: undefined,
        eventList: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        setup: function() {
            this.liveEdgeFound = onLiveEdgeFound;

            this.qualityChanged = onQualityChanged;

            this.dataUpdateStarted = onDataUpdateStarted;
            this.dataUpdateCompleted = onDataUpdateCompleted;

            this.mediaSegmentLoadingStart = onMediaSegmentLoadingStart;
            this.segmentLoadingFailed = onBytesError;
            this.streamCompleted = onStreamCompleted;

            this.bufferCleared = onBufferCleared;
            this.bytesAppended = onBytesAppended;
            this.bufferLevelStateChanged = onBufferLevelStateChanged;
            this.bufferLevelUpdated = onBufferLevelUpdated;
            this.initRequested = onInitRequested;
            this.quotaExceeded = onQuotaExceeded;

            this.closedCaptioningRequested = onClosedCaptioningRequested;

            this.playbackStarted = onPlaybackStarted;
            this.playbackSeeking = onPlaybackSeeking;
            this.playbackRateChanged = onPlaybackRateChanged;
            this.wallclockTimeUpdated = onWallclockTimeUpdated;
        },

        initialize: function(typeValue, streamProcessor) {
            var self = this;

            type = typeValue;
            self.streamProcessor = streamProcessor;
            self.playbackController = streamProcessor.playbackController;
            self.fragmentController = streamProcessor.fragmentController;
            self.representationController = streamProcessor.representationController;
            self.liveEdgeFinder = streamProcessor.liveEdgeFinder;
            self.bufferController = streamProcessor.bufferController;
            self.indexHandler = streamProcessor.indexHandler;
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

        reset: function() {
            var self = this;

            doStop.call(self, true);
            self.bufferController.unsubscribe(self.bufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN, self.scheduleRulesCollection.bufferLevelRule);
            self.bufferController.unsubscribe(self.bufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED, self.scheduleRulesCollection.bufferLevelRule);
            self.fragmentController.abortRequestsForModel(fragmentModel);
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