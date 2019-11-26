class StreamControllerMock {

    initialize() {}

    getActiveStreamCommonEarliestTime() {
        return 0;
    }

    getTimeRelativeToStreamId() {}

    isTrackTypePresent (trackType) {
        let value;

        switch (trackType) {
            case 'video' :
                value = true;
                break;
        }

        return value;
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
