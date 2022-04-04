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


/**
 * We use this model as a wrapper/proxy between Settings.js and classes that are using parameters from Settings.js.
 * In some cases we require additional logic to be applied and the settings might need to be adjusted before being used.
 * @class
 * @constructor
 */
function MediaPlayerModel() {

    let instance,
        playbackController

    const context = this.context;
    const settings = Settings(context).getInstance();

    function setup() {
    }

    function setConfig(config) {
        if (config.playbackController) {
            playbackController = config.playbackController;
        }
    }

    function getInitialBufferLevel() {
        const initialBufferLevel = settings.get().streaming.buffer.initialBufferLevel;

        if (isNaN(initialBufferLevel) || initialBufferLevel < 0) {
            return 0;
        }

        return Math.min(getStableBufferTime(), initialBufferLevel);
    }

    function getStableBufferTime() {
        let stableBufferTime = settings.get().streaming.buffer.stableBufferTime > 0 ? settings.get().streaming.buffer.stableBufferTime : settings.get().streaming.buffer.fastSwitchEnabled ? DEFAULT_MIN_BUFFER_TIME_FAST_SWITCH : DEFAULT_MIN_BUFFER_TIME;
        const liveDelay = playbackController.getLiveDelay();

        return !isNaN(liveDelay) && liveDelay > 0 ? Math.min(stableBufferTime, liveDelay) : stableBufferTime;
    }

    function getRetryAttemptsForType(type) {
        const lowLatencyMultiplyFactor = !isNaN(settings.get().streaming.retryAttempts.lowLatencyMultiplyFactor) ? settings.get().streaming.retryAttempts.lowLatencyMultiplyFactor : LOW_LATENCY_MULTIPLY_FACTOR;

        return playbackController.getLowLatencyModeEnabled() ? settings.get().streaming.retryAttempts[type] * lowLatencyMultiplyFactor : settings.get().streaming.retryAttempts[type];
    }

    function getRetryIntervalsForType(type) {
        const lowLatencyReductionFactor = !isNaN(settings.get().streaming.retryIntervals.lowLatencyReductionFactor) ? settings.get().streaming.retryIntervals.lowLatencyReductionFactor : LOW_LATENCY_REDUCTION_FACTOR;

        return playbackController.getLowLatencyModeEnabled() ? settings.get().streaming.retryIntervals[type] / lowLatencyReductionFactor : settings.get().streaming.retryIntervals[type];
    }

    function reset() {
    }

    instance = {
        getStableBufferTime,
        getInitialBufferLevel,
        getRetryAttemptsForType,
        getRetryIntervalsForType,
        setConfig,
        reset
    };

    setup();

    return instance;
}

MediaPlayerModel.__dashjs_factory_name = 'MediaPlayerModel';
export default FactoryMaker.getSingletonFactory(MediaPlayerModel);
