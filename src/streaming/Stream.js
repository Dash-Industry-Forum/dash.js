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
import StreamProcessor from './StreamProcessor';
import EventController from './controllers/EventController';
import FragmentController from './controllers/FragmentController';
import EventBus from '../core/EventBus';
import Events from '../core/events/Events';
import Debug from '../core/Debug';
import FactoryMaker from '../core/FactoryMaker';

function Stream(config) {

    const DATA_UPDATE_FAILED_ERROR_CODE = 1;

    let context = this.context;
    let log = Debug(context).getInstance().log;
    let eventBus = EventBus(context).getInstance();

    let manifestModel = config.manifestModel;
    let dashManifestModel = config.dashManifestModel;
    let mediaPlayerModel = config.mediaPlayerModel;
    let manifestUpdater = config.manifestUpdater;
    let adapter = config.adapter;
    let capabilities = config.capabilities;
    let errHandler = config.errHandler;
    let timelineConverter = config.timelineConverter;
    let metricsModel = config.metricsModel;
    let abrController = config.abrController;
    let playbackController = config.playbackController;
    let mediaController = config.mediaController;
    let textController = config.textController;

    let instance,
        streamProcessors,
        isStreamActivated,
        isMediaInitialized,
        streamInfo,
        updateError,
        isUpdating,
        protectionController,
        fragmentController,
        eventController,
        trackChangedEvent;

    function setup() {
        resetInitialSettings();

        fragmentController = FragmentController(context).create({
            mediaPlayerModel: mediaPlayerModel,
            metricsModel: metricsModel,
            errHandler: errHandler
        });

        eventBus.on(Events.BUFFERING_COMPLETED, onBufferingCompleted, instance);
        eventBus.on(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, instance);
    }

    function initialize(StreamInfo, ProtectionController) {
        streamInfo = StreamInfo;
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
     * @param {MediaSource} mediaSource
     * @memberof Stream#
     */
    function activate(mediaSource) {
        if (!isStreamActivated) {
            eventBus.on(Events.CURRENT_TRACK_CHANGED, onCurrentTrackChanged, instance);
            initializeMedia(mediaSource);
            isStreamActivated = true;
        }
        //else { // TODO Check track change mode but why is this here. commented it out for now to check.
        //    createBuffers();
        //}
    }

    /**
     * Partially resets some of the Stream elements
     * @memberof Stream#
     */
    function deactivate() {
        let ln = streamProcessors ? streamProcessors.length : 0;
        for (let i = 0; i < ln; i++) {
            let fragmentModel = streamProcessors[i].getFragmentModel();
            fragmentModel.removeExecutedRequestsBeforeTime(getStartTime() + getDuration());
            streamProcessors[i].reset();
        }
        streamProcessors = [];
        isStreamActivated = false;
        isMediaInitialized = false;
        clearEventController();
        eventBus.off(Events.CURRENT_TRACK_CHANGED, onCurrentTrackChanged, instance);
    }

    function resetInitialSettings() {
        deactivate();
        streamInfo = null;
        updateError = {};
        isUpdating = false;
    }

    function reset() {

        if (playbackController) {
            playbackController.pause();
        }

        if (fragmentController) {
            fragmentController.reset();
            fragmentController = null;
        }

        resetInitialSettings();

        log = null;

        eventBus.off(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, instance);
        eventBus.off(Events.BUFFERING_COMPLETED, onBufferingCompleted, instance);
        eventBus.off(Events.KEY_ERROR, onProtectionError, instance);
        eventBus.off(Events.SERVER_CERTIFICATE_UPDATED, onProtectionError, instance);
        eventBus.off(Events.LICENSE_REQUEST_COMPLETE, onProtectionError, instance);
        eventBus.off(Events.KEY_SYSTEM_SELECTED, onProtectionError, instance);
        eventBus.off(Events.KEY_SESSION_CREATED, onProtectionError, instance);
    }

    function getDuration() {
        return streamInfo ? streamInfo.duration : NaN;
    }

    function getStartTime() {
        return streamInfo ? streamInfo.start : NaN;
    }

    function getId() {
        return streamInfo ? streamInfo.id : NaN;
    }

    function getStreamInfo() {
        return streamInfo;
    }

    function getEventController() {
        return eventController;
    }

    function getFragmentController() {
        return fragmentController;
    }

    function checkConfig() {
        if (!abrController || !abrController.hasOwnProperty('getBitrateList') || !adapter || !adapter.hasOwnProperty('getAllMediaInfoForType') || !adapter.hasOwnProperty('getEventsFor')) {
            throw new Error('Missing config parameter(s)');
        }
    }

    /**
     * @param {string} type
     * @returns {Array}
     * @memberof Stream#
     */
    function getBitrateListFor(type) {
        checkConfig();
        let mediaInfo = getMediaInfo(type);
        return abrController.getBitrateList(mediaInfo);
    }

    function startEventController() {
        if (eventController) {
            eventController.start();
        }
    }

    function clearEventController() {
        if (eventController) {
            eventController.clear();
        }
    }

    function onProtectionError(event) {
        if (event.error) {
            errHandler.mediaKeySessionError(event.error);
            log(event.error);
            reset();
        }
    }

    function getMimeTypeOrType(mediaInfo) {
        return mediaInfo.type === Constants.TEXT ? mediaInfo.mimeType : mediaInfo.type;
    }

    function isMediaSupported(mediaInfo) {
        const type = mediaInfo.type;
        let codec,
            msg;

        if (type === Constants.MUXED && mediaInfo) {
            msg = 'Multiplexed representations are intentionally not supported, as they are not compliant with the DASH-AVC/264 guidelines';
            log(msg);
            errHandler.manifestError(msg, 'multiplexedrep', manifestModel.getValue());
            return false;
        }

        if ((type === Constants.TEXT) || (type === Constants.FRAGMENTED_TEXT) || (type === Constants.EMBEDDED_TEXT)) {
            return true;
        }
        codec = mediaInfo.codec;
        log(type + ' codec: ' + codec);

        if (!!mediaInfo.contentProtection && !capabilities.supportsEncryptedMedia()) {
            errHandler.capabilityError('encryptedmedia');
        } else if (!capabilities.supportsCodec(codec)) {
            msg = type + 'Codec (' + codec + ') is not supported.';
            errHandler.manifestError(msg, 'codec', manifestModel.getValue());
            log(msg);
            return false;
        }

        return true;
    }

    function onCurrentTrackChanged(e) {
        if (e.newMediaInfo.streamInfo.id !== streamInfo.id) return;

        let processor = getProcessorForMediaInfo(e.oldMediaInfo);
        if (!processor) return;

        let currentTime = playbackController.getTime();
        log('Stream -  Process track changed at current time ' + currentTime);
        let mediaInfo = e.newMediaInfo;
        let manifest = manifestModel.getValue();

        log('Stream -  Update stream controller');
        if (manifest.refreshManifestOnSwitchTrack) {
            log('Stream -  Refreshing manifest for switch track');
            trackChangedEvent = e;
            manifestUpdater.refreshManifest();
        } else {
            processor.updateMediaInfo(mediaInfo);
            if (mediaInfo.type !== Constants.FRAGMENTED_TEXT) {
                abrController.updateTopQualityIndex(mediaInfo);
                processor.switchTrackAsked();
            }
        }
    }

    function createStreamProcessor(mediaInfo, mediaSource, optionalSettings) {
        let streamProcessor = StreamProcessor(context).create({
            type: getMimeTypeOrType(mediaInfo),
            mimeType: mediaInfo.mimeType,
            timelineConverter: timelineConverter,
            adapter: adapter,
            manifestModel: manifestModel,
            dashManifestModel: dashManifestModel,
            mediaPlayerModel: mediaPlayerModel,
            metricsModel: metricsModel,
            dashMetrics: config.dashMetrics,
            baseURLController: config.baseURLController,
            stream: instance,
            abrController: abrController,
            domStorage: config.domStorage,
            playbackController: playbackController,
            mediaController: mediaController,
            streamController: config.streamController,
            textController: textController,
            sourceBufferController: config.sourceBufferController,
            errHandler: errHandler
        });

        let allMediaForType = adapter.getAllMediaInfoForType(streamInfo, mediaInfo.type);
        streamProcessor.initialize(mediaSource);
        abrController.updateTopQualityIndex(mediaInfo);

        if (optionalSettings) {
            streamProcessor.setBuffer(optionalSettings.buffer);
            streamProcessor.getIndexHandler().setCurrentTime(optionalSettings.currentTime);
            streamProcessors[optionalSettings.replaceIdx] = streamProcessor;
        } else {
            streamProcessors.push(streamProcessor);
        }

        if (optionalSettings && optionalSettings.ignoreMediaInfo) {
            return;
        }

        if ((mediaInfo.type === Constants.TEXT || mediaInfo.type === Constants.FRAGMENTED_TEXT)) {
            let idx;
            for (let i = 0; i < allMediaForType.length; i++) {
                if (allMediaForType[i].index === mediaInfo.index) {
                    idx = i;
                }
                streamProcessor.updateMediaInfo(allMediaForType[i]); //creates text tracks for all adaptations in one stream processor
            }
            if (mediaInfo.type === Constants.FRAGMENTED_TEXT) {
                streamProcessor.updateMediaInfo(allMediaForType[idx]); //sets the initial media info
            }
        } else {
            streamProcessor.updateMediaInfo(mediaInfo);
        }
    }

    function initializeMediaForType(type, mediaSource) {
        const allMediaForType = adapter.getAllMediaInfoForType(streamInfo, type);

        let mediaInfo = null;
        let initialMediaInfo;

        if (!allMediaForType || allMediaForType.length === 0) {
            log('No ' + type + ' data.');
            return;
        }

        for (let i = 0, ln = allMediaForType.length; i < ln; i++) {
            mediaInfo = allMediaForType[i];

            if (type === Constants.EMBEDDED_TEXT) {
                textController.addEmbeddedTrack(mediaInfo);
            } else {
                if (!isMediaSupported(mediaInfo)) {
                    continue;
                }
                if (mediaController.isMultiTrackSupportedByType(mediaInfo.type)) {
                    mediaController.addTrack(mediaInfo, streamInfo);
                }
            }
        }

        if (type === Constants.EMBEDDED_TEXT || mediaController.getTracksFor(type, streamInfo).length === 0) {
            return;
        }

        mediaController.checkInitialMediaSettingsForType(type, streamInfo);
        initialMediaInfo = mediaController.getCurrentTrackFor(type, streamInfo);

        // TODO : How to tell index handler live/duration?
        // TODO : Pass to controller and then pass to each method on handler?

        createStreamProcessor(initialMediaInfo, mediaSource);
    }

    function initializeMedia(mediaSource) {
        checkConfig();
        let events;

        eventController = EventController(context).create();

        eventController.setConfig({
            manifestModel: manifestModel,
            manifestUpdater: manifestUpdater,
            playbackController: playbackController
        });
        events = adapter.getEventsFor(streamInfo);
        eventController.addInlineEvents(events);

        isUpdating = true;

        filterCodecs(Constants.VIDEO);
        filterCodecs(Constants.AUDIO);

        initializeMediaForType(Constants.VIDEO, mediaSource);
        initializeMediaForType(Constants.AUDIO, mediaSource);
        initializeMediaForType(Constants.TEXT, mediaSource);
        initializeMediaForType(Constants.FRAGMENTED_TEXT, mediaSource);
        initializeMediaForType(Constants.EMBEDDED_TEXT, mediaSource);
        initializeMediaForType(Constants.MUXED, mediaSource);

        createBuffers();

        //TODO. Consider initialization of TextSourceBuffer here if embeddedText, but no sideloadedText.

        isMediaInitialized = true;
        isUpdating = false;

        if (streamProcessors.length === 0) {
            let msg = 'No streams to play.';
            errHandler.manifestError(msg, 'nostreams', manifestModel.getValue());
            log(msg);
        } else {
            //log("Playback initialized!");
            checkIfInitializationCompleted();
        }
    }

    function filterCodecs(type) {
        const realAdaptation = dashManifestModel.getAdaptationForType(manifestModel.getValue(), streamInfo.index, type, streamInfo);

        if (!realAdaptation || !Array.isArray(realAdaptation.Representation_asArray)) return null;

        // Filter codecs that are not supported
        realAdaptation.Representation_asArray.filter((_, i) => {
            // keep at least codec from lowest representation
            if (i === 0) return true;

            const codec = dashManifestModel.getCodec(realAdaptation, i);
            if (!capabilities.supportsCodec(codec)) {
                log('[Stream] codec not supported: ' + codec);
                return false;
            }
            return true;
        });
    }

    function checkIfInitializationCompleted() {
        const ln = streamProcessors.length;
        const hasError = !!updateError.audio || !!updateError.video;
        let error = hasError ? new Error(DATA_UPDATE_FAILED_ERROR_CODE, 'Data update failed', null) : null;

        for (let i = 0; i < ln; i++) {
            if (streamProcessors[i].isUpdating() || isUpdating) {
                return;
            }
        }

        if (!isMediaInitialized) {
            return;
        }
        if (protectionController) {
            protectionController.initialize(manifestModel.getValue(), getMediaInfo(Constants.AUDIO), getMediaInfo(Constants.VIDEO));
        }
        eventBus.trigger(Events.STREAM_INITIALIZED, {
            streamInfo: streamInfo,
            error: error
        });
    }

    function getMediaInfo(type) {
        const ln = streamProcessors.length;
        let mediaCtrl = null;

        for (let i = 0; i < ln; i++) {
            mediaCtrl = streamProcessors[i];

            if (mediaCtrl.getType() === type) {
                return mediaCtrl.getMediaInfo();
            }
        }

        return null;
    }

    function createBuffers() {
        for (let i = 0, ln = streamProcessors.length; i < ln; i++) {
            streamProcessors[i].createBuffer();
        }
    }

    function onBufferingCompleted(e) {
        if (e.streamInfo !== streamInfo) {
            return;
        }

        let processors = getProcessors();
        const ln = processors.length;

        // if there is at least one buffer controller that has not completed buffering yet do nothing
        for (let i = 0; i < ln; i++) {
            if (!processors[i].isBufferingCompleted()) {
                return;
            }
        }

        eventBus.trigger(Events.STREAM_BUFFERING_COMPLETED, {
            streamInfo: streamInfo
        });
    }

    function onDataUpdateCompleted(e) {
        let sp = e.sender.getStreamProcessor();

        if (sp.getStreamInfo() !== streamInfo) {
            return;
        }

        updateError[sp.getType()] = e.error;
        checkIfInitializationCompleted();
    }

    function getProcessorForMediaInfo(mediaInfo) {
        if (!mediaInfo) {
            return false;
        }

        let processors = getProcessors();

        return processors.filter(function (processor) {
            return (processor.getType() === mediaInfo.type);
        })[0];
    }

    function getProcessors() {
        const ln = streamProcessors.length;
        let arr = [];

        let type,
            controller;

        for (let i = 0; i < ln; i++) {
            controller = streamProcessors[i];
            type = controller.getType();

            if (type === Constants.AUDIO || type === Constants.VIDEO || type === Constants.FRAGMENTED_TEXT) {
                arr.push(controller);
            }
        }

        return arr;
    }

    function updateData(updatedStreamInfo) {

        log('Manifest updated... updating data system wide.');

        isStreamActivated = false;
        isUpdating = true;
        streamInfo = updatedStreamInfo;

        if (eventController) {
            let events = adapter.getEventsFor(streamInfo);
            eventController.addInlineEvents(events);
        }

        filterCodecs(Constants.VIDEO);
        filterCodecs(Constants.AUDIO);

        for (let i = 0, ln = streamProcessors.length; i < ln; i++) {
            let streamProcessor = streamProcessors[i];
            let mediaInfo = adapter.getMediaInfoForType(streamInfo, streamProcessor.getType());
            abrController.updateTopQualityIndex(mediaInfo);
            streamProcessor.updateMediaInfo(mediaInfo);
        }

        if (trackChangedEvent) {
            let mediaInfo = trackChangedEvent.newMediaInfo;
            if (mediaInfo.type !== 'fragmentedText') {
                let processor = getProcessorForMediaInfo(trackChangedEvent.oldMediaInfo);
                if (!processor) return;
                processor.switchTrackAsked();
                trackChangedEvent = undefined;
            }
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
        getId: getId,
        getStreamInfo: getStreamInfo,
        getFragmentController: getFragmentController,
        getEventController: getEventController,
        getBitrateListFor: getBitrateListFor,
        startEventController: startEventController,
        updateData: updateData,
        reset: reset,
        getProcessors: getProcessors
    };

    setup();
    return instance;
}

Stream.__dashjs_factory_name = 'Stream';
export default FactoryMaker.getClassFactory(Stream);
