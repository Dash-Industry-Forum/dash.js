function StreamMock () {

    this.initialize = function (streamInfo) {
        this.streamInfo = streamInfo;
    };

    this.getStreamInfo = function () {
        return this.streamInfo ? this.streamInfo : {};
    };

    this.getFragmentController = function () {
        return { getModel: () => {
            return { setStreamProcessor: () => {} };
        } };
    };
}

export default StreamMock;
