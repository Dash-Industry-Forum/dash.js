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
import ThumbnailController from './thumbnail/ThumbnailController';
import EventBus from '../core/EventBus';
import Events from '../core/events/Events';
import Debug from '../core/Debug';
import Errors from '../core/errors/Errors';
import FactoryMaker from '../core/FactoryMaker';
import DashJSError from './vo/DashJSError';

function Stream(config) {

    config = config || {};
    const context = this.context;
    const eventBus = EventBus(context).getInstance();

    const manifestModel = config.manifestModel;
    const mediaPlayerModel = config.mediaPlayerModel;
    const manifestUpdater = config.manifestUpdater;
    const adapter = config.adapter;
    const capabilities = config.capabilities;
    const errHandler = config.errHandler;
    const timelineConverter = config.timelineConverter;
    const dashMetrics = config.dashMetrics;
    const abrController = config.abrController;
    const playbackController = config.playbackController;
    const mediaController = config.mediaController;
    const textController = config.textController;
    const videoModel = config.videoModel;
    const settings = config.settings;

    let instance,
        logger,
        streamProcessors,
        isStreamActivated,
        isMediaInitialized,
        streamInfo,
        updateError,
        isUpdating,
        protectionController,
        fragmentController,
        thumbnailController,
        eventController,
        preloaded,
        trackChangedEvent;

    const codecCompatibilityTable = [
        {
            'codec': 'avc1',
            'compatibleCodecs': ['avc3']
        },
        {
            'codec': 'avc3',
            'compatibleCodecs': ['avc1']
        }
    ];

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        resetInitialSettings();

        fragmentController = FragmentController(context).create({
            mediaPlayerModel: mediaPlayerModel,
            dashMetrics: dashMetrics,
            errHandler: errHandler,
            settings: settings
        });

        registerEvents();
    }

    function registerEvents() {
        eventBus.on(Events.BUFFERING_COMPLETED, onBufferingCompleted, instance);
        eventBus.on(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, instance);
    }

    function unRegisterEvents() {
        eventBus.off(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, instance);
        eventBus.off(Events.BUFFERING_COMPLETED, onBufferingCompleted, instance);
    }

    function registerProtectionEvents() {
        if (protectionController) {
            eventBus.on(Events.KEY_ERROR, onProtectionError, instance);
            eventBus.on(Events.SERVER_CERTIFICATE_UPDATED, onProtectionError, instance);
            eventBus.on(Events.LICENSE_REQUEST_COMPLETE, onProtectionError, instance);
            eventBus.on(Events.KEY_SYSTEM_SELECTED, onProtectionError, instance);
            eventBus.on(Events.KEY_SESSION_CREATED, onProtectionError, instance);
            eventBus.on(Events.KEY_STATUSES_CHANGED, onProtectionError, instance);
        }
    }

    function unRegisterProtectionEvents() {
        if (protectionController) {
            eventBus.off(Events.KEY_ERROR, onProtectionError, instance);
            eventBus.off(Events.SERVER_CERTIFICATE_UPDATED, onProtectionError, instance);
            eventBus.off(Events.LICENSE_REQUEST_COMPLETE, onProtectionError, instance);
            eventBus.off(Events.KEY_SYSTEM_SELECTED, onProtectionError, instance);
            eventBus.off(Events.KEY_SESSION_CREATED, onProtectionError, instance);
            eventBus.off(Events.KEY_STATUSES_CHANGED, onProtectionError, instance);
        }
    }

    function initialize(StreamInfo, ProtectionController) {
        streamInfo = StreamInfo;
        protectionController = ProtectionController;
        registerProtectionEvents();
    }

    /**
     * Activates Stream by re-initializing some of its components
     * @param {MediaSource} mediaSource
     * @memberof Stream#
     * @param {SourceBuffer} previousBuffers
     */
    function activate(mediaSource, previousBuffers) {
        if (!isStreamActivated) {
            let result;
            eventBus.on(Events.CURRENT_TRACK_CHANGED, onCurrentTrackChanged, instance);
            if (!getPreloaded()) {
                result = initializeMedia(mediaSource, previousBuffers);
            } else {
                initializeAfterPreload();
                result = previousBuffers;
            }
            isStreamActivated = true;
            return result;
        }
        return previousBuffers;
    }

    /**
     * Partially resets some of the Stream elements
     * @memberof Stream#
     * @param {boolean} keepBuffers
     */
    function deactivate(keepBuffers) {
        let ln = streamProcessors ? streamProcessors.length : 0;
        const errored = false;
        for (let i = 0; i < ln; i++) {
            let fragmentModel = streamProcessors[i].getFragmentModel();
            fragmentModel.removeExecutedRequestsBeforeTime(getStartTime() + getDuration());
            streamProcessors[i].reset(errored, keepBuffers);
        }
        streamProcessors = [];
        isStreamActivated = false;
        isMediaInitialized = false;
        setPreloaded(false);
        eventBus.off(Events.CURRENT_TRACK_CHANGED, onCurrentTrackChanged, instance);
    }

    function isActive() {
        return isStreamActivated;
    }

    function setMediaSource(mediaSource) {
        for (let i = 0; i < streamProcessors.length;) {
            if (isMediaSupported(streamProcessors[i].getMediaInfo())) {
                streamProcessors[i].setMediaSource(mediaSource);
                i++;
            } else {
                streamProcessors[i].reset();
                streamProcessors.splice(i,1);
            }
        }

        for (let i = 0; i < streamProcessors.length; i++) {
            //Adding of new tracks to a stream processor isn't guaranteed by the spec after the METADATA_LOADED state
            //so do this after the buffers are created above.
            streamProcessors[i].dischargePreBuffer();
        }

        if (streamProcessors.length === 0) {
            const msg = 'No streams to play.';
            errHandler.error(new DashJSError(Errors.MANIFEST_ERROR_ID_NOSTREAMS_CODE, msg +  'nostreams', manifestModel.getValue()));
            logger.fatal(msg);
        }
    }

    function resetInitialSettings() {
        deactivate();
        streamInfo = null;
        updateError = {};
        isUpdating = false;
    }

    function reset() {

        stopEventController();

        if (playbackController) {
            playbackController.pause();
        }

        if (fragmentController) {
            fragmentController.reset();
            fragmentController = null;
        }

        resetInitialSettings();

        unRegisterEvents();

        unRegisterProtectionEvents();

        setPreloaded(false);
    }

    function getDuration() {
        return streamInfo ? streamInfo.duration : NaN;
    }

    function getStartTime() {
        return streamInfo ? streamInfo.start : NaN;
    }

    function getId() {
        return streamInfo ? streamInfo.id : null;
    }

    function getStreamInfo() {
        return streamInfo;
    }

    function getFragmentController() {
        return fragmentController;
    }

    function getThumbnailController() {
        return thumbnailController;
    }

    function checkConfig() {
        if (!videoModel || !abrController || !abrController.hasOwnProperty('getBitrateList') || !adapter || !adapter.hasOwnProperty('getAllMediaInfoForType') || !adapter.hasOwnProperty('getEventsFor')) {
            throw new Error(Constants.MISSING_CONFIG_ERROR);
        }
    }

    /**
     * @param {string} type
     * @returns {Array}
     * @memberof Stream#
     */
    function getBitrateListFor(type) {
        checkConfig();
        if (type === Constants.IMAGE) {
            if (!thumbnailController) {
                return [];
            }
            return thumbnailController.getBitrateList();
        }
        const mediaInfo = getMediaInfo(type);
        return abrController.getBitrateList(mediaInfo);
    }

    function startEventController() {
        if (eventController) {
            eventController.start();
        }
    }

    function stopEventController() {
        if (eventController) {
            eventController.stop();
        }
    }

    function onProtectionError(event) {
        if (event.error) {
            errHandler.error(event.error);
            logger.fatal(event.error.message);
            reset();
        }
    }

    function isMediaSupported(mediaInfo) {
        const type = mediaInfo ? mediaInfo.type : null;
        let codec,
            msg;

        if (type === Constants.MUXED) {
            msg = 'Multiplexed representations are intentionally not supported, as they are not compliant with the DASH-AVC/264 guidelines';
            logger.fatal(msg);
            errHandler.error(new DashJSError(Errors.MANIFEST_ERROR_ID_MULTIPLEXED_CODE, msg, manifestModel.getValue()));
            return false;
        }

        if (type === Constants.TEXT || type === Constants.FRAGMENTED_TEXT || type === Constants.EMBEDDED_TEXT || type === Constants.IMAGE) {
            return true;
        }
        codec = mediaInfo.codec;
        logger.debug(type + ' codec: ' + codec);

        if (!!mediaInfo.contentProtection && !capabilities.supportsEncryptedMedia()) {
            errHandler.error(new DashJSError(Errors.CAPABILITY_MEDIAKEYS_ERROR_CODE, Errors.CAPABILITY_MEDIAKEYS_ERROR_MESSAGE));
        } else if (!capabilities.supportsCodec(codec)) {
            msg = type + 'Codec (' + codec + ') is not supported.';
            logger.error(msg);
            return false;
        }

        return true;
    }

    function onCurrentTrackChanged(e) {
        if (!streamInfo || e.newMediaInfo.streamInfo.id !== streamInfo.id) return;
        let mediaInfo = e.newMediaInfo;
        let manifest = manifestModel.getValue();

        adapter.setCurrentMediaInfo(streamInfo.id, mediaInfo.type, mediaInfo);

        let processor = getProcessorForMediaInfo(mediaInfo);
        if (!processor) return;

        let currentTime = playbackController.getTime();
        logger.info('Stream -  Process track changed at current time ' + currentTime);

        logger.debug('Stream -  Update stream controller');
        if (manifest.refreshManifestOnSwitchTrack) {
            logger.debug('Stream -  Refreshing manifest for switch track');
            trackChangedEvent = e;
            manifestUpdater.refreshManifest();
        } else {
            processor.selectMediaInfo(mediaInfo);
            if (mediaInfo.type !== Constants.FRAGMENTED_TEXT) {
                abrController.updateTopQualityIndex(mediaInfo);
                processor.switchTrackAsked();
                processor.getFragmentModel().abortRequests();
            } else {
                processor.getScheduleController().setSeekTarget(currentTime);
                processor.setIndexHandlerTime(currentTime);
                processor.resetIndexHandler();
            }
        }
    }

    function createStreamProcessor(mediaInfo, allMediaForType, mediaSource, optionalSettings) {
        let streamProcessor = StreamProcessor(context).create({
            type: mediaInfo ? mediaInfo.type : null,
            mimeType: mediaInfo ? mediaInfo.mimeType : null,
            timelineConverter: timelineConverter,
            adapter: adapter,
            manifestModel: manifestModel,
            mediaPlayerModel: mediaPlayerModel,
            dashMetrics: config.dashMetrics,
            baseURLController: config.baseURLController,
            stream: instance,
            abrController: abrController,
            playbackController: playbackController,
            mediaController: mediaController,
            streamController: config.streamController,
            textController: textController,
            errHandler: errHandler,
            settings: settings
        });

        streamProcessor.initialize(mediaSource);
        abrController.updateTopQualityIndex(mediaInfo);

        if (optionalSettings) {
            streamProcessor.setBuffer(optionalSettings.buffer);
            streamProcessor.setIndexHandlerTime(optionalSettings.currentTime);
            streamProcessors[optionalSettings.replaceIdx] = streamProcessor;
        } else {
            streamProcessors.push(streamProcessor);
        }

        if (optionalSettings && optionalSettings.ignoreMediaInfo) {
            return;
        }

        if (mediaInfo && (mediaInfo.type === Constants.TEXT || mediaInfo.type === Constants.FRAGMENTED_TEXT)) {
            let idx;
            for (let i = 0; i < allMediaForType.length; i++) {
                if (allMediaForType[i].index === mediaInfo.index) {
                    idx = i;
                }
                streamProcessor.addMediaInfo(allMediaForType[i]); //creates text tracks for all adaptations in one stream processor
            }
            streamProcessor.selectMediaInfo(allMediaForType[idx]); //sets the initial media info
        } else {
            streamProcessor.addMediaInfo(mediaInfo, true);
        }
    }

    function initializeMediaForType(type, mediaSource) {
        const allMediaForType = adapter.getAllMediaInfoForType(streamInfo, type);

        let mediaInfo = null;
        let initialMediaInfo;

        if (!allMediaForType || allMediaForType.length === 0) {
            logger.info('No ' + type + ' data.');
            return;
        }

        for (let i = 0, ln = allMediaForType.length; i < ln; i++) {
            mediaInfo = allMediaForType[i];

            if (type === Constants.EMBEDDED_TEXT) {
                textController.addEmbeddedTrack(mediaInfo);
            } else {
                if (!isMediaSupported(mediaInfo)) continue;
                mediaController.addTrack(mediaInfo);
            }
        }

        if (type === Constants.EMBEDDED_TEXT || mediaController.getTracksFor(type, streamInfo).length === 0) {
            return;
        }

        if (type === Constants.IMAGE) {
            thumbnailController = ThumbnailController(context).create({
                adapter: adapter,
                baseURLController: config.baseURLController,
                stream: instance,
                timelineConverter: config.timelineConverter
            });
            return;
        }

        if (type !== Constants.FRAGMENTED_TEXT || (type === Constants.FRAGMENTED_TEXT && textController.getTextDefaultEnabled())) {
            mediaController.checkInitialMediaSettingsForType(type, streamInfo);
            initialMediaInfo = mediaController.getCurrentTrackFor(type, streamInfo);
        }

        if (type === Constants.FRAGMENTED_TEXT && !textController.getTextDefaultEnabled()) {
            initialMediaInfo = mediaController.getTracksFor(type, streamInfo)[0];
        }

        eventBus.trigger(Events.STREAM_INITIALIZING, {
            streamInfo: streamInfo,
            mediaInfo: mediaInfo
        });

        // TODO : How to tell index handler live/duration?
        // TODO : Pass to controller and then pass to each method on handler?

        createStreamProcessor(initialMediaInfo, allMediaForType, mediaSource);
    }

    function initializeEventController () {
        //if initializeMedia is called from a switch period, eventController could have been already created.
        if (!eventController) {
            eventController = EventController(context).create();

            eventController.setConfig({
                manifestUpdater: manifestUpdater,
                playbackController: playbackController
            });
            addInlineEvents();
        }
    }

    function addInlineEvents () {
        const events = adapter.getEventsFor(streamInfo);
        eventController.addInlineEvents(events);
    }

    function addInbandEvents (events) {
        if (eventController) {
            eventController.addInbandEvents(events);
        }
    }

    function initializeMedia(mediaSource, previousBuffers) {
        checkConfig();
        let element = videoModel.getElement();

        initializeEventController();

        isUpdating = true;

        filterCodecs(Constants.VIDEO);
        filterCodecs(Constants.AUDIO);

        if (!element || (element && (/^VIDEO$/i).test(element.nodeName))) {
            initializeMediaForType(Constants.VIDEO, mediaSource);
        }
        initializeMediaForType(Constants.AUDIO, mediaSource);
        initializeMediaForType(Constants.TEXT, mediaSource);
        initializeMediaForType(Constants.FRAGMENTED_TEXT, mediaSource);
        initializeMediaForType(Constants.EMBEDDED_TEXT, mediaSource);
        initializeMediaForType(Constants.MUXED, mediaSource);
        initializeMediaForType(Constants.IMAGE, mediaSource);

        //TODO. Consider initialization of TextSourceBuffer here if embeddedText, but no sideloadedText.
        const buffers = createBuffers(previousBuffers);

        isMediaInitialized = true;
        isUpdating = false;

        if (streamProcessors.length === 0) {
            const msg = 'No streams to play.';
            errHandler.error(new DashJSError(Errors.MANIFEST_ERROR_ID_NOSTREAMS_CODE, msg, manifestModel.getValue()));
            logger.fatal(msg);
        } else {
            checkIfInitializationCompleted();
        }

        return buffers;
    }

    function initializeAfterPreload() {
        isUpdating = true;
        checkConfig();
        filterCodecs(Constants.VIDEO);
        filterCodecs(Constants.AUDIO);

        isMediaInitialized = true;
        isUpdating = false;
        if (streamProcessors.length === 0) {
            const msg = 'No streams to play.';
            errHandler.error(new DashJSError(Errors.MANIFEST_ERROR_ID_NOSTREAMS_CODE, msg, manifestModel.getValue()));
            logger.debug(msg);
        } else {
            checkIfInitializationCompleted();
        }
    }

    function filterCodecs(type) {
        const realAdaptation = adapter.getAdaptationForType(streamInfo ? streamInfo.index : null, type, streamInfo);

        if (!realAdaptation || !Array.isArray(realAdaptation.Representation_asArray)) return;

        // Filter codecs that are not supported
        realAdaptation.Representation_asArray = realAdaptation.Representation_asArray.filter((_, i) => {
            // keep at least codec from lowest representation
            if (i === 0) return true;

            const codec = adapter.getCodec(realAdaptation, i, true);
            if (!capabilities.supportsCodec(codec)) {
                logger.error('[Stream] codec not supported: ' + codec);
                return false;
            }
            return true;
        });
    }

    function checkIfInitializationCompleted() {
        const ln = streamProcessors.length;
        const hasError = !!updateError.audio || !!updateError.video;
        let error = hasError ? new DashJSError(Errors.DATA_UPDATE_FAILED_ERROR_CODE, Errors.DATA_UPDATE_FAILED_ERROR_MESSAGE) : null;

        for (let i = 0; i < ln; i++) {
            if (streamProcessors[i].isUpdating() || isUpdating) {
                return;
            }
        }

        if (!isMediaInitialized) {
            return;
        }

        if (protectionController) {
            // Need to check if streamProcessors exists because streamProcessors
            // could be cleared in case an error is detected while initializing DRM keysystem
            for (let i = 0; i < ln && streamProcessors[i]; i++) {
                if (streamProcessors[i].getType() === Constants.AUDIO ||
                    streamProcessors[i].getType() === Constants.VIDEO ||
                    streamProcessors[i].getType() === Constants.FRAGMENTED_TEXT) {
                    protectionController.initializeForMedia(streamProcessors[i].getMediaInfo());
                }
            }
        }

        if (error) {
            errHandler.error(error);
        } else {
            eventBus.trigger(Events.STREAM_INITIALIZED, {
                streamInfo: streamInfo
            });
        }
    }

    function getMediaInfo(type) {
        let streamProcessor = null;

        for (let i = 0; i < streamProcessors.length; i++) {
            streamProcessor = streamProcessors[i];

            if (streamProcessor.getType() === type) {
                return streamProcessor.getMediaInfo();
            }
        }

        return null;
    }

    function createBuffers(previousBuffers) {
        const buffers = {};
        for (let i = 0, ln = streamProcessors.length; i < ln; i++) {
            const buffer = streamProcessors[i].createBuffer(previousBuffers);
            if (buffer) {
                buffers[streamProcessors[i].getType()] = buffer.getBuffer();
            }
        }
        return buffers;
    }

    function onBufferingCompleted(e) {
        if (e.streamInfo !== streamInfo) {
            return;
        }

        let processors = getProcessors();
        const ln = processors.length;

        if (ln === 0) {
            logger.warn('onBufferingCompleted - can\'t trigger STREAM_BUFFERING_COMPLETED because no streamProcessor is defined');
            return;
        }

        // if there is at least one buffer controller that has not completed buffering yet do nothing
        for (let i = 0; i < ln; i++) {
            //if audio or video buffer is not buffering completed state, do not send STREAM_BUFFERING_COMPLETED
            if (!processors[i].isBufferingCompleted() && (processors[i].getType() === Constants.AUDIO || processors[i].getType() === Constants.VIDEO)) {
                logger.warn('onBufferingCompleted - One streamProcessor has finished but', processors[i].getType(), 'one is not buffering completed');
                return;
            }
        }

        logger.debug('onBufferingCompleted - trigger STREAM_BUFFERING_COMPLETED');
        eventBus.trigger(Events.STREAM_BUFFERING_COMPLETED, {
            streamInfo: streamInfo
        });
    }

    function onDataUpdateCompleted(e) {
        if (!streamInfo || e.sender.getStreamId() !== streamInfo.id) return;

        updateError[e.sender.getType()] = e.error;
        checkIfInitializationCompleted();
    }

    function getProcessorForMediaInfo(mediaInfo) {
        if (!mediaInfo) {
            return null;
        }

        let processors = getProcessors();

        return processors.filter(function (processor) {
            return (processor.getType() === mediaInfo.type);
        })[0];
    }

    function getProcessors() {
        let arr = [];

        let type,
            streamProcessor;

        for (let i = 0; i < streamProcessors.length; i++) {
            streamProcessor = streamProcessors[i];
            type = streamProcessor.getType();

            if (type === Constants.AUDIO || type === Constants.VIDEO || type === Constants.FRAGMENTED_TEXT || type === Constants.TEXT) {
                arr.push(streamProcessor);
            }
        }

        return arr;
    }

    function updateData(updatedStreamInfo) {
        logger.info('Manifest updated... updating data system wide.');

        isStreamActivated = false;
        isUpdating = true;
        streamInfo = updatedStreamInfo;

        if (eventController) {
            addInlineEvents();
        }

        filterCodecs(Constants.VIDEO);
        filterCodecs(Constants.AUDIO);

        for (let i = 0, ln = streamProcessors.length; i < ln; i++) {
            let streamProcessor = streamProcessors[i];
            let mediaInfo = adapter.getMediaInfoForType(streamInfo, streamProcessor.getType());
            abrController.updateTopQualityIndex(mediaInfo);
            streamProcessor.addMediaInfo(mediaInfo, true);
        }

        if (trackChangedEvent) {
            let mediaInfo = trackChangedEvent.newMediaInfo;
            if (mediaInfo.type !== Constants.FRAGMENTED_TEXT) {
                let processor = getProcessorForMediaInfo(trackChangedEvent.oldMediaInfo);
                if (!processor) return;
                processor.switchTrackAsked();
                trackChangedEvent = undefined;
            }
        }

        isUpdating = false;
        checkIfInitializationCompleted();
    }

    function isMediaCodecCompatible(newStream) {
        return compareCodecs(newStream, Constants.VIDEO) && compareCodecs(newStream, Constants.AUDIO);
    }

    function isProtectionCompatible(stream) {
        return compareProtectionConfig(stream, Constants.VIDEO) && compareProtectionConfig(stream, Constants.AUDIO);
    }

    function compareProtectionConfig(stream, type) {
        if (!stream) {
            return false;
        }
        const newStreamInfo = stream.getStreamInfo();
        const currentStreamInfo = getStreamInfo();

        if (!newStreamInfo || !currentStreamInfo) {
            return false;
        }

        const newAdaptation = adapter.getAdaptationForType(newStreamInfo.index, type, newStreamInfo);
        const currentAdaptation = adapter.getAdaptationForType(currentStreamInfo.index, type, currentStreamInfo);

        if (!newAdaptation || !currentAdaptation) {
            // If there is no adaptation for neither the old or the new stream they're compatible
            return !newAdaptation && !currentAdaptation;
        }

        // If any of the periods requires EME, we can't do smooth transition
        if (newAdaptation.ContentProtection || currentAdaptation.ContentProtection) {
            return false;
        }

        return true;
    }

    function compareCodecs(newStream, type) {
        if (!newStream || !newStream.hasOwnProperty('getStreamInfo') ) {
            return false;
        }
        const newStreamInfo = newStream.getStreamInfo();
        const currentStreamInfo = getStreamInfo();

        if (!newStreamInfo || !currentStreamInfo) {
            return false;
        }

        const newAdaptation = adapter.getAdaptationForType(newStreamInfo.index, type, newStreamInfo);
        const currentAdaptation = adapter.getAdaptationForType(currentStreamInfo.index, type, currentStreamInfo);

        if (!newAdaptation || !currentAdaptation) {
            // If there is no adaptation for neither the old or the new stream they're compatible
            return !newAdaptation && !currentAdaptation;
        }

        const sameMimeType =  newAdaptation && currentAdaptation && newAdaptation.mimeType === currentAdaptation.mimeType;
        const oldCodecs = currentAdaptation.Representation_asArray.map((representation) => {
            return representation.codecs;
        });

        const newCodecs = newAdaptation.Representation_asArray.map((representation) => {
            return representation.codecs;
        });

        const codecMatch = newCodecs.some((newCodec) => {
            return oldCodecs.indexOf(newCodec) > -1;
        });

        const partialCodecMatch = newCodecs.some((newCodec) => oldCodecs.some((oldCodec) => codecRootCompatibleWithCodec(oldCodec, newCodec)));
        return codecMatch || (partialCodecMatch && sameMimeType);
    }

    // Check if the root of the old codec is the same as the new one, or if it's declared as compatible in the compat table
    function codecRootCompatibleWithCodec(codec1, codec2) {
        const codecRoot = codec1.split('.')[0];
        const rootCompatible = codec2.indexOf(codecRoot) === 0;
        let compatTableCodec;
        for (let i = 0; i < codecCompatibilityTable.length; i++) {
            if (codecCompatibilityTable[i].codec === codecRoot) {
                compatTableCodec = codecCompatibilityTable[i];
                break;
            }
        }
        if (compatTableCodec) {
            return rootCompatible || compatTableCodec.compatibleCodecs.some((compatibleCodec) => codec2.indexOf(compatibleCodec) === 0);
        }
        return rootCompatible;
    }

    function setPreloaded(value) {
        preloaded = value;
    }

    function getPreloaded() {
        return preloaded;
    }

    function preload(mediaSource, previousBuffers) {
        initializeEventController();

        initializeMediaForType(Constants.VIDEO, mediaSource);
        initializeMediaForType(Constants.AUDIO, mediaSource);
        initializeMediaForType(Constants.TEXT, mediaSource);
        initializeMediaForType(Constants.FRAGMENTED_TEXT, mediaSource);
        initializeMediaForType(Constants.EMBEDDED_TEXT, mediaSource);
        initializeMediaForType(Constants.MUXED, mediaSource);
        initializeMediaForType(Constants.IMAGE, mediaSource);

        createBuffers(previousBuffers);

        eventBus.on(Events.CURRENT_TRACK_CHANGED, onCurrentTrackChanged, instance);
        for (let i = 0; i < streamProcessors.length && streamProcessors[i]; i++) {
            streamProcessors[i].getScheduleController().start();
        }

        setPreloaded(true);
    }


    instance = {
        initialize: initialize,
        activate: activate,
        deactivate: deactivate,
        isActive: isActive,
        getDuration: getDuration,
        getStartTime: getStartTime,
        getId: getId,
        getStreamInfo: getStreamInfo,
        preload: preload,
        getFragmentController: getFragmentController,
        getThumbnailController: getThumbnailController,
        getBitrateListFor: getBitrateListFor,
        startEventController: startEventController,
        stopEventController: stopEventController,
        updateData: updateData,
        reset: reset,
        getProcessors: getProcessors,
        setMediaSource: setMediaSource,
        isMediaCodecCompatible: isMediaCodecCompatible,
        isProtectionCompatible: isProtectionCompatible,
        getPreloaded: getPreloaded,
        addInbandEvents: addInbandEvents
    };

    setup();
    return instance;
}

Stream.__dashjs_factory_name = 'Stream';
export default FactoryMaker.getClassFactory(Stream);
