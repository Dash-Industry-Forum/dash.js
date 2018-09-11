import StreamController from '../../src/streaming/controllers/StreamController';
import Events from '../../src/core/events/Events';
import EventBus from '../../src/core/EventBus';

import ObjectsHelper from './helpers/ObjectsHelper';
import AdapterMock from './mocks/AdapterMock';
import ManifestLoaderMock from './mocks/ManifestLoaderMock';
import ManifestModelMock from './mocks/ManifestModelMock';
import ErrorHandlerMock from './mocks/ErrorHandlerMock';
import MetricsModelMock from './mocks/MetricsModelMock';

const chai = require('chai');
const expect = chai.expect;

const context = {};
const streamController = StreamController(context).getInstance();
const eventBus = EventBus(context).getInstance();

const adapterMock = new AdapterMock();
const manifestLoaderMock = new ManifestLoaderMock();
const objectsHelper = new ObjectsHelper();
const timelineConverterMock = objectsHelper.getDummyTimelineConverter();
const manifestModelMock = new ManifestModelMock();
const errHandlerMock = new ErrorHandlerMock();
const metricsModelMock = new MetricsModelMock();

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
            expect(streamController.initialize.bind(streamController)).to.throw('setConfig function has to be called previously');
        });

        it('should throw an exception when attempting to call load while setConfig has not been called', function () {
            expect(streamController.load.bind(streamController)).to.throw('setConfig function has to be called previously');
        });

        it('should throw an exception when attempting to call load while setConfig has not been called properly - empty manifestLoader object', function () {
            streamController.setConfig({manifestLoader: {}});
            expect(streamController.load.bind(streamController)).to.throw('setConfig function has to be called previously');
        });

        it('should throw an exception when attempting to call loadWithManifest while initialize has not been called', function () {
            expect(streamController.loadWithManifest.bind(streamController)).to.throw('initialize function has to be called previously');
        });

        it('should throw an exception when attempting to call reset while setConfig has not been called', function () {
            expect(streamController.reset.bind(streamController)).to.throw('setConfig function has to be called previously');
        });

        it('should return an empty array when attempting to call getActiveStreamProcessors while no activeStream has been defined', function () {
            const activeStreamProcessorsArray = streamController.getActiveStreamProcessors();

            expect(activeStreamProcessorsArray).to.be.instanceOf(Array);    // jshint ignore:line
            expect(activeStreamProcessorsArray).to.be.empty;                // jshint ignore:line
        });

        it('should return undefined when attempting to call isAudioTrackPresent while no activeStream has been defined', function () {
            const isAudioTrackPresent = streamController.isAudioTrackPresent();

            expect(isAudioTrackPresent).to.be.undefined;    // jshint ignore:line
        });

        it('should return undefined when attempting to call isVideoTrackPresent while no activeStream has been defined', function () {
            const isVideoTrackPresent = streamController.isVideoTrackPresent();

            expect(isVideoTrackPresent).to.be.undefined;    // jshint ignore:line
        });

        it('should return null when attempting to call getStreamForTime, and no stream has been composed', function () {
            const stream = streamController.getStreamForTime(10);

            expect(stream).to.be.null;    // jshint ignore:line
        });
    });

    describe('error management', () => {

        beforeEach(function () {
            streamController.setConfig({adapter: adapterMock,
                                        manifestLoader: manifestLoaderMock,
                                        timelineConverter: timelineConverterMock,
                                        manifestModel: manifestModelMock,
                                        errHandler: errHandlerMock,
                                        metricsModel: metricsModelMock});

            streamController.initialize(false);
        });

        it('should throw an exception when attempting to composeStreams while no manifest has been parsed', function () {
            eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);

            expect(errHandlerMock.error).to.equal('There are no streams');
        });

        it('should return the correct error when a playback error occurs : MEDIA_ERR_ABORTED', function () {
            eventBus.trigger(Events.PLAYBACK_ERROR, {error: {code: 1}});

            expect(errHandlerMock.error).to.include('MEDIA_ERR_ABORTED');
        });

        it('should return the correct error when a playback error occurs : MEDIA_ERR_NETWORK', function () {
            eventBus.trigger(Events.PLAYBACK_ERROR, {error: {code: 2}});

            expect(errHandlerMock.error).to.include('MEDIA_ERR_NETWORK');
        });

        it('should return the correct error when a playback error occurs : MEDIA_ERR_DECODE', function () {
            eventBus.trigger(Events.PLAYBACK_ERROR, {error: {code: 3}});

            expect(errHandlerMock.error).to.include('MEDIA_ERR_DECODE');
        });

        it('should return the correct error when a playback error occurs : MEDIA_ERR_SRC_NOT_SUPPORTED', function () {
            eventBus.trigger(Events.PLAYBACK_ERROR, {error: {code: 4}});

            expect(errHandlerMock.error).to.include('MEDIA_ERR_SRC_NOT_SUPPORTED');
        });

        it('should return the correct error when a playback error occurs : MEDIA_ERR_ENCRYPTED', function () {
            eventBus.trigger(Events.PLAYBACK_ERROR, {error: {code: 5}});

            expect(errHandlerMock.error).to.include('MEDIA_ERR_ENCRYPTED');
        });

        it('should return the correct error when a playback error occurs : UNKNOWN', function () {
            eventBus.trigger(Events.PLAYBACK_ERROR, {error: {code: 6}});

            expect(errHandlerMock.error).to.include('UNKNOWN');
        });
    });
});