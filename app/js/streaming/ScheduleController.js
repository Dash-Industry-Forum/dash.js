MediaPlayer.dependencies.ScheduleController = function () {
    "use strict";

    var WAITING = "WAITING",
        READY = "READY",
        VALIDATING = "VALIDATING",
        LOADING = "LOADING",
        fragmentsToLoad,
        type,
        dataChanged = true,
        ready,
        started,
        fragmentModel,
        seeking,
        seekTarget,
        state = WAITING,
        isDynamic,
        currentRepresentation,
        initialPlayback = true,
        playingTime,
        lastQuality,
        waitingForBuffer = false,

        playListMetrics = null,
        playListTraceMetrics = null,
        playListTraceMetricsClosed = true,

        setState = function(value) {
            var self = this;
            //self.debug.log("BufferController " + type + " setState to:" + value);
            state = value;
            // Notify the FragmentController about any state change to track the loading process of each active BufferController
            if (fragmentModel !== null) {
                self.fragmentController.onStateChange();
            }
        },

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

        startPlayback = function() {
            if (!ready || !started) {
                return;
            }

            //this.debug.log("BufferController begin " + type + " validation");
            setState.call(this, READY);

            this.requestScheduler.startScheduling(this, validate);
            fragmentModel = this.fragmentController.getModel(this);
        },

        doStart = function () {
            var currentTime;

            if(this.requestScheduler.isScheduled(this)) {
                return;
            }

            if (seeking === false) {
                currentTime = new Date();
                clearPlayListTraceMetrics(currentTime, MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
                playListMetrics = this.metricsModel.addPlayList(type, currentTime, 0, MediaPlayer.vo.metrics.PlayList.INITIAL_PLAY_START_REASON);
                //mseSetTime = true;
            }

            this.debug.log("BufferController " + type + " start.");

            started = true;
            waitingForBuffer = true;
            startPlayback.call(this);
        },

        doSeek = function (time) {
            var currentTime;

            this.debug.log("BufferController " + type + " seek: " + time);
            seeking = true;
            seekTarget = time;
            currentTime = new Date();
            clearPlayListTraceMetrics(currentTime, MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
            playListMetrics = this.metricsModel.addPlayList(type, currentTime, seekTarget, MediaPlayer.vo.metrics.PlayList.SEEK_START_REASON);

            doStart.call(this);
        },

        doStop = function () {
            if (state === WAITING) return;

            this.debug.log("BufferController " + type + " stop.");
            setState.call(this, WAITING);
            this.requestScheduler.stopScheduling(this);
            // cancel the requests that have already been created, but not loaded yet.
            this.fragmentController.cancelPendingRequestsForModel(fragmentModel);
            started = false;
            waitingForBuffer = false;

            clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
        },

        loadInitialization = function (qualityChanged, currentQuality) {

            if (initialPlayback) {
                this.debug.log("Marking a special seek for initial " + type + " playback.");

                // If we weren't already seeking, 'seek' to the beginning of the stream.
                if (!seeking) {
                    seeking = true;
                    seekTarget = 0;
                }

                initialPlayback = false;
            }

            if (dataChanged || qualityChanged) {
                this.notify(this.notifier.ENAME_QUALITY_CHANGED, lastQuality, currentQuality, dataChanged);
                lastQuality = currentQuality;
            }
        },

        loadNextFragment = function () {
            var promise,
                self = this;

            if (dataChanged && !seeking) {
                //time = self.videoModel.getCurrentTime();
                self.debug.log("Data changed - loading the " + type + " fragment for time: " + playingTime);
                promise = self.indexHandler.getSegmentRequestForTime(currentRepresentation, playingTime);
            } else {
                var deferred = Q.defer(),
                    segmentTime;
                promise = deferred.promise;

                Q.when(seeking ? seekTarget : self.indexHandler.getCurrentTime(currentRepresentation)).then(
                    function (time) {
                        segmentTime = time;
                        seeking = false;

                        self.sourceBufferExt.getBufferRange(self.bufferController.getBuffer(), segmentTime).then(
                            function (range) {
                                if (range !== null) {
                                    segmentTime = range.end;
                                }
                                //self.debug.log("Loading the " + type + " fragment for time: " + segmentTime);
                                self.indexHandler.getSegmentRequestForTime(currentRepresentation, segmentTime).then(
                                    function (request) {
                                        deferred.resolve(request);
                                    },
                                    function () {
                                        deferred.reject();
                                    }
                                );
                            },
                            function () {
                                deferred.reject();
                            }
                        );
                    },
                    function () {
                        deferred.reject();
                    }
                );
            }

            return promise;
        },

        onFragmentRequest = function (request) {
            var self = this;

            if (request !== null) {
                // If we have already loaded the given fragment ask for the next one. Otherwise prepare it to get loaded
                if (self.fragmentController.isFragmentLoadedOrPending(self, request)) {
                    if (request.action !== "complete") {
                        self.indexHandler.getNextSegmentRequest(currentRepresentation).then(onFragmentRequest.bind(self));
                    } else {
                        doStop.call(self);
                        setState.call(self, READY);
                    }
                } else {
                    //self.debug.log("Loading fragment: " + request.streamType + ":" + request.startTime);
                    self.fragmentController.prepareFragmentForLoading(self, request).then(
                        function() {
                            setState.call(self, READY);
                        }
                    );
                }
            } else {
                setState.call(self, READY);
            }
        },

        requestNewFragment = function() {
            var self = this,
                pendingRequests = self.fragmentController.getPendingRequests(self),
                loadingRequests = self.fragmentController.getLoadingRequests(self),
                ln = (pendingRequests ? pendingRequests.length : 0) + (loadingRequests ? loadingRequests.length : 0);

            if ((fragmentsToLoad - ln) > 0) {
                fragmentsToLoad--;
                loadNextFragment.call(self).then(onFragmentRequest.bind(self));
            } else {

                if (state === VALIDATING) {
                    setState.call(self, READY);
                }

                finishValidation.call(self);
            }
        },

        getRequiredFragmentCount = function() {
            var self =this,
                playbackRate = self.videoModel.getPlaybackRate(),
                actualBufferedDuration = self.bufferController.getBufferLevel() / Math.max(playbackRate, 1),
                deferred = Q.defer();

            self.bufferExt.getRequiredBufferLength(waitingForBuffer, self.requestScheduler.getExecuteInterval(self)/1000, isDynamic, currentRepresentation.adaptation.period.duration).then(
                function (requiredBufferLength) {
                    self.indexHandler.getSegmentCountForDuration(currentRepresentation, requiredBufferLength, actualBufferedDuration).then(
                        function(count) {
                            deferred.resolve(count);
                        }
                    );
                }
            );

            return deferred.promise;
        },

        validate = function () {
            var self = this,
                newQuality,
                qualityChanged = false,
                now = new Date(),
                currentVideoTime = self.videoModel.getCurrentTime();

            //self.debug.log("BufferController.validate() " + type + " | state: " + state);
            //self.debug.log(type + " Playback rate: " + self.videoModel.getElement().playbackRate);
            //self.debug.log(type + " Working time: " + currentTime);
            //self.debug.log(type + " Video time: " + currentVideoTime);
            //self.debug.log("Current " + type + " buffer length: " + bufferLevel);

            //mseSetTimeIfPossible.call(self);

            self.notify(self.notifier.ENAME_VALIDATION_STARTED);

            if (!isSchedulingRequired.call(self) && !initialPlayback && !dataChanged) {
                doStop.call(self);
                return;
            }

            if (state === READY) {
                setState.call(self, VALIDATING);
                self.abrController.getPlaybackQuality(type, self.representationController.getData()).then(
                    function (result) {
                        var quality = result.quality;
                        //self.debug.log(type + " Playback quality: " + quality);
                        //self.debug.log("Populate " + type + " buffers.");

                        if (quality !== undefined) {
                            newQuality = quality;
                        }

                        qualityChanged = (quality !== lastQuality);

                        if (qualityChanged === true) {
                            // The quality has beeen changed so we should abort the requests that has not been loaded yet
                            self.fragmentController.abortRequestsForModel(fragmentModel);
                            currentRepresentation = self.representationController.getRepresentationForQuality(newQuality);
                            if (currentRepresentation === null || currentRepresentation === undefined) {
                                throw "Unexpected error!";
                            }

                            // each representation can have its own @presentationTimeOffset, so we should set the offset
                            // if it has changed after switching the quality
                            if (self.bufferController.getBuffer().timestampOffset !== currentRepresentation.MSETimeOffset) {
                                self.bufferController.getBuffer().timestampOffset = currentRepresentation.MSETimeOffset;
                            }

                            clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.REPRESENTATION_SWITCH_STOP_REASON);
                            self.metricsModel.addRepresentationSwitch(type, now, currentVideoTime, currentRepresentation.id);
                        }

                        //self.debug.log(qualityChanged ? (type + " Quality changed to: " + quality) : "Quality didn't change.");
                        return getRequiredFragmentCount.call(self, quality);
                    }
                ).then(
                    function (count) {
                        fragmentsToLoad = count;
                        loadInitialization.call(self, qualityChanged, newQuality);
                        // We should request the media fragment w/o waiting for the next validate call
                        // or until the initialization fragment has been loaded
                        requestNewFragment.call(self);
                    }
                );
            } else if (state === VALIDATING) {
                setState.call(self, READY);
            }
        },

        finishValidation = function () {
            var self = this;
            if (state === LOADING) {
                setState.call(self, READY);
            }
        },

        isSchedulingRequired = function() {
            var isPaused = this.videoModel.isPaused();

            return (!isPaused || (isPaused && this.scheduleWhilePaused));
        },

        clearMetrics = function () {
            var self = this;

            if (type === null || type === "") {
                return;
            }

            self.metricsModel.clearCurrentMetricsForType(type);
        },

        onDataUpdateCompleted = function(sender, newRepresentation) {
            var self = this;

            if (sender !== self.representationController) return;

            dataChanged = true;

            if (!currentRepresentation) {
                currentRepresentation = newRepresentation;
            }

            self.indexHandler.getCurrentTime(currentRepresentation).then(
                function (time) {
                    currentRepresentation = newRepresentation;
                    self.seek(time);
                }
            );
        },

        onStreamCompleted = function(sender/*, request*/) {
            if (sender !== this.streamProcessor.getFragmentModel()) return;

            this.debug.log(type + " Stream is complete.");
            clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.END_OF_CONTENT_STOP_REASON);
            doStop.call(this);
        },

        onInitSegmentLoadingStart = function(sender/*, request*/) {
            var self = this;

            if (sender !== self.streamProcessor.getFragmentModel()) return;

            setState.call(this, READY);
        },

        onMediaSegmentLoadingStart = function(sender/*, request*/) {
            var self = this,
                time;

            if (sender !== self.streamProcessor.getFragmentModel()) return;

            time = self.fragmentController.getLoadingTime(self);
            setState.call(this, LOADING);

            setTimeout(function() {
                if (!self.fragmentController) return;
                setState.call(self, READY);
                requestNewFragment.call(self);
            }, time);
        },

        onBytesError = function (sender/*, request*/) {
            doStop.call(this);
        },

        onBytesAppended = function(sender) {
            var self = this,
                currentVideoTime = self.videoModel.getCurrentTime(),
                currentTime = new Date();

            if (sender !== self.bufferController) return;

            if (playListTraceMetricsClosed === true && state !== WAITING && lastQuality !== -1) {
                playListTraceMetricsClosed = false;
                playListTraceMetrics = self.metricsModel.appendPlayListTrace(playListMetrics, currentRepresentation.id, null, currentTime, currentVideoTime, null, 1.0, null);
            }

            if (!this.requestScheduler.isScheduled(this) && isSchedulingRequired.call(this)) {
                doStart.call(this);
            }
        },

        onBufferControllerInitialized = function(sender) {
            if (sender !== this.bufferController) return;

            if (!isDynamic) {
                ready = true;
                startPlayback.call(this);
            }
        },

        onDataUpdateStarted = function(sender) {
            if (sender !== this.representationController) return;

            doStop.call(this);
        },

        onInitRequested = function(sender, quality) {
            var self = this;

            if (sender !== self.bufferController) return;

            self.indexHandler.getInitRequest(self.representationController.getRepresentationForQuality(quality)).then(
                function(request) {
                    if (request !== null) {
                        //self.debug.log("Loading initialization: " + request.streamType + ":" + request.startTime);
                        //self.debug.log(request);
                        self.fragmentController.prepareFragmentForLoading(self, request).then(
                            function() {
                                setState.call(self, READY);
                            }
                        );

                        dataChanged = false;
                    }
                }
            );
        },

        onBufferingCompleted = function (sender) {
            if (sender !== this.bufferController) return;

            setState.call(this, READY);
        },

        onBufferLevelOutrun = function(sender) {
            var self = this;

            if (sender !== self.bufferController) return;

            fragmentsToLoad = 0;
        },

        onBufferCleared = function(sender, startTime, endTime) {
            if (sender !== this.bufferController) return;
            // after the data has been removed from the buffer we should remove the requests from the list of
            // the executed requests for which playback time is inside the time interval that has been removed from the buffer
            this.fragmentController.removeExecutedRequestsBeforeTime(fragmentModel, endTime);
        },

        onBufferLevelStateChanged = function(sender, hasSufficientBuffer) {
            var self = this;

            if (sender !== this.bufferController) return;

            if (!hasSufficientBuffer) {
                waitingForBuffer = true;
                self.debug.log("Stalling " + type + " Buffer: " + type);
                clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.REBUFFERING_REASON);
            } else {
                waitingForBuffer = false;
            }
        },

        onBufferLevelUpdated = function(sender, newBufferLevel) {
            var self = this;

            if (sender !== this.bufferController) return;

            self.metricsModel.addBufferLevel(type, new Date(), newBufferLevel);
        },

        onLiveEdgeFound = function(sender, liveEdgeTime, periodInfo) {
            if (sender !== this.liveEdgeFinder) return;

            // step back from a found live edge time to be able to buffer some data
            var self = this,
                fragmentDuration = currentRepresentation.segmentDuration || 0,
                startTime = Math.max((liveEdgeTime - self.bufferController.getMinBufferTime()), currentRepresentation.segmentAvailabilityRange.start),
                segmentStart;
            // get a request for a start time
            self.indexHandler.getSegmentRequestForTime(currentRepresentation, startTime).then(function(request) {
                segmentStart = request.startTime;
                // set liveEdge to be in the middle of the segment time to avoid a possible gap between
                // currentTime and buffered.start(0)
                periodInfo.liveEdge = segmentStart + (fragmentDuration / 2);
                ready = true;
                startPlayback.call(self);
                doSeek.call(self, segmentStart);
            });
        };

    return {
        debug: undefined,
        system: undefined,
        abrController: undefined,
        metricsModel: undefined,
        bufferExt: undefined,
        scheduleWhilePaused: undefined,
        sourceBufferExt: undefined,
        notifier: undefined,
        notify: undefined,
        subscribe: undefined,

        setup: function() {
            this.liveEdgeFound = onLiveEdgeFound;

            this.dataUpdateStarted = onDataUpdateStarted;
            this.dataUpdateCompleted = onDataUpdateCompleted;

            this.initSegmentLoadingStart = onInitSegmentLoadingStart;
            this.mediaSegmentLoadingStart = onMediaSegmentLoadingStart;
            this.segmentLoadingFailed = onBytesError;
            this.streamCompleted = onStreamCompleted;

            this.bufferControllerInitialized = onBufferControllerInitialized;
            this.bufferCleared = onBufferCleared;
            this.bufferingCompleted = onBufferingCompleted;
            this.bytesAppended = onBytesAppended;
            this.bufferLevelOutrun = onBufferLevelOutrun;
            this.bufferLevelStateChanged = onBufferLevelStateChanged;
            this.bufferLevelUpdated = onBufferLevelUpdated;
            this.initRequested = onInitRequested;
        },

        initialize: function(typeValue, streamProcessor) {
            var self = this;

            type = typeValue;
            self.streamProcessor = streamProcessor;
            self.videoModel = streamProcessor.videoModel;
            self.fragmentController = streamProcessor.fragmentController;
            self.representationController = streamProcessor.representationController;
            self.liveEdgeFinder = streamProcessor.liveEdgeFinder;
            self.bufferController = streamProcessor.bufferController;
            self.indexHandler = streamProcessor.indexHandler;
            self.requestScheduler = streamProcessor.requestScheduler;
            isDynamic = streamProcessor.isDynamic();
        },

        getFragmentModel: function() {
            return fragmentModel;
        },

        reset: function() {
            var self = this;

            doStop.call(self);
            self.fragmentController.abortRequestsForModel(fragmentModel);
            self.fragmentController.detachModel(fragmentModel);
            clearMetrics.call(self);
        },

        isReady: function() {
            return state === READY;
        },

        start: doStart,
        seek: doSeek,
        stop: doStop
    };
};

MediaPlayer.dependencies.ScheduleController.prototype = {
    constructor: MediaPlayer.dependencies.ScheduleController
};