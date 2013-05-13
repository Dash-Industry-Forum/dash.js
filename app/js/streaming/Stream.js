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
MediaPlayer.dependencies.Stream = function () {
    "use strict";

    var manifest,
        mediaSource,
        videoController = null,
        videoTrackIndex = -1,
        audioController = null,
        audioTrackIndex = -1,
        autoPlay = true,
        initialized = false,
        ready = false,
        loaded = false,
        urlSource,
        errored = false,
        DEFAULT_KEY_TYPE = "webkit-org.w3.clearkey",

        playListener,
        pauseListener,
        seekingListener,
        seekedListener,
        timeupdateListener,

        play = function () {
            this.debug.log("Attempting play...");

            if (!initialized) {
                return;
            }

            this.debug.log("Do play.");
            this.videoModel.play();
        },

        pause = function () {
            this.debug.log("Do pause.");
            this.videoModel.pause();
        },

        seek = function (time) {
            this.debug.log("Attempting seek...");

            if (!initialized) {
                return;
            }

            this.debug.log("Do seek: " + time);

            if (videoController) {
                videoController.seek(time);
            }
            if (audioController) {
                audioController.seek(time);
            }
        },

        // Encrypted Media Extensions

        onMediaSourceNeedsKey = function (event) {
            this.debug.log("DRM: Key required.");
            this.debug.log("DRM: Generating key request...");
            this.videoModel.generateKeyRequest(DEFAULT_KEY_TYPE, event.initData);
        },

        onMediaSourceKeyMessage = function (event) {
            this.debug.log("DRM: Got a key message...");
            this.debug.log("DRM: Key system = " + event.keySystem);
            if (event.keySystem === DEFAULT_KEY_TYPE) {
                // todo : request license?
                //requestLicense(e.message, e.sessionId, this);
            } else {
                this.debug.log("DRM: Key type not supported!");
            }
        },

        onMediaSourceKeyAdded = function (event) {
            this.debug.log("DRM: Key added.");
        },

        addKey = function (key, data, id) {
            this.videoModel.addKey(DEFAULT_KEY_TYPE, key, data, id);
        },

        // Media Source

        setUpMediaSource = function () {
            var deferred = Q.defer(),
                self = this,

                onMediaSourceClose = function (e) {
                    var error = self.videoModel.getElement().error,
                        code = (error !== null && error !== undefined) ? error.code : -1,
                        msg = "";

                    if (code === -1) {
                        // not an error!
                        return;
                    }

                    switch (code) {
                        case 1:
                            msg = "MEDIA_ERR_ABORTED";
                            break;
                        case 2:
                            msg = "MEDIA_ERR_NETWORK";
                            break;
                        case 3:
                            msg = "MEDIA_ERR_DECODE";
                            break;
                        case 4:
                            msg = "MEDIA_ERR_SRC_NOT_SUPPORTED";
                            break;
                        case 5:
                            msg = "MEDIA_ERR_ENCRYPTED";
                            break;
                    }

                    errored = true;

                    pause.call(self);
                    self.debug.log("MediaSource Close.");
                    self.debug.log(e);
                    self.debug.log("Video Element Error:");
                    self.debug.log(self.videoModel.getElement().error);
                    self.errHandler.mediaSourceError(msg);
                },

                onMediaSourceOpen = function (e) {
                    self.debug.log("MediaSource is open!");
                    self.debug.log(e);

                    mediaSource.removeEventListener("sourceopen", onMediaSourceOpen);
                    mediaSource.removeEventListener("webkitsourceopen", onMediaSourceOpen);

                    deferred.resolve(mediaSource);
                };

            self.debug.log("MediaSource should be closed. (" + mediaSource.readyState + ")");

            mediaSource.addEventListener("sourceclose", onMediaSourceClose, false);
            mediaSource.addEventListener("webkitsourceclose", onMediaSourceClose, false);

            mediaSource.addEventListener("sourceopen", onMediaSourceOpen, false);
            mediaSource.addEventListener("webkitsourceopen", onMediaSourceOpen, false);

            mediaSource.addEventListener("webkitneedkey", onMediaSourceNeedsKey.bind(self), false);
            mediaSource.addEventListener("webkitkeymessage", onMediaSourceKeyMessage.bind(self), false);
            mediaSource.addEventListener("webkitkeyadded", onMediaSourceKeyAdded.bind(self), false);

            self.mediaSourceExt.attachMediaSource(mediaSource, self.videoModel);
            self.debug.log("MediaSource attached to video.  Waiting on open...");

            return deferred.promise;
        },

        clearMetrics = function () {
            videoController.clearMetrics();
            audioController.clearMetrics();
        },

        tearDownMediaSource = function () {
            var self = this,
                videoBuffer,
                audioBuffer;

            videoController.stop();
            audioController.stop();

            clearMetrics.call(this);

            if (!errored) {
                videoBuffer = videoController.getBuffer();
                self.sourceBufferExt.abort(videoBuffer);
                self.sourceBufferExt.removeSourceBuffer(mediaSource, videoBuffer);

                audioBuffer = audioController.getBuffer();
                self.sourceBufferExt.abort(audioBuffer);
                self.sourceBufferExt.removeSourceBuffer(mediaSource, audioBuffer);
            }

            videoController = null;
            audioController = null;

            self.videoModel.setSource(null);
        },

        checkIfInitialized = function (videoReady, audioReady, deferred) {
            if (videoReady && audioReady) {
                if (videoController === null && audioController === null) {
                    var msg = "No streams to play.";
                    alert(msg);
                    this.debug.log(msg);
                    deferred.reject(msg);
                } else {
                    this.debug.log("MediaSource initialized!");
                    deferred.resolve(true);
                }
            }
        },

        initializeMediaSource = function () {
            this.debug.log("Getting MediaSource ready...");

            var initialize = Q.defer(),
                videoReady = false,
                audioReady = false,
                minBufferTime,
                self = this,
                manifest = self.manifestModel.getValue(),
                isLive = self.videoModel.getIsLive();

            // Figure out some bits about the stream before building anything.
            self.debug.log("Gathering information for buffers. (1)");
            self.manifestExt.getDuration(manifest, isLive).then(
                function (duration) {
                    self.debug.log("Gathering information for buffers. (2)");
                    self.bufferExt.decideBufferLength(manifest.minBufferTime).then(
                        function (time) {
                            self.debug.log("Gathering information for buffers. (3)");
                            self.debug.log("Buffer time: " + time);
                            minBufferTime = time;
                            return self.manifestExt.getVideoData(manifest);
                        }
                    ).then(
                        function (videoData) {
                            if (videoData !== null) {
                                self.debug.log("Create video buffer.");
                                self.manifestExt.getDataIndex(videoData, manifest).then(
                                    function (index) {
                                        videoTrackIndex = index;
                                        self.debug.log("Save video track: " + videoTrackIndex);
                                    }
                                );

                                self.manifestExt.getCodec(videoData).then(
                                    function (codec) {
                                        var deferred;
                                        self.debug.log("Video codec: " + codec);
                                        if (!self.capabilities.supportsCodec(self.videoModel.getElement(), codec)) {
                                            self.debug.log("Codec (" + codec + ") is not supported.");
                                            alert("Codec (" + codec + ") is not supported.");
                                            deferred = Q.when(null);
                                        } else {
                                            deferred = self.sourceBufferExt.createSourceBuffer(mediaSource, codec);
                                        }
                                        return deferred;
                                    }
                                ).then(
                                    function (buffer) {
                                        if (buffer === null) {
                                            self.debug.log("No buffer was created, skipping video stream.");
                                        } else {
                                            // TODO : How to tell index handler live/duration?
                                            // TODO : Pass to controller and then pass to each method on handler?

                                            videoController = self.system.getObject("bufferController");
                                            videoController.setType("video");
                                            videoController.setData(videoData);
                                            videoController.setBuffer(buffer);
                                            videoController.setMinBufferTime(minBufferTime);

                                            self.debug.log("Video is ready!");
                                        }

                                        videoReady = true;
                                        checkIfInitialized.call(self, videoReady, audioReady, initialize);
                                    },
                                    function (error) {
                                        alert("Error creating source buffer.");
                                        videoReady = true;
                                        checkIfInitialized.call(self, videoReady, audioReady, initialize);
                                    }
                                );
                            } else {
                                self.debug.log("No video data.");
                                videoReady = true;
                                checkIfInitialized.call(self, videoReady, audioReady, initialize);
                            }

                            return self.manifestExt.getAudioDatas(manifest);
                        }
                    ).then(
                        function (audioDatas) {
                            if (audioDatas !== null && audioDatas.length > 0) {
                                self.debug.log("Have audio streams: " + audioDatas.length);
                                self.manifestExt.getPrimaryAudioData(manifest).then(
                                    function (primaryAudioData) {
                                        self.manifestExt.getDataIndex(primaryAudioData, manifest).then(
                                            function (index) {
                                                audioTrackIndex = index;
                                                self.debug.log("Save audio track: " + audioTrackIndex);
                                            }
                                        );

                                        self.manifestExt.getCodec(primaryAudioData).then(
                                            function (codec) {
                                                var deferred;
                                                self.debug.log("Audio codec: " + codec);
                                                if (!self.capabilities.supportsCodec(self.videoModel.getElement(), codec)) {
                                                    self.debug.log("Codec (" + codec + ") is not supported.");
                                                    alert("Codec (" + codec + ") is not supported.");
                                                    deferred = Q.when(null);
                                                } else {
                                                    deferred = self.sourceBufferExt.createSourceBuffer(mediaSource, codec);
                                                }
                                                return deferred;
                                            }
                                        ).then(
                                            function (buffer) {
                                                if (buffer === null) {
                                                    self.debug.log("No buffer was created, skipping audio stream.");
                                                } else {
                                                    // TODO : How to tell index handler live/duration?
                                                    // TODO : Pass to controller and then pass to each method on handler?

                                                    audioController = self.system.getObject("bufferController");
                                                    audioController.setType("audio");
                                                    audioController.setData(primaryAudioData);
                                                    audioController.setBuffer(buffer);
                                                    audioController.setMinBufferTime(minBufferTime);
                                                    self.debug.log("Audio is ready!");
                                                }

                                                audioReady = true;
                                                checkIfInitialized.call(self, videoReady, audioReady, initialize);
                                            },
                                            function (error) {
                                                alert("Error creating source buffer.");
                                                audioReady = true;
                                                checkIfInitialized.call(self, videoReady, audioReady, initialize);
                                            }
                                        );
                                    }
                                );
                            } else {
                                self.debug.log("No audio streams.");
                                audioReady = true;
                                checkIfInitialized.call(self, videoReady, audioReady, initialize);
                            }
                        }
                    );
                }
            );

            return initialize.promise;
        },

        initializePlayback = function () {
            var self = this,
                initialize = Q.defer(),
                isLive = self.videoModel.getIsLive();

            self.debug.log("Getting ready for playback...");

            self.manifestExt.getDuration(self.manifestModel.getValue(), isLive).then(
                function (duration) {
                    self.debug.log("Setting duration: " + duration);
                    return self.mediaSourceExt.setDuration(mediaSource, duration);
                }
            ).then(
                function (value) {
                    self.debug.log("Duration successfully set.");
                    initialized = true;
                    initialize.resolve(true);
                }
            );

            return initialize.promise;
        },

        onPlay = function (e) {
            this.debug.log("Got play event.");

            if (!initialized) {
                return;
            }

            this.debug.log("Starting playback.");

            if (videoController) {
                videoController.start();
            }
            if (audioController) {
                audioController.start();
            }
        },

        onPause = function (e) {
            this.debug.log("Got pause event.");

            if (videoController) {
                videoController.stop();
            }
            if (audioController) {
                audioController.stop();
            }
        },

        onSeeking = function (e) {
            this.debug.log("Got seeking event.");

            if (videoController) {
                videoController.seek(this.videoModel.getCurrentTime());
            }
            if (audioController) {
                audioController.seek(this.videoModel.getCurrentTime());
            }
        },

        onSeeked = function (e) {
            this.debug.log("Seek complete.");
            this.videoModel.listen("seeking", seekingListener);
            this.videoModel.unlisten("seeked", seekedListener);
        },

        onProgress = function (e) {
            //this.debug.log("Got timeupdate event.");
        },

        doLoad = function () {
            if (!ready || !loaded) {
                return;
            }

            var self = this,
                url = urlSource,
                isLive = self.videoModel.getIsLive();

            self.debug.log("Stream start loading.");

            self.manifestLoader.load(url).then(
                function (manifestResult) {
                    manifest = manifestResult;
                    self.manifestModel.setValue(manifest);
                    self.debug.log("Manifest has loaded.");
                    self.debug.log(self.manifestModel.getValue());
                    self.manifestUpdater.init();
                    return self.mediaSourceExt.createMediaSource();
                }
            ).then(
                function (mediaSourceResult) {
                    mediaSource = mediaSourceResult;
                    self.debug.log("MediaSource created.");
                    return setUpMediaSource.call(self);
                }
            ).then(
                function (result) {
                    self.debug.log("MediaSource set up.");
                    return initializeMediaSource.call(self);
                }
            ).then(
                function (result) {
                    self.debug.log("Start initializing playback.");
                    return initializePlayback.call(self);
                }
            ).then(
                function (done) {
                    self.debug.log("Playback initialized!");
                    if (isLive) {
                        self.manifestExt.getLiveEdge(self.manifestModel.getValue()).then(
                            function (edge) {
                                self.debug.log("Got live content.  Starting playback at offset: " + edge);
                                seek.call(self, edge);
                            }
                        );
                    } else {
                        self.manifestExt.getPresentationOffset(self.manifestModel.getValue()).then(
                            function (offset) {
                                self.debug.log("Got VOD content.  Starting playback at offset: " + offset);
                                seek.call(self, offset);
                                //play.call(self);
                            }
                        );
                    }
                }
            );
        },

        currentTimeChanged = function () {
            this.debug.log("Current time has changed, block programmatic seek.");

            this.videoModel.unlisten("seeking", seekingListener);
            this.videoModel.listen("seeked", seekedListener);
        },

        manifestHasUpdated = function () {
            var self = this,
                videoData,
                audioData,
                manifest = self.manifestModel.getValue();

            self.debug.log("Manifest updated... set new data on buffers.");

            if (videoController) {
                videoData = videoController.getData();

                if (videoData.hasOwnProperty("id")) {
                    self.manifestExt.getDataForId(videoData.id, manifest).then(
                        function (data) {
                            videoController.setData(data);
                        }
                    );
                } else {
                    self.manifestExt.getDataForIndex(videoTrackIndex, manifest).then(
                        function (data) {
                            videoController.setData(data);
                        }
                    );
                }
            }

            if (audioController) {
                audioData = audioController.getData();

                if (audioData.hasOwnProperty("id")) {
                    self.manifestExt.getDataForId(audioData.id, manifest).then(
                        function (data) {
                            audioController.setData(data);
                        }
                    );
                } else {
                    self.manifestExt.getDataForIndex(audioTrackIndex, manifest).then(
                        function (data) {
                            audioController.setData(data);
                        }
                    );
                }
            }
        };

    return {
        system: undefined,
        videoModel: undefined,
        manifestLoader: undefined,
        manifestUpdater: undefined,
        manifestModel: undefined,
        mediaSourceExt: undefined,
        sourceBufferExt: undefined,
        bufferExt: undefined,
        manifestExt: undefined,
        fragmentController: undefined,
        abrController: undefined,
        fragmentExt: undefined,
        capabilities: undefined,
        debug: undefined,
        metricsExt: undefined,
        errHandler: undefined,

        setup: function () {
            this.system.mapHandler("manifestUpdated", undefined, manifestHasUpdated.bind(this));
            this.system.mapHandler("setCurrentTime", undefined, currentTimeChanged.bind(this));

            playListener = onPlay.bind(this);
            pauseListener = onPause.bind(this);
            seekingListener = onSeeking.bind(this);
            seekedListener = onSeeked.bind(this);
            timeupdateListener = onProgress.bind(this);

            this.videoModel.listen("play", playListener);
            this.videoModel.listen("pause", pauseListener);
            this.videoModel.listen("seeking", seekingListener);
            this.videoModel.listen("timeupdate", timeupdateListener);

            ready = true;
            doLoad.call(this);
        },

        getManifestExt: function () {
            var self = this;
            return self.manifestExt;
        },

        setAutoPlay: function (value) {
            autoPlay = value;
        },

        getAutoPlay: function () {
            return autoPlay;
        },

        load: function (url) {
            urlSource = url;
            loaded = true;
            doLoad.call(this);
        },

        reset: function () {
            pause.call(this);
            tearDownMediaSource.call(this);
        },

        play: play,
        seek: seek,
        pause: pause
    };
};

MediaPlayer.dependencies.Stream.prototype = {
    constructor: MediaPlayer.dependencies.Stream
};