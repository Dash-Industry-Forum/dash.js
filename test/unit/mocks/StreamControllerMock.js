class StreamControllerMock {

    initialize() {
        // empty block
    }

    getActiveStreamCommonEarliestTime() {
        return 0;
    }

    getTimeRelativeToStreamId() {
        // empty block
    }

    isTrackTypePresent(trackType) {
        let value;

        switch (trackType) {
            case 'video':
                value = true;
                break;
        }

        return value;
    }

    switchToVideoElement() {
        // empty block
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

    load() {
        // empty block
    }

    loadWithManifest() {
        // empty block
    }

    setConfig() {
        // empty block
    }

    reset() {
        // empty block
    }

    getActiveStreamProcessors() { return []; }
}

export default StreamControllerMock;
