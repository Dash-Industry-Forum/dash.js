MediaPlayer.dependencies.ScheduleController = function () {
    "use strict";

    var fragmentsToLoad = 0,
        type,
        ready,
        fragmentModel,
        seekTarget,
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

        startOnReady = function(time) {
            getInitRequest.call(this, currentRepresentation.index);
            this.seek(time);
        },

        doSeek = function (time) {
            var currentTime,
                range = this.sourceBufferExt.getBufferRange(this.bufferController.getBuffer(), time);

            this.debug.log("ScheduleController " + type + " seek: " + time);
            seekTarget = time;
            currentTime = new Date();
            clearPlayListTraceMetrics(currentTime, MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
            playListMetrics = this.metricsModel.addPlayList(type, currentTime, time, MediaPlayer.vo.metrics.PlayList.SEEK_START_REASON);

            if (!range && !initialPlayback) {
                this.fragmentController.cancelPendingRequestsForModel(fragmentModel);
            }

            doStart.call(this);
        },

        doStop = function () {
            if (isStopped) return;

            isStopped = true;

            this.debug.log("ScheduleController " + type + " stop.");
            // cancel the requests that have already been created, but not loaded yet.
            this.fragmentController.cancelPendingRequestsForModel(fragmentModel);

            clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
        },

        loadNextFragment = function () {
            var self =this,
                metrics = this.metricsModel.getReadOnlyMetricsFor(type),
                rules = self.scheduleRulesCollection.getRules(MediaPlayer.rules.ScheduleRulesCollection.prototype.NEXT_SEGMENT_RULES),
                request,
                req,
                i,len,
                confidence,
                values;

            values = {};
            values[MediaPlayer.rules.SwitchRequest.prototype.STRONG] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE;
            values[MediaPlayer.rules.SwitchRequest.prototype.WEAK] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE;
            values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE;

            for (i = 0, len = rules.length; i < len; i += 1) {
                req = rules[i].getNextRequest(seekTarget, metrics, self);

                if (req.value !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                    values[req.priority] = req.value;
                }
            }

            if (values[MediaPlayer.rules.SwitchRequest.prototype.WEAK] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                confidence = MediaPlayer.rules.SwitchRequest.prototype.WEAK;
                request = values[MediaPlayer.rules.SwitchRequest.prototype.WEAK];
            }

            if (values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                confidence = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;
                request = values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT];
            }

            if (values[MediaPlayer.rules.SwitchRequest.prototype.STRONG] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                confidence = MediaPlayer.rules.SwitchRequest.prototype.STRONG;
                request = values[MediaPlayer.rules.SwitchRequest.prototype.STRONG];
            }

            if (confidence != MediaPlayer.rules.SwitchRequest.prototype.STRONG &&
                confidence != MediaPlayer.rules.SwitchRequest.prototype.WEAK) {
                confidence = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;
            }

            return {request: request, confidence: confidence};
        },

        requestNewFragment = function() {
            var self = this,
                request;

            fragmentsToLoad = getRequiredFragmentCount.call(self).count;

            if (fragmentsToLoad > 0) {
                request = loadNextFragment.call(self).request;
                seekTarget = null;

                if (request) {
                    fragmentsToLoad--;
                    //self.debug.log("Loading fragment: " + request.streamType + ":" + request.startTime);
                    self.fragmentController.prepareFragmentForLoading(self, request);
                } else {
                    doStop.call(self);
                }
            }
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
        },

        getRequiredFragmentCount = function() {
            var self =this,
                metrics = this.metricsModel.getReadOnlyMetricsFor(type),
                rules = self.scheduleRulesCollection.getRules(MediaPlayer.rules.ScheduleRulesCollection.prototype.SEGMENTS_TO_SCHEDULE_RULES),
                count,
                req,
                i,len,
                confidence,
                values;

            values = {};
            values[MediaPlayer.rules.SwitchRequest.prototype.STRONG] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE;
            values[MediaPlayer.rules.SwitchRequest.prototype.WEAK] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE;
            values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE;

            for (i = 0, len = rules.length; i < len; i += 1) {
                req = rules[i].getSegmentNumberToSchedule(fragmentsToLoad, metrics, self);

                if (req.value !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                    values[req.priority] = Math.min(values[req.priority], req.value);
                }
            }

            if (values[MediaPlayer.rules.SwitchRequest.prototype.WEAK] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                confidence = MediaPlayer.rules.SwitchRequest.prototype.WEAK;
                count = values[MediaPlayer.rules.SwitchRequest.prototype.WEAK];
            }

            if (values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                confidence = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;
                count = values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT];
            }

            if (values[MediaPlayer.rules.SwitchRequest.prototype.STRONG] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                confidence = MediaPlayer.rules.SwitchRequest.prototype.STRONG;
                count = values[MediaPlayer.rules.SwitchRequest.prototype.STRONG];
            }

            if (confidence != MediaPlayer.rules.SwitchRequest.prototype.STRONG &&
                confidence != MediaPlayer.rules.SwitchRequest.prototype.WEAK) {
                confidence = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;
            }

            return {count: count, confidence: confidence};
        },

        validate = function () {
            var now = new Date().getTime(),
                isEnoughTimeSinceLastValidation = lastValidationTime ? (now - lastValidationTime > this.fragmentController.getLoadingTime(this)) : true;

            if (!isEnoughTimeSinceLastValidation || isStopped || (this.playbackController.isPaused() && (!this.scheduleWhilePaused || isDynamic))) return;

            lastValidationTime = now;
            this.abrController.getPlaybackQuality(type, this.streamProcessor.getData());
            requestNewFragment.call(this);
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

        onBytesAppended = function(/*sender*/) {
            addPlaylistTraceMetrics.call(this);
        },

        onBytesRejected = function(sender, quality, index) {
            var req = fragmentModel.getExecutedRequestForQualityAndIndex(quality, index);
            // if request for an unappropriate quality has not been removed yet, do it now
            if (req) {
                fragmentModel.removeExecutedRequest(req);
                // if index is not a number it means that this is a media segment, so we should
                // request the segment for the same time but with an appropriate quality
                // If this is init segment do nothing, because it will be requested in loadInitialization method
                if (!isNaN(index)) {
                    seekTarget = req.startTime;
                }
            }
        },

        onDataUpdateStarted = function(/*sender*/) {
            doStop.call(this);
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
            var self = this;

            self.metricsModel.addBufferLevel(type, new Date(), newBufferLevel);
            validate.call(this);
        },

        onQuotaExceeded = function(/*sender, criticalBufferLevel*/) {
            doStop.call(this);
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

            if (playListTraceMetricsClosed === true && currentRepresentation) {
                playListTraceMetricsClosed = false;
                playListTraceMetrics = self.metricsModel.appendPlayListTrace(playListMetrics, currentRepresentation.id, null, currentTime, currentVideoTime, null, rate, null);
            }
        },

        onClosedCaptioningRequested = function(sender, quality) {
            var self = this;
            getInitRequest.call(self, quality);
            fragmentModel.executeCurrentRequest();
        },

        onPlaybackStarted = function(sender, startTime) {
            doSeek.call(this, startTime);
        },

        onPlaybackSeeking = function(sender, time) {
            doSeek.call(this, time);
        },

        onPlaybackRateChanged = function() {
            addPlaylistTraceMetrics.call(this);
        },

        onWallclockTimeUpdated = function(/*sender*/) {
            validate.call(this);
        },

        onLiveEdgeFound = function(sender, liveEdgeTime, periodInfo) {
            // step back from a found live edge time to be able to buffer some data
            var self = this,
                fragmentDuration = currentRepresentation.segmentDuration || 0,
                startTime = Math.max((liveEdgeTime - self.bufferController.getMinBufferTime()), currentRepresentation.segmentAvailabilityRange.start),
                request,
                segmentStart;
            // get a request for a start time
            request = self.indexHandler.getSegmentRequestForTime(currentRepresentation, startTime);
            segmentStart = request.startTime;
            // set liveEdge to be in the middle of the segment time to avoid a possible gap between
            // currentTime and buffered.start(0)
            periodInfo.liveEdge = segmentStart + (fragmentDuration / 2);
            ready = true;
            startOnReady.call(self, segmentStart);
        };

    return {
        debug: undefined,
        system: undefined,
        metricsModel: undefined,
        bufferExt: undefined,
        scheduleWhilePaused: undefined,
        sourceBufferExt: undefined,
        abrController: undefined,
        scheduleRulesCollection: undefined,
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
            this.bytesRejected = onBytesRejected;
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
        },

        getFragmentModel: function() {
            return fragmentModel;
        },

        reset: function() {
            var self = this;

            doStop.call(self);
            self.bufferController.unsubscribe(self.bufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN, self.scheduleRulesCollection.bufferLevelRule);
            self.bufferController.unsubscribe(self.bufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED, self.scheduleRulesCollection.bufferLevelRule);
            self.fragmentController.abortRequestsForModel(fragmentModel);
            self.fragmentController.detachModel(fragmentModel);
            clearMetrics.call(self);
            fragmentsToLoad = 0;
        },

        start: doStart,
        seek: doSeek,
        stop: doStop
    };
};

MediaPlayer.dependencies.ScheduleController.prototype = {
    constructor: MediaPlayer.dependencies.ScheduleController
};