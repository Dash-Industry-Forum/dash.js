/*
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * author Digital Primates
 * copyright dash-if 2012
 */
MediaPlayer.dependencies.BufferController = function () {
    "use strict";
    var VALIDATE_DELAY = 1000,
        STALL_THRESHOLD = 0.5,
        WAITING = "WAITING",
        READY = "READY",
        READY_LIVE = "READY_LIVE",
        VALIDATING = "VALIDATING",
        VALIDATING_LIVE = "VALIDATING_LIVE",
        LOADING = "LOADING",
        state = WAITING,
        initialPlayback = true,
        seeking = false,
        seekTarget = -1,
        setOffset = false,
        qualityChanged = false,
        lastQuality = -1,
        timer = null,
        onTimer = null,
        stalled = false,
        liveOffset = -1,

        type,
        data,
        buffer,
        minBufferTime,

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
            var currentTime = new Date();

            if (timer !== null) {
                return;
            }

            if (seeking === false) {
                clearPlayListTraceMetrics(currentTime, MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
                playListMetrics = this.metricsModel.addPlayList(type, currentTime, 0, MediaPlayer.vo.metrics.PlayList.INITIAL_PLAY_START_REASON);
            }

            this.debug.log("BufferController start.");
            state = READY;
            timer = setInterval(onTimer.bind(this), VALIDATE_DELAY, this);
        },

        doLiveStart = function () {
            if (timer !== null) {
                return;
            }

            this.debug.log("BufferController live start.");
            state = READY_LIVE;
            timer = setInterval(onTimer.bind(this), VALIDATE_DELAY, this);
        },

        doSeek = function (time) {
            var currentTime = new Date();

            this.debug.log("BufferController seek.");
            seeking = true;
            seekTarget = time;

            if (liveOffset >= 0) {
                seekTarget -= liveOffset;
            }

            if (timer === null) {
                doLiveStart.call(this);
            }

            clearPlayListTraceMetrics(currentTime, MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
            playListMetrics = this.metricsModel.addPlayList(type, currentTime, seekTarget, MediaPlayer.vo.metrics.PlayList.SEEK_START_REASON);
        },

        doStop = function () {
            this.debug.log("BufferController stop.");
            state = WAITING;
            clearInterval(timer);
            timer = null;

            clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
        },

        getRepresentationForQuality = function (quality, data) {
            var representation = null;
            if (data && data.Representation_asArray && data.Representation_asArray.length > 0) {
                representation = data.Representation_asArray[quality];
            }
            return representation;
        },

        onBytesLoaded = function (response) {
            var self = this,
                promise = null;

            self.debug.log("Bytes finished loading.");

            promise = self.fragmentController.process(response.data);
            promise.then(
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

                        self.sourceBufferExt.append(buffer, data).then(
                            function (appended) {
                                if (appended === false) {
                                    return;
                                }

                                if (liveOffset >= 0 && setOffset === true) {
                                    setOffset = false;
                                    if (seekTarget === -1) {
                                        seekTarget = 0;
                                    }
                                    self.videoModel.setCurrentTime(seekTarget + liveOffset);
                                }
                            }
                        );
                    } else {
                        self.debug.log("No bytes to push.");
                    }

                    if (state === LOADING) {
                        if (stalled) {
                            stalled = false;
                            self.videoModel.stallStream(type, stalled);
                        }
                        state = READY;
                    }

                    data = null;
                }
            );

            promise = null;
        },

        onBytesError = function (error) {
            if (state === LOADING) {
                state = READY;
            }

            alert("Error loading fragment.");
            throw error;
        },

        signalStreamComplete = function () {
            doStop.call(this);
        },

        loadInitialization = function (qualityChanged, quality) {
            var initializationPromise = null;

            if (initialPlayback) {
                this.debug.log("Marking a special seek for initial playback.");
                seeking = true;
                if (seekTarget >= -1) {
                    seekTarget = this.videoModel.getCurrentTime();
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
            var promise;

            if (seeking) {
                this.debug.log("Loading the fragment for time: " + seekTarget);
                promise = this.indexHandler.getSegmentRequestForTime(seekTarget, quality, data);
                seeking = false;
                seekTarget = -1;
            } else {
                this.debug.log("Loading the next fragment.");
                promise = this.indexHandler.getNextSegmentRequest(quality, data);
            }

            return promise;
        },

        validate = function () {
            var self = this,
                newQuality,
                representation = null,
                currentTime = new Date(),
                segmentRequest,
                currentVideoTime = self.videoModel.getCurrentTime();

            self.debug.log("BufferController.validate() | state: " + state);

            self.sourceBufferExt.getBufferLength(buffer, self.videoModel.getCurrentTime()).then(
                function (length) {
                    self.debug.log("Current " + type + " buffer length: " + length);
                    if (state === LOADING && length < STALL_THRESHOLD) {
                        if (!stalled) {
                            self.debug.log("Stalling Buffer: " + type);
                            stalled = true;
                            self.videoModel.stallStream(type, stalled);
                            return Q.when(false);
                        }
                    } else if (state === READY_LIVE) {
                        state = VALIDATING_LIVE;

                        segmentRequest = null;

                        self.abrController.getPlaybackQuality(data).then(
                            function (quality) {
                                return self.indexHandler.getSegmentRequestForTime(0, quality, data);
                            }
                        ).then(
                            function (request) {
                                segmentRequest = request;
                                return self.fragmentLoader.load(request);
                            }
                        ).then(
                            function (request) {
                                return self.fragmentExt.parseTFDT(request.data);
                            }
                        ).then(
                            function (tfdt) {
                                liveOffset = tfdt.base_media_decode_time;
                                liveOffset = liveOffset / segmentRequest.timescale;

                                if (state === VALIDATING_LIVE) {
                                    state = READY;
                                    setOffset = true;
                                }
                            }
                        );
                    } else if (state === READY) {
                        state = VALIDATING;
                        self.metricsModel.addBufferLevel(type, new Date(), length);
                        self.bufferExt.shouldBufferMore(length).then(
                            function (shouldBuffer) {
                                self.debug.log("Deciding to buffer more: " + shouldBuffer);
                                if (shouldBuffer) {
                                    self.abrController.getPlaybackQuality(data).then(
                                        function (quality) {
                                            self.debug.log("Playback quality: " + quality);
                                            self.debug.log("Populate buffers.");

                                            newQuality = quality;
                                            qualityChanged = (quality !== lastQuality);

                                            if (qualityChanged === true) {
                                                    representation = getRepresentationForQuality(newQuality, self.getData());
                                                    clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.REPRESENTATION_SWITCH_STOP_REASON);
                                                    self.metricsModel.addRepresentationSwitch(type, currentTime, currentVideoTime, representation.id);
                                            }

                                            self.debug.log(qualityChanged ? ("Quality changed to: " + quality) : "Quality didn't change.");
                                            return loadInitialization.call(self, qualityChanged, quality);
                                        }
                                    ).then(
                                        function (request) {
                                            if (request !== null) {
                                                self.debug.log("Loading initialization: " + request.url);
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
                                                    state = LOADING;
                                                    self.fragmentLoader.load(request).then(onBytesLoaded.bind(self), onBytesError.bind(self));
                                                    break;
                                                default:
                                                    self.debug.log("Unknown request action.");
                                                }

                                                request = null;
                                            }

                                            lastQuality = newQuality;

                                            if (state === VALIDATING) {
                                                state = READY;
                                            }
                                        }
                                    );
                                } else {
                                    if (state === VALIDATING) {
                                        state = READY;
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
        manifest: undefined,
        bufferExt: undefined,
        sourceBufferExt: undefined,
        fragmentController: undefined,
        abrController: undefined,
        fragmentExt: undefined,
        fragmentLoader: undefined,
        indexHandler: undefined,
        debug: undefined,

        setup: function () {
            var self = this;

            self.manifestExt.getIsLive(self.manifest).then(
                function (isLive) {
                    self.indexHandler.setIsLive(isLive);
                }
            );

            self.manifestExt.getDuration(self.manifest).then(
                function (duration) {
                    self.indexHandler.setDuration(duration);
                }
            );

            self.indexHandler.setType(self.type);
        },

        getType: function () {
            return type;
        },
        setType: function (value) {
            var self = this;
            type = value;
            self.indexHandler.setType(value);
        },

        getQuality : function () {
            var self = this;
            return self.abrController.getPlaybackQuality();
        },

        setQuality : function (value) {
            var self = this;
            self.abrController.setPlaybackQuality(value);
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
            data = value;
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

        start: doStart,
        seek: doSeek,
        stop: doStop
    };
};

MediaPlayer.dependencies.BufferController.prototype = {
    constructor: MediaPlayer.dependencies.BufferController
};