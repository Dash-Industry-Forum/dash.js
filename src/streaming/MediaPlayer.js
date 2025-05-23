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
import {Cta608Parser} from '@svta/common-media-library/cta/608/Cta608Parser';
import Constants from './constants/Constants.js';
import DashConstants from '../dash/constants/DashConstants.js';
import MetricsConstants from './constants/MetricsConstants.js';
import PlaybackController from './controllers/PlaybackController.js';
import StreamController from './controllers/StreamController.js';
import GapController from './controllers/GapController.js';
import CatchupController from './controllers/CatchupController.js';
import ServiceDescriptionController from '../dash/controllers/ServiceDescriptionController.js';
import ContentSteeringController from '../dash/controllers/ContentSteeringController.js';
import MediaController from './controllers/MediaController.js';
import BaseURLController from './controllers/BaseURLController.js';
import ManifestLoader from './ManifestLoader.js';
import ErrorHandler from './utils/ErrorHandler.js';
import Capabilities from './utils/Capabilities.js';
import CapabilitiesFilter from './utils/CapabilitiesFilter.js';
import URIFragmentModel from './models/URIFragmentModel.js';
import ManifestModel from './models/ManifestModel.js';
import MediaPlayerModel from './models/MediaPlayerModel.js';
import AbrController from './controllers/AbrController.js';
import SchemeLoaderFactory from './net/SchemeLoaderFactory.js';
import VideoModel from './models/VideoModel.js';
import CmcdModel from './models/CmcdModel.js';
import CmsdModel from './models/CmsdModel.js';
import DOMStorage from './utils/DOMStorage.js';
import Debug from './../core/Debug.js';
import Errors from './../core/errors/Errors.js';
import EventBus from './../core/EventBus.js';
import Events from './../core/events/Events.js';
import MediaPlayerEvents from './MediaPlayerEvents.js';
import FactoryMaker from '../core/FactoryMaker.js';
import Settings from '../core/Settings.js';
import {getVersionString} from '../core/Version.js';

//Dash
import SegmentBaseController from '../dash/controllers/SegmentBaseController.js';
import DashAdapter from '../dash/DashAdapter.js';
import DashMetrics from '../dash/DashMetrics.js';
import TimelineConverter from '../dash/utils/TimelineConverter.js';
import {
    HTTPRequest
} from './vo/metrics/HTTPRequest.js';
import BASE64 from '../../externals/base64.js';
import ISOBoxer from 'codem-isoboxer';
import DashJSError from './vo/DashJSError.js';
import {checkParameterType} from './utils/SupervisorTools.js';
import ManifestUpdater from './ManifestUpdater.js';
import URLUtils from '../streaming/utils/URLUtils.js';
import BoxParser from './utils/BoxParser.js';
import TextController from './text/TextController.js';
import CustomParametersModel from './models/CustomParametersModel.js';
import ThroughputController from './controllers/ThroughputController.js';
import ClientDataReportingController from './controllers/ClientDataReportingController.js';

/**
 * The media types
 * @typedef {('video' | 'audio' | 'text' | 'image')} MediaType
 */

/**
 * @module MediaPlayer
 * @description The MediaPlayer is the primary dash.js Module and a Facade to build your player around.
 * It will allow you access to all the important dash.js properties/methods via the public API and all the
 * events to build a robust DASH media player.
 */
function MediaPlayer() {
    /**
     * @constant {string} STREAMING_NOT_INITIALIZED_ERROR error string thrown when a function is called before the dash.js has been fully initialized
     * @inner
     */
    const STREAMING_NOT_INITIALIZED_ERROR = 'You must first call initialize() and set a source before calling this method';
    /**
     * @constant {string} PLAYBACK_NOT_INITIALIZED_ERROR error string thrown when a function is called before the dash.js has been fully initialized
     * @inner
     */
    const PLAYBACK_NOT_INITIALIZED_ERROR = 'You must first call initialize() and set a valid source and view before calling this method';
    /**
     * @constant {string} ELEMENT_NOT_ATTACHED_ERROR error string thrown when a function is called before the dash.js has received a reference of an HTML5 video element
     * @inner
     */
    const ELEMENT_NOT_ATTACHED_ERROR = 'You must first call attachView() to set the video element before calling this method';
    /**
     * @constant {string} SOURCE_NOT_ATTACHED_ERROR error string thrown when a function is called before the dash.js has received a valid source stream.
     * @inner
     */
    const SOURCE_NOT_ATTACHED_ERROR = 'You must first call attachSource() with a valid source before calling this method';
    /**
     * @constant {string} MEDIA_PLAYER_NOT_INITIALIZED_ERROR error string thrown when a function is called before the dash.js has been fully initialized.
     * @inner
     */
    const MEDIA_PLAYER_NOT_INITIALIZED_ERROR = 'MediaPlayer not initialized!';
    /**
     * @constant {string} ARRAY_NOT_SUPPORTED_ERROR error string thrown when settings object was called using an array.
     * @inner
     */
    const ARRAY_NOT_SUPPORTED_ERROR = 'Array type not supported for settings!';

    const context = this.context;
    const eventBus = EventBus(context).getInstance();
    let settings = Settings(context).getInstance();
    const debug = Debug(context).getInstance({ settings: settings });

    let instance,
        logger,
        source,
        protectionData,
        mediaPlayerInitialized,
        streamingInitialized,
        playbackInitialized,
        autoPlay,
        providedStartTime,
        abrController,
        throughputController,
        schemeLoaderFactory,
        timelineConverter,
        mediaController,
        protectionController,
        metricsReportingController,
        mssHandler,
        offlineController,
        adapter,
        mediaPlayerModel,
        customParametersModel,
        errHandler,
        baseURLController,
        capabilities,
        capabilitiesFilter,
        streamController,
        textController,
        gapController,
        playbackController,
        serviceDescriptionController,
        contentSteeringController,
        catchupController,
        dashMetrics,
        manifestModel,
        cmcdModel,
        cmsdModel,
        videoModel,
        uriFragmentModel,
        domStorage,
        segmentBaseController,
        clientDataReportingController;

    /*
    ---------------------------------------------------------------------------

        INIT FUNCTIONS

    ---------------------------------------------------------------------------
    */
    function setup() {
        logger = debug.getLogger(instance);
        mediaPlayerInitialized = false;
        playbackInitialized = false;
        streamingInitialized = false;
        autoPlay = true;
        providedStartTime = NaN;
        protectionController = null;
        offlineController = null;
        protectionData = null;
        adapter = null;
        segmentBaseController = null;
        Events.extend(MediaPlayerEvents);
        mediaPlayerModel = MediaPlayerModel(context).getInstance();
        customParametersModel = CustomParametersModel(context).getInstance();
        videoModel = VideoModel(context).getInstance();
        uriFragmentModel = URIFragmentModel(context).getInstance();
    }

    /**
     * Configure media player with customs controllers. Helpful for tests
     *
     * @param {object=} config controllers configuration
     * @memberof module:MediaPlayer
     * @instance
     */
    function setConfig(config) {
        if (!config) {
            return;
        }
        if (config.capabilities) {
            capabilities = config.capabilities;
        }
        if (config.capabilitiesFilter) {
            capabilitiesFilter = config.capabilitiesFilter;
        }
        if (config.streamController) {
            streamController = config.streamController;
        }
        if (config.textController) {
            textController = config.textController;
        }
        if (config.gapController) {
            gapController = config.gapController;
        }
        if (config.throughputController) {
            throughputController = config.throughputController
        }
        if (config.playbackController) {
            playbackController = config.playbackController;
        }
        if (config.serviceDescriptionController) {
            serviceDescriptionController = config.serviceDescriptionController
        }
        if (config.contentSteeringController) {
            contentSteeringController = config.contentSteeringController;
        }
        if (config.clientDataReportingController) {
            clientDataReportingController = config.clientDataReportingController;
        }
        if (config.catchupController) {
            catchupController = config.catchupController;
        }
        if (config.mediaPlayerModel) {
            mediaPlayerModel = config.mediaPlayerModel;
        }
        if (config.customParametersModel) {
            customParametersModel = config.customParametersModel;
        }
        if (config.abrController) {
            abrController = config.abrController;
        }
        if (config.schemeLoaderFactory) {
            schemeLoaderFactory = config.schemeLoaderFactory;
        }
        if (config.mediaController) {
            mediaController = config.mediaController;
        }
        if (config.settings) {
            settings = config.settings;
        }

        if (config.dashMetrics) {
            dashMetrics = config.dashMetrics;
        }
    }

    /**
     * Upon creating the MediaPlayer you must call initialize before you call anything else.
     * There is one exception to this rule. It is crucial to call {@link module:MediaPlayer#extend extend()}
     * with all your extensions prior to calling initialize.
     *
     * ALL arguments are optional and there are individual methods to set each argument later on.
     * The args in this method are just for convenience and should only be used for a simple player setup.
     *
     * @param {HTML5MediaElement=} view - Optional arg to set the video element. {@link module:MediaPlayer#attachView attachView()}
     * @param {string=} source - Optional arg to set the media source. {@link module:MediaPlayer#attachSource attachSource()}
     * @param {boolean=} autoPlay - Optional arg to set auto play. {@link module:MediaPlayer#setAutoPlay setAutoPlay()}
     * @param {number|string} startTime - For VoD content the start time is relative to the start time of the first period.
     * For live content
     * If the parameter starts from prefix posix: it signifies the absolute time range defined in seconds of Coordinated Universal Time (ITU-R TF.460-6). This is the number of seconds since 01-01-1970 00:00:00 UTC. Fractions of seconds may be optionally specified down to the millisecond level.
     * If no posix prefix is used the starttime is relative to MPD@availabilityStartTime
     * @see {@link module:MediaPlayer#attachSource attachSource()}
     * @see {@link module:MediaPlayer#setAutoPlay setAutoPlay()}
     * @memberof module:MediaPlayer
     * @instance
     */
    function initialize(view, source, autoPlay, startTime = NaN) {
        if (!capabilities) {
            capabilities = Capabilities(context).getInstance();
            capabilities.setConfig({
                settings,
                protectionController
            })
        }

        if (!errHandler) {
            errHandler = ErrorHandler(context).getInstance();
        }

        if (!capabilities.supportsMediaSource()) {
            errHandler.error(new DashJSError(Errors.CAPABILITY_MEDIASOURCE_ERROR_CODE, Errors.CAPABILITY_MEDIASOURCE_ERROR_MESSAGE));
            return;
        }

        if (!mediaPlayerInitialized) {
            mediaPlayerInitialized = true;

            // init some controllers and models
            timelineConverter = TimelineConverter(context).getInstance();
            if (!throughputController) {
                throughputController = ThroughputController(context).getInstance();
            }
            if (!abrController) {
                abrController = AbrController(context).getInstance();
            }

            if (!schemeLoaderFactory) {
                schemeLoaderFactory = SchemeLoaderFactory(context).getInstance();
            }

            if (!playbackController) {
                playbackController = PlaybackController(context).getInstance();
            }

            if (!mediaController) {
                mediaController = MediaController(context).getInstance();
            }

            if (!streamController) {
                streamController = StreamController(context).getInstance();
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

            if (!contentSteeringController) {
                contentSteeringController = ContentSteeringController(context).getInstance();
            }

            if (!capabilitiesFilter) {
                capabilitiesFilter = CapabilitiesFilter(context).getInstance();
            }

            adapter = DashAdapter(context).getInstance();

            manifestModel = ManifestModel(context).getInstance();

            cmcdModel = CmcdModel(context).getInstance();

            cmsdModel = CmsdModel(context).getInstance();

            clientDataReportingController = ClientDataReportingController(context).getInstance();

            dashMetrics = DashMetrics(context).getInstance({
                settings: settings
            });

            domStorage = DOMStorage(context).getInstance({
                settings: settings
            });

            adapter.setConfig({
                constants: Constants,
                cea608parser: new Cta608Parser(),
                errHandler: errHandler,
                BASE64: BASE64
            });

            if (!baseURLController) {
                baseURLController = BaseURLController(context).create();
            }

            baseURLController.setConfig({
                adapter,
                contentSteeringController
            });

            serviceDescriptionController.setConfig({
                adapter
            });

            if (!segmentBaseController) {
                segmentBaseController = SegmentBaseController(context).getInstance({
                    dashMetrics: dashMetrics,
                    mediaPlayerModel: mediaPlayerModel,
                    errHandler: errHandler,
                    baseURLController: baseURLController,
                    events: Events,
                    eventBus: eventBus,
                    debug: debug,
                    boxParser: BoxParser(context).getInstance(),
                    errors: Errors
                });
            }

            // configure controllers
            mediaController.setConfig({
                domStorage,
                settings,
                mediaPlayerModel,
                customParametersModel,
                videoModel
            });

            mediaPlayerModel.setConfig({
                playbackController,
                serviceDescriptionController
            });

            contentSteeringController.setConfig({
                adapter,
                errHandler,
                dashMetrics,
                mediaPlayerModel,
                manifestModel,
                serviceDescriptionController,
                throughputController,
                eventBus
            })

            restoreDefaultUTCTimingSources();
            setAutoPlay(autoPlay !== undefined ? autoPlay : true);

            // Detect and initialize offline module to support offline contents playback
            _detectOffline();
        }

        if (view) {
            attachView(view);
        }

        if (source) {
            attachSource(source, startTime);
        }

        logger.info('[dash.js ' + getVersion() + '] ' + 'MediaPlayer has been initialized');
    }

    /**
     * Sets the MPD source and the video element to null. You can also reset the MediaPlayer by
     * calling attachSource with a new source file.
     *
     * This call does not destroy the MediaPlayer. To destroy the MediaPlayer and free all of its
     * memory, call destroy().
     *
     * @memberof module:MediaPlayer
     * @instance
     */
    function reset() {
        attachSource(null);
        attachView(null);
        protectionData = null;
        if (protectionController) {
            protectionController.reset();
            protectionController = null;
        }
        if (metricsReportingController) {
            metricsReportingController.reset();
            metricsReportingController = null;
        }
        if (customParametersModel) {
            customParametersModel.reset();
        }

        settings.reset();

        if (offlineController) {
            offlineController.reset();
            offlineController = null;
        }
    }

    /**
     * Completely destroys the media player and frees all memory.
     *
     * @memberof module:MediaPlayer
     * @instance
     */
    function destroy() {
        reset();
        FactoryMaker.deleteSingletonInstances(context);
    }

    /**
     * The ready state of the MediaPlayer based on both the video element and MPD source being defined.
     *
     * @returns {boolean} The current ready state of the MediaPlayer
     * @see {@link module:MediaPlayer#attachView attachView()}
     * @see {@link module:MediaPlayer#attachSource attachSource()}
     * @memberof module:MediaPlayer
     * @instance
     */
    function isReady() {
        return (!!source && !!videoModel.getElement());
    }

    /**
     * Use the on method to listen for public events found in MediaPlayer.events. {@link MediaPlayerEvents}
     *
     * @param {string} type - {@link MediaPlayerEvents}
     * @param {Function} listener - callback method when the event fires.
     * @param {Object} scope - context of the listener so it can be removed properly.
     * @param {Object} options - object to define various options such as priority and mode
     * @memberof module:MediaPlayer
     * @instance
     */
    function on(type, listener, scope, options) {
        eventBus.on(type, listener, scope, options);
    }

    /**
     * Use the off method to remove listeners for public events found in MediaPlayer.events. {@link MediaPlayerEvents}
     *
     * @param {string} type - {@link MediaPlayerEvents}
     * @param {Function} listener - callback method when the event fires.
     * @param {Object} scope - context of the listener so it can be removed properly.
     * @memberof module:MediaPlayer
     * @instance
     */
    function off(type, listener, scope) {
        eventBus.off(type, listener, scope);
    }

    /**
     * Use this method to trigger an event via the eventBus {@link MediaPlayerEvents}
     *
     * @param {string} type - {@link MediaPlayerEvents}
     * @param {object} payload - Payload of the event
     * @param {Object} filters - Define a "streamId" and/or a "mediaType" for which this event is valid, e.g. {streamId, mediaType}
     * @memberof module:MediaPlayer
     * @instance
     */
    function trigger(type, payload, filters) {
        eventBus.trigger(type, payload, filters);
    }

    /**
     * Current version of Dash.js
     * @returns {string} the current dash.js version string.
     * @memberof module:MediaPlayer
     * @instance
     */
    function getVersion() {
        return getVersionString();
    }

    /**
     * Use this method to access the dash.js logging class.
     *
     * @returns {Debug}
     * @memberof module:MediaPlayer
     * @instance
     */
    function getDebug() {
        return debug;
    }

    /*
    ---------------------------------------------------------------------------

        PLAYBACK FUNCTIONS

    ---------------------------------------------------------------------------
    */

    /**
     * Causes the player to begin streaming the media as set by the {@link module:MediaPlayer#attachSource attachSource()}
     * method in preparation for playing. It specifically does not require a view to be attached with {@link module:MediaPlayer#attachSource attachView()} to begin preloading.
     * When a view is attached after preloading, the buffered data is transferred to the attached mediaSource buffers.
     *
     * @see {@link module:MediaPlayer#attachSource attachSource()}
     * @see {@link module:MediaPlayer#attachView attachView()}
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~SOURCE_NOT_ATTACHED_ERROR SOURCE_NOT_ATTACHED_ERROR} if called before attachSource function
     * @instance
     */
    function preload() {
        if (videoModel.getElement() || streamingInitialized) {
            return;
        }
        if (source) {
            _initializePlayback(providedStartTime);
        } else {
            throw SOURCE_NOT_ATTACHED_ERROR;
        }
    }

    /**
     * The play method initiates playback of the media defined by the {@link module:MediaPlayer#attachSource attachSource()} method.
     * This method will call play on the native Video Element.
     *
     * @see {@link module:MediaPlayer#attachSource attachSource()}
     * @throws {@link module:MediaPlayer~PLAYBACK_NOT_INITIALIZED_ERROR PLAYBACK_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @memberof module:MediaPlayer
     * @instance
     */
    function play() {
        if (!playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }
        if (!autoPlay || (isPaused() && playbackInitialized)) {
            playbackController.play(true);
        }
    }

    /**
     * This method will call pause on the native Video Element.
     *
     * @throws {@link module:MediaPlayer~PLAYBACK_NOT_INITIALIZED_ERROR PLAYBACK_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @memberof module:MediaPlayer
     * @instance
     */
    function pause() {
        if (!playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }
        playbackController.pause();
    }

    /**
     * Returns a Boolean that indicates whether the Video Element is paused.
     * @return {boolean}
     * @throws {@link module:MediaPlayer~PLAYBACK_NOT_INITIALIZED_ERROR PLAYBACK_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @memberof module:MediaPlayer
     * @instance
     */
    function isPaused() {
        if (!playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }
        return playbackController.isPaused();
    }

    /**
     * Sets the currentTime property of the attached video element.  If it is a live stream with a
     * timeShiftBufferLength, then the DVR window offset will be automatically calculated.
     *
     * @param {number} value - A relative time, in seconds, based on the return value of the {@link module:MediaPlayer#duration duration()} method is expected.
     * For dynamic streams duration() returns DVRWindow.end - DVRWindow.start. Consequently, the value provided to this function should be relative to DVRWindow.start.
     * @see {@link module:MediaPlayer#getDvrSeekOffset getDvrSeekOffset()}
     * @throws {@link module:MediaPlayer~PLAYBACK_NOT_INITIALIZED_ERROR PLAYBACK_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @throws {@link Constants#BAD_ARGUMENT_ERROR BAD_ARGUMENT_ERROR} if called with an invalid argument, not number type or is NaN.
     * @memberof module:MediaPlayer
     * @instance
     */
    function seek(value) {
        if (!playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }

        checkParameterType(value, 'number');

        if (isNaN(value)) {
            throw Constants.BAD_ARGUMENT_ERROR;
        }

        if (value < 0) {
            value = 0;
        }

        let s = playbackController.getIsDynamic() ? getDvrSeekOffset(value) : value;

        // For VoD limit the seek to the duration of the content
        const videoElement = getVideoElement();
        if (!playbackController.getIsDynamic() && videoElement.duration) {
            s = Math.min(videoElement.duration, s);
        }

        playbackController.seek(s, false, false, true);
    }

    /**
     * Sets the currentTime property of the attached video element. Compared to the seek() function this function does not add the DVR window offset. Instead, it takes a presentation time relative to the availability start time.
     * For VoD this function behaves similar to the seek() function.

     * @param {number} value - A presentation time in seconds
     * @throws {@link module:MediaPlayer~PLAYBACK_NOT_INITIALIZED_ERROR PLAYBACK_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @throws {@link Constants#BAD_ARGUMENT_ERROR BAD_ARGUMENT_ERROR} if called with an invalid argument, not number type or is NaN.
     * @memberof module:MediaPlayer
     * @instance
     */
    function seekToPresentationTime(seektime) {
        if (!playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }

        checkParameterType(seektime, 'number');

        if (isNaN(seektime)) {
            throw Constants.BAD_ARGUMENT_ERROR;
        }

        if (seektime < 0) {
            seektime = 0;
        }


        // For VoD limit the seek to the duration of the content
        const videoElement = getVideoElement();
        if (!playbackController.getIsDynamic() && videoElement.duration) {
            seektime = Math.min(videoElement.duration, seektime);
        }

        // For live, take live delay into account
        if (playbackController.getIsDynamic()) {
            const type = streamController && streamController.hasVideoTrack() ? Constants.VIDEO : Constants.AUDIO;
            let metric = dashMetrics.getCurrentDVRInfo(type);
            if (!metric) {
                return;
            }
            seektime = _adjustSeekTimeBasedOnLiveDelay(seektime, metric)
            if (seektime < metric.range.start) {
                seektime = metric.range.start
            }
        }

        playbackController.seek(seektime, false, false, true);
    }

    /**
     * Seeks back to the original live edge (live edge as calculated at playback start). Only applies to live streams, for VoD streams this call will be ignored.
     */
    function seekToOriginalLive() {
        if (!playbackInitialized || !isDynamic()) {
            return;
        }

        playbackController.seekToOriginalLive();
    }

    /**
     * Returns a Boolean that indicates whether the media is in the process of seeking to a new position.
     * @return {boolean}
     * @throws {@link module:MediaPlayer~PLAYBACK_NOT_INITIALIZED_ERROR PLAYBACK_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @memberof module:MediaPlayer
     * @instance
     */
    function isSeeking() {
        if (!playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }
        return playbackController.isSeeking();
    }

    /**
     * Returns a Boolean that indicates whether the media is in the process of dynamic.
     * @return {boolean}
     * @throws {@link module:MediaPlayer~PLAYBACK_NOT_INITIALIZED_ERROR PLAYBACK_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @memberof module:MediaPlayer
     * @instance
     */
    function isDynamic() {
        if (!playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }
        return playbackController.getIsDynamic();
    }

    /**
     * Returns a boolean that indicates whether the player is operating in low latency mode.
     * @return {boolean}
     * @memberof module:MediaPlayer
     * @instance
     */
    function getLowLatencyModeEnabled() {
        if (!playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }
        return playbackController.getLowLatencyModeEnabled();
    }

    /**
     * Use this method to set the native Video Element's playback rate.
     * @param {number} value
     * @memberof module:MediaPlayer
     * @instance
     */
    function setPlaybackRate(value) {
        getVideoElement().playbackRate = value;
    }

    /**
     * Returns the current playback rate.
     * @returns {number}
     * @memberof module:MediaPlayer
     * @instance
     */
    function getPlaybackRate() {
        return getVideoElement().playbackRate;
    }

    /**
     * Use this method to set the native Video Element's muted state. Takes a Boolean that determines whether audio is muted. true if the audio is muted and false otherwise.
     * @param {boolean} value
     * @memberof module:MediaPlayer
     * @throws {@link Constants#BAD_ARGUMENT_ERROR BAD_ARGUMENT_ERROR} if called with an invalid argument, not boolean type.
     * @instance
     */
    function setMute(value) {
        checkParameterType(value, 'boolean');
        getVideoElement().muted = value;
    }

    /**
     * A Boolean that determines whether audio is muted.
     * @returns {boolean}
     * @memberof module:MediaPlayer
     * @instance
     */
    function isMuted() {
        return getVideoElement().muted;
    }

    /**
     * A double indicating the audio volume, from 0.0 (silent) to 1.0 (loudest).
     * @param {number} value
     * @memberof module:MediaPlayer
     * @throws {@link Constants#BAD_ARGUMENT_ERROR BAD_ARGUMENT_ERROR} if called with an invalid argument, not number type, or is NaN or not between 0 and 1.
     * @instance
     */
    function setVolume(value) {
        if (typeof value !== 'number' || isNaN(value) || value < 0.0 || value > 1.0) {
            throw Constants.BAD_ARGUMENT_ERROR;
        }
        getVideoElement().volume = value;
    }

    /**
     * Returns the current audio volume, from 0.0 (silent) to 1.0 (loudest).
     * @returns {number}
     * @memberof module:MediaPlayer
     * @instance
     */
    function getVolume() {
        return getVideoElement().volume;
    }

    /**
     * The length of the buffer for a given media type, in seconds. Valid media
     * types are "video", "audio" and "text". If no type is passed
     * in, then the minimum of video, audio and text buffer length is
     * returned. NaN is returned if an invalid type is requested, the
     * presentation does not contain that type, or if no arguments are passed
     * and the presentation does not include any adaption sets of valid media
     * type.
     *
     * @param {MediaType} type - 'video', 'audio' or 'text'
     * @returns {number} The length of the buffer for the given media type, in
     *  seconds, or NaN
     * @memberof module:MediaPlayer
     * @instance
     */
    function getBufferLength(type) {
        const types = [Constants.VIDEO, Constants.AUDIO, Constants.TEXT];
        if (!type) {
            const buffer = types.map(
                t => getTracksFor(t).length > 0 ? getDashMetrics().getCurrentBufferLevel(t) : Number.MAX_VALUE
            ).reduce(
                (p, c) => Math.min(p, c)
            );
            return buffer === Number.MAX_VALUE ? NaN : buffer;
        } else {
            if (types.indexOf(type) !== -1) {
                const buffer = getDashMetrics().getCurrentBufferLevel(type);
                return buffer ? buffer : NaN;
            } else {
                logger.warn('getBufferLength requested for invalid type');
                return NaN;
            }
        }
    }

    /**
     * This method should only be used with a live stream that has a valid timeShiftBufferLength (DVR Window).
     * NOTE - If you do not need the raw offset value (i.e. media analytics, tracking, etc) consider using the {@link module:MediaPlayer#seek seek()} method
     * which will calculate this value for you and set the video element's currentTime property all in one simple call.
     *
     * @param {number} value - A relative time, in seconds, based on the return value of the {@link module:MediaPlayer#duration duration()} method is expected.
     * @returns {number} A value that is relative the available range within the timeShiftBufferLength (DVR Window).
     * @see {@link module:MediaPlayer#seek seek()}
     * @memberof module:MediaPlayer
     * @instance
     */
    function getDvrSeekOffset(value) {
        const type = streamController && streamController.hasVideoTrack() ? Constants.VIDEO : Constants.AUDIO;
        let metric = dashMetrics.getCurrentDVRInfo(type);
        if (!metric) {
            return 0;
        }

        let val = metric.range.start + value;

        return _adjustSeekTimeBasedOnLiveDelay(val, metric);
    }

    function _adjustSeekTimeBasedOnLiveDelay(seektime, metric) {
        let liveDelay = playbackController.getOriginalLiveDelay();
        if (seektime > (metric.range.end - liveDelay)) {
            seektime = metric.range.end - liveDelay;
        }

        return seektime;
    }

    /**
     * Returns the target live delay
     * @returns {number} The target live delay
     * @memberof module:MediaPlayer
     * @instance
     */
    function getTargetLiveDelay() {
        if (!playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }

        return playbackController.getOriginalLiveDelay();
    }

    /**
     * Current playhead time in seconds.
     *
     * If called with no arguments then the returned value is the current time of the video element.
     * However, if a period ID is supplied then time is relative to the start of that period, or is null if there is no such period id in the manifest.
     *
     * @param {string} periodId - The ID of a period that the returned playhead time must be relative to the start of. If undefined, then playhead time is relative to the first period or the AST.
     * @returns {number} The current playhead time of the media, or null.
     * @throws {@link module:MediaPlayer~PLAYBACK_NOT_INITIALIZED_ERROR PLAYBACK_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @memberof module:MediaPlayer
     * @instance
     */
    function time(periodId = '') {
        if (!playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }
        let t = getVideoElement().currentTime;

        if (periodId !== '') {
            t = streamController.getTimeRelativeToStreamId(t, periodId);
        }

        return t;
    }

    /**
     * Returns the current playhead time relative to the start of the DVR window.
     * For VoD this method returns the same value as time()
     * @returns {number} The current playhead time of the media relative to the start of the DVR window
     * @throws {@link module:MediaPlayer~PLAYBACK_NOT_INITIALIZED_ERROR PLAYBACK_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @memberof module:MediaPlayer
     * @instance
     */
    function timeInDvrWindow() {
        if (!playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }

        if (!playbackController.getIsDynamic()) {
            return time()
        }

        let t = getVideoElement().currentTime;
        const type = streamController && streamController.hasVideoTrack() ? Constants.VIDEO : Constants.AUDIO;
        let metric = dashMetrics.getCurrentDVRInfo(type);
        t = (metric === null || t === 0) ? 0 : Math.max(0, (t - metric.range.start));

        return t
    }

    /**
     * Returns information about the current DVR window including the start time, the end time, the window size.
     * @returns {{startAsUtc: (*|number), size: number, endAsUtc: (*|number), start, end}|{}}
     */
    function getDvrWindow() {
        if (!playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }

        const type = streamController && streamController.hasVideoTrack() ? Constants.VIDEO : Constants.AUDIO;
        let metric = dashMetrics.getCurrentDVRInfo(type);

        if (!metric) {
            return {}
        }

        let offset = 0;
        const isDynamic = playbackController.getIsDynamic();
        if (isDynamic) {
            offset = metric.manifestInfo.availableFrom.getTime() / 1000;
        }
        return {
            start: metric.range.start,
            end: metric.range.end,
            startAsUtc: isDynamic ? offset + metric.range.start : NaN,
            endAsUtc: isDynamic ? offset + metric.range.end : NaN,
            size: metric.range.end - metric.range.start
        }
    }

    /**
     * Total duration of the media in seconds.
     *
     * @returns {number} The total duration of the media. For a dynamic stream this will return DVRWindow.end - DVRWindow.start
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~PLAYBACK_NOT_INITIALIZED_ERROR PLAYBACK_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @instance
     */
    function duration() {
        if (!playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }
        let d = getVideoElement().duration;

        if (playbackController.getIsDynamic()) {
            const type = streamController && streamController.hasVideoTrack() ? Constants.VIDEO : Constants.AUDIO;
            let metric = dashMetrics.getCurrentDVRInfo(type);
            d = metric ? (metric.range.end - metric.range.start) : 0;
        }
        return d;
    }

    /**
     * Use this method to get the current playhead time as an absolute value in seconds since midnight UTC, Jan 1 1970.
     * Note - this property only has meaning for live streams and is NaN for VoD content. If called before play() has begun, it will return a value of NaN.
     *
     * @returns {number} The current playhead time as UTC timestamp.
     * @throws {@link module:MediaPlayer~PLAYBACK_NOT_INITIALIZED_ERROR PLAYBACK_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @memberof module:MediaPlayer
     * @instance
     */
    function timeAsUTC() {
        if (!playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }

        if (!playbackController.getIsDynamic() || time() < 0) {
            return NaN
        }

        const type = streamController && streamController.hasVideoTrack() ? Constants.VIDEO : Constants.AUDIO;
        let metric = dashMetrics.getCurrentDVRInfo(type);
        let availabilityStartTime,
            utcValue;

        if (!metric) {
            return 0;
        }
        availabilityStartTime = metric.manifestInfo.availableFrom.getTime() / 1000;
        utcValue = availabilityStartTime + time()
        return utcValue;
    }

    /*
    ---------------------------------------------------------------------------

        MEDIA PLAYER CONFIGURATION

    ---------------------------------------------------------------------------
    */
    /**
     * <p>Set to false to prevent stream from auto-playing when the view is attached.</p>
     *
     * @param {boolean} value
     * @default true
     * @memberof module:MediaPlayer
     * @see {@link module:MediaPlayer#attachView attachView()}
     * @throws {@link Constants#BAD_ARGUMENT_ERROR BAD_ARGUMENT_ERROR} if called with an invalid argument, not boolean type.
     * @instance
     *
     */
    function setAutoPlay(value) {
        checkParameterType(value, 'boolean');
        autoPlay = value;
    }

    /**
     * @returns {boolean} The current autoPlay state.
     * @memberof module:MediaPlayer
     * @instance
     */
    function getAutoPlay() {
        return autoPlay;
    }

    /**
     * @memberof module:MediaPlayer
     * @instance
     * @returns {number|NaN} Current live stream latency in seconds. It is the difference between now time and time position at the playback head.
     * @throws {@link module:MediaPlayer~MEDIA_PLAYER_NOT_INITIALIZED_ERROR MEDIA_PLAYER_NOT_INITIALIZED_ERROR} if called before initialize function
     */
    function getCurrentLiveLatency() {
        if (!mediaPlayerInitialized) {
            throw MEDIA_PLAYER_NOT_INITIALIZED_ERROR;
        }

        if (!playbackInitialized) {
            return NaN;
        }

        return playbackController.getCurrentLiveLatency();
    }

    /**
     * Add a custom ABR Rule
     * Rule will be apply on next stream if a stream is being played
     *
     * @param {string} type - rule type (one of ['qualitySwitchRules','abandonFragmentRules'])
     * @param {string} rulename - name of rule (used to identify custom rule). If one rule of same name has been added, then existing rule will be updated
     * @param {object} rule - the rule object instance
     * @memberof module:MediaPlayer
     * @throws {@link Constants#BAD_ARGUMENT_ERROR BAD_ARGUMENT_ERROR} if called with invalid arguments.
     * @instance
     */
    function addABRCustomRule(type, rulename, rule) {
        customParametersModel.addAbrCustomRule(type, rulename, rule);
    }

    /**
     * Remove a custom ABR Rule
     *
     * @param {string} rulename - name of the rule to be removed
     * @memberof module:MediaPlayer
     * @instance
     */
    function removeABRCustomRule(rulename) {
        customParametersModel.removeAbrCustomRule(rulename);
    }

    /**
     * Remove all ABR custom rules
     * @memberof module:MediaPlayer
     * @instance
     */
    function removeAllABRCustomRule() {
        customParametersModel.removeAllAbrCustomRule();
    }

    /**
     * Returns all ABR custom rules
     * @return {Array}
     */
    function getABRCustomRules() {
        return customParametersModel.getAbrCustomRules();
    }

    /**
     * <p>Allows you to set a scheme and server source for UTC live edge detection for dynamic streams.
     * If UTCTiming is defined in the manifest, it will take precedence over any time source manually added.</p>
     * <p>If you have exposed the Date header, use the method {@link module:MediaPlayer#clearDefaultUTCTimingSources clearDefaultUTCTimingSources()}.
     * This will allow the date header on the manifest to be used instead of a time server</p>
     * @param {string} schemeIdUri - <ul>
     * <li>urn:mpeg:dash:utc:http-head:2014</li>
     * <li>urn:mpeg:dash:utc:http-xsdate:2014</li>
     * <li>urn:mpeg:dash:utc:http-iso:2014</li>
     * <li>urn:mpeg:dash:utc:direct:2014</li>
     * </ul>
     * <p>Some specs referencing early ISO23009-1 drafts incorrectly use
     * 2012 in the URI, rather than 2014. support these for now.</p>
     * <ul>
     * <li>urn:mpeg:dash:utc:http-head:2012</li>
     * <li>urn:mpeg:dash:utc:http-xsdate:2012</li>
     * <li>urn:mpeg:dash:utc:http-iso:2012</li>
     * <li>urn:mpeg:dash:utc:direct:2012</li>
     * </ul>
     * @param {string} value - Path to a time source.
     * @default
     * <ul>
     *     <li>schemeIdUri:urn:mpeg:dash:utc:http-xsdate:2014</li>
     *     <li>value:http://time.akamai.com/?iso&ms/li>
     * </ul>
     * @memberof module:MediaPlayer
     * @see {@link module:MediaPlayer#removeUTCTimingSource removeUTCTimingSource()}
     * @instance
     */
    function addUTCTimingSource(schemeIdUri, value) {
        customParametersModel.addUTCTimingSource(schemeIdUri, value);
    }

    /**
     * <p>Allows you to remove a UTC time source. Both schemeIdUri and value need to match the Dash.vo.UTCTiming properties in order for the
     * entry to be removed from the array</p>
     * @param {string} schemeIdUri - see {@link module:MediaPlayer#addUTCTimingSource addUTCTimingSource()}
     * @param {string} value - see {@link module:MediaPlayer#addUTCTimingSource addUTCTimingSource()}
     * @memberof module:MediaPlayer
     * @see {@link module:MediaPlayer#clearDefaultUTCTimingSources clearDefaultUTCTimingSources()}
     * @throws {@link Constants#BAD_ARGUMENT_ERROR BAD_ARGUMENT_ERROR} if called with invalid arguments, schemeIdUri and value are not string type.
     * @instance
     */
    function removeUTCTimingSource(schemeIdUri, value) {
        customParametersModel.removeUTCTimingSource(schemeIdUri, value);
    }

    /**
     * <p>Allows you to clear the stored array of time sources.</p>
     * <p>Example use: If you have exposed the Date header, calling this method
     * will allow the date header on the manifest to be used instead of the time server.</p>
     * <p>Example use: Calling this method, assuming there is not an exposed date header on the manifest,  will default back
     * to using a binary search to discover the live edge</p>
     *
     * @memberof module:MediaPlayer
     * @see {@link module:MediaPlayer#restoreDefaultUTCTimingSources restoreDefaultUTCTimingSources()}
     * @instance
     */
    function clearDefaultUTCTimingSources() {
        customParametersModel.clearDefaultUTCTimingSources();
    }

    /**
     * <p>Allows you to restore the default time sources after calling {@link module:MediaPlayer#clearDefaultUTCTimingSources clearDefaultUTCTimingSources()}</p>
     *
     * @default
     * <ul>
     *     <li>schemeIdUri:urn:mpeg:dash:utc:http-xsdate:2014</li>
     *     <li>value:http://time.akamai.com/?iso&ms</li>
     * </ul>
     *
     * @memberof module:MediaPlayer
     * @see {@link module:MediaPlayer#addUTCTimingSource addUTCTimingSource()}
     * @instance
     */
    function restoreDefaultUTCTimingSources() {
        customParametersModel.restoreDefaultUTCTimingSources();
    }

    /**
     * Returns the average latency computed in the ThroughputController in milliseconds
     *
     * @param {MediaType} type
     * @param {string} calculationMode
     * @param {number} sampleSize
     * @return {number} value
     * @memberof module:MediaPlayer
     * @instance
     */
    function getAverageLatency(type = Constants.VIDEO, calculationMode = null, sampleSize = NaN) {
        return throughputController ? throughputController.getAverageLatency(type, calculationMode, sampleSize) : 0;
    }

    /**
     * Returns the average throughput computed in the ThroughputController in kbit/s
     *
     * @param {MediaType} type
     * @param {string} calculationMode
     * @param {number} sampleSize
     * @return {number} value
     * @memberof module:MediaPlayer
     * @instance
     */
    function getAverageThroughput(type = Constants.VIDEO, calculationMode = null, sampleSize = NaN) {
        return throughputController ? throughputController.getAverageThroughput(type, calculationMode, sampleSize) : 0;
    }

    /**
     * Returns the safe average throughput computed in the ThroughputController in kbit/s. The safe average throughput is the average throughput multiplied by bandwidthSafetyFactor
     *
     * @param {MediaType} type
     * @param {string} calculationMode
     * @param {number} sampleSize
     * @return {number} value
     * @memberof module:MediaPlayer
     * @instance
     */
    function getSafeAverageThroughput(type = Constants.VIDEO, calculationMode = null, sampleSize = NaN) {
        return throughputController ? throughputController.getSafeAverageThroughput(type, calculationMode, sampleSize) : 0;
    }

    /**
     *  Returns the raw throughput data without calculating the average. This can be used to calculate the current throughput yourself.
     *
     * @param {MediaType} type
     * @return {Array} value
     * @memberof module:MediaPlayer
     * @instance
     */
    function getRawThroughputData(type = Constants.VIDEO) {
        return throughputController ? throughputController.getRawThroughputData(type) : [];
    }

    /**
     * Sets whether withCredentials on XHR requests for a particular request
     * type is true or false
     *
     * @default false
     * @param {string} type - one of HTTPRequest.*_TYPE
     * @param {boolean} value
     * @memberof module:MediaPlayer
     * @instance
     */
    function setXHRWithCredentialsForType(type, value) {
        customParametersModel.setXHRWithCredentialsForType(type, value);
    }

    /**
     * Gets whether withCredentials on XHR requests for a particular request
     * type is true or false
     *
     * @param {string} type - one of HTTPRequest.*_TYPE
     * @return {boolean}
     * @memberof module:MediaPlayer
     * @instance
     */
    function getXHRWithCredentialsForType(type) {
        return customParametersModel.getXHRWithCredentialsForType(type);
    }

    /*
    ---------------------------------------------------------------------------

        OFFLINE

    ---------------------------------------------------------------------------
    */

    /**
     * Detects if Offline is included and returns an instance of OfflineController.js
     * @memberof module:MediaPlayer
     * @instance
     */
    function getOfflineController() {
        return _detectOffline();
    }

    /*
    ---------------------------------------------------------------------------

        METRICS

    ---------------------------------------------------------------------------
    */
    /**
     * Returns the DashMetrics.js Module. You use this Module to get access to all the public metrics
     * stored in dash.js
     *
     * @see {@link module:DashMetrics}
     * @returns {Object}
     * @memberof module:MediaPlayer
     * @instance
     */
    function getDashMetrics() {
        return dashMetrics;
    }

    /*
    ---------------------------------------------------------------------------

        TEXT MANAGEMENT

    ---------------------------------------------------------------------------
    */

    /**
     * Enable/disable text
     * When enabling text, dash will choose the previous selected text track
     *
     * @param {boolean} enable - true to enable text, false otherwise (same as setTextTrack(-1))
     * @memberof module:MediaPlayer
     * @instance
     */
    function enableText(enable) {
        const activeStreamInfo = streamController.getActiveStreamInfo();

        if (!activeStreamInfo || !textController) {
            return false;
        }

        return textController.enableText(activeStreamInfo.id, enable);
    }

    /**
     * Enable/disable text
     * When enabling dash will keep downloading and process fragmented text tracks even if all tracks are in mode "hidden"
     *
     * @param {boolean} enable - true to enable text streaming even if all text tracks are hidden.
     * @memberof module:MediaPlayer
     * @instance
     */
    function enableForcedTextStreaming(enable) {
        const activeStreamInfo = streamController.getActiveStreamInfo();

        if (!activeStreamInfo || !textController) {
            return false;
        }

        return textController.enableForcedTextStreaming(enable);
    }

    /**
     * Return if text is enabled
     *
     * @return {boolean} return true if text is enabled, false otherwise
     * @memberof module:MediaPlayer
     * @instance
     */
    function isTextEnabled() {
        const activeStreamInfo = streamController.getActiveStreamInfo();

        if (!activeStreamInfo || !textController) {
            return false;
        }

        return textController.isTextEnabled(activeStreamInfo);
    }

    /**
     * Use this method to change the current text track for both external time text files and fragmented text tracks. There is no need to
     * set the track mode on the video object to switch a track when using this method.
     * @param {number} idx - Index of track based on the order of the order the tracks are added Use -1 to disable all tracks. (turn captions off).  Use module:MediaPlayer#dashjs.MediaPlayer.events.TEXT_TRACK_ADDED.
     * @see {@link MediaPlayerEvents#event:TEXT_TRACK_ADDED dashjs.MediaPlayer.events.TEXT_TRACK_ADDED}
     * @throws {@link module:MediaPlayer~PLAYBACK_NOT_INITIALIZED_ERROR PLAYBACK_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @memberof module:MediaPlayer
     * @instance
     */
    function setTextTrack(idx) {
        if (!playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }

        const activeStreamInfo = streamController.getActiveStreamInfo();

        if (!activeStreamInfo || !textController) {
            return;
        }

        textController.setTextTrack(activeStreamInfo.id, idx);
    }

    function getCurrentTextTrackIndex() {
        let idx = NaN;

        const activeStreamInfo = streamController.getActiveStreamInfo();

        if (!activeStreamInfo || !textController) {
            return;
        }

        idx = textController.getCurrentTrackIdx(activeStreamInfo.id);

        return idx;
    }

    /*
    ---------------------------------------------------------------------------

        VIDEO ELEMENT MANAGEMENT

    ---------------------------------------------------------------------------
    */

    /**
     * Returns instance of Video Element that was attached by calling attachView()
     * @returns {Object}
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~ELEMENT_NOT_ATTACHED_ERROR ELEMENT_NOT_ATTACHED_ERROR} if called before attachView function
     * @instance
     */
    function getVideoElement() {
        if (!videoModel.getElement()) {
            throw ELEMENT_NOT_ATTACHED_ERROR;
        }
        return videoModel.getElement();
    }

    /**
     * Use this method to attach an HTML5 VideoElement for dash.js to operate upon.
     *
     * @param {Object} element - An HTMLMediaElement that has already been defined in the DOM (or equivalent stub).
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~MEDIA_PLAYER_NOT_INITIALIZED_ERROR MEDIA_PLAYER_NOT_INITIALIZED_ERROR} if called before initialize function
     * @instance
     */
    function attachView(element) {
        if (!mediaPlayerInitialized) {
            throw MEDIA_PLAYER_NOT_INITIALIZED_ERROR;
        }

        videoModel.setElement(element);

        if (element) {
            _detectProtection();
            _detectMetricsReporting();
            _detectMss();

            if (streamController) {
                streamController.switchToVideoElement(providedStartTime);
            }
        }

        if (playbackInitialized) { //Reset if we have been playing before, so this is a new element.
            _resetPlaybackControllers();
        }

        _initializePlayback(providedStartTime);
    }

    /**
     * Returns instance of Div that was attached by calling attachTTMLRenderingDiv()
     * @returns {Object}
     * @memberof module:MediaPlayer
     * @instance
     */
    function getTTMLRenderingDiv() {
        return videoModel ? videoModel.getTTMLRenderingDiv() : null;
    }

    /**
     * Use this method to attach an HTML5 div for dash.js to render rich TTML subtitles.
     *
     * @param {HTMLDivElement} div - An unstyled div placed after the video element. It will be styled to match the video size and overlay z-order.
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~ELEMENT_NOT_ATTACHED_ERROR ELEMENT_NOT_ATTACHED_ERROR} if called before attachView function
     * @instance
     */
    function attachTTMLRenderingDiv(div) {
        if (!videoModel.getElement()) {
            throw ELEMENT_NOT_ATTACHED_ERROR;
        }
        videoModel.setTTMLRenderingDiv(div);
    }

    function attachVttRenderingDiv(div) {
        if (!videoModel.getElement()) {
            throw ELEMENT_NOT_ATTACHED_ERROR;
        }
        videoModel.setVttRenderingDiv(div);
    }

    /*
    ---------------------------------------------------------------------------

        QUALITY AND TRACK MANAGEMENT

    ---------------------------------------------------------------------------
    */

    /**
     * Gets the current download quality for media type video, audio or images. For video and audio types the ABR
     * rules update this value before every new download unless autoSwitchBitrate is set to false. For 'image'
     * type, thumbnails, there is no ABR algorithm and quality is set manually.
     *
     * @param {MediaType} type - 'video', 'audio' or 'image' (thumbnails)
     * @returns {Representation | null} the quality index, 0 corresponding to the lowest bitrate
     * @memberof module:MediaPlayer
     * @see {@link module:MediaPlayer#getCurrentRepresentationForType getCurrentRepresentationForType()}
     * @throws {@link module:MediaPlayer~STREAMING_NOT_INITIALIZED_ERROR STREAMING_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @instance
     */
    function getCurrentRepresentationForType(type) {
        if (!streamingInitialized) {
            throw STREAMING_NOT_INITIALIZED_ERROR;
        }

        if (type !== Constants.IMAGE && type !== Constants.VIDEO && type !== Constants.AUDIO) {
            return null;
        }

        const activeStream = getActiveStream();
        if (!activeStream) {
            return null;
        }

        if (type === Constants.IMAGE) {
            const thumbnailController = activeStream.getThumbnailController();
            return !thumbnailController ? -1 : thumbnailController.getCurrentTrack();
        }

        return activeStream.getCurrentRepresentationForType(type);
    }

    /**
     * Sets the current quality for media type instead of letting the ABR Heuristics automatically select it.
     * This value will be overwritten by the ABR rules unless autoSwitchBitrate is set to false.
     *
     * @param {MediaType} type - 'video', 'audio' or 'image'
     * @param {number} id , The ID of the Representation
     * @param {boolean} forceReplace - true if segments have to be replaced by segments of the new quality
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~STREAMING_NOT_INITIALIZED_ERROR STREAMING_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @instance
     */
    function setRepresentationForTypeById(type, id, forceReplace = false) {
        if (type !== Constants.IMAGE && type !== Constants.VIDEO && type !== Constants.AUDIO) {
            return;
        }
        if (!streamingInitialized) {
            throw STREAMING_NOT_INITIALIZED_ERROR;
        }
        const activeStream = getActiveStream();
        if (!activeStream) {
            return;
        }
        if (type === Constants.IMAGE) {
            const thumbnailController = activeStream.getThumbnailController();
            if (thumbnailController) {
                thumbnailController.setTrackById(id);
            }
        } else {
            const representation = activeStream.getRepresentationForTypeById(type, id);
            if (representation) {
                abrController.setPlaybackQuality(type, streamController.getActiveStreamInfo(), representation, { forceReplace });
            }
        }
    }

    /**
     * Sets the current quality for media type instead of letting the ABR Heuristics automatically select it.
     * This value will be overwritten by the ABR rules unless autoSwitchBitrate is set to false.
     * Note that you need to specify a relative index based on the position of the target entry in the return value of getRepresentationsByType().
     * Do NOT use representation.absoluteIndex here as this index was assigned prior to applying any filter function. If you want to select a specific representation then use setRepresentationForTypeById() instead.
     *
     * @param {MediaType} type - 'video', 'audio' or 'image'
     * @param {number} index - the quality index, 0 corresponding to the lowest possible index
     * @param {boolean} forceReplace - true if segments have to be replaced by segments of the new quality
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~STREAMING_NOT_INITIALIZED_ERROR STREAMING_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @instance
     */
    function setRepresentationForTypeByIndex(type, index, forceReplace = false) {
        if (type !== Constants.IMAGE && type !== Constants.VIDEO && type !== Constants.AUDIO) {
            return;
        }
        if (!streamingInitialized) {
            throw STREAMING_NOT_INITIALIZED_ERROR;
        }
        const activeStream = getActiveStream();
        if (!activeStream) {
            return;
        }
        if (type === Constants.IMAGE) {
            const thumbnailController = activeStream.getThumbnailController();
            if (thumbnailController) {
                thumbnailController.setTrackByIndex(index);
            }
        } else {
            const representation = activeStream.getRepresentationForTypeByIndex(type, index);
            if (representation) {
                abrController.setPlaybackQuality(type, streamController.getActiveStreamInfo(), representation, { forceReplace });
            }
        }
    }

    /**
     * @param {MediaType} type
     * @param {string} streamId
     * @returns {Array}
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~STREAMING_NOT_INITIALIZED_ERROR STREAMING_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @instance
     */
    function getRepresentationsByType(type, streamId = null) {
        if (!streamingInitialized) {
            throw STREAMING_NOT_INITIALIZED_ERROR;
        }
        let stream = streamId ? streamController.getStreamById(streamId) : getActiveStream();
        return stream ? stream.getRepresentationsByType(type) : [];
    }

    /**
     * This method returns the list of all available streams from a given manifest
     * @param {Object} manifest
     * @returns {Array} list of {@link StreamInfo}
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~STREAMING_NOT_INITIALIZED_ERROR STREAMING_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @instance
     */
    function getStreamsFromManifest(manifest) {
        if (!streamingInitialized) {
            throw STREAMING_NOT_INITIALIZED_ERROR;
        }
        return adapter.getStreamsInfo(manifest);
    }

    /**
     * This method returns the list of all available tracks for a given media type
     * @param {MediaType} type
     * @returns {Array} list of {@link MediaInfo}
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~STREAMING_NOT_INITIALIZED_ERROR STREAMING_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @instance
     */
    function getTracksFor(type) {
        if (!streamingInitialized) {
            throw STREAMING_NOT_INITIALIZED_ERROR;
        }
        let streamInfo = streamController.getActiveStreamInfo();

        if (!streamInfo) {
            return [];
        }

        const tracks = mediaController.getTracksFor(type, streamInfo.id);
        return tracks.filter((track) => {
            return protectionController ? protectionController.areKeyIdsUsable(track.normalizedKeyIds) : true
        })
    }

    /**
     * This method returns the list of all available tracks for a given media type and streamInfo from a given manifest
     * @param {MediaType} type
     * @param {Object} manifest
     * @param {Object} streamInfo
     * @returns {Array}  list of {@link MediaInfo}
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~STREAMING_NOT_INITIALIZED_ERROR STREAMING_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @instance
     */
    function getTracksForTypeFromManifest(type, manifest, streamInfo) {
        if (!streamingInitialized) {
            throw STREAMING_NOT_INITIALIZED_ERROR;
        }

        streamInfo = streamInfo || adapter.getStreamsInfo(manifest, 1)[0];

        return streamInfo ? adapter.getAllMediaInfoForType(streamInfo, type, manifest) : [];
    }

    /**
     * @param {MediaType} type
     * @returns {Object|null} {@link MediaInfo}
     *
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~STREAMING_NOT_INITIALIZED_ERROR STREAMING_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @instance
     */
    function getCurrentTrackFor(type) {
        if (!streamingInitialized) {
            throw STREAMING_NOT_INITIALIZED_ERROR;
        }
        let streamInfo = streamController.getActiveStreamInfo();
        if (streamInfo) {
            return mediaController.getCurrentTrackFor(type, streamInfo.id);
        }

        return null
    }

    /**
     * This method allows to set media settings that will be used to pick the initial track. Format of the settings
     * is following: <br />
     * {lang: langValue (can be either a string primitive, a string object, or a RegExp object to match),
     *  index: indexValue,
     *  viewpoint: viewpointValue (object:{schemeIdUri,value} or value-primitive),
     *  audioChannelConfiguration: audioChannelConfigurationValue (object:{schemeIdUri,value} or value-primitive (assumes schemeIdUri='urn:mpeg:mpegB:cicp:ChannelConfiguration')),
     *  accessibility: accessibilityValue (object:{schemeIdUri,value} or value-primitive (assumes schemeIdUri='urn:mpeg:dash:role:2011')),
     *  role: roleValue (object:{schemeIdUri,value} or value-primitive (assumes schemeIdUri='urn:mpeg:dash:role:2011'))
     * }
     *
     * @param {MediaType} type
     * @param {Object} value
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~MEDIA_PLAYER_NOT_INITIALIZED_ERROR MEDIA_PLAYER_NOT_INITIALIZED_ERROR} if called before initialize function
     * @instance
     */
    function setInitialMediaSettingsFor(type, value) {
        if (!mediaPlayerInitialized) {
            throw MEDIA_PLAYER_NOT_INITIALIZED_ERROR;
        }
        let sanitizedValue = _sanitizeSettings(value);
        mediaController.setInitialSettings(type, sanitizedValue);
    }

    /**
     * This method returns media settings that is used to pick the initial track. Format of the settings
     * is following:
     * {lang: langValue,
     *  index: indexValue,
     *  viewpoint: viewpointValue,
     *  audioChannelConfiguration: audioChannelConfigurationValue,
     *  accessibility: accessibilityValue,
     *  role: roleValue}
     * @param {MediaType} type
     * @returns {Object}
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~MEDIA_PLAYER_NOT_INITIALIZED_ERROR MEDIA_PLAYER_NOT_INITIALIZED_ERROR} if called before initialize function
     * @instance
     */
    function getInitialMediaSettingsFor(type) {
        if (!mediaPlayerInitialized) {
            throw MEDIA_PLAYER_NOT_INITIALIZED_ERROR;
        }
        return mediaController.getInitialSettings(type);
    }

    /**
     * @param {MediaInfo} track - instance of {@link MediaInfo}
     * @param {boolean} [noSettingsSave] - specify if settings from the track must not be saved for incoming track selection
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~STREAMING_NOT_INITIALIZED_ERROR STREAMING_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @instance
     */
    function setCurrentTrack(track, noSettingsSave = false) {
        if (!streamingInitialized) {
            throw STREAMING_NOT_INITIALIZED_ERROR;
        }

        const canUseTrack = protectionController ? protectionController.areKeyIdsUsable(track.normalizedKeyIds) : true

        if (!canUseTrack) {
            logger.error(`Can not switch to track with index ${track.index} because key is not usable`);
            return
        }

        mediaController.setTrack(track, { noSettingsSave });
    }

    /*
    ---------------------------------------------------------------------------

        Custom filter and callback functions

    ---------------------------------------------------------------------------
    */
    /**
     * Registers a custom capabilities filter. This enables application to filter representations to use.
     * The provided callback function shall return either a boolean or a promise resolving to a boolean based on whether or not to use the representation.
     * The filters are applied in the order they are registered.
     * @param {function} filter - the custom capabilities filter callback
     * @memberof module:MediaPlayer
     * @instance
     */
    function registerCustomCapabilitiesFilter(filter) {
        customParametersModel.registerCustomCapabilitiesFilter(filter);
    }

    /**
     * Unregisters a custom capabilities filter.
     * @param {function} filter - the custom capabilities filter callback
     * @memberof module:MediaPlayer
     * @instance
     */
    function unregisterCustomCapabilitiesFilter(filter) {
        customParametersModel.unregisterCustomCapabilitiesFilter(filter);
    }

    /**
     * Registers a custom initial track selection function. Only one function is allowed. Calling this method will overwrite a potentially existing function.
     * @param {function} customFunc - the custom function that returns the initial track
     */
    function setCustomInitialTrackSelectionFunction(customFunc) {
        customParametersModel.setCustomInitialTrackSelectionFunction(customFunc);
    }

    /**
     * Resets the custom initial track selection
     */
    function resetCustomInitialTrackSelectionFunction() {
        customParametersModel.resetCustomInitialTrackSelectionFunction(null);

    }

    /**
     * Adds a request interceptor. This enables application to monitor, manipulate, overwrite any request parameter and/or request data.
     * The provided callback function shall return a promise with updated request that shall be resolved once the process of the request is completed.
     * The interceptors are applied in the order they are added.
     * @param {function} interceptor - the request interceptor callback
     * @memberof module:MediaPlayer
     * @instance
     */
    function addRequestInterceptor(interceptor) {
        customParametersModel.addRequestInterceptor(interceptor);
    }

    /**
     * Removes a request interceptor.
     * @param {function} interceptor - the request interceptor callback
     * @memberof module:MediaPlayer
     * @instance
     */
    function removeRequestInterceptor(interceptor) {
        customParametersModel.removeRequestInterceptor(interceptor);
    }

    /**
     * Adds a response interceptor. This enables application to monitor, manipulate, overwrite the response data
     * The provided callback function shall return a promise with updated response that shall be resolved once the process of the response is completed.
     * The interceptors are applied in the order they are added.
     * @param {function} interceptor - the response interceptor
     * @memberof module:MediaPlayer
     * @instance
     */
    function addResponseInterceptor(interceptor) {
        customParametersModel.addResponseInterceptor(interceptor);
    }

    /**
     * Removes a response interceptor.
     * @param {function} interceptor - the request interceptor
     * @memberof module:MediaPlayer
     * @instance
     */
    function removeResponseInterceptor(interceptor) {
        customParametersModel.removeResponseInterceptor(interceptor);
    }

    /**
     * Registers a license request filter. This enables application to manipulate/overwrite any request parameter and/or request data.
     * The provided callback function shall return a promise that shall be resolved once the filter process is completed.
     * The filters are applied in the order they are registered.
     * @param {function} filter - the license request filter callback
     * @memberof module:MediaPlayer
     * @instance
     */
    function registerLicenseRequestFilter(filter) {
        customParametersModel.registerLicenseRequestFilter(filter);
    }

    /**
     * Registers a license response filter. This enables application to manipulate/overwrite the response data
     * The provided callback function shall return a promise that shall be resolved once the filter process is completed.
     * The filters are applied in the order they are registered.
     * @param {function} filter - the license response filter callback
     * @memberof module:MediaPlayer
     * @instance
     */
    function registerLicenseResponseFilter(filter) {
        customParametersModel.registerLicenseResponseFilter(filter);
    }

    /**
     * Unregisters a license request filter.
     * @param {function} filter - the license request filter callback
     * @memberof module:MediaPlayer
     * @instance
     */
    function unregisterLicenseRequestFilter(filter) {
        customParametersModel.unregisterLicenseRequestFilter(filter);
    }

    /**
     * Unregisters a license response filter.
     * @param {function} filter - the license response filter callback
     * @memberof module:MediaPlayer
     * @instance
     */
    function unregisterLicenseResponseFilter(filter) {
        customParametersModel.unregisterLicenseResponseFilter(filter);
    }

    /*
    ---------------------------------------------------------------------------

        PROTECTION MANAGEMENT

    ---------------------------------------------------------------------------
    */

    /**
     * Detects if Protection is included and returns an instance of ProtectionController.js
     * @memberof module:MediaPlayer
     * @instance
     */
    function getProtectionController() {
        return _detectProtection();
    }

    /**
     * Will override dash.js protection controller.
     * @param {ProtectionController} value - valid protection controller instance.
     * @memberof module:MediaPlayer
     * @instance
     */
    function attachProtectionController(value) {
        protectionController = value;
    }

    /**
     * Sets Protection Data required to setup the Protection Module (DRM). Protection Data must
     * be set before initializing MediaPlayer or, once initialized, before PROTECTION_CREATED event is fired.
     * @see {@link module:MediaPlayer#initialize initialize()}
     * @see {@link ProtectionEvents#event:PROTECTION_CREATED dashjs.Protection.events.PROTECTION_CREATED}
     * @param {ProtectionDataSet} value - object containing
     * property names corresponding to key system name strings and associated
     * values being instances of.
     * @memberof module:MediaPlayer
     * @instance
     */
    function setProtectionData(value) {
        protectionData = value;

        // Propagate changes in case StreamController is already created
        if (streamController) {
            streamController.setProtectionData(protectionData);
        }
    }

    /*
    ---------------------------------------------------------------------------

        THUMBNAILS MANAGEMENT

    ---------------------------------------------------------------------------
    */

    /**
     * Provide the thumbnail at time position. This can be asynchronous, so you must provide a callback ro retrieve thumbnails informations
     * @param {number} time - A relative time, in seconds, based on the return value of the {@link module:MediaPlayer#duration duration()} method is expected
     * @param {function} callback - A Callback function provided when retrieving thumbnail the given time position. Thumbnail object is null in case there are is not a thumbnails representation or
     * if it doesn't contain a thumbnail for the given time position.
     * @memberof module:MediaPlayer
     * @instance
     */
    function provideThumbnail(time, callback) {
        if (typeof callback !== 'function') {
            return;
        }
        if (time < 0) {
            callback(null);
            return;
        }
        const s = playbackController.getIsDynamic() ? getDvrSeekOffset(time) : time;
        const stream = streamController.getStreamForTime(s);
        if (stream === null) {
            callback(null);
            return;
        }

        const thumbnailController = stream.getThumbnailController();
        if (!thumbnailController) {
            callback(null);
            return;
        }

        return thumbnailController.provide(s, callback);
    }

    /*
    ---------------------------------------------------------------------------

        TOOLS AND OTHERS FUNCTIONS

    ---------------------------------------------------------------------------
    */
    /**
     * Allows application to retrieve a manifest.  Manifest loading is asynchronous and requires the app-provided callback function
     *
     * @param {string} url - url the manifest url
     * @param {function} callback - A Callback function provided when retrieving manifests
     * @memberof module:MediaPlayer
     * @instance
     */
    function retrieveManifest(url, callback) {
        let manifestLoader = _createManifestLoader();
        let self = this;

        const handler = function (e) {
            if (!e.error) {
                callback(e.manifest);
            } else {
                callback(null, e.error);
            }
            eventBus.off(Events.INTERNAL_MANIFEST_LOADED, handler, self);
            manifestLoader.reset();
        };

        eventBus.on(Events.INTERNAL_MANIFEST_LOADED, handler, self);

        uriFragmentModel.initialize(url);
        manifestLoader.load(url);
    }

    /**
     * Returns the source string or manifest that was attached by calling attachSource()
     * @returns {string | manifest}
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~SOURCE_NOT_ATTACHED_ERROR SOURCE_NOT_ATTACHED_ERROR} if called before attachSource function
     * @instance
     */
    function getSource() {
        if (!source) {
            throw SOURCE_NOT_ATTACHED_ERROR;
        }
        return source;
    }

    /**
     * Sets the source to a new manifest URL or object without reloading
     * Useful for updating CDN tokens
     * @param {string | object} urlOrManifest
     */
    function updateSource(urlOrManifest) {
        source = urlOrManifest
        streamController.load(source);
    }

    /**
     * Use this method to set a source URL to a valid MPD manifest file OR
     * a previously downloaded and parsed manifest object.  Optionally, can
     * also provide protection information
     *
     * @param {string|Object} urlOrManifest - A URL to a valid MPD manifest file, or a
     * parsed manifest object.
     * @param {number|string} startTime - For VoD content the start time is relative to the start time of the first period.
     * For live content
     * If the parameter starts from prefix posix: it signifies the absolute time range defined in seconds of Coordinated Universal Time (ITU-R TF.460-6). This is the number of seconds since 01-01-1970 00:00:00 UTC. Fractions of seconds may be optionally specified down to the millisecond level.
     * If no posix prefix is used the starttime is relative to MPD@availabilityStartTime
     *
     * @throws {@link module:MediaPlayer~MEDIA_PLAYER_NOT_INITIALIZED_ERROR MEDIA_PLAYER_NOT_INITIALIZED_ERROR} if called before initialize function
     *
     * @memberof module:MediaPlayer
     * @instance
     */
    function attachSource(urlOrManifest, startTime = NaN) {
        if (!mediaPlayerInitialized) {
            throw MEDIA_PLAYER_NOT_INITIALIZED_ERROR;
        }

        if (typeof urlOrManifest === 'string') {
            uriFragmentModel.initialize(urlOrManifest);
        }

        if (startTime == null) {
            startTime = NaN;
        }

        if (!isNaN(startTime)) {
            startTime = Math.max(0, startTime);
        }

        providedStartTime = startTime;
        source = urlOrManifest;

        if (streamingInitialized || playbackInitialized) {
            _resetPlaybackControllers();
        }

        if (isReady()) {
            _initializePlayback(providedStartTime);
        }
    }

    /**
     *  Reload the manifest that the player is currently using.
     *
     *  @memberof module:MediaPlayer
     *  @param {function} callback - A Callback function provided when retrieving manifests
     *  @instance
     */
    function refreshManifest(callback) {
        if (!mediaPlayerInitialized) {
            throw MEDIA_PLAYER_NOT_INITIALIZED_ERROR;
        }

        if (!isReady()) {
            return callback(null, SOURCE_NOT_ATTACHED_ERROR);
        }

        let self = this;

        if (typeof callback === 'function') {
            const handler = function (e) {
                eventBus.off(Events.INTERNAL_MANIFEST_LOADED, handler, self);

                if (e.error) {
                    callback(null, e.error);
                    return;
                }

                callback(e.manifest);
            };

            eventBus.on(Events.INTERNAL_MANIFEST_LOADED, handler, self);
        }

        streamController.refreshManifest();
    }

    /**
     * Get the current settings object being used on the player.
     * @returns {PlayerSettings} The settings object being used.
     *
     * @memberof module:MediaPlayer
     * @instance
     */
    function getSettings() {
        return settings.get();
    }

    /**
     * @summary Update the current settings object being used on the player. Anything left unspecified is not modified.
     * @param {PlayerSettings} settingsObj - An object corresponding to the settings definition.
     * @description This function does not update the entire object, only properties in the passed in object are updated.
     *
     * This means that updateSettings({a: x}) and updateSettings({b: y}) are functionally equivalent to
     * updateSettings({a: x, b: y}). If the default values are required again, @see{@link resetSettings}.
     * @example
     * player.updateSettings({
     *      streaming: {
     *          lowLatencyEnabled: false,
     *          abr: {
     *              maxBitrate: { audio: 100, video: 1000 }
     *          }
     *      }
     *  });
     * @memberof module:MediaPlayer
     * @instance
     */
    function updateSettings(settingsObj) {
        settings.update(settingsObj);
    }

    /**
     * Resets the settings object back to the default.
     *
     * @memberof module:MediaPlayer
     * @instance
     */
    function resetSettings() {
        settings.reset();
    }

    /**
     * A utility methods which converts UTC timestamp value into a valid time and date string.
     *
     * @param {number} time - UTC timestamp to be converted into date and time.
     * @param {string} locales - a region identifier (i.e. en_US).
     * @param {boolean} hour12 - 12 vs 24 hour. Set to true for 12 hour time formatting.
     * @param {boolean} withDate - default is false. Set to true to append current date to UTC time format.
     * @returns {string} A formatted time and date string.
     * @memberof module:MediaPlayer
     * @instance
     */
    function formatUTC(time, locales, hour12, withDate = false) {
        const dt = new Date(time * 1000);
        const d = dt.toLocaleDateString(locales);
        const t = dt.toLocaleTimeString(locales, {
            hour12: hour12
        });
        return withDate ? t + ' ' + d : t;
    }

    /**
     * A utility method which converts seconds into TimeCode (i.e. 300 --> 05:00).
     *
     * @param {number} value - A number in seconds to be converted into a formatted time code.
     * @returns {string} A formatted time code string.
     * @memberof module:MediaPlayer
     * @instance
     */
    function convertToTimeCode(value) {
        value = Math.max(value, 0);

        let h = Math.floor(value / 3600);
        let m = Math.floor((value % 3600) / 60);
        let s = Math.floor((value % 3600) % 60);
        return (h === 0 ? '' : (h < 10 ? '0' + h.toString() + ':' : h.toString() + ':')) + (m < 10 ? '0' + m.toString() : m.toString()) + ':' + (s < 10 ? '0' + s.toString() : s.toString());
    }

    /**
     * This method should be used to extend or replace internal dash.js objects.
     * There are two ways to extend dash.js (determined by the override argument):
     * <ol>
     * <li>If you set override to true any public method or property in your custom object will
     * override the dash.js parent object's property(ies) and will be used instead but the
     * dash.js parent module will still be created.</li>
     *
     * <li>If you set override to false your object will completely replace the dash.js object.
     * (Note: This is how it was in 1.x of Dash.js with Dijon).</li>
     * </ol>
     * <b>When you extend you get access to this.context, this.factory and this.parent to operate with in your custom object.</b>
     * <ul>
     * <li><b>this.context</b> - can be used to pass context for singleton access.</li>
     * <li><b>this.factory</b> - can be used to call factory.getSingletonInstance().</li>
     * <li><b>this.parent</b> - is the reference of the parent object to call other public methods. (this.parent is excluded if you extend with override set to false or option 2)</li>
     * </ul>
     * <b>You must call extend before you call initialize</b>
     * @see {@link module:MediaPlayer#initialize initialize()}
     * @param {string} parentNameString - name of parent module
     * @param {Object} childInstance - overriding object
     * @param {boolean} override - replace only some methods (true) or the whole object (false)
     * @memberof module:MediaPlayer
     * @instance
     */
    function extend(parentNameString, childInstance, override) {
        FactoryMaker.extend(parentNameString, childInstance, override, context);
    }

    /**
     * This method returns the active stream
     *
     * @throws {@link module:MediaPlayer~STREAMING_NOT_INITIALIZED_ERROR STREAMING_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @memberof module:MediaPlayer
     * @instance
     */
    function getActiveStream() {
        if (!streamingInitialized) {
            throw STREAMING_NOT_INITIALIZED_ERROR;
        }
        let streamInfo = streamController.getActiveStreamInfo();
        return streamInfo ? streamController.getStreamById(streamInfo.id) : null;
    }

    /**
     * Returns the DashAdapter.js Module.
     *
     * @see {@link module:DashAdapter}
     * @returns {Object}
     * @memberof module:MediaPlayer
     * @instance
     */
    function getDashAdapter() {
        return adapter;
    }

    /**
     * Triggers a request to the content steering server to update the steering information.
     * @return {Promise<any>}
     */
    function triggerSteeringRequest() {
        if (contentSteeringController) {
            return contentSteeringController.loadSteeringData();
        }
    }

    /**
     * Returns the current response data of the content steering server
     * @return {object}
     */
    function getCurrentSteeringResponseData() {
        if (contentSteeringController) {
            return contentSteeringController.getCurrentSteeringResponseData();
        }
    }

    /**
     * Returns the current manifest
     * @returns {object}
     */
    function getManifest() {
        return manifestModel.getValue();
    }

    /**
     * Returns all BaseURLs that are available including synthesized elements (e.g by content steering)
     * @returns {BaseURL[]}
     */
    function getAvailableBaseUrls() {
        const manifest = manifestModel.getValue();

        if (!manifest) {
            return [];
        }

        return baseURLController.getBaseUrls(manifest);
    }


    /**
     * Returns the available location elements including synthesized elements (e.g by content steering)
     * @returns {MpdLocation[]}
     */
    function getAvailableLocations() {
        const manifest = manifestModel.getValue();

        if (!manifest) {
            return [];
        }

        const manifestLocations = adapter.getLocation(manifest);
        const synthesizedElements = contentSteeringController.getSynthesizedLocationElements(manifestLocations);

        return manifestLocations.concat(synthesizedElements);
    }

    //***********************************
    // PRIVATE METHODS
    //***********************************

    function _resetPlaybackControllers() {
        playbackInitialized = false;
        streamingInitialized = false;
        adapter.reset();
        streamController.reset();
        gapController.reset();
        catchupController.reset();
        playbackController.reset();
        serviceDescriptionController.reset();
        contentSteeringController.reset();
        abrController.reset();
        throughputController.reset();
        mediaController.reset();
        segmentBaseController.reset();
        if (protectionController) {
            if (settings.get().streaming.protection.keepProtectionMediaKeys) {
                protectionController.stop();
            } else {
                protectionController.reset();
                protectionController = null;
                _detectProtection();
            }
        }
        textController.reset();
        cmcdModel.reset();
        cmsdModel.reset();
    }

    function _createPlaybackControllers() {
        // creates or get objects instances
        const manifestLoader = _createManifestLoader();

        if (!streamController) {
            streamController = StreamController(context).getInstance();
        }

        if (!textController) {
            textController = TextController(context).create({
                errHandler,
                manifestModel,
                adapter,
                mediaController,
                baseURLController,
                videoModel,
                settings
            });
        }

        capabilitiesFilter.setConfig({
            capabilities,
            customParametersModel,
            adapter,
            settings,
            protectionController,
            manifestModel,
            errHandler
        });

        streamController.setConfig({
            capabilities,
            capabilitiesFilter,
            manifestLoader,
            manifestModel,
            mediaPlayerModel,
            customParametersModel,
            protectionController,
            textController,
            adapter,
            dashMetrics,
            errHandler,
            timelineConverter,
            videoModel,
            playbackController,
            serviceDescriptionController,
            contentSteeringController,
            abrController,
            throughputController,
            mediaController,
            settings,
            baseURLController,
            uriFragmentModel,
            segmentBaseController
        });

        gapController.setConfig({
            settings,
            playbackController,
            streamController,
            videoModel,
            timelineConverter,
            adapter
        });

        playbackController.setConfig({
            streamController,
            serviceDescriptionController,
            dashMetrics,
            adapter,
            videoModel,
            timelineConverter,
            settings
        });

        catchupController.setConfig({
            streamController,
            playbackController,
            mediaPlayerModel,
            videoModel,
            settings
        })

        throughputController.setConfig({
            settings,
            playbackController
        })

        abrController.setConfig({
            streamController,
            capabilities,
            domStorage,
            mediaPlayerModel,
            customParametersModel,
            throughputController,
            cmsdModel,
            dashMetrics,
            adapter,
            videoModel,
            settings
        });

        cmcdModel.setConfig({
            abrController,
            dashMetrics,
            playbackController,
            serviceDescriptionController,
            throughputController,
        });

        clientDataReportingController.setConfig({
            serviceDescriptionController
        })

        cmsdModel.setConfig({});

        // initializes controller
        mediaController.initialize();
        throughputController.initialize();
        abrController.initialize();
        streamController.initialize(autoPlay, protectionData);
        textController.initialize();
        gapController.initialize();
        catchupController.initialize();
        cmcdModel.initialize(autoPlay);
        cmsdModel.initialize();
        contentSteeringController.initialize();
        segmentBaseController.initialize();
    }

    function _createManifestLoader() {
        return ManifestLoader(context).create({
            debug: debug,
            errHandler: errHandler,
            dashMetrics: dashMetrics,
            mediaPlayerModel: mediaPlayerModel,
            mssHandler: mssHandler,
            settings: settings
        });
    }

    function _detectProtection() {
        if (protectionController) {
            return protectionController;
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

            protectionController = protection.createProtectionSystem({
                debug,
                errHandler,
                videoModel,
                customParametersModel,
                capabilities,
                eventBus,
                events: Events,
                BASE64,
                constants: Constants,
                cmcdModel,
                settings
            });

            if (!capabilities) {
                capabilities = Capabilities(context).getInstance();
            }

            capabilities.setProtectionController(protectionController);

            return protectionController;
        }

        return null;
    }

    function _detectMetricsReporting() {
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
                mediaElement: getVideoElement(),
                adapter: adapter,
                dashMetrics: dashMetrics,
                mediaPlayerModel: mediaPlayerModel,
                events: Events,
                constants: Constants,
                metricsConstants: MetricsConstants
            });
        }
    }

    function _detectMss() {
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
                dashMetrics: dashMetrics,
                manifestModel: manifestModel,
                playbackController: playbackController,
                streamController: streamController,
                protectionController: protectionController,
                baseURLController: baseURLController,
                errHandler: errHandler,
                events: Events,
                constants: Constants,
                debug: debug,
                initSegmentType: HTTPRequest.INIT_SEGMENT_TYPE,
                BASE64: BASE64,
                ISOBoxer: ISOBoxer,
                settings: settings
            });
        }
    }

    function _detectOffline() {
        if (!mediaPlayerInitialized) {
            throw MEDIA_PLAYER_NOT_INITIALIZED_ERROR;
        }

        if (offlineController) {
            return offlineController;
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

            const manifestLoader = _createManifestLoader();
            const manifestUpdater = ManifestUpdater(context).create();

            manifestUpdater.setConfig({
                manifestModel,
                adapter,
                manifestLoader,
                errHandler,
                contentSteeringController
            });

            offlineController = detectedOfflineController(context).create({
                debug: debug,
                manifestUpdater: manifestUpdater,
                baseURLController: baseURLController,
                manifestLoader: manifestLoader,
                manifestModel: manifestModel,
                mediaPlayerModel: mediaPlayerModel,
                abrController: abrController,
                playbackController: playbackController,
                adapter: adapter,
                errHandler: errHandler,
                dashMetrics: dashMetrics,
                timelineConverter: timelineConverter,
                segmentBaseController: segmentBaseController,
                schemeLoaderFactory: schemeLoaderFactory,
                eventBus: eventBus,
                events: Events,
                errors: Errors,
                constants: Constants,
                settings: settings,
                dashConstants: DashConstants,
                urlUtils: URLUtils(context).getInstance()
            });
            return offlineController;
        }

        return null;
    }

    function _sanitizeSettings(value) {
        const defaults = settings.get().streaming.defaultSchemeIdUri;
        let output = {};

        function __sanitizeDescriptorType(name, val, defaultSchemeIdUri) {
            let out = {};
            // For an empty string, let's unset the descriptor, i.e. return null
            if (val) {
                if (val instanceof Array) {
                    throw ARRAY_NOT_SUPPORTED_ERROR;
                } else if (val instanceof Object) {
                    out.schemeIdUri = val.schemeIdUri ? val.schemeIdUri : '';
                    out.value = val.value ? val.value : '';
                } else {
                    out.schemeIdUri = defaultSchemeIdUri;
                    out.value = val;
                    logger.warn('No schemeIdUri provided for ' + name + ', using default \"' + defaultSchemeIdUri + '\"');
                }
                return out;
            }
            return null;
        }

        if (value.id !== undefined) {
            output.id = value.id;
        }
        if (value.lang !== undefined) {
            output.lang = value.lang;
        }
        if (!isNaN(value.index)) {
            output.index = value.index;
        }
        if (value.viewpoint !== undefined) {
            output.viewpoint = __sanitizeDescriptorType('viewpoint', value.viewpoint, defaults.viewpoint);
        }
        if (value.audioChannelConfiguration !== undefined) {
            output.audioChannelConfiguration = __sanitizeDescriptorType('audioChannelConfiguration', value.audioChannelConfiguration, defaults.audioChannelConfiguration);
        }
        if (value.role !== undefined) {
            output.role = __sanitizeDescriptorType('role', value.role, defaults.role);
            
            // conceal misspelled "Main" from earlier MPEG-DASH editions (fixed with 6th edition)
            if (output.role.schemeIdUri === Constants.DASH_ROLE_SCHEME_ID && output.role.value === 'Main') {
                output.role.value = DashConstants.MAIN;
            }
        }
        if (value.accessibility !== undefined) {
            output.accessibility = __sanitizeDescriptorType('accessibility', value.accessibility, defaults.accessibility);
        }

        return output;
    }

    /**
     *
     * @private
     */
    function _initializePlayback(startTime = NaN) {

        if (offlineController) {
            offlineController.resetRecords();
        }

        if (!streamingInitialized && source) {
            streamingInitialized = true;
            logger.info('Streaming Initialized');
            _createPlaybackControllers();

            if (typeof source === 'string') {
                streamController.load(source, startTime);
            } else {
                streamController.loadWithManifest(source, startTime);
            }
        }

        if (!playbackInitialized && isReady()) {
            playbackInitialized = true;
            eventBus.trigger(MediaPlayerEvents.PLAYBACK_INITIALIZED)
            logger.info('Playback Initialized');
        }
    }

    instance = {
        addABRCustomRule,
        addRequestInterceptor,
        addResponseInterceptor,
        addUTCTimingSource,
        attachProtectionController,
        attachSource,
        attachTTMLRenderingDiv,
        attachView,
        attachVttRenderingDiv,
        clearDefaultUTCTimingSources,
        convertToTimeCode,
        destroy,
        duration,
        enableForcedTextStreaming,
        enableText,
        extend,
        formatUTC,
        getABRCustomRules,
        getActiveStream,
        getAutoPlay,
        getAvailableBaseUrls,
        getAvailableLocations,
        getAverageLatency,
        getAverageThroughput,
        getBufferLength,
        getCurrentLiveLatency,
        getCurrentRepresentationForType,
        getCurrentSteeringResponseData,
        getCurrentTextTrackIndex,
        getCurrentTrackFor,
        getDashAdapter,
        getDashMetrics,
        getDebug,
        getDvrSeekOffset,
        getDvrWindow,
        getInitialMediaSettingsFor,
        getLowLatencyModeEnabled,
        getManifest,
        getOfflineController,
        getPlaybackRate,
        getProtectionController,
        getRawThroughputData,
        getRepresentationsByType,
        getSafeAverageThroughput,
        getSettings,
        getSource,
        getStreamsFromManifest,
        getTTMLRenderingDiv,
        getTargetLiveDelay,
        getTracksFor,
        getTracksForTypeFromManifest,
        getVersion,
        getVideoElement,
        getVolume,
        getXHRWithCredentialsForType,
        initialize,
        isDynamic,
        isMuted,
        isPaused,
        isReady,
        isSeeking,
        isTextEnabled,
        off,
        on,
        pause,
        play,
        preload,
        provideThumbnail,
        refreshManifest,
        registerCustomCapabilitiesFilter,
        registerLicenseRequestFilter,
        registerLicenseResponseFilter,
        removeABRCustomRule,
        removeAllABRCustomRule,
        removeRequestInterceptor,
        removeResponseInterceptor,
        removeUTCTimingSource,
        reset,
        resetCustomInitialTrackSelectionFunction,
        resetSettings,
        restoreDefaultUTCTimingSources,
        retrieveManifest,
        seek,
        seekToOriginalLive,
        seekToPresentationTime,
        setAutoPlay,
        setConfig,
        setCurrentTrack,
        setCustomInitialTrackSelectionFunction,
        setInitialMediaSettingsFor,
        setMute,
        setPlaybackRate,
        setProtectionData,
        setRepresentationForTypeById,
        setRepresentationForTypeByIndex,
        setTextTrack,
        setVolume,
        setXHRWithCredentialsForType,
        time,
        timeAsUTC,
        timeInDvrWindow,
        trigger,
        triggerSteeringRequest,
        unregisterCustomCapabilitiesFilter,
        unregisterLicenseRequestFilter,
        unregisterLicenseResponseFilter,
        updateSettings,
        updateSource,
    };

    setup();

    return instance;
}

MediaPlayer.__dashjs_factory_name = 'MediaPlayer';
const factory = FactoryMaker.getClassFactory(MediaPlayer);
factory.events = MediaPlayerEvents;
factory.errors = Errors;
FactoryMaker.updateClassFactory(MediaPlayer.__dashjs_factory_name, factory);

export default factory;
