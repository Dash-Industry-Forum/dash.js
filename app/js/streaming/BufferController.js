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
    var validateInterval = 1000,
        STALL_THRESHOLD = 0.5,
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
        timer = null,
        onTimer = null,
        stalled = false,
        liveOffset = 0,
        isLiveStream = false,
        liveInitialization = false,
        deferredAppend = null,
        fragmentRequests = [],
        periodIndex = -1,
        timestampOffset = 0,

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
            var isLive = this.videoModel.getIsLive();

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
                    self.debug.log("BufferController begin " + type + " validation with interval: " + validateInterval);
                    setState.call(self, READY);
                    clearInterval(timer);
                    timer = setInterval(onTimer.bind(self), validateInterval, self);
                }
            );
        },

        doStart = function () {
            var currentTime;

            if (timer !== null) {
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
            seekTarget = time - liveOffset - timestampOffset;
            currentTime = new Date();
            clearPlayListTraceMetrics(currentTime, MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
            playListMetrics = this.metricsModel.addPlayList(type, currentTime, seekTarget, MediaPlayer.vo.metrics.PlayList.SEEK_START_REASON);

            doStart.call(this);
        },

        doStop = function () {
            this.debug.log("BufferController " + type + " stop.");
            setState.call(this, WAITING);
            clearInterval(timer);
            timer = null;

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
                if (stalled && !waitingForBuffer) {
                    stalled = false;
                    this.videoModel.stallStream(type, stalled);
                }
                setState.call(self, READY);
            }
        },

        onBytesLoaded = function (request, response) {
            var self = this;

            self.debug.log(type + " Bytes finished loading: " + request.url);

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
                                    finishValidation.call(self);
                                });
                            }
                        );
                    } else {
                        self.debug.log("No " + type + " bytes to push.");
                        finishValidation.call(self);
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
                promise = self.indexHandler.getSegmentRequestForTime(playingTime - timestampOffset - liveOffset, quality, data);
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
                        self.indexHandler.getSegmentRequestForTime(segmentTime - timestampOffset - liveOffset, quality, data).then(
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
                switch (request.action) {
                    case "complete":
                        self.debug.log(type + " Stream is complete.");
                        clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.END_OF_CONTENT_STOP_REASON);
                        signalStreamComplete.call(self);
                        break;
                    case "download":
                        for (var i = fragmentRequests.length - 1; i >= 0 ; --i) {
                            if (fragmentRequests[i].startTime === request.startTime) {
                                self.debug.log(type + " Fragment already loaded for time: " + request.startTime);
                                if (fragmentRequests[i].url === request.url) {
                                    self.debug.log(type + " Fragment url already loaded: " + request.url);
                                    self.indexHandler.getNextSegmentRequest(lastQuality, data).then(onFragmentRequest.bind(self));
                                    return;
                                } else {
                                    // remove overlapping segement of a different quality
                                    fragmentRequests.splice(i, 1);
                                }
                                break;
                            }
                        }
                        fragmentRequests.push(request);
                        self.debug.log("Loading an " + type + " fragment: " + request.url);
                        setState.call(self, LOADING);
                        self.fragmentLoader.load(request).then(onBytesLoaded.bind(self, request), onBytesError.bind(self, request));
                        break;
                    default:
                        self.debug.log("Unknown request action.");
                }

                request = null;
            }

            if (state === VALIDATING) {
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
                        self.bufferExt.shouldBufferMore(length, validateInterval / 1000.0).then(
                            function (shouldBuffer) {
                                //self.debug.log("Buffer more " + type + ": " + shouldBuffer);
                                if (shouldBuffer) {
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
                                            return loadInitialization.call(self, qualityChanged, quality);
                                        }
                                    ).then(
                                        function (request) {
                                            if (request !== null) {
                                                self.debug.log("Loading " + type + " initialization: " + request.url);
                                                self.debug.log(request);
                                                setState.call(self, LOADING);
                                                self.fragmentLoader.load(request).then(onBytesLoaded.bind(self, request), onBytesError.bind(self, request));
                                                lastQuality = newQuality;
                                            } else {
                                                loadNextFragment.call(self, newQuality).then(onFragmentRequest.bind(self));
                                            }
                                        }
                                    );
                                } else {
                                    seeking = false;

                                    if (state === VALIDATING) {
                                        setState.call(self, READY);
                                    }
                                }
                            }
                        );
                    }
                }
            );
        };

    onTimer = function () {
        validate.call(this);
    };

    return {
        videoModel: undefined,
        metricsModel: undefined,
        manifestExt: undefined,
        manifestModel: undefined,
        bufferExt: undefined,
        sourceBufferExt: undefined,
        fragmentController: undefined,
        abrController: undefined,
        fragmentExt: undefined,
        fragmentLoader: undefined,
        indexHandler: undefined,
        debug: undefined,
        system: undefined,
        errHandler: undefined,

        initialize: function (type, periodIndex, data, buffer, minBufferTime, videoModel) {
            var self = this,
                isLive;

            self.setVideoModel(videoModel);
            self.setType(type);
            self.setPeriodIndex(periodIndex);
            self.setData(data);
            self.setBuffer(buffer);
            self.setMinBufferTime(minBufferTime);

            isLive = self.videoModel.getIsLive();
            self.indexHandler.setIsLive(isLive);

            self.manifestExt.getTimestampOffsetForPeriod(periodIndex, self.manifestModel.getValue(), isLive).then(
                function (offset) {
                    self.getBuffer().timestampOffset = offset;
                    timestampOffset = offset;
                }
            );

            self.manifestExt.getStartOffsetForPeriod(self.manifestModel.getValue(), periodIndex).then(
                function (liveStartValue) {
                    liveOffset = liveStartValue;
                    self.manifestExt.getDurationForPeriod(periodIndex, self.manifestModel.getValue(), isLive).then(
                        function (duration) {
                            self.indexHandler.setDuration(duration + liveOffset);
                        }
                    );
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

        getTimestampOffset: function() {
            return timestampOffset;
        },

        setTimestampOffset: function(value) {
            this.getBuffer().timestampOffset = timestampOffset;
            timestampOffset = value;
        },

        getLiveOffset: function() {
            return liveOffset;
        },

        setLiveStart: function(value) {
            liveOffset = value;
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
            var self = this;
            minBufferTime = value;
            validateInterval = (minBufferTime * 1000.0) / 4;
            validateInterval = Math.max(validateInterval, 1000);
            if (timer !== null) {
                self.debug.log("Changing " + type + " validate interval: " + validateInterval);
                clearInterval(timer);
                timer = setInterval(onTimer.bind(this), validateInterval, this);
            }
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