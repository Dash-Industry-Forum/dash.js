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
MediaPlayer.dependencies.Stream = function () {
    "use strict";

    var manifest,
        mediaSource,
        videoCodec = null,
        audioCodec = null,
        contentProtection = null,
        videoController = null,
        videoTrackIndex = -1,
        audioController = null,
        audioTrackIndex = -1,
        textController = null,
        textTrackIndex = -1,
        autoPlay = true,
        initialized = false,
        load,
        errored = false,
        kid = null,
        initData = [],

        loadedListener,
        playListener,
        pauseListener,
        errorListener,
        seekingListener,
        seekedListener,
        timeupdateListener,
        progressListener,
        ratechangeListener,
        periodInfo = null,

        needKeyListener,
        keyMessageListener,
        keyAddedListener,
        keyErrorListener,

        eventController = null,

        play = function () {
            //this.debug.log("Attempting play...");

            if (!initialized) {
                return;
            }

            //this.debug.log("Do play.");
            this.videoModel.play();
        },

        pause = function () {
            //this.debug.log("Do pause.");
            this.videoModel.pause();
        },

        seek = function (time) {
            //this.debug.log("Attempting seek...");

            if (!initialized) {
                return;
            }

            this.debug.log("Do seek: " + time);

            this.system.notify("setCurrentTime");
            this.videoModel.setCurrentTime(time);

            startBuffering(time);
        },

        // Encrypted Media Extensions

        onMediaSourceNeedsKey = function (event) {
            var self = this,
                type;

            type = (event.type !== "msneedkey") ? event.type : videoCodec;
            initData.push({type: type, initData: event.initData});

            this.debug.log("DRM: Key required for - " + type);
            //this.debug.log("DRM: Generating key request...");
            //this.protectionModel.generateKeyRequest(DEFAULT_KEY_TYPE, event.initData);
            if (!!contentProtection && !!videoCodec && !kid) {
                try
                {
                    kid = self.protectionController.selectKeySystem(videoCodec, contentProtection);
                }
                catch (error)
                {
                    pause.call(self);
                    self.debug.log(error);
                    self.errHandler.mediaKeySystemSelectionError(error);
                }
            }

            if (!!kid) {
                self.protectionController.ensureKeySession(kid, type, event.initData);
            }
        },

        onMediaSourceKeyMessage = function (event) {
            var self = this,
                session = null,
                bytes = null,
                msg = null,
                laURL = null;

            this.debug.log("DRM: Got a key message...");

            session = event.target;
            bytes = new Uint16Array(event.message.buffer);
            msg = String.fromCharCode.apply(null, bytes);
            laURL = event.destinationURL;

            self.protectionController.updateFromMessage(kid, session, msg, laURL).fail(
                function (error) {
                    pause.call(self);
                    self.debug.log(error);
                    self.errHandler.mediaKeyMessageError(error);
            });

            //if (event.keySystem !== DEFAULT_KEY_TYPE) {
            //    this.debug.log("DRM: Key type not supported!");
            //}
            // else {
                // todo : request license?
                //requestLicense(e.message, e.sessionId, this);
            // }
        },

        onMediaSourceKeyAdded = function () {
            this.debug.log("DRM: Key added.");
        },

        onMediaSourceKeyError = function () {
            var session = event.target,
                msg;
            msg = 'DRM: MediaKeyError - sessionId: ' + session.sessionId + ' errorCode: ' + session.error.code + ' systemErrorCode: ' + session.error.systemCode + ' [';
            switch (session.error.code) {
                case 1:
                    msg += "MEDIA_KEYERR_UNKNOWN - An unspecified error occurred. This value is used for errors that don't match any of the other codes.";
                    break;
                case 2:
                    msg += "MEDIA_KEYERR_CLIENT - The Key System could not be installed or updated.";
                    break;
                case 3:
                    msg += "MEDIA_KEYERR_SERVICE - The message passed into update indicated an error from the license service.";
                    break;
                case 4:
                    msg += "MEDIA_KEYERR_OUTPUT - There is no available output device with the required characteristics for the content protection system.";
                    break;
                case 5:
                    msg += "MEDIA_KEYERR_HARDWARECHANGE - A hardware configuration change caused a content protection error.";
                    break;
                case 6:
                    msg += "MEDIA_KEYERR_DOMAIN - An error occurred in a multi-device domain licensing configuration. The most common error is a failure to join the domain.";
                    break;
            }
            msg += "]";
            //pause.call(this);
            this.debug.log(msg);
            this.errHandler.mediaKeySessionError(msg);
        },

        // Media Source

        setUpMediaSource = function (mediaSourceArg) {
            var deferred = Q.defer(),
                self = this,

                onMediaSourceOpen = function (e) {
                    self.debug.log("MediaSource is open!");
                    self.debug.log(e);

                    mediaSourceArg.removeEventListener("sourceopen", onMediaSourceOpen);
                    mediaSourceArg.removeEventListener("webkitsourceopen", onMediaSourceOpen);

                    deferred.resolve(mediaSourceArg);
                };

            //self.debug.log("MediaSource should be closed. The actual readyState is: " + mediaSourceArg.readyState);

            mediaSourceArg.addEventListener("sourceopen", onMediaSourceOpen, false);
            mediaSourceArg.addEventListener("webkitsourceopen", onMediaSourceOpen, false);

            self.mediaSourceExt.attachMediaSource(mediaSourceArg, self.videoModel);

            //self.debug.log("MediaSource attached to video.  Waiting on open...");

            return deferred.promise;
        },

        tearDownMediaSource = function () {
            var self = this;

            if (!!videoController) {
                videoController.reset(errored);
            }
            if (!!audioController) {
                audioController.reset(errored);
            }
            if (!!textController) {
                textController.reset(errored);
            }
            if(!!eventController) {
                eventController.reset();
            }

            if (!!mediaSource) {
                self.mediaSourceExt.detachMediaSource(self.videoModel);
            }

            initialized = false;

            kid = null;
            initData = [];
            contentProtection = null;

            videoController = null;
            audioController = null;
            textController = null;

            videoCodec = null;
            audioCodec = null;

            mediaSource = null;
            manifest = null;
        },

        checkIfInitialized = function (videoReady, audioReady, textTrackReady, deferred) {
            if (videoReady && audioReady && textTrackReady) {
                if (videoController === null && audioController === null && textController === null) {
                    var msg = "No streams to play.";
                    this.errHandler.manifestError(msg, "nostreams", manifest);
                    this.debug.log(msg);
                    deferred.reject();
                } else {
                    //this.debug.log("MediaSource initialized!");
                    deferred.resolve(true);
                }
            }
        },

        initializeMediaSource = function () {
            //this.debug.log("Getting MediaSource ready...");

            var initialize = Q.defer(),
                videoReady = false,
                audioReady = false,
                textTrackReady = false,
                self = this;

            eventController = self.system.getObject("eventController");
            eventController.initialize(self.videoModel);
            // Figure out some bits about the stream before building anything.
            //self.debug.log("Gathering information for buffers. (1)");
            self.manifestExt.getDuration(manifest, periodInfo).then(
                function (/*duration*/) {
                    self.manifestExt.getVideoData(manifest, periodInfo.index).then(
                        function (videoData) {
                            if (videoData !== null) {
                                //self.debug.log("Create video buffer.");
                                self.manifestExt.getDataIndex(videoData, manifest, periodInfo.index).then(
                                    function (index) {
                                        videoTrackIndex = index;
                                        //self.debug.log("Save video track: " + videoTrackIndex);
                                    }
                                );

                                self.manifestExt.getCodec(videoData).then(
                                    function (codec) {
                                        self.debug.log("Video codec: " + codec);
                                        videoCodec = codec;

                                        return self.manifestExt.getContentProtectionData(videoData).then(
                                            function (contentProtectionData) {
                                                //self.debug.log("Video contentProtection");

                                                if (!!contentProtectionData && !self.capabilities.supportsMediaKeys()) {
                                                    self.errHandler.capabilityError("mediakeys");
                                                    return Q.when(null);
                                                }

                                                contentProtection = contentProtectionData;

                                                //kid = self.protectionController.selectKeySystem(videoCodec, contentProtection);
                                                //self.protectionController.ensureKeySession(kid, videoCodec, null);

                                                if (!self.capabilities.supportsCodec(self.videoModel.getElement(), codec)) {
                                                    var msg = "Video Codec (" + codec + ") is not supported.";
                                                    self.errHandler.manifestError(msg, "codec", manifest);
                                                    self.debug.log(msg);
                                                    return Q.when(null);
                                                }

                                                return self.sourceBufferExt.createSourceBuffer(mediaSource, codec);
                                            }
                                        );
                                    }
                                ).then(
                                    function (buffer) {
                                        if (buffer === null) {
                                            self.debug.log("No buffer was created, skipping video stream.");
                                        } else {
                                            // TODO : How to tell index handler live/duration?
                                            // TODO : Pass to controller and then pass to each method on handler?

                                            videoController = self.system.getObject("bufferController");
                                            videoController.initialize("video", periodInfo, videoData, buffer, self.videoModel, self.requestScheduler, self.fragmentController, mediaSource, eventController);
                                            //self.debug.log("Video is ready!");
                                        }

                                        videoReady = true;
                                        checkIfInitialized.call(self, videoReady, audioReady, textTrackReady,  initialize);
                                    },
                                    function (/*error*/) {
                                        self.errHandler.mediaSourceError("Error creating video source buffer.");
                                        videoReady = true;
                                        checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                                    }
                                );
                            } else {
                                self.debug.log("No video data.");
                                videoReady = true;
                                checkIfInitialized.call(self, videoReady, audioReady, textTrackReady,  initialize);
                            }

                            return self.manifestExt.getAudioDatas(manifest, periodInfo.index);
                        }
                    ).then(
                        function (audioDatas) {
                            if (audioDatas !== null && audioDatas.length > 0) {
                                //self.debug.log("Have audio streams: " + audioDatas.length);
                                self.manifestExt.getPrimaryAudioData(manifest, periodInfo.index).then(
                                    function (primaryAudioData) {
                                        self.manifestExt.getDataIndex(primaryAudioData, manifest, periodInfo.index).then(
                                            function (index) {
                                                audioTrackIndex = index;
                                                //self.debug.log("Save audio track: " + audioTrackIndex);
                                            }
                                        );

                                        self.manifestExt.getCodec(primaryAudioData).then(
                                            function (codec) {
                                                self.debug.log("Audio codec: " + codec);
                                                audioCodec = codec;

                                                return self.manifestExt.getContentProtectionData(primaryAudioData).then(
                                                    function (contentProtectionData) {
                                                        //self.debug.log("Audio contentProtection");

                                                        if (!!contentProtectionData && !self.capabilities.supportsMediaKeys()) {
                                                            self.errHandler.capabilityError("mediakeys");
                                                            return Q.when(null);
                                                        }

                                                        contentProtection = contentProtectionData;

                                                        //kid = self.protectionController.selectKeySystem(videoCodec, contentProtection);
                                                        //self.protectionController.ensureKeySession(kid, videoCodec, null);

                                                        if (!self.capabilities.supportsCodec(self.videoModel.getElement(), codec)) {
                                                            var msg = "Audio Codec (" + codec + ") is not supported.";
                                                            self.errHandler.manifestError(msg, "codec", manifest);
                                                            self.debug.log(msg);
                                                            return Q.when(null);
                                                        }

                                                        return self.sourceBufferExt.createSourceBuffer(mediaSource, codec);
                                                    }
                                                );
                                            }
                                        ).then(
                                            function (buffer) {
                                                if (buffer === null) {
                                                    self.debug.log("No buffer was created, skipping audio stream.");
                                                } else {
                                                    // TODO : How to tell index handler live/duration?
                                                    // TODO : Pass to controller and then pass to each method on handler?
                                                    audioController = self.system.getObject("bufferController");
                                                    audioController.initialize("audio", periodInfo, primaryAudioData, buffer, self.videoModel, self.requestScheduler, self.fragmentController, mediaSource, eventController);
                                                    //self.debug.log("Audio is ready!");
                                                }

                                                audioReady = true;
                                                checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                                            },
                                            function () {
                                                self.errHandler.mediaSourceError("Error creating audio source buffer.");
                                                audioReady = true;
                                                checkIfInitialized.call(self, videoReady, audioReady,textTrackReady,  initialize);
                                            }
                                        );
                                    }
                                );
                            } else {
                                self.debug.log("No audio streams.");
                                audioReady = true;
                                checkIfInitialized.call(self, videoReady, audioReady,textTrackReady,  initialize);
                            }

                            return self.manifestExt.getTextData(manifest, periodInfo.index);
                        }
                    ).then(
                        function (textData) {
                            var mimeType;
                            if (textData !== null ) {
                                self.manifestExt.getDataIndex(textData, manifest, periodInfo.index).then(
                                    function (index) {
                                        textTrackIndex = index;
                                        //self.debug.log("Save text track: " + textTrackIndex);
                                    }
                                );
                                self.manifestExt.getMimeType(textData).then(
                                    function (type)
                                    {
                                        mimeType = type;
                                        return self.sourceBufferExt.createSourceBuffer(mediaSource, mimeType);
                                    }
                                ).then(
                                    function (buffer) {
                                        if (buffer === null) {
                                            self.debug.log("Source buffer was not created for text track");
                                        } else {
                                            textController = self.system.getObject("textController");
                                            textController.initialize(periodInfo, textData, buffer, self.videoModel, mediaSource);
                                            if (buffer.hasOwnProperty('initialize')) {
                                                buffer.initialize(mimeType, textController);
                                            }
                                            //self.debug.log("Text is ready!");
                                            textTrackReady = true;
                                            checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                                        }
                                    },
                                    function (error) {
                                        self.debug.log("Error creating text source buffer:");
                                        self.debug.log(error);
                                        self.errHandler.mediaSourceError("Error creating text source buffer.");
                                        textTrackReady = true;
                                        checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                                    }
                                );
                            }else {
                                self.debug.log("No text tracks.");
                                textTrackReady = true;
                                checkIfInitialized.call(self, videoReady, audioReady,textTrackReady,  initialize);
                            }
                            return  self.manifestExt.getEventsForPeriod(manifest,periodInfo);
                        }
                    ).then(
                        function (events) {
                            eventController.addInlineEvents(events);
                        }
                    );
                }
            );

            return initialize.promise;
        },

        initializePlayback = function () {
            var self = this,
                initialize = Q.defer();

            //self.debug.log("Getting ready for playback...");

            self.manifestExt.getDuration(self.manifestModel.getValue(), periodInfo).then(
                function (duration) {
                    //self.debug.log("Setting duration: " + duration);
                    return self.mediaSourceExt.setDuration(mediaSource, duration);
                }
            ).then(
                function (value) {
                    self.debug.log("Duration successfully set to: " + value);
                    initialized = true;
                    initialize.resolve(true);
                }
            );

            return initialize.promise;
        },

        onLoad = function () {
            this.debug.log("Got loadmetadata event.");

            var initialSeekTime = this.timelineConverter.calcPresentationStartTime(periodInfo);
            this.debug.log("Starting playback at offset: " + initialSeekTime);

            this.videoModel.setCurrentTime(initialSeekTime);

            load.resolve(null);
        },

        onPlay = function () {
            //this.debug.log("Got play event.");
            updateCurrentTime.call(this);
        },

        onPause = function () {
            //this.debug.log("Got pause event.");
            suspend.call(this);
        },

        onError = function (event) {
            var error = event.srcElement.error,
                code = error.code,
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

            this.debug.log("Video Element Error: " + msg);
            this.debug.log(error);
            this.errHandler.mediaSourceError(msg);
            this.reset();
        },

        onSeeking = function () {
            //this.debug.log("Got seeking event.");
            var time = this.videoModel.getCurrentTime();

            startBuffering(time);
        },

        onSeeked = function () {
            //this.debug.log("Seek complete.");

            this.videoModel.listen("seeking", seekingListener);
            this.videoModel.unlisten("seeked", seekedListener);
        },

        onProgress = function () {
            //this.debug.log("Got timeupdate event.");
            updateBuffer.call(this);
        },

        onTimeupdate = function () {
            updateBuffer.call(this);
        },

        onRatechange = function() {
            if (videoController) {
                videoController.updateStalledState();
            }
            if (audioController) {
                audioController.updateStalledState();
            }
        },

        updateBuffer = function() {
            if (videoController) {
                videoController.updateBufferState();
            }

            if (audioController) {
               audioController.updateBufferState();
            }
        },

        startBuffering = function(time) {
            if (videoController) {
                if (time === undefined) {
                    videoController.start();
                } else {
                    videoController.seek(time);
                }
            }

            if (audioController) {
                if (time === undefined) {
                    audioController.start();
                } else {
                    audioController.seek(time);
                }
            }
        },

        stopBuffering = function() {
            if (videoController) {
                videoController.stop();
            }
            if (audioController) {
                audioController.stop();
            }
        },

        suspend = function() {
            if (!this.scheduleWhilePaused || this.manifestExt.getIsDynamic(manifest)) {
                stopBuffering.call(this);
            }
        },

        updateCurrentTime = function() {
            if (this.videoModel.isPaused()) return;

            var currentTime = this.videoModel.getCurrentTime(),
                representation = videoController ? videoController.getCurrentRepresentation() : audioController.getCurrentRepresentation(),
                actualTime = this.timelineConverter.calcActualPresentationTime(representation, currentTime, this.manifestExt.getIsDynamic(manifest)),
                timeChanged = (!isNaN(actualTime) && actualTime !== currentTime);

            if (timeChanged) {
                this.videoModel.setCurrentTime(actualTime);
                startBuffering(actualTime);
            } else {
                startBuffering();
            }
        },

        doLoad = function (manifestResult) {

            var self = this;

            //self.debug.log("Stream start loading.");

            manifest = manifestResult;
            return self.mediaSourceExt.createMediaSource().then(
                function (mediaSourceResult) {
                    //self.debug.log("MediaSource created.");
                    return setUpMediaSource.call(self, mediaSourceResult);
                }
            ).then(
                function (mediaSourceResult) {
                    mediaSource = mediaSourceResult;
                    //self.debug.log("MediaSource set up.");
                    return initializeMediaSource.call(self);
                }
            ).then(
                function (/*result*/) {
                    //self.debug.log("Start initializing playback.");
                    return initializePlayback.call(self);
                }
            ).then(
                function (/*done*/) {
                    //self.debug.log("Playback initialized!");
                    return load.promise;
                }
            ).then(
                function () {
                    self.debug.log("element loaded!");
                    // only first period stream must be played automatically during playback initialization
                    if (periodInfo.index === 0) {
                        eventController.start();
                        if (autoPlay) {
                            play.call(self);
                        }
                    }
                }
            );
        },

        currentTimeChanged = function () {
            this.debug.log("Current time has changed, block programmatic seek.");

            this.videoModel.unlisten("seeking", seekingListener);
            this.videoModel.listen("seeked", seekedListener);
        },

        bufferingCompleted = function() {
            // if there is at least one buffer controller that has not completed buffering yet do nothing
            if ((videoController && !videoController.isBufferingCompleted()) || (audioController && !audioController.isBufferingCompleted())) {
                return;
            }

            // buffering has been complted, now we can signal end of stream
            if (mediaSource) {
                this.mediaSourceExt.signalEndOfStream(mediaSource);
            }
        },

        segmentLoadingFailed = function() {
            stopBuffering.call(this);
        },

        updateData = function (updatedPeriodInfo) {
            var self = this,
                videoData,
                audioData,
                textData,
                deferredVideoData,
                deferredAudioData,
                deferredTextData,
                deferred = Q.defer(),
                deferredVideoUpdate = Q.defer(),
                deferredAudioUpdate = Q.defer(),
                deferredTextUpdate = Q.defer(),
                deferredEventUpdate = Q.defer();

            manifest = self.manifestModel.getValue();
            periodInfo = updatedPeriodInfo;
            self.debug.log("Manifest updated... set new data on buffers.");

            if (videoController) {
                videoData = videoController.getData();

                if (!!videoData && videoData.hasOwnProperty("id")) {
                    deferredVideoData = self.manifestExt.getDataForId(videoData.id, manifest, periodInfo.index);
                } else {
                    deferredVideoData = self.manifestExt.getDataForIndex(videoTrackIndex, manifest, periodInfo.index);
                }

                deferredVideoData.then(
                        function (data) {
                        videoController.updateData(data, periodInfo).then(
                            function(){
                                deferredVideoUpdate.resolve();
                        }
                    );
                }
                );
            } else {
                deferredVideoUpdate.resolve();
            }

            if (audioController) {
                audioData = audioController.getData();

                if (!!audioData && audioData.hasOwnProperty("id")) {
                    deferredAudioData = self.manifestExt.getDataForId(audioData.id, manifest, periodInfo.index);
                } else {
                    deferredAudioData = self.manifestExt.getDataForIndex(audioTrackIndex, manifest, periodInfo.index);
                }

                deferredAudioData.then(
                        function (data) {
                        audioController.updateData(data, periodInfo).then(
                            function(){
                                deferredAudioUpdate.resolve();
                        }
                    );
                }
                );
            } else {
                deferredAudioUpdate.resolve();
            }

            if (textController) {
                textData = textController.getData();

                if (!!textData && textData.hasOwnProperty("id")) {
                    deferredTextData = self.manifestExt.getDataForId(textData.id, manifest, periodInfo.index);
                } else {
                    deferredTextData = self.manifestExt.getDataForIndex(textTrackIndex, manifest, periodInfo.index);
                }

                deferredTextData.then(
                    function (data) {
                        textController.updateData(data, periodInfo).then(
                            function(){
                                deferredTextUpdate.resolve();
                            }
                        );
                    }
                );
            }

            if(eventController) {
                self.manifestExt.getEventsForPeriod(manifest,periodInfo).then(
                    function(events) {
                        eventController.addInlineEvents(events);
                        deferredEventUpdate.resolve();
                    }
                );
            }

            Q.when(deferredVideoUpdate.promise, deferredAudioUpdate.promise, deferredTextUpdate.promise).then(
                function() {
                    updateCurrentTime.call(self);
                    deferred.resolve();
                }
            );

            return deferred.promise;
        };

    return {
        system: undefined,
        videoModel: undefined,
        manifestLoader: undefined,
        manifestModel: undefined,
        mediaSourceExt: undefined,
        sourceBufferExt: undefined,
        bufferExt: undefined,
        manifestExt: undefined,
        fragmentController: undefined,
        abrController: undefined,
        fragmentExt: undefined,
        protectionModel: undefined,
        protectionController: undefined,
        protectionExt: undefined,
        capabilities: undefined,
        debug: undefined,
        metricsExt: undefined,
        errHandler: undefined,
        timelineConverter: undefined,
        requestScheduler: undefined,
        scheduleWhilePaused: undefined,

        setup: function () {
            this.system.mapHandler("setCurrentTime", undefined, currentTimeChanged.bind(this));
            this.system.mapHandler("bufferingCompleted", undefined, bufferingCompleted.bind(this));
            this.system.mapHandler("segmentLoadingFailed", undefined, segmentLoadingFailed.bind(this));

            load = Q.defer();

            playListener = onPlay.bind(this);
            pauseListener = onPause.bind(this);
            errorListener = onError.bind(this);
            seekingListener = onSeeking.bind(this);
            seekedListener = onSeeked.bind(this);
            progressListener = onProgress.bind(this);
            ratechangeListener = onRatechange.bind(this);
            timeupdateListener = onTimeupdate.bind(this);
            loadedListener = onLoad.bind(this);
        },

        load: function(manifest, periodInfoValue) {
            periodInfo = periodInfoValue;
            doLoad.call(this, manifest);
        },

        setVideoModel: function(value) {
            this.videoModel = value;
            this.videoModel.listen("play", playListener);
            this.videoModel.listen("pause", pauseListener);
            this.videoModel.listen("error", errorListener);
            this.videoModel.listen("seeking", seekingListener);
            this.videoModel.listen("timeupdate", timeupdateListener);
            this.videoModel.listen("progress", progressListener);
            this.videoModel.listen("ratechange", ratechangeListener);
            this.videoModel.listen("loadedmetadata", loadedListener);

            this.requestScheduler.videoModel = value;
        },

        initProtection: function() {
            needKeyListener = onMediaSourceNeedsKey.bind(this);
            keyMessageListener = onMediaSourceKeyMessage.bind(this);
            keyAddedListener = onMediaSourceKeyAdded.bind(this);
            keyErrorListener = onMediaSourceKeyError.bind(this);

            this.protectionModel = this.system.getObject("protectionModel");
            this.protectionModel.init(this.getVideoModel());
            this.protectionController = this.system.getObject("protectionController");
            this.protectionController.init(this.videoModel, this.protectionModel);

            this.protectionModel.listenToNeedKey(needKeyListener);
            this.protectionModel.listenToKeyMessage(keyMessageListener);
            this.protectionModel.listenToKeyError(keyErrorListener);
            this.protectionModel.listenToKeyAdded(keyAddedListener);
        },

        getVideoModel: function() {
            return this.videoModel;
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

        reset: function () {
            pause.call(this);

            this.videoModel.unlisten("play", playListener);
            this.videoModel.unlisten("pause", pauseListener);
            this.videoModel.unlisten("error", errorListener);
            this.videoModel.unlisten("seeking", seekingListener);
            this.videoModel.unlisten("timeupdate", timeupdateListener);
            this.videoModel.unlisten("progress", progressListener);
            this.videoModel.unlisten("loadedmetadata", loadedListener);

            tearDownMediaSource.call(this);
            if (!!this.protectionController) {
                this.protectionController.teardownKeySystem(kid);
            }
            this.protectionController = undefined;
            this.protectionModel = undefined;
            this.fragmentController = undefined;
            this.requestScheduler = undefined;

            // streamcontroller expects this to be valid
            //this.videoModel = null;

            load = Q.defer();
        },

        getDuration: function () {
            return periodInfo.duration;
        },

        getStartTime: function() {
            return periodInfo.start;
        },

        getPeriodIndex: function() {
            return periodInfo.index;
        },

        getId: function() {
            return periodInfo.id;
        },

        getPeriodInfo: function() {
            return periodInfo;
        },
        startEventController: function() {
            eventController.start();
        },
        resetEventController: function() {
            eventController.reset();
        },

        updateData: updateData,
        play: play,
        seek: seek,
        pause: pause
    };
};

MediaPlayer.dependencies.Stream.prototype = {
    constructor: MediaPlayer.dependencies.Stream
};
