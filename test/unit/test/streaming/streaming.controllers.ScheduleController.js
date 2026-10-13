import Settings from '../../../../src/core/Settings.js';
import ScheduleController from '../../../../src/streaming/controllers/ScheduleController.js';
import VoHelper from '../../helpers/VOHelper.js';
import Constants from '../../../../src/streaming/constants/Constants.js';
import AdapterMock from '../../mocks/AdapterMock.js';
import DashMetricsMock from '../../mocks/DashMetricsMock.js';
import AbrControllerMock from '../../mocks/AbrControllerMock.js';
import MediaPlayerModelMock from '../../mocks/MediaPlayerModelMock.js';
import TextControllerMock from '../../mocks/TextControllerMock.js';
import RepresentationControllerMock from '../../mocks/RepresentationControllerMock.js';
import PlaybackControllerMock from '../../mocks/PlaybackControllerMock.js';
import EventBus from '../../../../src/core/EventBus.js';
import Events from '../../../../src/core/events/Events.js';
import sinon from 'sinon';

const voHelper = new VoHelper();
import {expect} from 'chai';
const context = {};
const settings = Settings(context).getInstance();

let scheduleController;
let streamInfo, adapter, dashMetrics, abrController, mediaPlayerModel, textController, representationController;

describe('ScheduleController', function () {

    afterEach(() => {
        settings.reset();
        if (scheduleController) {
            scheduleController.reset();
        }
    });

    describe('getBufferTarget()', () => {

        beforeEach(() => {
            streamInfo = voHelper.getDummyStreamInfo();
            adapter = new AdapterMock();
            dashMetrics = new DashMetricsMock();
            abrController = new AbrControllerMock();
            mediaPlayerModel = new MediaPlayerModelMock();
            textController = new TextControllerMock();
            representationController = new RepresentationControllerMock();
        })

        describe('for missing values', () => {

            it('should return NaN if type is undefined', () => {
                scheduleController = ScheduleController(context).create({
                    streamInfo,
                    adapter,
                    dashMetrics,
                    abrController,
                    mediaPlayerModel,
                    textController,
                    representationController,
                    settings
                });
                const result = scheduleController.getBufferTarget();
                expect(result).to.be.NaN;
            });

            it('should return NaN if voRepresentation is undefined', () => {
                representationController.getCurrentRepresentation = function () {
                    return undefined
                }
                scheduleController = ScheduleController(context).create({
                    streamInfo,
                    adapter,
                    type: Constants.VIDEO,
                    dashMetrics,
                    abrController,
                    mediaPlayerModel,
                    representationController,
                    settings
                });
                const result = scheduleController.getBufferTarget();
                expect(result).to.be.NaN;
            });
        })

        describe('for type audio', () => {

            beforeEach(() => {
                scheduleController = ScheduleController(context).create({
                    streamInfo,
                    adapter,
                    type: Constants.AUDIO,
                    dashMetrics,
                    abrController,
                    mediaPlayerModel,
                    representationController,
                    settings
                });
            })

            it('should return 16 (value returns by getCurrentBufferLevel of DashMetricsMock + 1) if current representation is audio and videoTrackPresent is true', () => {
                representationController.getCurrentRepresentation = function () {
                    return {}
                }
                scheduleController.initialize(true);
                const result = scheduleController.getBufferTarget();
                expect(result).to.be.equal(16);
            });

            it('should return 12 (DEFAULT_MIN_BUFFER_TIME of MediaPlayerModelMock) if current representation is audio and videoTrackPresent is false', () => {
                scheduleController.initialize(false);
                representationController.getCurrentRepresentation = function () {
                    return { mediaInfo: { streamInfo: streamInfo } }
                }
                const result = scheduleController.getBufferTarget();
                expect(result).to.be.equal(12);
            });

            it('should return bufferTimeAtTopQuality if current representation is audio and videoTrackPresent is false and playing on highest quality', () => {
                scheduleController.initialize(false);
                abrController.isPlayingAtTopQuality = () => true;
                streamInfo.manifestInfo = { duration: 10 };
                representationController.getCurrentRepresentation = function () {
                    return { mediaInfo: { streamInfo: streamInfo } }
                }
                const result = scheduleController.getBufferTarget();
                expect(result).to.be.equal(settings.get().streaming.buffer.bufferTimeAtTopQuality);
            });

            it('should return bufferTimeAtTopQualityLongForm if current representation is audio and videoTrackPresent is false and playing on highest quality for long form content', () => {
                scheduleController.initialize(false);
                abrController.isPlayingAtTopQuality = () => true;
                streamInfo.manifestInfo = { duration: Infinity };
                representationController.getCurrentRepresentation = function () {
                    return { mediaInfo: { streamInfo: streamInfo } }
                }
                const result = scheduleController.getBufferTarget();
                expect(result).to.be.equal(settings.get().streaming.buffer.bufferTimeAtTopQualityLongForm);
            });
        })

        describe('for type video', () => {

            beforeEach(() => {
                scheduleController = ScheduleController(context).create({
                    streamInfo,
                    adapter,
                    type: Constants.VIDEO,
                    dashMetrics,
                    abrController,
                    mediaPlayerModel,
                    representationController,
                    settings
                });
            })

            it('should return 15 (value returns by getCurrentBufferLevel of DashMetricsMock) if current representation is video', () => {
                scheduleController.initialize(true);
                representationController.getCurrentRepresentation = function () {
                    return { mediaInfo: { streamInfo: streamInfo } }
                }
                const result = scheduleController.getBufferTarget();
                expect(result).to.be.equal(mediaPlayerModel.getBufferTimeDefault());
            });

            it('should return bufferTimeAtTopQuality if current representation is video and playing on highest quality', () => {
                scheduleController.initialize(false);
                abrController.isPlayingAtTopQuality = () => true;
                streamInfo.manifestInfo = { duration: 10 };
                representationController.getCurrentRepresentation = function () {
                    return { mediaInfo: { streamInfo: streamInfo } }
                }
                const result = scheduleController.getBufferTarget();
                expect(result).to.be.equal(settings.get().streaming.buffer.bufferTimeAtTopQuality);
            });

            it('should return bufferTimeAtTopQualityLongForm if current representation is video and playing on highest quality for long form content', () => {
                scheduleController.initialize(false);
                abrController.isPlayingAtTopQuality = () => true;
                streamInfo.manifestInfo = { duration: Infinity };
                representationController.getCurrentRepresentation = function () {
                    return { mediaInfo: { streamInfo: streamInfo } }
                }
                const result = scheduleController.getBufferTarget();
                expect(result).to.be.equal(settings.get().streaming.buffer.bufferTimeAtTopQualityLongForm);
            });

        });

        describe('for type text', () => {

            beforeEach(() => {
                scheduleController = ScheduleController(context).create({
                    streamInfo,
                    adapter,
                    type: Constants.TEXT,
                    dashMetrics,
                    abrController,
                    mediaPlayerModel,
                    textController,
                    representationController,
                    settings
                });
            })

            it('should return 0 if current representation is text, and subtitles are disabled', function () {
                representationController.getCurrentRepresentation = function () {
                    return {}
                }
                const result = scheduleController.getBufferTarget();
                expect(result).to.be.equal(0);
            });

            it('should return 6 (value returns by voRepresentation.fragmentDuration) if current representation is text, and subtitles are enabled', function () {
                textController.enableText(true);
                representationController.getCurrentRepresentation = function () {
                    return {fragmentDuration: 6}
                }
                const result = scheduleController.getBufferTarget();
                expect(result).to.be.equal(6);
            });
        })

    })
    describe('lazy SegmentBase segment list', () => {
        const eventBus = EventBus(context).getInstance();
        let clock, representation, loadSegmentListCalls, pendingLoad, initFragmentsNeeded;

        function onInitFragmentNeeded() {
            initFragmentsNeeded++;
        }

        beforeEach(() => {
            clock = sinon.useFakeTimers();
            representation = { id: 'rep1', segments: null };
            loadSegmentListCalls = 0;
            initFragmentsNeeded = 0;
            pendingLoad = null;
            representationController = new RepresentationControllerMock();
            representationController.getCurrentRepresentation = () => representation;
            // Every call starts a load that settles when the test resolves it, like a sidx request
            representationController.loadSegmentList = () => {
                if (representation.segments) {
                    return null;
                }
                loadSegmentListCalls++;
                if (!pendingLoad) {
                    let resolve;
                    const promise = new Promise((r) => {
                        resolve = r;
                    });
                    pendingLoad = { promise, resolve: () => {
                        pendingLoad = null;
                        resolve(representation);
                    } };
                }
                return pendingLoad.promise;
            };
            abrController = new AbrControllerMock();
            abrController.handlePendingManualQualitySwitch = () => false;
            eventBus.on(Events.INIT_FRAGMENT_NEEDED, onInitFragmentNeeded);

            scheduleController = ScheduleController(context).create({
                streamInfo: voHelper.getDummyStreamInfo(),
                type: Constants.VIDEO,
                dashMetrics: new DashMetricsMock(),
                abrController,
                bufferController: { getIsBufferingCompleted: () => false },
                mediaPlayerModel: { getScheduleTimeout: () => 500 },
                playbackController: new PlaybackControllerMock(),
                representationController,
                settings
            });
            scheduleController.initialize(true);
        });

        afterEach(() => {
            eventBus.off(Events.INIT_FRAGMENT_NEEDED, onInitFragmentNeeded);
            clock.restore();
        });

        it('should pause scheduling while the segment list loads and resume once it is loaded', async () => {
            scheduleController.startScheduleTimer(0);
            await clock.tickAsync(0);
            expect(loadSegmentListCalls).to.equal(1);
            expect(initFragmentsNeeded).to.equal(0);

            // Another restart while loading must not start a second load
            scheduleController.startScheduleTimer(0);
            await clock.tickAsync(0);
            expect(initFragmentsNeeded).to.equal(0);

            representation.segments = [{}];
            pendingLoad.resolve();
            await clock.tickAsync(0);
            expect(initFragmentsNeeded).to.equal(1);
        });

        it('should retry with a backoff when the segment list could not be loaded', async () => {
            scheduleController.startScheduleTimer(0);
            await clock.tickAsync(0);
            pendingLoad.resolve();
            await clock.tickAsync(999);
            expect(loadSegmentListCalls).to.equal(1);
            await clock.tickAsync(1);
            expect(loadSegmentListCalls).to.equal(2);

            pendingLoad.resolve();
            await clock.tickAsync(1999);
            expect(loadSegmentListCalls).to.equal(2);
            await clock.tickAsync(1);
            expect(loadSegmentListCalls).to.equal(3);
            expect(initFragmentsNeeded).to.equal(0);
        });

        it('should not resume scheduling when reset while the segment list loads', async () => {
            scheduleController.startScheduleTimer(0);
            await clock.tickAsync(0);
            scheduleController.reset();

            representation.segments = [{}];
            pendingLoad.resolve();
            await clock.tickAsync(20000);
            expect(initFragmentsNeeded).to.equal(0);
            scheduleController = null;
        });
    });
});
