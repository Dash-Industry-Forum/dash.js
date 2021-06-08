import StreamMock from './StreamMock';

class StreamControllerMock {

    constructor() {
    }

    setup() {
        this.streamId = 'DUMMY_STREAM-01';
        this.activeStream = new StreamMock();
    }

    initialize(streams) {
        this.streams = streams;
    }

    getStreams() {
        return this.streams;
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
            id: 'DUMMY_STREAM-01'
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

    getActiveStream() {
        return this.activeStream;
    }

    hasVideoTrack() {
        return true;
    }

}

export default StreamControllerMock;
