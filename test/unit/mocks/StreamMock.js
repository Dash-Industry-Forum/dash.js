function StreamMock () {
    this.getStreamInfo = function () {
        return {};
    };

    this.getFragmentController = function () {
        return { getModel: () => {
            return { setStreamProcessor: () => {} };
        } };
    };
}

export default StreamMock;