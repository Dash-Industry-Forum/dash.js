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
import Constants from './constants/Constants.js';
import DashConstants from '../dash/constants/DashConstants.js';
import StreamProcessor from './StreamProcessor.js';
import FragmentController from './controllers/FragmentController.js';
import ThumbnailController from './thumbnail/ThumbnailController.js';
import EventBus from '../core/EventBus.js';
import Events from '../core/events/Events.js';
import Debug from '../core/Debug.js';
import Errors from '../core/errors/Errors.js';
import FactoryMaker from '../core/FactoryMaker.js';
import DashJSError from './vo/DashJSError.js';
import BoxParser from './utils/BoxParser.js';
import URLUtils from './utils/URLUtils.js';
import BlacklistController from './controllers/BlacklistController.js';


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
    const throughputController = config.throughputController;
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
        eventBus.on(Events.INBAND_EVENTS, onInbandEvents, instance);
    }

    /**
     * Unregister the streaming events
     */
    function unRegisterEvents() {
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
     * @return {Promise<Array>}
     * @private
     */
    function _initializeMedia(mediaSource, previousBufferSinks) {
        return _commonMediaInitialization(mediaSource, previousBufferSinks);
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

            _addInlineEvents();


            let element = videoModel.getElement();
            const promises = [];
            MEDIA_TYPES.forEach((mediaType) => {
                // If we are preloading without a video element we can not start texttrack handling.
                if (!(mediaType === Constants.TEXT && !mediaSource) && (mediaType !== Constants.VIDEO || (!element || (element && (/^VIDEO$/i).test(element.nodeName))))) {
                    promises.push(_initializeMediaForType(mediaType, mediaSource));
                }
            });

            Promise.all(promises)
                .then(() => {
                    return _createBufferSinks(previousBufferSinks)
                })
                .then((bufferSinks) => {
                    if (streamProcessors.length === 0) {
                        const msg = 'No streams to play.';
                        errHandler.error(new DashJSError(Errors.MANIFEST_ERROR_ID_NOSTREAMS_CODE, msg, manifestModel.getValue()));
                        logger.fatal(msg);
                    } else {
                        _initializationCompleted();
                    }

                    if (mediaSource) {
                        // All mediaInfos for texttracks are added to the TextSourceBuffer by now. We can start creating the tracks
                        textController.createTracks(streamInfo);
                    }

                    resolve(bufferSinks);
                })
                .catch((e) => {
                    reject(e);
                });
        });
    }

    /**
     * We call this function if segments have been preloaded without a video element. Once the video element is attached MSE is available
     * @param mediaSource
     * @returns {Promise<unknown>}
     */
    function initializeForTextWithMediaSource(mediaSource) {
        return new Promise((resolve, reject) => {
            _initializeMediaForType(Constants.TEXT, mediaSource)
                .then(() => {
                    return createBufferSinkForText()
                })
                .then(() => {
                    textController.createTracks(streamInfo);
                    resolve()
                })
                .catch((e) => {
                    reject(e);
                })
        })
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
            return Promise.resolve();
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
            textController.addMediaInfosToBuffer(streamInfo, type, embeddedMediaInfos);
        }

        // Filter out embedded text track before creating StreamProcessor
        allMediaForType = allMediaForType.filter(mediaInfo => {
            return !mediaInfo.isEmbedded;
        });
        if (allMediaForType.length === 0) {
            return Promise.resolve();
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
            return Promise.resolve();
        }

        eventBus.trigger(Events.STREAM_INITIALIZING, {
            streamInfo: streamInfo,
            mediaInfo: mediaInfo
        });

        mediaController.setInitialMediaSettingsForType(type, streamInfo);

        let streamProcessor = _createStreamProcessor(allMediaForType, mediaSource);

        initialMediaInfo = mediaController.getCurrentTrackFor(type, streamInfo.id);

        if (initialMediaInfo) {
            // In case of mixed fragmented and embedded text tracks, check if initial selected text track is not an embedded track
            return streamProcessor.selectMediaInfo((type !== Constants.TEXT || !initialMediaInfo.isEmbedded) ? initialMediaInfo : allMediaForType[0]);
        }

        return Promise.resolve();
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
            throughputController,
            mediaController,
            textController,
            errHandler,
            settings,
            boxParser,
            segmentBlacklistController
        });

        streamProcessor.initialize(mediaSource, hasVideoTrack, isFragmented);
        streamProcessors.push(streamProcessor);
        streamProcessor.setMediaInfoArray(allMediaForType);

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

    function createBufferSinkForText() {
        const sp = _getProcessorByType(Constants.TEXT);
        if (sp) {
            return sp.createBufferSinks()
        }

        return Promise.resolve();
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
        return new Promise((resolve, reject) => {
            const promises = [];
            for (let i = 0; i < streamProcessors.length;) {
                if (_isMediaSupported(streamProcessors[i].getMediaInfo())) {
                    promises.push(streamProcessors[i].setMediaSource(mediaSource));
                    i++;
                } else {
                    streamProcessors[i].reset();
                    streamProcessors.splice(i, 1);
                }
            }

            Promise.all(promises)
                .then(() => {
                    for (let i = 0; i < streamProcessors.length; i++) {
                        //Adding of new tracks to a stream processor isn't guaranteed by the spec after the METADATA_LOADED state
                        //so do this after the buffers are created above.
                        streamProcessors[i].dischargePreBuffer();
                    }

                    if (streamProcessors.length === 0) {
                        const msg = 'No streams to play.';
                        errHandler.error(new DashJSError(Errors.MANIFEST_ERROR_ID_NOSTREAMS_CODE, msg + 'nostreams', manifestModel.getValue()));
                        logger.fatal(msg);
                    }
                    resolve();
                })
                .catch((e) => {
                    logger.error(e);
                    reject(e);
                })
        })
    }

    function resetInitialSettings(keepBuffers) {
        deactivate(keepBuffers);
        isInitialized = false;
        hasVideoTrack = false;
        hasAudioTrack = false;
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
    function getRepresentationsByType(type) {
        checkConfig();
        if (type === Constants.IMAGE) {
            if (!thumbnailController) {
                return [];
            }
            return thumbnailController.getPossibleVoRepresentations();
        }
        const mediaInfo = getMediaInfo(type);
        return abrController.getPossibleVoRepresentations(mediaInfo, true, true);
    }

    /**
     * @param {string} type
     * @param {string} id
     * @returns {Array}
     * @memberof Stream#
     */
    function getRepresentationForTypeById(type, id) {
        let possibleVoRepresentations;

        if (type === Constants.IMAGE) {
            if (!thumbnailController) {
                return null;
            }
            possibleVoRepresentations = thumbnailController.getPossibleVoRepresentations();
        } else {
            const mediaInfo = getMediaInfo(type);
            possibleVoRepresentations = abrController.getPossibleVoRepresentations(mediaInfo, true, true);
        }

        if (!possibleVoRepresentations || possibleVoRepresentations.length === 0) {
            return null
        }
        const targetReps = possibleVoRepresentations.filter((rep) => {
            return rep.id === id
        })

        return targetReps && targetReps.length > 0 ? targetReps[0] : null;
    }

    /**
     * @param {string} type
     * @param {number} index
     * @returns {Array}
     * @memberof Stream#
     */
    function getRepresentationForTypeByIndex(type, index) {
        let possibleVoRepresentations;

        if (type === Constants.IMAGE) {
            if (!thumbnailController) {
                return null;
            }
            possibleVoRepresentations = thumbnailController.getPossibleVoRepresentations();
        } else {
            const mediaInfo = getMediaInfo(type);
            possibleVoRepresentations = abrController.getPossibleVoRepresentations(mediaInfo, true, true);
        }

        index = Math.max(Math.min(index, possibleVoRepresentations.length - 1), 0)

        return possibleVoRepresentations[index];
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

        let processor = getProcessorForMediaInfo(mediaInfo);
        if (!processor) return;

        let currentTime = playbackController.getTime();
        logger.info('Stream -  Process track changed at current time ' + currentTime);

        // Applies only for MSS streams
        if (manifest.refreshManifestOnSwitchTrack) {
            trackChangedEvents.push(e);
            if (!manifestUpdater.getIsUpdating()) {
                logger.debug('Stream -  Refreshing manifest for switch track');
                manifestUpdater.refreshManifest();
            }
        } else {
            processor.selectMediaInfo(mediaInfo)
                .then(() => {
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

    function _addInlineEvents() {
        if (eventController) {
            const events = adapter.getEventsFor(streamInfo);
            if (events && events.length > 0) {
                eventController.addInlineEvents(events, streamInfo.id);
            }
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

    function onInbandEvents(e) {
        if (eventController) {
            eventController.addInbandEvents(e.events, streamInfo.id);
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
            streamInfo = updatedStreamInfo;

            if (eventController) {
                _addInlineEvents();
            }

            let promises = [];
            for (let i = 0, ln = streamProcessors.length; i < ln; i++) {
                let streamProcessor = streamProcessors[i];
                const currentMediaInfo = streamProcessor.getMediaInfo();
                promises.push(streamProcessor.updateStreamInfo(streamInfo));
                let allMediaForType = adapter.getAllMediaInfoForType(streamInfo, streamProcessor.getType());

                // Filter out embedded text track before updating media info in  StreamProcessor
                allMediaForType = allMediaForType.filter(mediaInfo => {
                    return !mediaInfo.isEmbedded;
                });

                // Check if AdaptationSet has not been removed in MPD update
                streamProcessor.setMediaInfoArray(allMediaForType);
                if (allMediaForType) {
                    for (let j = 0; j < allMediaForType.length; j++) {
                        if (adapter.areMediaInfosEqual(currentMediaInfo, allMediaForType[j])) {
                            promises.push(streamProcessor.selectMediaInfo(allMediaForType[j]))
                        }
                    }
                }
            }

            Promise.all(promises)
                .then(() => {
                    let promises = [];

                    // Only relevant for MSS
                    while (trackChangedEvents.length > 0) {
                        let trackChangedEvent = trackChangedEvents.pop();
                        let mediaInfo = trackChangedEvent.newMediaInfo;
                        let processor = getProcessorForMediaInfo(trackChangedEvent.oldMediaInfo);
                        if (!processor) return;
                        promises.push(processor.prepareTrackSwitch());
                        promises.push(processor.selectMediaInfo(mediaInfo));
                    }

                    return Promise.all(promises)
                })
                .then(() => {
                    _initializationCompleted();
                    eventBus.trigger(Events.STREAM_UPDATED, { streamInfo: streamInfo });
                    resolve();
                })
                .catch((e) => {
                    errHandler.error(e);
                })

        })
    }

    function _initializationCompleted() {
        const ln = streamProcessors.length;

        if (protectionController) {
            // Need to check if streamProcessors exists because streamProcessors
            // could be cleared in case an error is detected while initializing DRM keysystem
            protectionController.clearMediaInfoArray();
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
            protectionController.handleKeySystemFromManifest();
        }

        if (!isInitialized) {
            isInitialized = true;
            videoModel.waitForReadyState(Constants.VIDEO_ELEMENT_READY_STATES.HAVE_METADATA, () => {
                eventBus.trigger(Events.STREAM_INITIALIZED, {
                    streamInfo: streamInfo
                });
            })
        }
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

    function getCurrentRepresentationForType(type) {
        const sp = _getProcessorByType(type);

        if (!sp) {
            return null;
        }

        return sp.getRepresentation();
    }

    function getCurrentMediaInfoForType(type) {
        const sp = _getProcessorByType(type);

        if (!sp) {
            return null;
        }

        return sp.getMediaInfo();
    }

    instance = {
        activate,
        deactivate,
        getAdapter,
        getCurrentMediaInfoForType,
        getCurrentRepresentationForType,
        getDuration,
        getHasAudioTrack,
        getHasFinishedBuffering,
        getHasVideoTrack,
        getId,
        getIsActive,
        getIsEndedEventSignaled,
        getPreloaded,
        getProcessors,
        getRepresentationForTypeById,
        getRepresentationForTypeByIndex,
        getRepresentationsByType,
        getStartTime,
        getStreamId,
        getStreamInfo,
        getThumbnailController,
        initialize,
        initializeForTextWithMediaSource,
        prepareQualityChange,
        prepareTrackChange,
        reset,
        setIsEndedEventSignaled,
        setMediaSource,
        setPreloaded,
        startPreloading,
        startScheduleControllers,
        updateData,
    };

    setup();
    return instance;
}

Stream.__dashjs_factory_name = 'Stream';
export default FactoryMaker.getClassFactory(Stream);
