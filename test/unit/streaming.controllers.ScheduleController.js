import ScheduleController from '../../src/streaming/controllers/ScheduleController';
import Events from '../../src/core/events/Events';
import EventBus from '../../src/core/EventBus';

import PlaybackControllerMock from './mocks/PlaybackControllerMock';
import StreamProcessorMock from './mocks/StreamProcessorMock';
import MediaPlayerModelMock from './mocks/MediaPlayerModelMock';
import DashManifestModelMock from './mocks/DashManifestModelMock';
import AbrControllerMock from './mocks/AbrControllerMock';
import StreamControllerMock from './mocks/StreamControllerMock';
import DashMetricsMock from './mocks/DashMetricsMock';
import MetricsModelMock from './mocks/MetricsModelMock';

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
    let dashManifestModelMock;
    let playbackControllerMock;
    let abrControllerMock;
    let streamControllerMock;
    let dashMetricsMock;
    let metricsModelMock;

    beforeEach(function () {
        mediaPlayerModelMock = new MediaPlayerModelMock();
        streamProcessorMock = new StreamProcessorMock(testType, streamInfo);
        dashManifestModelMock = new DashManifestModelMock();
        playbackControllerMock = new PlaybackControllerMock();
        abrControllerMock = new AbrControllerMock();
        streamControllerMock = new StreamControllerMock();
        dashMetricsMock = new DashMetricsMock();
        metricsModelMock = new MetricsModelMock();

        scheduleController = ScheduleController(context).create({
            type: testType,
            mediaPlayerModel: mediaPlayerModelMock,
            streamProcessor: streamProcessorMock,
            dashManifestModel: dashManifestModelMock,
            playbackController: playbackControllerMock,
            abrController: abrControllerMock,
            streamController: streamControllerMock,
            dashMetrics: dashMetricsMock,
            metricsModel: metricsModelMock
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

            expect(scheduleController.isStarted()).to.be.true; // jshint ignore:line
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
