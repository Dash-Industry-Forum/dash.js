function MetricsModelMock () {

    this.bufferState = 0;
    this.bufferLevel = 0;
    this.metrics = null;

    this.addBufferState = function (type, bufferState/*, bufferTarget*/) {
        this.bufferState = bufferState;
    };

    this.addBufferLevel = function (type, date, bufferLevel) {
        this.bufferState = bufferLevel;
    };

    this.clearAllCurrentMetrics = function () {
        this.metrics = null;
    };

    this.setMetrics = function (metrics) {
        this.metrics = metrics;
    };

    this.getMetricsFor = function (/*type, readOnly*/) {
        return this.metrics;
    };
}

export default MetricsModelMock;
