function DashMetricsMock () {

    this.bufferState = null;

    this.getCurrentDVRInfo = function () {
        return null;
    };

    this.getCurrentBufferLevel = function () {
        return 15;
    };

    this.getLatestBufferInfoVO = function () {
        return this.bufferState;
    };

    this.addSchedulingInfo = function () {

    };

    this.addRequestsQueue = function () {

    };

    this.addBufferState = function (type, bufferState/*, bufferTarget*/) {
        this.bufferState = bufferState;
    };

    this.addBufferLevel = function () {
    };

    this.clearAllCurrentMetrics = function () {
    };

    this.addDroppedFrames = function () {
    };
}

export default DashMetricsMock;