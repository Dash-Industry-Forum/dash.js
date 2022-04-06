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
import FactoryMaker from '../../core/FactoryMaker';
import Settings from '../../core/Settings';

const DEFAULT_MIN_BUFFER_TIME = 12;
const DEFAULT_MIN_BUFFER_TIME_FAST_SWITCH = 20;
const LOW_LATENCY_REDUCTION_FACTOR = 10;
const LOW_LATENCY_MULTIPLY_FACTOR = 5;
const DEFAULT_CATCHUP_MAX_DRIFT = 12;
const DEFAULT_CATCHUP_PLAYBACK_RATE = 0.5;


/**
 * We use this model as a wrapper/proxy between Settings.js and classes that are using parameters from Settings.js.
 * In some cases we require additional logic to be applied and the settings might need to be adjusted before being used.
 * @class
 * @constructor
 */
function MediaPlayerModel() {

    let instance,
        playbackController,
        serviceDescriptionController;

    const context = this.context;
    const settings = Settings(context).getInstance();

    function setup() {
    }

    function setConfig(config) {
        if (config.playbackController) {
            playbackController = config.playbackController;
        }
        if (config.serviceDescriptionController) {
            serviceDescriptionController = config.serviceDescriptionController;
        }
    }

    /**
     * Returns the maximum drift allowed before applying a seek back to the live edge when the catchup mode is enabled
     * @return {number}
     */
    function getCatchupMaxDrift() {
        if (!isNaN(settings.get().streaming.liveCatchup.maxDrift) && settings.get().streaming.liveCatchup.maxDrift > 0) {
            return settings.get().streaming.liveCatchup.maxDrift;
        }

        const serviceDescriptionSettings = serviceDescriptionController.getServiceDescriptionSettings();
        if (serviceDescriptionSettings && serviceDescriptionSettings.liveCatchup && !isNaN(serviceDescriptionSettings.liveCatchup.maxDrift) && serviceDescriptionSettings.liveCatchup.maxDrift > 0) {
            return serviceDescriptionSettings.liveCatchup.maxDrift;
        }

        return DEFAULT_CATCHUP_MAX_DRIFT;
    }

    /**
     * Returns the maximum playback rate to be used when applying the catchup mechanism
     * @return {number}
     */
    function getCatchupPlaybackRate() {
        if (!isNaN(settings.get().streaming.liveCatchup.playbackRate) && settings.get().streaming.liveCatchup.playbackRate > 0) {
            return settings.get().streaming.liveCatchup.playbackRate;
        }

        const serviceDescriptionSettings = serviceDescriptionController.getServiceDescriptionSettings();
        if (serviceDescriptionSettings && serviceDescriptionSettings.liveCatchup && !isNaN(serviceDescriptionSettings.liveCatchup.playbackRate) && serviceDescriptionSettings.liveCatchup.playbackRate > 0) {
            return serviceDescriptionSettings.liveCatchup.playbackRate;
        }

        return DEFAULT_CATCHUP_PLAYBACK_RATE;
    }

    /**
     * Returns whether the catchup mode is activated via the settings or internally in the PlaybackController
     * @return {boolean}
     */
    function getCatchupModeEnabled() {
        if (settings.get().streaming.liveCatchup.enabled !== null) {
            return settings.get().streaming.liveCatchup.enabled;
        }

        return playbackController.getInitialCatchupModeActivated();
    }

    /**
     * Returns the threshold for which to apply the catchup logic
     * @return {number}
     */
    function getLiveCatchupLatencyThreshold() {
        try {
            const liveCatchupLatencyThreshold = settings.get().streaming.liveCatchup.latencyThreshold;
            const liveDelay = playbackController.getLiveDelay();

            if (liveCatchupLatencyThreshold !== null && !isNaN(liveCatchupLatencyThreshold)) {
                return Math.max(liveCatchupLatencyThreshold, liveDelay);
            }

            return NaN;

        } catch (e) {
            return NaN;
        }
    }

    /**
     * Returns the min,max or initial bitrate for a specific media type.
     * @param {string} field
     * @param {string} mediaType
     */
    function getAbrBitrateParameter(field, mediaType) {
        try {
            const setting = settings.get().streaming.abr[field][mediaType];
            if(!isNaN(setting) && setting !== -1) {
                return setting;
            }

            const serviceDescriptionSettings = serviceDescriptionController.getServiceDescriptionSettings();
            if(serviceDescriptionSettings && serviceDescriptionSettings[field] && !isNaN(serviceDescriptionSettings[field][mediaType])) {
                return serviceDescriptionSettings[field][mediaType];
            }

            return -1;
        }
        catch(e) {
            return -1;
        }
    }

    /**
     * Returns the initial buffer level taking the stable buffer time into account
     * @return {number}
     */
    function getInitialBufferLevel() {
        const initialBufferLevel = settings.get().streaming.buffer.initialBufferLevel;

        if (isNaN(initialBufferLevel) || initialBufferLevel < 0) {
            return 0;
        }

        return Math.min(getStableBufferTime(), initialBufferLevel);
    }

    /**
     * Returns the stable buffer time taking the live delay into account
     * @return {number}
     */
    function getStableBufferTime() {
        let stableBufferTime = settings.get().streaming.buffer.stableBufferTime > 0 ? settings.get().streaming.buffer.stableBufferTime : settings.get().streaming.buffer.fastSwitchEnabled ? DEFAULT_MIN_BUFFER_TIME_FAST_SWITCH : DEFAULT_MIN_BUFFER_TIME;
        const liveDelay = playbackController.getLiveDelay();

        return !isNaN(liveDelay) && liveDelay > 0 ? Math.min(stableBufferTime, liveDelay) : stableBufferTime;
    }

    /**
     * Returns the number of retry attempts for a specific media type
     * @param type
     * @return {number}
     */
    function getRetryAttemptsForType(type) {
        const lowLatencyMultiplyFactor = !isNaN(settings.get().streaming.retryAttempts.lowLatencyMultiplyFactor) ? settings.get().streaming.retryAttempts.lowLatencyMultiplyFactor : LOW_LATENCY_MULTIPLY_FACTOR;

        return playbackController.getLowLatencyModeEnabled() ? settings.get().streaming.retryAttempts[type] * lowLatencyMultiplyFactor : settings.get().streaming.retryAttempts[type];
    }

    /**
     * Returns the retry interbal for a specific media type
     * @param type
     * @return {number}
     */
    function getRetryIntervalsForType(type) {
        const lowLatencyReductionFactor = !isNaN(settings.get().streaming.retryIntervals.lowLatencyReductionFactor) ? settings.get().streaming.retryIntervals.lowLatencyReductionFactor : LOW_LATENCY_REDUCTION_FACTOR;

        return playbackController.getLowLatencyModeEnabled() ? settings.get().streaming.retryIntervals[type] / lowLatencyReductionFactor : settings.get().streaming.retryIntervals[type];
    }

    function reset() {
    }

    instance = {
        getCatchupMaxDrift,
        getCatchupModeEnabled,
        getLiveCatchupLatencyThreshold,
        getStableBufferTime,
        getInitialBufferLevel,
        getRetryAttemptsForType,
        getRetryIntervalsForType,
        getCatchupPlaybackRate,
        getAbrBitrateParameter,
        setConfig,
        reset
    };

    setup();

    return instance;
}

MediaPlayerModel.__dashjs_factory_name = 'MediaPlayerModel';
export default FactoryMaker.getSingletonFactory(MediaPlayerModel);
