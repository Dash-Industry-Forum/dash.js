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
import FragmentController from './controllers/FragmentController.js';
import AbrController from './controllers/AbrController.js';
import BufferController from './controllers/BufferController.js';
import PlaybackController from './controllers/PlaybackController.js';
import TextController from './controllers/TextController.js';

import LiveEdgeFinder from './LiveEdgeFinder.js';
import Stream from './Stream.js';
import FragmentModel from './models/FragmentModel.js';
import FragmentLoader from './FragmentLoader.js';

import RepresentationController from '../dash/controllers/RepresentationController.js';
import BaseURLExtensions from '../dash/extensions/BaseURLExtensions.js';


let StreamProcessor = function () {
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

            representationController.subscribe(RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, bufferController);
            fragmentController.subscribe(FragmentController.eventList.ENAME_INIT_FRAGMENT_LOADED, bufferController);

            if (type === "video" || type === "audio" || type === "fragmentedText") {
                abrController.subscribe(AbrController.eventList.ENAME_QUALITY_CHANGED, bufferController);
                abrController.subscribe(AbrController.eventList.ENAME_QUALITY_CHANGED, representationController);
                abrController.subscribe(AbrController.eventList.ENAME_QUALITY_CHANGED, scheduleController);

                liveEdgeFinder.subscribe(LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, this.timelineConverter);
                liveEdgeFinder.subscribe(LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, representationController);
                liveEdgeFinder.subscribe(LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, scheduleController);

                representationController.subscribe(RepresentationController.eventList.ENAME_DATA_UPDATE_STARTED, scheduleController);

                representationController.subscribe(RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, scheduleController);
                stream.subscribe(Stream.eventList.ENAME_STREAM_UPDATED, scheduleController);

                representationController.subscribe(RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, playbackController);

                fragmentController.subscribe(FragmentController.eventList.ENAME_MEDIA_FRAGMENT_LOADED, bufferController);
                fragmentController.subscribe(FragmentController.eventList.ENAME_STREAM_COMPLETED, scheduleController);
                fragmentController.subscribe(FragmentController.eventList.ENAME_STREAM_COMPLETED, bufferController);

                bufferController.subscribe(BufferController.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED, playbackController);
                bufferController.subscribe(BufferController.eventList.ENAME_BUFFER_CLEARED, scheduleController);
                bufferController.subscribe(BufferController.eventList.ENAME_BYTES_APPENDED, scheduleController);
                bufferController.subscribe(BufferController.eventList.ENAME_BUFFER_LEVEL_UPDATED, representationController);
                bufferController.subscribe(BufferController.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED, scheduleController);
                bufferController.subscribe(BufferController.eventList.ENAME_INIT_REQUESTED, scheduleController);
                bufferController.subscribe(BufferController.eventList.ENAME_BUFFERING_COMPLETED, stream);
                bufferController.subscribe(BufferController.eventList.ENAME_QUOTA_EXCEEDED, scheduleController);
                bufferController.subscribe(BufferController.eventList.ENAME_BYTES_APPENDED, playbackController);

                playbackController.subscribe(PlaybackController.eventList.ENAME_PLAYBACK_PROGRESS, bufferController);
                playbackController.subscribe(PlaybackController.eventList.ENAME_PLAYBACK_TIME_UPDATED, bufferController);
                playbackController.subscribe(PlaybackController.eventList.ENAME_PLAYBACK_RATE_CHANGED, bufferController);
                playbackController.subscribe(PlaybackController.eventList.ENAME_PLAYBACK_RATE_CHANGED, scheduleController);
                playbackController.subscribe(PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, bufferController);
                playbackController.subscribe(PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, scheduleController);
                playbackController.subscribe(PlaybackController.eventList.ENAME_PLAYBACK_STARTED, scheduleController);
                playbackController.subscribe(PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, abrController.abrRulesCollection.insufficientBufferRule);

                if (isDynamic) {
                    playbackController.subscribe(PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, representationController);
                }
                playbackController.subscribe(PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, bufferController);

                baseUrlExt.subscribe(BaseURLExtensions.eventList.ENAME_INITIALIZATION_LOADED, indexHandler);
                baseUrlExt.subscribe(BaseURLExtensions.eventList.ENAME_SEGMENTS_LOADED, indexHandler);

                if (type === "video" || type === "audio") {
                    mediaController.subscribe(MediaController.eventList.CURRENT_TRACK_CHANGED, bufferController);
                }
            } else {
                bufferController.subscribe(TextController.eventList.ENAME_CLOSED_CAPTIONING_REQUESTED, scheduleController);
            }

            representationController.subscribe(RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, stream);

            indexHandler.initialize(this);
            indexHandler.setCurrentTime(playbackController.getStreamStartTime(this.getStreamInfo()));
            bufferController.initialize(type, mediaSource, self);
            scheduleController.initialize(type, this);
            abrController.initialize(type, this);

            fragmentModel = this.getFragmentModel();
            fragmentModel.setLoader(fragmentLoader);
            fragmentModel.subscribe(FragmentModel.eventList.ENAME_FRAGMENT_LOADING_STARTED, fragmentController);
            fragmentModel.subscribe(FragmentModel.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, fragmentController);
            fragmentModel.subscribe(FragmentModel.eventList.ENAME_STREAM_COMPLETED, fragmentController);
            fragmentModel.subscribe(FragmentModel.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, scheduleController);
            fragmentLoader.subscribe(FragmentLoader.eventList.ENAME_LOADING_COMPLETED, fragmentModel);
            fragmentLoader.subscribe(FragmentLoader.eventList.ENAME_LOADING_PROGRESS, abrController);

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

            abrController.unsubscribe(AbrController.eventList.ENAME_QUALITY_CHANGED, bufferController);
            abrController.unsubscribe(AbrController.eventList.ENAME_QUALITY_CHANGED, representationController);
            abrController.unsubscribe(AbrController.eventList.ENAME_QUALITY_CHANGED, scheduleController);

            liveEdgeFinder.unsubscribe(LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, this.timelineConverter);
            liveEdgeFinder.unsubscribe(LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, scheduleController);
            liveEdgeFinder.unsubscribe(LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, representationController);

            representationController.unsubscribe(RepresentationController.eventList.ENAME_DATA_UPDATE_STARTED, scheduleController);
            representationController.unsubscribe(RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, bufferController);
            representationController.unsubscribe(RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, scheduleController);
            representationController.unsubscribe(RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, stream);
            representationController.unsubscribe(RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, playbackController);

            stream.unsubscribe(Stream.eventList.ENAME_STREAM_UPDATED, scheduleController);

            fragmentController.unsubscribe(FragmentController.eventList.ENAME_INIT_FRAGMENT_LOADED, bufferController);
            fragmentController.unsubscribe(FragmentController.eventList.ENAME_MEDIA_FRAGMENT_LOADED, bufferController);
            fragmentController.unsubscribe(FragmentController.eventList.ENAME_MEDIA_FRAGMENT_LOADING_START, scheduleController);
            fragmentController.unsubscribe(FragmentController.eventList.ENAME_STREAM_COMPLETED, scheduleController);
            fragmentController.unsubscribe(FragmentController.eventList.ENAME_STREAM_COMPLETED, bufferController);
            fragmentController.unsubscribe(FragmentController.eventList.ENAME_STREAM_COMPLETED, scheduleController.scheduleRulesCollection.bufferLevelRule);

            bufferController.unsubscribe(BufferController.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED, playbackController);
            bufferController.unsubscribe(BufferController.eventList.ENAME_BUFFER_CLEARED, scheduleController);
            bufferController.unsubscribe(BufferController.eventList.ENAME_BYTES_APPENDED, scheduleController);
            bufferController.unsubscribe(BufferController.eventList.ENAME_BUFFER_LEVEL_UPDATED, scheduleController);
            bufferController.unsubscribe(BufferController.eventList.ENAME_BUFFER_LEVEL_UPDATED, representationController);
            bufferController.unsubscribe(BufferController.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED, scheduleController);
            bufferController.unsubscribe(BufferController.eventList.ENAME_INIT_REQUESTED, scheduleController);
            bufferController.unsubscribe(BufferController.eventList.ENAME_BUFFERING_COMPLETED, stream);
            bufferController.unsubscribe(BufferController.eventList.ENAME_CLOSED_CAPTIONING_REQUESTED, scheduleController);
            bufferController.unsubscribe(BufferController.eventList.ENAME_BYTES_APPENDED, playbackController);

            playbackController.unsubscribe(PlaybackController.eventList.ENAME_PLAYBACK_PROGRESS, bufferController);
            playbackController.unsubscribe(PlaybackController.eventList.ENAME_PLAYBACK_TIME_UPDATED, bufferController);
            playbackController.unsubscribe(PlaybackController.eventList.ENAME_PLAYBACK_RATE_CHANGED, bufferController);
            playbackController.unsubscribe(PlaybackController.eventList.ENAME_PLAYBACK_RATE_CHANGED, scheduleController);
            playbackController.unsubscribe(PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, bufferController);
            playbackController.unsubscribe(PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, scheduleController);
            playbackController.unsubscribe(PlaybackController.eventList.ENAME_PLAYBACK_STARTED, scheduleController);
            playbackController.unsubscribe(PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, representationController);
            playbackController.unsubscribe(PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, bufferController);
            playbackController.unsubscribe(PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, abrController.abrRulesCollection.insufficientBufferRule);

            baseUrlExt.unsubscribe(BaseURLExtensions.eventList.ENAME_INITIALIZATION_LOADED, indexHandler);
            baseUrlExt.unsubscribe(BaseURLExtensions.eventList.ENAME_SEGMENTS_LOADED, indexHandler);

            fragmentModel.unsubscribe(FragmentModel.eventList.ENAME_FRAGMENT_LOADING_STARTED, fragmentController);
            fragmentModel.unsubscribe(FragmentModel.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, fragmentController);
            fragmentModel.unsubscribe(FragmentModel.eventList.ENAME_STREAM_COMPLETED, fragmentController);
            fragmentModel.unsubscribe(FragmentModel.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, scheduleController);
            fragmentLoader.unsubscribe(FragmentLoader.eventList.ENAME_LOADING_COMPLETED, fragmentModel);
            fragmentLoader.unsubscribe(FragmentLoader.eventList.ENAME_LOADING_PROGRESS, abrController);

            fragmentModel.reset();

            if (type === "video" || type === "audio") {
                mediaController.unsubscribe(MediaController.eventList.CURRENT_TRACK_CHANGED, bufferController);
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

StreamProcessor.prototype = {
    constructor: StreamProcessor
};

export default StreamProcessor;