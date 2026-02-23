import AdapterMock from './AdapterMock.js';
import StreamProcessorMock from './StreamProcessorMock.js';

const TYPE_AUDIO = 'audio';
const TYPE_VIDEO = 'video';

function StreamMock() {
    this.streamInfo = {};
    this.dashAdapter = new AdapterMock();
    this.streamProcessors = [
        new StreamProcessorMock(TYPE_VIDEO),
        new StreamProcessorMock(TYPE_AUDIO)
    ];
    this._representations = {};
    this._unfilteredRepresentations = {};
}

StreamMock.prototype.initialize = function (streamInfo) {
    this.streamInfo = streamInfo;
};

StreamMock.prototype.getStreamInfo = function () {
    return this.streamInfo ? this.streamInfo : {};
};

StreamMock.prototype.setStreamInfo = function (streamInfo) {
    this.streamInfo = streamInfo;
};

StreamMock.prototype.getFragmentController = function () {
    return {
        getModel: () => {
            return {
                setStreamProcessor: () => {
                }
            };
        }
    };
};

StreamMock.prototype.getAdapter = function () {
    return this.dashAdapter;
};

StreamMock.prototype.setRegularPeriods = function (periods) {
    this.dashAdapter.setRegularPeriods(periods);
};

StreamMock.prototype.setRepresentation = function (representation) {
    this.dashAdapter.setRepresentation(representation);
};

StreamMock.prototype.getStreamProcessors = function () {
    return this.streamProcessors;
};

StreamMock.prototype.getCurrentRepresentationForType = function () {
    return null;
}

StreamMock.prototype.setRepresentationsByType = function (type, filtered, unfiltered) {
    this._representations[type] = filtered;
    this._unfilteredRepresentations[type] = unfiltered;
};

StreamMock.prototype.getRepresentationsByType = function (type, filterBySettings) {
    if (filterBySettings) {
        return this._representations[type] || [];
    }
    return this._unfilteredRepresentations[type] || [];
};

StreamMock.prototype.getBitrateListFor = function () {
    return [1, 2];
};

export default StreamMock;
