class StreamControllerMock {

    initialize() {}

    getActiveStreamCommonEarliestTime() {
        return 0;
    }

    getTimeRelativeToStreamId() {}

    isVideoTrackPresent() {
        return true;
    }

    getAutoPlay() {
        return false;
    }

    getActiveStreamInfo() {
        return {
            id: 'dummyId'
        };
    }

    isStreamActive() {
        return true;
    }

    getStreamById() {
        return {
            id: 'dummyId',
            getBitrateListFor: function () {
                return [1, 2];
            }
        };
    }

    load() {}

    loadWithManifest() {}

    setConfig() {}

    reset() {}
}

export default StreamControllerMock;
