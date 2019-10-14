import StreamProcessor from '../../src/streaming/StreamProcessor';
import Constants from '../../src/streaming/constants/Constants';
import EventBus from '../../src/core/EventBus';
import Events from '../../src/core/events/Events';
import MediaPlayerEvents from '../../src/streaming/MediaPlayerEvents';

import ObjectsHelper from './helpers/ObjectsHelper';

import DashMetricsMock from './mocks/DashMetricsMock';
import ManifestModelMock from './mocks/ManifestModelMock';
import PlaybackControllerMock from './mocks/PlaybackControllerMock';
import AbrControllerMock from './mocks/AbrControllerMock';
import StreamMock from './mocks/StreamMock';
import AdapterMock from './mocks/AdapterMock';

const expect = require('chai').expect;
const testType = 'video';
let streamProcessor;
const objectsHelper = new ObjectsHelper();
const context = {};
const dashMetricsMock = new DashMetricsMock();
const manifestModelMock = new ManifestModelMock();
const timelineConverterMock = objectsHelper.getDummyTimelineConverter();
const playbackControllerMock = new PlaybackControllerMock();
const abrControllerMock = new AbrControllerMock();
const streamMock = new StreamMock('streamId');
const adapterMock = new AdapterMock();
const eventBus = EventBus(context).getInstance();

Events.extend(MediaPlayerEvents);

describe('StreamProcessor', function () {
    describe('Not well initialized', function () {
        beforeEach(function () {
            streamProcessor = StreamProcessor(context).create({});
        });

        afterEach(function () {
            streamProcessor.reset();
        });

        it('should return NaN when getIndexHandlerTime is called and streamProcessor is defined, without its attributes', function () {
            const time = streamProcessor.getIndexHandlerTime();

            expect(time).to.be.NaN; // jshint ignore:line
        });

        it('should not throw an error when setIndexHandlerTime is called and indexHandler is undefined', function () {
            expect(streamProcessor.setIndexHandlerTime.bind(streamProcessor)).to.not.throw();
        });

        it('should return null when getFragmentRequest is called and without parameters', function () {
            const nextFragRequest = streamProcessor.getFragmentRequest();

            expect(nextFragRequest).to.be.null;                // jshint ignore:line
        });

        describe('representationController parameter is properly defined, without its attributes', () => {
            it('should throw an error when getRepresentationInfo is called and representationController parameter is defined, but quality is not a number', function () {
                expect(streamProcessor.getRepresentationInfo.bind(streamProcessor, {})).to.be.throw(Constants.BAD_ARGUMENT_ERROR + ' : argument is not an integer');
            });
        });
    });

    describe('Well initialized', function () {
        beforeEach(function () {
            streamProcessor = StreamProcessor(context).create({type: testType,
                dashMetrics: dashMetricsMock,
                manifestModel: manifestModelMock,
                playbackController: playbackControllerMock,
                timelineConverter: timelineConverterMock,
                abrController: abrControllerMock,
                adapter: adapterMock,
                stream: streamMock});
        });

        afterEach(function () {
            streamProcessor.reset();
        });

        it('when a BUFFER_LEVEL_UPDATED event occurs, should update dvr info metrics', function () {
            streamProcessor.initialize();

            let dvrInfo = dashMetricsMock.getCurrentDVRInfo();
            expect(dvrInfo).to.be.null; // jshint ignore:line

            eventBus.trigger(Events.BUFFER_LEVEL_UPDATED, { mediaType: testType, streamId: 'streamId', bufferLevel: 50 });

            dvrInfo = dashMetricsMock.getCurrentDVRInfo();
            expect(dvrInfo).not.to.be.null; // jshint ignore:line
            expect(dvrInfo.type).to.equal(testType); // jshint ignore:line
        });
    });
});