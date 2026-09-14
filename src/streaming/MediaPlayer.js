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
import Debug from './../core/Debug.js';
import Errors from './../core/errors/Errors.js';
import FactoryMaker from '../core/FactoryMaker.js';
import MediaPlayerEvents from './MediaPlayerEvents.js';
import Settings from '../core/Settings.js';
import CoreApi from './mediaplayer/CoreApi.js';
import CustomParametersApi from './mediaplayer/CustomParametersApi.js';
import LifecycleApi from './mediaplayer/LifecycleApi.js';
import ManifestApi from './mediaplayer/ManifestApi.js';
import MediaPlayerWiring from './mediaplayer/MediaPlayerWiring.js';
import PlaybackApi from './mediaplayer/PlaybackApi.js';
import TextApi from './mediaplayer/TextApi.js';
import TrackApi from './mediaplayer/TrackApi.js';

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
    // Public API groups split out of this file. Each is a FactoryMaker class factory (so player.extend() works on them)
    // and gets the shared `state` object plus a back-reference to the composed player instance.
    const API_FACTORIES = [CoreApi, LifecycleApi, PlaybackApi, TrackApi, TextApi, ManifestApi, CustomParametersApi];

    const context = this.context;
    let instance;

    // Shared with the API sub-modules (see _composeApis). Single source of truth for player state.
    const state = {
        logger: null,
        source: null,
        protectionData: null,
        mediaPlayerInitialized: false,
        streamingInitialized: false,
        playbackInitialized: false,
        autoPlay: true,
        providedStartTime: NaN,
        settings: Settings(context).getInstance(),
        abrController: null,
        throughputController: null,
        mediaController: null,
        protectionController: null,
        adapter: null,
        customParametersModel: null,
        baseURLController: null,
        streamController: null,
        textController: null,
        playbackController: null,
        contentSteeringController: null,
        dashMetrics: null,
        manifestModel: null,
        videoModel: null,
        offlineController: null,
        uriFragmentModel: null,
    };
    const debug = Debug(context).getInstance({ settings: state.settings });
    const wiring = MediaPlayerWiring(context).getInstance();
    wiring.setConfig({ state, debug });

    function setup() {
        state.logger = debug.getLogger(instance);
        wiring.setup();
    }

    /**
     * Configure media player with customs controllers. Helpful for tests
     *
     * @param {object=} config controllers configuration
     * @memberof module:MediaPlayer
     * @instance
     */
    function setConfig(config) {
        wiring.setConfig(config);
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
        _composeApis();
    }

    /**
     *
     * @private
     */
    function _composeApis() {
        API_FACTORIES.forEach((Factory) => {
            const api = Factory(context).create();
            api.setConfig({ state, mediaPlayer: instance, wiring, debug });
            const { setConfig, getClassName, ...methods } = api; // strip factory plumbing
            Object.assign(instance, methods);
        });
    }

    instance = {
        extend,
        setConfig,
    };

    _composeApis();
    setup();

    return instance;
}

MediaPlayer.__dashjs_factory_name = 'MediaPlayer';
const factory = FactoryMaker.getClassFactory(MediaPlayer);
factory.events = MediaPlayerEvents;
factory.errors = Errors;
FactoryMaker.updateClassFactory(MediaPlayer.__dashjs_factory_name, factory);

export default factory;
