class StreamControllerMock {

    initialize() {}

    getActiveStreamCommonEarliestTime() {
        return 0;
    }

    getTimeRelativeToStreamId() {}

    isVideoTrackPresent() {
        return true;
    }

    switchToVideoElement() {

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

    getActiveStreamProcessors() { return [];}
}

export default StreamControllerMock;
