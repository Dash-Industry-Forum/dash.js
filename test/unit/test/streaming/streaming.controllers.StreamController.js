import StreamController from '../../../../src/streaming/controllers/StreamController.js';
import Events from '../../../../src/core/events/Events.js';
import ProtectionEvents from '../../../../src/streaming/protection/ProtectionEvents.js';
import EventBus from '../../../../src/core/EventBus.js';
import Settings from '../../../../src/core/Settings.js';
import Constants from '../../../../src/streaming/constants/Constants.js';
import Errors from '../../../../src/core/errors/Errors.js';
import ObjectsHelper from '../../helpers/ObjectsHelper.js';
import AdapterMock from '../../mocks/AdapterMock.js';
import BaseURLControllerMock from '../../mocks/BaseURLControllerMock.js';
import ManifestLoaderMock from '../../mocks/ManifestLoaderMock.js';
import ManifestModelMock from '../../mocks/ManifestModelMock.js';
import ErrorHandlerMock from '../../mocks/ErrorHandlerMock.js';
import DashMetricsMock from '../../mocks/DashMetricsMock.js';
import ProtectionControllerMock from '../../mocks/ProtectionControllerMock.js';
import VideoModelMock from '../../mocks/VideoModelMock.js';
import PlaybackControllerMock from '../../mocks/PlaybackControllerMock.js';
import URIFragmentModelMock from '../../mocks/URIFragmentModelMock.js';
import CapabilitiesFilterMock from '../../mocks/CapabilitiesFilterMock.js';
import ContentSteeringControllerMock from '../../mocks/ContentSteeringControllerMock.js';
import TextControllerMock from '../../mocks/TextControllerMock.js';
import ManifestUpdaterMock from '../../mocks/ManifestUpdaterMock.js';
import ServiceDescriptionController from '../../../../src/dash/controllers/ServiceDescriptionController.js';

import chai from 'chai';
import spies from 'chai-spies';
import sinon from 'sinon';

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
const contentSteeringControllerMock = new ContentSteeringControllerMock();
const manifestUpdaterMock = new ManifestUpdaterMock();

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
            settings.reset();
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
                contentSteeringController: contentSteeringControllerMock,
                settings: settings
            });

            streamController.initialize(false);
        });

        describe('event management', () => {
            it('should trigger MANIFEST_UPDATED event when loadWithManifest is called', async function () {
                let spy = chai.spy();
                eventBus.on(Events.MANIFEST_UPDATED, spy);
                streamController.loadWithManifest({ loadedTime: new Date() });
                expect(spy).to.have.been.called.exactly(1);
                eventBus.off(Events.MANIFEST_UPDATED, spy);
                // The incomplete manifest fails asynchronously and resets the controller, let that happen in this test
                await new Promise((resolve) => setTimeout(resolve, 0));
            });

            it('should correctly call load function of ManifestLoader when load is called', function () {
                streamController.load('http://localhost:8080');
                expect(manifestLoaderMock.loadManifest).to.equal(true);
            });
        });

        describe('error management', () => {

            it('should throw an exception when attempting to composeStreams while no manifest has been parsed', function () {
                eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);
                expect(errHandlerMock.errorValue).to.include('There are no periods in the MPD');
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
                settings.update({ errors: { recoverAttempts: { mediaErrorDecode: 0 } } })
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
                manifestInfo: { isDynamic: true, dvrWindowSize: 30, minBufferTime: 4 },
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
                const serviceDescriptionController = ServiceDescriptionController(context).getInstance();

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
                    uriFragmentModel: uriFragmentModelMock,
                    serviceDescriptionController
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

                it('should clamp a seek time far beyond the last period to the end of content minus the seekDurationBackoff', function (done) {
                    doneFn = function (err) {
                        if (err) {
                            done(err);
                            return;
                        }
                        // activeStream is only assigned by _switchStream() right after INITIAL_STREAM_SWITCH is
                        // triggered, so defer to the next tick to let that synchronous call complete first.
                        setTimeout(() => {
                            try {
                                const seekEvent = { seekTime: 999999999 };
                                eventBus.trigger(Events.PLAYBACK_SEEKING, seekEvent);
                                const expectedTime = staticStreamInfo.start + staticStreamInfo.duration -
                                    settings.get().streaming.seekDurationBackoff;
                                expect(seekEvent.seekTime).to.equal(expectedTime);
                                done();
                            } catch (e) {
                                done(e);
                            }
                        }, 0);
                    };

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

                it('should start static stream at #t with milliseconds', function (done) {
                    doneFn = done;

                    let uriStartTime = 10.555;
                    uriFragmentModelMock.setURIFragmentData({ t: uriStartTime.toString() });

                    expectedStartTime = staticStreamInfo.start + uriStartTime;

                    getStreamsInfoStub.returns([staticStreamInfo]);
                    eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);
                });

                it('should clamp the start time if #t is beyond the end of the content', function (done) {
                    doneFn = done;

                    uriFragmentModelMock.setURIFragmentData({ t: '999999999' });

                    expectedStartTime = staticStreamInfo.start + staticStreamInfo.duration -
                        settings.get().streaming.seekDurationBackoff;

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

                before(function () {
                    adapterMock.setRegularPeriods([
                        {
                            mpd: {
                                availabilityStartTime: new Date(0)
                            }
                        }
                    ])
                })

                after(function () {
                    adapterMock.setRegularPeriods([]);
                })

                beforeEach(function () {
                    getIsDynamicStub.returns(true);
                });

                it('should start dynamic stream at live start time', function (done) {
                    doneFn = done;

                    expectedStartTime = liveStartTime;

                    getStreamsInfoStub.returns([dynamicStreamInfo]);
                    eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);
                });

                describe('content pending', function () {
                    const pendingManifest = { type: 'dynamic', url: 'https://example.com/live.mpd' };
                    let getIsContentPendingStub;
                    let filterSpy;
                    let contentPendingSpy;
                    let initialStreamSwitchSpy;
                    let clock;

                    // The content is checked once the capabilities have been filtered, which resolves asynchronously
                    async function updateManifest(manifest) {
                        eventBus.trigger(Events.MANIFEST_UPDATED, { manifest });
                        for (let i = 0; i < 10; i++) {
                            await Promise.resolve();
                        }
                    }

                    beforeEach(function () {
                        clock = sinon.useFakeTimers({ now: Date.now(), toFake: ['setTimeout', 'clearTimeout', 'Date'] });
                        errHandlerMock.reset();
                        getStreamsInfoStub.returns([dynamicStreamInfo]);
                        getIsContentPendingStub = sinon.stub(adapterMock, 'getIsContentPending').returns(true);
                        // An MPD update that lists content reaches the UTC timing sources
                        streamController.setConfig({ customParametersModel: { getUTCTimingSources: () => [] } });
                        filterSpy = sinon.spy(capabilitiesFilterMock, 'filterUnsupportedFeatures');
                        contentPendingSpy = sinon.spy();
                        initialStreamSwitchSpy = sinon.spy();
                        eventBus.on(Events.MANIFEST_CONTENT_PENDING, contentPendingSpy);
                        eventBus.on(Events.INITIAL_STREAM_SWITCH, initialStreamSwitchSpy);
                    });

                    afterEach(function () {
                        getIsContentPendingStub.restore();
                        filterSpy.restore();
                        eventBus.off(Events.MANIFEST_CONTENT_PENDING, contentPendingSpy);
                        eventBus.off(Events.INITIAL_STREAM_SWITCH, initialStreamSwitchSpy);
                        clock.restore();
                        settings.reset();
                    });

                    it('should report the content as pending after filtering and without composing streams', async function () {
                        await updateManifest(pendingManifest);

                        expect(filterSpy.calledBefore(getIsContentPendingStub)).to.be.true;
                        expect(getIsContentPendingStub.calledWith(pendingManifest)).to.be.true;
                        expect(contentPendingSpy.calledOnce).to.be.true;
                        expect(streamController.getStreams()).to.be.empty;
                        expect(errHandlerMock.errorCode).to.be.undefined;
                    });

                    it('should keep waiting while the timeout has not expired', async function () {
                        settings.update({ streaming: { liveContentPendingTimeoutInSeconds: 10 } });
                        await updateManifest(pendingManifest);
                        clock.tick(9000);
                        await updateManifest(pendingManifest);

                        expect(contentPendingSpy.calledTwice).to.be.true;
                        expect(errHandlerMock.errorCode).to.be.undefined;
                    });

                    it('should raise an error once the timeout expired, also without further MPD updates', async function () {
                        settings.update({ streaming: { liveContentPendingTimeoutInSeconds: 10 } });
                        await updateManifest(pendingManifest);
                        clock.tick(9999);
                        expect(errHandlerMock.errorCode).to.be.undefined;

                        clock.tick(1);
                        expect(errHandlerMock.errorCode).to.equal(Errors.MANIFEST_ERROR_ID_NOSTREAMS_CODE);
                        expect(errHandlerMock.errorValue).to.include('10 seconds');
                    });

                    it('should count the timeout from the first pending MPD', async function () {
                        settings.update({ streaming: { liveContentPendingTimeoutInSeconds: 10 } });
                        await updateManifest(pendingManifest);
                        clock.tick(8000);
                        await updateManifest(pendingManifest);
                        clock.tick(2000);

                        expect(errHandlerMock.errorCode).to.equal(Errors.MANIFEST_ERROR_ID_NOSTREAMS_CODE);
                    });

                    it('should not raise the error before a timeout longer than the maximum timer delay expired', async function () {
                        const timeoutInSeconds = 30 * 24 * 3600;
                        settings.update({ streaming: { liveContentPendingTimeoutInSeconds: timeoutInSeconds } });
                        await updateManifest(pendingManifest);
                        clock.tick(1000);
                        expect(errHandlerMock.errorCode).to.be.undefined;

                        clock.tick(timeoutInSeconds * 1000 - 2000);
                        expect(errHandlerMock.errorCode).to.be.undefined;

                        clock.tick(1000);
                        expect(errHandlerMock.errorCode).to.equal(Errors.MANIFEST_ERROR_ID_NOSTREAMS_CODE);
                    });

                    it('should wait without limit by default', async function () {
                        await updateManifest(pendingManifest);
                        clock.tick(24 * 3600 * 1000);
                        await updateManifest(pendingManifest);

                        expect(contentPendingSpy.calledTwice).to.be.true;
                        expect(errHandlerMock.errorCode).to.be.undefined;
                    });

                    it('should not raise the timeout error once the streams are composed', async function () {
                        settings.update({ streaming: { liveContentPendingTimeoutInSeconds: 10 } });
                        await updateManifest(pendingManifest);
                        getIsContentPendingStub.returns(false);
                        // Starts the time synchronization and with it the composition of the streams
                        await updateManifest(pendingManifest);
                        clock.tick(10000);

                        // Without UTC timing sources the time synchronization reports TIME_SYNC_FAILED_ERROR_CODE
                        expect(errHandlerMock.errorCode).to.not.equal(Errors.MANIFEST_ERROR_ID_NOSTREAMS_CODE);
                    });

                    it('should not raise the timeout error while an MPD update is still filtered at the deadline', async function () {
                        settings.update({ streaming: { liveContentPendingTimeoutInSeconds: 60 } });
                        await updateManifest(pendingManifest);
                        clock.tick(59000);

                        // Content arrives, but capability filtering is still running at 60 s
                        let resolveFilter;
                        filterSpy.restore();
                        const filterStub = sinon.stub(capabilitiesFilterMock, 'filterUnsupportedFeatures')
                            .returns(new Promise((resolve) => {
                                resolveFilter = resolve;
                            }));
                        getIsContentPendingStub.returns(false);
                        await updateManifest(pendingManifest);
                        clock.tick(2000);
                        resolveFilter();
                        await updateManifest(pendingManifest);
                        filterStub.restore();
                        filterSpy = sinon.spy(capabilitiesFilterMock, 'filterUnsupportedFeatures');

                        expect(errHandlerMock.errorCode).to.be.undefined;
                    });

                    it('should raise the timeout error at once if the MPD is still pending once filtered after the deadline', async function () {
                        settings.update({ streaming: { liveContentPendingTimeoutInSeconds: 10 } });
                        await updateManifest(pendingManifest);
                        clock.tick(9000);

                        let resolveFilter;
                        filterSpy.restore();
                        const filterStub = sinon.stub(capabilitiesFilterMock, 'filterUnsupportedFeatures')
                            .returns(new Promise((resolve) => {
                                resolveFilter = resolve;
                            }));
                        await updateManifest(pendingManifest);
                        clock.tick(2000);
                        expect(errHandlerMock.errorCode).to.be.undefined;

                        resolveFilter();
                        await updateManifest(pendingManifest);
                        filterStub.restore();
                        filterSpy = sinon.spy(capabilitiesFilterMock, 'filterUnsupportedFeatures');
                        clock.tick(0);

                        expect(errHandlerMock.errorCode).to.equal(Errors.MANIFEST_ERROR_ID_NOSTREAMS_CODE);
                    });

                    [null, -1].forEach((timeoutInSeconds) => {
                        it(`should wait without limit if the timeout is set to ${timeoutInSeconds}`, async function () {
                            settings.update({ streaming: { liveContentPendingTimeoutInSeconds: timeoutInSeconds } });
                            await updateManifest(pendingManifest);
                            clock.tick(3600 * 1000);

                            expect(errHandlerMock.errorCode).to.be.undefined;
                        });
                    });

                    it('should raise an error at once if the MPD has no minimumUpdatePeriod', async function () {
                        const updatePeriodStub = sinon.stub(adapterMock, 'getManifestUpdatePeriod').returns(NaN);
                        await updateManifest(pendingManifest);
                        updatePeriodStub.restore();

                        expect(contentPendingSpy.called).to.be.false;
                        expect(errHandlerMock.errorCode).to.equal(Errors.MANIFEST_ERROR_ID_NOSTREAMS_CODE);
                        expect(errHandlerMock.errorValue).to.include('minimumUpdatePeriod');
                    });

                    it('should raise an error at once if the MPD has no URL to update it from', async function () {
                        await updateManifest({ type: 'dynamic' });

                        expect(contentPendingSpy.called).to.be.false;
                        expect(errHandlerMock.errorCode).to.equal(Errors.MANIFEST_ERROR_ID_NOSTREAMS_CODE);
                        expect(errHandlerMock.errorValue).to.include('no URL');
                    });

                    it('should wait for an MPD without URL that has a Location', async function () {
                        const locationStub = sinon.stub(adapterMock, 'getLocation').returns([{ url: 'https://example.com/live.mpd' }]);
                        await updateManifest({ type: 'dynamic' });
                        locationStub.restore();

                        expect(contentPendingSpy.calledOnce).to.be.true;
                        expect(errHandlerMock.errorCode).to.be.undefined;
                    });

                    it('should raise an error if the presentation ended before its MPD listed content', async function () {
                        await updateManifest(pendingManifest);
                        getIsContentPendingStub.returns(false);
                        const listsContentStub = sinon.stub(adapterMock, 'getListsContent').returns(false);
                        await updateManifest({ type: 'static', url: pendingManifest.url });
                        listsContentStub.restore();

                        expect(errHandlerMock.errorCode).to.equal(Errors.MANIFEST_ERROR_ID_NOSTREAMS_CODE);
                        expect(errHandlerMock.errorValue).to.include('ended');
                    });

                    it('should start the stream once the content is no longer pending', function (done) {
                        clock.restore();
                        doneFn = done;
                        expectedStartTime = liveStartTime;

                        updateManifest(pendingManifest).then(() => {
                            expect(contentPendingSpy.calledOnce).to.be.true;

                            getIsContentPendingStub.returns(false);
                            eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);
                        }).catch(done);
                    });

                    it('should not check for pending content once a stream is active', function (done) {
                        clock.restore();
                        doneFn = (err) => {
                            if (err) {
                                done(err);
                                return;
                            }
                            // INITIAL_STREAM_SWITCH fires before the stream is set active
                            setTimeout(() => {
                                getIsContentPendingStub.resetHistory();
                                filterSpy.resetHistory();
                                getIsContentPendingStub.returns(true);
                                updateManifest(pendingManifest).then(() => {
                                    expect(filterSpy.calledOnce).to.be.true;
                                    expect(getIsContentPendingStub.called).to.be.false;
                                    expect(contentPendingSpy.called).to.be.false;
                                    done();
                                }).catch(done);
                            }, 0);
                        };
                        expectedStartTime = liveStartTime;
                        getIsContentPendingStub.returns(false);
                        eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);
                    });
                });

                it('should raise an error event instead of rejecting if the first stream can not be initialized', function (done) {
                    errHandlerMock.reset();
                    const dvrInfoStub = sinon.stub(dashMetricsMock, 'getCurrentDVRInfo').returns(null);
                    eventBus.off(Events.INITIAL_STREAM_SWITCH, onInitialStreamSwitch);

                    getStreamsInfoStub.returns([dynamicStreamInfo]);
                    eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);

                    setTimeout(() => {
                        dvrInfoStub.restore();
                        try {
                            expect(errHandlerMock.errorCode).to.equal(Errors.MANIFEST_ERROR_ID_NOSTREAMS_CODE);
                            done();
                        } catch (e) {
                            done(e);
                        }
                    }, 0);
                });

                it('should raise an error event if the switch to the first stream fails twice', function (done) {
                    errHandlerMock.reset();
                    let switchAttempts = 0;
                    const throwingListener = () => {
                        switchAttempts++;
                        throw new Error('initial stream switch failed');
                    };
                    eventBus.off(Events.INITIAL_STREAM_SWITCH, onInitialStreamSwitch);
                    eventBus.on(Events.INITIAL_STREAM_SWITCH, throwingListener);

                    getStreamsInfoStub.returns([dynamicStreamInfo]);
                    eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);

                    setTimeout(() => {
                        eventBus.off(Events.INITIAL_STREAM_SWITCH, throwingListener);
                        try {
                            expect(switchAttempts).to.equal(2);
                            expect(errHandlerMock.errorCode).to.equal(Errors.MANIFEST_ERROR_ID_NOSTREAMS_CODE);
                            done();
                        } catch (e) {
                            done(e);
                        }
                    }, 0);
                });

                it('should start the first stream if only the first switch to it fails', function (done) {
                    errHandlerMock.reset();
                    let switchAttempts = 0;
                    const failingOnceListener = () => {
                        switchAttempts++;
                        if (switchAttempts === 1) {
                            throw new Error('initial stream switch failed');
                        }
                    };
                    eventBus.off(Events.INITIAL_STREAM_SWITCH, onInitialStreamSwitch);
                    eventBus.on(Events.INITIAL_STREAM_SWITCH, failingOnceListener);
                    const streamsComposedSpy = sinon.spy();
                    eventBus.on(Events.STREAMS_COMPOSED, streamsComposedSpy);

                    getStreamsInfoStub.returns([dynamicStreamInfo]);
                    eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);

                    setTimeout(() => {
                        eventBus.off(Events.INITIAL_STREAM_SWITCH, failingOnceListener);
                        eventBus.off(Events.STREAMS_COMPOSED, streamsComposedSpy);
                        try {
                            expect(switchAttempts).to.equal(2);
                            expect(streamsComposedSpy.calledOnce).to.be.true;
                            expect(errHandlerMock.errorCode).to.be.undefined;
                            done();
                        } catch (e) {
                            done(e);
                        }
                    }, 0);
                });

                it('should not start the first stream of a session that has been reset while its streams were initialized', function (done) {
                    const initialStreamSwitchSpy = sinon.spy();
                    const streamsComposedSpy = sinon.spy();
                    eventBus.off(Events.INITIAL_STREAM_SWITCH, onInitialStreamSwitch);
                    eventBus.on(Events.INITIAL_STREAM_SWITCH, initialStreamSwitchSpy);
                    eventBus.on(Events.STREAMS_COMPOSED, streamsComposedSpy);

                    getStreamsInfoStub.returns([dynamicStreamInfo]);
                    eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);
                    streamController.reset();
                    errHandlerMock.reset();

                    setTimeout(() => {
                        eventBus.off(Events.INITIAL_STREAM_SWITCH, initialStreamSwitchSpy);
                        eventBus.off(Events.STREAMS_COMPOSED, streamsComposedSpy);
                        try {
                            expect(initialStreamSwitchSpy.called).to.be.false;
                            expect(streamsComposedSpy.called).to.be.false;
                            expect(errHandlerMock.errorCode).to.be.undefined;
                            done();
                        } catch (e) {
                            done(e);
                        }
                    }, 0);
                });

                it('should not raise an error for the first composition once the stream is active', function (done) {
                    errHandlerMock.reset();
                    const onUnhandledRejection = (event) => event.preventDefault();
                    const throwingListener = () => {
                        throw new Error('STREAMS_COMPOSED listener failed');
                    };
                    window.addEventListener('unhandledrejection', onUnhandledRejection);
                    eventBus.on(Events.STREAMS_COMPOSED, throwingListener);
                    doneFn = (err) => {
                        if (err) {
                            done(err);
                            return;
                        }
                        setTimeout(() => {
                            eventBus.off(Events.STREAMS_COMPOSED, throwingListener);
                            window.removeEventListener('unhandledrejection', onUnhandledRejection);
                            try {
                                expect(errHandlerMock.errorCode).to.be.undefined;
                                done();
                            } catch (e) {
                                done(e);
                            }
                        }, 10);
                    };
                    expectedStartTime = liveStartTime;
                    getStreamsInfoStub.returns([dynamicStreamInfo]);
                    eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);
                });

                it('should ignore a failed first composition of a session that has been reset', function (done) {
                    const dvrInfoStub = sinon.stub(dashMetricsMock, 'getCurrentDVRInfo').returns(null);
                    eventBus.off(Events.INITIAL_STREAM_SWITCH, onInitialStreamSwitch);

                    getStreamsInfoStub.returns([dynamicStreamInfo]);
                    eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);
                    streamController.reset();
                    errHandlerMock.reset();

                    setTimeout(() => {
                        dvrInfoStub.restore();
                        try {
                            expect(errHandlerMock.errorCode).to.be.undefined;
                            done();
                        } catch (e) {
                            done(e);
                        }
                    }, 0);
                });

                it('should not start a reset session once the waiting time of a start time in the future expired', function () {
                    const clock = sinon.useFakeTimers({ now: Date.now(), toFake: ['setTimeout', 'clearTimeout'] });
                    const dvrInfoStub = sinon.stub(dashMetricsMock, 'getCurrentDVRInfo')
                        .returns({ range: { start: 0, end: -10 } });
                    const initialStreamSwitchSpy = sinon.spy();
                    eventBus.off(Events.INITIAL_STREAM_SWITCH, onInitialStreamSwitch);
                    eventBus.on(Events.INITIAL_STREAM_SWITCH, initialStreamSwitchSpy);

                    return new Promise((resolve) => {
                        eventBus.on(Events.AST_IN_FUTURE, function onAstInFuture() {
                            eventBus.off(Events.AST_IN_FUTURE, onAstInFuture);
                            resolve();
                        });
                        getStreamsInfoStub.returns([dynamicStreamInfo]);
                        eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);
                        clock.runToLast();
                    }).then(() => {
                        streamController.reset();
                        errHandlerMock.reset();
                        dvrInfoStub.returns({ range: dvrWindowRange });
                        clock.tick(3600 * 1000);
                        return Promise.resolve();
                    }).then(() => {
                        expect(initialStreamSwitchSpy.called).to.be.false;
                        expect(errHandlerMock.errorCode).to.be.undefined;
                        expect(clock.countTimers()).to.equal(0);
                    }).finally(() => {
                        eventBus.off(Events.INITIAL_STREAM_SWITCH, initialStreamSwitchSpy);
                        dvrInfoStub.restore();
                        clock.restore();
                    });
                });

                it('should not clamp a seek time beyond the announced end of a dynamic stream with finite duration', function (done) {
                    doneFn = function (err) {
                        if (err) {
                            done(err);
                            return;
                        }
                        setTimeout(() => {
                            try {
                                const seekEvent = { seekTime: 999999999 };
                                eventBus.trigger(Events.PLAYBACK_SEEKING, seekEvent);
                                expect(seekEvent.seekTime).to.equal(999999999);
                                done();
                            } catch (e) {
                                done(e);
                            }
                        }, 0);
                    };

                    expectedStartTime = liveStartTime;
                    // Planned-end live event: dynamic manifest with a finite announced duration
                    getStreamsInfoStub.returns([{
                        manifestInfo: { isDynamic: true, dvrWindowSize: 30, minBufferTime: 4 },
                        start: 10,
                        duration: 600,
                        id: '1'
                    }]);
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

                it('should start dynamic stream at #t=posix on millisecond level', function (done) {
                    doneFn = done;

                    let uriStartTime = dvrWindowRange.start + 10.555;
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

    describe('period switch from an unencrypted to an encrypted period', function () {

        const clearStreamInfo = {
            manifestInfo: { isDynamic: false }, start: 0, duration: 10, id: 'clear', isEncrypted: false
        };
        const encryptedStreamInfo = {
            manifestInfo: { isDynamic: false }, start: 10, duration: 10, id: 'encrypted', isEncrypted: true
        };
        const capabilitiesStub = {
            isProtectionCompatible: (previousStreamInfo, newStreamInfo) => {
                return !(!previousStreamInfo.isEncrypted && newStreamInfo.isEncrypted);
            },
            supportsChangeType: () => true
        };
        let getStreamsInfoStub;
        let getIsDynamicStub;

        /**
         * Starts playback in the unencrypted period and reports it as completely buffered. The encrypted period is
         * only preloaded into the existing SourceBuffers if the period switch can be seamless.
         * @return {Promise<boolean>} true if the SourceBuffers are kept for the encrypted period
         */
        function _areSourceBuffersKeptForEncryptedPeriod() {
            return new Promise((resolve) => {
                const onStreamsComposed = () => {
                    eventBus.off(Events.STREAMS_COMPOSED, onStreamsComposed);
                    const [clearStream, encryptedStream] = streamController.getStreams();
                    const startPreloadingStub = sinon.stub(encryptedStream, 'startPreloading').resolves();
                    sinon.stub(clearStream, 'getHasFinishedBuffering').returns(true);

                    // The StreamController checks if prebuffering can start right after triggering STREAMS_COMPOSED
                    setTimeout(() => {
                        resolve(startPreloadingStub.called);
                    }, 0);
                };
                eventBus.on(Events.STREAMS_COMPOSED, onStreamsComposed);
                eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);
            });
        }

        beforeEach(function () {
            settings.reset();
            videoModelMock.time = -1;
            dashMetricsMock.addDVRInfo('video', Date.now(), null, { start: 0, end: 20 });
            delete protectionControllerMock.hasLicenseBeenApplied;
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
                capabilities: capabilitiesStub,
                capabilitiesFilter: capabilitiesFilterMock,
                textController: textControllerMock,
                contentSteeringController: contentSteeringControllerMock,
                settings: settings,
                uriFragmentModel: uriFragmentModelMock,
                serviceDescriptionController: ServiceDescriptionController(context).getInstance()
            });
            streamController.initialize(false);
            getStreamsInfoStub = sinon.stub(adapterMock, 'getStreamsInfo').returns([clearStreamInfo, encryptedStreamInfo]);
            getIsDynamicStub = sinon.stub(adapterMock, 'getIsDynamic').returns(false);
        });

        afterEach(function () {
            streamController.reset();
            getStreamsInfoStub.restore();
            getIsDynamicStub.restore();
            delete protectionControllerMock.hasLicenseBeenApplied;
            uriFragmentModelMock.reset();
        });

        it('should not keep the SourceBuffers if no license has been applied', async function () {
            protectionControllerMock.hasLicenseBeenApplied = () => false;

            expect(await _areSourceBuffersKeptForEncryptedPeriod()).to.be.false;
        });

        it('should not keep the SourceBuffers if the ProtectionController can not report an applied license', async function () {
            expect(await _areSourceBuffersKeptForEncryptedPeriod()).to.be.false;
        });

        it('should keep the SourceBuffers if a license has been applied', async function () {
            protectionControllerMock.hasLicenseBeenApplied = () => true;

            expect(await _areSourceBuffersKeptForEncryptedPeriod()).to.be.true;
        });
    });

    describe('refreshManifest', function () {
        beforeEach(function () {
            streamController.setConfig({
                manifestUpdater: manifestUpdaterMock
            });
            sinon.spy(manifestUpdaterMock, 'refreshManifest');
            sinon.stub(manifestUpdaterMock, 'getIsUpdating');
        });


        afterEach(function () {
            manifestUpdaterMock.refreshManifest.restore();
            manifestUpdaterMock.getIsUpdating.restore();
        });


        it('calls refreshManifest on ManifestUpdater', function () {
            streamController.refreshManifest();

            expect(manifestUpdaterMock.refreshManifest.calledOnce).to.be.true;
        });

        it('does not call refreshManifest on ManifrstUpdater if it is already updating', function () {
            manifestUpdaterMock.getIsUpdating.returns(true)

            streamController.refreshManifest();

            expect(manifestUpdaterMock.refreshManifest.notCalled).to.be.true;
        })
    });
});
