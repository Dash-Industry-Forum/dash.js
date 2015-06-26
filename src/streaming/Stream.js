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
        streamInfo = null,
        updateError = {},
        isUpdating = false,
        isInitialized = false,
        protectionController,

        eventController = null,

        // Encrypted Media Extensions
        onProtectionError = function(event) {
            this.errHandler.mediaKeySessionError(event.data);
            this.log(event.data);
            this.reset();
        },

        initializeMediaForType = function(type, mediaSource) {
            var self = this,
                mimeType = null,
                manifest = self.manifestModel.getValue(),
                codec,
                msg,
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
            } else if (type === "muxed" && mediaInfo) {
                msg = "Multiplexed representations are intentionally not supported, as they are not compliant with the DASH-AVC/264 guidelines";
                this.log(msg);
                this.errHandler.manifestError(msg, "multiplexedrep", this.manifestModel.getValue());
                return;
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
                        if (!self.capabilities.supportsCodec(self.videoModel.getElement(), codec)) {
                            msg = type + "Codec (" + codec + ") is not supported.";
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
            events = self.adapter.getEventsFor(manifest, streamInfo);
            eventController.addInlineEvents(events);

            isUpdating = true;
            initializeMediaForType.call(self, "video", mediaSource);
            initializeMediaForType.call(self, "audio", mediaSource);
            initializeMediaForType.call(self, "text", mediaSource);
            initializeMediaForType.call(self, "fragmentedText", mediaSource);
            initializeMediaForType.call(self, "muxed", mediaSource);

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
                checkIfInitializationCompleted.call(this);
            }
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

            protectionController.init(self.manifestModel.getValue(), getMediaInfo.call(this, "audio"), getMediaInfo.call(this, "video"));
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
                events = self.adapter.getEventsFor(manifest, streamInfo);
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
            this[MediaPlayer.dependencies.ProtectionController.eventList.ENAME_PROTECTION_ERROR] = onProtectionError.bind(this);
        },

        initialize: function(strmInfo, protectionCtrl) {
            streamInfo = strmInfo;
            protectionController = protectionCtrl;
            protectionController.subscribe(MediaPlayer.dependencies.ProtectionController.eventList.ENAME_PROTECTION_ERROR, this);
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

            if (this.fragmentController) {
                this.fragmentController.reset();
            }
            this.fragmentController = undefined;
            this.liveEdgeFinder.abortSearch();
            this.liveEdgeFinder.unsubscribe(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, this.playbackController);

            protectionController.unsubscribe(MediaPlayer.dependencies.ProtectionController.eventList.ENAME_PROTECTION_ERROR, this);

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

        getStreamInfo: function() {
            return streamInfo;
        },

        hasMedia: function(type){
            return (getMediaInfo.call(this, type) !== null);
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
