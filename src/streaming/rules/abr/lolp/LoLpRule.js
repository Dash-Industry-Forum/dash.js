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

/**
 * Authors:
 * Abdelhak Bentaleb | National University of Singapore | bentaleb@comp.nus.edu.sg
 * Mehmet N. Akcay | Ozyegin University | necmettin.akcay@ozu.edu.tr
 * May Lim | National University of Singapore | maylim@comp.nus.edu.sg
 */

import Debug from '../../../../core/Debug';
import FactoryMaker from '../../../../core/FactoryMaker';
import LearningAbrController from './LearningAbrController';
import LoLpQoeEvaluator from './LoLpQoEEvaluator';
import SwitchRequest from '../../SwitchRequest';
import MetricsConstants from '../../../constants/MetricsConstants';
import LoLpWeightSelector from './LoLpWeightSelector';
import Constants from '../../../constants/Constants';

const DWS_TARGET_LATENCY = 1.5;
const DWS_BUFFER_MIN = 0.3;

function LoLPRule(config) {

    config = config || {};

    let dashMetrics = config.dashMetrics;
    let context = this.context;

    let logger,
        instance,
        learningController,
        qoeEvaluator;

    function _setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        learningController = LearningAbrController(context).create();
        qoeEvaluator = LoLpQoeEvaluator(context).create();
    }

    function getMaxIndex(rulesContext) {
        try {
            let switchRequest = SwitchRequest(context).create();
            let mediaType = rulesContext.getMediaInfo().type;
            let abrController = rulesContext.getAbrController();
            const streamInfo = rulesContext.getStreamInfo();
            let currentQuality = abrController.getQualityFor(mediaType, streamInfo.id);
            const mediaInfo = rulesContext.getMediaInfo();
            const bufferStateVO = dashMetrics.getCurrentBufferState(mediaType);
            const scheduleController = rulesContext.getScheduleController();
            const currentBufferLevel = dashMetrics.getCurrentBufferLevel(mediaType, true);
            const isDynamic = streamInfo && streamInfo.manifestInfo ? streamInfo.manifestInfo.isDynamic : null;
            const playbackController = scheduleController.getPlaybackController();
            let latency = playbackController.getCurrentLiveLatency();

            if (!rulesContext.useLoLPABR() || (mediaType === Constants.AUDIO)) {
                return switchRequest;
            }

            if (!latency) {
                latency = 0;
            }

            const playbackRate = playbackController.getPlaybackRate();
            const throughputHistory = abrController.getThroughputHistory();
            const throughput = throughputHistory.getSafeAverageThroughput(mediaType, isDynamic);
            logger.debug(`Throughput ${Math.round(throughput)} kbps`);

            if (isNaN(throughput) || !bufferStateVO) {
                return switchRequest;
            }

            if (abrController.getAbandonmentStateFor(streamInfo.id, mediaType) === MetricsConstants.ABANDON_LOAD) {
                return switchRequest;
            }

            // QoE parameters
            let bitrateList = mediaInfo.bitrateList;  // [{bandwidth: 200000, width: 640, height: 360}, ...]
            let segmentDuration = rulesContext.getRepresentationInfo().fragmentDuration;
            let minBitrateKbps = bitrateList[0].bandwidth / 1000.0;                         // min bitrate level
            let maxBitrateKbps = bitrateList[bitrateList.length - 1].bandwidth / 1000.0;    // max bitrate level
            for (let i = 0; i < bitrateList.length; i++) {  // in case bitrateList is not sorted as expected
                let b = bitrateList[i].bandwidth / 1000.0;
                if (b > maxBitrateKbps)
                    maxBitrateKbps = b;
                else if (b < minBitrateKbps) {
                    minBitrateKbps = b;
                }
            }

            // Learning rule pre-calculations
            let currentBitrate = bitrateList[currentQuality].bandwidth;
            let currentBitrateKbps = currentBitrate / 1000.0;
            let httpRequest = dashMetrics.getCurrentHttpRequest(mediaType, true);
            let lastFragmentDownloadTime = (httpRequest.tresponse.getTime() - httpRequest.trequest.getTime()) / 1000;
            let segmentRebufferTime = lastFragmentDownloadTime > segmentDuration ? lastFragmentDownloadTime - segmentDuration : 0;
            qoeEvaluator.setupPerSegmentQoe(segmentDuration, maxBitrateKbps, minBitrateKbps);
            qoeEvaluator.logSegmentMetrics(currentBitrateKbps, segmentRebufferTime, latency, playbackRate);

            /*
            * Dynamic Weights Selector (step 1/2: initialization)
            */
            let dynamicWeightsSelector = LoLpWeightSelector(context).create({
                targetLatency: DWS_TARGET_LATENCY,
                bufferMin: DWS_BUFFER_MIN,
                segmentDuration,
                qoeEvaluator
            });

            /*
             * Select next quality
             */
            switchRequest.quality = learningController.getNextQuality(mediaInfo, throughput * 1000, latency, currentBufferLevel, playbackRate, currentQuality, dynamicWeightsSelector);
            switchRequest.reason = { throughput: throughput, latency: latency };
            switchRequest.priority = SwitchRequest.PRIORITY.STRONG;

            scheduleController.setTimeToLoadDelay(0);

            if (switchRequest.quality !== currentQuality) {
                console.log('[TgcLearningRule][' + mediaType + '] requesting switch to index: ', switchRequest.quality, 'Average throughput', Math.round(throughput), 'kbps');
            }

            return switchRequest;
        } catch (e) {
            throw e;
        }
    }

    /**
     * Reset objects to their initial state
     * @private
     */
    function _resetInitialSettings() {
        learningController.reset();
        qoeEvaluator.reset();
    }

    /**
     * Reset the rule
     */
    function reset() {
        _resetInitialSettings();
    }

    instance = {
        getMaxIndex,
        reset
    };

    _setup();

    return instance;
}

LoLPRule.__dashjs_factory_name = 'LoLPRule';
export default FactoryMaker.getClassFactory(LoLPRule);
