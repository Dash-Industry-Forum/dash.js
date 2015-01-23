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
        updateError = {},

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

        onNeedKey = function (event) {
            try {
                var mediaInfo = mediaInfos.video,
                    initData = this.protectionExt.autoSelectKeySystem(this.protectionModel, mediaInfo, event.data.initData);

                if (!!this.keySystem && this.keySystem !== this.protectionModel.keySystem) {
                    throw new Error("DRM:  Changing key systems within a single Period is not allowed!");
                }
                if (!this.keySystem) {
                    this.keySystem = this.protectionModel.keySystem;
                    this.protectionModel.keySystem.subscribe(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE, this);
                }
                this.debug.log("DRM: Key required for - " + mediaInfo.codec);
                this.protectionController.createKeySession(initData, mediaInfo.codec);
            } catch (error) { // Thrown when media key system is not supported
                this.errHandler.mediaKeySessionError(error.message);
                this.debug.log(error.message);
                this.reset();
            }
        },

        onKeyAdded = function (/*event*/) {
            this.debug.log("DRM: Key added.");
        },

        onLicenseRequestComplete = function(e) {
            if (e.error) {
                pause.call(this);
                this.debug.log(e.error);
                this.errHandler.mediaKeyMessageError(e.error);
            } else {
                this.debug.log("DRM: License request successful.  Session ID = " + e.data.requestData.sessionID);
                this.protectionController.updateKeySession(e.data.requestData, e.data.message);
            }
        },

        onKeyError = function (event) {
            var session = event.data.sessionToken,
                sessionID = (session.sessionID) ? session.sessionID : "NONE",
                msg;
            msg = 'DRM: MediaKeyError - sessionId: ' + sessionID + '.  ' + event.data.error;
            //pause.call(this);
            this.debug.log(msg);
            this.errHandler.mediaKeySessionError(msg);
        },

        onKeySessionCreated = function(event) {
            this.debug.log("DRM: Session created.  SessionID = " + event.data.sessionID);
        },

        onKeySessionLoaded = function(event) {
            this.debug.log("DRM: Session loaded.  SessionID = " + event.data.sessionID);
        },

        onKeySessionUnloaded = function(event) {
            this.debug.log("DRM: Session unloaded.  SessionID = " + event.data.sessionID);
        },

        onKeySessionClosed = function(event) {
            this.debug.log("DRM: Session closed.  SessionID = " + event.data.sessionID);
        },

        // Media Source

        setUpMediaSource = function (mediaSourceArg, callback) {
            var self = this,
                sourceUrl,

                onMediaSourceOpen = function (e) {
                    self.debug.log("MediaSource is open!");
                    self.debug.log(e);
                    window.URL.revokeObjectURL(sourceUrl);

                    mediaSourceArg.removeEventListener("sourceopen", onMediaSourceOpen);
                    mediaSourceArg.removeEventListener("webkitsourceopen", onMediaSourceOpen);

                    callback(mediaSourceArg);
                };

            //self.debug.log("MediaSource should be closed. The actual readyState is: " + mediaSourceArg.readyState);

            mediaSourceArg.addEventListener("sourceopen", onMediaSourceOpen, false);
            mediaSourceArg.addEventListener("webkitsourceopen", onMediaSourceOpen, false);

            sourceUrl = self.mediaSourceExt.attachMediaSource(mediaSourceArg, self.videoModel);

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

                    if (!!contentProtectionData && !self.capabilities.supportsEncryptedMedia()) {
                        self.errHandler.capabilityError("encryptedmedia");
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

        onLoad = function (/*e*/) {
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
                hasError = !!updateError.audio || !!updateError.video,
                error = hasError ? new MediaPlayer.vo.Error(MediaPlayer.dependencies.Stream.DATA_UPDATE_FAILED_ERROR_CODE, "Data update failed", null) : null,
                i = 0;

            if (!initialized) return;

            for (i; i < ln; i += 1) {
                if (streamProcessors[i].isUpdating()) return;
            }

            updating = false;
            self.notify(MediaPlayer.dependencies.Stream.eventList.ENAME_STREAM_UPDATED, null, error);
        },

        onError = function (e) {
            var code = e.data.error.code,
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
            this.debug.log(e.error);
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
                        self.liveEdgeFinder.initialize(streamProcessors[0]);
                        self.liveEdgeFinder.subscribe(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, self.playbackController);
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

        onBufferingCompleted = function(/*e*/) {
            var processors = getAudioVideoProcessors(),
                ln = processors.length,
                i = 0;

            // if there is at least one buffer controller that has not completed buffering yet do nothing
            for (i; i < ln; i += 1) {
                if (!processors[i].isBufferingCompleted()) return;
            }

            // buffering has been complted, now we can signal end of stream
            if (mediaSource && streamInfo.isLast) {
                this.mediaSourceExt.signalEndOfStream(mediaSource);
            }
        },

        onDataUpdateCompleted = function(e) {
            var type = e.sender.streamProcessor.getType();

            updateError[type] = e.error;

            checkIfInitializationCompleted.call(this);
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
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFERING_COMPLETED] = onBufferingCompleted;
            this[Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED] = onDataUpdateCompleted;
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_ERROR] = onError;
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_METADATA_LOADED] = onLoad;

            // Protection event handlers
            this[MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE] = onLicenseRequestComplete.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_NEED_KEY] = onNeedKey.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ADDED] = onKeyAdded.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ERROR] = onKeyError.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CREATED] = onKeySessionCreated.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_LOADED] = onKeySessionLoaded.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_UNLOADED] = onKeySessionUnloaded.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CLOSED] = onKeySessionClosed.bind(this);
        },

        load: function(manifest) {
            doLoad.call(this, manifest);
        },

        setVideoModel: function(value) {
            this.videoModel = value;
        },

        initProtection: function() {
            if (this.capabilities.supportsEncryptedMedia()) {
                this.protectionModel = this.system.getObject("protectionModel");
                this.protectionModel.init(this.getVideoModel());
                this.protectionModel.setMediaElement(this.videoModel.getElement());
                this.protectionController = this.system.getObject("protectionController");
                this.protectionController.init(this.protectionModel);

                this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_NEED_KEY, this);
                this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ADDED, this);
                this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ERROR, this);
                this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CREATED, this);
                this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_LOADED, this);
                this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_UNLOADED, this);
                this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CLOSED, this);
            }
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

            if (!!this.protectionModel) {
                this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_NEED_KEY, this);
                this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ADDED, this);
                this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ERROR, this);
                this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CREATED, this);
                this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_LOADED, this);
                this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_UNLOADED, this);
                this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CLOSED, this);
                if (!!this.keySystem) {
                    this.keySystem.unsubscribe(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE, this);
                    this.keySystem = undefined;
                }

                this.protectionController.teardown();
                this.protectionModel.teardown();
                this.protectionController = undefined;
                this.protectionModel = undefined;
            }

            tearDownMediaSource.call(this);

            this.fragmentController = undefined;
            this.playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_ERROR, this);
            this.playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_METADATA_LOADED, this);
            this.playbackController.reset();
            this.liveEdgeFinder.abortSearch();
            this.liveEdgeFinder.unsubscribe(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, this.playbackController);

            // streamcontroller expects this to be valid
            //this.videoModel = null;

            loaded = false;
            updateError = {};
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

MediaPlayer.dependencies.Stream.DATA_UPDATE_FAILED_ERROR_CODE = 1;

MediaPlayer.dependencies.Stream.eventList = {
    ENAME_STREAM_UPDATED: "streamUpdated"
};
