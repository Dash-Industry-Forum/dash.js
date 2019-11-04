function StreamMock (streamId) {
    this.id = streamId;

    this.getStreamInfo = function () {
        return {id: 'streamId'};
    };
}

export default StreamMock;