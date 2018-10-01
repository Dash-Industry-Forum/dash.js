import PlaybackControllerMock from './PlaybackControllerMock';

class FragmentModelMock {
    constructor() {
        this.requests = [];
    }

    getRequests() {
        return this.requests;
    }

    isFragmentLoaded() {
        return false;
    }
}

class BufferControllerMock {
    constructor() {
        this.seekStartTime = 0;
        this.isBufferingCompleted = false;
    }

    setSeekStartTime(time) {
        this.seekStartTime = time;
    }

    getIsBufferingCompleted() {
        return this.isBufferingCompleted;
    }

    getRangeAt() {
        return null;
    }

    getBuffer() {
        return {
            getAllBufferRanges: () => {}
        };
    }
}

class RepresentationControllerMock {
    constructor() {}

    getCurrentRepresentation() {
        return {adaptation: {period: {mpd: {manifest: {type: 'dynamic', Period_asArray: [{AdaptationSet_asArray: [{SegmentTemplate: {timescale: 10000000}}]}]}}, index: 0}, index: 0}};
    }
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
            mimeType: 'video/mp4',
            streamInfo: this.streamInfo
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
            },
            getSeekTarget() {
                return 1;
            },
            setSeekTarget() {
            },
            getTimeToLoadDelay() {
                return 0;
            },
            setTimeToLoadDelay() {
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

    getStreamInfo() {
        return this.streamInfo;
    }

    getRepresentationInfo(quality) {
        if (quality !== undefined) {
            let offset = quality ? 2 : 1;
            return {
                MSETimeOffset: offset
            };
        } else {
            return {mediaInfo: {type: this.type, streamInfo: this.streamInfo}, fragmentDuration: 6};
        }
    }

    isBufferingCompleted() {
        return this.bufferController.getIsBufferingCompleted();
    }

    getFragmentController() {
        return null;
    }

    getPlaybackController() {
        return new PlaybackControllerMock();
    }

    switchInitData() {}

    reset() {}
}

export default StreamProcessorMock;
