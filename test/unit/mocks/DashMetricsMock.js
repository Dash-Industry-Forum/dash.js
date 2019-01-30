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

    this.setBufferState = function (state) {
        this.bufferState = state;
    };
}

export default DashMetricsMock;