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
        VALIDATING = "VALIDATING",
        LOADING = "LOADING",
        state = WAITING,
        ready = false,
        started = false,
        initialPlayback = true,
        seeking = false,
        setSeek = false,
        seekTarget = -1,
        qualityChanged = false,
        dataChanged = true,
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

        applyLiveSeekOffset = function () {
            if (seekTarget === -1) {
                return;
            }

            var currentTime,
                isLive = this.videoModel.getIsLive(),
                manifest = this.manifestModel.getValue(),
                live,
                offset;

            if (isLive) {
                if (liveStartTime !== null && liveStartTime !== undefined && manifest !== null && manifest !== undefined) {
                    live = manifest.availabilityStartTime;
                    offset = (live.getTime() - liveStartTime.getTime()) / 1000;
                    seekTarget -= offset;
                    liveInitialization = true;
                }
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

        initializeLive = function () {
            var self = this,
                deferred = Q.defer(),
                isLive = self.videoModel.getIsLive(),
                quality = 0,
                startTime = 0,
                now;

            if (isLive) {
                self.debug.log("Gathering information for live.");
                liveStartTime = self.manifestModel.getValue().availabilityStartTime;

                if (liveStartTime !== null && liveStartTime !== undefined) {
                    now = new Date();
                    startTime = Math.floor(((now.getTime() - liveStartTime.getTime()) / 1000));
                }

                applyLiveSeekOffset.call(self);
            }

            deferred.resolve(isLive); // TODO : REMOVE

            /*
            if (isLive) {
                self.debug.log("Gathering information for live.");
                liveStartTime = self.manifestModel.getValue().availabilityStartTime;

                if (liveStartTime !== null && liveStartTime !== undefined) {
                    now = new Date();
                    startTime = Math.floor(((now.getTime() - liveStartTime.getTime()) / 1000));
                }
                */
                /*
                self.indexHandler.getInitRequest(quality, data).then(
                    function (request) {
                        self.debug.log("Got live init.");
                        self.fragmentLoader.load(request).then(
                            function (response) {
                                self.debug.log("Live request loaded, parsing...");
                                self.fragmentExt.parseSIDX(response.data).then(
                                    function (sidx) {
                                        self.indexHandler.getSegmentRequestForTime(startTime, quality, data).then(
                                            function (request2) {
                                                self.debug.log("Got live request.");
                                                self.fragmentLoader.load(request2).then(
                                                    function (response2) {
                                                        self.debug.log("Live request loaded, parsing...");
                                                        self.fragmentExt.parseTFDT(response2.data).then(
                                                            function (tfdt) {
                                                                liveOffset = tfdt.base_media_decode_time / sidx.timescale;
                                                                buffer.timestampOffset = -liveOffset;
                                                                self.debug.log("Got live offset: " + liveOffset);
                                                                applyLiveSeekOffset.call(self);
                                                                deferred.resolve(isLive);
                                                            }
                                                        );
                                                    }
                                                );
                                            }
                                        );
                                    }
                                );
                            }
                        );
                    }
                );
                */
                /*
                self.indexHandler.getSegmentRequestForTime(startTime, quality, data).then(
                    function (request) {
                        self.debug.log("Got live request.");
                        self.fragmentLoader.load(request).then(
                            function (response) {
                                self.debug.log("Live request loaded, parsing...");
                                self.fragmentExt.parseSIDX(response.data).then(
                                    function (sidx) {
                                        liveOffset = sidx.earliestPresentationTime / sidx.timescale;
                                        //liveOffset = tfdt.base_media_decode_time / 30000;
                                        buffer.timestampOffset = -liveOffset;
                                        self.debug.log("Got live offset: " + liveOffset);
                                        applyLiveSeekOffset.call(self);
                                        deferred.resolve(isLive);
                                    }
                                );
                            }
                        );
                    }
                );

            } else {
                deferred.resolve(isLive);
            }
            */

            return deferred.promise;
        },

        setCurrentTimeForLiveStream = function (time) {
            var self = this;
            if (isLiveStream && liveInitialization) {
                self.videoModel.setCurrentTime(time);
                self.system.notify("setCurrentTime");
                liveInitialization = false;
            }
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
                    state = READY;
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
            startPlayback.call(this);
        },

        doSeek = function (time) {
            var currentTime;

            this.debug.log("BufferController seek.");
            seeking = true;
            seekTarget = time;

            if (liveOffset !== -1) {
                seekTarget -= liveOffset;
            }

            applyLiveSeekOffset.call(this);

            setSeek = true;

            currentTime = new Date();
            clearPlayListTraceMetrics(currentTime, MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
            playListMetrics = this.metricsModel.addPlayList(type, currentTime, seekTarget, MediaPlayer.vo.metrics.PlayList.SEEK_START_REASON);

            doStart.call(this);
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

        finishValidation = function () {
            if (state === LOADING) {
                if (stalled) {
                    stalled = false;
                    this.videoModel.stallStream(type, stalled);
                }
                state = READY;
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
                                    //---

                                    var ranges = buffer.buffered,
                                        i,
                                        len;

                                    self.debug.log("Number of buffered ranges: " + ranges.length);
                                    for (i = 0, len = ranges.length; i < len; i += 1) {
                                        self.debug.log("Buffered Range: " + ranges.start(i) + " - " + ranges.end(i));
                                    }

                                    self.debug.log("Finished append, set seek? " + setSeek);

                                    //---

                                    if (setSeek) {
                                        if (seekTarget !== -1) {
                                            time = seekTarget;
                                        }

                                        self.debug.log("Seeking to time: " + time);

                                        // If the stream is a live stream and the first time bytes have been appended,
                                        // we need to update the current time of the video model...
                                        setCurrentTimeForLiveStream.call(self, time);
                                        //setCurrentTimeForLiveStream.call(self, time + liveOffset);

                                        setSeek = false;
                                        seekTarget = -1;
                                    }

                                    self.debug.log("Current time after append: " + self.videoModel.getCurrentTime());
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
                state = READY;
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
            var promise;

            if (dataChanged && !seeking) {
                seekTarget = this.videoModel.getCurrentTime();
                applyLiveSeekOffset.call(this);

                this.debug.log("Data changed - loading the fragment for time: " + seekTarget);
                promise = this.indexHandler.getSegmentRequestForTime(seekTarget, quality, data);
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

        validate = function () {
            var self = this,
                newQuality,
                representation = null,
                now = new Date(),
                segmentRequest,
                currentVideoTime = self.videoModel.getCurrentTime(),
                currentTime;

            if (!seeking) {
                currentTime = currentVideoTime;
            } else {
                currentTime = seekTarget;
            }

            //self.debug.log("BufferController.validate() | state: " + state);

            self.sourceBufferExt.getBufferLength(buffer, currentTime).then(
                function (length) {
                    self.debug.log("Current " + type + " buffer length: " + length);
                    self.debug.log("Video time: " + currentVideoTime);
                    if (state === LOADING && length < STALL_THRESHOLD) {
                        if (!stalled) {
                            self.debug.log("Stalling Buffer: " + type);
                            clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.REBUFFERING_REASON);
                            stalled = true;
                            self.videoModel.stallStream(type, stalled);
                            return Q.when(false);
                        }
                    } else if (state === READY) {
                        state = VALIDATING;
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
            data = value;
            dataChanged = true;
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