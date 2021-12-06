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
import Debug from '../../core/Debug';
import EventBus from '../../core/EventBus';
import Constants from '../constants/Constants';
import MetricsConstants from '../constants/MetricsConstants';
import MediaPlayerEvents from "../MediaPlayerEvents";

function CatchupController() {
    const context = this.context;
    const eventBus = EventBus(context).getInstance();

    let instance,
        isCatchupInProgress,
        isLowLatencySeekingInProgress,
        minPlaybackRateChange,
        videoModel,
        settings,
        streamController,
        playbackController,
        mediaPlayerModel,
        dashMetrics,
        logger;

    function initialize() {
        _registerEvents();
    }

    function setConfig(config) {
        if (!config) {
            return;
        }

        if (config.settings) {
            settings = config.settings;
        }

        if (config.videoModel) {
            videoModel = config.videoModel;
        }

        if (config.streamController) {
            streamController = config.streamController;
        }

        if (config.playbackController) {
            playbackController = config.playbackController;
        }

        if (config.dashMetrics) {
            dashMetrics = config.dashMetrics;
        }

        if (config.mediaPlayerModel) {
            mediaPlayerModel = config.mediaPlayerModel;
        }
    }

    function _registerEvents() {
        eventBus.on(MediaPlayerEvents.BUFFER_EMPTY, _onBufferEmpty, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_PROGRESS, _onPlaybackProgression, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_TIME_UPDATED, _onPlaybackProgression, instance);
    }

    function _unregisterEvents() {
        eventBus.on(MediaPlayerEvents.BUFFER_EMPTY, _onBufferEmpty, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_PROGRESS, _onPlaybackProgression, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_TIME_UPDATED, _onPlaybackProgression, instance);
    }

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);

        resetInitialSettings();
    }

    function reset() {
        _unregisterEvents();
        resetInitialSettings();
    }

    function resetInitialSettings() {
        isCatchupInProgress = false;
        isLowLatencySeekingInProgress = false;

        // Detect safari browser (special behavior for low latency streams)
        const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
        const isSafari = /safari/.test(ua) && !/chrome/.test(ua);
        minPlaybackRateChange = isSafari ? 0.25 : 0.02;
    }


    function _onPlaybackSeeked() {
        isLowLatencySeekingInProgress = false;
    }

    /**
     * When the buffer level has changed to empty we stop the catchup
     * @param e
     * @private
     */
    function _onBufferEmpty(e) {
        // do not stop when getting an event from Stream that is not active
        if (e.streamId !== streamController.getActiveStreamInfo().id) {
            return;
        }
        stopPlaybackCatchUp();
    }

    /**
     * While playback is progressing we check if we need to start or stop the catchup mechanism to reach the target latency
     * @private
     */
    function _onPlaybackProgression() {
        if (playbackController.isDynamic() && (settings.get().streaming.liveCatchup.enabled || settings.get().streaming.lowLatencyEnabled) && settings.get().streaming.liveCatchup.playbackRate > 0 && !playbackController.isPaused() && !playbackController.isSeeking()) {
            if (_shouldStopCatchUp()) {
                stopPlaybackCatchUp();
            } else if (_shouldStartCatchUp()) {
                startPlaybackCatchUp();
            }
        }
    }

    /**
     * Check if we should stop catchup mode
     * @private
     */
    function _shouldStopCatchUp() {

        if (!isCatchupInProgress) {
            return false;
        }

        const latencyDrift = _getLatencyDrift();

        return latencyDrift < Math.min(settings.get().streaming.liveCatchup.minDrift, mediaPlayerModel.getLiveDelay() * settings.get().streaming.liveCatchup.maxAllowedLatencyDeviationFactor);
    }

    function _getLatencyDrift() {
        const currentLiveLatency = playbackController.getCurrentLiveLatency();
        const targetLiveDelay = mediaPlayerModel.getLiveDelay();

        return Math.abs(currentLiveLatency - targetLiveDelay);
    }

    /**
     * Checks whether the catchup mechanism should be enabled
     * @return {boolean}
     */
    function _shouldStartCatchUp() {
        try {
            if (isCatchupInProgress || !playbackController.getTime() > 0) {
                return false;
            }

            const catchupMode = _getCatchupMode();
            const currentLiveLatency = playbackController.getCurrentLiveLatency();
            const liveCatchupLatencyThreshold = mediaPlayerModel.getLiveCatchupLatencyThreshold();
            const liveCatchUpMinDrift = settings.get().streaming.liveCatchup.minDrift;

            if (catchupMode === Constants.LIVE_CATCHUP_MODE_LOLP) {
                const currentBuffer = playbackController.getBufferLevel();
                const playbackBufferMin = settings.get().streaming.liveCatchup.playbackBufferMin;

                return _lolpNeedToCatchUpCustom(currentLiveLatency, liveCatchUpMinDrift, currentBuffer, playbackBufferMin, liveCatchupLatencyThreshold);
            } else {
                return _defaultNeedToCatchUp(currentLiveLatency, liveCatchupLatencyThreshold, liveCatchUpMinDrift);
            }

        } catch (e) {
            return false;
        }
    }


    /**
     * Returns the mode for live playback catchup.
     * @return {String}
     * @private
     */
    function _getCatchupMode() {
        const playbackBufferMin = settings.get().streaming.liveCatchup.playbackBufferMin;

        return settings.get().streaming.liveCatchup.mode === Constants.LIVE_CATCHUP_MODE_LOLP && playbackBufferMin !== null && !isNaN(playbackBufferMin) ? Constants.LIVE_CATCHUP_MODE_LOLP : Constants.LIVE_CATCHUP_MODE_DEFAULT;
    }

    /**
     * Default algorithm to determine if catchup mode should be enabled
     * @param {number} currentLiveLatency
     * @param {number} liveCatchupLatencyThreshold
     * @param {number} liveCatchUpMinDrift
     * @return {boolean}
     * @private
     */
    function _defaultNeedToCatchUp(currentLiveLatency, liveCatchupLatencyThreshold, liveCatchUpMinDrift) {
        try {
            const latencyDrift = _getLatencyDrift();

            return latencyDrift > liveCatchUpMinDrift && (isNaN(liveCatchupLatencyThreshold) || currentLiveLatency <= liveCatchupLatencyThreshold);
        } catch (e) {
            return false;
        }
    }

    /**
     * LoL+ logic to determine if catchup mode should be enabled
     * @param {number} currentLiveLatency
     * @param {number} liveCatchUpMinDrift
     * @param {number} currentBuffer
     * @param {number} playbackBufferMin
     * @param {number} liveCatchupLatencyThreshold
     * @return {boolean}
     * @private
     */
    function _lolpNeedToCatchUpCustom(currentLiveLatency, liveCatchUpMinDrift, currentBuffer, playbackBufferMin, liveCatchupLatencyThreshold) {
        try {
            const latencyDrift = _getLatencyDrift();

            return (isNaN(liveCatchupLatencyThreshold) || currentLiveLatency <= liveCatchupLatencyThreshold) && (latencyDrift > liveCatchUpMinDrift || currentBuffer < playbackBufferMin);
        } catch (e) {
            return false;
        }
    }

    /**
     * Apply catchup mode
     */
    function startPlaybackCatchUp() {

        // we are seeking dont do anything for now
        if (isLowLatencySeekingInProgress) {
            return;
        }

        if (videoModel) {
            let results;
            const currentPlaybackRate = videoModel.getPlaybackRate();
            const liveCatchupPlaybackRate = settings.get().streaming.liveCatchup.playbackRate;
            const currentLiveLatency = getCurrentLiveLatency();
            const liveDelay = mediaPlayerModel.getLiveDelay();
            const bufferLevel = getBufferLevel();
            const deltaLatency = currentLiveLatency - liveDelay;

            // we reached the maxDrift. Do a seek
            if (!isNaN(settings.get().streaming.liveCatchup.maxDrift) && settings.get().streaming.liveCatchup.maxDrift > 0 &&
                deltaLatency > settings.get().streaming.liveCatchup.maxDrift && deltaLatency > settings.get().streaming.liveCatchup.latencyThreshold) {
                logger.info('Low Latency catchup mechanism. Latency too high, doing a seek to live point');
                isLowLatencySeekingInProgress = true;
                seekToLive();
            }

            // try to reach the target latency by adjusting the playback rate
            else {
                if (_getCatchupMode() === Constants.LIVE_CATCHUP_MODE_LOLP) {
                    // Custom playback control: Based on buffer level
                    const liveCatchUpMinDrift = settings.get().streaming.liveCatchup.minDrift;
                    const playbackBufferMin = settings.get().streaming.liveCatchup.playbackBufferMin;
                    results = _calculateNewPlaybackRateLolP(liveCatchupPlaybackRate, currentLiveLatency, liveDelay, liveCatchUpMinDrift, playbackBufferMin, bufferLevel, currentPlaybackRate);
                } else {
                    // Default playback control: Based on target and current latency
                    results = _calculateNewPlaybackRateDefault(liveCatchupPlaybackRate, currentLiveLatency, liveDelay, bufferLevel, currentPlaybackRate);
                }

                // Obtain newRate and apply to video model
                let newRate = results.newRate;
                if (newRate) {  // non-null
                    logger.debug(`Starting catchup, setting playback rate to ${newRate}`);
                    videoModel.setPlaybackRate(newRate);
                    isCatchupInProgress = true;
                }
            }
        }
    }

    /**
     * Default algorithm to calculate the new playback rate
     * @param {number} liveCatchUpPlaybackRate
     * @param {number} currentLiveLatency
     * @param {number} liveDelay
     * @param {number} bufferLevel
     * @param {number} currentPlaybackRate
     * @return {{newRate: number}}
     * @private
     */
    function _calculateNewPlaybackRateDefault(liveCatchUpPlaybackRate, currentLiveLatency, liveDelay, bufferLevel, currentPlaybackRate) {
        const cpr = liveCatchUpPlaybackRate;
        const deltaLatency = currentLiveLatency - liveDelay;
        const d = deltaLatency * 5;

        // Playback rate must be between (1 - cpr) - (1 + cpr)
        // ex: if cpr is 0.5, it can have values between 0.5 - 1.5
        const s = (cpr * 2) / (1 + Math.pow(Math.E, -d));
        let newRate = (1 - cpr) + s;
        // take into account situations in which there are buffer stalls,
        // in which increasing playbackRate to reach target latency will
        // just cause more and more stall situations
        if (playbackStalled) {
            if (bufferLevel > liveDelay / 2) {
                playbackStalled = false;
            } else if (deltaLatency > 0) {
                newRate = 1.0;
            }
        }

        // don't change playbackrate for small variations (don't overload element with playbackrate changes)
        if (Math.abs(currentPlaybackRate - newRate) <= minPlaybackRateChange) {
            newRate = null;
        }

        return {
            newRate: newRate
        };

    }

    /**
     * Lol+ algorithm to calculate the new playback rate
     * @param {number} liveCatchUpPlaybackRate
     * @param {number} currentLiveLatency
     * @param {number} liveDelay
     * @param {number} minDrift
     * @param {number} playbackBufferMin
     * @param {number} bufferLevel
     * @param {number} currentPlaybackRate
     * @return {{newRate: number}}
     * @private
     */
    function _calculateNewPlaybackRateLolP(liveCatchUpPlaybackRate, currentLiveLatency, liveDelay, minDrift, playbackBufferMin, bufferLevel, currentPlaybackRate) {
        const cpr = liveCatchUpPlaybackRate;
        let newRate;

        // Hybrid: Buffer-based
        if (bufferLevel < playbackBufferMin) {
            // Buffer in danger, slow down
            const deltaBuffer = bufferLevel - playbackBufferMin;  // -ve value
            const d = deltaBuffer * 5;

            // Playback rate must be between (1 - cpr) - (1 + cpr)
            // ex: if cpr is 0.5, it can have values between 0.5 - 1.5
            const s = (cpr * 2) / (1 + Math.pow(Math.E, -d));
            newRate = (1 - cpr) + s;

            logger.debug('[LoL+ playback control_buffer-based] bufferLevel: ' + bufferLevel + ', newRate: ' + newRate);
        } else {
            // Hybrid: Latency-based
            // Buffer is safe, vary playback rate based on latency

            // Check if latency is within range of target latency
            const minDifference = 0.02;
            if (Math.abs(currentLiveLatency - liveDelay) <= (minDifference * liveDelay)) {
                newRate = 1;
            } else {
                const deltaLatency = currentLiveLatency - liveDelay;
                const d = deltaLatency * 5;

                // Playback rate must be between (1 - cpr) - (1 + cpr)
                // ex: if cpr is 0.5, it can have values between 0.5 - 1.5
                const s = (cpr * 2) / (1 + Math.pow(Math.E, -d));
                newRate = (1 - cpr) + s;
            }

            logger.debug('[LoL+ playback control_latency-based] latency: ' + currentLiveLatency + ', newRate: ' + newRate);
        }

        if (playbackStalled) {
            if (bufferLevel > liveDelay / 2) {
                playbackStalled = false;
            }
        }

        // don't change playbackrate for small variations (don't overload element with playbackrate changes)
        if (Math.abs(currentPlaybackRate - newRate) <= minPlaybackRateChange) {
            newRate = null;
        }

        return {
            newRate: newRate
        };
    }

    function stopPlaybackCatchUp() {
        if (videoModel) {
            logger.debug(`Stopping catchup, setting playback rate to 1.0`);
            videoModel.setPlaybackRate(1.0);
            isCatchupInProgress = false;
        }
    }

    /**
     * Seek to live edge
     */
    function seekToLive() {
        const type = streamController && streamController.hasVideoTrack() ? Constants.VIDEO : Constants.AUDIO;
        const DVRMetrics = dashMetrics.getCurrentDVRInfo(type);
        const DVRWindow = DVRMetrics ? DVRMetrics.range : null;

        if (DVRWindow && !isNaN(DVRWindow.end)) {
            seek(DVRWindow.end - getLiveDelay(), true, false);
        }
    }

    instance = {
        reset,
        setConfig,
        initialize
    };

    setup();

    return instance;
}

CatchupController.__dashjs_factory_name = 'CatchupController';
export default FactoryMaker.getSingletonFactory(CatchupController);
