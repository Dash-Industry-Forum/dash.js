import StreamController from '../../src/streaming/controllers/StreamController';
import Events from '../../src/core/events/Events';
import ProtectionEvents from '../../src/streaming/protection/ProtectionEvents';
import EventBus from '../../src/core/EventBus';
import Settings from '../../src/core/Settings';
import Constants from '../../src/streaming/constants/Constants';

import ObjectsHelper from './helpers/ObjectsHelper';
import AdapterMock from './mocks/AdapterMock';
import ManifestLoaderMock from './mocks/ManifestLoaderMock';
import ManifestModelMock from './mocks/ManifestModelMock';
import ErrorHandlerMock from './mocks/ErrorHandlerMock';
import DashMetricsMock from './mocks/DashMetricsMock';
import ProtectionControllerMock from './mocks/ProtectionControllerMock';
import VideoModelMock from './mocks/VideoModelMock';
import PlaybackControllerMock from './mocks/PlaybackControllerMock';

const chai = require('chai');
const spies = require('chai-spies');

chai.use(spies);
const expect = chai.expect;

const context = {};
const streamController = StreamController(context).getInstance();
const eventBus = EventBus(context).getInstance();
let settings = Settings(context).getInstance();

const adapterMock = new AdapterMock();
const manifestLoaderMock = new ManifestLoaderMock();
const objectsHelper = new ObjectsHelper();
const timelineConverterMock = objectsHelper.getDummyTimelineConverter();
const manifestModelMock = new ManifestModelMock();
const errHandlerMock = new ErrorHandlerMock();
const dashMetricsMock = new DashMetricsMock();
const protectionControllerMock = new ProtectionControllerMock();
const videoModelMock = new VideoModelMock();
const playbackControllerMock = new PlaybackControllerMock();

Events.extend(ProtectionEvents);

describe('StreamController', function () {

    describe('streams array is empty', () => {

        it('should return null if getTimeRelativeToStreamId is called without parameters', () => {
            const time = streamController.getTimeRelativeToStreamId();

            expect(time).to.be.null; // jshint ignore:line
        });

        it('should return undefined if getStreamById is called without parameters', () => {
            const stream = streamController.getStreamById();

            expect(stream).to.be.undefined; // jshint ignore:line
        });

        it('should return undefined if getStreamById is called but no stream has been composed', () => {
            const stream = streamController.getStreamById('idx');

            expect(stream).to.be.undefined; // jshint ignore:line
        });

        it('should return null if getActiveStreamInfo is called without parameters, activeStream is undefined', () => {
            const activeStream = streamController.getActiveStreamInfo();

            expect(activeStream).to.be.null; // jshint ignore:line
        });

        it('should throw an exception when attempting to call initialize while setConfig has not been called', function () {
            expect(streamController.initialize.bind(streamController)).to.throw(Constants.MISSING_CONFIG_ERROR);
        });

        it('should throw an exception when attempting to call load while setConfig has not been called', function () {
            expect(streamController.load.bind(streamController)).to.throw(Constants.MISSING_CONFIG_ERROR);
        });

        it('should throw an exception when attempting to call load while setConfig has not been called properly - empty manifestLoader object', function () {
            streamController.setConfig({manifestLoader: {}});
            expect(streamController.load.bind(streamController)).to.throw(Constants.MISSING_CONFIG_ERROR);
        });

        it('should throw an exception when attempting to call loadWithManifest while initialize has not been called', function () {
            expect(streamController.loadWithManifest.bind(streamController)).to.throw('initialize function has to be called previously');
        });

        it('should throw an exception when attempting to call reset while setConfig has not been called', function () {
            expect(streamController.reset.bind(streamController)).to.throw(Constants.MISSING_CONFIG_ERROR);
        });

        it('should return an empty array when attempting to call getActiveStreamProcessors while no activeStream has been defined', function () {
            const activeStreamProcessorsArray = streamController.getActiveStreamProcessors();

            expect(activeStreamProcessorsArray).to.be.instanceOf(Array);    // jshint ignore:line
            expect(activeStreamProcessorsArray).to.be.empty;                // jshint ignore:line
        });

        it('should return undefined when attempting to call isTrackTypePresent with no track type', function () {
            const isAudioTrackPresent = streamController.isTrackTypePresent();

            expect(isAudioTrackPresent).to.be.undefined;    // jshint ignore:line
        });

        it('should return undefined when attempting to call isTrackTypePresent, for audio type, while no activeStream has been defined', function () {
            const isAudioTrackPresent = streamController.isTrackTypePresent('audio');

            expect(isAudioTrackPresent).to.be.undefined;    // jshint ignore:line
        });

        it('should return undefined when attempting to call isTrackTypePresent, for video type, while no activeStream has been defined', function () {
            const isVideoTrackPresent = streamController.isTrackTypePresent('video');

            expect(isVideoTrackPresent).to.be.undefined;    // jshint ignore:line
        });

        it('should return null when attempting to call getStreamForTime, and no stream has been composed', function () {
            const stream = streamController.getStreamForTime(10);

            expect(stream).to.be.null;    // jshint ignore:line
        });
    });

    describe('Well initialized', () => {

        beforeEach(function () {
            streamController.setConfig({adapter: adapterMock,
                                        manifestLoader: manifestLoaderMock,
                                        timelineConverter: timelineConverterMock,
                                        manifestModel: manifestModelMock,
                                        errHandler: errHandlerMock,
                                        dashMetrics: dashMetricsMock,
                                        protectionController: protectionControllerMock,
                                        videoModel: videoModelMock,
                                        playbackController: playbackControllerMock,
                                        settings: settings});

            streamController.initialize(false);
        });

        describe('event management', () => {
            it('should trigger MANIFEST_UPDATED event when loadWithManifest is called', function () {
                let spy = chai.spy();
                eventBus.on(Events.MANIFEST_UPDATED, spy);
                streamController.loadWithManifest({loadedTime: new Date()});
                expect(spy).to.have.been.called.exactly(1);
                eventBus.off(Events.MANIFEST_UPDATED, spy);
            });

            it('should correctly call load function of ManifestLoader when load is called', function () {
                streamController.load('http://localhost:8080');
                expect(manifestLoaderMock.loadManifest).to.equal(true);
            });
        });

        describe('error management', () => {

            it('should throw an exception when attempting to composeStreams while no manifest has been parsed', function () {
                let spy = chai.spy();
                eventBus.on(Events.PROTECTION_CREATED, spy);

                eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);
                expect(spy).to.have.been.called.exactly(1);
                expect(errHandlerMock.errorValue).to.include('There are no streams');
            });

            it('should return the correct error when a playback error occurs : MEDIA_ERR_ABORTED', function () {
                eventBus.trigger(Events.PLAYBACK_ERROR, {error: {code: 1}});

                expect(errHandlerMock.errorValue).to.include('MEDIA_ERR_ABORTED');
            });

            it('should return the correct error when a playback error occurs : MEDIA_ERR_NETWORK', function () {
                eventBus.trigger(Events.PLAYBACK_ERROR, {error: {code: 2}});

                expect(errHandlerMock.errorValue).to.include('MEDIA_ERR_NETWORK');
            });

            it('should return the correct error when a playback error occurs : MEDIA_ERR_DECODE', function () {
                eventBus.trigger(Events.PLAYBACK_ERROR, {error: {code: 3}});

                expect(errHandlerMock.errorValue).to.include('MEDIA_ERR_DECODE');
            });

            it('should return the correct error when a playback error occurs : MEDIA_ERR_SRC_NOT_SUPPORTED', function () {
                eventBus.trigger(Events.PLAYBACK_ERROR, {error: {code: 4}});

                expect(errHandlerMock.errorValue).to.include('MEDIA_ERR_SRC_NOT_SUPPORTED');
            });

            it('should return the correct error when a playback error occurs : MEDIA_ERR_ENCRYPTED', function () {
                eventBus.trigger(Events.PLAYBACK_ERROR, {error: {code: 5}});

                expect(errHandlerMock.errorValue).to.include('MEDIA_ERR_ENCRYPTED');
            });

            it('should return the correct error when a playback error occurs : UNKNOWN', function () {
                eventBus.trigger(Events.PLAYBACK_ERROR, {error: {code: 6}});

                expect(errHandlerMock.errorValue).to.include('UNKNOWN');
            });

            it('should call reset if MANIFEST_UPDATED event is triggered with an error parameter', function () {
                let spy = chai.spy();
                eventBus.on(Events.STREAM_TEARDOWN_COMPLETE, spy);

                eventBus.trigger(Events.MANIFEST_UPDATED, {error: {}});
                expect(spy).to.have.been.called.exactly(1);
            });
        });
    });
});