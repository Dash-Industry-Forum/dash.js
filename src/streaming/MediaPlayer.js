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
import cea608parser from '../../externals/cea608-parser';
import Constants from './constants/Constants';
import DashConstants from '../dash/constants/DashConstants';
import MetricsConstants from './constants/MetricsConstants';
import PlaybackController from './controllers/PlaybackController';
import StreamController from './controllers/StreamController';
import GapController from './controllers/GapController';
import MediaController from './controllers/MediaController';
import BaseURLController from './controllers/BaseURLController';
import ManifestLoader from './ManifestLoader';
import ErrorHandler from './utils/ErrorHandler';
import Capabilities from './utils/Capabilities';
import CapabilitiesFilter from './utils/CapabilitiesFilter';
import RequestModifier from './utils/RequestModifier';
import URIFragmentModel from './models/URIFragmentModel';
import ManifestModel from './models/ManifestModel';
import MediaPlayerModel from './models/MediaPlayerModel';
import AbrController from './controllers/AbrController';
import SchemeLoaderFactory from './net/SchemeLoaderFactory';
import VideoModel from './models/VideoModel';
import CmcdModel from './models/CmcdModel';
import DOMStorage from './utils/DOMStorage';
import Debug from './../core/Debug';
import Errors from './../core/errors/Errors';
import EventBus from './../core/EventBus';
import Events from './../core/events/Events';
import MediaPlayerEvents from './MediaPlayerEvents';
import FactoryMaker from '../core/FactoryMaker';
import Settings from '../core/Settings';
import {
    getVersionString
}
    from '../core/Version';

//Dash
import SegmentBaseController from '../dash/controllers/SegmentBaseController';
import DashAdapter from '../dash/DashAdapter';
import DashMetrics from '../dash/DashMetrics';
import TimelineConverter from '../dash/utils/TimelineConverter';
import {
    HTTPRequest
} from './vo/metrics/HTTPRequest';
import BASE64 from '../../externals/base64';
import ISOBoxer from 'codem-isoboxer';
import DashJSError from './vo/DashJSError';
import {checkParameterType} from './utils/SupervisorTools';
import ManifestUpdater from './ManifestUpdater';
import URLUtils from '../streaming/utils/URLUtils';
import BoxParser from './utils/BoxParser';
import TextController from './text/TextController';

/**
 * The media types
 * @typedef {("video" | "audio" | "text" | "image")} MediaType
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
        abrController,
        schemeLoaderFactory,
        timelineConverter,
        mediaController,
        protectionController,
        metricsReportingController,
        mssHandler,
        offlineController,
        adapter,
        mediaPlayerModel,
        errHandler,
        baseURLController,
        capabilities,
        capabilitiesFilter,
        streamController,
        textController,
        gapController,
        playbackController,
        dashMetrics,
        manifestModel,
        cmcdModel,
        videoModel,
        uriFragmentModel,
        domStorage,
        segmentBaseController,
        licenseRequestFilters,
        licenseResponseFilters,
        customCapabilitiesFilters;

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
        protectionController = null;
        offlineController = null;
        protectionData = null;
        adapter = null;
        segmentBaseController = null;
        Events.extend(MediaPlayerEvents);
        mediaPlayerModel = MediaPlayerModel(context).getInstance();
        videoModel = VideoModel(context).getInstance();
        uriFragmentModel = URIFragmentModel(context).getInstance();
        licenseRequestFilters = [];
        licenseResponseFilters = [];
        customCapabilitiesFilters = [];
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
        if (config.playbackController) {
            playbackController = config.playbackController;
        }
        if (config.mediaPlayerModel) {
            mediaPlayerModel = config.mediaPlayerModel;
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
     * @param {boolean=} AutoPlay - Optional arg to set auto play. {@link module:MediaPlayer#setAutoPlay setAutoPlay()}
     * @see {@link module:MediaPlayer#attachView attachView()}
     * @see {@link module:MediaPlayer#attachSource attachSource()}
     * @see {@link module:MediaPlayer#setAutoPlay setAutoPlay()}
     * @memberof module:MediaPlayer
     * @instance
     */
    function initialize(view, source, AutoPlay) {
        if (!capabilities) {
            capabilities = Capabilities(context).getInstance();
            capabilities.setConfig({
                settings
            })
        }

        errHandler = ErrorHandler(context).getInstance();

        if (!capabilities.supportsMediaSource()) {
            errHandler.error(new DashJSError(Errors.CAPABILITY_MEDIASOURCE_ERROR_CODE, Errors.CAPABILITY_MEDIASOURCE_ERROR_MESSAGE));
            return;
        }

        if (mediaPlayerInitialized) return;
        mediaPlayerInitialized = true;

        // init some controllers and models
        timelineConverter = TimelineConverter(context).getInstance();
        if (!abrController) {
            abrController = AbrController(context).getInstance();
            abrController.setConfig({
                settings: settings
            });
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

        if (!capabilitiesFilter) {
            capabilitiesFilter = CapabilitiesFilter(context).getInstance();
        }

        adapter = DashAdapter(context).getInstance();

        manifestModel = ManifestModel(context).getInstance();

        cmcdModel = CmcdModel(context).getInstance();

        dashMetrics = DashMetrics(context).getInstance({
            settings: settings
        });

        domStorage = DOMStorage(context).getInstance({
            settings: settings
        });

        adapter.setConfig({
            constants: Constants,
            cea608parser: cea608parser,
            errHandler: errHandler,
            BASE64: BASE64
        });

        if (!baseURLController) {
            baseURLController = BaseURLController(context).create();
        }

        baseURLController.setConfig({
            adapter: adapter
        });


        segmentBaseController = SegmentBaseController(context).getInstance({
            dashMetrics: dashMetrics,
            mediaPlayerModel: mediaPlayerModel,
            errHandler: errHandler,
            baseURLController: baseURLController,
            events: Events,
            eventBus: eventBus,
            debug: debug,
            boxParser: BoxParser(context).getInstance(),
            requestModifier: RequestModifier(context).getInstance(),
            errors: Errors
        });

        segmentBaseController.initialize();

        // configure controllers
        mediaController.setConfig({
            domStorage: domStorage,
            settings: settings
        });

        restoreDefaultUTCTimingSources();
        setAutoPlay(AutoPlay !== undefined ? AutoPlay : true);

        // Detect and initialize offline module to support offline contents playback
        _detectOffline();

        if (view) {
            attachView(view);
        }

        if (source) {
            attachSource(source);
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

        segmentBaseController.reset();

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
        licenseRequestFilters = [];
        licenseResponseFilters = [];
        customCapabilitiesFilters = [];
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
            playbackController.play();
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
     * @param {number} value - A relative time, in seconds, based on the return value of the {@link module:MediaPlayer#duration duration()} method is expected
     * @see {@link module:MediaPlayer#getDVRSeekOffset getDVRSeekOffset()}
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

        let s = playbackController.getIsDynamic() ? getDVRSeekOffset(value) : value;
        playbackController.seek(s);
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
     * The timeShiftBufferLength (DVR Window), in seconds.
     *
     * @returns {number} The window of allowable play time behind the live point of a live stream as defined in the manifest.
     * @memberof module:MediaPlayer
     * @instance
     */
    function getDVRWindowSize() {
        const type = streamController && streamController.hasVideoTrack() ? Constants.VIDEO : Constants.AUDIO;
        let metric = dashMetrics.getCurrentDVRInfo(type);
        if (!metric) {
            return 0;
        }
        return metric.manifestInfo.DVRWindowSize;
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
    function getDVRSeekOffset(value) {
        const type = streamController && streamController.hasVideoTrack() ? Constants.VIDEO : Constants.AUDIO;
        let metric = dashMetrics.getCurrentDVRInfo(type);
        if (!metric) {
            return 0;
        }

        let liveDelay = playbackController.getLiveDelay();

        let val = metric.range.start + value;

        if (val > (metric.range.end - liveDelay)) {
            val = metric.range.end - liveDelay;
        }

        return val;
    }

    /**
     * Current time of the playhead, in seconds.
     *
     * If called with no arguments then the returned time value is time elapsed since the start point of the first stream, or if it is a live stream, then the time will be based on the return value of the {@link module:MediaPlayer#duration duration()} method.
     * However if a stream ID is supplied then time is relative to the start of that stream, or is null if there is no such stream id in the manifest.
     *
     * @param {string} streamId - The ID of a stream that the returned playhead time must be relative to the start of. If undefined, then playhead time is relative to the first stream.
     * @returns {number} The current playhead time of the media, or null.
     * @throws {@link module:MediaPlayer~PLAYBACK_NOT_INITIALIZED_ERROR PLAYBACK_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @memberof module:MediaPlayer
     * @instance
     */
    function time(streamId) {
        if (!playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }
        let t = getVideoElement().currentTime;

        if (streamId !== undefined) {
            t = streamController.getTimeRelativeToStreamId(t, streamId);
        } else if (playbackController.getIsDynamic()) {
            const type = streamController && streamController.hasVideoTrack() ? Constants.VIDEO : Constants.AUDIO;
            let metric = dashMetrics.getCurrentDVRInfo(type);
            t = (metric === null || t === 0) ? 0 : Math.max(0, (t - metric.range.start));
        }

        return t;
    }

    /**
     * Duration of the media's playback, in seconds.
     *
     * @returns {number} The current duration of the media. For a dynamic stream this will return DVRWindow.end - DVRWindow.start
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
     * Use this method to get the current playhead time as an absolute value, the time in seconds since midnight UTC, Jan 1 1970.
     * Note - this property only has meaning for live streams. If called before play() has begun, it will return a value of NaN.
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
        if (time() < 0) {
            return NaN;
        }
        return _getAsUTC(time());
    }

    /**
     * Use this method to get the current duration as an absolute value, the time in seconds since midnight UTC, Jan 1 1970.
     * Note - this property only has meaning for live streams.
     *
     * @returns {number} The current duration as UTC timestamp.
     * @throws {@link module:MediaPlayer~PLAYBACK_NOT_INITIALIZED_ERROR PLAYBACK_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @memberof module:MediaPlayer
     * @instance
     */
    function durationAsUTC() {
        if (!playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }
        return _getAsUTC(duration());
    }

    /*
    ---------------------------------------------------------------------------

        AUTO BITRATE

    ---------------------------------------------------------------------------
    */
    /**
     * Gets the top quality BitrateInfo checking portal limit and max allowed.
     * It calls getMaxAllowedIndexFor internally
     *
     * @param {MediaType} type - 'video' or 'audio'
     * @memberof module:MediaPlayer
     * @returns {BitrateInfo | null}
     * @throws {@link module:MediaPlayer~STREAMING_NOT_INITIALIZED_ERROR STREAMING_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @instance
     */
    function getTopBitrateInfoFor(type) {
        if (!streamingInitialized) {
            throw STREAMING_NOT_INITIALIZED_ERROR;
        }
        return abrController.getTopBitrateInfoFor(type);
    }

    /**
     * Gets the current download quality for media type video, audio or images. For video and audio types the ABR
     * rules update this value before every new download unless setAutoSwitchQualityFor(type, false) is called. For 'image'
     * type, thumbnails, there is no ABR algorithm and quality is set manually.
     *
     * @param {MediaType} type - 'video', 'audio' or 'image' (thumbnails)
     * @returns {number} the quality index, 0 corresponding to the lowest bitrate
     * @memberof module:MediaPlayer
     * @see {@link module:MediaPlayer#setAutoSwitchQualityFor setAutoSwitchQualityFor()}
     * @see {@link module:MediaPlayer#setQualityFor setQualityFor()}
     * @throws {@link module:MediaPlayer~STREAMING_NOT_INITIALIZED_ERROR STREAMING_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @instance
     */
    function getQualityFor(type) {
        if (!streamingInitialized) {
            throw STREAMING_NOT_INITIALIZED_ERROR;
        }
        if (type === Constants.IMAGE) {
            const activeStream = getActiveStream();
            if (!activeStream) {
                return -1;
            }
            const thumbnailController = activeStream.getThumbnailController();

            return !thumbnailController ? -1 : thumbnailController.getCurrentTrackIndex();
        }
        return abrController.getQualityFor(type);
    }

    /**
     * Sets the current quality for media type instead of letting the ABR Heuristics automatically selecting it.
     * This value will be overwritten by the ABR rules unless setAutoSwitchQualityFor(type, false) is called.
     *
     * @param {MediaType} type - 'video', 'audio' or 'image'
     * @param {number} value - the quality index, 0 corresponding to the lowest bitrate
     * @param {boolean} forceReplace - true if segments have to be replaced by segments of the new quality
     * @memberof module:MediaPlayer
     * @see {@link module:MediaPlayer#setAutoSwitchQualityFor setAutoSwitchQualityFor()}
     * @see {@link module:MediaPlayer#getQualityFor getQualityFor()}
     * @throws {@link module:MediaPlayer~STREAMING_NOT_INITIALIZED_ERROR STREAMING_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @instance
     */
    function setQualityFor(type, value, forceReplace = false) {
        if (!streamingInitialized) {
            throw STREAMING_NOT_INITIALIZED_ERROR;
        }
        if (type === Constants.IMAGE) {
            const activeStream = getActiveStream();
            if (!activeStream) {
                return;
            }
            const thumbnailController = activeStream.getThumbnailController();
            if (thumbnailController) {
                thumbnailController.setTrackByIndex(value);
            }
        }
        abrController.setPlaybackQuality(type, streamController.getActiveStreamInfo(), value, { forceReplace });
    }

    /**
     * Update the video element size variables
     * Should be called on window resize (or any other time player is resized). Fullscreen does trigger a window resize event.
     *
     * Once windowResizeEventCalled = true, abrController.checkPortalSize() will use element size variables rather than querying clientWidth every time.
     *
     * @memberof module:MediaPlayer
     * @instance
     */
    function updatePortalSize() {
        abrController.setElementSize();
        abrController.setWindowResizeEventCalled(true);
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
        mediaPlayerModel.addABRCustomRule(type, rulename, rule);
    }

    /**
     * Remove a custom ABR Rule
     *
     * @param {string} rulename - name of the rule to be removed
     * @memberof module:MediaPlayer
     * @instance
     */
    function removeABRCustomRule(rulename) {
        mediaPlayerModel.removeABRCustomRule(rulename);
    }

    /**
     * Remove all custom rules
     * @memberof module:MediaPlayer
     * @instance
     */
    function removeAllABRCustomRule() {
        mediaPlayerModel.removeABRCustomRule();
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
        mediaPlayerModel.addUTCTimingSource(schemeIdUri, value);
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
        mediaPlayerModel.removeUTCTimingSource(schemeIdUri, value);
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
        mediaPlayerModel.clearDefaultUTCTimingSources();
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
        mediaPlayerModel.restoreDefaultUTCTimingSources();
    }

    /**
     * Returns the average throughput computed in the ABR logic
     *
     * @param {MediaType} type
     * @return {number} value
     * @memberof module:MediaPlayer
     * @instance
     */
    function getAverageThroughput(type) {
        const throughputHistory = abrController.getThroughputHistory();
        return throughputHistory ? throughputHistory.getAverageThroughput(type) : 0;
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
        mediaPlayerModel.setXHRWithCredentialsForType(type, value);
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
        return mediaPlayerModel.getXHRWithCredentialsForType(type);
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

        return textController.enableForcedTextStreaming(activeStreamInfo.id, enable);
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
                streamController.switchToVideoElement();
            }
        }

        if (playbackInitialized) { //Reset if we have been playing before, so this is a new element.
            _resetPlaybackControllers();
        }

        _initializePlayback();
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

    /*
    ---------------------------------------------------------------------------

        STREAM AND TRACK MANAGEMENT

    ---------------------------------------------------------------------------
    */
    /**
     * @param {MediaType} type
     * @returns {Array}
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~STREAMING_NOT_INITIALIZED_ERROR STREAMING_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @instance
     */
    function getBitrateInfoListFor(type) {
        if (!streamingInitialized) {
            throw STREAMING_NOT_INITIALIZED_ERROR;
        }
        let stream = getActiveStream();
        return stream ? stream.getBitrateListFor(type) : [];
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

        return mediaController.getTracksFor(type, streamInfo.id);
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
        return mediaController.getCurrentTrackFor(type, streamInfo.id);
    }

    /**
     * This method allows to set media settings that will be used to pick the initial track. Format of the settings
     * is following: <br />
     * {lang: langValue (can be either a string or a regex to match),
     *  index: indexValue,
     *  viewpoint: viewpointValue,
     *  audioChannelConfiguration: audioChannelConfigurationValue,
     *  accessibility: accessibilityValue,
     *  role: roleValue}
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
        mediaController.setInitialSettings(type, value);
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
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~STREAMING_NOT_INITIALIZED_ERROR STREAMING_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @instance
     */
    function setCurrentTrack(track) {
        if (!streamingInitialized) {
            throw STREAMING_NOT_INITIALIZED_ERROR;
        }
        mediaController.setTrack(track);
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

    /**
     * Registers a license request filter. This enables application to manipulate/overwrite any request parameter and/or request data.
     * The provided callback function shall return a promise that shall be resolved once the filter process is completed.
     * The filters are applied in the order they are registered.
     * @param {function} filter - the license request filter callback
     * @memberof module:MediaPlayer
     * @instance
     */
    function registerLicenseRequestFilter(filter) {
        licenseRequestFilters.push(filter);
        if (protectionController) {
            protectionController.setLicenseRequestFilters(licenseRequestFilters);
        }
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
        licenseResponseFilters.push(filter);
        if (protectionController) {
            protectionController.setLicenseResponseFilters(licenseResponseFilters);
        }
    }

    /**
     * Unregisters a license request filter.
     * @param {function} filter - the license request filter callback
     * @memberof module:MediaPlayer
     * @instance
     */
    function unregisterLicenseRequestFilter(filter) {
        unregisterFilter(licenseRequestFilters, filter);
        if (protectionController) {
            protectionController.setLicenseRequestFilters(licenseRequestFilters);
        }
    }

    /**
     * Unregisters a license response filter.
     * @param {function} filter - the license response filter callback
     * @memberof module:MediaPlayer
     * @instance
     */
    function unregisterLicenseResponseFilter(filter) {
        unregisterFilter(licenseResponseFilters, filter);
        if (protectionController) {
            protectionController.setLicenseResponseFilters(licenseResponseFilters);
        }
    }

    /**
     * Registers a custom capabilities filter. This enables application to filter representations to use.
     * The provided callback function shall return a boolean based on whether or not to use the representation.
     * The filters are applied in the order they are registered.
     * @param {function} filter - the custom capabilities filter callback
     * @memberof module:MediaPlayer
     * @instance
     */
    function registerCustomCapabilitiesFilter(filter) {
        customCapabilitiesFilters.push(filter);
        if (capabilitiesFilter) {
            capabilitiesFilter.setCustomCapabilitiesFilters(customCapabilitiesFilters);
        }
    }

    /**
     * Unregisters a custom capabilities filter.
     * @param {function} filter - the custom capabilities filter callback
     * @memberof module:MediaPlayer
     * @instance
     */
    function unregisterCustomCapabilitiesFilter(filter) {
        unregisterFilter(customCapabilitiesFilters, filter);
        if (capabilitiesFilter) {
            capabilitiesFilter.setCustomCapabilitiesFilters(customCapabilitiesFilters);
        }
    }

    function unregisterFilter(filters, filter) {
        let index = -1;
        filters.some((item, i) => {
            if (item === filter) {
                index = i;
                return true;
            }
        });
        if (index < 0) return;
        filters.splice(index, 1);
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
        const s = playbackController.getIsDynamic() ? getDVRSeekOffset(time) : time;
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

        const timeInPeriod = streamController.getTimeRelativeToStreamId(s, stream.getId());
        return thumbnailController.provide(timeInPeriod, callback);
    }

    /*
    ---------------------------------------------------------------------------

        TOOLS AND OTHERS FUNCTIONS

    ---------------------------------------------------------------------------
    */
    /**
     * Allows application to retrieve a manifest.  Manifest loading is asynchro
     * nous and
     * requires the app-provided callback function
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
     * Use this method to set a source URL to a valid MPD manifest file OR
     * a previously downloaded and parsed manifest object.  Optionally, can
     * also provide protection information
     *
     * @param {string|Object} urlOrManifest - A URL to a valid MPD manifest file, or a
     * parsed manifest object.
     *
     *
     * @throws {@link module:MediaPlayer~MEDIA_PLAYER_NOT_INITIALIZED_ERROR MEDIA_PLAYER_NOT_INITIALIZED_ERROR} if called before initialize function
     *
     * @memberof module:MediaPlayer
     * @instance
     */
    function attachSource(urlOrManifest) {
        if (!mediaPlayerInitialized) {
            throw MEDIA_PLAYER_NOT_INITIALIZED_ERROR;
        }

        if (typeof urlOrManifest === 'string') {
            uriFragmentModel.initialize(urlOrManifest);
        }

        source = urlOrManifest;

        if (streamingInitialized || playbackInitialized) {
            _resetPlaybackControllers();
        }

        if (isReady()) {
            _initializePlayback();
        }
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

    //***********************************
    // PRIVATE METHODS
    //***********************************

    function _resetPlaybackControllers() {
        playbackInitialized = false;
        streamingInitialized = false;
        adapter.reset();
        streamController.reset();
        gapController.reset();
        playbackController.reset();
        abrController.reset();
        mediaController.reset();
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
                videoModel,
                settings
            });
        }

        capabilitiesFilter.setConfig({
            capabilities,
            adapter,
            settings,
            manifestModel,
            errHandler
        });
        capabilitiesFilter.setCustomCapabilitiesFilters(customCapabilitiesFilters);

        streamController.setConfig({
            capabilities,
            capabilitiesFilter,
            manifestLoader,
            manifestModel,
            mediaPlayerModel,
            protectionController,
            textController,
            adapter,
            dashMetrics,
            errHandler,
            timelineConverter,
            videoModel,
            playbackController,
            abrController,
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
            dashMetrics,
            mediaPlayerModel,
            adapter,
            videoModel,
            timelineConverter,
            settings
        });

        abrController.setConfig({
            streamController,
            domStorage,
            mediaPlayerModel,
            dashMetrics,
            adapter,
            videoModel,
            settings
        });

        cmcdModel.setConfig({
            abrController,
            dashMetrics,
            playbackController
        });

        // initialises controller
        abrController.initialize();
        streamController.initialize(autoPlay, protectionData);
        textController.initialize();
        gapController.initialize();
        cmcdModel.initialize();
    }

    function _createManifestLoader() {
        return ManifestLoader(context).create({
            debug: debug,
            errHandler: errHandler,
            dashMetrics: dashMetrics,
            mediaPlayerModel: mediaPlayerModel,
            requestModifier: RequestModifier(context).getInstance(),
            mssHandler: mssHandler,
            settings: settings
        });
    }

    function _detectProtection() {
        if (protectionController) {
            return protectionController;
        }
        // do not require Protection as dependencies as this is optional and intended to be loaded separately
        let Protection = dashjs.Protection; /* jshint ignore:line */
        if (typeof Protection === 'function') { //TODO need a better way to register/detect plugin components
            let protection = Protection(context).create();
            Events.extend(Protection.events);
            MediaPlayerEvents.extend(Protection.events, {
                publicOnly: true
            });
            Errors.extend(Protection.errors);
            if (!capabilities) {
                capabilities = Capabilities(context).getInstance();
            }
            protectionController = protection.createProtectionSystem({
                debug: debug,
                errHandler: errHandler,
                videoModel: videoModel,
                capabilities: capabilities,
                eventBus: eventBus,
                events: Events,
                BASE64: BASE64,
                constants: Constants,
                cmcdModel: cmcdModel,
                settings: settings
            });
            if (protectionController) {
                protectionController.setLicenseRequestFilters(licenseRequestFilters);
                protectionController.setLicenseResponseFilters(licenseResponseFilters);
            }
            return protectionController;
        }

        return null;
    }

    function _detectMetricsReporting() {
        if (metricsReportingController) {
            return;
        }
        // do not require MetricsReporting as dependencies as this is optional and intended to be loaded separately
        let MetricsReporting = dashjs.MetricsReporting; /* jshint ignore:line */
        if (typeof MetricsReporting === 'function') { //TODO need a better way to register/detect plugin components
            let metricsReporting = MetricsReporting(context).create();

            metricsReportingController = metricsReporting.createMetricsReporting({
                debug: debug,
                eventBus: eventBus,
                mediaElement: getVideoElement(),
                adapter: adapter,
                dashMetrics: dashMetrics,
                events: Events,
                constants: Constants,
                metricsConstants: MetricsConstants
            });
        }
    }

    function _detectMss() {
        if (mssHandler) {
            return;
        }
        // do not require MssHandler as dependencies as this is optional and intended to be loaded separately
        let MssHandler = dashjs.MssHandler; /* jshint ignore:line */
        if (typeof MssHandler === 'function') { //TODO need a better way to register/detect plugin components
            Errors.extend(MssHandler.errors);
            mssHandler = MssHandler(context).create({
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

        // do not require Offline as dependencies as this is optional and intended to be loaded separately
        let OfflineController = dashjs.OfflineController; /* jshint ignore:line */

        if (typeof OfflineController === 'function') { //TODO need a better way to register/detect plugin components
            Events.extend(OfflineController.events);
            MediaPlayerEvents.extend(OfflineController.events, {
                publicOnly: true
            });
            Errors.extend(OfflineController.errors);

            const manifestLoader = _createManifestLoader();
            const manifestUpdater = ManifestUpdater(context).create();

            manifestUpdater.setConfig({
                manifestModel: manifestModel,
                adapter: adapter,
                manifestLoader: manifestLoader,
                errHandler: errHandler
            });

            offlineController = OfflineController(context).create({
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

    function _getAsUTC(valToConvert) {
        const type = streamController && streamController.hasVideoTrack() ? Constants.VIDEO : Constants.AUDIO;
        let metric = dashMetrics.getCurrentDVRInfo(type);
        let availableFrom,
            utcValue;

        if (!metric) {
            return 0;
        }
        availableFrom = metric.manifestInfo.availableFrom.getTime() / 1000;
        utcValue = valToConvert + (availableFrom + metric.range.start);
        return utcValue;
    }

    function _initializePlayback() {

        if (offlineController) {
            offlineController.resetRecords();
        }

        if (!streamingInitialized && source) {
            streamingInitialized = true;
            logger.info('Streaming Initialized');
            _createPlaybackControllers();

            if (typeof source === 'string') {
                streamController.load(source);
            } else {
                streamController.loadWithManifest(source);
            }
        }

        if (!playbackInitialized && isReady()) {
            playbackInitialized = true;
            logger.info('Playback Initialized');
        }
    }

    instance = {
        initialize,
        setConfig,
        on,
        off,
        extend,
        attachView,
        attachSource,
        isReady,
        play,
        isPaused,
        pause,
        isSeeking,
        isDynamic,
        seek,
        setPlaybackRate,
        getPlaybackRate,
        setMute,
        isMuted,
        setVolume,
        getVolume,
        time,
        duration,
        timeAsUTC,
        durationAsUTC,
        getActiveStream,
        getDVRWindowSize,
        getDVRSeekOffset,
        convertToTimeCode,
        formatUTC,
        getVersion,
        getDebug,
        getBufferLength,
        getTTMLRenderingDiv,
        getVideoElement,
        getSource,
        getCurrentLiveLatency,
        getTopBitrateInfoFor,
        setAutoPlay,
        getAutoPlay,
        getDashMetrics,
        getQualityFor,
        setQualityFor,
        updatePortalSize,
        enableText,
        enableForcedTextStreaming,
        isTextEnabled,
        setTextTrack,
        getBitrateInfoListFor,
        getStreamsFromManifest,
        getTracksFor,
        getTracksForTypeFromManifest,
        getCurrentTrackFor,
        setInitialMediaSettingsFor,
        getInitialMediaSettingsFor,
        setCurrentTrack,
        addABRCustomRule,
        removeABRCustomRule,
        removeAllABRCustomRule,
        getAverageThroughput,
        retrieveManifest,
        addUTCTimingSource,
        removeUTCTimingSource,
        clearDefaultUTCTimingSources,
        restoreDefaultUTCTimingSources,
        setXHRWithCredentialsForType,
        getXHRWithCredentialsForType,
        getProtectionController,
        attachProtectionController,
        setProtectionData,
        registerLicenseRequestFilter,
        registerLicenseResponseFilter,
        unregisterLicenseRequestFilter,
        unregisterLicenseResponseFilter,
        registerCustomCapabilitiesFilter,
        unregisterCustomCapabilitiesFilter,
        attachTTMLRenderingDiv,
        getCurrentTextTrackIndex,
        provideThumbnail,
        getDashAdapter,
        getOfflineController,
        getSettings,
        updateSettings,
        resetSettings,
        reset,
        destroy
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
