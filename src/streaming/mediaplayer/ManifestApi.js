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
import EventBus from '../../core/EventBus.js';
import Events from '../../core/events/Events.js';
import FactoryMaker from '../../core/FactoryMaker.js';
import {
    MEDIA_PLAYER_NOT_INITIALIZED_ERROR,
    SOURCE_NOT_ATTACHED_ERROR,
    STREAMING_NOT_INITIALIZED_ERROR
} from './MediaPlayerApiErrors.js';

function ManifestApi() {
    const context = this.context;
    const eventBus = EventBus(context).getInstance();
    let instance,
        state,
        mediaPlayer;

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
        if (!state.streamingInitialized) {
            throw STREAMING_NOT_INITIALIZED_ERROR;
        }
        return state.adapter.getStreamsInfo(manifest);
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
        if (!state.streamingInitialized) {
            throw STREAMING_NOT_INITIALIZED_ERROR;
        }

        streamInfo = streamInfo || state.adapter.getStreamsInfo(manifest, 1)[0];

        return streamInfo ? state.adapter.getAllMediaInfoForType(streamInfo, type, manifest) : [];
    }

    /**
     * Returns the source string or manifest that was attached by calling attachSource()
     * @returns {string | manifest}
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~SOURCE_NOT_ATTACHED_ERROR SOURCE_NOT_ATTACHED_ERROR} if called before attachSource function
     * @instance
     */
    function getSource() {
        if (!state.source) {
            throw SOURCE_NOT_ATTACHED_ERROR;
        }
        return state.source;
    }

    /**
     * Sets the source to a new manifest URL or object without reloading
     * Useful for updating CDN tokens
     * @param {string | object} urlOrManifest
     */
    function updateSource(urlOrManifest) {
        state.source = urlOrManifest
        state.streamController.load(state.source);
    }

    /**
     *  Reload the manifest that the player is currently using.
     *
     *  @memberof module:MediaPlayer
     *  @param {function} callback - A Callback function provided when retrieving manifests
     *  @instance
     */
    function refreshManifest(callback) {
        if (!state.mediaPlayerInitialized) {
            throw MEDIA_PLAYER_NOT_INITIALIZED_ERROR;
        }

        if (!mediaPlayer.isReady()) {
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

        state.streamController.refreshManifest();
    }

    /**
     * This method returns the active stream
     *
     * @throws {@link module:MediaPlayer~STREAMING_NOT_INITIALIZED_ERROR STREAMING_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @memberof module:MediaPlayer
     * @instance
     */
    function getActiveStream() {
        if (!state.streamingInitialized) {
            throw STREAMING_NOT_INITIALIZED_ERROR;
        }
        let streamInfo = state.streamController.getActiveStreamInfo();
        return streamInfo ? state.streamController.getStreamById(streamInfo.id) : null;
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
        return state.adapter;
    }

    /**
     * Triggers a request to the content steering server to update the steering information.
     * @return {Promise<any>}
     */
    function triggerSteeringRequest() {
        if (state.contentSteeringController) {
            return state.contentSteeringController.loadSteeringData();
        }
    }

    /**
     * Returns the current response data of the content steering server
     * @return {object}
     */
    function getCurrentSteeringResponseData() {
        if (state.contentSteeringController) {
            return state.contentSteeringController.getCurrentSteeringResponseData();
        }
    }

    /**
     * Returns the current manifest
     * @returns {object}
     */
    function getManifest() {
        return state.manifestModel.getValue();
    }

    /**
     * Returns all BaseURLs that are available including synthesized elements (e.g by content steering)
     * @returns {BaseURL[]}
     */
    function getAvailableBaseUrls() {
        const manifest = state.manifestModel.getValue();

        if (!manifest) {
            return [];
        }

        return state.baseURLController.getBaseUrls(manifest);
    }

    /**
     * Returns the available location elements including synthesized elements (e.g by content steering)
     * @returns {MpdLocation[]}
     */
    function getAvailableLocations() {
        const manifest = state.manifestModel.getValue();

        if (!manifest) {
            return [];
        }

        const manifestLocations = state.adapter.getLocation(manifest);
        const synthesizedElements = state.contentSteeringController.getSynthesizedLocationElements(manifestLocations);

        return manifestLocations.concat(synthesizedElements);
    }

    instance = {
        getActiveStream,
        getAvailableBaseUrls,
        getAvailableLocations,
        getCurrentSteeringResponseData,
        getDashAdapter,
        getManifest,
        getSource,
        getStreamsFromManifest,
        getTracksForTypeFromManifest,
        refreshManifest,
        setConfig,
        triggerSteeringRequest,
        updateSource,
    };

    return instance;
}

ManifestApi.__dashjs_factory_name = 'ManifestApi';
export default FactoryMaker.getClassFactory(ManifestApi);
