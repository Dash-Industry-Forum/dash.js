import Settings from '../../src/core/Settings';
import ScheduleController from '../../src/streaming/controllers/ScheduleController';
import VoHelper from './helpers/VOHelper';
import Constants from '../../src/streaming/constants/Constants';
import AdapterMock from './mocks/AdapterMock';
import DashMetricsMock from './mocks/DashMetricsMock';
import AbrControllerMock from './mocks/AbrControllerMock';
import MediaPlayerModelMock from './mocks/MediaPlayerModelMock';
import TextControllerMock from './mocks/TextControllerMock';
import RepresentationControllerMock from './mocks/RepresentationControllerMock';

const voHelper = new VoHelper();
const expect = require('chai').expect;
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

            it('should return NaN if representationInfo is undefined', () => {
                representationController.getCurrentRepresentationInfo = function () {
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
                representationController.getCurrentRepresentationInfo = function () {
                    return {}
                }
                scheduleController.initialize(true);
                const result = scheduleController.getBufferTarget();
                expect(result).to.be.equal(16);
            });

            it('should return 12 (DEFAULT_MIN_BUFFER_TIME of MediaPlayerModelMock) if current representation is audio and videoTrackPresent is false', () => {
                scheduleController.initialize(false);
                representationController.getCurrentRepresentationInfo = function () {
                    return { mediaInfo: { streamInfo: streamInfo } }
                }
                const result = scheduleController.getBufferTarget();
                expect(result).to.be.equal(12);
            });

            it('should return bufferTimeAtTopQuality if current representation is audio and videoTrackPresent is false and playing on highest quality', () => {
                scheduleController.initialize(false);
                abrController.isPlayingAtTopQuality = () => true;
                streamInfo.manifestInfo = { duration: 10 };
                representationController.getCurrentRepresentationInfo = function () {
                    return { mediaInfo: { streamInfo: streamInfo } }
                }
                const result = scheduleController.getBufferTarget();
                expect(result).to.be.equal(settings.get().streaming.buffer.bufferTimeAtTopQuality);
            });

            it('should return bufferTimeAtTopQualityLongForm if current representation is audio and videoTrackPresent is false and playing on highest quality for long form content', () => {
                scheduleController.initialize(false);
                abrController.isPlayingAtTopQuality = () => true;
                streamInfo.manifestInfo = { duration: Infinity };
                representationController.getCurrentRepresentationInfo = function () {
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
                representationController.getCurrentRepresentationInfo = function () {
                    return { mediaInfo: { streamInfo: streamInfo } }
                }
                const result = scheduleController.getBufferTarget();
                expect(result).to.be.equal(mediaPlayerModel.getStableBufferTime());
            });

            it('should return bufferTimeAtTopQuality if current representation is video and playing on highest quality', () => {
                scheduleController.initialize(false);
                abrController.isPlayingAtTopQuality = () => true;
                streamInfo.manifestInfo = { duration: 10 };
                representationController.getCurrentRepresentationInfo = function () {
                    return { mediaInfo: { streamInfo: streamInfo } }
                }
                const result = scheduleController.getBufferTarget();
                expect(result).to.be.equal(settings.get().streaming.buffer.bufferTimeAtTopQuality);
            });

            it('should return bufferTimeAtTopQualityLongForm if current representation is video and playing on highest quality for long form content', () => {
                scheduleController.initialize(false);
                abrController.isPlayingAtTopQuality = () => true;
                streamInfo.manifestInfo = { duration: Infinity };
                representationController.getCurrentRepresentationInfo = function () {
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
                representationController.getCurrentRepresentationInfo = function () {
                    return {}
                }
                const result = scheduleController.getBufferTarget();
                expect(result).to.be.equal(0);
            });

            it('should return 6 (value returns by currentRepresentationInfo.fragmentDuration) if current representation is text, and subtitles are enabled', function () {
                textController.enableText(true);
                representationController.getCurrentRepresentationInfo = function () {
                    return {fragmentDuration: 6}
                }
                const result = scheduleController.getBufferTarget();
                expect(result).to.be.equal(6);
            });
        })

    })
});
