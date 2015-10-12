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
MediaPlayer.dependencies.StreamProcessor = function () {
    "use strict";

    var isDynamic,
        stream = null,
        mediaInfo = null,
        type = null,
        eventController = null,
        mediaInfoArr = [],

        createBufferControllerForType = function(type) {
            var self = this,
            controllerName = (type === "video" || type === "audio" || type === "fragmentedText") ? "bufferController" : "textController";

            return self.system.getObject(controllerName);
        };

    return {
        system : undefined,
        videoModel: undefined,
        indexHandler: undefined,
        liveEdgeFinder: undefined,
        timelineConverter: undefined,
        abrController: undefined,
        playbackController: undefined,
        baseURLExt: undefined,
        adapter: undefined,
        manifestModel: undefined,

        initialize: function (typeValue, fragmentController, mediaSource, streamValue, eventControllerValue) {

            var self = this,
                representationController = self.system.getObject("representationController"),
                scheduleController = self.system.getObject("scheduleController"),
                liveEdgeFinder = self.liveEdgeFinder,
                abrController = self.abrController,
                indexHandler = self.indexHandler,
                baseUrlExt = self.baseURLExt,
                playbackController = self.playbackController,
                mediaController = self.system.getObject("mediaController"),
                fragmentModel,
                fragmentLoader = this.system.getObject("fragmentLoader"),
                bufferController = createBufferControllerForType.call(self, typeValue);

            stream = streamValue;
            type = typeValue;
            eventController = eventControllerValue;

            isDynamic = stream.getStreamInfo().manifestInfo.isDynamic;
            self.bufferController = bufferController;
            self.scheduleController = scheduleController;
            self.representationController = representationController;
            self.fragmentController = fragmentController;
            self.fragmentLoader = fragmentLoader;

            representationController.subscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, bufferController);
            fragmentController.subscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_INIT_FRAGMENT_LOADED, bufferController);

            if (type === "video" || type === "audio" || type === "fragmentedText") {
                abrController.subscribe(MediaPlayer.dependencies.AbrController.eventList.ENAME_QUALITY_CHANGED, bufferController);
                abrController.subscribe(MediaPlayer.dependencies.AbrController.eventList.ENAME_QUALITY_CHANGED, representationController);
                abrController.subscribe(MediaPlayer.dependencies.AbrController.eventList.ENAME_QUALITY_CHANGED, scheduleController);

                liveEdgeFinder.subscribe(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, this.timelineConverter);
                liveEdgeFinder.subscribe(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, representationController);
                liveEdgeFinder.subscribe(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, scheduleController);

                representationController.subscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_STARTED, scheduleController);

                representationController.subscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, scheduleController);
                stream.subscribe(MediaPlayer.dependencies.Stream.eventList.ENAME_STREAM_UPDATED, scheduleController);

                representationController.subscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, playbackController);

                fragmentController.subscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_MEDIA_FRAGMENT_LOADED, bufferController);
                fragmentController.subscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_MEDIA_FRAGMENT_LOADING_START, scheduleController);
                fragmentController.subscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_STREAM_COMPLETED, scheduleController);
                fragmentController.subscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_STREAM_COMPLETED, bufferController);
                fragmentController.subscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_STREAM_COMPLETED, scheduleController.scheduleRulesCollection.bufferLevelRule);

                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED, playbackController);
                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_CLEARED, scheduleController);
                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_APPENDED, scheduleController);
                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_UPDATED, scheduleController);
                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_UPDATED, representationController);
                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED, scheduleController);
                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_INIT_REQUESTED, scheduleController);
                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFERING_COMPLETED, stream);
                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_QUOTA_EXCEEDED, scheduleController);
                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN, scheduleController.scheduleRulesCollection.bufferLevelRule);
                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED, scheduleController.scheduleRulesCollection.bufferLevelRule);
                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_APPENDED, playbackController);

                playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_PROGRESS, bufferController);
                playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_TIME_UPDATED, bufferController);
                playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_RATE_CHANGED, bufferController);
                playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_RATE_CHANGED, scheduleController);
                playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, bufferController);
                playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, scheduleController);
                playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_STARTED, scheduleController);
                playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, scheduleController.scheduleRulesCollection.playbackTimeRule);
                playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, abrController.abrRulesCollection.insufficientBufferRule);

                if (isDynamic) {
                    playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, representationController);
                }

                playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, bufferController);
                playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, scheduleController);

                baseUrlExt.subscribe(Dash.dependencies.BaseURLExtensions.eventList.ENAME_INITIALIZATION_LOADED, indexHandler);
                baseUrlExt.subscribe(Dash.dependencies.BaseURLExtensions.eventList.ENAME_SEGMENTS_LOADED, indexHandler);

                if (type === "video" || type === "audio") {
                    mediaController.subscribe(MediaPlayer.dependencies.MediaController.eventList.CURRENT_TRACK_CHANGED, bufferController);
                }
            } else {
                bufferController.subscribe(MediaPlayer.dependencies.TextController.eventList.ENAME_CLOSED_CAPTIONING_REQUESTED, scheduleController);
            }

            representationController.subscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, stream);

            indexHandler.initialize(this);
            indexHandler.setCurrentTime(playbackController.getStreamStartTime(this.getStreamInfo()));
            bufferController.initialize(type, mediaSource, self);
            scheduleController.initialize(type, this);
            abrController.initialize(type, this);

            fragmentModel = this.getFragmentModel();
            fragmentModel.setLoader(fragmentLoader);
            fragmentModel.subscribe(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_STARTED, fragmentController);
            fragmentModel.subscribe(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, fragmentController);
            fragmentModel.subscribe(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_STREAM_COMPLETED, fragmentController);
            fragmentModel.subscribe(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, scheduleController);
            fragmentLoader.subscribe(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_LOADING_COMPLETED, fragmentModel);
            fragmentLoader.subscribe(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_LOADING_PROGRESS, abrController);

            if (type === "video" || type === "audio" || type === "fragmentedText") {
                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN, fragmentModel);
                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED, fragmentModel);
                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_REJECTED, fragmentModel);
            }

            representationController.initialize(this);
        },

        isUpdating: function() {
            return this.representationController.isUpdating();
        },

        getType: function() {
            return type;
        },

        getABRController:function() {
            return this.abrController;
        },

        getFragmentLoader: function () {
            return this.fragmentLoader;
        },

        getBuffer: function() {
            return this.bufferController.getBuffer();
        },

        setBuffer: function(buffer) {
            this.bufferController.setBuffer(buffer);
        },

        getFragmentModel: function() {
            return this.scheduleController.getFragmentModel();
        },

        getStreamInfo: function() {
            return stream.getStreamInfo();
        },

        updateMediaInfo: function(manifest, newMediaInfo) {
            if (newMediaInfo !== mediaInfo && (!newMediaInfo || !mediaInfo || (newMediaInfo.type === mediaInfo.type))) {
                mediaInfo = newMediaInfo;
            }
            if (mediaInfoArr.indexOf(newMediaInfo) === -1){
                mediaInfoArr.push(newMediaInfo);
            }
            this.adapter.updateData(manifest, this);
        },

        getMediaInfoArr: function() {
            return mediaInfoArr;
        },

        getMediaInfo: function() {
            return mediaInfo;
        },

        getMediaSource: function() {
            return this.bufferController.getMediaSource();
        },

        getScheduleController:function () {
            return this.scheduleController;
        },

        getEventController: function() {
            return eventController;
        },

        start: function() {
            this.scheduleController.start();
        },

        stop: function() {
            this.scheduleController.stop();
        },

        getIndexHandlerTime: function() {
            return this.adapter.getIndexHandlerTime(this);
        },

        setIndexHandlerTime: function(value) {
            this.adapter.setIndexHandlerTime(this, value);
        },

        getCurrentRepresentationInfo: function() {
            return this.adapter.getCurrentRepresentationInfo(this.manifestModel.getValue(), this.representationController);
        },

        getRepresentationInfoForQuality: function(quality) {
            return this.adapter.getRepresentationInfoForQuality(this.manifestModel.getValue(), this.representationController, quality);
        },

        isBufferingCompleted: function() {
            return this.bufferController.isBufferingCompleted();
        },

        /**
         * @returns SourceBuffer object
         * @memberof StreamProcessor#
         */
        createBuffer: function() {
            return (this.bufferController.getBuffer() || this.bufferController.createBuffer(mediaInfo));
        },

        isDynamic: function(){
            return isDynamic;
        },

        reset: function(errored) {
            var self = this,
                bufferController = self.bufferController,
                representationController = self.representationController,
                scheduleController = self.scheduleController,
                liveEdgeFinder = self.liveEdgeFinder,
                fragmentController = self.fragmentController,
                abrController = self.abrController,
                playbackController = self.playbackController,
                mediaController = this.system.getObject("mediaController"),
                indexHandler = this.indexHandler,
                baseUrlExt = this.baseURLExt,
                fragmentModel = this.getFragmentModel(),
                fragmentLoader = this.fragmentLoader;

            abrController.unsubscribe(MediaPlayer.dependencies.AbrController.eventList.ENAME_QUALITY_CHANGED, bufferController);
            abrController.unsubscribe(MediaPlayer.dependencies.AbrController.eventList.ENAME_QUALITY_CHANGED, representationController);
            abrController.unsubscribe(MediaPlayer.dependencies.AbrController.eventList.ENAME_QUALITY_CHANGED, scheduleController);

            liveEdgeFinder.unsubscribe(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, this.timelineConverter);
            liveEdgeFinder.unsubscribe(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, scheduleController);
            liveEdgeFinder.unsubscribe(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, representationController);

            representationController.unsubscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_STARTED, scheduleController);
            representationController.unsubscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, bufferController);
            representationController.unsubscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, scheduleController);
            representationController.unsubscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, stream);
            representationController.unsubscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, playbackController);

            stream.unsubscribe(MediaPlayer.dependencies.Stream.eventList.ENAME_STREAM_UPDATED, scheduleController);

            fragmentController.unsubscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_INIT_FRAGMENT_LOADED, bufferController);
            fragmentController.unsubscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_MEDIA_FRAGMENT_LOADED, bufferController);
            fragmentController.unsubscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_MEDIA_FRAGMENT_LOADING_START, scheduleController);
            fragmentController.unsubscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_STREAM_COMPLETED, scheduleController);
            fragmentController.unsubscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_STREAM_COMPLETED, bufferController);
            fragmentController.unsubscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_STREAM_COMPLETED, scheduleController.scheduleRulesCollection.bufferLevelRule);

            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED, playbackController);
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_CLEARED, scheduleController);
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_APPENDED, scheduleController);
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_UPDATED, scheduleController);
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_UPDATED, representationController);
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED, scheduleController);
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_INIT_REQUESTED, scheduleController);
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFERING_COMPLETED, stream);
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_CLOSED_CAPTIONING_REQUESTED, scheduleController);
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN, scheduleController.scheduleRulesCollection.bufferLevelRule);
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED, scheduleController.scheduleRulesCollection.bufferLevelRule);
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_APPENDED, playbackController);

            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_PROGRESS, bufferController);
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_TIME_UPDATED, bufferController);
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_RATE_CHANGED, bufferController);
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_RATE_CHANGED, scheduleController);
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, bufferController);
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, scheduleController);
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_STARTED, scheduleController);
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, representationController);
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, bufferController);
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, scheduleController);
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, scheduleController.scheduleRulesCollection.playbackTimeRule);
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, abrController.abrRulesCollection.insufficientBufferRule);

            baseUrlExt.unsubscribe(Dash.dependencies.BaseURLExtensions.eventList.ENAME_INITIALIZATION_LOADED, indexHandler);
            baseUrlExt.unsubscribe(Dash.dependencies.BaseURLExtensions.eventList.ENAME_SEGMENTS_LOADED, indexHandler);

            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN, fragmentModel);
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED, fragmentModel);
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_REJECTED, fragmentModel);

            fragmentModel.unsubscribe(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_STARTED, fragmentController);
            fragmentModel.unsubscribe(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, fragmentController);
            fragmentModel.unsubscribe(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_STREAM_COMPLETED, fragmentController);
            fragmentModel.unsubscribe(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, scheduleController);
            fragmentLoader.unsubscribe(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_LOADING_COMPLETED, fragmentModel);
            fragmentLoader.unsubscribe(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_LOADING_PROGRESS, abrController);

            fragmentModel.reset();

            if (type === "video" || type === "audio") {
                mediaController.unsubscribe(MediaPlayer.dependencies.MediaController.eventList.CURRENT_TRACK_CHANGED, bufferController);
            }

            indexHandler.reset();
            this.bufferController.reset(errored);
            this.scheduleController.reset();
            this.bufferController = null;
            this.scheduleController = null;
            this.representationController = null;
            this.videoModel = null;
            this.fragmentController = null;
            isDynamic = undefined;
            stream = null;
            mediaInfo = null;
            type = null;
            eventController = null;
        }

    };
};

MediaPlayer.dependencies.StreamProcessor.prototype = {
    constructor: MediaPlayer.dependencies.StreamProcessor
};
