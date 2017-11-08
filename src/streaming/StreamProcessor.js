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
import Constants from './constants/Constants';
import LiveEdgeFinder from './utils/LiveEdgeFinder';
import BufferController from './controllers/BufferController';
import TextBufferController from './text/TextBufferController';
import ScheduleController from './controllers/ScheduleController';
import RepresentationController from '../dash/controllers/RepresentationController';
import FactoryMaker from '../core/FactoryMaker';

import DashHandler from '../dash/DashHandler';

function StreamProcessor(config) {

    let context = this.context;

    let indexHandler;
    let type = config.type;
    let errHandler = config.errHandler;
    let mimeType = config.mimeType;
    let timelineConverter = config.timelineConverter;
    let adapter = config.adapter;
    let manifestModel = config.manifestModel;
    let mediaPlayerModel = config.mediaPlayerModel;
    let stream = config.stream;
    let abrController = config.abrController;
    let playbackController = config.playbackController;
    let streamController = config.streamController;
    let mediaController = config.mediaController;
    let textController = config.textController;
    let sourceBufferController = config.sourceBufferController;
    let domStorage = config.domStorage;
    let metricsModel = config.metricsModel;
    let dashMetrics = config.dashMetrics;
    let dashManifestModel = config.dashManifestModel;

    let instance,
        mediaInfo,
        mediaInfoArr,
        bufferController,
        scheduleController,
        liveEdgeFinder,
        representationController,
        fragmentModel,
        spExternalControllers;

    function setup() {
        liveEdgeFinder = LiveEdgeFinder(context).create({
            timelineConverter: timelineConverter,
            streamProcessor: instance
        });
        resetInitialSettings();
    }

    function initialize(mediaSource) {

        indexHandler = DashHandler(context).create({
            mimeType: mimeType,
            timelineConverter: timelineConverter,
            dashMetrics: dashMetrics,
            metricsModel: metricsModel,
            mediaPlayerModel: mediaPlayerModel,
            baseURLController: config.baseURLController,
            errHandler: errHandler
        });

        // initialize controllers
        indexHandler.initialize(this);
        abrController.registerStreamType(type, this);

        fragmentModel = stream.getFragmentController().getModel(type);
        fragmentModel.setStreamProcessor(instance);

        bufferController = createBufferControllerForType(type);
        scheduleController = ScheduleController(context).create({
            type: type,
            metricsModel: metricsModel,
            adapter: adapter,
            dashMetrics: dashMetrics,
            dashManifestModel: dashManifestModel,
            timelineConverter: timelineConverter,
            mediaPlayerModel: mediaPlayerModel,
            abrController: abrController,
            playbackController: playbackController,
            streamController: streamController,
            textController: textController,
            sourceBufferController: sourceBufferController,
            streamProcessor: this
        });

        representationController = RepresentationController(context).create();

        representationController.setConfig({
            abrController: abrController,
            domStorage: domStorage,
            metricsModel: metricsModel,
            dashMetrics: dashMetrics,
            dashManifestModel: dashManifestModel,
            manifestModel: manifestModel,
            playbackController: playbackController,
            timelineConverter: timelineConverter,
            streamProcessor: this
        });
        bufferController.initialize(mediaSource);
        scheduleController.initialize();
        representationController.initialize();
    }

    function registerExternalController(controller) {
        spExternalControllers.push(controller);
    }

    function unregisterExternalController(controller) {
        var index = spExternalControllers.indexOf(controller);

        if (index !== -1) {
            spExternalControllers.splice(index, 1);
        }
    }

    function getExternalControllers() {
        return spExternalControllers;
    }

    function unregisterAllExternalController() {
        spExternalControllers = [];
    }

    function resetInitialSettings() {
        mediaInfoArr = [];
        mediaInfo = null;
        unregisterAllExternalController();
    }

    function reset(errored) {

        indexHandler.reset();

        if (bufferController) {
            bufferController.reset(errored);
            bufferController = null;
        }

        if (scheduleController) {
            scheduleController.reset();
            scheduleController = null;
        }

        if (representationController) {
            representationController.reset();
            representationController = null;
        }

        if (abrController) {
            abrController.unRegisterStreamType(type);
        }
        spExternalControllers.forEach(function (controller) {
            controller.reset();
        });

        resetInitialSettings();
        type = null;
        stream = null;
        liveEdgeFinder.reset();
    }

    function isUpdating() {
        return representationController ? representationController.isUpdating() : false;
    }

    function getType() {
        return type;
    }

    function getRepresentationController() {
        return representationController;
    }

    function getIndexHandler() {
        return indexHandler;
    }

    function getFragmentController() {
        return stream ? stream.getFragmentController() : null;
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

    function getLiveEdgeFinder() {
        return liveEdgeFinder;
    }

    function getStreamInfo() {
        return stream ? stream.getStreamInfo() : null;
    }

    function getEventController() {
        return stream ? stream.getEventController() : null;
    }

    function updateMediaInfo(newMediaInfo) {
        if (newMediaInfo !== mediaInfo && (!newMediaInfo || !mediaInfo || (newMediaInfo.type === mediaInfo.type))) {
            mediaInfo = newMediaInfo;
        }
        if (mediaInfoArr.indexOf(newMediaInfo) === -1) {
            mediaInfoArr.push(newMediaInfo);
        }
        adapter.updateData(this);
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

    function getCurrentRepresentationInfo() {
        return adapter.getCurrentRepresentationInfo(representationController);
    }

    function getRepresentationInfoForQuality(quality) {
        return adapter.getRepresentationInfoForQuality(representationController, quality);
    }

    function isBufferingCompleted() {
        if (bufferController) {
            return bufferController.getIsBufferingCompleted();
        }

        return false;
    }

    function getBufferLevel() {
        return bufferController.getBufferLevel();
    }

    function switchInitData(representationId) {
        if (bufferController) {
            bufferController.switchInitData(getStreamInfo().id, representationId);
        }
    }

    function createBuffer() {
        return (bufferController.getBuffer() || bufferController.createBuffer(mediaInfo));
    }

    function switchTrackAsked() {
        scheduleController.switchTrackAsked();
    }

    function createBufferControllerForType(type) {
        let controller = null;

        if (type === Constants.VIDEO || type === Constants.AUDIO) {
            controller = BufferController(context).create({
                type: type,
                metricsModel: metricsModel,
                mediaPlayerModel: mediaPlayerModel,
                manifestModel: manifestModel,
                sourceBufferController: sourceBufferController,
                errHandler: errHandler,
                streamController: streamController,
                mediaController: mediaController,
                adapter: adapter,
                textController: textController,
                abrController: abrController,
                playbackController: playbackController,
                streamProcessor: instance
            });
        } else {
            controller = TextBufferController(context).create({
                type: type,
                metricsModel: metricsModel,
                mediaPlayerModel: mediaPlayerModel,
                manifestModel: manifestModel,
                sourceBufferController: sourceBufferController,
                errHandler: errHandler,
                streamController: streamController,
                mediaController: mediaController,
                adapter: adapter,
                textController: textController,
                abrController: abrController,
                playbackController: playbackController,
                streamProcessor: instance
            });
        }

        return controller;
    }

    instance = {
        initialize: initialize,
        isUpdating: isUpdating,
        getType: getType,
        getBufferController: getBufferController,
        getFragmentModel: getFragmentModel,
        getScheduleController: getScheduleController,
        getLiveEdgeFinder: getLiveEdgeFinder,
        getEventController: getEventController,
        getFragmentController: getFragmentController,
        getRepresentationController: getRepresentationController,
        getIndexHandler: getIndexHandler,
        getCurrentRepresentationInfo: getCurrentRepresentationInfo,
        getRepresentationInfoForQuality: getRepresentationInfoForQuality,
        getBufferLevel: getBufferLevel,
        switchInitData: switchInitData,
        isBufferingCompleted: isBufferingCompleted,
        createBuffer: createBuffer,
        getStreamInfo: getStreamInfo,
        updateMediaInfo: updateMediaInfo,
        switchTrackAsked: switchTrackAsked,
        getMediaInfoArr: getMediaInfoArr,
        getMediaInfo: getMediaInfo,
        getMediaSource: getMediaSource,
        getBuffer: getBuffer,
        setBuffer: setBuffer,
        registerExternalController: registerExternalController,
        unregisterExternalController: unregisterExternalController,
        getExternalControllers: getExternalControllers,
        unregisterAllExternalController: unregisterAllExternalController,
        reset: reset
    };

    setup();
    return instance;
}
StreamProcessor.__dashjs_factory_name = 'StreamProcessor';
export default FactoryMaker.getClassFactory(StreamProcessor);
