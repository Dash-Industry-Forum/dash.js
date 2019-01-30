function DashMetricsMock () {

    this.getCurrentDVRInfo = function () {
        return null;
    };

    this.getCurrentBufferLevel = function () {
        return 15;
    };

    this.getLatestBufferLevelVO = function () {
        return null;
    };
}

export default DashMetricsMock;