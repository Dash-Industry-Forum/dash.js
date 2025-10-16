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
import EventBus from '../../../core/EventBus.js';
import Events from '../../../core/events/Events.js';
import FactoryMaker from '../../../core/FactoryMaker.js';
import Debug from '../../../core/Debug.js';
import SwitchRequest from '../SwitchRequest.js';
import Constants from '../../constants/Constants.js';
import MetricsConstants from '../../constants/MetricsConstants.js';
import MediaPlayerEvents from '../../MediaPlayerEvents.js';
import Settings from '../../../core/Settings.js';

function InsufficientBufferRule(config) {

    config = config || {};

    const context = this.context;
    const eventBus = EventBus(context).getInstance();
    const dashMetrics = config.dashMetrics;
    const settings = Settings(context).getInstance();

    let instance,
        logger,
        bufferStateDict;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        _resetInitialSettings();
        eventBus.on(MediaPlayerEvents.PLAYBACK_SEEKING, _onPlaybackSeeking, instance);
        eventBus.on(Events.BYTES_APPENDED_END_FRAGMENT, _onBytesAppended, instance);
    }


    /**
     * If a BUFFER_EMPTY event happens, then InsufficientBufferRule returns switchRequest. Quality=0 until BUFFER_LOADED happens.
     * Otherwise, InsufficientBufferRule gives a maximum bitrate depending on throughput and bufferLevel such that
     * a whole fragment can be downloaded before the buffer runs out, subject to a conservative safety factor of 0.5.
     * If the bufferLevel is low, then InsufficientBufferRule avoids rebuffering risk.
     * If the bufferLevel is high, then InsufficientBufferRule give a high MaxIndex allowing other rules to take over.
     * @param rulesContext
     * @return {object}
     */
    function getSwitchRequest(rulesContext) {
        const switchRequest = SwitchRequest(context).create();
        switchRequest.rule = this.getClassName();

        if (!rulesContext || !rulesContext.hasOwnProperty('getMediaType')) {
            return switchRequest;
        }

        const mediaType = rulesContext.getMediaType();
        const currentBufferState = dashMetrics.getCurrentBufferState(mediaType);
        const voRepresentation = rulesContext.getRepresentation();
        const fragmentDuration = voRepresentation.fragmentDuration;
        const scheduleController = rulesContext.getScheduleController();
        const playbackController = scheduleController.getPlaybackController();

        if (!_shouldExecuteRule(playbackController, mediaType, fragmentDuration)) {
            return switchRequest;
        }

        const mediaInfo = rulesContext.getMediaInfo();
        const abrController = rulesContext.getAbrController();
        if (currentBufferState && currentBufferState.state === MetricsConstants.BUFFER_EMPTY) {
            logger.debug('[' + mediaType + '] Switch to index 0; buffer is empty.');
            switchRequest.representation = abrController.getOptimalRepresentationForBitrate(mediaInfo, 0, true);
            switchRequest.reason = {
                message: '[InsufficientBufferRule]: Switching to lowest Representation because buffer is empty'
            };
        } else {
            const throughputController = rulesContext.getThroughputController();
            const bufferLevel = dashMetrics.getCurrentBufferLevel(mediaType);
            const throughput = throughputController.getAverageThroughput(mediaType, null, NaN);
            const safeThroughput = throughput * settings.get().streaming.abr.rules.insufficientBufferRule.parameters.throughputSafetyFactor;
            const bitrate = safeThroughput * bufferLevel / fragmentDuration

            if (isNaN(bitrate) || bitrate <= 0) {
                return switchRequest
            }

            switchRequest.representation = abrController.getOptimalRepresentationForBitrate(mediaInfo, bitrate, true);
            switchRequest.priority = settings.get().streaming.abr.rules.insufficientBufferRule.priority;
            switchRequest.reason = {
                message: '[InsufficientBufferRule]: Limiting maximum bitrate to avoid a buffer underrun.',
                bitrate
            };
        }

        return switchRequest;
    }

    function _shouldExecuteRule(playbackController, mediaType, fragmentDuration) {
        const lowLatencyEnabled = playbackController.getLowLatencyModeEnabled();
        return !lowLatencyEnabled && bufferStateDict[mediaType].ignoreCount <= 0 && fragmentDuration;
    }

    function _resetInitialSettings() {
        const segmentIgnoreCount = settings.get().streaming.abr.rules.insufficientBufferRule.parameters.segmentIgnoreCount
        bufferStateDict = {};
        bufferStateDict[Constants.VIDEO] = { ignoreCount: segmentIgnoreCount };
        bufferStateDict[Constants.AUDIO] = { ignoreCount: segmentIgnoreCount };
    }

    function _onPlaybackSeeking() {
        _resetInitialSettings();
    }

    function _onBytesAppended(e) {
        if (!isNaN(e.startTime) && (e.mediaType === Constants.AUDIO || e.mediaType === Constants.VIDEO)) {
            if (bufferStateDict[e.mediaType].ignoreCount > 0) {
                bufferStateDict[e.mediaType].ignoreCount--;
            }
        }
    }

    function reset() {
        _resetInitialSettings();
        eventBus.off(MediaPlayerEvents.PLAYBACK_SEEKING, _onPlaybackSeeking, instance);
        eventBus.off(Events.BYTES_APPENDED_END_FRAGMENT, _onBytesAppended, instance);
    }

    instance = {
        getSwitchRequest,
        reset
    };

    setup();

    return instance;
}

InsufficientBufferRule.__dashjs_factory_name = 'InsufficientBufferRule';
export default FactoryMaker.getClassFactory(InsufficientBufferRule);
