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
import FactoryMaker from '../../../../core/FactoryMaker';
import QoeInfo from './QoeInfo';

function LoLpQoeEvaluator() {

    let instance,
        voPerSegmentQoeInfo,
        segmentDuration,
        maxBitrateKbps,
        minBitrateKbps;

    function _setup() {
        _resetInitialSettings();
    }

    function _resetInitialSettings() {
        voPerSegmentQoeInfo = null;
        segmentDuration = null;
        maxBitrateKbps = null;
        minBitrateKbps = null;
    }

    function setupPerSegmentQoe(sDuration, maxBrKbps, minBrKbps) {
        // Set up Per Segment QoeInfo
        voPerSegmentQoeInfo = _createQoeInfo('segment', sDuration, maxBrKbps, minBrKbps);
        segmentDuration = sDuration;
        maxBitrateKbps = maxBrKbps;
        minBitrateKbps = minBrKbps;
    }

    function _createQoeInfo(fragmentType, fragmentDuration, maxBitrateKbps, minBitrateKbps) {
        /*
         * [Weights][Source: Abdelhak Bentaleb, 2020 (last updated: 30 Mar 2020)]
         * bitrateReward:           segment duration, e.g. 0.5s
         * bitrateSwitchPenalty:    0.02s or 1s if the bitrate switch is too important
         * rebufferPenalty:         max encoding bitrate, e.g. 1000kbps
         * latencyPenalty:          if L ≤ 1.1 seconds then = min encoding bitrate * 0.05, otherwise = max encoding bitrate * 0.1
         * playbackSpeedPenalty:    min encoding bitrate, e.g. 200kbps
         */

        // Create new QoeInfo object
        let qoeInfo = new QoeInfo();
        qoeInfo.type = fragmentType;

        // Set weight: bitrateReward
        // set some safe value, else consider throwing error
        if (!fragmentDuration) {
            qoeInfo.weights.bitrateReward = 1;
        }
        else {
            qoeInfo.weights.bitrateReward = fragmentDuration;
        }

        // Set weight: bitrateSwitchPenalty
        // qoeInfo.weights.bitrateSwitchPenalty = 0.02;
        qoeInfo.weights.bitrateSwitchPenalty = 1;

        // Set weight: rebufferPenalty
        // set some safe value, else consider throwing error
        if (!maxBitrateKbps) {
            qoeInfo.weights.rebufferPenalty = 1000;
        }
        else {
            qoeInfo.weights.rebufferPenalty = maxBitrateKbps;
        }

        // Set weight: latencyPenalty
        qoeInfo.weights.latencyPenalty = [];
        qoeInfo.weights.latencyPenalty.push({ threshold: 1.1, penalty: (minBitrateKbps * 0.05) });
        qoeInfo.weights.latencyPenalty.push({ threshold: 100000000, penalty: (maxBitrateKbps * 0.1) });

        // Set weight: playbackSpeedPenalty
        if (!minBitrateKbps) qoeInfo.weights.playbackSpeedPenalty = 200;   // set some safe value, else consider throwing error
        else qoeInfo.weights.playbackSpeedPenalty = minBitrateKbps;

        return qoeInfo;
    }

    function logSegmentMetrics(segmentBitrate, segmentRebufferTime, currentLatency, currentPlaybackSpeed) {
        if (voPerSegmentQoeInfo) {
            _logMetricsInQoeInfo(segmentBitrate, segmentRebufferTime, currentLatency, currentPlaybackSpeed, voPerSegmentQoeInfo);
        }
    }

    function _logMetricsInQoeInfo(bitrate, rebufferTime, latency, playbackSpeed, qoeInfo) {
        // Update: bitrate Weighted Sum value
        qoeInfo.bitrateWSum += (qoeInfo.weights.bitrateReward * bitrate);

        // Update: bitrateSwitch Weighted Sum value
        if (qoeInfo.lastBitrate) {
            qoeInfo.bitrateSwitchWSum += (qoeInfo.weights.bitrateSwitchPenalty * Math.abs(bitrate - qoeInfo.lastBitrate));
        }
        qoeInfo.lastBitrate = bitrate;

        // Update: rebuffer Weighted Sum value
        qoeInfo.rebufferWSum += (qoeInfo.weights.rebufferPenalty * rebufferTime);

        // Update: latency Weighted Sum value
        for (let i = 0; i < qoeInfo.weights.latencyPenalty.length; i++) {
            let latencyRange = qoeInfo.weights.latencyPenalty[i];
            if (latency <= latencyRange.threshold) {
                qoeInfo.latencyWSum += (latencyRange.penalty * latency);
                break;
            }
        }

        // Update: playbackSpeed Weighted Sum value
        qoeInfo.playbackSpeedWSum += (qoeInfo.weights.playbackSpeedPenalty * Math.abs(1 - playbackSpeed));

        // Update: Total Qoe value
        qoeInfo.totalQoe = qoeInfo.bitrateWSum - qoeInfo.bitrateSwitchWSum - qoeInfo.rebufferWSum - qoeInfo.latencyWSum - qoeInfo.playbackSpeedWSum;
    }

    // Returns current Per Segment QoeInfo
    function getPerSegmentQoe() {
        return voPerSegmentQoeInfo;
    }

    // For one-time use only
    // Returns totalQoe based on a single set of metrics.
    function calculateSingleUseQoe(segmentBitrate, segmentRebufferTime, currentLatency, currentPlaybackSpeed) {
        let singleUseQoeInfo = null;

        if (segmentDuration && maxBitrateKbps && minBitrateKbps) {
            singleUseQoeInfo = _createQoeInfo('segment', segmentDuration, maxBitrateKbps, minBitrateKbps);
        }

        if (singleUseQoeInfo) {
            _logMetricsInQoeInfo(segmentBitrate, segmentRebufferTime, currentLatency, currentPlaybackSpeed, singleUseQoeInfo);
            return singleUseQoeInfo.totalQoe;
        } else {
            // Something went wrong..
            return 0;
        }
    }

    function reset() {
        _resetInitialSettings();
    }

    instance = {
        setupPerSegmentQoe,
        logSegmentMetrics,
        getPerSegmentQoe,
        calculateSingleUseQoe,
        reset
    };

    _setup();

    return instance;
}

LoLpQoeEvaluator.__dashjs_factory_name = 'LoLpQoeEvaluator';
export default FactoryMaker.getClassFactory(LoLpQoeEvaluator);

