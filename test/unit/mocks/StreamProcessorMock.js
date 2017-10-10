class FragmentModelMock {
    constructor() {
        this.requests = [];
    }

    getRequests() {
        return this.requests;
    }
}

class BufferControllerMock {
    constructor() {
        this.seekStartTime = 0;
    }

    setSeekStartTime(time) {
        this.seekStartTime = time;
    }

    isBufferingCompleted() {
        return false;
    }
}

class RepresentationControllerMock {
    constructor() {}
}

class StreamProcessorMock {
    constructor(testType, streamInfo) {
        this.type = testType;
        this.streamInfo = streamInfo;
        this.representationController = new RepresentationControllerMock();
        this.fragmentModel = new FragmentModelMock();
        this.bufferController = new BufferControllerMock();
    }

    getBufferController() {
        return this.bufferController;
    }

    getType() {
        return this.type;
    }

    getCurrentTrack() {}

    getMediaInfo() {
        return {
            bitrateList: [],
            mimeType: 'video/mp4'
        };
    }

    getIndexHandler() {
        return {
            updateRepresentation: () => {}
        };
    }

    getScheduleController() {
        return {
            getBufferTarget() {
                return 20;
            }
        };
    }

    getRepresentationController() {
        return this.representationController;
    }

    getFragmentModel() {
        return this.fragmentModel;
    }

    isDynamic() {
        return true;
    }

    getRepresentationInfoForQuality(quality) {
        let offest = quality ? 2 : 1;
        return {
            MSETimeOffset: offest
        };
    }

    getStreamInfo() {
        return this.streamInfo;
    }

    getCurrentRepresentationInfo() {
        return {mediaInfo: {type: this.type}};
    }

    isBufferingCompleted() {
        return this.bufferController.isBufferingCompleted();
    }

    getFragmentController() {
        return null;
    }

    switchInitData() {}

    reset() {}
}

export default StreamProcessorMock;