import ScheduleController from '../../src/streaming/controllers/ScheduleController';
import Events from '../../src/core/events/Events';
import EventBus from '../../src/core/EventBus';

import PlaybackControllerMock from './mocks/PlaybackControllerMock';
import StreamProcessorMock from './mocks/StreamProcessorMock';
import MediaPlayerModelMock from './mocks/MediaPlayerModelMock';
import AbrControllerMock from './mocks/AbrControllerMock';
import StreamControllerMock from './mocks/StreamControllerMock';
import DashMetricsMock from './mocks/DashMetricsMock';
import AdapterMock from './mocks/AdapterMock';
import Settings from '../../src/core/Settings';

const expect = require('chai').expect;
const context = {};

const eventBus = EventBus(context).getInstance();

const streamInfo = {
    id: 'id'
};
const testType = 'video';

describe('ScheduleController', function () {

    let scheduleController;
    let mediaPlayerModelMock;
    let streamProcessorMock;
    let adapterMock;
    let playbackControllerMock;
    let abrControllerMock;
    let streamControllerMock;
    let dashMetricsMock;
    let metricsModelMock;
    const settings = Settings(context).getInstance();

    beforeEach(function () {
        mediaPlayerModelMock = new MediaPlayerModelMock();
        streamProcessorMock = new StreamProcessorMock(testType, streamInfo);
        adapterMock = new AdapterMock();
        playbackControllerMock = new PlaybackControllerMock();
        abrControllerMock = new AbrControllerMock();
        streamControllerMock = new StreamControllerMock();
        dashMetricsMock = new DashMetricsMock();

        scheduleController = ScheduleController(context).create({
            type: testType,
            mediaPlayerModel: mediaPlayerModelMock,
            streamProcessor: streamProcessorMock,
            adapter: adapterMock,
            playbackController: playbackControllerMock,
            abrController: abrControllerMock,
            streamController: streamControllerMock,
            dashMetrics: dashMetricsMock,
            metricsModel: metricsModelMock,
            settings: settings
        });

        scheduleController.initialize();
    });

    afterEach(function () {
        settings.reset();
        scheduleController.reset();
        scheduleController = null;
    });

    it('should start on STREAM_INITIALIZED event', function (done) {

        let onStreamInit = function () {
            eventBus.off(Events.STREAM_INITIALIZED, onStreamInit);

            expect(scheduleController.isStarted()).to.be.true; // jshint ignore:line
            done();
        };

        eventBus.on(Events.STREAM_INITIALIZED, onStreamInit, this);

        eventBus.trigger(Events.STREAM_INITIALIZED, {
            streamInfo: streamInfo
        });
    });

    it('should return 12 if streamProcessor is defined and current representation is video and videoTrackPresent is true', function () {
        const bufferTarget = scheduleController.getBufferTarget();
        expect(bufferTarget).to.be.equal(12); // jshint ignore:line
    });

    it('should stop is controller is started', function (done) {

        let onStreamInit = function () {
            eventBus.off(Events.STREAM_INITIALIZED, onStreamInit);

            expect(scheduleController.isStarted()).to.be.true; // jshint ignore:line

            scheduleController.stop();
            expect(scheduleController.isStarted()).to.be.false; // jshint ignore:line
            done();
        };

        eventBus.on(Events.STREAM_INITIALIZED, onStreamInit, this);
        eventBus.trigger(Events.STREAM_INITIALIZED, {
            streamInfo: streamInfo
        });
    });
});
