function StreamMock (streamId) {
    this.id = streamId;

    this.getStreamInfo = function () {
        return {id: 'streamId'};
    };

    this.getFragmentController = function () {
        return { getModel: () => {
            return {
                        getRequests: () => {return [];}
                    };
        }
     };
    };
}

export default StreamMock;