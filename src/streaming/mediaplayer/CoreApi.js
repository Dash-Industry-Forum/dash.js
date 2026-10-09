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
import FactoryMaker from '../../core/FactoryMaker.js';
import InitCache from '../utils/InitCache.js';
import TimeUtils from '../utils/TimeUtils.js';
import { getVersionString } from '../../core/Version.js';

function CoreApi() {
    const context = this.context;
    const eventBus = EventBus(context).getInstance();
    let instance,
        state,
        wiring,
        debug;

    function setConfig(config) {
        if (!config) {
            return;
        }
        if (config.state) {
            state = config.state;
        }
        if (config.wiring) {
            wiring = config.wiring;
        }
        if (config.debug) {
            debug = config.debug;
        }
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

    /**
     * Returns the InitCache instance for debugging/testing purposes.
     * @returns {object} InitCache instance
     * @memberof module:MediaPlayer
     * @instance
     */
    function getInitCache() {
        return InitCache(context).getInstance();
    }

    /**
     * Detects if Offline is included and returns an instance of OfflineController.js
     * @memberof module:MediaPlayer
     * @instance
     */
    function getOfflineController() {
        return wiring.detectOffline();
    }

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
        return state.dashMetrics;
    }

    /**
     * Get the current settings object being used on the player.
     * @returns {PlayerSettings} The settings object being used.
     *
     * @memberof module:MediaPlayer
     * @instance
     */
    function getSettings() {
        return state.settings.get();
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
        state.settings.update(settingsObj);
    }

    /**
     * Resets the settings object back to the default.
     *
     * @memberof module:MediaPlayer
     * @instance
     */
    function resetSettings() {
        state.settings.reset();
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
        return TimeUtils(context).getInstance().formatUTC(time, locales, hour12, withDate);
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
        return TimeUtils(context).getInstance().convertToTimeCode(value);
    }

    instance = {
        convertToTimeCode,
        formatUTC,
        getDashMetrics,
        getDebug,
        getInitCache,
        getOfflineController,
        getSettings,
        getVersion,
        off,
        on,
        resetSettings,
        setConfig,
        trigger,
        updateSettings,
    };

    return instance;
}

CoreApi.__dashjs_factory_name = 'CoreApi';
export default FactoryMaker.getClassFactory(CoreApi);
