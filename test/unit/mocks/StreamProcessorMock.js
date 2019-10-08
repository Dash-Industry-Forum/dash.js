import RepresentationControllerMock from './RepresentationControllerMock';

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
            getAllBufferRanges: () => {},
            hasDiscontinuitiesAfter: () => {return false;}
        };
    }
}

function StreamProcessorMock (testType, streamInfo) {
    this.type = testType;
    this.streamInfo = streamInfo;
    this.representationController = new RepresentationControllerMock();
    this.fragmentModel = new FragmentModelMock();
    this.bufferController = new BufferControllerMock();

    this.getFragmentRequest = function () {
        return {startTime: 0,
            duration: 2};
    };

    this.getBufferController = function () {
        return this.bufferController;
    };

    this.getType = function () {
        return this.type;
    };

    this.getCurrentTrack = function () {};

    this.getMediaInfo = function () {
        return {
            bitrateList: [],
            mimeType: 'video/mp4',
            streamInfo: this.streamInfo
        };
    };

    this.getScheduleController = function () {
        return {
            getBufferTarget() {
                return 20;
            },
            setSeekTarget() {
            },
            setTimeToLoadDelay() {
            }
        };
    };

    this.getRepresentationController = function () {
        return this.representationController;
    };

    this.getFragmentModel = function () {
        return this.fragmentModel;
    };

    this.isDynamic = function () {
        return true;
    };

    this.getStreamInfo = function () {
        return this.streamInfo;
    };

    this.getRepresentationInfo = function (quality) {
        if (quality !== undefined) {
            let offset = quality ? 2 : 1;
            return {
                MSETimeOffset: offset
            };
        } else {
            return {mediaInfo: {type: this.type, streamInfo: this.streamInfo}, fragmentDuration: 6};
        }
    };

    this.isBufferingCompleted = function () {
        return this.bufferController.getIsBufferingCompleted();
    };

    this.switchInitData = function () {};

    this.reset = function () {};
}

export default StreamProcessorMock;
