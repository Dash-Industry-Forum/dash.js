import StreamController from '../../src/streaming/controllers/StreamController';
import Events from '../../src/core/events/Events';
import ProtectionEvents from '../../src/streaming/protection/ProtectionEvents';
import EventBus from '../../src/core/EventBus';
import Settings from '../../src/core/Settings';
import Constants from '../../src/streaming/constants/Constants';

import ObjectsHelper from './helpers/ObjectsHelper';
import AdapterMock from './mocks/AdapterMock';
import BaseURLControllerMock from './mocks/BaseURLControllerMock';
import ManifestLoaderMock from './mocks/ManifestLoaderMock';
import ManifestModelMock from './mocks/ManifestModelMock';
import ErrorHandlerMock from './mocks/ErrorHandlerMock';
import DashMetricsMock from './mocks/DashMetricsMock';
import ProtectionControllerMock from './mocks/ProtectionControllerMock';
import VideoModelMock from './mocks/VideoModelMock';
import PlaybackControllerMock from './mocks/PlaybackControllerMock';
import URIFragmentModelMock from './mocks/URIFragmentModelMock';
import CapabilitiesFilterMock from './mocks/CapabilitiesFilterMock';
import TextControllerMock from './mocks/TextControllerMock';

const chai = require('chai');
const spies = require('chai-spies');
const sinon = require('sinon');

chai.use(spies);
const expect = chai.expect;

const context = {};
let streamController = StreamController(context).getInstance();
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
const baseUrlControllerMock = new BaseURLControllerMock();
const uriFragmentModelMock = new URIFragmentModelMock();
const capabilitiesFilterMock = new CapabilitiesFilterMock();
const textControllerMock = new TextControllerMock();

Events.extend(ProtectionEvents);

describe('StreamController', function () {

    describe('streams array is empty', () => {

        it('should return null if getTimeRelativeToStreamId is called without parameters', () => {
            const time = streamController.getTimeRelativeToStreamId();

            expect(time).to.be.null; // jshint ignore:line
        });

        it('should return undefined if getStreamById is called without parameters', () => {
            const stream = streamController.getStreamById();

            expect(stream).to.be.null; // jshint ignore:line
        });

        it('should return null if getStreamById is called but no stream has been composed', () => {
            const stream = streamController.getStreamById('idx');

            expect(stream).to.be.null; // jshint ignore:line
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
            streamController.setConfig({ manifestLoader: {} });
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

            expect(activeStreamProcessorsArray).to.be.instanceOf(Array); // jshint ignore:line
            expect(activeStreamProcessorsArray).to.be.empty; // jshint ignore:line
        });

        it('should return false when attempting to call hasAudioTrack, while no activeStream has been defined', function () {
            expect(streamController.hasAudioTrack()).to.be.false; // jshint ignore:line
        });

        it('should return false when attempting to call hasVideoTrack, while no activeStream has been defined', function () {
            expect(streamController.hasVideoTrack()).to.be.false; // jshint ignore:line
        });

        it('should return null when attempting to call getStreamForTime, and no stream has been composed', function () {
            const stream = streamController.getStreamForTime(10);

            expect(stream).to.be.null; // jshint ignore:line
        });
    });

    describe('Well initialized', () => {

        beforeEach(function () {
            streamController.setConfig({
                adapter: adapterMock,
                manifestLoader: manifestLoaderMock,
                timelineConverter: timelineConverterMock,
                manifestModel: manifestModelMock,
                errHandler: errHandlerMock,
                dashMetrics: dashMetricsMock,
                protectionController: protectionControllerMock,
                videoModel: videoModelMock,
                playbackController: playbackControllerMock,
                baseURLController: baseUrlControllerMock,
                capabilitiesFilter: capabilitiesFilterMock,
                textController: textControllerMock,
                settings: settings
            });

            streamController.initialize(false);
        });

        describe('event management', () => {
            it('should trigger MANIFEST_UPDATED event when loadWithManifest is called', function () {
                let spy = chai.spy();
                eventBus.on(Events.MANIFEST_UPDATED, spy);
                streamController.loadWithManifest({ loadedTime: new Date() });
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
                eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);
                expect(errHandlerMock.errorValue).to.include('There are no streams');
            });

            it('should return the correct error when a playback error occurs : MEDIA_ERR_ABORTED', function () {
                eventBus.trigger(Events.PLAYBACK_ERROR, { error: { code: 1 } });

                expect(errHandlerMock.errorValue).to.include('MEDIA_ERR_ABORTED');
            });

            it('should return the correct error when a playback error occurs : MEDIA_ERR_NETWORK', function () {
                eventBus.trigger(Events.PLAYBACK_ERROR, { error: { code: 2 } });

                expect(errHandlerMock.errorValue).to.include('MEDIA_ERR_NETWORK');
            });

            it('should return the correct error when a playback error occurs : MEDIA_ERR_DECODE', function () {
                eventBus.trigger(Events.PLAYBACK_ERROR, { error: { code: 3 } });

                expect(errHandlerMock.errorValue).to.include('MEDIA_ERR_DECODE');
            });

            it('should return the correct error when a playback error occurs : MEDIA_ERR_SRC_NOT_SUPPORTED', function () {
                eventBus.trigger(Events.PLAYBACK_ERROR, { error: { code: 4 } });

                expect(errHandlerMock.errorValue).to.include('MEDIA_ERR_SRC_NOT_SUPPORTED');
            });

            it('should return the correct error when a playback error occurs : MEDIA_ERR_ENCRYPTED', function () {
                eventBus.trigger(Events.PLAYBACK_ERROR, { error: { code: 5 } });

                expect(errHandlerMock.errorValue).to.include('MEDIA_ERR_ENCRYPTED');
            });

            it('should return the correct error when a playback error occurs : UNKNOWN', function () {
                eventBus.trigger(Events.PLAYBACK_ERROR, { error: { code: 6 } });

                expect(errHandlerMock.errorValue).to.include('UNKNOWN');
            });

            it('should call reset if MANIFEST_UPDATED event is triggered with an error parameter', function () {
                let spy = chai.spy();
                eventBus.on(Events.STREAM_TEARDOWN_COMPLETE, spy);

                eventBus.trigger(Events.MANIFEST_UPDATED, { error: {} });
                expect(spy).to.have.been.called.exactly(1);
            });
        });

        describe('start time', function () {

            let expectedStartTime;
            let doneFn;
            let getStreamsInfoStub;
            let getIsDynamicStub;

            let staticStreamInfo = { manifestInfo: { isDynamic: false }, start: 10, duration: 600, id: '1' };
            let dynamicStreamInfo = {
                manifestInfo: { isDynamic: true, DVRWindowSize: 30, minBufferTime: 4 },
                start: 10,
                duration: Infinity,
                id: '1'
            };
            let dvrWindowRange = { start: 70, end: 100 };
            let liveStartTime = 85;

            let onInitialStreamSwitch = function (e) {
                try {
                    eventBus.off(Events.INITIAL_STREAM_SWITCH, onInitialStreamSwitch);
                    expect(e.startTime).to.equal(expectedStartTime);
                    doneFn();
                } catch (e) {
                    doneFn(e);
                }
            };

            beforeEach(function () {
                videoModelMock.time = -1;
                dashMetricsMock.addDVRInfo('video', Date.now(), null, dvrWindowRange);
                streamController.setConfig({
                    adapter: adapterMock,
                    manifestLoader: manifestLoaderMock,
                    timelineConverter: timelineConverterMock,
                    manifestModel: manifestModelMock,
                    errHandler: errHandlerMock,
                    dashMetrics: dashMetricsMock,
                    protectionController: protectionControllerMock,
                    videoModel: videoModelMock,
                    playbackController: playbackControllerMock,
                    baseURLController: baseUrlControllerMock,
                    settings: settings,
                    uriFragmentModel: uriFragmentModelMock
                });

                streamController.initialize(false);
                getStreamsInfoStub = sinon.stub(adapterMock, 'getStreamsInfo');
                getIsDynamicStub = sinon.stub(adapterMock, 'getIsDynamic');
                eventBus.on(Events.INITIAL_STREAM_SWITCH, onInitialStreamSwitch, this);
            });

            afterEach(function () {
                streamController.reset();
                getStreamsInfoStub.restore();
                getIsDynamicStub.restore();
                getStreamsInfoStub = null;
                getIsDynamicStub = null;
                eventBus.off(Events.INITIAL_STREAM_SWITCH, onInitialStreamSwitch);
                uriFragmentModelMock.reset();
            });

            describe('static streams', function () {

                beforeEach(function () {
                    getIsDynamicStub.returns(false);
                });


                it('should start static stream at period start', function (done) {
                    doneFn = done;

                    expectedStartTime = staticStreamInfo.start;
                    getStreamsInfoStub.returns([staticStreamInfo]);

                    eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);
                });

                it('should start static stream at #t', function (done) {
                    doneFn = done;

                    let uriStartTime = 10;
                    uriFragmentModelMock.setURIFragmentData({ t: uriStartTime.toString() });

                    expectedStartTime = staticStreamInfo.start + uriStartTime;

                    getStreamsInfoStub.returns([staticStreamInfo]);
                    eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);
                });

                it('should start static stream at period start if #t is before period start', function (done) {
                    doneFn = done;

                    let uriStartTime = -20;
                    uriFragmentModelMock.setURIFragmentData({ t: uriStartTime.toString() });

                    expectedStartTime = staticStreamInfo.start;

                    getStreamsInfoStub.returns([staticStreamInfo]);
                    eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);
                });

                it('should start static stream at period start if #t=posix: notation is used', function (done) {
                    doneFn = done;

                    let uriStartTime = 10;
                    uriFragmentModelMock.setURIFragmentData({ t: 'posix:' + uriStartTime.toString() });

                    expectedStartTime = staticStreamInfo.start;

                    getStreamsInfoStub.returns([staticStreamInfo]);
                    eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);
                });

                it('should start static stream at period start if #t= is not a valid', function (done) {
                    doneFn = done;

                    uriFragmentModelMock.setURIFragmentData({ t: 'abcd' });

                    expectedStartTime = staticStreamInfo.start;

                    getStreamsInfoStub.returns([staticStreamInfo]);
                    eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);
                });
            });

            describe('dynamic streams', function () {

                beforeEach(function () {
                    getIsDynamicStub.returns(true);
                });

                it('should start dynamic stream at live start time', function (done) {
                    doneFn = done;

                    expectedStartTime = liveStartTime;

                    getStreamsInfoStub.returns([dynamicStreamInfo]);
                    eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);
                });

                it('should start dynamic stream at #t', function (done) {
                    doneFn = done;

                    let uriStartTime = 70;
                    uriFragmentModelMock.setURIFragmentData({ t: uriStartTime.toString() });

                    expectedStartTime = dynamicStreamInfo.start + uriStartTime;

                    getStreamsInfoStub.returns([dynamicStreamInfo]);
                    eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);
                });

                it('should start dynamic stream at live start time if #t is before DVR window range', function (done) {
                    doneFn = done;

                    let uriStartTime = -10;
                    uriFragmentModelMock.setURIFragmentData({ t: uriStartTime.toString() });

                    expectedStartTime = dvrWindowRange.start;

                    getStreamsInfoStub.returns([dynamicStreamInfo]);
                    eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);
                });

                it('should start dynamic stream at live start time if #t is not valid', function (done) {
                    doneFn = done;

                    uriFragmentModelMock.setURIFragmentData({ t: 'abcd' });

                    expectedStartTime = liveStartTime;

                    getStreamsInfoStub.returns([dynamicStreamInfo]);
                    eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);
                });

                it('should start dynamic stream at #t=posix', function (done) {
                    doneFn = done;

                    let uriStartTime = dvrWindowRange.start + 10;
                    uriFragmentModelMock.setURIFragmentData({ t: 'posix:' + uriStartTime.toString() });

                    expectedStartTime = uriStartTime;

                    getStreamsInfoStub.returns([dynamicStreamInfo]);
                    eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);
                });

                it('should start dynamic stream at DVR window start if #t=posix is before DVR window range', function (done) {
                    doneFn = done;

                    let uriStartTime = 0;
                    uriFragmentModelMock.setURIFragmentData({ t: 'posix:' + uriStartTime.toString() });

                    expectedStartTime = dvrWindowRange.start;

                    getStreamsInfoStub.returns([dynamicStreamInfo]);
                    eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);
                });

                it('should start dynamic stream at live start time if #t=posix is beyond DVR window range', function (done) {
                    doneFn = done;

                    let uriStartTime = dvrWindowRange + 10;
                    uriFragmentModelMock.setURIFragmentData({ t: 'posix:' + uriStartTime.toString() });

                    expectedStartTime = liveStartTime;

                    getStreamsInfoStub.returns([dynamicStreamInfo]);
                    eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);
                });

                it('should start dynamic stream at live start time if #t=posix is not valid', function (done) {
                    doneFn = done;

                    uriFragmentModelMock.setURIFragmentData({ t: 'posix:abcd' });

                    expectedStartTime = liveStartTime;

                    getStreamsInfoStub.returns([dynamicStreamInfo]);
                    eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);
                });
            });
        });
    });
});
