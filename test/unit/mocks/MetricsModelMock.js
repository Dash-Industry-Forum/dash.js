function MetricsModelMock () {

    this.bufferState = 0;
    this.bufferLevel = 0;

    this.addBufferState = function (type, bufferState/*, bufferTarget*/) {
        this.bufferState = bufferState;
    };

    this.addBufferLevel = function (type, date, bufferLevel) {
        this.bufferState = bufferLevel;
    };

    this.getReadOnlyMetricsFor = function () {
        return {
            BufferState: ['bufferStalled']
        };
    };
}

export default MetricsModelMock;
