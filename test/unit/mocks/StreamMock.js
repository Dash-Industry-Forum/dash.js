function StreamMock () {

    this.streamInfo = {};


    this.getStreamInfo = function () {
        return this.streamInfo;
    };

    this.setStreamInfo = function (streamInfo) {
        this.streamInfo = streamInfo;
    };

    this.getFragmentController = function () {
        return { getModel: () => {
            return { setStreamProcessor: () => {} };
        } };
    };
}

export default StreamMock;
