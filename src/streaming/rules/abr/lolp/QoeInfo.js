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
