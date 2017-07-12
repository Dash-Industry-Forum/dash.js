import ScheduleController from '../../src/streaming/controllers/ScheduleController';
import Events from '../../src/core/events/Events';
import EventBus from '../../src/core/EventBus';

const expect = require('chai').expect;
const context = {};

const eventBus = EventBus(context).getInstance();

const streamInfo = {
    id: 'id'
};

const currentRepresentationInfo = {};

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
        this.seekStartTime = time
    }

    isBufferingCompleted() {
        return false;
    }
}

class StreamProcessorMock {
    constructor() {
        this.fragmentModel = new FragmentModelMock();
        this.bufferController = new BufferControllerMock();
    }

    getFragmentModel() {
        return this.fragmentModel;
    }

    getBufferController() {
        return this.bufferController;
    }

    getStreamInfo() {
        return streamInfo;
    }

    getCurrentRepresentationInfo() {
        return currentRepresentationInfo;
    }

    isBufferingCompleted() {
        return this.bufferController.isBufferingCompleted();
    }

}

class PlaybackControllerMock {
    constructor() {
        this.isDynamic = false;
        this.time = 0;
        this.startTime = 0;
    }

    getIsDynamic() {
        return this.isDynamic;
    }

    getTime() {
        return this.time;
    }

    getStreamStartTime() {
        return this.startTime;
    }
}
class MediaPlayerModelMock {

    constructor() {
        this.scheduleWhilePaused = false;

    }
    getScheduleWhilePaused() {
        return this.scheduleWhilePaused;
    }
}

class DashManifestModelMock {

    constructor() {}

    getIsTextTrack() {
        return false;
    }
}

describe('ScheduleController', function () {

    let scheduleController;
    let mediaPlayerModelMock;
    let streamProcessorMock;
    let dashManifestModelMock;
    let playbackControllerMock;

    beforeEach(function () {
        mediaPlayerModelMock = new MediaPlayerModelMock();
        streamProcessorMock = new StreamProcessorMock();
        dashManifestModelMock = new DashManifestModelMock();
        playbackControllerMock = new PlaybackControllerMock();

        scheduleController = ScheduleController(context).create({
            type: 'video',
            mediaPlayerModel: mediaPlayerModelMock,
            streamProcessor: streamProcessorMock,
            dashManifestModel: dashManifestModelMock,
            playbackController: playbackControllerMock
        });

        scheduleController.initialize();
    });

    afterEach(function () {
        scheduleController.reset();
        scheduleController = null;
    });

    it('should start on STREAM_INITIALIZED event', function (done) {

        let onStreamInit = function () {
            eventBus.off(Events.STREAM_INITIALIZED, onStreamInit);

            expect(scheduleController.isStarted()).to.be.true;
            done();
        };

        eventBus.on(Events.STREAM_INITIALIZED, onStreamInit, this);

        eventBus.trigger(Events.STREAM_INITIALIZED, {
            streamInfo: streamInfo
        });
    });

    it('should stop is controller is started', function (done) {

        let onStreamInit = function () {
            eventBus.off(Events.STREAM_INITIALIZED, onStreamInit);

            expect(scheduleController.isStarted()).to.be.true;

            scheduleController.stop();
            expect(scheduleController.isStarted()).to.be.false;
            done();
        };

        eventBus.on(Events.STREAM_INITIALIZED, onStreamInit, this);
        eventBus.trigger(Events.STREAM_INITIALIZED, {
            streamInfo: streamInfo
        });
    });
});
