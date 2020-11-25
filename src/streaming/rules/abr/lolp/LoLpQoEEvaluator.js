/*
 * Authors:
 * Abdelhak Bentaleb | National University of Singapore | bentaleb@comp.nus.edu.sg
 * Mehmet N. Akcay | Ozyegin University | necmettin.akcay@ozu.edu.tr
 * May Lim | National University of Singapore | maylim@comp.nus.edu.sg
 *
 * [Usage]:
 * 1. Setup -
 *      let qoeEvaluator = new QoeEvaluator();
 *      qoeEvaluator.setupPerSegmentQoe(segmentDurationSec, maxBitrateKbps, minBitrateKbps);
 * 2. For each segment, log the metrics -
 *      qoeEvaluator.logSegmentMetrics(segmentBitrateKbps, segmentRebufferTimeSec, latencySec, playbackSpeed);
 * 3. To obtain the current Qoe value -
 *      let currentPerSegmentQoe = qoeEvaluator.getPerSegmentQoe(); // returns QoeInfo object
 */

import FactoryMaker from '../../../../core/FactoryMaker';
import QoeInfo from './QoeInfo';

function LoLpQoeEvaluator() {

    let instance,
        voPerSegmentQoeInfo,
        segmentDuration,
        maxBitrateKbps,
        minBitrateKbps;

    function setup() {
        _resetInitialSettings();
    }

    function _resetInitialSettings() {
        voPerSegmentQoeInfo = null;
        segmentDuration = null;
        maxBitrateKbps = null;
        minBitrateKbps = null;
    }

    function setupPerSegmentQoe(segmentDuration, maxBitrateKbps, minBitrateKbps)
    {
        // Set up Per Segment QoeInfo
        voPerSegmentQoeInfo = _createQoeInfo('segment', segmentDuration, maxBitrateKbps, minBitrateKbps);
        segmentDuration = segmentDuration;
        maxBitrateKbps = maxBitrateKbps;
        minBitrateKbps = minBitrateKbps;
    }

    function _createQoeInfo(fragmentType, fragmentDuration, maxBitrateKbps, minBitrateKbps)
    {
        /*
         * [Weights][Source: Abdelhak Bentaleb, 2020 (last updated: 30 Mar 2020)]
         * bitrateReward:           segment duration, e.g. 0.5s
         * bitrateSwitchPenalty:    0.02s or 1s if the bitrate switch is too important
         * rebufferPenalty:         max encoding bitrate, e.g. 1000kbps
         * latencyPenalty:          if L ≤ 1.1 seconds then = min encoding bitrate * 0.05, otherwise = max encoding bitrate * 0.1
         * playbackSpeedPenalty:    min encoding bitrate, e.g. 200kbps
         */

        // Create new QoeInfo object
        let qoeInfo = QoeInfo().create();
        qoeInfo.type = fragmentType;

        // Set weight: bitrateReward
        if (!fragmentDuration) qoeInfo.weights.bitrateReward = 1;      // set some safe value, else consider throwing error
        else qoeInfo.weights.bitrateReward = fragmentDuration;

        // Set weight: bitrateSwitchPenalty
        // qoeInfo.weights.bitrateSwitchPenalty = 0.02;
        qoeInfo.weights.bitrateSwitchPenalty = 1;

        // Set weight: rebufferPenalty
        if (!maxBitrateKbps) qoeInfo.weights.rebufferPenalty = 1000;   // set some safe value, else consider throwing error
        else qoeInfo.weights.rebufferPenalty = maxBitrateKbps;

        // Set weight: latencyPenalty
        qoeInfo.weights.latencyPenalty = [];
        qoeInfo.weights.latencyPenalty.push({ threshold: 1.1, penalty: (minBitrateKbps * 0.05) });
        qoeInfo.weights.latencyPenalty.push({ threshold: 100000000, penalty: (maxBitrateKbps * 0.1) });

        // Set weight: playbackSpeedPenalty
        if (!minBitrateKbps) qoeInfo.weights.playbackSpeedPenalty = 200;   // set some safe value, else consider throwing error
        else qoeInfo.weights.playbackSpeedPenalty = minBitrateKbps;

        return qoeInfo;
    }

    function logSegmentMetrics(segmentBitrate, segmentRebufferTime, currentLatency, currentPlaybackSpeed)
    {
        if (this.voPerSegmentQoeInfo) {
            this.logMetricsInQoeInfo(segmentBitrate, segmentRebufferTime, currentLatency, currentPlaybackSpeed, this.voPerSegmentQoeInfo);
        }
    }

    function _logMetricsInQoeInfo(bitrate, rebufferTime, latency, playbackSpeed, qoeInfo)
    {
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
    function getPerSegmentQoe()
    {
        return voPerSegmentQoeInfo;
    }

    // For one-time use only
    // Returns totalQoe based on a single set of metrics.
    function _calculateSingleUseQoe(segmentBitrate, segmentRebufferTime, currentLatency, currentPlaybackSpeed)
    {
        let singleUseQoeInfo = null;

        if (this.segmentDuration && this.maxBitrateKbps && this.minBitrateKbps) {
            singleUseQoeInfo = this.createQoeInfo('segment', this.segmentDuration, this.maxBitrateKbps, this.minBitrateKbps);
        }

        if (singleUseQoeInfo) {
            this.logMetricsInQoeInfo(segmentBitrate, segmentRebufferTime, currentLatency, currentPlaybackSpeed, singleUseQoeInfo);
            return singleUseQoeInfo.totalQoe;
        } else {
            // Something went wrong..
            return 0;
        }
    }

    instance = {
        setupPerSegmentQoe,
        logSegmentMetrics,
        getPerSegmentQoe
    };

    setup();

    return instance;
}

LoLpQoeEvaluator.__dashjs_factory_name = 'LoLpQoeEvaluator';
export default FactoryMaker.getClassFactory(LoLpQoeEvaluator);

