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
import Events from '../../core/events/Events.js';
import EventBus from '../../core/EventBus.js';
import FactoryMaker from '../../core/FactoryMaker.js';
import MediaPlayerEvents from '../MediaPlayerEvents.js';
import {
    ELEMENT_NOT_ATTACHED_ERROR,
    MEDIA_PLAYER_NOT_INITIALIZED_ERROR,
    SOURCE_NOT_ATTACHED_ERROR
} from './MediaPlayerApiErrors.js';

function LifecycleApi() {
    const context = this.context;
    const eventBus = EventBus(context).getInstance();
    let instance,
        state,
        mediaPlayer,
        wiring,
        retrieveManifestRequest;

    function setConfig(config) {
        if (!config) {
            return;
        }
        if (config.state) {
            state = config.state;
        }
        if (config.mediaPlayer) {
            mediaPlayer = config.mediaPlayer;
        }
        if (config.wiring) {
            wiring = config.wiring;
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
        if (!wiring.supportsMediaSource()) {
            return;
        }
        if (!state.mediaPlayerInitialized) {
            state.mediaPlayerInitialized = true;

            wiring.createCoreControllers();
            state.customParametersModel.restoreDefaultUTCTimingSources();
            mediaPlayer.setAutoPlay(autoPlay !== undefined ? autoPlay : true);

            // Detect and initialize offline module to support offline contents playback
            wiring.detectOffline();
        }

        if (view) {
            attachView(view);
        }

        if (source) {
            attachSource(source, startTime);
        }

        state.logger.info('[dash.js ' + mediaPlayer.getVersion() + '] ' + 'MediaPlayer has been initialized');
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
        state.protectionData = null;
        if (state.protectionController) {
            state.protectionController.reset();
            state.protectionController = null;
        }
        if (state.customParametersModel) {
            state.customParametersModel.reset();
        }

        state.settings.reset();

        wiring.reset();

        if (retrieveManifestRequest) {
            retrieveManifestRequest.resetLoader();
            retrieveManifestRequest = null;
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

        if (state.videoModel) {
            state.videoModel.destroy();
            state.videoModel = null;
        }

        if (state.adapter) {
            state.adapter.destroy();
        }

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
        return (!!state.source && !!state.videoModel.getElement());
    }

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
        if (state.videoModel.getElement() || state.streamingInitialized) {
            return;
        }
        if (state.source) {
            _initializePlayback(state.providedStartTime);
        } else {
            throw SOURCE_NOT_ATTACHED_ERROR;
        }
    }

    /**
     * Returns instance of Video Element that was attached by calling attachView()
     * @returns {Object}
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~ELEMENT_NOT_ATTACHED_ERROR ELEMENT_NOT_ATTACHED_ERROR} if called before attachView function
     * @instance
     */
    function getVideoElement() {
        if (!state.videoModel.getElement()) {
            throw ELEMENT_NOT_ATTACHED_ERROR;
        }
        return state.videoModel.getElement();
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
        if (!state.mediaPlayerInitialized) {
            throw MEDIA_PLAYER_NOT_INITIALIZED_ERROR;
        }

        state.videoModel.setElement(element);

        if (element) {
            wiring.detectProtection();
            wiring.detectMetricsReporting();
            wiring.detectMss();

            if (state.streamController) {
                state.streamController.switchToVideoElement(state.providedStartTime);
            }
        }

        if (state.playbackInitialized) { //Reset if we have been playing before, so this is a new element.
            wiring.resetPlaybackControllers();
            state.customParametersModel.resetPlaybackSessionSpecificSettings();
        }

        _initializePlayback(state.providedStartTime);
    }

    /**
     * Detects if Protection is included and returns an instance of ProtectionController.js
     * @memberof module:MediaPlayer
     * @instance
     */
    function getProtectionController() {
        return wiring.detectProtection();
    }

    /**
     * Will override dash.js protection controller.
     * @param {ProtectionController} value - valid protection controller instance.
     * @memberof module:MediaPlayer
     * @instance
     */
    function attachProtectionController(value) {
        state.protectionController = value;
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
        state.protectionData = value;

        // Propagate changes in case StreamController is already created
        if (state.streamController) {
            state.streamController.setProtectionData(state.protectionData);
        }
    }

    function getProtectionData() {
        return state.streamController ? state.streamController.getProtectionData() : null;
    }

    /**
     * Allows application to retrieve a manifest.  Manifest loading is asynchronous and requires the app-provided callback function
     *
     * @param {string} url - url the manifest url
     * @param {function} callback - A Callback function provided when retrieving manifests
     * @memberof module:MediaPlayer
     * @instance
     */
    function retrieveManifest(url, callback) {
        if (retrieveManifestRequest) {
            retrieveManifestRequest.resetLoader();
        }

        const manifestLoader = wiring.createManifestLoader();
        const resetLoader = () => {
            eventBus.off(Events.INTERNAL_MANIFEST_LOADED, handler, this);
            manifestLoader.reset();
            retrieveManifestRequest = null;
        };

        retrieveManifestRequest = { manifestLoader, resetLoader };

        const handler = (e) => {
            if (typeof callback == 'function') {
                if (!e.error) {
                    callback(e.manifest);
                } else {
                    callback(null, e.error);
                }
            }

            resetLoader();
        };

        eventBus.on(Events.INTERNAL_MANIFEST_LOADED, handler, this);

        state.uriFragmentModel.initialize(url);
        manifestLoader.load(url);
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
        if (!state.mediaPlayerInitialized) {
            throw MEDIA_PLAYER_NOT_INITIALIZED_ERROR;
        }

        if (typeof urlOrManifest === 'string') {
            state.uriFragmentModel.initialize(urlOrManifest);
        }

        if (startTime == null) {
            startTime = NaN;
        }

        if (!isNaN(startTime)) {
            startTime = Math.max(0, startTime);
        }

        state.providedStartTime = startTime;
        state.source = urlOrManifest;

        if (state.streamingInitialized || state.playbackInitialized) {
            wiring.resetPlaybackControllers();
            state.customParametersModel.resetPlaybackSessionSpecificSettings()
        }

        if (isReady()) {
            _initializePlayback(state.providedStartTime);
        }
    }

    function _initializePlayback(startTime = NaN) {

        if (state.offlineController) {
            state.offlineController.resetRecords();
        }

        if (!state.streamingInitialized && state.source) {
            state.streamingInitialized = true;
            state.logger.info('Streaming Initialized');
            wiring.createPlaybackControllers();

            if (typeof state.source === 'string') {
                state.streamController.load(state.source, startTime);
            } else {
                state.streamController.loadWithManifest(state.source, startTime);
            }
        }

        if (!state.playbackInitialized && isReady()) {
            state.playbackInitialized = true;
            eventBus.trigger(MediaPlayerEvents.PLAYBACK_INITIALIZED)
            state.logger.info('Playback Initialized');
        }
    }

    instance = {
        attachProtectionController,
        attachSource,
        attachView,
        destroy,
        getProtectionController,
        getProtectionData,
        getVideoElement,
        initialize,
        isReady,
        preload,
        reset,
        retrieveManifest,
        setConfig,
        setProtectionData,
    };

    return instance;
}

LifecycleApi.__dashjs_factory_name = 'LifecycleApi';
export default FactoryMaker.getClassFactory(LifecycleApi);
