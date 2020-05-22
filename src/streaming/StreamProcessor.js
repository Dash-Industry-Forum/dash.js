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
import DashConstants from '../dash/constants/DashConstants';
import BufferController from './controllers/BufferController';
import TextBufferController from './text/TextBufferController';
import ScheduleController from './controllers/ScheduleController';
import RepresentationController from '../dash/controllers/RepresentationController';
import FactoryMaker from '../core/FactoryMaker';
import { checkInteger } from './utils/SupervisorTools';
import EventBus from '../core/EventBus';
import Events from '../core/events/Events';
import DashHandler from '../dash/DashHandler';
import Errors from '../core/errors/Errors';
import DashJSError from './vo/DashJSError';
import Debug from '../core/Debug';
import RequestModifier from './utils/RequestModifier';
import URLUtils from '../streaming/utils/URLUtils';

function StreamProcessor(config) {

    config = config || {};
    let context = this.context;
    let eventBus = EventBus(context).getInstance();

    let streamInfo = config.streamInfo;
    let type = config.type;
    let errHandler = config.errHandler;
    let mimeType = config.mimeType;
    let timelineConverter = config.timelineConverter;
    let adapter = config.adapter;
    let manifestModel = config.manifestModel;
    let mediaPlayerModel = config.mediaPlayerModel;
    let fragmentModel = config.fragmentModel;
    let abrController = config.abrController;
    let playbackController = config.playbackController;
    let streamController = config.streamController;
    let mediaController = config.mediaController;
    let textController = config.textController;
    let dashMetrics = config.dashMetrics;
    let settings = config.settings;
    let boxParser = config.boxParser;

    let instance,
        mediaInfo,
        mediaInfoArr,
        bufferController,
        scheduleController,
        representationController,
        indexHandler;

    function setup() {
        resetInitialSettings();

        eventBus.on(Events.BUFFER_LEVEL_UPDATED, onBufferLevelUpdated, instance);
        eventBus.on(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, instance);
    }

    function initialize(mediaSource) {
        indexHandler = DashHandler(context).create({
            streamInfo: streamInfo,
            type: type,
            timelineConverter: timelineConverter,
            dashMetrics: dashMetrics,
            mediaPlayerModel: mediaPlayerModel,
            baseURLController: config.baseURLController,
            errHandler: errHandler,
            settings: settings,
            boxParser: boxParser,
            events: Events,
            eventBus: eventBus,
            errors: Errors,
            debug: Debug(context).getInstance(),
            requestModifier: RequestModifier(context).getInstance(),
            dashConstants: DashConstants,
            constants: Constants,
            urlUtils: URLUtils(context).getInstance()
        });

        // initialize controllers
        indexHandler.initialize(playbackController.getIsDynamic());
        abrController.registerStreamType(type, instance);

        bufferController = createBufferControllerForType(type);
        scheduleController = ScheduleController(context).create({
            streamId: streamInfo.id,
            type: type,
            mimeType: mimeType,
            adapter: adapter,
            dashMetrics: dashMetrics,
            timelineConverter: timelineConverter,
            mediaPlayerModel: mediaPlayerModel,
            fragmentModel: fragmentModel,
            abrController: abrController,
            playbackController: playbackController,
            streamController: streamController,
            textController: textController,
            streamProcessor: instance,
            mediaController: mediaController,
            settings: settings
        });
        representationController = RepresentationController(context).create({
            streamId: streamInfo.id,
            type: type,
            abrController: abrController,
            dashMetrics: dashMetrics,
            playbackController: playbackController,
            timelineConverter: timelineConverter,
            dashConstants: DashConstants,
            events: Events,
            eventBus: eventBus,
            errors: Errors
        });
        if (bufferController) {
            bufferController.initialize(mediaSource);
        }
        scheduleController.initialize();
    }

    function resetInitialSettings() {
        mediaInfoArr = [];
        mediaInfo = null;
    }

    function reset(errored, keepBuffers) {
        indexHandler.reset();

        if (bufferController) {
            bufferController.reset(errored, keepBuffers);
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

        eventBus.off(Events.BUFFER_LEVEL_UPDATED, onBufferLevelUpdated, instance);
        eventBus.off(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, instance);

        resetInitialSettings();
        type = null;
        streamInfo = null;
    }

    function isUpdating() {
        return representationController ? representationController.isUpdating() : false;
    }

    function onDataUpdateCompleted(e) {
        if (e.sender.getType() !== getType() || e.sender.getStreamId() !== streamInfo.id || !e.error || e.error.code !== Errors.SEGMENTS_UPDATE_FAILED_ERROR_CODE) return;

        addDVRMetric();
    }

    function onBufferLevelUpdated(e) {
        if (e.sender.getStreamProcessor() !== instance) return;
        let manifest = manifestModel.getValue();
        if (!manifest.doNotUpdateDVRWindowOnBufferUpdated) {
            addDVRMetric();
        }
    }

    function addDVRMetric() {
        const manifestInfo = streamInfo.manifestInfo;
        const isDynamic = manifestInfo.isDynamic;
        const range = timelineConverter.calcSegmentAvailabilityRange(representationController.getCurrentRepresentation(), isDynamic);
        dashMetrics.addDVRInfo(getType(), playbackController.getTime(), manifestInfo, range);
    }

    function getType() {
        return type;
    }

    function getRepresentationController() {
        return representationController;
    }

    function getBuffer() {
        return bufferController ? bufferController.getBuffer() : null;
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

    function updateStreamInfo(newStreamInfo) {
        streamInfo = newStreamInfo;
    }

    function getStreamInfo() {
        return streamInfo;
    }

    function selectMediaInfo(newMediaInfo) {
        if (newMediaInfo !== mediaInfo && (!newMediaInfo || !mediaInfo || (newMediaInfo.type === mediaInfo.type))) {
            mediaInfo = newMediaInfo;
        }

        const newRealAdaptation = adapter.getRealAdaptation(streamInfo, mediaInfo);
        const voRepresentations = adapter.getVoRepresentations(mediaInfo);

        if (representationController) {
            const realAdaptation = representationController.getData();
            const maxQuality = abrController.getTopQualityIndexFor(type, streamInfo.id);
            const minIdx = abrController.getMinAllowedIndexFor(type);

            let quality,
                averageThroughput;
            let bitrate = null;

            if ((realAdaptation === null || (realAdaptation.id != newRealAdaptation.id)) && type !== Constants.FRAGMENTED_TEXT) {
                averageThroughput = abrController.getThroughputHistory().getAverageThroughput(type);
                bitrate = averageThroughput || abrController.getInitialBitrateFor(type);
                quality = abrController.getQualityForBitrate(mediaInfo, bitrate);
            } else {
                quality = abrController.getQualityFor(type);
            }

            if (minIdx !== undefined && quality < minIdx) {
                quality = minIdx;
            }
            if (quality > maxQuality) {
                quality = maxQuality;
            }
            indexHandler.setMimeType(mediaInfo ? mediaInfo.mimeType : null);
            representationController.updateData(newRealAdaptation, voRepresentations, type, quality);
        }
    }

    function addMediaInfo(newMediaInfo, selectNewMediaInfo) {
        if (mediaInfoArr.indexOf(newMediaInfo) === -1) {
            mediaInfoArr.push(newMediaInfo);
        }

        if (selectNewMediaInfo) {
            this.selectMediaInfo(newMediaInfo);
        }
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

    function setMediaSource(mediaSource) {
        bufferController.setMediaSource(mediaSource, getMediaInfo());
    }

    function dischargePreBuffer() {
        bufferController.dischargePreBuffer();
    }

    function getScheduleController() {
        return scheduleController;
    }

    /**
     * Get a specific voRepresentation. If quality parameter is defined, this function will return the voRepresentation for this quality.
     * Otherwise, this function will return the current voRepresentation used by the representationController.
     * @param {number} quality - quality index of the voRepresentaion expected.
     */
    function getRepresentationInfo(quality) {
        let voRepresentation;

        if (quality !== undefined) {
            checkInteger(quality);
            voRepresentation = representationController ? representationController.getRepresentationForQuality(quality) : null;
        } else {
            voRepresentation = representationController ? representationController.getCurrentRepresentation() : null;
        }

        return adapter.convertDataToRepresentationInfo(voRepresentation);
    }

    function isBufferingCompleted() {
        return bufferController ? bufferController.getIsBufferingCompleted() : false;
    }

    function getBufferLevel() {
        return bufferController ? bufferController.getBufferLevel() : 0;
    }

    function switchInitData(representationId, bufferResetEnabled) {
        if (bufferController) {
            bufferController.switchInitData(streamInfo.id, representationId, bufferResetEnabled);
        }
    }

    function createBuffer(previousBuffers) {
        return (getBuffer() || bufferController ? bufferController.createBuffer(mediaInfo, previousBuffers) : null);
    }

    function switchTrackAsked() {
        scheduleController.switchTrackAsked();
    }

    function createBufferControllerForType(type) {
        let controller = null;

        if (!type) {
            errHandler.error(new DashJSError(Errors.MEDIASOURCE_TYPE_UNSUPPORTED_CODE, Errors.MEDIASOURCE_TYPE_UNSUPPORTED_MESSAGE + 'not properly defined'));
            return null;
        }

        if (type === Constants.VIDEO || type === Constants.AUDIO) {
            controller = BufferController(context).create({
                streamId: streamInfo.id,
                type: type,
                dashMetrics: dashMetrics,
                mediaPlayerModel: mediaPlayerModel,
                manifestModel: manifestModel,
                fragmentModel: fragmentModel,
                errHandler: errHandler,
                streamController: streamController,
                mediaController: mediaController,
                adapter: adapter,
                textController: textController,
                abrController: abrController,
                playbackController: playbackController,
                streamProcessor: instance,
                settings: settings
            });
        } else {
            controller = TextBufferController(context).create({
                streamId: streamInfo.id,
                type: type,
                mimeType: mimeType,
                dashMetrics: dashMetrics,
                mediaPlayerModel: mediaPlayerModel,
                manifestModel: manifestModel,
                fragmentModel: fragmentModel,
                errHandler: errHandler,
                streamController: streamController,
                mediaController: mediaController,
                adapter: adapter,
                textController: textController,
                abrController: abrController,
                playbackController: playbackController,
                streamProcessor: instance,
                settings: settings
            });
        }

        return controller;
    }

    function setIndexHandlerTime(value) {
        if (indexHandler) {
            indexHandler.setCurrentTime(value);
        }
    }

    function getIndexHandlerTime() {
        return indexHandler ? indexHandler.getCurrentTime() : NaN;
    }

    function resetIndexHandler() {
        if (indexHandler) {
            indexHandler.resetIndex();
        }
    }

    function getInitRequest(quality) {
        checkInteger(quality);

        const representation = representationController ? representationController.getRepresentationForQuality(quality) : null;

        return indexHandler ? indexHandler.getInitRequest(getMediaInfo(), representation) : null;
    }

    function getFragmentRequest(representationInfo, time, options) {
        let fragRequest = null;

        if (indexHandler) {
            const representation = representationController && representationInfo ? representationController.getRepresentationForQuality(representationInfo.quality) : null;

            // if time and options are undefined, it means the next segment is requested
            // otherwise, the segment at this specific time is requested.
            if (time !== undefined && options !== undefined) {
                fragRequest = indexHandler.getSegmentRequestForTime(getMediaInfo(), representation, time, options);
            } else {
                fragRequest = indexHandler.getNextSegmentRequest(getMediaInfo(), representation);
            }
        }

        return fragRequest;
    }

    instance = {
        initialize: initialize,
        isUpdating: isUpdating,
        getType: getType,
        getBufferController: getBufferController,
        getFragmentModel: getFragmentModel,
        getScheduleController: getScheduleController,
        getRepresentationController: getRepresentationController,
        getRepresentationInfo: getRepresentationInfo,
        getBufferLevel: getBufferLevel,
        switchInitData: switchInitData,
        isBufferingCompleted: isBufferingCompleted,
        createBuffer: createBuffer,
        updateStreamInfo: updateStreamInfo,
        getStreamInfo: getStreamInfo,
        selectMediaInfo: selectMediaInfo,
        addMediaInfo: addMediaInfo,
        switchTrackAsked: switchTrackAsked,
        getMediaInfoArr: getMediaInfoArr,
        getMediaInfo: getMediaInfo,
        getMediaSource: getMediaSource,
        setMediaSource: setMediaSource,
        dischargePreBuffer: dischargePreBuffer,
        getBuffer: getBuffer,
        setBuffer: setBuffer,
        setIndexHandlerTime: setIndexHandlerTime,
        getIndexHandlerTime: getIndexHandlerTime,
        resetIndexHandler: resetIndexHandler,
        getInitRequest: getInitRequest,
        getFragmentRequest: getFragmentRequest,
        reset: reset
    };

    setup();

    return instance;
}
StreamProcessor.__dashjs_factory_name = 'StreamProcessor';
export default FactoryMaker.getClassFactory(StreamProcessor);
