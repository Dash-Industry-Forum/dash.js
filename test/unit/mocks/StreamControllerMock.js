class StreamControllerMock {

    constructor() {
    }

    setup() {
        this.streamId = 'streamId';
    }

    initialize() {
    }

    getActiveStreamCommonEarliestTime() {
        return 0;
    }

    getTimeRelativeToStreamId() {
    }

    isTrackTypePresent(trackType) {
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
            id: 'streamId'
        };
    }

    setStreamId(id) {
        this.streamId = id;
    }


    isStreamActive() {
        return true;
    }

    getStreamById() {
        return {
            id: this.streamId,
            getBitrateListFor: function () {
                return [1, 2];
            }
        };
    }

    load() {
    }

    loadWithManifest() {
    }

    setConfig() {
    }

    reset() {
    }

    getActiveStreamProcessors() {
        return [];
    }
}

export default StreamControllerMock;
