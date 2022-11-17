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
import MediaPlayerEvents from '../MediaPlayerEvents';
import Events from '../../core/events/Events';
import MetricsConstants from '../constants/MetricsConstants';
import Utils from '../../core/Utils';

function CatchupController() {
    const context = this.context;
    const eventBus = EventBus(context).getInstance();

    let instance,
        isCatchupSeekInProgress,
        isSafari,
        videoModel,
        settings,
        streamController,
        playbackController,
        mediaPlayerModel,
        playbackStalled,
        logger;

    function initialize() {
        _registerEvents();
        _checkPlaybackRates();
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

        if (config.mediaPlayerModel) {
            mediaPlayerModel = config.mediaPlayerModel;
        }
    }

    function _registerEvents() {
        eventBus.on(MediaPlayerEvents.BUFFER_LEVEL_UPDATED, _onBufferLevelUpdated, instance);
        eventBus.on(MediaPlayerEvents.BUFFER_LEVEL_STATE_CHANGED, _onBufferLevelStateChanged, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_PROGRESS, _onPlaybackProgression, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_TIME_UPDATED, _onPlaybackProgression, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_SEEKED, _onPlaybackSeeked, instance);
        eventBus.on(Events.SETTING_UPDATED_CATCHUP_ENABLED, _onCatchupSettingUpdated, instance);
        eventBus.on(Events.SETTING_UPDATED_PLAYBACK_RATE_MIN, _checkPlaybackRates, instance);
        eventBus.on(Events.SETTING_UPDATED_PLAYBACK_RATE_MAX, _checkPlaybackRates, instance);
        eventBus.on(MediaPlayerEvents.STREAM_INITIALIZED, _checkPlaybackRates, instance);
    }

    function _unregisterEvents() {
        eventBus.off(MediaPlayerEvents.BUFFER_LEVEL_UPDATED, _onBufferLevelUpdated, instance);
        eventBus.off(MediaPlayerEvents.BUFFER_LEVEL_STATE_CHANGED, _onBufferLevelStateChanged, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_PROGRESS, _onPlaybackProgression, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_TIME_UPDATED, _onPlaybackProgression, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_SEEKED, _onPlaybackProgression, instance);
        eventBus.off(Events.SETTING_UPDATED_CATCHUP_ENABLED, _onCatchupSettingUpdated, instance);
        eventBus.off(Events.SETTING_UPDATED_PLAYBACK_RATE_MIN, _checkPlaybackRates, instance);
        eventBus.off(Events.SETTING_UPDATED_PLAYBACK_RATE_MAX, _checkPlaybackRates, instance);
        eventBus.off(MediaPlayerEvents.STREAM_INITIALIZED, _checkPlaybackRates, instance);
    }

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);

        _resetInitialSettings();
    }

    function reset() {
        _unregisterEvents();
        _resetInitialSettings();
        videoModel.setPlaybackRate(1.0, true);
    }

    function _resetInitialSettings() {
        isCatchupSeekInProgress = false;
        const ua = Utils.parseUserAgent();
        isSafari = ua && ua.browser && ua.browser.name && ua.browser.name.toLowerCase() === 'safari';
    }


    function _onPlaybackSeeked() {
        isCatchupSeekInProgress = false;
    }

    /**
     * When the buffer level updated we check if we can remove the stalled state
     * @param {object} e
     * @private
     */
    function _onBufferLevelUpdated(e) {
        // do not stop when getting an event from Stream that is not active
        if (e.streamId !== streamController.getActiveStreamInfo().id || !playbackStalled) {
            return;
        }

        // we remove the stalled state once we reach a certain buffer level
        const liveDelay = playbackController.getLiveDelay();
        const bufferLevel = playbackController.getBufferLevel();
        if (bufferLevel > liveDelay / 2) {
            playbackStalled = false;
        }
    }

    /**
     * When the buffer state changed to BUFFER_EMPTY we update the stalled state
     * @param {object} e
     * @private
     */
    function _onBufferLevelStateChanged(e) {
        // do not stop when getting an event from Stream that is not active
        if (e.streamId !== streamController.getActiveStreamInfo().id) {
            return;
        }

        playbackStalled = e.state === MetricsConstants.BUFFER_EMPTY;
    }

    /**
     * If the catchup mode is disabled in the settings we reset playback rate to 1.0
     * @private
     */
    function _onCatchupSettingUpdated() {
        if (!mediaPlayerModel.getCatchupModeEnabled()) {
            videoModel.setPlaybackRate(1.0);
        }
    }

    /**
     * While playback is progressing we check if we need to start or stop the catchup mechanism to reach the target latency
     * @private
     */
    function _onPlaybackProgression() {
        if (
            playbackController.getIsDynamic() && 
            mediaPlayerModel.getCatchupModeEnabled() && 
            ((mediaPlayerModel.getCatchupPlaybackRates().max > 0) || (mediaPlayerModel.getCatchupPlaybackRates().min < 0)) && 
            !playbackController.isPaused() && 
            !playbackController.isSeeking() && _shouldStartCatchUp()
        ) {
            _startPlaybackCatchUp();
        }
    }

    /**
     * Apply catchup mode. We either seek back to the target live edge or increase the playback rate.
     */
    function _startPlaybackCatchUp() {

        // we are seeking dont do anything for now
        if (isCatchupSeekInProgress) {
            return;
        }

        if (videoModel) {
            let newRate;
            const currentPlaybackRate = videoModel.getPlaybackRate();
            const liveCatchupPlaybackRates = mediaPlayerModel.getCatchupPlaybackRates();
            const bufferLevel = playbackController.getBufferLevel();
            const deltaLatency = _getLatencyDrift();

            // we reached the maxDrift. Do a seek
            const maxDrift = mediaPlayerModel.getCatchupMaxDrift();
            if (!isNaN(maxDrift) && maxDrift > 0 &&
                deltaLatency > maxDrift) {
                logger.info('[CatchupController]: Low Latency catchup mechanism. Latency too high, doing a seek to live point');
                isCatchupSeekInProgress = true;
                playbackController.seekToCurrentLive(true, false);
            }

            // try to reach the target latency by adjusting the playback rate
            else {
                const currentLiveLatency = playbackController.getCurrentLiveLatency();
                const targetLiveDelay = playbackController.getLiveDelay();

                if (_getCatchupMode() === Constants.LIVE_CATCHUP_MODE_LOLP) {
                    // Custom playback control: Based on buffer level
                    const playbackBufferMin = settings.get().streaming.liveCatchup.playbackBufferMin;
                    newRate = _calculateNewPlaybackRateLolP(liveCatchupPlaybackRates, currentLiveLatency, targetLiveDelay, playbackBufferMin, bufferLevel);
                } else {
                    // Default playback control: Based on target and current latency
                    newRate = _calculateNewPlaybackRateDefault(liveCatchupPlaybackRates, currentLiveLatency, targetLiveDelay, bufferLevel);
                }

                // We adjust the min change linear, depending on the maximum catchup rate. Default is 0.02 for rate 0.5.
                // For Safari we stick to a fixed value because of  https://bugs.webkit.org/show_bug.cgi?id=208142
                const minPlaybackRateChange = isSafari ? 0.25 : 0.02 / (0.5 / liveCatchupPlaybackRates.max);

                // Obtain newRate and apply to video model.  Don't change playbackrate for small variations (don't overload element with playbackrate changes)
                if (newRate && Math.abs(currentPlaybackRate - newRate) >= minPlaybackRateChange) {  // non-null
                    logger.debug(`[CatchupController]: Setting playback rate to ${newRate}`);
                    videoModel.setPlaybackRate(newRate);
                }
            }
        }
    }

    /**
     * Calculates the drift between the current latency and the target latency
     * @return {number}
     * @private
     */
    function _getLatencyDrift() {
        const currentLiveLatency = playbackController.getCurrentLiveLatency();
        const targetLiveDelay = playbackController.getLiveDelay();

        return currentLiveLatency - targetLiveDelay;
    }

    /**
     * Checks whether the catchup mechanism should be enabled. We use different subfunctions here depending on the catchup mode.
     * @return {boolean}
     */
    function _shouldStartCatchUp() {
        try {
            if (!playbackController.getTime() > 0 || isCatchupSeekInProgress) {
                return false;
            }

            const catchupMode = _getCatchupMode();

            if (catchupMode === Constants.LIVE_CATCHUP_MODE_LOLP) {
                const currentBuffer = playbackController.getBufferLevel();
                const playbackBufferMin = settings.get().streaming.liveCatchup.playbackBufferMin;

                return _lolpNeedToCatchUpCustom(currentBuffer, playbackBufferMin);
            } else {
                return _defaultNeedToCatchUp();
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
     * @return {boolean}
     * @private
     */
    function _defaultNeedToCatchUp() {
        try {
            const latencyDrift = Math.abs(_getLatencyDrift());

            return latencyDrift > 0;
        } catch (e) {
            return false;
        }
    }

    /**
     * LoL+ logic to determine if catchup mode should be enabled
     * @param {number} currentBuffer
     * @param {number} playbackBufferMin
     * @return {boolean}
     * @private
     */
    function _lolpNeedToCatchUpCustom(currentBuffer, playbackBufferMin) {
        try {
            const latencyDrift = Math.abs(_getLatencyDrift());

            return latencyDrift > 0 || currentBuffer < playbackBufferMin;
        } catch (e) {
            return false;
        }
    }

    /**
     * Default algorithm to calculate the new playback rate
     * @param {object} liveCatchUpPlaybackRates
     * @param {number} liveCatchUpPlaybackRates.min - minimum playback rate decrease limit
     * @param {number} liveCatchUpPlaybackRates.max - maximum playback rate increase limit
     * @param {number} currentLiveLatency
     * @param {number} liveDelay
     * @param {number} bufferLevel
     * @param {number} currentPlaybackRate
     * @return {number}
     * @private
     */
    function _calculateNewPlaybackRateDefault(liveCatchUpPlaybackRates, currentLiveLatency, liveDelay, bufferLevel) {
        // if we recently ran into an empty buffer we wait for the buffer to recover before applying a new rate
        if (playbackStalled) {
            return 1.0;
        }

        const deltaLatency = currentLiveLatency - liveDelay;
        const cpr = (deltaLatency < 0) ? Math.abs(liveCatchUpPlaybackRates.min) : liveCatchUpPlaybackRates.max;
        const d = deltaLatency * 5;

        // Playback rate must be between (1 - cpr) - (1 + cpr)
        // ex: if cpr is 0.5, it can have values between 0.5 - 1.5
        const s = (cpr * 2) / (1 + Math.pow(Math.E, -d));
        let newRate = (1 - cpr) + s;
        // take into account situations in which there are buffer stalls,
        // in which increasing playbackRate to reach target latency will
        // just cause more and more stall situations
        if (playbackController.getPlaybackStalled()) {
            if (bufferLevel <= liveDelay / 2 && deltaLatency > 0) {
                newRate = 1.0;
            }
        }

        return newRate;
    }

    /**
     * Lol+ algorithm to calculate the new playback rate
     * @param {object} liveCatchUpPlaybackRates
     * @param {number} liveCatchUpPlaybackRates.min - minimum playback rate decrease limit
     * @param {number} liveCatchUpPlaybackRates.max - maximum playback rate increase limit
     * @param {number} currentLiveLatency
     * @param {number} liveDelay
     * @param {number} playbackBufferMin
     * @param {number} bufferLevel
     * @param {number} currentPlaybackRate
     * @return {number}
     * @private
     */
    function _calculateNewPlaybackRateLolP(liveCatchUpPlaybackRates, currentLiveLatency, liveDelay, playbackBufferMin, bufferLevel) {
        let newRate;

        // Hybrid: Buffer-based
        if (bufferLevel < playbackBufferMin) {
            // Buffer in danger, slow down
            const cpr = Math.abs(liveCatchUpPlaybackRates.min); // Absolute value as negative delta value will be used.
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
            const cpr = liveCatchUpPlaybackRates.max;
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

        return newRate
    }

    function _checkPlaybackRates() {
        mediaPlayerModel.getCatchupPlaybackRates(true);
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
