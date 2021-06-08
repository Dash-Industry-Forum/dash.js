import AdapterMock from './AdapterMock';
import StreamProcessorMock from './StreamProcessorMock';

const TYPE_AUDIO = 'audio';
const TYPE_VIDEO = 'video';

function StreamMock() {
    this.streamInfo = {};
    this.dashAdapter = new AdapterMock();
    this.streamProcessors = [
        new StreamProcessorMock(TYPE_VIDEO),
        new StreamProcessorMock(TYPE_AUDIO)
    ];
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

StreamMock.prototype.getProcessors = function () {
    return this.streamProcessors;
};

export default StreamMock;
