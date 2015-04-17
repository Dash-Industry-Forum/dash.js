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

    var streamProcessors = [],
        isStreamActivated = false,
        isMediaInitialized = false,
        kid = null,
        streamInfo = null,
        updateError = {},
        isUpdating = false,
        isInitialized = false,

        eventController = null,

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
                            this.protectionModel, this.protectionController, getMediaInfo.call(this, "video"), getMediaInfo.call(this, "audio"));
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

        initializeMediaForType = function(type, mediaSource) {
            var self = this,
                mimeType = null,
                manifest = self.manifestModel.getValue(),
                codec,
                getCodecOrMimeType = function(mediaInfo) {
                    return mediaInfo.codec;
                },
                streamProcessor,
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
                    contentProtectionData;

                if ((type !== "text") && (type !== "fragmentedText")) {
                    codec = codecOrMime;
                    self.log(type + " codec: " + codec);

                    contentProtectionData = mediaInfo.contentProtection;

                    if (!!contentProtectionData && !self.capabilities.supportsEncryptedMedia()) {
                        self.errHandler.capabilityError("encryptedmedia");
                    } else {
                        //kid = self.protectionController.selectKeySystem(codec, contentProtection);
                        //self.protectionController.ensureKeySession(kid, codec, null);

                        if (!self.capabilities.supportsCodec(self.videoModel.getElement(), codec)) {
                            var msg = type + "Codec (" + codec + ") is not supported.";
                            self.errHandler.manifestError(msg, "codec", manifest);
                            self.log(msg);
                            return;
                        }
                    }
                }

                // TODO : How to tell index handler live/duration?
                // TODO : Pass to controller and then pass to each method on handler?

                streamProcessor = self.system.getObject("streamProcessor");
                streamProcessors.push(streamProcessor);
                streamProcessor.initialize(mimeType || type, self.fragmentController, mediaSource, self, eventController);
                self.abrController.updateTopQualityIndex(mediaInfo);
                streamProcessor.updateMediaInfo(manifest, mediaInfo);
                //self.debug.log(type + " is ready!");
            } else {
                self.log("No " + type + " data.");
            }
        },

        initializeMedia = function (mediaSource) {
            var self = this,
                manifest = self.manifestModel.getValue(),
                events;

            eventController = self.system.getObject("eventController");
            events = self.adapter.getEventsFor(streamInfo);
            eventController.addInlineEvents(events);

            isUpdating = true;
            initializeMediaForType.call(self, "video", mediaSource);
            initializeMediaForType.call(self, "audio", mediaSource);
            initializeMediaForType.call(self, "text", mediaSource);
            initializeMediaForType.call(self, "fragmentedText", mediaSource);

            createBuffers.call(self);

            isMediaInitialized = true;
            isUpdating = false;

            if (streamProcessors.length === 0) {
                var msg = "No streams to play.";
                self.errHandler.manifestError(msg, "nostreams", manifest);
                self.log(msg);
            } else {
                self.liveEdgeFinder.initialize(streamProcessors[0]);
                self.liveEdgeFinder.subscribe(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, self.playbackController);
                //self.log("Playback initialized!");
            }

            checkIfInitializationCompleted.call(this);
        },

        checkIfInitializationCompleted = function() {
            var self = this,
                ln = streamProcessors.length,
                hasError = !!updateError.audio || !!updateError.video,
                error = hasError ? new MediaPlayer.vo.Error(MediaPlayer.dependencies.Stream.DATA_UPDATE_FAILED_ERROR_CODE, "Data update failed", null) : null,
                i = 0;

            for (i; i < ln; i += 1) {
                if (streamProcessors[i].isUpdating() || isUpdating) return;
            }

            isInitialized = true;

            self.eventBus.dispatchEvent({
                type: MediaPlayer.events.STREAM_INITIALIZED,
                data: {streamInfo: streamInfo}
            });

            self.notify(MediaPlayer.dependencies.Stream.eventList.ENAME_STREAM_UPDATED, {streamInfo: streamInfo}, error);

            if (!isMediaInitialized || isStreamActivated) return;

            isStreamActivated = true;
        },

        getMediaInfo = function(type) {
            var ln = streamProcessors.length,
                mediaCtrl = null;

            for (var i = 0; i < ln; i += 1) {
                mediaCtrl = streamProcessors[i];

                if (mediaCtrl.getType() === type) return mediaCtrl.getMediaInfo();
            }

            return null;
        },

        createBuffers = function() {
            for (var i = 0, ln = streamProcessors.length; i < ln; i += 1) {
                streamProcessors[i].createBuffer();
            }
        },

        onBufferingCompleted = function(/*e*/) {
            var processors = getAudioVideoProcessors(),
                ln = processors.length,
                i = 0;

            // if there is at least one buffer controller that has not completed buffering yet do nothing
            for (i; i < ln; i += 1) {
                if (!processors[i].isBufferingCompleted()) return;
            }

            this.notify(MediaPlayer.dependencies.Stream.eventList.ENAME_STREAM_BUFFERING_COMPLETED, {streamInfo: streamInfo});
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
                controller;

            for (i; i < ln; i += 1) {
                controller = streamProcessors[i];
                type = controller.getType();

                if (type === "audio" || type === "video") {
                    arr.push(controller);
                }
            }

            return arr;
        },

        updateData = function (updatedStreamInfo) {
            var self = this,
                ln = streamProcessors.length,
                manifest = self.manifestModel.getValue(),
                i = 0,
                mediaInfo,
                events,
                controller;

            isStreamActivated = false;
            streamInfo = updatedStreamInfo;
            self.log("Manifest updated... set new data on buffers.");

            if (eventController) {
                events = self.adapter.getEventsFor(streamInfo);
                eventController.addInlineEvents(events);
            }

            isUpdating = true;
            isInitialized = false;

            for (i; i < ln; i +=1) {
                controller = streamProcessors[i];
                mediaInfo = self.adapter.getMediaInfoForType(manifest, streamInfo, controller.getType());
                this.abrController.updateTopQualityIndex(mediaInfo);
                controller.updateMediaInfo(manifest, mediaInfo);
            }

            isUpdating = false;
            checkIfInitializationCompleted.call(self);
        };

    return {
        system: undefined,
        eventBus: undefined,
        manifestModel: undefined,
        sourceBufferExt: undefined,
        adapter: undefined,
        videoModel: undefined,
        fragmentController: undefined,
        playbackController: undefined,
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

        initProtection: function() {
            if (this.capabilities.supportsEncryptedMedia()) {
                this.protectionModel = this.system.getObject("protectionModel");
                this.protectionModel.init(this.videoModel);
                this.protectionModel.setMediaElement(this.videoModel.getElement());
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
                var manifest = this.manifestModel.getValue(),
                    audioInfo = this.adapter.getMediaInfoForType(manifest, streamInfo, "audio"),
                    videoInfo = this.adapter.getMediaInfoForType(manifest, streamInfo, "video"),
                    mediaInfo = (videoInfo) ? videoInfo : audioInfo; // We could have audio or video only

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

        /**
         * Activates Stream by re-initalizing some of its components
         * @param mediaSource {MediaSource}
         * @memberof Stream#
         */
        activate: function(mediaSource){
            if (!isStreamActivated) {
                initializeMedia.call(this, mediaSource);
            } else {
                createBuffers.call(this);
            }
        },

        /**
         * Partially resets some of the Stream elements
         * @memberof Stream#
         */
        deactivate: function() {
            var ln = streamProcessors.length,
                i = 0;

            for (i; i < ln; i += 1) {
                streamProcessors[i].reset();
            }

            streamProcessors = [];
            isStreamActivated = false;
            isMediaInitialized = false;
            this.resetEventController();
        },

        reset: function (errored) {
            this.playbackController.pause();

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

            var ln = streamProcessors.length,
                i = 0,
                processors;

            for (i; i < ln; i += 1) {
                processors = streamProcessors[i];
                processors.reset(errored);
                processors = null;
            }
            if(!!eventController) {
                eventController.reset();
            }

            streamProcessors = [];
            isUpdating = false;
            isInitialized = false;

            kid = null;

            if (this.fragmentController) {
                this.fragmentController.reset();
            }
            this.fragmentController = undefined;
            this.liveEdgeFinder.abortSearch();
            this.liveEdgeFinder.unsubscribe(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, this.playbackController);

            isMediaInitialized = false;
            isStreamActivated = false;
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

        /**
         * @param type
         * @returns {Array}
         * @memberof Stream#
         */
        getBitrateListFor: function(type) {
            var mediaInfo = getMediaInfo.call(this, type);

            return this.abrController.getBitrateList(mediaInfo);
        },

        startEventController: function() {
            eventController.start();
        },

        resetEventController: function() {
            eventController.reset();
        },

        /**
         * Indicates whether the stream has been activated or not
         * @returns {Boolean}
         * @memberof Stream#
         */
        isActivated: function() {
            return isStreamActivated;
        },

        isInitialized: function() {
            return isInitialized;
        },

        updateData: updateData
    };
};

MediaPlayer.dependencies.Stream.prototype = {
    constructor: MediaPlayer.dependencies.Stream
};

MediaPlayer.dependencies.Stream.DATA_UPDATE_FAILED_ERROR_CODE = 1;

MediaPlayer.dependencies.Stream.eventList = {
    ENAME_STREAM_UPDATED: "streamUpdated",
    ENAME_STREAM_BUFFERING_COMPLETED: "streamBufferingCompleted"
};
