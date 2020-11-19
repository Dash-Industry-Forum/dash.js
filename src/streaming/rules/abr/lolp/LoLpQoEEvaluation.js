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

class QoeEvaluator {

    constructor() {
        this.voPerSegmentQoeInfo = null;

        // Store in case of later use
        // e.g. in calculateSingleUseQoe()
        this.segmentDuration = null;
        this.maxBitrateKbps = null;
        this.minBitrateKbps = null;
    }

    setupPerSegmentQoe(segmentDuration, maxBitrateKbps, minBitrateKbps) {
        // Set up Per Segment QoeInfo
        this.voPerSegmentQoeInfo = this.createQoeInfo('segment', segmentDuration, maxBitrateKbps, minBitrateKbps);
        this.segmentDuration = segmentDuration;
        this.maxBitrateKbps = maxBitrateKbps;
        this.minBitrateKbps = minBitrateKbps;
    }

    createQoeInfo(fragmentType, fragmentDuration, maxBitrateKbps, minBitrateKbps) {
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

    logSegmentMetrics(segmentBitrate, segmentRebufferTime, currentLatency, currentPlaybackSpeed) {
        if (this.voPerSegmentQoeInfo) {
            this.logMetricsInQoeInfo(segmentBitrate, segmentRebufferTime, currentLatency, currentPlaybackSpeed, this.voPerSegmentQoeInfo);
        }
    }

    logMetricsInQoeInfo(bitrate, rebufferTime, latency, playbackSpeed, qoeInfo) {
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
    getPerSegmentQoe() {
        return this.voPerSegmentQoeInfo;
    }

    // For one-time use only
    // Returns totalQoe based on a single set of metrics.
    calculateSingleUseQoe(segmentBitrate, segmentRebufferTime, currentLatency, currentPlaybackSpeed) {
        let singleUseQoeInfo = null;

        if (this.segmentDuration && this.maxBitrateKbps && this.minBitrateKbps) {
            singleUseQoeInfo = this.createQoeInfo('segment', this.segmentDuration, this.maxBitrateKbps, this.minBitrateKbps);
        }

        if (singleUseQoeInfo) {
            this.logMetricsInQoeInfo(segmentBitrate, segmentRebufferTime, currentLatency, currentPlaybackSpeed, singleUseQoeInfo);
            return singleUseQoeInfo.totalQoe;
        }
        else {
            // Something went wrong..
            return 0;
        }
    }

    // copy(qoeEvaluator) {
    //     let qoeInfo = qoeEvaluator.getPerSegmentQoe();
    //     this.voPerSegmentQoeInfo = {};
    //     for (var key in qoeInfo) {
    //         if (qoeInfo.hasOwnProperty(key)) {
    //             // copy each key over
    //             this.voPerSegmentQoeInfo[key] = qoeInfo[key];
    //         }
    //     }
    // }
}

class QoeInfo {

    constructor() {
        // Type e.g. 'segment'
        this.type = null;

        // Store lastBitrate for calculation of bitrateSwitchWSum
        this.lastBitrate = null;

        // Weights for each Qoe factor
        this.weights = {};
        this.weights.bitrateReward = null;
        this.weights.bitrateSwitchPenalty = null;
        this.weights.rebufferPenalty = null;
        this.weights.latencyPenalty = null;
        this.weights.playbackSpeedPenalty = null;

        // Weighted Sum for each Qoe factor
        this.bitrateWSum = 0;           // kbps
        this.bitrateSwitchWSum = 0;     // kbps
        this.rebufferWSum = 0;          // seconds
        this.latencyWSum = 0;           // seconds
        this.playbackSpeedWSum = 0;     // e.g. 0.95, 1.0, 1.05

        // Store total Qoe value based on current Weighted Sum values
        this.totalQoe = 0;
    }
}

// Additional for run.js invocation of QoeEvaluator
if (typeof exports !== 'undefined') {
    exports.QoeEvaluator = QoeEvaluator;
    exports.QoeInfo = QoeInfo;
}
