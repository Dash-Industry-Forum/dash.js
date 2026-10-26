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

    describe('scheduling with a gap in the buffer', () => {
        let clock, eventBus, fragmentNeededSpy;
        const toRanges = (r) => ({ length: r.length, start: (i) => r[i][0], end: (i) => r[i][1] });

        function createScheduleController(bufferingTime, type = Constants.VIDEO, videoBufferingTime = NaN) {
            streamInfo = voHelper.getDummyStreamInfo();
            dashMetrics = new DashMetricsMock();
            abrController = new AbrControllerMock();
            mediaPlayerModel = new MediaPlayerModelMock();
            representationController = new RepresentationControllerMock();

            // Contiguous buffer level from currentTime 9 to the start of the gap at 16
            dashMetrics.currentBufferLevel = 7;
            abrController.handlePendingManualQualitySwitch = () => false;
            abrController.isPlayingAtTopQuality = () => false;
            mediaPlayerModel.getScheduleTimeout = () => 500;
            mediaPlayerModel.getBufferTimeDefaultUnadjusted = () => 18;
            representationController.getCurrentRepresentation = () => ({ id: 'v1', segmentDuration: 4, mediaInfo: { streamInfo } });

            scheduleController = ScheduleController(context).create({
                streamInfo,
                type,
                dashMetrics,
                abrController,
                mediaPlayerModel,
                representationController,
                settings,
                bufferController: {
                    getIsBufferingCompleted: () => false,
                    getBuffer: () => ({ getAllBufferRanges: () => toRanges([[0, 16], [24, 40]]) })
                },
                playbackController: {
                    getTime: () => 9,
                    isPaused: () => false,
                    getLowLatencyModeEnabled: () => false
                },
                getBufferingTime: () => bufferingTime,
                getVideoBufferingTime: () => videoBufferingTime
            });
            scheduleController.initialize(type === Constants.AUDIO);
            scheduleController.setLastInitializedRepresentationId('v1');
        }

        beforeEach(() => {
            clock = sinon.useFakeTimers();
            eventBus = EventBus(context).getInstance();
            fragmentNeededSpy = sinon.spy();
            eventBus.on(Events.MEDIA_FRAGMENT_NEEDED, fragmentNeededSpy);
        });

        afterEach(() => {
            eventBus.off(Events.MEDIA_FRAGMENT_NEEDED, fragmentNeededSpy);
            clock.restore();
        });

        it('should not request more segments if the media behind the gap already reaches the buffer target', () => {
            createScheduleController(40);
            scheduleController.startScheduleTimer(0);
            clock.tick(1);

            expect(fragmentNeededSpy.notCalled).to.be.true;
        });

        it('should request more segments if the buffered media until the next request is below the buffer target', () => {
            createScheduleController(16);
            scheduleController.startScheduleTimer(0);
            clock.tick(1);

            expect(fragmentNeededSpy.calledOnce).to.be.true;
        });

        it('should continue buffering audio up to the position video has been requested to, even if the video buffer level is small because of a gap', () => {
            // Audio is buffered until 20, video has been requested until 40 but its contiguous buffer level ends at the gap
            createScheduleController(20, Constants.AUDIO, 40);
            // Audio target is the video buffer level + 1 = 8. The audio buffer level alone does not require another segment
            dashMetrics.getCurrentBufferLevel = (mediaType) => mediaType === Constants.VIDEO ? 7 : 11;
            scheduleController.startScheduleTimer(0);
            clock.tick(1);

            expect(fragmentNeededSpy.calledOnce).to.be.true;
        });

        it('should stop buffering audio once it is ahead of the position video has been requested to', () => {
            createScheduleController(42, Constants.AUDIO, 40);
            dashMetrics.getCurrentBufferLevel = (mediaType) => mediaType === Constants.VIDEO ? 7 : 11;
            scheduleController.startScheduleTimer(0);
            clock.tick(1);

            expect(fragmentNeededSpy.notCalled).to.be.true;
        });
    });
});
