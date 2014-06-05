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
        loaded = false,
        errored = false,
        kid = null,
        initData = [],
        updating = true,
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

            this.playbackController.seek(time);
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

            self.protectionController.updateFromMessage(kid, session, msg, laURL);

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

        setUpMediaSource = function (mediaSourceArg, callback) {
            var self = this,

                onMediaSourceOpen = function (e) {
                    self.debug.log("MediaSource is open!");
                    self.debug.log(e);

                    mediaSourceArg.removeEventListener("sourceopen", onMediaSourceOpen);
                    mediaSourceArg.removeEventListener("webkitsourceopen", onMediaSourceOpen);

                    callback(mediaSourceArg);
                };

            //self.debug.log("MediaSource should be closed. The actual readyState is: " + mediaSourceArg.readyState);

            mediaSourceArg.addEventListener("sourceopen", onMediaSourceOpen, false);
            mediaSourceArg.addEventListener("webkitsourceopen", onMediaSourceOpen, false);

            self.mediaSourceExt.attachMediaSource(mediaSourceArg, self.videoModel);

            //self.debug.log("MediaSource attached to video.  Waiting on open...");
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
            if(!!eventController) {
                eventController.reset();
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

        initializeMediaForType = function(type, manifest, periodIndex) {
            var self = this,
                mimeType,
                codec,
                getCodecOrMimeType = function(mediaData) {
                    return self.manifestExt.getCodec(mediaData);
                },
                processor,
                mediaData;

            if (type === "text") {
                getCodecOrMimeType = function(mediaData) {
                    mimeType = self.manifestExt.getMimeType(mediaData);

                    return mimeType;
                };
            }

            mediaData = self.manifestExt.getDataForType(manifest, periodIndex, type);

            if (mediaData !== null) {
                //self.debug.log("Create " + type + " buffer.");
                var codecOrMime = getCodecOrMimeType.call(self, mediaData),
                    contentProtectionData,
                    buffer = null;

                if (codecOrMime === mimeType) {
                    try{
                        buffer = self.sourceBufferExt.createSourceBuffer(mediaSource, mimeType);
                    } catch (e) {
                        self.errHandler.mediaSourceError("Error creating " + type +" source buffer.");
                    }
                } else {
                    codec = codecOrMime;
                    self.debug.log(type + " codec: " + codec);
                    codecs[type] = codec;

                    contentProtectionData = self.manifestExt.getContentProtectionData(mediaData);

                    if (!!contentProtectionData && !self.capabilities.supportsMediaKeys()) {
                        self.errHandler.capabilityError("mediakeys");
                    } else {
                        contentProtection = contentProtectionData;

                        //kid = self.protectionController.selectKeySystem(codec, contentProtection);
                        //self.protectionController.ensureKeySession(kid, codec, null);

                        if (!self.capabilities.supportsCodec(self.videoModel.getElement(), codec)) {
                            var msg = type + "Codec (" + codec + ") is not supported.";
                            self.errHandler.manifestError(msg, "codec", manifest);
                            self.debug.log(msg);
                        } else {
                            try {
                                buffer = self.sourceBufferExt.createSourceBuffer(mediaSource, codec);
                            } catch (e) {
                                self.errHandler.mediaSourceError("Error creating " + type +" source buffer.");
                            }
                        }
                    }
                }

                if (buffer === null) {
                    self.debug.log("No buffer was created, skipping " + type + " data.");
                } else {
                    // TODO : How to tell index handler live/duration?
                    // TODO : Pass to controller and then pass to each method on handler?

                    processor = self.system.getObject("streamProcessor");
                    processor.initialize(mimeType || type, buffer, self.videoModel, self.requestScheduler, self.fragmentController, self.playbackController, mediaSource, mediaData, periodInfo, self, eventController);
                    streamProcessors.push(processor);
                    //self.debug.log(type + " is ready!");
                }


            } else {
                self.debug.log("No " + type + " data.");
            }
        },

        initializeMediaSource = function () {
            //this.debug.log("Getting MediaSource ready...");

            var self = this,
                events;

            eventController = self.system.getObject("eventController");
            eventController.initialize(self.videoModel);
            events = self.manifestExt.getEventsForPeriod(manifest,periodInfo);
            eventController.addInlineEvents(events);
            // Figure out some bits about the stream before building anything.
            //self.debug.log("Gathering information for buffers. (1)");

            initializeMediaForType.call(self, "video", manifest, periodInfo.index);
            initializeMediaForType.call(self, "audio", manifest, periodInfo.index);
            initializeMediaForType.call(self, "text", manifest, periodInfo.index);

            if (streamProcessors.length === 0) {
                var msg = "No streams to play.";
                this.errHandler.manifestError(msg, "nostreams", manifest);
                this.debug.log(msg);
            }
            //this.debug.log("MediaSource initialized!");
        },

        initializePlayback = function () {
            var self = this,
                manifestDuration,
                mediaDuration;

            //self.debug.log("Getting ready for playback...");

            manifestDuration = self.manifestExt.getDuration(self.manifestModel.getValue(), periodInfo);
            mediaDuration = self.mediaSourceExt.setDuration(mediaSource, manifestDuration);
            self.debug.log("Duration successfully set to: " + mediaDuration);
            initialized = true;
        },

        onLoad = function () {
            this.debug.log("element loaded!");
            loaded = true;
            startAutoPlay.call(this);
        },

        startAutoPlay = function() {
            if (!initialized || !loaded) return;

            // only first period stream must be played automatically during playback initialization
            if (periodInfo.index === 0) {
                eventController.start();
                if (autoPlay) {
                    play.call(this);
                }
            }
        },

        onError = function (sender, error) {
            var code = error.code,
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

        doLoad = function (manifestResult) {

            var self = this,
                onMediaSourceSetup = function (mediaSourceResult) {
                    mediaSource = mediaSourceResult;
                    //self.debug.log("MediaSource set up.");
                    initializeMediaSource.call(self);
                    initializePlayback.call(self);
                    //self.debug.log("Playback initialized!");
                    startAutoPlay.call(self);
                },
                mediaSourceResult;

            //self.debug.log("Stream start loading.");

            manifest = manifestResult;
            mediaSourceResult = self.mediaSourceExt.createMediaSource();
            //self.debug.log("MediaSource created.");

            setUpMediaSource.call(self, mediaSourceResult, onMediaSourceSetup);
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

            updating = false;
            self.notify(self.eventList.ENAME_STREAM_UPDATED);
        },

        onKeySystemUpdateCompleted = function(sender, data, error) {
            if (!error) return;

            pause.call(this);
            this.debug.log(error);
            this.errHandler.mediaKeyMessageError(error);
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
                oldData,
                newData,
                events,
                processor;

            updating = true;
            manifest = self.manifestModel.getValue();
            periodInfo = updatedPeriodInfo;
            self.debug.log("Manifest updated... set new data on buffers.");

            if (eventController) {
                events = self.manifestExt.getEventsForPeriod(manifest,periodInfo);
                eventController.addInlineEvents(events);
            }

            for (i; i < ln; i +=1) {
                processor = streamProcessors[i];
                oldData = processor.getData();
                idx = processor.getDataIndex();

                if (!!oldData && oldData.hasOwnProperty("id")) {
                    newData = self.manifestExt.getDataForId(oldData.id, manifest, periodInfo.index);
                } else {
                    newData = self.manifestExt.getDataForIndex(idx, manifest, periodInfo.index);
                }

                processor.updateData(newData, periodInfo);
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
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,
        eventList: {
            ENAME_STREAM_UPDATED: "streamUpdated"
        },

        setup: function () {
            this.bufferingCompleted = onBufferingCompleted;
            this.dataUpdateCompleted = onDataUpdateCompleted;
            this.playbackError = onError;
            this.playbackMetaDataLoaded = onLoad;
            this.keySystemUpdateCompleted = onKeySystemUpdateCompleted;
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

            this.protectionExt.subscribe(this.protectionExt.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, this.protectionModel);
            this.protectionExt.subscribe(this.protectionExt.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, this);
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

            this.protectionExt.unsubscribe(this.protectionExt.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, this.protectionModel);
            this.protectionExt.unsubscribe(this.protectionExt.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, this);
            this.protectionController = undefined;
            this.protectionModel = undefined;
            this.fragmentController = undefined;
            this.playbackController.unsubscribe(this.playbackController.eventList.ENAME_PLAYBACK_ERROR, this);
            this.playbackController.unsubscribe(this.playbackController.eventList.ENAME_PLAYBACK_METADATA_LOADED, this);
            this.playbackController.reset();

            // streamcontroller expects this to be valid
            //this.videoModel = null;

            loaded = false;
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
        startEventController: function() {
            eventController.start();
        },
        resetEventController: function() {
            eventController.reset();
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
