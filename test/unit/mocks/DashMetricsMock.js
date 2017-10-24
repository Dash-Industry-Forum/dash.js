function DashMetricsMock () {

    this.getCurrentDVRInfo = function () {
        return null;
    };

    this.getCurrentBufferLevel = function () {
        return 15;
    };
}

export default DashMetricsMock;