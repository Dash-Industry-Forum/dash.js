import ScheduleController from '../../src/streaming/controllers/ScheduleController';
import Events from '../../src/core/events/Events';
import EventBus from '../../src/core/EventBus';

import StreamProcessorMock from './mocks/StreamProcessorMock';
const expect = require('chai').expect;
const context = {};

const eventBus = EventBus(context).getInstance();

const streamInfo = {
    id: 'id'
};

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
const testType = 'video';

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
        streamProcessorMock = new StreamProcessorMock(testType, streamInfo);
        dashManifestModelMock = new DashManifestModelMock();
        playbackControllerMock = new PlaybackControllerMock();

        scheduleController = ScheduleController(context).create({
            type: testType,
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
