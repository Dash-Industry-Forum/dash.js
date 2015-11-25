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

import BufferController from './controllers/BufferController.js';
import TextController from './controllers/TextController.js';
import ScheduleController from './controllers/ScheduleController.js';
import FragmentLoader from './FragmentLoader.js';
import RepresentationController from '../dash/controllers/RepresentationController.js';
import MediaPlayer from '../streaming/MediaPlayer.js'
import FactoryMaker from '../core/FactoryMaker.js';

export default FactoryMaker.getClassFactory(StreamProcessor);

function StreamProcessor(config) {

    let indexHandler = config.indexHandler;
    let timelineConverter = config.timelineConverter;
    let adapter = config.adapter;
    let manifestModel = config.manifestModel;


    let instance = {
        initialize: initialize,
        isUpdating: isUpdating,
        getType: getType,
        getBufferController: getBufferController,
        getABRController: getABRController,
        getFragmentLoader: getFragmentLoader,
        getFragmentModel: getFragmentModel,
        getScheduleController: getScheduleController,
        getEventController: getEventController,
        getFragmentController: getFragmentController,
        getRepresentationController: getRepresentationController,
        getIndexHandler: getIndexHandler,
        getIndexHandlerTime: getIndexHandlerTime,
        setIndexHandlerTime: setIndexHandlerTime,
        getCurrentRepresentationInfo: getCurrentRepresentationInfo,
        getRepresentationInfoForQuality: getRepresentationInfoForQuality,
        isBufferingCompleted: isBufferingCompleted,
        createBuffer: createBuffer,
        getStreamInfo: getStreamInfo,
        updateMediaInfo: updateMediaInfo,
        getMediaInfoArr: getMediaInfoArr,
        getMediaInfo: getMediaInfo,
        getMediaSource: getMediaSource,
        getBuffer: getBuffer,
        setBuffer: setBuffer,
        start: start,
        stop: stop,
        isDynamic: isDynamic,
        reset: reset
    };

    setup();
    return instance;

    let dynamic,
        mediaInfo,
        type,
        mediaInfoArr,
        stream,
        eventController,
        abrController,
        bufferController,
        scheduleController,
        representationController,
        fragmentController,
        fragmentLoader,
        fragmentModel,
        log;


    function setup() {
        mediaInfoArr = [];
        log = MediaPlayer.prototype.context.debug.log;
    }

    function initialize(Type, FragmentController, mediaSource, Stream, EventController) {

        type = Type;
        stream = Stream;
        eventController = EventController;
        fragmentController = FragmentController;
        dynamic = stream.getStreamInfo().manifestInfo.isDynamic;


        abrController = MediaPlayer.prototype.context.abrController;
        abrController.initialize(type, this);

        bufferController = createBufferControllerForType(Type);
        bufferController.initialize(type, mediaSource, this);

        scheduleController = ScheduleController.create({
            log: log,
            metricsModel: MediaPlayer.prototype.context.metricsModel,
            manifestModel: manifestModel,
            adapter: adapter,
            metricsExt: MediaPlayer.prototype.context.metricsExt,
            manifestExt:MediaPlayer.prototype.context.manifestExt,
            timelineConverter: timelineConverter,
            scheduleRulesCollection: MediaPlayer.prototype.context.scheduleRulesCollection,
            rulesController: MediaPlayer.prototype.context.rulesController,
            mediaPlayerModel: MediaPlayer.prototype.context.mediaPlayerModel,
        });

        scheduleController.initialize(type, this);

        fragmentLoader = FragmentLoader.create({
            metricsModel: MediaPlayer.prototype.context.metricsModel,
            errHandler: MediaPlayer.prototype.context.errorHandler,
            log: log,
            requestModifierExt: MediaPlayer.prototype.context.requestModifierExt
        });

        indexHandler.initialize(this);
        indexHandler.setCurrentTime(MediaPlayer.prototype.context.playbackController.getStreamStartTime(getStreamInfo()));

        representationController = RepresentationController.create();
        representationController.initialize(this);

        fragmentModel = scheduleController.getFragmentModel();
        fragmentModel.setLoader(fragmentLoader);
    }

    function reset(errored) {
        fragmentModel.reset();
        indexHandler.reset();
        bufferController.reset(errored);
        scheduleController.reset();
        representationController.reset();
        bufferController = null;
        scheduleController = null;
        representationController = null;
        fragmentController = null;
        fragmentLoader = null;
        fragmentModel = null;
        eventController = null;
        stream = null;
        dynamic = null;
        mediaInfo = null;
        mediaInfoArr = [];
        type = null;
    }

    function isUpdating() {
        return representationController.isUpdating();
    }

    function getType() {
        return type;
    }

    function getABRController() {
        return abrController;
    }

    function getRepresentationController() {
        return representationController;
    }

    function getFragmentLoader() {
        return fragmentLoader;
    }

    function getIndexHandler(){
        return indexHandler;
    }

    function getFragmentController() {
        return fragmentController;
    }

    function getBuffer() {
        return bufferController.getBuffer();
    }

    function setBuffer(buffer) {
        bufferController.setBuffer(buffer);
    }

    function getBufferController(){
        return bufferController;
    }

    function getFragmentModel() {
        return fragmentModel;
    }

    function getStreamInfo() {
        return stream.getStreamInfo();
    }

    function updateMediaInfo(manifest, newMediaInfo) {
        if (newMediaInfo !== mediaInfo && (!newMediaInfo || !mediaInfo || (newMediaInfo.type === mediaInfo.type))) {
            mediaInfo = newMediaInfo;
        }
        if (mediaInfoArr.indexOf(newMediaInfo) === -1){
            mediaInfoArr.push(newMediaInfo);
        }
        adapter.updateData(manifest, this);
    }

    function getMediaInfoArr() {
        return mediaInfoArr;
    }

    function getMediaInfo() {
        return mediaInfo;
    }

    function getMediaSource() {
        return bufferController.getMediaSource();
    }

    function getScheduleController() {
        return scheduleController;
    }

    function getEventController() {
        return eventController;
    }

    function start() {
        scheduleController.start();
    }

    function stop() {
        scheduleController.stop();
    }

    function getIndexHandlerTime() {
        return adapter.getIndexHandlerTime(this);
    }

    function setIndexHandlerTime(value) {
        adapter.setIndexHandlerTime(this, value);
    }

    function getCurrentRepresentationInfo() {
        return adapter.getCurrentRepresentationInfo(manifestModel.getValue(), representationController);
    }

    function getRepresentationInfoForQuality(quality) {
        return adapter.getRepresentationInfoForQuality(manifestModel.getValue(), representationController, quality);
    }

    function isBufferingCompleted() {
        return bufferController.getIsBufferingCompleted();
    }

    function createBuffer() {
        return (bufferController.getBuffer() || bufferController.createBuffer(mediaInfo));
    }

    function isDynamic(){
        return dynamic;
    }

    function createBufferControllerForType(type) {
        var controller = null;

        if (type === "video" || type === "audio" || type === "fragmentedText") {
            controller = BufferController.create({
                log: log,
                metricsModel: MediaPlayer.prototype.context.metricsModel,
                manifestModel: manifestModel,
                sourceBufferExt: MediaPlayer.prototype.context.sourceBufferExt,
                errHandler: MediaPlayer.prototype.context.errorHandler,
                mediaSourceExt: MediaPlayer.prototype.context.mediaSourceExtensions,
                streamController: MediaPlayer.prototype.context.streamController,
                mediaController: MediaPlayer.prototype.context.mediaController,
                adapter: adapter,
                virtualBuffer: MediaPlayer.prototype.context.virtualBuffer,
                textSourceBuffer: MediaPlayer.prototype.context.textSourceBuffer,
            });
        }else {
            controller = TextController.create({
                errHandler: MediaPlayer.prototype.context.errorHandler,
                sourceBufferExt: MediaPlayer.prototype.context.sourceBufferExtensions
            });
        }

        return controller;
    }
}