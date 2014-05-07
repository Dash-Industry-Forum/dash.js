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
        codecs = {},
        contentProtection = null,
        streamProcessors = [],
        autoPlay = true,
        initialized = false,
        load,
        errored = false,
        kid = null,
        initData = [],
        updating = true,
        periodInfo = null,

        needKeyListener,
        keyMessageListener,
        keyAddedListener,
        keyErrorListener,

        play = function () {
            //this.debug.log("Attempting play...");

            if (!initialized) {
                return;
            }

            //this.debug.log("Do play.");
            this.playbackController.start();
        },

        pause = function () {
            //this.debug.log("Do pause.");
            this.playbackController.pause();
        },

        seek = function (time) {
            //this.debug.log("Attempting seek...");

            if (!initialized) {
                return;
            }

            this.debug.log("Do seek: " + time);

            currentTimeChanged.call(this);
            this.playbackController.seek(time);

            startBuffering(time);
        },

        // Encrypted Media Extensions

        onMediaSourceNeedsKey = function (event) {
            var self = this,
                videoCodec = codecs.video,
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
            var self = this,
                ln = streamProcessors.length,
                i = 0,
                processor;

            for (i; i < ln; i += 1) {
                processor = streamProcessors[i];
                processor.reset(errored);
                processor = null;
            }

            streamProcessors = [];

            if (!!mediaSource) {
                self.mediaSourceExt.detachMediaSource(self.videoModel);
            }

            initialized = false;

            kid = null;
            initData = [];
            contentProtection = null;

            codecs = {};

            mediaSource = null;
            manifest = null;
        },

        checkIfInitialized = function (videoReady, audioReady, textTrackReady, deferred) {
            if (videoReady && audioReady && textTrackReady) {
                if (streamProcessors.length === 0) {
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

        initializeMediaForType = function(type, manifest, periodIndex) {
            var self = this,
                mimeType,
                codec,
                deferred = Q.defer(),
                getCodecOrMimeType = function(mediaData) {
                    return self.manifestExt.getCodec(mediaData);
                },
                processor,
                deferredData;

            switch (type) {
                case "video":
                    deferredData = self.manifestExt.getVideoData(manifest, periodIndex);
                    break;
                case "audio":
                    deferredData = self.manifestExt.getPrimaryAudioData(manifest, periodIndex);
                    break;
                case "text":
                    deferredData = self.manifestExt.getTextData(manifest, periodIndex);

                    getCodecOrMimeType = function(mediaData) {
                        var deferred = Q.defer();

                        self.manifestExt.getMimeType(mediaData).then(
                            function(mimeTypeValue) {
                                mimeType = mimeTypeValue;
                                deferred.resolve(mimeTypeValue);
                            }
                        );

                        return deferred.promise;
                    };

                    break;
                default:
                    deferred.reject("unsupported media type: " + type);
            }

            deferredData.then(
                function (mediaData) {
                    if (mediaData !== null) {
                        //self.debug.log("Create " + type + " buffer.");
                        getCodecOrMimeType.call(self, mediaData).then(
                            function (result) {
                                if (result === mimeType) {
                                    return self.sourceBufferExt.createSourceBuffer(mediaSource, mimeType);
                                }

                                codec = result;
                                self.debug.log(type + " codec: " + codec);
                                codecs[type] = codec;

                                return self.manifestExt.getContentProtectionData(mediaData).then(
                                    function (contentProtectionData) {
                                        //self.debug.log(type + " contentProtection");

                                        if (!!contentProtectionData && !self.capabilities.supportsMediaKeys()) {
                                            self.errHandler.capabilityError("mediakeys");
                                            return Q.when(null);
                                        }

                                        contentProtection = contentProtectionData;

                                        //kid = self.protectionController.selectKeySystem(codec, contentProtection);
                                        //self.protectionController.ensureKeySession(kid, codec, null);

                                        if (!self.capabilities.supportsCodec(self.videoModel.getElement(), codec)) {
                                            var msg = type + "Codec (" + codec + ") is not supported.";
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
                                    self.debug.log("No buffer was created, skipping " + type + " data.");
                                } else {
                                    // TODO : How to tell index handler live/duration?
                                    // TODO : Pass to controller and then pass to each method on handler?

                                    processor = self.system.getObject("streamProcessor");
                                    processor.initialize(mimeType || type, buffer, self.videoModel, self.requestScheduler, self.fragmentController, self.playbackController, mediaSource, mediaData, periodInfo, self);
                                    streamProcessors.push(processor);
                                    //self.debug.log(type + " is ready!");
                                }

                                deferred.resolve(type);
                            },
                            function (/*error*/) {
                                self.errHandler.mediaSourceError("Error creating " + type +" source buffer.");
                                deferred.resolve(type);
                            }
                        );
                    } else {
                        self.debug.log("No " + type + " data.");
                        deferred.resolve(type);
                    }
                }
            );

            return deferred.promise;
        },

        initializeMediaSource = function () {
            //this.debug.log("Getting MediaSource ready...");

            var initialize = Q.defer(),
                initializedTypes = {},
                funcs = [],
                self = this;

            this.requestScheduler.subscribe(this.requestScheduler.eventList.ENAME_SCHEDULED_TIME_OCCURED, this.abrController);
            // Figure out some bits about the stream before building anything.
            //self.debug.log("Gathering information for buffers. (1)");

            funcs.push(initializeMediaForType.call(self, "video", manifest, periodInfo.index));
            funcs.push(initializeMediaForType.call(self, "audio", manifest, periodInfo.index));
            funcs.push(initializeMediaForType.call(self, "text", manifest, periodInfo.index));

            Q.all(funcs).then(
                function(initializedTypesValues) {
                    for (var i = 0; i < initializedTypesValues.length; i += 1) {
                        initializedTypes[initializedTypesValues[i]] = true;
                        checkIfInitialized.call(self, initializedTypes.video, initializedTypes.audio, initializedTypes.text, initialize);
                    }
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

            this.playbackController.seek(initialSeekTime);

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

        onSeeking = function (sender, seekingTime) {
            //this.debug.log("Got seeking event.");
            startBuffering(seekingTime);
        },

        onSeeked = function () {
            //this.debug.log("Seek complete.");
            this.playbackController.subscribe(this.playbackController.eventList.ENAME_PLAYBACK_SEEKING, this);
            this.playbackController.unsubscribe(this.playbackController.eventList.ENAME_PLAYBACK_SEEKED, this);
        },

        onProgress = function () {
            //this.debug.log("Got timeupdate event.");
            updateBuffer.call(this);
        },

        onTimeupdate = function () {
            updateBuffer.call(this);
        },

        onRatechange = function() {
            var processors = getAudioVideoProcessors(),
                ln = processors.length,
                i = 0;

            for (i; i < ln; i += 1) {
                processors[i].updateStalledState();
            }
        },

        updateBuffer = function() {
            var processors = getAudioVideoProcessors(),
                ln = processors.length,
                i = 0;

            for (i; i < ln; i += 1) {
                processors[i].updateBufferState();
            }
        },

        startBuffering = function(time) {
            var processors = getAudioVideoProcessors(),
                ln = processors.length,
                i = 0,
                processor;

            for (i; i < ln; i += 1) {
                processor = processors[i];
                if (time === undefined) {
                    processor.start();
                } else {
                    processor.seek(time);
                }
            }
        },

        stopBuffering = function() {
            var processors = getAudioVideoProcessors(),
                ln = processors.length,
                i = 0;

            for (i; i < ln; i += 1) {
                processors[i].stop();
            }
        },

        suspend = function() {
            if (!this.scheduleWhilePaused || this.manifestExt.getIsDynamic(manifest)) {
                stopBuffering.call(this);
            }
        },

        updateCurrentTime = function() {
            if (this.playbackController.isPaused()) return;

            var currentTime = this.playbackController.getTime(),
                representation = streamProcessors[0].getCurrentRepresentation(),
                actualTime = this.timelineConverter.calcActualPresentationTime(representation, currentTime, this.manifestExt.getIsDynamic(manifest)),
                timeChanged = (!isNaN(actualTime) && actualTime !== currentTime);

            if (timeChanged) {
                this.playbackController.seek(actualTime);
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
                        if (autoPlay) {
                            play.call(self);
                        }
                    }
                }
            );
        },

        currentTimeChanged = function () {
            this.debug.log("Current time has changed, block programmatic seek.");

            this.playbackController.unsubscribe(this.playbackController.eventList.ENAME_PLAYBACK_SEEKING, this);
            this.playbackController.subscribe(this.playbackController.eventList.ENAME_PLAYBACK_SEEKED, this);
        },

        onBufferingCompleted = function() {
            var processors = getAudioVideoProcessors(),
                ln = processors.length,
                i = 0;

            // if there is at least one buffer controller that has not completed buffering yet do nothing
            for (i; i < ln; i += 1) {
                if (!processors[i].isBufferingCompleted()) return;
            }

            // buffering has been complted, now we can signal end of stream
            if (mediaSource) {
                this.mediaSourceExt.signalEndOfStream(mediaSource);
            }
        },

        onDataUpdateCompleted = function(/*sender, data, representation*/) {
            var self = this,
                ln = streamProcessors.length,
                i = 0;

            if (!initialized) return;

            for (i; i < ln; i += 1) {
                if (streamProcessors[i].isUpdating()) return;
            }

            updateCurrentTime.call(self);
            updating = false;
            self.notify(self.eventList.ENAME_STREAM_UPDATED);
        },

        getAudioVideoProcessors = function() {
            var arr = [],
                i = 0,
                ln = streamProcessors.length,
                type,
                proc;

            for (i; i < ln; i += 1) {
                proc = streamProcessors[i];
                type = proc.getType();

                if (type === "audio" || type === "video") {
                    arr.push(proc);
                }
            }

            return arr;
        },

        updateData = function (updatedPeriodInfo) {
            var self = this,
                ln = streamProcessors.length,
                i = 0,
                idx,
                data,
                processor,
                onDataReceived;

            updating = true;
            manifest = self.manifestModel.getValue();
            periodInfo = updatedPeriodInfo;
            self.debug.log("Manifest updated... set new data on buffers.");

            for (i; i < ln; i +=1) {
                processor = streamProcessors[i];
                data = processor.getData();
                idx = processor.getDataIndex();
                onDataReceived = (function(p) {
                    return function(data) {
                        p.updateData(data, periodInfo);
                    };
                })(processor);

                if (!!data && data.hasOwnProperty("id")) {
                    self.manifestExt.getDataForId(data.id, manifest, periodInfo.index).then(onDataReceived);
                } else {
                    self.manifestExt.getDataForIndex(idx, manifest, periodInfo.index).then(onDataReceived);
                }
            }
        };

    return {
        system: undefined,
        manifestModel: undefined,
        mediaSourceExt: undefined,
        sourceBufferExt: undefined,
        manifestExt: undefined,
        fragmentController: undefined,
        playbackController: undefined,
        protectionModel: undefined,
        protectionController: undefined,
        protectionExt: undefined,
        capabilities: undefined,
        debug: undefined,
        errHandler: undefined,
        timelineConverter: undefined,
        requestScheduler: undefined,
        abrController: undefined,
        scheduleWhilePaused: undefined,
        eventList: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        setup: function () {
            this.bufferingCompleted = onBufferingCompleted;
            this.dataUpdateCompleted = onDataUpdateCompleted;

            load = Q.defer();

            this.playbackStarted = onPlay;
            this.playbackPaused = onPause;
            this.playbackError = onError;
            this.playbackSeeking = onSeeking;
            this.playbackSeeked = onSeeked;
            this.playbackProgress = onProgress;
            this.playbackRateChanged = onRatechange;
            this.playbackTimeUpdated = onTimeupdate;
            this.playbackMetaDataLoaded = onLoad;
        },

        load: function(manifest) {
            doLoad.call(this, manifest);
        },

        setVideoModel: function(value) {
            this.videoModel = value;
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

            tearDownMediaSource.call(this);
            if (!!this.protectionController) {
                this.protectionController.teardownKeySystem(kid);
            }

            this.requestScheduler.unsubscribe(this.requestScheduler.eventList.ENAME_SCHEDULED_TIME_OCCURED, this.abrController);
            this.protectionController = undefined;
            this.protectionModel = undefined;
            this.fragmentController = undefined;
            this.requestScheduler = undefined;
            this.playbackController.reset();
            this.playbackController = undefined;

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

        setPeriodInfo: function(period) {
            periodInfo = period;
        },

        getPeriodInfo: function() {
            return periodInfo;
        },

        setPlaybackController: function(value) {
            this.playbackController = value;
            value.initialize(periodInfo, this.videoModel);
        },

        getPlaybackController: function() {
            return this.playbackController;
        },

        isUpdating: function() {
            return updating;
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
