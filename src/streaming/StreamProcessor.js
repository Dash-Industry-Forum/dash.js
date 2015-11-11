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
//import FragmentController from './controllers/FragmentController.js';
import AbrController from './controllers/AbrController.js';
import BufferController from './controllers/BufferController.js';
import PlaybackController from './controllers/PlaybackController.js';
//import TextController from './controllers/TextController.js';
import ScheduleController from './controllers/ScheduleController.js';
import RulesController from './rules/RulesController.js';
import ScheduleRulesCollection from './rules/SchedulingRules/ScheduleRulesCollection.js';
//import LiveEdgeFinder from './LiveEdgeFinder.js';
//import Stream from './Stream.js';
//import FragmentModel from './models/FragmentModel.js';
import MediaPlayerModel from './models/MediaPlayerModel.js';
import FragmentLoader from './FragmentLoader.js';
//import RepresentationController from '../dash/controllers/RepresentationController.js';
//import MediaController from './controllers/MediaController.js';

let StreamProcessor = function () {
    "use strict";

    var isDynamic,
        stream = null,
        mediaInfo = null,
        type = null,
        eventController = null,
        mediaInfoArr = [],

        createBufferControllerForType = function(type) {
            if (type === "video" || type === "audio" || type === "fragmentedText") {
                return BufferController.create({
                    log:this.system.getObject("log"),
                    metricsModel:this.system.getObject("metricsModel"),
                    manifestModel:this.system.getObject("manifestModel"),
                    sourceBufferExt:this.system.getObject("sourceBufferExt"),
                    errHandler:this.system.getObject("errHandler"),
                    mediaSourceExt:this.system.getObject("mediaSourceExt"),
                    streamController:this.system.getObject("streamController"),
                    mediaController:this.system.getObject("mediaController"),
                    adapter:this.system.getObject("adapter"),
                    virtualBuffer:this.system.getObject("virtualBuffer"),
                    textSourceBuffer:this.system.getObject("textSourceBuffer"),
                    system:this.system
                })
            }else {
                return this.system.getObject("textController");
            }
        };

    return {
        system : undefined,
        indexHandler: undefined,
        liveEdgeFinder: undefined,
        timelineConverter: undefined,
        adapter: undefined,
        manifestModel: undefined,

        initialize: function (typeValue, fragmentController, mediaSource, streamValue, eventControllerValue) {

            var self = this,
                representationController = self.system.getObject("representationController"),
                indexHandler = self.indexHandler,
                fragmentModel,
                scheduleController = ScheduleController.create({
                    log: this.system.getObject("log"),
                    metricsModel:this.system.getObject("metricsModel"),
                    manifestModel:this.system.getObject("manifestModel"),
                    adapter:this.system.getObject("adapter"),
                    metricsExt:this.system.getObject("metricsExt"),
                    manifestExt:this.system.getObject("manifestExt"),
                    timelineConverter:this.system.getObject("timelineConverter"),
                    scheduleRulesCollection: ScheduleRulesCollection.getInstance(),
                    rulesController: RulesController.getInstance(),
                    mediaPlayerModel:MediaPlayerModel.getInstance(),
                    system:this.system
                }),

                fragmentLoader = FragmentLoader.create({
                    metricsModel:this.system.getObject("metricsModel"),
                    errHandler:this.system.getObject("errHandler"),
                    log: this.system.getObject("log"),
                    requestModifierExt:this.system.getObject("requestModifierExt")
                }),

                bufferController = createBufferControllerForType.call(self, typeValue);

            stream = streamValue;
            type = typeValue;
            eventController = eventControllerValue;
            isDynamic = stream.getStreamInfo().manifestInfo.isDynamic;

            //todo re-scope
            self.abrController = AbrController.getInstance();
            self.abrController.initialize(type, this);
            self.bufferController = bufferController;
            self.scheduleController = scheduleController;
            self.representationController = representationController;
            self.fragmentController = fragmentController;
            self.fragmentLoader = fragmentLoader;

            indexHandler.initialize(this);
            indexHandler.setCurrentTime(PlaybackController.getInstance().getStreamStartTime(this.getStreamInfo()));
            bufferController.initialize(type, mediaSource, self);
            scheduleController.initialize(type, this);

            fragmentModel = this.getFragmentModel();
            fragmentModel.setLoader(fragmentLoader);
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
            return this.bufferController.getIsBufferingCompleted();
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
            var indexHandler = this.indexHandler,
                fragmentModel = this.getFragmentModel()

            fragmentModel.reset();
            indexHandler.reset();
            this.bufferController.reset(errored);
            this.scheduleController.reset();
            this.bufferController = null;
            this.scheduleController = null;
            this.representationController.reset();
            this.representationController = null;
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