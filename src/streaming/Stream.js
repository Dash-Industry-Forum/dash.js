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
import StreamProcessor from './StreamProcessor';
import FragmentController from './controllers/FragmentController';
import ThumbnailController from './thumbnail/ThumbnailController';
import EventBus from '../core/EventBus';
import Events from '../core/events/Events';
import Debug from '../core/Debug';
import Errors from '../core/errors/Errors';
import FactoryMaker from '../core/FactoryMaker';
import DashJSError from './vo/DashJSError';
import BoxParser from './utils/BoxParser';
import URLUtils from './utils/URLUtils';
import BlacklistController from './controllers/BlacklistController';


const MEDIA_TYPES = [Constants.VIDEO, Constants.AUDIO, Constants.TEXT, Constants.MUXED, Constants.IMAGE];


function Stream(config) {

    config = config || {};
    const context = this.context;
    const eventBus = EventBus(context).getInstance();
    const urlUtils = URLUtils(context).getInstance();

    const manifestModel = config.manifestModel;
    const mediaPlayerModel = config.mediaPlayerModel;
    const dashMetrics = config.dashMetrics;
    const manifestUpdater = config.manifestUpdater;
    const adapter = config.adapter;
    const timelineConverter = config.timelineConverter;
    const capabilities = config.capabilities;
    const errHandler = config.errHandler;
    const abrController = config.abrController;
    const playbackController = config.playbackController;
    const eventController = config.eventController;
    const mediaController = config.mediaController;
    const protectionController = config.protectionController;
    const textController = config.textController;
    const videoModel = config.videoModel;
    let streamInfo = config.streamInfo;
    const settings = config.settings;


    let instance,
        logger,
        streamProcessors,
        isInitialized,
        isActive,
        hasFinishedBuffering,
        hasVideoTrack,
        hasAudioTrack,
        updateError,
        isUpdating,
        fragmentController,
        thumbnailController,
        segmentBlacklistController,
        preloaded,
        boxParser,
        debug,
        isEndedEventSignaled,
        trackChangedEvents;

    /**
     * Setup the stream
     */
    function setup() {
        try {
            debug = Debug(context).getInstance();
            logger = debug.getLogger(instance);
            resetInitialSettings();

            boxParser = BoxParser(context).getInstance();

            segmentBlacklistController = BlacklistController(context).create({
                updateEventName: Events.SEGMENT_LOCATION_BLACKLIST_CHANGED,
                addBlacklistEventName: Events.SEGMENT_LOCATION_BLACKLIST_ADD
            });

            fragmentController = FragmentController(context).create({
                streamInfo: streamInfo,
                mediaPlayerModel: mediaPlayerModel,
                dashMetrics: dashMetrics,
                errHandler: errHandler,
                settings: settings,
                boxParser: boxParser,
                dashConstants: DashConstants,
                urlUtils: urlUtils
            });

        } catch (e) {
            throw e;
        }
    }

    /**
     * Initialize the events
     */
    function initialize() {
        registerEvents();
        registerProtectionEvents();
        textController.initializeForStream(streamInfo);
        eventBus.trigger(Events.STREAM_UPDATED, { streamInfo: streamInfo });
    }

    /**
     * Register the streaming events
     */
    function registerEvents() {
        eventBus.on(Events.BUFFERING_COMPLETED, onBufferingCompleted, instance);
        eventBus.on(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, instance);
        eventBus.on(Events.INBAND_EVENTS, onInbandEvents, instance);
    }

    /**
     * Unregister the streaming events
     */
    function unRegisterEvents() {
        eventBus.off(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, instance);
        eventBus.off(Events.BUFFERING_COMPLETED, onBufferingCompleted, instance);
        eventBus.off(Events.INBAND_EVENTS, onInbandEvents, instance);
    }

    /**
     * Register the protection events
     */
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

    /**
     * Unregister the protection events
     */
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

    /**
     * Returns the stream id
     * @return {*|null}
     */
    function getStreamId() {
        return streamInfo ? streamInfo.id : null;
    }

    /**
     * Activates Stream by re-initializing some of its components
     * @param {MediaSource} mediaSource
     * @param {array} previousBufferSinks
     * @memberof Stream#
     */
    function activate(mediaSource, previousBufferSinks) {
        return new Promise((resolve, reject) => {
            if (isActive) {
                resolve(previousBufferSinks);
                return;
            }

            if (getPreloaded()) {
                isActive = true;
                eventBus.trigger(Events.STREAM_ACTIVATED, {
                    streamInfo
                });
                resolve(previousBufferSinks);
                return;
            }


            _initializeMedia(mediaSource, previousBufferSinks)
                .then((bufferSinks) => {
                    isActive = true;
                    eventBus.trigger(Events.STREAM_ACTIVATED, {
                        streamInfo
                    });
                    resolve(bufferSinks);
                })
                .catch((e) => {
                    reject(e);
                });
        });
    }

    /**
     *
     * @param {object} mediaSource
     * @param {array} previousBufferSinks
     * @return {Promise<Array>}
     * @private
     */
    function _initializeMedia(mediaSource, previousBufferSinks) {
        return _commonMediaInitialization(mediaSource, previousBufferSinks);
    }

    function startPreloading(mediaSource, previousBuffers) {
        return new Promise((resolve, reject) => {

            if (getPreloaded()) {
                reject();
                return;
            }

            logger.info(`[startPreloading] Preloading next stream with id ${getId()}`);
            setPreloaded(true);

            _commonMediaInitialization(mediaSource, previousBuffers)
                .then(() => {
                    for (let i = 0; i < streamProcessors.length && streamProcessors[i]; i++) {
                        streamProcessors[i].setExplicitBufferingTime(getStartTime());
                        streamProcessors[i].getScheduleController().startScheduleTimer();
                    }
                    resolve();
                })
                .catch(() => {
                    setPreloaded(false);
                    reject();
                });
        });
    }

    /**
     *
     * @param {object} mediaSource
     * @param {array} previousBufferSinks
     * @return {Promise<array>}
     * @private
     */
    function _commonMediaInitialization(mediaSource, previousBufferSinks) {
        return new Promise((resolve, reject) => {
            checkConfig();

            isUpdating = true;
            addInlineEvents();


            let element = videoModel.getElement();

            MEDIA_TYPES.forEach((mediaType) => {
                if (mediaType !== Constants.VIDEO || (!element || (element && (/^VIDEO$/i).test(element.nodeName)))) {
                    _initializeMediaForType(mediaType, mediaSource);
                }
            });

            _createBufferSinks(previousBufferSinks)
                .then((bufferSinks) => {
                    isUpdating = false;

                    if (streamProcessors.length === 0) {
                        const msg = 'No streams to play.';
                        errHandler.error(new DashJSError(Errors.MANIFEST_ERROR_ID_NOSTREAMS_CODE, msg, manifestModel.getValue()));
                        logger.fatal(msg);
                    } else {
                        _checkIfInitializationCompleted();
                    }

                    // All mediaInfos for texttracks are added to the TextSourceBuffer by now. We can start creating the tracks
                    textController.createTracks(streamInfo);

                    resolve(bufferSinks);
                })
                .catch((e) => {
                    reject(e);
                });
        });

    }


    /**
     * Initialize for a given media type. Creates a corresponding StreamProcessor
     * @param {string} type
     * @param {object} mediaSource
     * @private
     */
    function _initializeMediaForType(type, mediaSource) {
        let allMediaForType = adapter.getAllMediaInfoForType(streamInfo, type);
        let embeddedMediaInfos = [];

        let mediaInfo = null;
        let initialMediaInfo;

        if (!allMediaForType || allMediaForType.length === 0) {
            logger.info('No ' + type + ' data.');
            return;
        }

        if (type === Constants.VIDEO) {
            hasVideoTrack = true;
        }

        if (type === Constants.AUDIO) {
            hasAudioTrack = true;
        }

        for (let i = 0, ln = allMediaForType.length; i < ln; i++) {
            mediaInfo = allMediaForType[i];

            if (type === Constants.TEXT && !!mediaInfo.isEmbedded) {
                textController.addEmbeddedTrack(streamInfo, mediaInfo);
                embeddedMediaInfos.push(mediaInfo);
            }
            if (_isMediaSupported(mediaInfo)) {
                mediaController.addTrack(mediaInfo);
            }
        }

        if (embeddedMediaInfos.length > 0) {
            mediaController.setInitialMediaSettingsForType(type, streamInfo);
            textController.setInitialSettings(mediaController.getInitialSettings(type));
            textController.addMediaInfosToBuffer(streamInfo, type, embeddedMediaInfos);
        }

        // Filter out embedded text track before creating StreamProcessor
        allMediaForType = allMediaForType.filter(mediaInfo => {
            return !mediaInfo.isEmbedded;
        });
        if (allMediaForType.length === 0) {
            return;
        }

        if (type === Constants.IMAGE) {
            thumbnailController = ThumbnailController(context).create({
                streamInfo: streamInfo,
                adapter: adapter,
                baseURLController: config.baseURLController,
                timelineConverter: config.timelineConverter,
                debug: debug,
                eventBus: eventBus,
                events: Events,
                dashConstants: DashConstants,
                dashMetrics: config.dashMetrics,
                segmentBaseController: config.segmentBaseController
            });
            thumbnailController.initialize();
            return;
        }

        eventBus.trigger(Events.STREAM_INITIALIZING, {
            streamInfo: streamInfo,
            mediaInfo: mediaInfo
        });

        mediaController.setInitialMediaSettingsForType(type, streamInfo);

        let streamProcessor = _createStreamProcessor(allMediaForType, mediaSource);

        initialMediaInfo = mediaController.getCurrentTrackFor(type, streamInfo.id);

        if (initialMediaInfo) {
            abrController.updateTopQualityIndex(initialMediaInfo);
            // In case of mixed fragmented and embedded text tracks, check if initial selected text track is not an embedded track
            streamProcessor.selectMediaInfo((type !== Constants.TEXT || !initialMediaInfo.isEmbedded) ? initialMediaInfo : allMediaForType[0]);
        }

    }

    function _isMediaSupported(mediaInfo) {
        const type = mediaInfo ? mediaInfo.type : null;
        let msg;

        if (type === Constants.MUXED) {
            msg = 'Multiplexed representations are intentionally not supported, as they are not compliant with the DASH-AVC/264 guidelines';
            logger.fatal(msg);
            errHandler.error(new DashJSError(Errors.MANIFEST_ERROR_ID_MULTIPLEXED_CODE, msg, manifestModel.getValue()));
            return false;
        }

        if (type === Constants.TEXT || type === Constants.IMAGE) {
            return true;
        }

        if (!!mediaInfo.contentProtection && !capabilities.supportsEncryptedMedia()) {
            errHandler.error(new DashJSError(Errors.CAPABILITY_MEDIAKEYS_ERROR_CODE, Errors.CAPABILITY_MEDIAKEYS_ERROR_MESSAGE));
            return false;
        }

        return true;
    }

    /**
     * Creates the StreamProcessor for a given media type.
     * @param {object} initialMediaInfo
     * @param {array} allMediaForType
     * @param {object} mediaSource
     * @private
     */
    function _createStreamProcessor(allMediaForType, mediaSource) {

        const mediaInfo = (allMediaForType && allMediaForType.length > 0) ? allMediaForType[0] : null;
        let fragmentModel = fragmentController.getModel(mediaInfo ? mediaInfo.type : null);
        const type = mediaInfo ? mediaInfo.type : null;
        const mimeType = mediaInfo ? mediaInfo.mimeType : null;
        const isFragmented = mediaInfo ? mediaInfo.isFragmented : null;

        let streamProcessor = StreamProcessor(context).create({
            streamInfo,
            type,
            mimeType,
            timelineConverter,
            adapter,
            manifestModel,
            mediaPlayerModel,
            fragmentModel,
            dashMetrics: config.dashMetrics,
            baseURLController: config.baseURLController,
            segmentBaseController: config.segmentBaseController,
            abrController,
            playbackController,
            mediaController,
            textController,
            errHandler,
            settings,
            boxParser,
            segmentBlacklistController
        });

        streamProcessor.initialize(mediaSource, hasVideoTrack, isFragmented);
        streamProcessors.push(streamProcessor);

        for (let i = 0; i < allMediaForType.length; i++) {
            streamProcessor.addMediaInfo(allMediaForType[i]);
        }

        if (type === Constants.TEXT) {
            textController.addMediaInfosToBuffer(streamInfo, type, allMediaForType, fragmentModel);
        }

        return streamProcessor;
    }

    /**
     * Creates the SourceBufferSink objects for all StreamProcessors
     * @param {array} previousBuffersSinks
     * @return {Promise<object>}
     * @private
     */
    function _createBufferSinks(previousBuffersSinks) {
        return new Promise((resolve) => {
            const buffers = {};
            const promises = streamProcessors.map((sp) => {
                return sp.createBufferSinks(previousBuffersSinks);
            });

            Promise.all(promises)
                .then((bufferSinks) => {
                    bufferSinks.forEach((sink) => {
                        if (sink) {
                            buffers[sink.getType()] = sink;
                        }
                    });
                    resolve(buffers);
                })
                .catch(() => {
                    resolve(buffers);
                });
        });
    }

    /**
     * Partially resets some of the Stream elements. This function is called when preloading of streams is canceled or a stream switch occurs.
     * @memberof Stream#
     * @param {boolean} keepBuffers
     */
    function deactivate(keepBuffers) {
        let ln = streamProcessors ? streamProcessors.length : 0;
        const errored = false;
        for (let i = 0; i < ln; i++) {
            let fragmentModel = streamProcessors[i].getFragmentModel();
            fragmentModel.abortRequests();
            fragmentModel.resetInitialSettings();
            streamProcessors[i].reset(errored, keepBuffers);
        }
        if (textController) {
            textController.deactivateStream(streamInfo);
        }
        streamProcessors = [];
        isActive = false;
        hasFinishedBuffering = false;
        setPreloaded(false);
        setIsEndedEventSignaled(false);
        eventBus.trigger(Events.STREAM_DEACTIVATED, { streamInfo });
    }

    function getIsActive() {
        return isActive;
    }

    function setMediaSource(mediaSource) {
        for (let i = 0; i < streamProcessors.length;) {
            if (_isMediaSupported(streamProcessors[i].getMediaInfo())) {
                streamProcessors[i].setMediaSource(mediaSource);
                i++;
            } else {
                streamProcessors[i].reset();
                streamProcessors.splice(i, 1);
            }
        }

        if (streamProcessors.length === 0) {
            const msg = 'No streams to play.';
            errHandler.error(new DashJSError(Errors.MANIFEST_ERROR_ID_NOSTREAMS_CODE, msg + 'nostreams', manifestModel.getValue()));
            logger.fatal(msg);
        }
    }

    function resetInitialSettings(keepBuffers) {
        deactivate(keepBuffers);
        isInitialized = false;
        hasVideoTrack = false;
        hasAudioTrack = false;
        updateError = {};
        isUpdating = false;
        isEndedEventSignaled = false;
        trackChangedEvents = [];
    }

    function reset(keepBuffers) {

        if (fragmentController) {
            fragmentController.reset();
            fragmentController = null;
        }

        if (abrController && streamInfo) {
            abrController.clearDataForStream(streamInfo.id);
        }

        if (segmentBlacklistController) {
            segmentBlacklistController.reset();
            segmentBlacklistController = null;
        }

        resetInitialSettings(keepBuffers);

        streamInfo = null;

        unRegisterEvents();

        unRegisterProtectionEvents();

    }

    function getDuration() {
        return streamInfo ? streamInfo.duration : NaN;
    }

    function getIsEndedEventSignaled() {
        return isEndedEventSignaled;
    }

    function setIsEndedEventSignaled(value) {
        isEndedEventSignaled = value;
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

    function getHasAudioTrack() {
        return hasAudioTrack;
    }

    function getHasVideoTrack() {
        return hasVideoTrack;
    }

    function getThumbnailController() {
        return thumbnailController;
    }

    function checkConfig() {
        if (!videoModel || !abrController) {
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

    function onProtectionError(event) {
        if (event.error) {
            errHandler.error(event.error);
            logger.fatal(event.error.message);
        }
    }

    function prepareTrackChange(e) {
        if (!isActive || !streamInfo) {
            return;
        }

        hasFinishedBuffering = false;

        let mediaInfo = e.newMediaInfo;
        let manifest = manifestModel.getValue();

        adapter.setCurrentMediaInfo(streamInfo.id, mediaInfo.type, mediaInfo);

        let processor = getProcessorForMediaInfo(mediaInfo);
        if (!processor) return;

        let currentTime = playbackController.getTime();
        logger.info('Stream -  Process track changed at current time ' + currentTime);

        // Applies only for MSS streams
        if (manifest.refreshManifestOnSwitchTrack) {
            logger.debug('Stream -  Refreshing manifest for switch track');
            trackChangedEvents.push(e);
            manifestUpdater.refreshManifest();
        } else {
            processor.selectMediaInfo(mediaInfo)
                .then(() => {
                    if (mediaInfo.type === Constants.VIDEO || mediaInfo.type === Constants.AUDIO) {
                        abrController.updateTopQualityIndex(mediaInfo);
                    }
                    processor.prepareTrackSwitch();
                });
        }
    }

    function prepareQualityChange(e) {
        const processor = _getProcessorByType(e.mediaType);

        if (processor) {
            processor.prepareQualityChange(e);
        }
    }

    function addInlineEvents() {
        if (eventController) {
            const events = adapter.getEventsFor(streamInfo);
            eventController.addInlineEvents(events);
        }
    }

    function _checkIfInitializationCompleted() {
        const ln = streamProcessors.length;
        const hasError = !!updateError.audio || !!updateError.video;
        let error = hasError ? new DashJSError(Errors.DATA_UPDATE_FAILED_ERROR_CODE, Errors.DATA_UPDATE_FAILED_ERROR_MESSAGE) : null;

        for (let i = 0; i < ln; i++) {
            if (streamProcessors[i].isUpdating() || isUpdating) {
                return;
            }
        }

        if (protectionController) {
            // Need to check if streamProcessors exists because streamProcessors
            // could be cleared in case an error is detected while initializing DRM keysystem
            protectionController.clearMediaInfoArrayByStreamId(getId());
            for (let i = 0; i < ln && streamProcessors[i]; i++) {
                const type = streamProcessors[i].getType();
                const mediaInfo = streamProcessors[i].getMediaInfo();
                if (type === Constants.AUDIO ||
                    type === Constants.VIDEO ||
                    (type === Constants.TEXT && mediaInfo.isFragmented)) {
                    let mediaInfo = streamProcessors[i].getMediaInfo();
                    if (mediaInfo) {
                        protectionController.initializeForMedia(mediaInfo);
                    }
                }
            }
        }

        if (error) {
            errHandler.error(error);
        } else if (!isInitialized) {
            isInitialized = true;
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

    function onBufferingCompleted() {
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
                logger.debug('onBufferingCompleted - One streamProcessor has finished but', processors[i].getType(), 'one is not buffering completed');
                return;
            }
        }

        logger.debug('onBufferingCompleted - trigger STREAM_BUFFERING_COMPLETED');
        hasFinishedBuffering = true;
        eventBus.trigger(Events.STREAM_BUFFERING_COMPLETED, { streamInfo: streamInfo }, { streamInfo });
    }

    function onDataUpdateCompleted(e) {
        updateError[e.mediaType] = e.error;
        _checkIfInitializationCompleted();
    }

    function onInbandEvents(e) {
        if (eventController) {
            eventController.addInbandEvents(e.events);
        }
    }

    function getProcessorForMediaInfo(mediaInfo) {
        if (!mediaInfo || !mediaInfo.type) {
            return null;
        }

        return _getProcessorByType(mediaInfo.type);
    }

    function _getProcessorByType(type) {
        if (!type) {
            return null;
        }

        let processors = getProcessors();

        return processors.filter(function (processor) {
            return (processor.getType() === type);
        })[0];
    }

    function getProcessors() {
        let arr = [];

        let type,
            streamProcessor;

        for (let i = 0; i < streamProcessors.length; i++) {
            streamProcessor = streamProcessors[i];
            type = streamProcessor.getType();

            if (type === Constants.AUDIO || type === Constants.VIDEO || type === Constants.TEXT) {
                arr.push(streamProcessor);
            }
        }

        return arr;
    }

    function startScheduleControllers() {
        const ln = streamProcessors.length;
        for (let i = 0; i < ln && streamProcessors[i]; i++) {
            streamProcessors[i].getScheduleController().startScheduleTimer();
        }
    }

    function updateData(updatedStreamInfo) {
        return new Promise((resolve) => {
            isUpdating = true;
            streamInfo = updatedStreamInfo;

            if (eventController) {
                addInlineEvents();
            }

            let promises = [];
            for (let i = 0, ln = streamProcessors.length; i < ln; i++) {
                let streamProcessor = streamProcessors[i];
                const currentMediaInfo = streamProcessor.getMediaInfo();
                promises.push(streamProcessor.updateStreamInfo(streamInfo));
                let allMediaForType = adapter.getAllMediaInfoForType(streamInfo, streamProcessor.getType());
                // Check if AdaptationSet has not been removed in MPD update
                if (allMediaForType) {
                    // Remove the current mediaInfo objects before adding the updated ones
                    streamProcessor.clearMediaInfoArray();
                    for (let j = 0; j < allMediaForType.length; j++) {
                        const mInfo = allMediaForType[j];
                        streamProcessor.addMediaInfo(allMediaForType[j]);
                        if (adapter.areMediaInfosEqual(currentMediaInfo, mInfo)) {
                            abrController.updateTopQualityIndex(mInfo);
                            promises.push(streamProcessor.selectMediaInfo(mInfo))
                        }
                    }
                }
            }

            Promise.all(promises)
                .then(() => {
                    promises = [];

                    while (trackChangedEvents.length > 0) {
                        let trackChangedEvent = trackChangedEvents.pop();
                        let mediaInfo = trackChangedEvent.newMediaInfo;
                        let processor = getProcessorForMediaInfo(trackChangedEvent.oldMediaInfo);
                        if (!processor) return;
                        promises.push(processor.prepareTrackSwitch());
                        processor.selectMediaInfo(mediaInfo);
                    }

                    return Promise.all(promises)
                })
                .then(() => {
                    isUpdating = false;
                    _checkIfInitializationCompleted();
                    eventBus.trigger(Events.STREAM_UPDATED, { streamInfo: streamInfo });
                    resolve();
                })

        })
    }

    function isMediaCodecCompatible(newStream, previousStream = null) {
        return compareCodecs(newStream, Constants.VIDEO, previousStream) && compareCodecs(newStream, Constants.AUDIO, previousStream);
    }

    function isProtectionCompatible(newStream) {
        if (!newStream) {
            return true;
        }
        return _compareProtectionConfig(Constants.VIDEO, newStream) && _compareProtectionConfig(Constants.AUDIO, newStream);
    }

    function _compareProtectionConfig(type, newStream) {
        const currentStreamInfo = getStreamInfo();
        const newStreamInfo = newStream.getStreamInfo();

        if (!newStreamInfo || !currentStreamInfo) {
            return true;
        }

        const newAdaptation = adapter.getAdaptationForType(newStreamInfo.index, type, newStreamInfo);
        const currentAdaptation = adapter.getAdaptationForType(currentStreamInfo.index, type, currentStreamInfo);

        if (!newAdaptation || !currentAdaptation) {
            // If there is no adaptation for neither the old or the new stream they're compatible
            return !newAdaptation && !currentAdaptation;
        }

        // If the current period is unencrypted and the upcoming one is encrypted we need to reset sourcebuffers.
        return !(!_isAdaptationDrmProtected(currentAdaptation) && _isAdaptationDrmProtected(newAdaptation));
    }

    function _isAdaptationDrmProtected(adaptation) {

        if (!adaptation) {
            // If there is no adaptation for neither the old or the new stream they're compatible
            return false;
        }

        // If the current period is unencrypted and the upcoming one is encrypted we need to reset sourcebuffers.
        return !!(adaptation.ContentProtection || (adaptation.Representation && adaptation.Representation.length > 0 && adaptation.Representation[0].ContentProtection));
    }

    function compareCodecs(newStream, type, previousStream = null) {
        if (!newStream || !newStream.hasOwnProperty('getStreamInfo')) {
            return false;
        }
        const newStreamInfo = newStream.getStreamInfo();
        const currentStreamInfo = previousStream ? previousStream.getStreamInfo() : getStreamInfo();

        if (!newStreamInfo || !currentStreamInfo) {
            return false;
        }

        const newAdaptation = adapter.getAdaptationForType(newStreamInfo.index, type, newStreamInfo);
        const currentAdaptation = adapter.getAdaptationForType(currentStreamInfo.index, type, currentStreamInfo);

        if (!newAdaptation || !currentAdaptation) {
            // If there is no adaptation for neither the old or the new stream they're compatible
            return !newAdaptation && !currentAdaptation;
        }

        const sameMimeType = newAdaptation && currentAdaptation && newAdaptation.mimeType === currentAdaptation.mimeType;
        const oldCodecs = currentAdaptation.Representation_asArray.map((representation) => {
            return representation.codecs;
        });

        const newCodecs = newAdaptation.Representation_asArray.map((representation) => {
            return representation.codecs;
        });

        const codecMatch = newCodecs.some((newCodec) => {
            return oldCodecs.indexOf(newCodec) > -1;
        });

        const partialCodecMatch = newCodecs.some((newCodec) => oldCodecs.some((oldCodec) => capabilities.codecRootCompatibleWithCodec(oldCodec, newCodec)));
        return codecMatch || (partialCodecMatch && sameMimeType);
    }

    function setPreloaded(value) {
        preloaded = value;
    }

    function getPreloaded() {
        return preloaded;
    }

    function getHasFinishedBuffering() {
        return hasFinishedBuffering;
    }

    function getAdapter() {
        return adapter;
    }

    instance = {
        initialize,
        getStreamId,
        activate,
        deactivate,
        getIsActive,
        getDuration,
        getStartTime,
        getId,
        getStreamInfo,
        getHasAudioTrack,
        getHasVideoTrack,
        startPreloading,
        getThumbnailController,
        getBitrateListFor,
        updateData,
        reset,
        getProcessors,
        setMediaSource,
        isMediaCodecCompatible,
        isProtectionCompatible,
        getPreloaded,
        getIsEndedEventSignaled,
        setIsEndedEventSignaled,
        getAdapter,
        getHasFinishedBuffering,
        setPreloaded,
        startScheduleControllers,
        prepareTrackChange,
        prepareQualityChange
    };

    setup();
    return instance;
}

Stream.__dashjs_factory_name = 'Stream';
export default FactoryMaker.getClassFactory(Stream);
