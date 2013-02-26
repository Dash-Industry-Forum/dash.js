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
 * copyright Digital Primates 2012
 */
MediaPlayer.dependencies.BufferController = function () {
    "use strict";
    
    var VALIDATE_DELAY = 1000,
        WAITING = "WAITING",
        READY = "READY",
        SEEKING = "SEEKING",
        VALIDATING = "VALIDATING",
        LOADING = "LOADING",
        state = WAITING,
        initialPlayback = true,
        seeking = false,
        seekTarget = -1,
        qualityChanged = false,
        lastQuality = -1,
        timer = null,
        
        type,
        data,
        buffer,
        minBufferTime,
        
        doStart = function () {
            if (timer !== null) {
                return;
            }
            
            this.debug.log("BufferController start.");
            state = READY;
            timer = setInterval(onTimer.bind(this), VALIDATE_DELAY, this);
        },
        
        doSeek = function (time) {
            this.debug.log("BufferController seek.");
            seeking = true;
            seekTarget = time;
            
            if (timer === null) {
                doStart();
            }
        },
        
        doStop = function () {
            this.debug.log("BufferController stop.");
            state = WAITING;
            clearInterval(timer);
            timer = null;
        },
        
        onBytesLoaded = function (response) {
            var self = this;
            
            self.debug.log("Bytes finished loading.");
            
            self.fragmentController.process(response.data).then(
                function (data) {
                    if (data !== null) {
                        self.debug.log("Push (" + type + ") bytes: " + data.byteLength);
                        self.debug.log(buffer);
                        self.sourceBufferExt.append(buffer, data);
                    } else {
                        self.debug.log("No bytes to push.");
                    }
                    
                    if (state === LOADING) {
                        state = READY;
                    }
                }
            );
        },
        
        onBytesError = function (error) {
            if (state === LOADING) {
                state = READY;
            }
            
            alert("Error loading fragment.");
            throw(error);
        },
        
        signalStreamComplete = function () {
            doStop.call(this);
        },
        
        loadInitialization = function (qualityChanged, quality) {
            if (initialPlayback) {
                this.debug.log("Marking a special seek for initial playback.");
                seeking = true;
                seekTarget = this.videoModel.getCurrentTime();
                initialPlayback = false;
            }
            
            if (qualityChanged || seeking) {
                return this.indexHandler.getInitRequest(quality, data);
            } else {
                return Q.when(null);
            }
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
            this.debug.log("BufferController.validate() | state: " + state);
            if (state === READY) {
                state = VALIDATING;

                var bufferLength,
                    metrics, // TODO - Get metrics first.
                    newQuality,
                    self = this;
                
                self.sourceBufferExt.getBufferLength(buffer, self.videoModel.getCurrentTime()).then(
                    function (length) {
                        self.debug.log("Current buffer length: " + length);
                        bufferLength = length;
                        return self.bufferExt.shouldBufferMore(length, minBufferTime, metrics);
                    }
                ).then(
                    function (shouldBuffer) {
                        self.debug.log("Deciding to buffer more: " + shouldBuffer);
                        if (shouldBuffer) {
                            self.abrController.getPlaybackQuality(metrics, data).then(
                                function (quality) {
                                    self.debug.log("Playback quality: " + quality);
                                    self.debug.log("Populate buffers.");
                                    
                                    newQuality = quality;
                                    qualityChanged = (quality !== lastQuality);
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
                                            case "stall":
                                                self.debug.log("Stream is stalling.");
                                                break;
                        
                                            case "complete":
                                                self.debug.log("Stream is complete.");
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
        },
        
        onTimer = function () {
            validate.call(this);
        };

    return {
        videoModel: undefined,
        manifestExt: undefined,
        manifest: undefined,
        bufferExt: undefined,
        sourceBufferExt: undefined,
        fragmentController: undefined,
        abrController: undefined,
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
        },

        getType: function () {
            return type;
        },
        setType: function (value) {
            type = value;
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