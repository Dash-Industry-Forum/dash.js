import AdapterMock from './AdapterMock';

function StreamMock () {

    this.streamInfo = {};
    this.dashAdapter = new AdapterMock();
}

StreamMock.prototype.getStreamInfo = function () {
    return this.streamInfo;
};

StreamMock.prototype.setStreamInfo = function (streamInfo) {
    this.streamInfo = streamInfo;
};

StreamMock.prototype.getFragmentController = function () {
    return { getModel: () => {
            return { setStreamProcessor: () => {} };
        } };
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





export default StreamMock;
