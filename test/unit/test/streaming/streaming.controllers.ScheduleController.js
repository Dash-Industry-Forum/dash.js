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
        let clock, eventBus, fragmentNeededSpy, playbackControllerStub, currentBufferingTime, bufferedEnds, ownRanges;
        const toRanges = (r) => ({ length: r.length, start: (i) => r[i][0], end: (i) => r[i][1] });

        function createScheduleController(bufferingTime, type = Constants.VIDEO, videoBufferedEnd = NaN) {
            streamInfo = voHelper.getDummyStreamInfo();
            dashMetrics = new DashMetricsMock();
            abrController = new AbrControllerMock();
            mediaPlayerModel = new MediaPlayerModelMock();
            representationController = new RepresentationControllerMock();
            currentBufferingTime = bufferingTime;
            bufferedEnds = { video: videoBufferedEnd, audio: NaN };
            ownRanges = [[0, 16], [24, 40]];

            playbackControllerStub = {
                getTime: () => 9,
                // Video element ranges: all tracks have data behind the gap
                getBufferedRanges: () => toRanges([[0, 16], [24, 40]]),
                isPaused: () => false,
                getLowLatencyModeEnabled: () => false
            };
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
                    getBuffer: () => ({ getAllBufferRanges: () => toRanges(ownRanges) })
                },
                playbackController: playbackControllerStub,
                getBufferingTime: () => currentBufferingTime,
                getBufferedEndForType: (mediaType) => bufferedEnds[mediaType]
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

            // The scheduler is still running and requests again once the media behind the gap no longer counts.
            // Makes sure the assertion above is not caused by an exception, which _shouldScheduleNextRequest would swallow.
            currentBufferingTime = 16;
            clock.tick(mediaPlayerModel.getScheduleTimeout());

            expect(fragmentNeededSpy.calledOnce).to.be.true;
        });

        it('should request more segments if the media behind the gap does not overlap with the other track yet and the other track is further ahead', () => {
            // E.g. video gap 16-24 and audio gap 16-48: the video element has no range behind the gap, so the GapController can not jump yet
            createScheduleController(40);
            playbackControllerStub.getBufferedRanges = () => toRanges([[0, 16]]);
            bufferedEnds.audio = 56;
            scheduleController.startScheduleTimer(0);
            clock.tick(1);

            expect(fragmentNeededSpy.calledOnce).to.be.true;
        });

        it('should not request more segments without an overlap behind the gap if the other track is not further ahead', () => {
            // Buffering more video can not create an overlap with audio, so the media behind the gap counts
            createScheduleController(40);
            playbackControllerStub.getBufferedRanges = () => toRanges([[0, 16]]);
            bufferedEnds.audio = 20;
            scheduleController.startScheduleTimer(0);
            clock.tick(1);

            expect(fragmentNeededSpy.notCalled).to.be.true;

            // Once audio is further ahead, video continues to create the overlap
            bufferedEnds.audio = 56;
            clock.tick(mediaPlayerModel.getScheduleTimeout());

            expect(fragmentNeededSpy.calledOnce).to.be.true;
        });

        it('should not count buffered media without a playback time, e.g. while preloading', () => {
            // Counting from 0 would include [0, 16] and [24, 40], i.e. 32s, and stop scheduling. The buffer level (7) is below the target (18)
            createScheduleController(40);
            playbackControllerStub.getTime = () => null;
            scheduleController.startScheduleTimer(0);
            clock.tick(1);

            expect(fragmentNeededSpy.calledOnce).to.be.true;
        });

        it('should request more segments if the buffered media until the next request is below the buffer target', () => {
            createScheduleController(16);
            scheduleController.startScheduleTimer(0);
            clock.tick(1);

            expect(fragmentNeededSpy.calledOnce).to.be.true;
        });

        it('should not change the scheduling decision without a gap in the buffer', () => {
            // Contiguous buffer from 0 to 16 and currentTime 9: the buffered time until the next request equals the buffer level (7)
            createScheduleController(16);
            ownRanges = [[0, 16]];
            playbackControllerStub.getBufferedRanges = () => toRanges([[0, 16]]);
            scheduleController.startScheduleTimer(0);
            clock.tick(1);

            // 7 + 4 (segment duration) < 18, same as before
            expect(fragmentNeededSpy.calledOnce).to.be.true;
        });

        it('should not change the audio buffer target without a gap in the video buffer', () => {
            // Video is appended contiguously until 16: the time until the end of the appended video equals the video buffer level (7)
            createScheduleController(20, Constants.AUDIO, 16);

            expect(scheduleController.getBufferTarget()).to.equal(7 + 1);
        });

        it('should base the audio buffer target on the end of the appended video data if the video buffer has a gap', () => {
            // Video level ends at the gap (16 - 9 = 7), but video is appended until 40: target = 40 - 9 + 1
            createScheduleController(20, Constants.AUDIO, 40);
            mediaPlayerModel.getBufferTimeDefaultUnadjusted = () => 60;

            expect(scheduleController.getBufferTarget()).to.equal(32);
        });

        it('should limit the audio buffer target behind a video gap to the buffer target audio would use on its own', () => {
            // Video is appended until 169 behind a large gap. Without the limit the target would be 169 - 9 + 1 = 161
            createScheduleController(20, Constants.AUDIO, 169);

            expect(scheduleController.getBufferTarget()).to.equal(18 + 1);
        });

        it('should continue buffering audio behind a gap in the video buffer', () => {
            createScheduleController(20, Constants.AUDIO, 40);
            // Without the gap handling the audio target would be the video buffer level + 1 = 8
            dashMetrics.getCurrentBufferLevel = (mediaType) => mediaType === Constants.VIDEO ? 7 : 11;
            scheduleController.startScheduleTimer(0);
            clock.tick(1);

            expect(fragmentNeededSpy.calledOnce).to.be.true;
        });

        it('should use the video buffer level for the audio buffer target if there is no appended video data', () => {
            createScheduleController(20, Constants.AUDIO, NaN);

            expect(scheduleController.getBufferTarget()).to.equal(8);
        });

        it('should use the video buffer level for the audio buffer target if there is no playback time, e.g. while preloading', () => {
            createScheduleController(20, Constants.AUDIO, 40);
            playbackControllerStub.getTime = () => null;

            expect(scheduleController.getBufferTarget()).to.equal(8);
        });
    });
});
