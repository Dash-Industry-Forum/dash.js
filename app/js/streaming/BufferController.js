/*
 *
 * The copyright in this software is being made available under the BSD
 * License, included below. This software may be subject to other third party
 * and contributor rights, including patent rights, and no such rights are
 * granted under this license.
 * 
 * Copyright (c) 2013, Dash Industry Forum
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 * •  Neither the name of the Dash Industry Forum nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS”
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.dependencies.BufferController = function () {
    "use strict";
    var VALIDATE_DELAY = 1000,
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
        mseSetTime = false,
        seekTarget = -1,
        qualityChanged = false,
        dataChanged = true,
        playingTime,
        lastQuality = -1,
        timer = null,
        onTimer = null,
        stalled = false,
        liveOffset = -1,
        liveStartTime = null,
        isLiveStream = false,
        liveInitialization = false,

        type,
        data,
        buffer,
        minBufferTime,

        playListMetrics = null,
        playListTraceMetrics = null,
        playListTraceMetricsClosed = true,

        setState = function (value) {
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

        setCurrentTimeOnVideo = function (time) {
            var ct = this.videoModel.getCurrentTime();
            if (ct === time) {
                return;
            }

            this.debug.log("Set current time on video.");
            this.system.notify("setCurrentTime");
            this.videoModel.setCurrentTime(time);
        },

        startPlayback = function () {
            if (!ready || !started) {
                return;
            }

            var self = this;

            initializeLive.call(this).then(
                function (isLive) {
                    isLiveStream = isLive;
                    self.debug.log("BufferController begin validation.");
                    setState(READY);
                    timer = setInterval(onTimer.bind(self), VALIDATE_DELAY, self);
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
            }

            this.debug.log("BufferController start.");

            started = true;
            waitingForBuffer = true;
            mseSetTime = true;
            startPlayback.call(this);
        },

        doSeek = function (time) {
            var currentTime;

            this.debug.log("BufferController seek: " + time);
            seeking = true;
            seekTarget = time;

            if (liveOffset !== -1) {
                seekTarget -= liveOffset;
            }

            currentTime = new Date();
            clearPlayListTraceMetrics(currentTime, MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
            playListMetrics = this.metricsModel.addPlayList(type, currentTime, seekTarget, MediaPlayer.vo.metrics.PlayList.SEEK_START_REASON);

            doStart.call(this);
        },

        doStop = function () {
            this.debug.log("BufferController stop.");
            setState(WAITING);
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
            if (state === LOADING) {
                if (stalled && !waitingForBuffer) {
                    stalled = false;
                    this.videoModel.stallStream(type, stalled);
                }
                setState(READY);
            }
        },

        onBytesLoaded = function (response) {
            var self = this,
                time = 0;

            self.debug.log("Bytes finished loading.");

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

                        self.sourceBufferExt.append(buffer, data, self.videoModel).then(
                            function (appended) {
                                self.debug.log("Append complete: " + buffer.buffered.length);
                                if (buffer.buffered.length > 0) {
                                    var ranges = buffer.buffered,
                                        i,
                                        len;

                                    self.debug.log("Buffer type: " + type);
                                    self.debug.log("Number of buffered ranges: " + ranges.length);
                                    for (i = 0, len = ranges.length; i < len; i += 1) {
                                        self.debug.log("Buffered Range: " + ranges.start(i) + " - " + ranges.end(i));
                                    }
                                }
                                finishValidation.call(self);
                            }
                        );
                    } else {
                        self.debug.log("No bytes to push.");
                        finishValidation.call(self);
                    }
                }
            );
        },

        onBytesError = function (error) {
            if (state === LOADING) {
                setState(READY);
            }

            //alert("Error loading fragment.");
            this.errHandler.downloadError("Error loading fragment.");
        },

        signalStreamComplete = function () {
            doStop.call(this);
        },

        loadInitialization = function (qualityChanged, quality) {
            var initializationPromise = null;

            if (initialPlayback) {
                this.debug.log("Marking a special seek for initial playback.");

                // If we weren't already seeking, 'seek' to the beginning of the stream.
                if (!seeking) {
                    seeking = true;
                    seekTarget = 0;
                }

                initialPlayback = false;
            }

            if (qualityChanged || seeking) {
                initializationPromise = this.indexHandler.getInitRequest(quality, data);
            } else {
                initializationPromise = Q.when(null);
            }
            return initializationPromise;
        },

        loadNextFragment = function (quality) {
            var promise,
                self = this,
                time = 0;

            if (dataChanged && !seeking) {
                //time = self.videoModel.getCurrentTime();
                self.debug.log("Data changed - loading the fragment for time: " + playingTime);
                promise = self.indexHandler.getSegmentRequestForTime(playingTime, quality, data);
            } else if (seeking) {
                this.debug.log("Loading the fragment for time: " + seekTarget);
                promise = this.indexHandler.getSegmentRequestForTime(seekTarget, quality, data);
                seeking = false;
                //seekTarget = -1;
            } else {
                this.debug.log("Loading the next fragment.");
                promise = this.indexHandler.getNextSegmentRequest(quality, data);
            }

            dataChanged = false;

            return promise;
        },

        checkIfSufficientBuffer = function (length) {
            if (waitingForBuffer) {
                if (length < minBufferTime) {
                    if (!stalled) {
                        this.debug.log("Waiting for more buffer before starting playback.");
                        stalled = true;
                        this.videoModel.stallStream(type, stalled);
                    }
                } else {
                    this.debug.log("Got enough buffer to start.");
                    waitingForBuffer = false;
                    stalled = false;
                    this.videoModel.stallStream(type, stalled);
                }
            }
        },

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
            this.debug.log("Set time to: " + time);
            setCurrentTimeOnVideo.call(this, time);

            liveInitialization = false;
            mseSetTime = false;
            seekTarget = -1;
        },

        getWorkingTime = function () {
            var time = -1;

            if (seeking) {
                time = seekTarget;
                this.debug.log("Working time is seek time: " + time);
            }
            else if (waitingForBuffer) {
                time = mseGetDesiredTime();
                this.debug.log("Working time is mse time: " + time);
            }
            else {
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
                segmentRequest,
                currentVideoTime = self.videoModel.getCurrentTime(),
                currentTime = getWorkingTime.call(self);

            self.debug.log("BufferController.validate() | state: " + state);
            self.debug.log("Playback rate: " + self.videoModel.getElement().playbackRate);
            self.debug.log("Working time: " + currentTime);
            self.debug.log("Video time: " + currentVideoTime);

            self.sourceBufferExt.getBufferLength(buffer, currentTime).then(
                function (length) {
                    self.debug.log("Current " + type + " buffer length: " + length);

                    checkIfSufficientBuffer.call(self, length);
                    mseSetTimeIfPossible.call(self);

                    if (state === LOADING && length < STALL_THRESHOLD) {
                        if (!stalled) {
                            self.debug.log("Stalling Buffer: " + type);
                            clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.REBUFFERING_REASON);
                            stalled = true;
                            waitingForBuffer = true;
                            self.videoModel.stallStream(type, stalled);
                        }
                    } else if (state === READY) {
                        setState(VALIDATING);
                        self.metricsModel.addBufferLevel(type, new Date(), length);
                        self.bufferExt.shouldBufferMore(length).then(
                            function (shouldBuffer) {
                                //self.debug.log("Deciding to buffer more: " + shouldBuffer);
                                if (shouldBuffer) {
                                    self.abrController.getPlaybackQuality(type, data).then(
                                        function (quality) {
                                            self.debug.log("Playback quality: " + quality);
                                            self.debug.log("Populate buffers.");

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

                                            self.debug.log(qualityChanged ? ("Quality changed to: " + quality) : "Quality didn't change.");
                                            return loadInitialization.call(self, qualityChanged, quality);
                                        }
                                    ).then(
                                        function (request) {
                                            if (request !== null) {
                                                self.debug.log("Loading initialization.");
                                                self.debug.log(request);
                                                self.fragmentLoader.load(request).then(onBytesLoaded.bind(self), onBytesError.bind(self));
                                            }
                                            return loadNextFragment.call(self, newQuality);
                                        }
                                    ).then(
                                        function (request) {
                                            if (request !== null) {
                                                switch (request.action) {
                                                    case "complete":
                                                        self.debug.log("Stream is complete.");
                                                        clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.END_OF_CONTENT_STOP_REASON);
                                                        signalStreamComplete.call(self);
                                                        break;
                                                    case "download":
                                                        self.debug.log("Loading a segment: " + request.url);
                                                        setState(LOADING);
                                                        self.fragmentLoader.load(request).then(onBytesLoaded.bind(self), onBytesError.bind(self));
                                                        break;
                                                    default:
                                                        self.debug.log("Unknown request action.");
                                                }

                                                request = null;
                                            }

                                            lastQuality = newQuality;

                                            if (state === VALIDATING) {
                                                setState(READY);
                                            }
                                        }
                                    );
                                } else {
                                    if (state === VALIDATING) {
                                        setState(READY);
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

        setup: function () {
            var self = this,
                isLive = self.videoModel.getIsLive();

            self.indexHandler.setIsLive(isLive);

            self.manifestExt.getDuration(self.manifestModel.getValue(), isLive).then(
                function (duration) {
                    self.indexHandler.setDuration(duration);
                }
            );

            self.indexHandler.setType(type);

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
                        )
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

        clearMetrics: function (value) {
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