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
        mediaInfos = {},
        streamProcessors = [],
        autoPlay = true,
        initialized = false,
        loaded = false,
        errored = false,
        kid = null,
        initData = [],
        updating = true,
        streamInfo = null,

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
                mediaInfo = mediaInfos.video,
                videoCodec = mediaInfos ? mediaInfos.video.codec : null,
                type;

            type = (event.type !== "msneedkey") ? event.type : videoCodec;
            initData.push({type: type, initData: event.initData});

            this.debug.log("DRM: Key required for - " + type);
            //this.debug.log("DRM: Generating key request...");
            //this.protectionModel.generateKeyRequest(DEFAULT_KEY_TYPE, event.initData);
            if (mediaInfo && !!videoCodec && !kid) {
                try
                {
                    kid = self.protectionController.selectKeySystem(mediaInfo);
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

            mediaInfos = {};

            mediaSource = null;
            manifest = null;
        },

        initializeMediaForType = function(type, manifest) {
            var self = this,
                mimeType,
                codec,
                getCodecOrMimeType = function(mediaInfo) {
                    return mediaInfo.codec;
                },
                processor,
                mediaInfo = self.adapter.getMediaInfoForType(manifest, streamInfo, type);

            if (type === "text") {
                console.log('Skipping');
                console.log(type);
                console.log(manifest);
                return;
                getCodecOrMimeType = function(mediaInfo) {
                    mimeType = mediaInfo.mimeType;

                    return mimeType;
                };
            }

            if (mediaInfo !== null) {
                //self.debug.log("Create " + type + " buffer.");
                var codecOrMime = getCodecOrMimeType.call(self, mediaInfo),
                    contentProtectionData,
                    buffer = null;

                if (codecOrMime === mimeType) {
                    try{
                        buffer = self.sourceBufferExt.createSourceBuffer(mediaSource, mediaInfo);
                    } catch (e) {
                        self.errHandler.mediaSourceError("Error creating " + type +" source buffer.");
                    }
                } else {
                    codec = codecOrMime;
                    self.debug.log(type + " codec: " + codec);
                    mediaInfos[type] = mediaInfo;

                    contentProtectionData = mediaInfo.contentProtection;

                    if (!!contentProtectionData && !self.capabilities.supportsMediaKeys()) {
                        self.errHandler.capabilityError("mediakeys");
                    } else {
                        //kid = self.protectionController.selectKeySystem(codec, contentProtection);
                        //self.protectionController.ensureKeySession(kid, codec, null);

                        if (!self.capabilities.supportsCodec(self.videoModel.getElement(), codec)) {
                            var msg = type + "Codec (" + codec + ") is not supported.";
                            self.errHandler.manifestError(msg, "codec", manifest);
                            self.debug.log(msg);
                        } else {
                            try {
                                buffer = self.sourceBufferExt.createSourceBuffer(mediaSource, mediaInfo);
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
                    streamProcessors.push(processor);
                    processor.initialize(mimeType || type, buffer, self.videoModel, self.fragmentController, self.playbackController, mediaSource, self, eventController);
                    processor.setMediaInfo(mediaInfo);
                    self.adapter.updateData(processor);
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
            events = self.adapter.getEventsFor(streamInfo);
            eventController.addInlineEvents(events);
            // Figure out some bits about the stream before building anything.
            //self.debug.log("Gathering information for buffers. (1)");

            initializeMediaForType.call(self, "video", manifest);
            initializeMediaForType.call(self, "audio", manifest);
            initializeMediaForType.call(self, "text", manifest);

            //this.debug.log("MediaSource initialized!");
        },

        initializePlayback = function () {
            var self = this,
                manifestDuration,
                mediaDuration;

            //self.debug.log("Getting ready for playback...");

            manifestDuration = streamInfo.manifestInfo.duration;
            mediaDuration = self.mediaSourceExt.setDuration(mediaSource, manifestDuration);
            self.debug.log("Duration successfully set to: " + mediaDuration);
            initialized = true;
            checkIfInitializationCompleted.call(self);
        },

        onLoad = function () {
            this.debug.log("element loaded!");
            loaded = true;
            startAutoPlay.call(this);
        },

        startAutoPlay = function() {
            if (!initialized || !loaded) return;

            // only first stream must be played automatically during playback initialization
            if (streamInfo.index === 0) {
                eventController.start();
                if (autoPlay) {
                    play.call(this);
                }
            }
        },

        checkIfInitializationCompleted = function() {
            var self = this,
                ln = streamProcessors.length,
                i = 0;

            if (!initialized) return;

            for (i; i < ln; i += 1) {
                console.log(streamProcessors[i]);
                if (streamProcessors[i].isUpdating()) return;
            }

            updating = false;
            self.notify(self.eventList.ENAME_STREAM_UPDATED);
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

                    if (streamProcessors.length === 0) {
                        var msg = "No streams to play.";
                        self.errHandler.manifestError(msg, "nostreams", manifest);
                        self.debug.log(msg);
                    } else {
                        console.log('Starting ');
                        console.log(streamProcessors[0].getType());
                        self.liveEdgeFinder.initialize(streamProcessors[0]);
                        self.liveEdgeFinder.subscribe(self.liveEdgeFinder.eventList.ENAME_LIVE_EDGE_FOUND, self.playbackController);
                        initializePlayback.call(self);
                        //self.debug.log("Playback initialized!");
                        startAutoPlay.call(self);
                    }
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

        onDataUpdateCompleted = function(/*sender, mediaData, trackData*/) {
            checkIfInitializationCompleted.call(this);
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

        updateData = function (updatedStreamInfo) {
            var self = this,
                ln = streamProcessors.length,
                i = 0,
                mediaInfo,
                events,
                processor;

            updating = true;
            manifest = self.manifestModel.getValue();
            streamInfo = updatedStreamInfo;
            self.debug.log("Manifest updated... set new data on buffers.");

            if (eventController) {
                events = self.adapter.getEventsFor(streamInfo);
                eventController.addInlineEvents(events);
            }

            for (i; i < ln; i +=1) {
                processor = streamProcessors[i];
                mediaInfo = self.adapter.getMediaInfoForType(manifest, streamInfo, processor.getType());
                processor.setMediaInfo(mediaInfo);
                this.adapter.updateData(processor);
            }
        };

    return {
        system: undefined,
        manifestModel: undefined,
        mediaSourceExt: undefined,
        sourceBufferExt: undefined,
        adapter: undefined,
        fragmentController: undefined,
        playbackController: undefined,
        protectionModel: undefined,
        protectionController: undefined,
        protectionExt: undefined,
        capabilities: undefined,
        debug: undefined,
        errHandler: undefined,
        liveEdgeFinder: undefined,
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

            if (this.protectionModel) {
                this.protectionExt.unsubscribe(this.protectionExt.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, this.protectionModel);
            }

            this.protectionExt.unsubscribe(this.protectionExt.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, this);
            this.protectionController = undefined;
            this.protectionModel = undefined;
            this.fragmentController = undefined;
            this.playbackController.unsubscribe(this.playbackController.eventList.ENAME_PLAYBACK_ERROR, this);
            this.playbackController.unsubscribe(this.playbackController.eventList.ENAME_PLAYBACK_METADATA_LOADED, this);
            this.playbackController.reset();
            this.liveEdgeFinder.abortSearch();
            this.liveEdgeFinder.unsubscribe(this.liveEdgeFinder.eventList.ENAME_LIVE_EDGE_FOUND, this.playbackController);

            // streamcontroller expects this to be valid
            //this.videoModel = null;

            loaded = false;
        },

        getDuration: function () {
            return streamInfo.duration;
        },

        getStartTime: function() {
            return streamInfo.start;
        },

        getStreamIndex: function() {
            return streamInfo.index;
        },

        getId: function() {
            return streamInfo.id;
        },

        setStreamInfo: function(stream) {
            streamInfo = stream;
        },

        getStreamInfo: function() {
            return streamInfo;
        },
        startEventController: function() {
            eventController.start();
        },
        resetEventController: function() {
            eventController.reset();
        },

        setPlaybackController: function(value) {
            this.playbackController = value;
            value.initialize(streamInfo, this.videoModel);
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
