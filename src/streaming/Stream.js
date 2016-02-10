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
import LiveEdgeFinder from './utils/LiveEdgeFinder.js';
import StreamProcessor from './StreamProcessor.js';
import MediaController from './controllers/MediaController.js';
import EventController from './controllers/EventController.js';
import FragmentController from './controllers/FragmentController.js';
import AbrController from './controllers/AbrController.js';
import VideoModel from './models/VideoModel.js';
import MetricsModel from './models/MetricsModel.js';
import PlaybackController from './controllers/PlaybackController.js';
import DashHandler from '../dash/DashHandler.js';
import SegmentBaseLoader from '../dash/SegmentBaseLoader.js';
import DashMetrics from '../dash/DashMetrics.js';
import EventBus from '../core/EventBus.js';
import Events from '../core/events/Events.js';
import Debug from '../core/Debug.js';
import FactoryMaker from '../core/FactoryMaker.js';
import TextSourceBuffer from './TextSourceBuffer.js';

function Stream(config) {

    const DATA_UPDATE_FAILED_ERROR_CODE = 1;

    let context = this.context;
    let log = Debug(context).getInstance().log;
    let eventBus = EventBus(context).getInstance();

    let manifestModel = config.manifestModel;
    let manifestUpdater = config.manifestUpdater;
    let adapter = config.adapter;
    let capabilities = config.capabilities;
    let errHandler = config.errHandler;
    let timelineConverter = config.timelineConverter;

    let instance,
        streamProcessors,
        isStreamActivated,
        isMediaInitialized,
        streamInfo,
        updateError,
        isUpdating,
        initialized,
        protectionController,
        liveEdgeFinder,
        playbackController,
        mediaController,
        fragmentController,
        eventController,
        abrController,
        textSourceBuffer;


    function setup() {
        streamProcessors = [];
        isStreamActivated = false;
        isMediaInitialized = false;
        streamInfo = null;
        updateError = {};
        isUpdating = false;
        initialized = false;

        liveEdgeFinder = LiveEdgeFinder(context).getInstance();
        playbackController = PlaybackController(context).getInstance();
        abrController = AbrController(context).getInstance();
        mediaController = MediaController(context).getInstance();
        fragmentController = FragmentController(context).create();
        textSourceBuffer = TextSourceBuffer(context).getInstance();

        eventBus.on(Events.BUFFERING_COMPLETED, onBufferingCompleted, instance);
        eventBus.on(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, instance);
    }

    function initialize(StreamInfo, ProtectionController) {
        streamInfo = StreamInfo;

        //TODO will need to separate this once DRM is optional.
        protectionController = ProtectionController;
        if (protectionController) {
            eventBus.on(Events.KEY_ERROR, onProtectionError, instance);
            eventBus.on(Events.SERVER_CERTIFICATE_UPDATED, onProtectionError, instance);
            eventBus.on(Events.LICENSE_REQUEST_COMPLETE, onProtectionError, instance);
            eventBus.on(Events.KEY_SYSTEM_SELECTED, onProtectionError, instance);
            eventBus.on(Events.KEY_SESSION_CREATED, onProtectionError, instance);
        }
    }

    /**
     * Activates Stream by re-initializing some of its components
     * @param mediaSource {MediaSource}
     * @memberof Stream#
     */
    function activate(mediaSource) {
        if (!isStreamActivated) {
            eventBus.on(Events.CURRENT_TRACK_CHANGED, onCurrentTrackChanged, instance);
            initializeMedia(mediaSource);
        } else {
            createBuffers();
        }
    }

    /**
     * Partially resets some of the Stream elements
     * @memberof Stream#
     */
    function deactivate() {
        var ln = streamProcessors.length;
        var i = 0;

        for (i; i < ln; i++) {
            streamProcessors[i].reset();
        }

        streamProcessors = [];
        isStreamActivated = false;
        isMediaInitialized = false;
        resetEventController();
        eventBus.off(Events.CURRENT_TRACK_CHANGED, onCurrentTrackChanged, instance);
    }

    function reset() {
        playbackController.pause();
        fragmentController.reset();
        liveEdgeFinder.abortSearch();
        deactivate();

        playbackController = null;
        fragmentController = null;
        mediaController = null;
        abrController = null;
        manifestUpdater = null;
        manifestModel = null;
        adapter = null;
        capabilities = null;
        log = null;
        errHandler = null;
        isUpdating = false;
        initialized = false;
        updateError = {};

        eventBus.off(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, instance);
        eventBus.off(Events.BUFFERING_COMPLETED, onBufferingCompleted, instance);
        eventBus.off(Events.KEY_ERROR, onProtectionError, instance);
        eventBus.off(Events.SERVER_CERTIFICATE_UPDATED, onProtectionError, instance);
        eventBus.off(Events.LICENSE_REQUEST_COMPLETE, onProtectionError, instance);
        eventBus.off(Events.KEY_SYSTEM_SELECTED, onProtectionError, instance);
        eventBus.off(Events.KEY_SESSION_CREATED, onProtectionError, instance);
    }

    function getDuration() {
        return streamInfo.duration;
    }

    function getStartTime() {
        return streamInfo.start;
    }

    function getStreamIndex() {
        return streamInfo.index;
    }

    function getId() {
        return streamInfo.id;
    }

    function getStreamInfo() {
        return streamInfo;
    }

    function hasMedia(type) {
        return (getMediaInfo(type) !== null);
    }

    /**
     * @param type
     * @returns {Array}
     * @memberof Stream#
     */
    function getBitrateListFor(type) {
        var mediaInfo = getMediaInfo(type);
        return abrController.getBitrateList(mediaInfo);
    }

    function startEventController() {
        if (eventController) {
            eventController.start();
        }
    }

    function resetEventController() {
        if (eventController) {
            eventController.reset();
        }
    }

    function isActivated() {
        return isStreamActivated;
    }

    function isInitialized() {
        return initialized;
    }

    function onProtectionError(event) {
        if (event.error) {
            errHandler.mediaKeySessionError(event.error);
            log(event.error);
            reset();
        }
    }

    function getMimeTypeOrType(mediaInfo) {
        return mediaInfo.type === 'text' ? mediaInfo.mimeType : mediaInfo.type;
    }

    function isMediaSupported(mediaInfo, mediaSource, manifest) {
        var type = mediaInfo.type;
        var codec,
            msg;

        if (type === 'muxed' && mediaInfo) {
            msg = 'Multiplexed representations are intentionally not supported, as they are not compliant with the DASH-AVC/264 guidelines';
            log(msg);
            errHandler.manifestError(msg, 'multiplexedrep', manifestModel.getValue());
            return false;
        }

        if ((type === 'text') || (type === 'fragmentedText') || (type === 'embeddedText')) return true;

        codec = mediaInfo.codec;
        log(type + ' codec: ' + codec);

        if (!!mediaInfo.contentProtection && !capabilities.supportsEncryptedMedia()) {
            errHandler.capabilityError('encryptedmedia');
        } else if (!capabilities.supportsCodec(VideoModel(context).getInstance().getElement(), codec)) {
            msg = type + 'Codec (' + codec + ') is not supported.';
            errHandler.manifestError(msg, 'codec', manifest);
            log(msg);
            return false;
        }

        return true;
    }

    function onCurrentTrackChanged(e) {
        if (e.newMediaInfo.streamInfo.id !== streamInfo.id) return;

        var processor = getProcessorForMediaInfo(e.oldMediaInfo);
        if (!processor) return;

        var currentTime = playbackController.getTime();
        var buffer = processor.getBuffer();
        var mediaInfo = e.newMediaInfo;
        var manifest = manifestModel.getValue();
        var idx = streamProcessors.indexOf(processor);
        var mediaSource = processor.getMediaSource();

        if (mediaInfo.type !== 'fragmentedText') {
            processor.reset(true);
            createStreamProcessor(mediaInfo, manifest, mediaSource, {buffer: buffer, replaceIdx: idx, currentTime: currentTime});
            playbackController.seek(playbackController.getTime());
        }else {
            processor.updateMediaInfo(manifest, mediaInfo);
        }
    }

    function createIndexHandler() {

        let segmentBaseLoader = SegmentBaseLoader(context).getInstance();
        segmentBaseLoader.initialize();

        let handler = DashHandler(context).create({
            segmentBaseLoader: segmentBaseLoader,
            timelineConverter: timelineConverter,
            dashMetrics: DashMetrics(context).getInstance(),
            metricsModel: MetricsModel(context).getInstance()
        });

        return handler;
    }

    function createStreamProcessor(mediaInfo, manifest, mediaSource, optionalSettings) {
        var streamProcessor = StreamProcessor(context).create({
            indexHandler: createIndexHandler(),
            timelineConverter: timelineConverter,
            adapter: adapter,
            manifestModel: manifestModel
        });
        var allMediaForType = adapter.getAllMediaInfoForType(manifest, streamInfo, mediaInfo.type);

        streamProcessor.initialize(getMimeTypeOrType(mediaInfo), fragmentController, mediaSource, instance, eventController);
        abrController.updateTopQualityIndex(mediaInfo);

        if (optionalSettings) {
            streamProcessor.setBuffer(optionalSettings.buffer);
            streamProcessors[optionalSettings.replaceIdx] = streamProcessor;
            streamProcessor.setIndexHandlerTime(optionalSettings.currentTime);
        } else {
            streamProcessors.push(streamProcessor);
        }

        if ((mediaInfo.type === 'text' || mediaInfo.type === 'fragmentedText')) {
            var idx;
            for (var i = 0; i < allMediaForType.length; i++) {
                if (allMediaForType[i].index === mediaInfo.index) {
                    idx = i;
                }
                streamProcessor.updateMediaInfo(manifest, allMediaForType[i]);//creates text tracks for all adaptations in one stream processor
            }
            if (mediaInfo.type === 'fragmentedText') {
                streamProcessor.updateMediaInfo(manifest, allMediaForType[idx]);//sets the initial media info
            }
        }else {
            streamProcessor.updateMediaInfo(manifest, mediaInfo);
        }

        return streamProcessor;
    }

    function initializeMediaForType(type, mediaSource) {
        var manifest = manifestModel.getValue();
        var allMediaForType = adapter.getAllMediaInfoForType(manifest, streamInfo, type);

        var mediaInfo = null;
        var initialMediaInfo;

        if (!allMediaForType || allMediaForType.length === 0) {
            log('No ' + type + ' data.');
            return;
        }

        for (var i = 0, ln = allMediaForType.length; i < ln; i++) {
            mediaInfo = allMediaForType[i];

            if (type === 'embeddedText') {
                textSourceBuffer.addEmbeddedTrack(mediaInfo);
            } else {
                if (!isMediaSupported(mediaInfo, mediaSource, manifest)) continue;

                if (mediaController.isMultiTrackSupportedByType(mediaInfo.type)) {
                    mediaController.addTrack(mediaInfo, streamInfo);
                }
            }
        }

        if (type === 'embeddedText' || mediaController.getTracksFor(type, streamInfo).length === 0) {
            return;
        }

        mediaController.checkInitialMediaSettings(streamInfo);
        initialMediaInfo = mediaController.getCurrentTrackFor(type, streamInfo);

        // TODO : How to tell index handler live/duration?
        // TODO : Pass to controller and then pass to each method on handler?

        createStreamProcessor(initialMediaInfo, manifest, mediaSource);
    }

    function initializeMedia(mediaSource) {
        var manifest = manifestModel.getValue();
        var events;

        eventController = EventController(context).getInstance();
        eventController.initialize();
        eventController.setConfig({
            manifestModel: manifestModel,
            manifestUpdater: manifestUpdater
        });
        events = adapter.getEventsFor(manifest, streamInfo);
        eventController.addInlineEvents(events);

        isUpdating = true;
        initializeMediaForType('video', mediaSource);
        initializeMediaForType('audio', mediaSource);
        initializeMediaForType('text', mediaSource);
        initializeMediaForType('fragmentedText', mediaSource);
        initializeMediaForType('embeddedText', mediaSource);
        initializeMediaForType('muxed', mediaSource);

        createBuffers();

        //TODO. Consider initialization of TextSourceBuffer here if embeddedText, but no sideloadedText.

        isMediaInitialized = true;
        isUpdating = false;

        if (streamProcessors.length === 0) {
            var msg = 'No streams to play.';
            errHandler.manifestError(msg, 'nostreams', manifest);
            log(msg);
        } else {
            liveEdgeFinder.initialize(timelineConverter, streamProcessors[0]);
            //log("Playback initialized!");
            checkIfInitializationCompleted();
        }
    }

    function checkIfInitializationCompleted() {
        var ln = streamProcessors.length;
        var hasError = !!updateError.audio || !!updateError.video;
        var error = hasError ? new Error(DATA_UPDATE_FAILED_ERROR_CODE, 'Data update failed', null) : null;
        var i = 0;

        for (i; i < ln; i++) {
            if (streamProcessors[i].isUpdating() || isUpdating) return;
        }

        initialized = true;
        isStreamActivated = true;
        eventBus.trigger(Events.STREAM_INITIALIZED, {streamInfo: streamInfo, error: error});
        if (!isMediaInitialized) return;
        if (protectionController) {
            protectionController.initialize(manifestModel.getValue(), getMediaInfo('audio'), getMediaInfo('video'));
        }
    }

    function getMediaInfo(type) {
        var ln = streamProcessors.length;
        var mediaCtrl = null;

        for (var i = 0; i < ln; i++) {
            mediaCtrl = streamProcessors[i];

            if (mediaCtrl.getType() === type) return mediaCtrl.getMediaInfo();
        }

        return null;
    }

    function createBuffers() {
        for (var i = 0, ln = streamProcessors.length; i < ln; i++) {
            streamProcessors[i].createBuffer();
        }
    }

    function onBufferingCompleted(e) {
        if (e.streamInfo !== streamInfo) return;

        var processors = getProcessors();
        var ln = processors.length;
        var i = 0;

        // if there is at least one buffer controller that has not completed buffering yet do nothing
        for (i; i < ln; i++) {
            if (!processors[i].isBufferingCompleted()) return;
        }

        eventBus.trigger(Events.STREAM_BUFFERING_COMPLETED, {streamInfo: streamInfo});
    }

    function onDataUpdateCompleted(e) {
        var sp = e.sender.getStreamProcessor();

        if (sp.getStreamInfo() !== streamInfo) return;

        updateError[sp.getType()] = e.error;
        checkIfInitializationCompleted();
    }

    function getProcessorForMediaInfo(mediaInfo) {
        if (!mediaInfo) return false;

        var processors = getProcessors();

        return processors.filter(function (processor) {
            return (processor.getType() === mediaInfo.type);
        })[0];
    }

    function getProcessors() {
        var ln = streamProcessors.length;
        var arr = [];
        var i = 0;

        var type,
            controller;

        for (i; i < ln; i++) {
            controller = streamProcessors[i];
            type = controller.getType();

            if (type === 'audio' || type === 'video' || type === 'fragmentedText') {
                arr.push(controller);
            }
        }

        return arr;
    }

    function updateData(updatedStreamInfo) {
        var ln = streamProcessors.length;
        var manifest = manifestModel.getValue();

        var i = 0;
        var mediaInfo,
           events,
           controller;

        isStreamActivated = false;
        streamInfo = updatedStreamInfo;
        log('Manifest updated... set new data on buffers.');

        if (eventController) {
            events = adapter.getEventsFor(manifest, streamInfo);
            eventController.addInlineEvents(events);
        }

        isUpdating = true;
        initialized = false;

        for (i; i < ln; i++) {
            controller = streamProcessors[i];
            mediaInfo = adapter.getMediaInfoForType(manifest, streamInfo, controller.getType());
            abrController.updateTopQualityIndex(mediaInfo);
            controller.updateMediaInfo(manifest, mediaInfo);
        }

        isUpdating = false;
        checkIfInitializationCompleted();
    }

    instance = {
        initialize: initialize,
        activate: activate,
        deactivate: deactivate,
        getDuration: getDuration,
        getStartTime: getStartTime,
        getStreamIndex: getStreamIndex,
        getId: getId,
        getStreamInfo: getStreamInfo,
        hasMedia: hasMedia,
        getBitrateListFor: getBitrateListFor,
        startEventController: startEventController,
        resetEventController: resetEventController,
        isActivated: isActivated,
        isInitialized: isInitialized,
        updateData: updateData,
        reset: reset,
        getProcessors: getProcessors
    };

    setup();
    return instance;
}

Stream.__dashjs_factory_name = 'Stream';
export default FactoryMaker.getClassFactory(Stream);
