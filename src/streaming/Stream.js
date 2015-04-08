/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.dependencies.Stream = function () {
    "use strict";

    var manifest,
        mediaSource,
        mediaInfos = {},
        streamProcessors = [],
        autoPlay = true,
        initialized = false,
        canPlay = false,
        errored = false,
        kid = null,
        updating = true,
        streamInfo = null,
        updateError = {},
        videoModel,
        playbackController,

        eventController = null,

        play = function () {
            //this.log("Attempting play...");

            if (!initialized) {
                return;
            }

            //this.log("Do play.");
            playbackController.start();
        },

        pause = function () {
            //this.log("Do pause.");
            playbackController.pause();
        },

        seek = function (time) {
            //this.log("Attempting seek...");

            if (!initialized) {
                return;
            }

            this.log("Do seek: " + time);

            playbackController.seek(time);
        },

        // Encrypted Media Extensions
        pendingNeedKeyData = [],
        keySystem = null,

        handleEMEError = function(message) {
            this.errHandler.mediaKeySessionError(message);
            this.log(message);
            this.reset();
        },

        createSession = function(needKeyInitData) {
            var initData = MediaPlayer.dependencies.protection.CommonEncryption.getPSSHForKeySystem(keySystem, needKeyInitData);
            if (initData) {
                try {
                    this.protectionController.createKeySession(initData, "temporary");
                } catch (error) {
                    handleEMEError.call(this, "Error creating key session! " + error.message);
                }
            } else {
                handleEMEError.call(this,"Selected key system is " + keySystem.systemString + ".  needkey/encrypted event contains no initData corresponding to that key system!");
            }
        },

        onNeedKey = function (event) {
            // Ignore non-cenc initData
            if (event.data.initDataType !== "cenc") {
                this.log("DRM:  Only 'cenc' initData is supported!  Ignoring initData of type: " + event.data.initDataType);
                return;
            }

            // Some browsers return initData as Uint8Array (IE), some as ArrayBuffer (Chrome).
            // Convert to ArrayBuffer
            var abInitData = event.data.initData;
            if (ArrayBuffer.isView(abInitData)) {
                abInitData = abInitData.buffer;
            }

            if (keySystem) {
                // We have a key system
                createSession.call(this, abInitData);
            }
            else if (keySystem === undefined) {
                // First time through, so we need to select a key system
                keySystem = null;
                pendingNeedKeyData.push(abInitData);
                try {
                    this.protectionExt.autoSelectKeySystem(this.protectionExt.getSupportedKeySystems(abInitData),
                            this.protectionModel, this.protectionController, mediaInfos.video, mediaInfos.audio);
                } catch (error) {
                    handleEMEError.call(this, error.message);
                }
            } else {
                // We are in the process of selecting a key system, so just save the data
                pendingNeedKeyData.push(abInitData);
            }
        },

        // This event handler is only used when initData is present in the media (i.e we
        // are responding to needkey events).  If initData is present in the MPD, the
        // handler in initProtection() is used instead
        onKeySystemSelected = function() {
            // ProtectionModel now has an associated KeySystem.  Process any pending initData
            // generated by needkey/encrypted events
            if (!keySystem) {
                keySystem = this.protectionModel.keySystem;
            }
            for (var i = 0; i < pendingNeedKeyData.length; i++) {
                createSession.call(this, pendingNeedKeyData[i]);
            }
            pendingNeedKeyData = [];
        },

        onServerCertificateUpdated = function(event) {
            if (!event.error) {
                this.log("DRM: License server certificate successfully updated.");
            } else {
                handleEMEError.call(this, event.error);
            }
        },

        onKeySessionCreated = function(event) {
            if (!event.error) {
                this.log("DRM: Session created.  SessionID = " + event.data.getSessionID());
            } else {
                handleEMEError.call(this, event.error);
            }
        },

        onKeyAdded = function (/*event*/) {
            this.log("DRM: Key added.");
        },

        onKeyError = function (event) {
            var session = event.data.sessionToken,
                msg;
            msg = 'DRM: MediaKeyError - sessionId: ' + session.getSessionID() + '.  ' + event.data.error;
            handleEMEError.call(this, msg);
        },

        onKeySessionClosed = function(event) {
            if (!event.error) {
                this.log("DRM: Session closed.  SessionID = " + event.data);
            } else {
                this.log(event.data.error);
            }
        },

        onKeySessionRemoved = function(event) {
            if (!event.error) {
                this.log("DRM: Session removed.  SessionID = " + event.data);
            } else {
                this.log(event.data.error);
            }
        },

        // Media Source

        setUpMediaSource = function (mediaSourceArg, callback) {
            var self = this,
                sourceUrl,

                onMediaSourceOpen = function (e) {
                    self.log("MediaSource is open!");
                    self.log(e);
                    window.URL.revokeObjectURL(sourceUrl);

                    mediaSourceArg.removeEventListener("sourceopen", onMediaSourceOpen);
                    mediaSourceArg.removeEventListener("webkitsourceopen", onMediaSourceOpen);

                    callback(mediaSourceArg);
                };

            //self.log("MediaSource should be closed. The actual readyState is: " + mediaSourceArg.readyState);

            mediaSourceArg.addEventListener("sourceopen", onMediaSourceOpen, false);
            mediaSourceArg.addEventListener("webkitsourceopen", onMediaSourceOpen, false);

            sourceUrl = self.mediaSourceExt.attachMediaSource(mediaSourceArg, videoModel);

            //self.log("MediaSource attached to video.  Waiting on open...");
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
                self.mediaSourceExt.detachMediaSource(videoModel);
            }

            initialized = false;

            kid = null;

            mediaInfos = {};

            mediaSource = null;
        },

        initializeMediaForType = function(type) {
            var self = this,
                mimeType = null,
                codec,
                getCodecOrMimeType = function(mediaInfo) {
                    return mediaInfo.codec;
                },
                createBuffer = function(mediaSource, mediaInfo) {
                    var buffer = null;

                    try{
                        buffer = self.sourceBufferExt.createSourceBuffer(mediaSource, mediaInfo);
                    } catch (e) {
                        self.errHandler.mediaSourceError("Error creating " + type +" source buffer.");
                    }

                    return buffer;
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
                //self.log("Create " + type + " buffer.");
                var codecOrMime = getCodecOrMimeType.call(self, mediaInfo),
                    contentProtectionData,
                    buffer = null;

                if ((type === "text")||(type === "fragmentedText")) {
                        buffer = createBuffer(mediaSource, mediaInfo);
                } else {
                    codec = codecOrMime;
                    self.log(type + " codec: " + codec);
                    mediaInfos[type] = mediaInfo;

                    contentProtectionData = mediaInfo.contentProtection;

                    if (!!contentProtectionData && !self.capabilities.supportsEncryptedMedia()) {
                        self.errHandler.capabilityError("encryptedmedia");
                    } else {
                        //kid = self.protectionController.selectKeySystem(codec, contentProtection);
                        //self.protectionController.ensureKeySession(kid, codec, null);

                        if (!self.capabilities.supportsCodec(videoModel.getElement(), codec)) {
                            var msg = type + "Codec (" + codec + ") is not supported.";
                            self.errHandler.manifestError(msg, "codec", manifest);
                            self.log(msg);
                        } else {
                            buffer = createBuffer(mediaSource, mediaInfo);
                        }
                    }
                }

                if (buffer === null) {
                    self.log("No buffer was created, skipping " + type + " data.");
                } else {
                    // TODO : How to tell index handler live/duration?
                    // TODO : Pass to controller and then pass to each method on handler?

                    processor = self.system.getObject("streamProcessor");
                    streamProcessors.push(processor);
                    processor.initialize(mimeType || type, buffer, videoModel, self.fragmentController, playbackController, mediaSource, self, eventController);
                    processor.setMediaInfo(mediaInfo);
                    self.abrController.updateTopQualityIndex(mediaInfo);
                    self.adapter.updateData(manifest, processor);
                    if(type === "fragmentedText"){
                        processor.bufferController.videoModel = videoModel;
                        buffer.initialize(type,processor.bufferController);
                    }

                    //self.debug.log(type + " is ready!");
                }


            } else {
                self.log("No " + type + " data.");
            }
        },

        initializeMediaSource = function () {
            //this.log("Getting MediaSource ready...");

            var self = this,
                events;

            eventController = self.system.getObject("eventController");
            eventController.initialize(videoModel);
            events = self.adapter.getEventsFor(streamInfo);
            eventController.addInlineEvents(events);
            // Figure out some bits about the stream before building anything.
            //self.log("Gathering information for buffers. (1)");

            initializeMediaForType.call(self, "video");
            initializeMediaForType.call(self, "audio");
            initializeMediaForType.call(self, "text");
            initializeMediaForType.call(self, "fragmentedText");

            //this.log("MediaSource initialized!");
        },

        initializePlayback = function () {
            var self = this,
                manifestDuration,
                mediaDuration;

            //self.log("Getting ready for playback...");

            manifestDuration = streamInfo.manifestInfo.duration;
            mediaDuration = self.mediaSourceExt.setDuration(mediaSource, manifestDuration);
            self.log("Duration successfully set to: " + mediaDuration);
            initialized = true;
            checkIfInitializationCompleted.call(self);
        },

        onCanPlay = function (/*e*/) {
            this.log("element loaded!");
            canPlay = true;
            startAutoPlay.call(this);
        },

        startAutoPlay = function() {
            if (!initialized || !canPlay) return;

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

            self.eventBus.dispatchEvent({
                type: MediaPlayer.events.STREAM_INITIALIZED,
                data: {streamInfo: streamInfo}
            });

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

            this.log("Video Element Error: " + msg);
            this.log(e.error);
            this.errHandler.mediaSourceError(msg);
            this.reset();
        },

        doLoad = function () {

            var self = this,
                onMediaSourceSetup = function (mediaSourceResult) {
                    mediaSource = mediaSourceResult;
                    //self.log("MediaSource set up.");
                    initializeMediaSource.call(self);

                    if (streamProcessors.length === 0) {
                        var msg = "No streams to play.";
                        self.errHandler.manifestError(msg, "nostreams", manifest);
                        self.log(msg);
                    } else {
                        self.liveEdgeFinder.initialize(streamProcessors[0]);
                        self.liveEdgeFinder.subscribe(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, playbackController);
                        initializePlayback.call(self);
                        //self.log("Playback initialized!");
                        startAutoPlay.call(self);
                    }
                },
                mediaSourceResult;

            //self.log("Stream start loading.");

            mediaSourceResult = self.mediaSourceExt.createMediaSource();
            //self.log("MediaSource created.");

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
                processor,
                manifest = self.manifestModel.getValue();

            updating = true;
            streamInfo = updatedStreamInfo;
            self.log("Manifest updated... set new data on buffers.");

            if (eventController) {
                events = self.adapter.getEventsFor(streamInfo);
                eventController.addInlineEvents(events);
            }

            for (i; i < ln; i +=1) {
                processor = streamProcessors[i];
                mediaInfo = self.adapter.getMediaInfoForType(manifest, streamInfo, processor.getType());
                processor.setMediaInfo(mediaInfo);
                this.abrController.updateTopQualityIndex(mediaInfo);
                this.adapter.updateData(manifest, processor);
            }
        },

        initProtection = function() {
        };


    return {
        system: undefined,
        eventBus: undefined,
        manifestModel: undefined,
        mediaSourceExt: undefined,
        sourceBufferExt: undefined,
        adapter: undefined,
        fragmentController: undefined,
        protectionExt: undefined,
        capabilities: undefined,
        log: undefined,
        errHandler: undefined,
        liveEdgeFinder: undefined,
        abrController: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        setup: function () {
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFERING_COMPLETED] = onBufferingCompleted;
            this[Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED] = onDataUpdateCompleted;
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_ERROR] = onError;
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_CAN_PLAY] = onCanPlay;

            // Protection event handlers
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_NEED_KEY] = onNeedKey.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED] = onKeySystemSelected.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_SERVER_CERTIFICATE_UPDATED] = onServerCertificateUpdated.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ADDED] = onKeyAdded.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ERROR] = onKeyError.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CREATED] = onKeySessionCreated.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CLOSED] = onKeySessionClosed.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_REMOVED] = onKeySessionRemoved.bind(this);

            keySystem = undefined;
        },

        initialize: function(strmInfo, vModel, autoPl) {
            streamInfo = strmInfo;
            videoModel = vModel;
            playbackController = this.system.getObject("playbackController");
            playbackController.initialize(streamInfo, videoModel);
            playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_ERROR, this);
            playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_CAN_PLAY, this);
            autoPlay = autoPl;

            // Initialize protection system
            if (this.capabilities.supportsEncryptedMedia()) {
                this.protectionModel = this.system.getObject("protectionModel");
                this.protectionModel.init();
                this.protectionModel.setMediaElement(videoModel.getElement());
                this.protectionController = this.system.getObject("protectionController");
                this.protectionController.init(this.protectionModel);

                this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_SERVER_CERTIFICATE_UPDATED, this);
                this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ADDED, this);
                this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ERROR, this);
                this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CREATED, this);
                this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CLOSED, this);
                this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_REMOVED, this);

                // Look for ContentProtection elements.  InitData can be provided by either the
                // dash264drm:Pssh ContentProtection format or a DRM-specific format.
                var manifest = this.manifestModel.getValue();
                var audioInfo = this.adapter.getMediaInfoForType(manifest, streamInfo, "audio");
                var videoInfo = this.adapter.getMediaInfoForType(manifest, streamInfo, "video");
                var mediaInfo = (videoInfo) ? videoInfo : audioInfo; // We could have audio or video only

                // ContentProtection elements are specified at the AdaptationSet level, so the CP for audio
                // and video will be the same.  Just use one valid MediaInfo object
                var supportedKS = this.protectionExt.getSupportedKeySystemsFromContentProtection(mediaInfo.contentProtection);
                if (supportedKS && supportedKS.length > 0) {

                    // Handle KEY_SYSTEM_SELECTED events here instead.
                    var ksSelected = {};
                    var self = this;
                    ksSelected[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED] = function(event) {
                        if (!event.error) {
                            keySystem = self.protectionModel.keySystem;
                            for (var ksIdx = 0; ksIdx < supportedKS.length; ksIdx++) {
                                if (keySystem === supportedKS[ksIdx].ks) {
                                    createSession.call(self, supportedKS[ksIdx].initData);
                                    break;
                                }
                            }
                        } else {
                            self.debug.log("DRM: Could not select key system from ContentProtection elements!  Falling back to needkey mechanism...");
                            self.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_NEED_KEY, self);
                            self.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED, self);
                        }
                        self.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED, ksSelected);
                    };
                    keySystem = null;
                    this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED, ksSelected);
                    this.protectionExt.autoSelectKeySystem(supportedKS,
                            this.protectionModel, this.protectionController, videoInfo, audioInfo);
                } else { // needkey event will trigger key system selection
                    this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_NEED_KEY, this);
                    this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED, this);
                }
            }
        },

        load: function() {
            doLoad.call(this);
            manifest = this.manifestModel.getValue();
        },

        getVideoModel: function() {
            return videoModel;
        },

        getAutoPlay: function () {
            return autoPlay;
        },

        reset: function () {
            pause.call(this);

            if (!!this.protectionModel) {
                this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_NEED_KEY, this);
                this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_ACCESS_COMPLETE, this);
                this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED, this);
                this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_SERVER_CERTIFICATE_UPDATED, this);
                this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ADDED, this);
                this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ERROR, this);
                this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CREATED, this);
                this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CLOSED, this);
                this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_REMOVED, this);
                keySystem = undefined;

                this.protectionController.teardown();
                this.protectionModel.teardown();
                this.protectionController = undefined;
                this.protectionModel = undefined;
            }

            manifest = null;
            tearDownMediaSource.call(this);

            this.fragmentController.reset();
            this.fragmentController = undefined;
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_ERROR, this);
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_CAN_PLAY, this);
            playbackController.reset();
            this.liveEdgeFinder.abortSearch();
            this.liveEdgeFinder.unsubscribe(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, this.playbackController);

            // streamcontroller expects this to be valid
            //this.videoModel = null;

            canPlay = false;
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

        getStreamInfo: function() {
            return streamInfo;
        },

        /**
         * @param type
         * @returns {Array}
         * @memberof Stream#
         */
        getBitrateListFor: function(type) {
            return this.abrController.getBitrateList(mediaInfos[type]);
        },

        startEventController: function() {
            eventController.start();
        },
        resetEventController: function() {
            eventController.reset();
        },

        getPlaybackController: function() {
            return playbackController;
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
