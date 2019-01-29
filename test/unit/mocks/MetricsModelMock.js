function MetricsModelMock () {

    this.bufferState = 0;
    this.bufferLevel = 0;

    this.addBufferState = function (type, bufferState/*, bufferTarget*/) {
        this.bufferState = bufferState;
    };

    this.addBufferLevel = function (type, date, bufferLevel) {
        this.bufferState = bufferLevel;
    };

    this.clearAllCurrentMetrics = function () {

    };

    this.getMetricsFor = function (type, readOnly) {
        if (readOnly) {
            return {
                BufferState: ['bufferStalled']
            };
        } else {
            return;
        }
    };
}

export default MetricsModelMock;
