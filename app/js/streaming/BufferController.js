/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Digital Primates
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.dependencies.BufferController = function () {
    "use strict";
    var STALL_THRESHOLD = 0.5,
        QUOTA_EXCEEDED_ERROR_CODE = 22,
        WAITING = "WAITING",
        READY = "READY",
        VALIDATING = "VALIDATING",
        LOADING = "LOADING",
        state = WAITING,
        ready = false,
        started = false,
        waitingForBuffer = false,
        initialPlayback = true,
        initializationData = [],
        seeking = false,
        //mseSetTime = false,
        seekTarget = -1,
        dataChanged = true,
        playingTime,
        lastQuality = -1,
        stalled = false,
        isLiveStream = false,
        liveInitialization = false,
        isBufferingCompleted = false,
        deferredAppends = [],
        deferredInitAppend = null,
        deferredStreamComplete = Q.defer(),
        deferredRejectedDataAppend = null,
        deferredBuffersFlatten = null,
        periodIndex = -1,
        duration = 0,
        fragmentsToLoad = 0,
        fragmentModel = null,
        bufferLevel = 0,
        isQuotaExceeded = false,
        rejectedBytes = null,
        fragmentDuration = 0,
        rejectTime = null,
        mediaSource,

        type,
        data = null,
        buffer = null,
        minBufferTime,

        playListMetrics = null,
        playListTraceMetrics = null,
        playListTraceMetricsClosed = true,

        setState = function (value) {
            var self = this;
            self.debug.log("BufferController " + type + " setState to:" + value);
            state = value;
            // Notify the FragmentController about any state change to track the loading process of each active BufferController
            if (fragmentModel !== null) {
                self.fragmentController.onBufferControllerStateChange();
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

        // TODO : Remove?
        initializeLive = function () {
            var manifest = this.manifestModel.getValue(),
                isLive = this.manifestExt.getIsLive(manifest);

            liveInitialization = true;

            return Q.when(isLive);
        },
/*
        setCurrentTimeOnVideo = function (time) {
            var ct = this.videoModel.getCurrentTime();
            if (ct === time) {
                return;
            }

            this.debug.log("Set current time on video: " + time);
            this.system.notify("setCurrentTime");
            this.videoModel.setCurrentTime(time);
        },
*/
        startPlayback = function () {
            if (!ready || !started) {
                return;
            }

            var self = this;

            initializeLive.call(this).then(
                function (isLive) {
                    isLiveStream = isLive;
                    self.debug.log("BufferController begin " + type + " validation");
                    setState.call(self, READY);

                    self.requestScheduler.startScheduling(self, validate);
                    fragmentModel = self.fragmentController.attachBufferController(self);
                }
            );
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

        getRepresentationForQuality = function (quality, data) {
            var representation = null;
            if (data && data.Representation_asArray && data.Representation_asArray.length > 0) {
                representation = data.Representation_asArray[quality];
            }
            return representation;
        },

        finishValidation = function () {
            var self = this;
            if (state === LOADING) {
                if (stalled) {
                    stalled = false;
                    this.videoModel.stallStream(type, stalled);
                }
                setState.call(self, READY);
            }
        },

        onBytesLoadingStart = function(request) {
			if (this.fragmentController.isInitializationRequest(request)) {
				setState.call(this, READY);
			} else {
				setState.call(this, LOADING);
                var self = this,
                    time = self.fragmentController.getLoadingTime(self);
                setTimeout(function(){
                    if (!data && !buffer) return;

                    setState.call(self, READY);
                    requestNewFragment.call(self);
                }, time);
			}
        },

        onBytesLoaded = function (request, response) {
			if (this.fragmentController.isInitializationRequest(request)) {
				onInitializationLoaded.call(this, request, response);
			} else {
				onMediaLoaded.call(this, request, response);
			}
        },

		onMediaLoaded = function (request, response) {
			var self = this;

			self.debug.log(type + " Bytes finished loading: " + request.url);

            if (!fragmentDuration && !isNaN(request.duration)) {
                fragmentDuration = request.duration;
            }

			self.fragmentController.process(response.data).then(
				function (data) {
					if (data !== null && deferredInitAppend !== null) {

                        if (request.quality !== lastQuality) {
                            self.fragmentController.removeExecutedRequest(fragmentModel, request);
                            return;
                        }

                        Q.when(deferredInitAppend.promise).then(
                            function() {
                                appendToBuffer.call(self, data, request.quality).then(
                                    function() {
                                        deferredStreamComplete.promise.then(
                                            function(lastRequest) {
                                                if ((lastRequest.index - 1) === request.index && !isBufferingCompleted) {
                                                    isBufferingCompleted = true;
                                                    setState.call(self, READY);
                                                    self.system.notify("bufferingCompleted");
                                                }
                                            }
                                        );
                                    }
                                );
                            }
                        );
					} else {
						self.debug.log("No " + type + " bytes to push.");
					}
				}
			);
		},

        appendToBuffer = function(data, quality) {
            var self = this,
                isAppendingRejectedData = (data == rejectedBytes),
                // if we append the rejected data we should use the stored promise instead of creating a new one
                deferred = isAppendingRejectedData ? deferredRejectedDataAppend : Q.defer(),
                ln = isAppendingRejectedData ? deferredAppends.length : deferredAppends.push(deferred),
                idx = deferredAppends.indexOf(deferred),
                representation = getRepresentationForQuality(lastQuality, self.getData()),
                currentVideoTime = self.videoModel.getCurrentTime(),
                currentTime = new Date();

            self.debug.log("Push (" + type + ") bytes: " + data.byteLength);

            if (playListTraceMetricsClosed === true && state !== WAITING && lastQuality !== -1) {
                playListTraceMetricsClosed = false;
                playListTraceMetrics = self.metricsModel.appendPlayListTrace(playListMetrics, representation.id, null, currentTime, currentVideoTime, null, 1.0, null);
            }

            Q.when((isAppendingRejectedData) || ln < 2 || deferredAppends[ln - 2].promise).then(
                function() {
                    if (!buffer) return;
                    clearBuffer.call(self).then(
                        function() {
                            if (quality !== lastQuality) {
                                deferred.resolve();
                                if (isAppendingRejectedData) {
                                    deferredRejectedDataAppend = null;
                                    rejectedBytes = null;
                                }
                                return;
                            }

                            Q.when(deferredBuffersFlatten ? deferredBuffersFlatten.promise : true).then(
                                function() {
                                    self.sourceBufferExt.append(buffer, data, self.videoModel).then(
                                        function (/*appended*/) {
                                            if (isAppendingRejectedData) {
                                                deferredRejectedDataAppend = null;
                                                rejectedBytes = null;
                                            }

                                            // we should resume request scheduling after all peinding segments are appended -
                                            //the last promise in the queue has been resolved
                                            if ((state === WAITING) && ((idx + 1 === deferredAppends.length))) {
                                                doStart.call(self);
                                            }

                                            isQuotaExceeded = false;

                                            updateBufferLevel.call(self).then(
                                                function() {
                                                    deferred.resolve();
                                                }
                                            );

                                            if (!buffer) return;
                                            self.sourceBufferExt.getAllRanges(buffer).then(
                                                function(ranges) {
                                                    if (ranges) {
                                                        self.debug.log("Append " + type + " complete: " + ranges.length);
                                                        if (ranges.length > 0) {
                                                            var i,
                                                                len;

                                                            self.debug.log("Number of buffered " + type + " ranges: " + ranges.length);
                                                            for (i = 0, len = ranges.length; i < len; i += 1) {
                                                                self.debug.log("Buffered " + type + " Range: " + ranges.start(i) + " - " + ranges.end(i));
                                                            }
                                                        }
                                                    }
                                                }
                                            );
                                        },
                                        function(result) {
                                            // if the append has failed because the buffer is full we should store the data
                                            // that has not been appended and stop request scheduling. We also need to store
                                            // the promise for this append because the next data can be appended only after
                                            // this promise is resolved.
                                            if (result.err.code === QUOTA_EXCEEDED_ERROR_CODE) {
                                                rejectedBytes = data;
                                                deferredRejectedDataAppend = deferred;
                                                isQuotaExceeded = true;
                                                rejectTime = self.videoModel.getCurrentTime();
                                                fragmentsToLoad = 0;
                                                // stop scheduling new requests
                                                doStop.call(self);
                                            }
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );

            return deferred.promise;
        },

        updateBufferLevel = function() {
            if (!data && !buffer) return Q.when(false);

            var self = this,
                deferred = Q.defer(),
                currentTime = getWorkingTime.call(self);

            self.sourceBufferExt.getBufferLength(buffer, currentTime).then(
                function(bufferLength) {
                    bufferLevel = bufferLength;
                    self.metricsModel.addBufferLevel(type, new Date(), bufferLevel);
                    checkGapBetweenBuffers.call(self);
                    deferred.resolve();
                }
            );

            return deferred.promise;
        },

        checkGapBetweenBuffers= function() {
            var leastLevel = this.bufferExt.getLeastBufferLevel(),
                acceptableGap = fragmentDuration * 2,
                actualGap = bufferLevel - leastLevel;

            // if the gap betweeen buffers is too big we should create a promise that prevents appending data to the current
            // buffer and requesting new segments until the gap will be reduced to the suitable size.
            if (actualGap > acceptableGap && !deferredBuffersFlatten) {
                fragmentsToLoad = 0;
                deferredBuffersFlatten = Q.defer();
            } else if ((actualGap < acceptableGap) && deferredBuffersFlatten) {
                deferredBuffersFlatten.resolve();
                deferredBuffersFlatten = null;
            }
        },

        clearBuffer = function() {
            var self = this,
                deferred = Q.defer(),
                currentTime = self.videoModel.getCurrentTime(),
                removeStart = 0,
                removeEnd,
                req;

            // do not remove any data until the quota is exceeded
            if (!isQuotaExceeded) {
                return Q.when(true);
            }

            // we need to remove data that is more than one segment before the video currentTime
            req = self.fragmentController.getExecutedRequestForTime(fragmentModel, currentTime);
            removeEnd = (req && !isNaN(req.startTime)) ? req.startTime : Math.floor(currentTime);
            fragmentDuration = (req && !isNaN(req.duration)) ? req.duration : 1;

            self.sourceBufferExt.getBufferRange(buffer, currentTime).then(
                function(range) {
                    if ((range === null) && (seekTarget === currentTime) && (buffer.buffered.length > 0)) {
                        removeEnd = buffer.buffered.end(buffer.buffered.length -1 );
                    }

                    self.sourceBufferExt.remove(buffer, removeStart, removeEnd, duration, mediaSource).then(
                        function() {
                            // after the data has been removed from the buffer we should remove the requests from the list of
                            // the executed requests for which playback time is inside the time interval that has been removed from the buffer
                            self.fragmentController.removeExecutedRequestsBeforeTime(fragmentModel, removeEnd);
                            deferred.resolve();
                        }
                    );
                }
            );

            return deferred.promise;
        },

        onInitializationLoaded = function(request, response) {
            var self = this,
                initData = response.data,
                quality = request.quality;

            self.debug.log(type + " Initialization finished loading: " + request.url);

            self.fragmentController.process(initData).then(
                function (data) {
                    if (data !== null) {
                        // cache the initialization data to use it next time the quality has changed
                        initializationData[quality] = data;

                        // if this is the initialization data for current quality we need to push it to the buffer
                        if (quality === lastQuality) {
                            appendToBuffer.call(self, data, request.quality).then(
                                function() {
                                    deferredInitAppend.resolve();
                                }
                            );
                        }
                    } else {
                        self.debug.log("No " + type + " bytes to push.");
                    }
                }
            );
        },

        onBytesError = function () {
            var self = this,
                manifest = self.manifestModel.getValue(),
                isLive = self.manifestExt.getIsLive(manifest);

            // remove the failed request from the list
            /*
            for (var i = fragmentRequests.length - 1; i >= 0 ; --i) {
                if (fragmentRequests[i].startTime === request.startTime) {
                    if (fragmentRequests[i].url === request.url) {
                        fragmentRequests.splice(i, 1);
                    }
                    break;
                }
            }
            */

            if (state === LOADING) {
                setState.call(self, READY);
            }

            if (!isLive) {
                self.system.notify("segmentLoadingFailed");
            }
        },

        signalStreamComplete = function (request) {
            this.debug.log(type + " Stream is complete.");
            clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.END_OF_CONTENT_STOP_REASON);
            doStop.call(this);
            deferredStreamComplete.resolve(request);
        },

        loadInitialization = function (qualityChanged, currentQuality) {
            var initializationPromise = null,
                topQuality = this.bufferExt.getTopQualityIndex(type),
                funcs = [],
                quality;

            if (initialPlayback) {
                this.debug.log("Marking a special seek for initial " + type + " playback.");

                // If we weren't already seeking, 'seek' to the beginning of the stream.
                if (!seeking) {
                    seeking = true;
                    seekTarget = 0;
                }

                initialPlayback = false;
            }

            if (dataChanged) {
                deferredInitAppend = Q.defer();
                initializationData = [];
                // get initialization requests for all the qualities of this buffer type
                for (quality = 0; quality <= topQuality; quality += 1) {
                    funcs.push(this.indexHandler.getInitRequest(quality, data));
                }

                lastQuality = currentQuality;
                initializationPromise = Q.all(funcs);
            } else {
                initializationPromise = Q.when(null);
                // if the quality has changed we should append the initialization data again. We get it
                // from the cached array instead of sending a new request
                if (qualityChanged) {
                    deferredInitAppend = Q.defer();
                    lastQuality = currentQuality;
                    if (initializationData[currentQuality]) {
                        appendToBuffer.call(this, initializationData[currentQuality], currentQuality).then(
                            function() {
                                deferredInitAppend.resolve();
                            }
                        );
                    }
                }
            }
            return initializationPromise;
        },

        loadNextFragment = function (quality) {
            var promise,
                self = this;

            if (dataChanged && !seeking) {
                //time = self.videoModel.getCurrentTime();
                self.debug.log("Data changed - loading the " + type + " fragment for time: " + playingTime);
                promise = self.indexHandler.getSegmentRequestForTime(playingTime, quality, data);
            } else {
                var deferred = Q.defer(),
                    segmentTime = self.videoModel.getCurrentTime();
                promise = deferred.promise;

                self.sourceBufferExt.getBufferRange(buffer, segmentTime).then(
                    function (range) {
                        return Q.when(seeking ? seekTarget : self.indexHandler.getCurrentTime(quality, data)).then(
                            function (time) {
                                segmentTime = time;
                                seeking = false;

                                if (range !== null) {
                                    segmentTime = range.end;
                                }

                                self.debug.log("Loading the " + type + " fragment for time: " + segmentTime);
                                self.indexHandler.getSegmentRequestForTime(segmentTime, quality, data).then(
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

            dataChanged = false;

            return promise;
        },

        onFragmentRequest = function (request) {
            var self = this;

            if (request !== null) {
                // If we have already loaded the given fragment ask for the next one. Otherwise prepare it to get loaded
                if (self.fragmentController.isFragmentLoadedOrPending(self, request)) {
                    if (request.action !== "complete") {
                        self.indexHandler.getNextSegmentRequest(lastQuality, data).then(onFragmentRequest.bind(self));
                    } else {
                        doStop.call(self);
                        setState.call(self, READY);
                    }
                } else {
                    self.debug.log("Loading an " + type + " fragment: " + request.url);
                    Q.when(deferredBuffersFlatten? deferredBuffersFlatten.promise : true).then(
                        function() {
                            self.fragmentController.prepareFragmentForLoading(self, request, onBytesLoadingStart, onBytesLoaded, onBytesError, signalStreamComplete).then(
                                function() {
                                    setState.call(self, READY);
                                }
                            );
                        }
                    );
                }
            } else {
                setState.call(self, READY);
            }
        },

        checkIfSufficientBuffer = function () {
            if (waitingForBuffer) {
                if (bufferLevel < minBufferTime) {
                    if (!stalled) {
                        this.debug.log("Waiting for more " + type + " buffer before starting playback.");
                        stalled = true;
                        this.videoModel.stallStream(type, stalled);
                    }
                } else {
                    this.debug.log("Got enough " + type + " buffer to start.");
                    waitingForBuffer = false;
                    stalled = false;
                    this.videoModel.stallStream(type, stalled);
                }
            }
        },
/*
        mseGetDesiredTime = function () {
            var ranges = buffer.buffered,
                time = 0;

            if (ranges.length > 0) {
                // Ideally we'd be able to jump to the seekTarget.
                // The seekTarget is relative to the manifest timeline though.
                // There's no promise that the seekTarget and the timestamps of the media
                // match, so we can't go to seekTarget.
                // Instead jump to the first time in the buffered range.
                time = ranges.start(0);
                time += 0.01; // TODO : For some reason the streams don't play if we don't do this.
            }

            return time;
        },

        mseSetTimeIfPossible = function () {
            if (waitingForBuffer || stalled) {
                return;
            }

            if (!mseSetTime) {
                return;
            }

            var ranges = buffer.buffered,
                time;

            if (ranges.length === 0) {
                return;
            }

            time = mseGetDesiredTime();
            setCurrentTimeOnVideo.call(this, time);

            liveInitialization = false;
            mseSetTime = false;
            seekTarget = -1;
        },
*/
        getWorkingTime = function () {
            var time = -1;

            /* seeking gets stuck on when the buffer already has the segment containing seekTarget appended
            if (seeking) {
                time = seekTarget;
                this.debug.log("Working time is seek time: " + time);
            }
            else
            if (waitingForBuffer && !seeking) {
                time = mseGetDesiredTime();
                this.debug.log("Working time is mse time: " + time);
            } else
            */
            {
                time = this.videoModel.getCurrentTime();
                //this.debug.log("Working time is video time: " + time);
            }

            return time;
        },

        getRequiredFragmentCount = function(quality) {
            var self =this,
                playbackRate = self.videoModel.getPlaybackRate(),
                actualBufferedDuration = bufferLevel / Math.max(playbackRate, 1),
                deferred = Q.defer();
                self.bufferExt.getRequiredBufferLength(waitingForBuffer, self.requestScheduler.getExecuteInterval(self)/1000, isLiveStream, duration).then(
                    function (requiredBufferLength) {
                        self.indexHandler.getSegmentCountForDuration(quality, data, requiredBufferLength, actualBufferedDuration).then(
                            function(count) {
                                deferred.resolve(count);
                            }
                        );
                    }
                );

            return deferred.promise;
        },

        requestNewFragment = function() {
            var self = this,
                pendingRequests = self.fragmentController.getPendingRequests(self),
                loadingRequests = self.fragmentController.getLoadingRequests(self),
                ln = (pendingRequests ? pendingRequests.length : 0) + (loadingRequests ? loadingRequests.length : 0);

            if ((fragmentsToLoad - ln) > 0) {
                fragmentsToLoad--;
                loadNextFragment.call(self, lastQuality).then(onFragmentRequest.bind(self));
            } else {

                if (state === VALIDATING) {
                    setState.call(self, READY);
                }

                finishValidation.call(self);
            }
        },

        validate = function () {
            var self = this,
                newQuality,
                qualityChanged = false,
                representation = null,
                now = new Date(),
                currentVideoTime = self.videoModel.getCurrentTime(),
                currentTime = getWorkingTime.call(self);

            self.debug.log("BufferController.validate() " + type + " | state: " + state);
            self.debug.log(type + " Playback rate: " + self.videoModel.getElement().playbackRate);
            self.debug.log(type + " Working time: " + currentTime);
            self.debug.log(type + " Video time: " + currentVideoTime);
            self.debug.log("Current " + type + " buffer length: " + bufferLevel);

            checkIfSufficientBuffer.call(self);
            //mseSetTimeIfPossible.call(self);

            if (state === LOADING && bufferLevel < STALL_THRESHOLD) {
                if (!stalled) {
                    self.debug.log("Stalling " + type + " Buffer: " + type);
                    clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.REBUFFERING_REASON);
                    stalled = true;
                    waitingForBuffer = true;
                    self.videoModel.stallStream(type, stalled);
                }
            } else if (state === READY) {
                setState.call(self, VALIDATING);
                var manifestMinBufferTime = self.manifestModel.getValue().minBufferTime;
                self.bufferExt.decideBufferLength(manifestMinBufferTime, duration, waitingForBuffer).then(
                    function (time) {
                        self.debug.log("Buffer time: " + time);
                        self.setMinBufferTime(time);
                        self.requestScheduler.adjustExecuteInterval();
                    }
                );
                self.abrController.getPlaybackQuality(type, data).then(
                    function (result) {
                        var quality = result.quality;
                        self.debug.log(type + " Playback quality: " + quality);
                        self.debug.log("Populate " + type + " buffers.");

                        if (quality !== undefined) {
                            newQuality = quality;
                        }

                        qualityChanged = (quality !== lastQuality);

                        if (qualityChanged === true) {
                            representation = getRepresentationForQuality(newQuality, self.getData());

                            if (representation === null || representation === undefined) {
                                throw "Unexpected error!";
                            }

                            // each representation can have its own @presentationTimeOffset, so we should set the offset
                            // if it has changed after switching the quality
                            self.manifestExt.getTimestampOffsetForPeriod(periodIndex, self.manifestModel.getValue(), quality, data).then(
                                function (offset) {
                                    if (buffer.timestampOffset !== offset) {
                                        buffer.timestampOffset = offset;
                                    }
                                }
                            );

                            clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.REPRESENTATION_SWITCH_STOP_REASON);
                            self.metricsModel.addRepresentationSwitch(type, now, currentVideoTime, representation.id);
                        }

                        self.debug.log(qualityChanged ? (type + " Quality changed to: " + quality) : "Quality didn't change.");
                        return getRequiredFragmentCount.call(self, quality);
                    }
                ).then(
                    function (count) {
                        fragmentsToLoad = count;
                        loadInitialization.call(self, qualityChanged, newQuality).then(
                            function (initializationRequests) {
                                if (initializationRequests !== null) {
                                    var ln = initializationRequests.length,
                                        request,
                                        i;

                                    for (i = 0; i < ln; i += 1) {
                                        request = initializationRequests[i];
                                        self.debug.log("Loading " + type + " initialization: " + request.url);
                                        self.debug.log(request);
                                        self.fragmentController.prepareFragmentForLoading(self, request, onBytesLoadingStart, onBytesLoaded, onBytesError, signalStreamComplete).then(
                                            function() {
                                                setState.call(self, READY);
                                            }
                                        );
                                    }
                                }
                            }
                        );
                        // We should request the media fragment w/o waiting for the next validate call
                        // or until the initialization fragment has been loaded
                        requestNewFragment.call(self);
                    }
                );
            } else if (state === VALIDATING) {
                setState.call(self, READY);
            }
        };

    return {
        videoModel: undefined,
        metricsModel: undefined,
        manifestExt: undefined,
        manifestModel: undefined,
        bufferExt: undefined,
        sourceBufferExt: undefined,
        abrController: undefined,
        fragmentExt: undefined,
        indexHandler: undefined,
        debug: undefined,
        system: undefined,
        errHandler: undefined,

        initialize: function (type, periodIndex, data, buffer, videoModel, scheduler, fragmentController, source) {
            var self = this,
                manifest = self.manifestModel.getValue(),
                isLive = self.manifestExt.getIsLive(manifest);

            self.setMediaSource(source);
            self.setVideoModel(videoModel);
            self.setType(type);
            self.setPeriodIndex(periodIndex);
            self.setData(data).then(
                function(){
                    ready = true;
                    startPlayback.call(self);
                }
            );
            self.setBuffer(buffer);
            self.setScheduler(scheduler);
            self.setFragmentController(fragmentController);

            self.indexHandler.setIsLive(isLive);

            self.manifestExt.getDurationForPeriod(periodIndex, self.manifestModel.getValue()).then(
                function (durationValue) {
                    duration = durationValue;
                    self.indexHandler.setDuration(durationValue);

                    self.bufferExt.decideBufferLength(manifest.minBufferTime, duration, waitingForBuffer).then(
                        function (time) {
                            self.setMinBufferTime(time);
                        }
                    );
                }
            );
        },

        getType: function () {
            return type;
        },

        setType: function (value) {
            type = value;

            if (this.indexHandler !== undefined) {
                this.indexHandler.setType(value);
            }
        },

        getPeriodIndex: function () {
            return periodIndex;
        },

        setPeriodIndex: function (value) {
            periodIndex = value;
        },

        getVideoModel: function () {
            return this.videoModel;
        },

        setVideoModel: function (value) {
            this.videoModel = value;
        },

        getScheduler: function () {
            return this.requestScheduler;
        },

        setScheduler: function (value) {
            this.requestScheduler = value;
        },

        getFragmentController: function () {
            return this.fragmentController;
        },

        setFragmentController: function (value) {
            this.fragmentController = value;
        },

        getAutoSwitchBitrate : function () {
            var self = this;
            return self.abrController.getAutoSwitchBitrate();
        },

        setAutoSwitchBitrate : function (value) {
            var self = this;
            self.abrController.setAutoSwitchBitrate(value);
        },

        getData: function () {
            return data;
        },

        setData: function (value) {
            var self = this,
                deferred = Q.defer(),
                from = data;

            if (!from) {
                from = value;
            }

            self.abrController.getPlaybackQuality(type, from).then(
                function (result) {
                    self.indexHandler.getCurrentTime(result.quality, from).then(
                        function (time) {
                            dataChanged = true;
                            playingTime = time;
                            data = value;
                            self.seek(time);
                            self.bufferExt.updateData(data, type);
                            deferred.resolve();
                        }
                    );
                }
            );

            return deferred.promise;
        },

        getBuffer: function () {
            return buffer;
        },

        setBuffer: function (value) {
            buffer = value;
        },

        getMinBufferTime: function () {
            return minBufferTime;
        },

        setMinBufferTime: function (value) {
            minBufferTime = value;
        },

        setMediaSource: function(value) {
            mediaSource = value;
        },

        isReady: function() {
            return state === READY;
        },

        isBufferingCompleted : function() {
            return isBufferingCompleted;
        },

        clearMetrics: function () {
            var self = this;

            if (type === null || type === "") {
                return;
            }

            self.metricsModel.clearCurrentMetricsForType(type);
        },

        updateBufferState: function() {
            var self = this,
                currentTime = self.videoModel.getCurrentTime();

            // if the buffer controller is stopped and the buffer is full we should try to clear the buffer
            // before that we should make sure that we will have enough space to append the data, so we wait
            // until the video time moves forward for a value greater than rejected data duration since the last reject event or since the last seek.
            if (isQuotaExceeded && rejectedBytes && (Math.abs(currentTime - (seeking ? seekTarget : rejectTime)) > fragmentDuration)) {
                //try to append the data that was previosly rejected
                rejectTime = self.videoModel.getCurrentTime();
                appendToBuffer.call(self, rejectedBytes);
            } else {
                updateBufferLevel.call(self);
            }
        },

        reset: function(errored) {
            var self = this;

            doStop.call(self);
            self.clearMetrics();
            self.fragmentController.abortRequestsForModel(fragmentModel);
            self.fragmentController.detachBufferController(fragmentModel);
            fragmentModel = null;
            deferredAppends = [];
            deferredInitAppend = null;
            initializationData = [];
            deferredStreamComplete = Q.defer();

            if (!errored) {
                self.sourceBufferExt.abort(mediaSource, buffer);
                self.sourceBufferExt.removeSourceBuffer(mediaSource, buffer);
            }
            data = null;
            buffer = null;
        },

        start: doStart,
        seek: doSeek,
        stop: doStop
    };
};

MediaPlayer.dependencies.BufferController.prototype = {
    constructor: MediaPlayer.dependencies.BufferController
};
