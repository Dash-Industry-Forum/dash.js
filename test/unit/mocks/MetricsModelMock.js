class MetricsModelMock {
    constructor() {
        this.bufferState = 0;
        this.bufferLevel = 0;
    }
    addBufferState(type, bufferState/*, bufferTarget*/) {
        this.bufferState = bufferState;
    }

    addBufferLevel(type, date, bufferLevel ) {
        this.bufferState = bufferLevel;
    }

    getReadOnlyMetricsFor() {
        return null;
    }
}

export default MetricsModelMock;