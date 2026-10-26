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
import AbrController from '../controllers/AbrController.js';
import BASE64 from '../../../externals/base64.js';
import BaseURLController from '../controllers/BaseURLController.js';
import BoxParser from '../utils/BoxParser.js';
import Capabilities from '../utils/Capabilities.js';
import CapabilitiesFilter from '../utils/CapabilitiesFilter.js';
import CatchupController from '../controllers/CatchupController.js';
import ClientDataReportingController from '../controllers/ClientDataReportingController.js';
import C2paController from '../c2pa/C2paController.js';
import CmcdController from '../controllers/CmcdController.js';
import CmsdModel from '../models/CmsdModel.js';
import Constants from '../constants/Constants.js';
import ContentSteeringController from '../../dash/controllers/ContentSteeringController.js';
import CustomParametersModel from '../models/CustomParametersModel.js';
import DOMStorage from '../utils/DOMStorage.js';
import DashAdapter from '../../dash/DashAdapter.js';
import DashConstants from '../../dash/constants/DashConstants.js';
import DashJSError from '../vo/DashJSError.js';
import DashMetrics from '../../dash/DashMetrics.js';
import ErrorHandler from '../utils/ErrorHandler.js';
import Errors from '../../core/errors/Errors.js';
import EventBus from '../../core/EventBus.js';
import Events from '../../core/events/Events.js';
import FactoryMaker from '../../core/FactoryMaker.js';
import GapController from '../controllers/GapController.js';
import ISOBoxer from 'codem-isoboxer';
import ManifestLoader from '../ManifestLoader.js';
import ManifestModel from '../models/ManifestModel.js';
import ManifestUpdater from '../ManifestUpdater.js';
import MediaController from '../controllers/MediaController.js';
import MediaPlayerEvents from '../MediaPlayerEvents.js';
import MediaPlayerModel from '../models/MediaPlayerModel.js';
import MetricsConstants from '../constants/MetricsConstants.js';
import PlaybackController from '../controllers/PlaybackController.js';
import SchemeLoaderFactory from '../net/SchemeLoaderFactory.js';
import SegmentBaseController from '../../dash/controllers/SegmentBaseController.js';
import ServiceDescriptionController from '../../dash/controllers/ServiceDescriptionController.js';
import StreamController from '../controllers/StreamController.js';
import TextController from '../text/TextController.js';
import ThroughputController from '../controllers/ThroughputController.js';
import TimelineConverter from '../../dash/utils/TimelineConverter.js';
import URLUtils from '../utils/URLUtils.js';
import URIFragmentModel from '../models/URIFragmentModel.js';
import VideoModel from '../models/VideoModel.js';
import { HTTPRequest } from '../vo/metrics/HTTPRequest.js';
import { Cta608Parser } from '@svta/cml-608';
import { MEDIA_PLAYER_NOT_INITIALIZED_ERROR } from './MediaPlayerApiErrors.js';

/**
 * Builds and wires the controller graph behind MediaPlayer: creates the singletons, calls setConfig()/initialize()
 * on them, and detects the optional plugin bundles (Protection, MetricsReporting, MssHandler, OfflineController).
 * Shared controllers are written into the MediaPlayer `state` object; construction-only objects stay here.
 * @ignore
 */
function MediaPlayerWiring() {
    const context = this.context;
    const eventBus = EventBus(context).getInstance();

    // keys that MediaPlayer.setConfig() may inject and that live on the shared state object
    const STATE_CONFIG_KEYS = ['streamController', 'textController', 'throughputController', 'playbackController',
        'contentSteeringController', 'customParametersModel', 'abrController', 'mediaController', 'settings', 'dashMetrics'];

    let instance,
        state,
        debug,
        schemeLoaderFactory,
        timelineConverter,
        metricsReportingController,
        mssHandler,
        mediaPlayerModel,
        errHandler,
        capabilities,
        capabilitiesFilter,
        gapController,
        serviceDescriptionController,
        catchupController,
        cmcdController,
        cmsdModel,
        domStorage,
        segmentBaseController,
        clientDataReportingController,
        c2paController;

    function setConfig(config) {
        if (!config) {
            return;
        }
        if (config.state) {
            state = config.state;
        }
        if (config.debug) {
            debug = config.debug;
        }
        STATE_CONFIG_KEYS.forEach((key) => {
            if (config[key]) {
                state[key] = config[key];
            }
        });
        if (config.capabilities) {
            capabilities = config.capabilities;
        }
        if (config.capabilitiesFilter) {
            capabilitiesFilter = config.capabilitiesFilter;
        }
        if (config.gapController) {
            gapController = config.gapController;
        }
        if (config.serviceDescriptionController) {
            serviceDescriptionController = config.serviceDescriptionController;
        }
        if (config.clientDataReportingController) {
            clientDataReportingController = config.clientDataReportingController;
        }
        if (config.c2paController) {
            c2paController = config.c2paController;
        }
        if (config.catchupController) {
            catchupController = config.catchupController;
        }
        if (config.mediaPlayerModel) {
            mediaPlayerModel = config.mediaPlayerModel;
        }
        if (config.schemeLoaderFactory) {
            schemeLoaderFactory = config.schemeLoaderFactory;
        }
    }

    function setup() {
        state.mediaPlayerInitialized = false;
        state.playbackInitialized = false;
        state.streamingInitialized = false;
        state.autoPlay = true;
        state.providedStartTime = NaN;
        state.protectionController = null;
        state.protectionData = null;
        state.adapter = null;
        Events.extend(MediaPlayerEvents);
        state.customParametersModel = CustomParametersModel(context).getInstance();
        state.videoModel = VideoModel(context).getInstance();
        state.uriFragmentModel = URIFragmentModel(context).getInstance();
        state.offlineController = null;
        segmentBaseController = null;
        mediaPlayerModel = MediaPlayerModel(context).getInstance();
    }

    /**
     * Ensures Capabilities/ErrorHandler exist and reports a CAPABILITY_MEDIASOURCE_ERROR if MSE is unavailable.
     * @return {boolean} true if MediaSource is supported
     */
    function supportsMediaSource() {
        if (!capabilities) {
            capabilities = Capabilities(context).getInstance();
            capabilities.setConfig({
                settings: state.settings,
                protectionController: state.protectionController
            })
        }

        if (!errHandler) {
            errHandler = ErrorHandler(context).getInstance();
        }

        if (!capabilities.supportsMediaSource()) {
            errHandler.error(new DashJSError(Errors.CAPABILITY_MEDIASOURCE_ERROR_CODE, Errors.CAPABILITY_MEDIASOURCE_ERROR_MESSAGE));
            return false;
        }
        return true;
    }

    /**
     * Creates the controllers and models that exist for the lifetime of the player (called once from initialize()).
     */
    function createCoreControllers() {
        // init some controllers and models
        timelineConverter = TimelineConverter(context).getInstance();
        if (!state.throughputController) {
            state.throughputController = ThroughputController(context).getInstance();
        }
        if (!state.abrController) {
            state.abrController = AbrController(context).getInstance();
        }

        if (!schemeLoaderFactory) {
            schemeLoaderFactory = SchemeLoaderFactory(context).getInstance();
        }

        if (!state.playbackController) {
            state.playbackController = PlaybackController(context).getInstance();
        }

        if (!state.mediaController) {
            state.mediaController = MediaController(context).getInstance();
        }

        if (!state.streamController) {
            state.streamController = StreamController(context).getInstance();
        }

        if (!gapController) {
            gapController = GapController(context).getInstance();
        }

        if (!catchupController) {
            catchupController = CatchupController(context).getInstance();
        }

        if (!serviceDescriptionController) {
            serviceDescriptionController = ServiceDescriptionController(context).getInstance();
        }

        if (!state.contentSteeringController) {
            state.contentSteeringController = ContentSteeringController(context).getInstance();
        }

        if (!capabilitiesFilter) {
            capabilitiesFilter = CapabilitiesFilter(context).getInstance();
        }

        state.adapter = DashAdapter(context).getInstance();

        state.manifestModel = ManifestModel(context).getInstance();

        cmcdController = CmcdController(context).getInstance();

        cmsdModel = CmsdModel(context).getInstance();

        clientDataReportingController = ClientDataReportingController(context).getInstance();

        if (!c2paController) {
            c2paController = C2paController(context).getInstance();
        }

        state.dashMetrics = DashMetrics(context).getInstance({
            settings: state.settings
        });

        domStorage = DOMStorage(context).getInstance({
            settings: state.settings
        });

        state.adapter.setConfig({
            constants: Constants,
            cea608parser: new Cta608Parser(),
            errHandler: errHandler,
            BASE64: BASE64
        });

        if (!state.baseURLController) {
            state.baseURLController = BaseURLController(context).create();
        }

        state.baseURLController.setConfig({
            adapter: state.adapter,
            contentSteeringController: state.contentSteeringController
        });

        serviceDescriptionController.setConfig({
            adapter: state.adapter
        });

        if (!segmentBaseController) {
            segmentBaseController = SegmentBaseController(context).getInstance({
                dashMetrics: state.dashMetrics,
                mediaPlayerModel: mediaPlayerModel,
                errHandler: errHandler,
                baseURLController: state.baseURLController,
                events: Events,
                eventBus: eventBus,
                debug: debug,
                boxParser: BoxParser(context).getInstance(),
                errors: Errors
            });
        }

        // configure controllers
        state.mediaController.setConfig({
            domStorage,
            settings: state.settings,
            mediaPlayerModel,
            customParametersModel: state.customParametersModel,
            videoModel: state.videoModel
        });

        mediaPlayerModel.setConfig({
            playbackController: state.playbackController,
            serviceDescriptionController
        });

        state.contentSteeringController.setConfig({
            adapter: state.adapter,
            errHandler,
            dashMetrics: state.dashMetrics,
            mediaPlayerModel,
            manifestModel: state.manifestModel,
            serviceDescriptionController,
            throughputController: state.throughputController,
            eventBus
        })
    }

    /**
     * Resets the controllers involved in the current playback session; called before a new source or view is attached.
     */
    function resetPlaybackControllers() {
        state.playbackInitialized = false;
        state.streamingInitialized = false;
        state.adapter.reset();
        state.streamController.reset();
        gapController.reset();
        catchupController.reset();
        state.playbackController.reset();
        serviceDescriptionController.reset();
        state.contentSteeringController.reset();
        state.abrController.reset();
        state.throughputController.reset();
        state.mediaController.reset();
        segmentBaseController.reset();
        if (state.protectionController) {
            if (state.settings.get().streaming.protection.keepProtectionMediaKeys) {
                state.protectionController.stop();
            } else {
                state.protectionController.reset();
                state.protectionController = null;
                detectProtection();
            }
        }
        state.textController.reset();
        cmcdController.reset();
        cmsdModel.reset();
        if (c2paController) {
            c2paController.resetForNewSource();
        }
    }

    function createPlaybackControllers() {
        // creates or get objects instances
        const manifestLoader = createManifestLoader();

        if (!state.streamController) {
            state.streamController = StreamController(context).getInstance();
        }

        if (!state.textController) {
            state.textController = TextController(context).create({
                adapter: state.adapter,
                baseURLController: state.baseURLController,
                errHandler,
                manifestModel: state.manifestModel,
                mediaController: state.mediaController,
                settings: state.settings,
                videoModel: state.videoModel,
                timelineConverter
            });
        }

        capabilitiesFilter.setConfig({
            adapter: state.adapter,
            capabilities,
            customParametersModel: state.customParametersModel,
            errHandler,
            manifestModel: state.manifestModel,
            protectionController: state.protectionController,
            settings: state.settings,
        });

        state.streamController.setConfig({
            abrController: state.abrController,
            adapter: state.adapter,
            baseURLController: state.baseURLController,
            capabilities,
            capabilitiesFilter,
            contentSteeringController: state.contentSteeringController,
            customParametersModel: state.customParametersModel,
            dashMetrics: state.dashMetrics,
            errHandler,
            manifestLoader,
            manifestModel: state.manifestModel,
            mediaController: state.mediaController,
            mediaPlayerModel,
            playbackController: state.playbackController,
            protectionController: state.protectionController,
            segmentBaseController,
            serviceDescriptionController,
            settings: state.settings,
            textController: state.textController,
            throughputController: state.throughputController,
            timelineConverter,
            uriFragmentModel: state.uriFragmentModel,
            videoModel: state.videoModel,
        });

        gapController.setConfig({
            adapter: state.adapter,
            playbackController: state.playbackController,
            settings: state.settings,
            streamController: state.streamController,
            timelineConverter,
            videoModel: state.videoModel,
        });

        state.playbackController.setConfig({
            adapter: state.adapter,
            dashMetrics: state.dashMetrics,
            serviceDescriptionController,
            settings: state.settings,
            streamController: state.streamController,
            timelineConverter,
            videoModel: state.videoModel,
        });

        catchupController.setConfig({
            mediaPlayerModel,
            playbackController: state.playbackController,
            settings: state.settings,
            streamController: state.streamController,
            videoModel: state.videoModel,
        })

        state.throughputController.setConfig({
            settings: state.settings,
            playbackController: state.playbackController
        })

        state.abrController.setConfig({
            adapter: state.adapter,
            capabilities,
            cmsdModel,
            customParametersModel: state.customParametersModel,
            dashMetrics: state.dashMetrics,
            domStorage,
            mediaPlayerModel,
            settings: state.settings,
            streamController: state.streamController,
            throughputController: state.throughputController,
            videoModel: state.videoModel,
        });

        cmcdController.setConfig({
            abrController: state.abrController,
            dashMetrics: state.dashMetrics,
            errHandler,
            mediaPlayerModel,
            playbackController: state.playbackController,
            serviceDescriptionController,
            throughputController: state.throughputController,
        });

        clientDataReportingController.setConfig({
            serviceDescriptionController
        })

        c2paController.setConfig({
            settings: state.settings,
            eventBus,
            customParametersModel: state.customParametersModel
        });

        cmsdModel.setConfig({});

        // initializes controller
        state.mediaController.initialize();
        state.throughputController.initialize();
        state.abrController.initialize();
        state.streamController.initialize(state.autoPlay, state.protectionData);
        state.textController.initialize();
        gapController.initialize();
        catchupController.initialize();
        cmcdController.initialize(state.autoPlay);
        c2paController.initialize();
        cmsdModel.initialize();
        state.contentSteeringController.initialize();
        segmentBaseController.initialize();
    }

    function createManifestLoader() {
        return ManifestLoader(context).create({
            debug: debug,
            errHandler: errHandler,
            dashMetrics: state.dashMetrics,
            mediaPlayerModel: mediaPlayerModel,
            mssHandler: mssHandler,
            settings: state.settings
        });
    }

    function detectProtection() {
        if (state.protectionController) {
            return state.protectionController;
        }

        if (typeof dashjs === 'undefined') {
            return null
        }
        // do not require Protection as dependencies as this is optional and intended to be loaded separately
        let detectedProtection = dashjs.Protection;
        if (typeof detectedProtection === 'function') { //TODO need a better way to register/detect plugin components
            let protection = detectedProtection(context).create();
            Events.extend(detectedProtection.events);
            MediaPlayerEvents.extend(detectedProtection.events, {
                publicOnly: true
            });
            Errors.extend(detectedProtection.errors);

            state.protectionController = protection.createProtectionSystem({
                debug,
                errHandler,
                videoModel: state.videoModel,
                customParametersModel: state.customParametersModel,
                capabilities,
                eventBus,
                events: Events,
                BASE64,
                constants: Constants,
                cmcdController,
                settings: state.settings
            });

            if (!capabilities) {
                capabilities = Capabilities(context).getInstance();
            }

            capabilities.setProtectionController(state.protectionController);

            return state.protectionController;
        }

        return null;
    }

    function detectMetricsReporting() {
        if (metricsReportingController || typeof dashjs === 'undefined') {
            return;
        }
        // do not require MetricsReporting as dependencies as this is optional and intended to be loaded separately
        let detectedMetricsReporting = dashjs.MetricsReporting;
        if (typeof detectedMetricsReporting === 'function') { //TODO need a better way to register/detect plugin components
            let metricsReporting = detectedMetricsReporting(context).create();

            metricsReportingController = metricsReporting.createMetricsReporting({
                debug: debug,
                eventBus: eventBus,
                mediaElement: state.videoModel.getElement(),
                adapter: state.adapter,
                dashMetrics: state.dashMetrics,
                mediaPlayerModel: mediaPlayerModel,
                events: Events,
                constants: Constants,
                metricsConstants: MetricsConstants
            });
        }
    }

    function detectMss() {
        if (mssHandler || typeof dashjs === 'undefined') {
            return;
        }

        // do not require MssHandler as dependencies as this is optional and intended to be loaded separately
        let detectedMssHandler = dashjs.MssHandler;
        if (typeof detectedMssHandler === 'function') { //TODO need a better way to register/detect plugin components
            Errors.extend(detectedMssHandler.errors);
            mssHandler = detectedMssHandler(context).create({
                eventBus: eventBus,
                mediaPlayerModel: mediaPlayerModel,
                dashMetrics: state.dashMetrics,
                manifestModel: state.manifestModel,
                playbackController: state.playbackController,
                streamController: state.streamController,
                protectionController: state.protectionController,
                baseURLController: state.baseURLController,
                errHandler: errHandler,
                events: Events,
                constants: Constants,
                debug: debug,
                initSegmentType: HTTPRequest.INIT_SEGMENT_TYPE,
                BASE64: BASE64,
                ISOBoxer: ISOBoxer,
                settings: state.settings
            });
        }
    }

    function detectOffline() {
        if (!state.mediaPlayerInitialized) {
            throw MEDIA_PLAYER_NOT_INITIALIZED_ERROR;
        }

        if (state.offlineController) {
            return state.offlineController;
        }

        if (typeof dashjs === 'undefined') {
            return null
        }

        // do not require Offline as dependencies as this is optional and intended to be loaded separately
        let detectedOfflineController = dashjs.OfflineController;

        if (typeof detectedOfflineController === 'function') { //TODO need a better way to register/detect plugin components
            Events.extend(detectedOfflineController.events);
            MediaPlayerEvents.extend(detectedOfflineController.events, {
                publicOnly: true
            });
            Errors.extend(detectedOfflineController.errors);

            const manifestLoader = createManifestLoader();
            const manifestUpdater = ManifestUpdater(context).create();

            manifestUpdater.setConfig({
                manifestModel: state.manifestModel,
                adapter: state.adapter,
                manifestLoader,
                errHandler,
                contentSteeringController: state.contentSteeringController
            });

            state.offlineController = detectedOfflineController(context).create({
                debug: debug,
                manifestUpdater: manifestUpdater,
                baseURLController: state.baseURLController,
                manifestLoader: manifestLoader,
                manifestModel: state.manifestModel,
                mediaPlayerModel: mediaPlayerModel,
                abrController: state.abrController,
                playbackController: state.playbackController,
                adapter: state.adapter,
                errHandler: errHandler,
                dashMetrics: state.dashMetrics,
                timelineConverter: timelineConverter,
                segmentBaseController: segmentBaseController,
                schemeLoaderFactory: schemeLoaderFactory,
                eventBus: eventBus,
                events: Events,
                errors: Errors,
                constants: Constants,
                settings: state.settings,
                dashConstants: DashConstants,
                urlUtils: URLUtils(context).getInstance()
            });
            return state.offlineController;
        }

        return null;
    }

    /**
     * Resets the plugin controllers created by the detect*() functions.
     */
    function reset() {
        if (metricsReportingController) {
            metricsReportingController.reset();
            metricsReportingController = null;
        }
        if (c2paController) {
            c2paController.reset();
            c2paController = null;
        }
        if (state.offlineController) {
            state.offlineController.reset();
            state.offlineController = null;
        }
    }

    instance = {
        createCoreControllers,
        createManifestLoader,
        createPlaybackControllers,
        detectMetricsReporting,
        detectMss,
        detectOffline,
        detectProtection,
        reset,
        resetPlaybackControllers,
        setConfig,
        setup,
        supportsMediaSource,
    };

    return instance;
}

MediaPlayerWiring.__dashjs_factory_name = 'MediaPlayerWiring';
export default FactoryMaker.getSingletonFactory(MediaPlayerWiring);
