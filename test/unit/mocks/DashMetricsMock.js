function DashMetricsMock() {

    this.bufferState = null;
    this.currentDVRInfo = null;

    this.getCurrentDVRInfo = function () {
        return this.currentDVRInfo;
    };

    this.getCurrentBufferState = function () {
        return this.bufferState;
    };

    this.getCurrentBufferLevel = function () {
        return 15;
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

    this.addPlayList = function () {
    };

    this.createPlaylistTraceMetrics = function () {
    };

    this.addRepresentationSwitch = function () {
    };

    this.addDVRInfo = function (type, time, manifestInfo, range) {
        this.currentDVRInfo = {
            type: type,
            time: time,
            manifestInfo: manifestInfo,
            range: range
        };
    };

    this.resetCurrentDvrWindow = function () {
        this.currentDVRInfo = null;
    };

    this.getCurrentManifestUpdate = function () {
    };

    this.updateManifestUpdateInfo = function () {
    };

    this.getCurrentRepresentationSwitch = function () {
    };

    this.addHttpRequest = function () {
    };

    this.getLatestMPDRequestHeaderValueByID = function (/*id*/) {
        return null;
    };
}

export default DashMetricsMock;
