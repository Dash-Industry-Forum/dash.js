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
        WAITING = "WAITING",
        READY = "READY",
        VALIDATING = "VALIDATING",
        LOADING = "LOADING",
        state = WAITING,
        ready = false,
        started = false,
        waitingForBuffer = false,
        initialPlayback = true,
        seeking = false,
        //mseSetTime = false,
        seekTarget = -1,
        qualityChanged = false,
        dataChanged = true,
        playingTime,
        lastQuality = -1,
        stalled = false,
        isLiveStream = false,
        liveInitialization = false,
        deferredAppend = null,
        periodIndex = -1,
        fragmentsToLoad = 0,

        type,
        data,
        buffer,
        minBufferTime,

        playListMetrics = null,
        playListTraceMetrics = null,
        playListTraceMetricsClosed = true,

        setState = function (value) {
            var self = this;
            self.debug.log("BufferController " + type + " setState to:" + value);
            state = value;
            // Notify the FragmentController about any state change to track the loading process of each active BufferController
            self.fragmentController.onBufferControllerStateChange();
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
                    self.fragmentController.attachBufferController(self);
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
            this.debug.log("BufferController " + type + " stop.");
            setState.call(this, WAITING);
            this.requestScheduler.stopScheduling(this);
            this.fragmentController.detachBufferController(this);

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

        onBytesLoadingStart = function() {
            setState.call(this, LOADING);
        },

        onBytesLoaded = function (request, response) {
            var self = this;

            self.debug.log(type + " Bytes finished loading: " + request.url);
            // We have gotten the fragment, now we are ready to get the next one
            requestNewFragment.call(self);

            self.fragmentController.process(response.data).then(
                function (data) {
                    if (data !== null) {
                        var representation = getRepresentationForQuality(lastQuality, self.getData()),
                            currentVideoTime = self.videoModel.getCurrentTime(),
                            currentTime = new Date();

                        self.debug.log("Push (" + type + ") bytes: " + data.byteLength);

                        if (playListTraceMetricsClosed === true && state !== WAITING && lastQuality !== -1) {
                            playListTraceMetricsClosed = false;
                            playListTraceMetrics = self.metricsModel.appendPlayListTrace(playListMetrics, representation.id, null, currentTime, currentVideoTime, null, 1.0, null);
                        }

                        Q.when(deferredAppend || true).then(
                            function() {
                                deferredAppend = self.sourceBufferExt.append(buffer, data, self.videoModel);
                                deferredAppend.then(function (/*appended*/) {
                                    self.debug.log("Append " + type + " complete: " + buffer.buffered.length);
                                    if (buffer.buffered.length > 0) {
                                        var ranges = buffer.buffered,
                                            i,
                                            len;

                                        self.debug.log("Number of buffered " + type + " ranges: " + ranges.length);
                                        for (i = 0, len = ranges.length; i < len; i += 1) {
                                            self.debug.log("Buffered " + type + " Range: " + ranges.start(i) + " - " + ranges.end(i));
                                        }
                                    }
                                });
                            }
                        );
                    } else {
                        self.debug.log("No " + type + " bytes to push.");
                    }
                }
            );
        },

        onBytesError = function (request) {
            var self = this;

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

            //alert("Error loading fragment.");
            this.errHandler.downloadError("Error loading " + type + " fragment: " + request.url);
        },

        signalStreamComplete = function () {
            this.debug.log(type + " Stream is complete.");
            clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.END_OF_CONTENT_STOP_REASON);
            doStop.call(this);
        },

        loadInitialization = function (qualityChanged, quality) {
            var initializationPromise = null;

            if (initialPlayback) {
                this.debug.log("Marking a special seek for initial " + type + " playback.");

                // If we weren't already seeking, 'seek' to the beginning of the stream.
                if (!seeking) {
                    seeking = true;
                    seekTarget = 0;
                }

                initialPlayback = false;
            }

            if (qualityChanged) {
                initializationPromise = this.indexHandler.getInitRequest(quality, data);
            } else {
                initializationPromise = Q.when(null);
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
                seeking = false;

                self.sourceBufferExt.getBufferRange(buffer, segmentTime).then(
                    function (range) {
                        if (range !== null) {
                            segmentTime = range.end;
                        }
                        self.debug.log("Loading the " + type + " fragment for time: " + segmentTime);
                        self.indexHandler.getSegmentRequestForTime(segmentTime, quality, data).then(
                            function (request) {
                                deferred.resolve(request);
                            }
                        );
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
                if (self.fragmentController.isFragmentLoaded(self, request)) {
                    self.indexHandler.getNextSegmentRequest(lastQuality, data).then(onFragmentRequest.bind(self));
                } else {
                    self.debug.log("Loading an " + type + " fragment: " + request.url);
                    self.fragmentController.prepareFragmentForLoading(self, request, onBytesLoadingStart, onBytesLoaded, onBytesError, signalStreamComplete).then(
                        function() {
                            setState.call(self, READY);
                        }
                    );
                }
            } else {
                setState.call(self, READY);
            }
        },

        checkIfSufficientBuffer = function (length) {
            if (waitingForBuffer) {
                if (length < minBufferTime) {
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
                this.debug.log("Working time is video time: " + time);
            }

            return time;
        },

        getRequiredFragmentCount = function(quality, currentBufferLength) {
            var self =this,
                playbackRate = self.videoModel.getPlaybackRate(),
                deferred = Q.defer();
                self.bufferExt.getRequiredBufferLength(currentBufferLength, waitingForBuffer, self.requestScheduler.getExecuteInterval(self)/1000, playbackRate).then(
                    function (requiredBufferLength) {
                        self.indexHandler.getSegmentCountForDuration(quality, data, requiredBufferLength).then(
                            function(count) {
                                deferred.resolve(count);
                            }
                        );
                    }
                );

            return deferred.promise;
        },

        requestNewFragment = function() {
            var self = this;
            if (fragmentsToLoad > 0) {
                fragmentsToLoad--;
                loadNextFragment.call(self, lastQuality).then(onFragmentRequest.bind(self));
            } else {
                seeking = false;

                if (state === VALIDATING) {
                    setState.call(self, READY);
                }

                finishValidation.call(self);
            }
        },

        validate = function () {
            var self = this,
                newQuality,
                representation = null,
                now = new Date(),
                currentVideoTime = self.videoModel.getCurrentTime(),
                currentTime = getWorkingTime.call(self);

            self.debug.log("BufferController.validate() " + type + " | state: " + state);
            self.debug.log(type + " Playback rate: " + self.videoModel.getElement().playbackRate);
            self.debug.log(type + " Working time: " + currentTime);
            self.debug.log(type + " Video time: " + currentVideoTime);


            self.sourceBufferExt.getBufferLength(buffer, currentTime).then(
                function (length) {
                    self.debug.log("Current " + type + " buffer length: " + length);
                    self.metricsModel.addBufferLevel(type, new Date(), length);

                    checkIfSufficientBuffer.call(self, length);
                    //mseSetTimeIfPossible.call(self);

                    if (state === LOADING && length < STALL_THRESHOLD) {
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
                        self.bufferExt.decideBufferLength(manifestMinBufferTime, waitingForBuffer).then(
                            function (time) {
                                self.debug.log("Buffer time: " + time);
                                self.setMinBufferTime(time);
                                self.requestScheduler.adjustExecuteInterval();
                            }
                        );
                        self.abrController.getPlaybackQuality(type, data).then(
                            function (quality) {
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

                                    clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.REPRESENTATION_SWITCH_STOP_REASON);
                                    self.metricsModel.addRepresentationSwitch(type, now, currentVideoTime, representation.id);
                                }

                                self.debug.log(qualityChanged ? (type + " Quality changed to: " + quality) : "Quality didn't change.");
                                return getRequiredFragmentCount.call(self, quality, length);
                            }
                        ).then(
                            function (count) {
                                fragmentsToLoad = count;
                                loadInitialization.call(self, qualityChanged, newQuality).then(
                                    function (request) {
                                        if (request !== null) {
                                            self.debug.log("Loading " + type + " initialization: " + request.url);
                                            self.debug.log(request);
                                            self.fragmentController.prepareFragmentForLoading(self, request, onBytesLoadingStart, onBytesLoaded, onBytesError, signalStreamComplete).then(
                                                function() {
                                                    setState.call(self, READY);
                                                }
                                            );
                                            lastQuality = newQuality;
                                        } else {
                                            requestNewFragment.call(self);
                                        }
                                    }
                                );
                            }
                        );
                    }
                }
            );
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

        initialize: function (type, periodIndex, data, buffer, videoModel, scheduler, fragmentController) {
            var self = this,
                manifest = self.manifestModel.getValue(),
                isLive = self.manifestExt.getIsLive(manifest);

            self.setVideoModel(videoModel);
            self.setType(type);
            self.setPeriodIndex(periodIndex);
            self.setData(data);
            self.setBuffer(buffer);
            self.setScheduler(scheduler);
            self.setFragmentController(fragmentController);

            self.indexHandler.setIsLive(isLive);

            self.manifestExt.getTimestampOffsetForPeriod(periodIndex, self.manifestModel.getValue()).then(
                function (offset) {
                    self.getBuffer().timestampOffset = offset;
                }
            );

            self.bufferExt.decideBufferLength(manifest.minBufferTime, waitingForBuffer).then(
                function (time) {
                    self.setMinBufferTime(time);
                }
            );

            self.manifestExt.getDurationForPeriod(periodIndex, self.manifestModel.getValue()).then(
                function (duration) {
                    self.indexHandler.setDuration(duration);
                }
            );

            ready = true;
            startPlayback.call(this);
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
            var self = this;

            if (data !== null && data !== undefined) {
                self.abrController.getPlaybackQuality(type, data).then(
                    function (quality) {
                        self.indexHandler.getCurrentTime(quality, data).then(
                            function (time) {
                                dataChanged = true;
                                playingTime = time;
                                data = value;
                            }
                        );
                    }
                );
            } else {
                data = value;
            }
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

        isReady: function() {
            return state === READY;
        },

        clearMetrics: function () {
            var self = this;

            if (type === null || type === "") {
                return;
            }

            self.metricsModel.clearCurrentMetricsForType(type);
        },

        start: doStart,
        seek: doSeek,
        stop: doStop
    };
};

MediaPlayer.dependencies.BufferController.prototype = {
    constructor: MediaPlayer.dependencies.BufferController
};
