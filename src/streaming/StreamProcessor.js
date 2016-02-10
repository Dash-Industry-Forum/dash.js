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

import AbrController from './controllers/AbrController.js';
import BufferController from './controllers/BufferController.js';
import PlaybackController from './controllers/PlaybackController.js';
import StreamController from './controllers/StreamController.js';
import MediaController from './controllers/MediaController.js';
import TextController from './controllers/TextController.js';
import ScheduleController from './controllers/ScheduleController.js';
import RulesController from './rules/RulesController.js';
import ScheduleRulesCollection from './rules/scheduling/ScheduleRulesCollection.js';
import MediaPlayerModel from './models/MediaPlayerModel.js';
import MetricsModel from './models/MetricsModel.js';
import FragmentLoader from './FragmentLoader.js';
import RequestModifier from './utils/RequestModifier.js';
import SourceBufferController from './controllers/SourceBufferController';
import TextSourceBuffer from './TextSourceBuffer.js';
import VirtualBuffer from './VirtualBuffer.js';
import MediaSourceController from './controllers/MediaSourceController.js';
import DashManifestModel from '../dash/models/DashManifestModel.js';
import DashMetrics from '../dash/DashMetrics.js';
import RepresentationController from '../dash/controllers/RepresentationController.js';
import ErrorHandler from './utils/ErrorHandler.js';
import FactoryMaker from '../core/FactoryMaker.js';

function StreamProcessor(config) {

    let context = this.context;

    let indexHandler = config.indexHandler;
    let timelineConverter = config.timelineConverter;
    let adapter = config.adapter;
    let manifestModel = config.manifestModel;

    let instance,
        dynamic,
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
        fragmentModel;


    function setup() {
        mediaInfoArr = [];
    }

    function initialize(Type, FragmentController, mediaSource, Stream, EventController) {

        type = Type;
        stream = Stream;
        eventController = EventController;
        fragmentController = FragmentController;
        dynamic = stream.getStreamInfo().manifestInfo.isDynamic;


        abrController = AbrController(context).getInstance();
        abrController.initialize(type, this);

        bufferController = createBufferControllerForType(Type);
        bufferController.initialize(type, mediaSource, this);

        scheduleController = ScheduleController(context).create({
            metricsModel: MetricsModel(context).getInstance(),
            manifestModel: manifestModel,
            adapter: adapter,
            dashMetrics: DashMetrics(context).getInstance(),
            dashManifestModel: DashManifestModel(context).getInstance(),
            timelineConverter: timelineConverter,
            scheduleRulesCollection: ScheduleRulesCollection(context).getInstance(),
            rulesController: RulesController(context).getInstance(),
            mediaPlayerModel: MediaPlayerModel(context).getInstance(),
        });

        scheduleController.initialize(type, this);

        fragmentLoader = FragmentLoader(context).create({
            metricsModel: MetricsModel(context).getInstance(),
            errHandler: ErrorHandler(context).getInstance(),
            requestModifier: RequestModifier(context).getInstance()
        });

        indexHandler.initialize(this);
        indexHandler.setCurrentTime(PlaybackController(context).getInstance().getStreamStartTime(getStreamInfo()));

        representationController = RepresentationController(context).create();
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

    function getIndexHandler() {
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

    function getBufferController() {
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
        if (mediaInfoArr.indexOf(newMediaInfo) === -1) {
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

    function isDynamic() {
        return dynamic;
    }

    function createBufferControllerForType(type) {
        var controller = null;

        if (type === 'video' || type === 'audio' || type === 'fragmentedText') {
            controller = BufferController(context).create({
                metricsModel: MetricsModel(context).getInstance(),
                manifestModel: manifestModel,
                sourceBufferController: SourceBufferController(context).getInstance(),
                errHandler: ErrorHandler(context).getInstance(),
                mediaSourceController: MediaSourceController(context).getInstance(),
                streamController: StreamController(context).getInstance(),
                mediaController: MediaController(context).getInstance(),
                adapter: adapter,
                virtualBuffer: VirtualBuffer(context).getInstance(),
                textSourceBuffer: TextSourceBuffer(context).getInstance(),
            });
        }else {
            controller = TextController(context).create({
                errHandler: ErrorHandler(context).getInstance(),
                sourceBufferController: SourceBufferController(context).getInstance()
            });
        }

        return controller;
    }

    instance = {
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
}
StreamProcessor.__dashjs_factory_name = 'StreamProcessor';
export default FactoryMaker.getClassFactory(StreamProcessor);