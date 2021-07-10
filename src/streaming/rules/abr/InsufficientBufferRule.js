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
import EventBus from '../../../core/EventBus';
import Events from '../../../core/events/Events';
import FactoryMaker from '../../../core/FactoryMaker';
import Debug from '../../../core/Debug';
import SwitchRequest from '../SwitchRequest';
import Constants from '../../constants/Constants';
import MetricsConstants from '../../constants/MetricsConstants';
import MediaPlayerEvents from '../../MediaPlayerEvents';

function InsufficientBufferRule(config) {

    config = config || {};
    const INSUFFICIENT_BUFFER_SAFETY_FACTOR = 0.5;
    const SEGMENT_IGNORE_COUNT = 2;

    const context = this.context;
    const eventBus = EventBus(context).getInstance();
    const dashMetrics = config.dashMetrics;
    const settings = config.settings;

    let instance,
        logger,
        bufferStateDict;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        resetInitialSettings();
        eventBus.on(MediaPlayerEvents.PLAYBACK_SEEKING, _onPlaybackSeeking, instance);
        eventBus.on(Events.BYTES_APPENDED_END_FRAGMENT, _onBytesAppended, instance);
    }

    function checkConfig() {
        if (!dashMetrics || !dashMetrics.hasOwnProperty('getCurrentBufferLevel') || !dashMetrics.hasOwnProperty('getCurrentBufferState')) {
            throw new Error(Constants.MISSING_CONFIG_ERROR);
        }
    }


    /**
     * If a BUFFER_EMPTY event happens, then InsufficientBufferRule returns switchRequest.quality=0 until BUFFER_LOADED happens.
     * Otherwise InsufficientBufferRule gives a maximum bitrate depending on throughput and bufferLevel such that
     * a whole fragment can be downloaded before the buffer runs out, subject to a conservative safety factor of 0.5.
     * If the bufferLevel is low, then InsufficientBufferRule avoids rebuffering risk.
     * If the bufferLevel is high, then InsufficientBufferRule give a high MaxIndex allowing other rules to take over.
     * @param rulesContext
     * @return {object}
     */
    function getMaxIndex(rulesContext) {
        const switchRequest = SwitchRequest(context).create();

        if (!rulesContext || !rulesContext.hasOwnProperty('getMediaType')) {
            return switchRequest;
        }

        checkConfig();

        const mediaType = rulesContext.getMediaType();
        const currentBufferState = dashMetrics.getCurrentBufferState(mediaType);
        const representationInfo = rulesContext.getRepresentationInfo();
        const fragmentDuration = representationInfo.fragmentDuration;
        const streamInfo = rulesContext.getStreamInfo();
        const streamId = streamInfo ? streamInfo.id : null;

        // Don't ask for a bitrate change if there is not info about buffer state or if fragmentDuration is not defined
        if (shouldIgnore(mediaType) || !fragmentDuration) {
            return switchRequest;
        }

        if (currentBufferState && currentBufferState.state === MetricsConstants.BUFFER_EMPTY) {
            logger.debug('[' + mediaType + '] Switch to index 0; buffer is empty.');
            switchRequest.quality = 0;
            switchRequest.reason = 'InsufficientBufferRule: Buffer is empty';
        } else {
            const mediaInfo = rulesContext.getMediaInfo();
            const abrController = rulesContext.getAbrController();
            const throughputHistory = abrController.getThroughputHistory();

            const bufferLevel = dashMetrics.getCurrentBufferLevel(mediaType);
            const throughput = throughputHistory.getAverageThroughput(mediaType);
            const latency = throughputHistory.getAverageLatency(mediaType);
            const bitrate = throughput * (bufferLevel / fragmentDuration) * INSUFFICIENT_BUFFER_SAFETY_FACTOR;

            switchRequest.quality = abrController.getQualityForBitrate(mediaInfo, bitrate, streamId, latency);
            switchRequest.reason = 'InsufficientBufferRule: being conservative to avoid immediate rebuffering';
        }

        return switchRequest;

    }

    function shouldIgnore(mediaType) {
        return !settings.get().streaming.lowLatencyEnabled && bufferStateDict[mediaType].ignoreCount > 0;
    }

    function resetInitialSettings() {
        bufferStateDict = {};
        bufferStateDict[Constants.VIDEO] = { ignoreCount: SEGMENT_IGNORE_COUNT };
        bufferStateDict[Constants.AUDIO] = { ignoreCount: SEGMENT_IGNORE_COUNT };
    }

    function _onPlaybackSeeking() {
        resetInitialSettings();
    }

    function _onBytesAppended(e) {
        if (!isNaN(e.startTime) && (e.mediaType === Constants.AUDIO || e.mediaType === Constants.VIDEO)) {
            if (bufferStateDict[e.mediaType].ignoreCount > 0) {
                bufferStateDict[e.mediaType].ignoreCount--;
            }
        }
    }

    function reset() {
        resetInitialSettings();
        eventBus.off(MediaPlayerEvents.PLAYBACK_SEEKING, _onPlaybackSeeking, instance);
        eventBus.off(Events.BYTES_APPENDED_END_FRAGMENT, _onBytesAppended, instance);
    }

    instance = {
        getMaxIndex,
        reset
    };

    setup();

    return instance;
}

InsufficientBufferRule.__dashjs_factory_name = 'InsufficientBufferRule';
export default FactoryMaker.getClassFactory(InsufficientBufferRule);
