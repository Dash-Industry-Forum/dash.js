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

    this.addBufferState = function (type, bufferState/*, bufferTarget*/) {
        this.bufferState = bufferState;
    };

    this.addBufferLevel = function () {
    };

    };
}

export default DashMetricsMock;