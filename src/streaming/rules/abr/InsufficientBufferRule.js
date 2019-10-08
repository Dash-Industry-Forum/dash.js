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

function InsufficientBufferRule(config) {

    config = config || {};
    const INSUFFICIENT_BUFFER_SAFETY_FACTOR = 0.5;

    const context = this.context;

    const eventBus = EventBus(context).getInstance();
    const dashMetrics = config.dashMetrics;

    let instance,
        logger,
        bufferStateDict;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        resetInitialSettings();
        eventBus.on(Events.PLAYBACK_SEEKING, onPlaybackSeeking, instance);
    }

    function checkConfig() {
        if (!dashMetrics || !dashMetrics.hasOwnProperty('getCurrentBufferLevel') || !dashMetrics.hasOwnProperty('getLatestBufferInfoVO')) {
            throw new Error(Constants.MISSING_CONFIG_ERROR);
        }
    }
    /*
     * InsufficientBufferRule does not kick in before the first BUFFER_LOADED event happens. This is reset at every seek.
     *
     * If a BUFFER_EMPTY event happens, then InsufficientBufferRule returns switchRequest.quality=0 until BUFFER_LOADED happens.
     *
     * Otherwise InsufficientBufferRule gives a maximum bitrate depending on throughput and bufferLevel such that
     * a whole fragment can be downloaded before the buffer runs out, subject to a conservative safety factor of 0.5.
     * If the bufferLevel is low, then InsufficientBufferRule avoids rebuffering risk.
     * If the bufferLevel is high, then InsufficientBufferRule give a high MaxIndex allowing other rules to take over.
     */
    function getMaxIndex (rulesContext) {
        const switchRequest = SwitchRequest(context).create();

        if (!rulesContext || !rulesContext.hasOwnProperty('getMediaType')) {
            return switchRequest;
        }

        checkConfig();

        const mediaType = rulesContext.getMediaType();
        const lastBufferStateVO = dashMetrics.getLatestBufferInfoVO(mediaType, true, MetricsConstants.BUFFER_STATE);
        const representationInfo = rulesContext.getRepresentationInfo();
        const fragmentDuration = representationInfo.fragmentDuration;

        // Don't ask for a bitrate change if there is not info about buffer state or if fragmentDuration is not defined
        if (!lastBufferStateVO || !wasFirstBufferLoadedEventTriggered(mediaType, lastBufferStateVO) || !fragmentDuration) {
            return switchRequest;
        }

        if (lastBufferStateVO.state === MetricsConstants.BUFFER_EMPTY) {
            logger.debug('[' + mediaType + '] Switch to index 0; buffer is empty.');
            switchRequest.quality = 0;
            switchRequest.reason = 'InsufficientBufferRule: Buffer is empty';
        } else {
            const mediaInfo = rulesContext.getMediaInfo();
            const abrController = rulesContext.getAbrController();
            const throughputHistory = abrController.getThroughputHistory();

            const bufferLevel = dashMetrics.getCurrentBufferLevel(mediaType, true);
            const throughput = throughputHistory.getAverageThroughput(mediaType);
            const latency = throughputHistory.getAverageLatency(mediaType);
            const bitrate = throughput * (bufferLevel / fragmentDuration) * INSUFFICIENT_BUFFER_SAFETY_FACTOR;

            switchRequest.quality = abrController.getQualityForBitrate(mediaInfo, bitrate, latency);
            switchRequest.reason = 'InsufficientBufferRule: being conservative to avoid immediate rebuffering';
        }

        return switchRequest;
    }

    function wasFirstBufferLoadedEventTriggered(mediaType, currentBufferState) {
        bufferStateDict[mediaType] = bufferStateDict[mediaType] || {};

        let wasTriggered = false;
        if (bufferStateDict[mediaType].firstBufferLoadedEvent) {
            wasTriggered = true;
        } else if (currentBufferState && currentBufferState.state === MetricsConstants.BUFFER_LOADED) {
            bufferStateDict[mediaType].firstBufferLoadedEvent = true;
            wasTriggered = true;
        }
        return wasTriggered;
    }

    function resetInitialSettings() {
        bufferStateDict = {};
    }

    function onPlaybackSeeking() {
        resetInitialSettings();
    }

    function reset() {
        resetInitialSettings();
        eventBus.off(Events.PLAYBACK_SEEKING, onPlaybackSeeking, instance);
    }

    instance = {
        getMaxIndex: getMaxIndex,
        reset: reset
    };

    setup();

    return instance;
}

InsufficientBufferRule.__dashjs_factory_name = 'InsufficientBufferRule';
export default FactoryMaker.getClassFactory(InsufficientBufferRule);
