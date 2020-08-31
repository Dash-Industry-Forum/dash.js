import StreamProcessor from '../../src/streaming/StreamProcessor';
import Constants from '../../src/streaming/constants/Constants';
import EventBus from '../../src/core/EventBus';
import Events from '../../src/core/events/Events';

import ObjectsHelper from './helpers/ObjectsHelper';

import DashMetricsMock from './mocks/DashMetricsMock';
import ManifestModelMock from './mocks/ManifestModelMock';
import PlaybackControllerMock from './mocks/PlaybackControllerMock';
import AbrControllerMock from './mocks/AbrControllerMock';
import AdapterMock from './mocks/AdapterMock';

const expect = require('chai').expect;
const testType = 'video';
const objectsHelper = new ObjectsHelper();
const context = {};
const dashMetricsMock = new DashMetricsMock();
const manifestModelMock = new ManifestModelMock();
const timelineConverterMock = objectsHelper.getDummyTimelineConverter();
const playbackControllerMock = new PlaybackControllerMock();
const abrControllerMock = new AbrControllerMock();
const adapterMock = new AdapterMock();
const eventBus = EventBus(context).getInstance();

const streamInfo = {
    id: 'streamId',
    manifestInfo: {
        isDynamic: true
    }
};

describe('StreamProcessor', function () {
    describe('StreamProcessor not initialized', function () {
        let streamProcessor = null;

        beforeEach(function () {
            streamProcessor = StreamProcessor(context).create({streamInfo: streamInfo});
        });

        afterEach(function () {
            streamProcessor.reset();
        });

        it('setBufferingTime should not throw an error', function () {
            expect(streamProcessor.setBufferingTime.bind(streamProcessor)).to.not.throw();
        });

        it('getInitRequest should return null', function () {
            const initRequest = streamProcessor.getInitRequest(0);
            expect(initRequest).to.be.null; // jshint ignore:line
        });

        it('getInitRequest should throw an error when quality is not a number', function () {
            expect(streamProcessor.getInitRequest.bind(streamProcessor, {})).to.be.throw(Constants.BAD_ARGUMENT_ERROR + ' : argument is not an integer');
        });

        it('getFragmentRequest should return null', function () {
            const nextFragRequest = streamProcessor.getFragmentRequest();
            expect(nextFragRequest).to.be.null; // jshint ignore:line
        });

        it('getRepresentationInfo should throw an error when quality is not a number', function () {
            expect(streamProcessor.getRepresentationInfo.bind(streamProcessor, {})).to.be.throw(Constants.BAD_ARGUMENT_ERROR + ' : argument is not an integer');
        });
    });

    it('when a BUFFER_LEVEL_UPDATED event occurs, should update dvr info metrics', function () {
        const streamProcessor = StreamProcessor(context).create({
            streamInfo: streamInfo,
            type: testType,
            dashMetrics: dashMetricsMock,
            manifestModel: manifestModelMock,
            playbackController: playbackControllerMock,
            timelineConverter: timelineConverterMock,
            abrController: abrControllerMock,
            adapter: adapterMock
        });

        streamProcessor.initialize();

        let dvrInfo = dashMetricsMock.getCurrentDVRInfo();
        expect(dvrInfo).to.be.null; // jshint ignore:line

        eventBus.trigger(Events.BUFFER_LEVEL_UPDATED, {streamId: streamInfo.id, mediaType: testType, bufferLevel: 50});

        dvrInfo = dashMetricsMock.getCurrentDVRInfo();
        expect(dvrInfo).not.to.be.null; // jshint ignore:line
        expect(dvrInfo.type).to.equal(testType); // jshint ignore:line
    });

    it('when a BUFFER_LEVEL_UPDATED event occurs for a non active stream it should not update dvr info metrics', function () {
        streamInfo.id = 'wrongId';
        dashMetricsMock.resetCurrentDvrWindow();
        const streamProcessor = StreamProcessor(context).create({
            streamInfo: streamInfo,
            type: testType,
            dashMetrics: dashMetricsMock,
            manifestModel: manifestModelMock,
            playbackController: playbackControllerMock,
            timelineConverter: timelineConverterMock,
            abrController: abrControllerMock,
            adapter: adapterMock
        });

        streamProcessor.initialize();

        let dvrInfo = dashMetricsMock.getCurrentDVRInfo();
        expect(dvrInfo).to.be.null; // jshint ignore:line

        eventBus.trigger(Events.BUFFER_LEVEL_UPDATED, {streamId: streamInfo.id, mediaType: testType, bufferLevel: 50});

        dvrInfo = dashMetricsMock.getCurrentDVRInfo();
        expect(dvrInfo).to.be.null; // jshint ignore:line
    });
});
