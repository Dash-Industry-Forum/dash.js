import VoHelper from './helpers/VOHelper.js';
import ObjectsHelper from './helpers/ObjectsHelper.js';
import AbrController from '../../src/streaming/controllers/AbrController.js';
import Constants from '../../src/streaming/constants/Constants.js';
import Settings from '../../src/core/Settings.js';
import VideoModelMock from './mocks/VideoModelMock.js';
import DomStorageMock from './mocks/DomStorageMock.js';
import DashMetricsMock from './mocks/DashMetricsMock.js';
import AdapterMock from './mocks/AdapterMock.js';
import StreamControllerMock from './mocks/StreamControllerMock.js';
import CustomParametersModel from '../../src/streaming/models/CustomParametersModel.js';
import MediaPlayerModel from '../../src/streaming/models/MediaPlayerModel.js';
import CmsdModel from '../../src/streaming/models/CmsdModel.js';
import ServiceDescriptionController from '../../src/dash/controllers/ServiceDescriptionController.js';
import PlaybackControllerMock from './mocks/PlaybackControllerMock.js';
import ThroughputControllerMock from './mocks/ThroughputControllerMock.js';
import {expect, assert} from 'chai';
import EventBus from '../../src/core/EventBus.js';
import MediaPlayerEvents from '../../src/streaming/MediaPlayerEvents.js';
import sinon from 'sinon';

describe('AbrController', function () {
    const context = {};
    const voHelper = new VoHelper();
    const objectsHelper = new ObjectsHelper();

    const eventBus = EventBus(context).getInstance();
    const settings = Settings(context).getInstance();
    const abrCtrl = AbrController(context).getInstance();
    const dummyMediaInfo = voHelper.getDummyMediaInfo(Constants.VIDEO);
    const dummyRepresentations = [voHelper.getDummyRepresentation(Constants.VIDEO, 0), voHelper.getDummyRepresentation(Constants.VIDEO, 1)];
    const domStorageMock = new DomStorageMock();
    const dashMetricsMock = new DashMetricsMock();
    const streamControllerMock = new StreamControllerMock();
    const customParametersModel = CustomParametersModel(context).getInstance();
    const mediaPlayerModel = MediaPlayerModel(context).getInstance();
    const cmsdModel = CmsdModel(context).getInstance();
    const serviceDescriptionController = ServiceDescriptionController(context).getInstance();
    const playbackControllerMock = new PlaybackControllerMock();
    const throughputControllerMock = new ThroughputControllerMock();

    let streamProcessor;
    let adapterMock;
    let videoModelMock;

    mediaPlayerModel.setConfig({
        serviceDescriptionController,
        playbackController: playbackControllerMock
    })

    beforeEach(function () {
        adapterMock = new AdapterMock();
        videoModelMock = new VideoModelMock();
        abrCtrl.setConfig({
            dashMetrics: dashMetricsMock,
            videoModel: videoModelMock,
            adapter: adapterMock,
            domStorage: domStorageMock,
            mediaPlayerModel,
            cmsdModel,
            settings: settings,
            streamController: streamControllerMock,
            throughputController: throughputControllerMock,
            customParametersModel
        });
        streamProcessor = objectsHelper.getDummyStreamProcessor(Constants.VIDEO);
        abrCtrl.initialize();
        abrCtrl.registerStreamType(Constants.VIDEO, streamProcessor);
    });

    afterEach(function () {
        abrCtrl.reset();
        settings.reset();
        eventBus.reset();
    });

    it('should return null when attempting to get abandonment state when abandonmentStateDict array is empty', function () {
        const state = abrCtrl.getAbandonmentStateFor('1', Constants.AUDIO);
        expect(state).to.be.null;
    });

    it('should return null when calling getQualityForBitrate with no mediaInfo', function () {
        const quality = abrCtrl.getOptimalRepresentationForBitrate(undefined, undefined, true);
        expect(quality).to.not.exist;
    });

    it('should return true if isPlayingAtTopQuality function is called without parameter', function () {
        let isPlayingTopQuality = abrCtrl.isPlayingAtTopQuality();
        expect(isPlayingTopQuality).to.be.true;
    });

    it('should switch to a new Representation', function (done) {
        const onQualityChange = (e) => {
            expect(e.oldRepresentation).to.not.exist;
            expect(e.newRepresentation.id).to.be.equal(dummyRepresentations[0].id)
            eventBus.off(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, onQualityChange)
            done()
        }

        eventBus.on(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, onQualityChange, this);

        abrCtrl.setPlaybackQuality(Constants.VIDEO, dummyMediaInfo.streamInfo, dummyRepresentations[0]);
    });

    it('should ignore an attempt to set a quality value if no streamInfo is provided', function () {
        const spy = sinon.spy();

        assert.equal(spy.notCalled, true);
        eventBus.on(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, spy, this);
        abrCtrl.setPlaybackQuality(Constants.VIDEO, null, dummyRepresentations[0]);
    });

    it('should ignore an attempt to set a quality value if no Representation is provided', function () {
        const spy = sinon.spy();

        assert.equal(spy.notCalled, true);
        eventBus.on(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, spy, this);
        abrCtrl.setPlaybackQuality(Constants.VIDEO, dummyMediaInfo.streamInfo, null);
    });

    it('should return the right Representations for maxBitrate values', function () {
        const mediaInfo = streamProcessor.getMediaInfo();
        const bitrateList = mediaInfo.bitrateList;

        adapterMock.getVoRepresentations = () => {
            return [
                {
                    bitrateInKbit: bitrateList[0].bandwidth / 1000,
                    mediaInfo,
                    id: 1
                },
                {
                    bitrateInKbit: bitrateList[1].bandwidth / 1000,
                    mediaInfo,
                    id: 2
                },
                {
                    bitrateInKbit: bitrateList[2].bandwidth / 1000,
                    mediaInfo,
                    id: 3
                }
            ]
        }

        adapterMock.areMediaInfosEqual = () => {
            return true
        }

        mediaInfo.streamInfo = streamProcessor.getStreamInfo();
        mediaInfo.type = Constants.VIDEO;

        // Max allowed bitrate in kbps, bandwidth is in bps
        const s = { streaming: { abr: { maxBitrate: {} } } };
        s.streaming.abr.maxBitrate[Constants.VIDEO] = bitrateList[0].bandwidth / 1000;
        settings.update(s);
        let possibleVoRepresentations = abrCtrl.getPossibleVoRepresentations(mediaInfo, false);
        expect(possibleVoRepresentations.length).to.be.equal(1);
        expect(possibleVoRepresentations[0].id).to.be.equal(1);

        s.streaming.abr.maxBitrate[Constants.VIDEO] = bitrateList[1].bandwidth / 1000;
        settings.update(s);
        possibleVoRepresentations = abrCtrl.getPossibleVoRepresentations(mediaInfo);
        expect(possibleVoRepresentations.length).to.be.equal(2);
        expect(possibleVoRepresentations[1].id).to.be.equal(2);

        s.streaming.abr.maxBitrate[Constants.VIDEO] = bitrateList[2].bandwidth / 1000;
        settings.update(s);
        possibleVoRepresentations = abrCtrl.getPossibleVoRepresentations(mediaInfo);
        expect(possibleVoRepresentations.length).to.be.equal(3);
        expect(possibleVoRepresentations[2].id).to.be.equal(3);

        s.streaming.abr.maxBitrate[Constants.VIDEO] = (bitrateList[0].bandwidth / 1000) + 1;
        settings.update(s);
        possibleVoRepresentations = abrCtrl.getPossibleVoRepresentations(mediaInfo);
        expect(possibleVoRepresentations.length).to.be.equal(1);
        expect(possibleVoRepresentations[0].id).to.be.equal(1);

        s.streaming.abr.maxBitrate[Constants.VIDEO] = (bitrateList[1].bandwidth / 1000) + 1;
        settings.update(s);
        possibleVoRepresentations = abrCtrl.getPossibleVoRepresentations(mediaInfo);
        expect(possibleVoRepresentations.length).to.be.equal(2);
        expect(possibleVoRepresentations[1].id).to.be.equal(2);

        s.streaming.abr.maxBitrate[Constants.VIDEO] = (bitrateList[2].bandwidth / 1000) + 1;
        settings.update(s);
        possibleVoRepresentations = abrCtrl.getPossibleVoRepresentations(mediaInfo);
        expect(possibleVoRepresentations.length).to.be.equal(3);
        expect(possibleVoRepresentations[2].id).to.be.equal(3);

        s.streaming.abr.maxBitrate[Constants.VIDEO] = (bitrateList[0].bandwidth / 1000) - 1;
        settings.update(s);
        possibleVoRepresentations = abrCtrl.getPossibleVoRepresentations(mediaInfo);
        expect(possibleVoRepresentations.length).to.be.equal(3);
        expect(possibleVoRepresentations[2].id).to.be.equal(3);
    });

    it('should return the right Representations for minBitrate values', function () {
        const mediaInfo = streamProcessor.getMediaInfo();
        const bitrateList = mediaInfo.bitrateList;

        adapterMock.getVoRepresentations = () => {
            return [
                {
                    bitrateInKbit: bitrateList[0].bandwidth / 1000,
                    mediaInfo,
                    id: 1
                },
                {
                    bitrateInKbit: bitrateList[1].bandwidth / 1000,
                    mediaInfo,
                    id: 2
                },
                {
                    bitrateInKbit: bitrateList[2].bandwidth / 1000,
                    mediaInfo,
                    id: 3
                }
            ]
        }

        adapterMock.areMediaInfosEqual = () => {
            return true
        }

        mediaInfo.streamInfo = streamProcessor.getStreamInfo();
        mediaInfo.type = Constants.VIDEO;

        // Min allowed bitrate in kbps, bandwidth is in bps
        const s = { streaming: { abr: { minBitrate: {} } } };
        s.streaming.abr.minBitrate[Constants.VIDEO] = bitrateList[0].bandwidth / 1000;
        settings.update(s);
        let possibleVoRepresentations = abrCtrl.getPossibleVoRepresentations(mediaInfo);
        expect(possibleVoRepresentations.length).to.be.equal(3);

        s.streaming.abr.minBitrate[Constants.VIDEO] = bitrateList[1].bandwidth / 1000;
        settings.update(s);
        possibleVoRepresentations = abrCtrl.getPossibleVoRepresentations(mediaInfo);
        expect(possibleVoRepresentations.length).to.be.equal(2);

        s.streaming.abr.minBitrate[Constants.VIDEO] = bitrateList[2].bandwidth / 1000;
        settings.update(s);
        possibleVoRepresentations = abrCtrl.getPossibleVoRepresentations(mediaInfo);
        expect(possibleVoRepresentations.length).to.be.equal(1);

        s.streaming.abr.minBitrate[Constants.VIDEO] = (bitrateList[0].bandwidth / 1000) + 1;
        settings.update(s);
        possibleVoRepresentations = abrCtrl.getPossibleVoRepresentations(mediaInfo);
        expect(possibleVoRepresentations.length).to.be.equal(2);

        s.streaming.abr.minBitrate[Constants.VIDEO] = (bitrateList[1].bandwidth / 1000) + 1;
        settings.update(s);
        possibleVoRepresentations = abrCtrl.getPossibleVoRepresentations(mediaInfo);
        expect(possibleVoRepresentations.length).to.be.equal(1);

        s.streaming.abr.minBitrate[Constants.VIDEO] = (bitrateList[2].bandwidth / 1000) + 1;
        settings.update(s);
        possibleVoRepresentations = abrCtrl.getPossibleVoRepresentations(mediaInfo);
        expect(possibleVoRepresentations.length).to.be.equal(3);

        s.streaming.abr.minBitrate[Constants.VIDEO] = (bitrateList[0].bandwidth / 1000) - 1;
        settings.update(s);
        possibleVoRepresentations = abrCtrl.getPossibleVoRepresentations(mediaInfo);
        expect(possibleVoRepresentations.length).to.be.equal(3);
    });

    it('should configure initial bitrate for video type', function () {
        domStorageMock.setSavedBitrateSettings(Constants.VIDEO, 50);

        let initialBitrateFor = abrCtrl.getInitialBitrateFor(Constants.VIDEO);
        expect(initialBitrateFor).to.equal(50);
    });

    it('should configure initial bitrate for text type', function () {
        let initialBitrateFor = abrCtrl.getInitialBitrateFor(Constants.TEXT);
        expect(initialBitrateFor).to.be.NaN;
    });

    it('should return the appropriate possible Representations if limitBitrateByPortal is enabled', function () {
        videoModelMock.getVideoElementSize = () => {
            return { elementWidth: 800 }
        };
        const s = { streaming: { abr: { limitBitrateByPortal: true } } };
        settings.update(s);

        const mediaInfo = streamProcessor.getMediaInfo();
        const bitrateList = mediaInfo.bitrateList;

        adapterMock.getVoRepresentations = () => {
            return [
                {
                    bitrateInKbit: bitrateList[0].bandwidth / 1000,
                    bandwidth: bitrateList[0].bandwidth,
                    mediaInfo,
                    id: 1,
                    width: 640
                },
                {
                    bitrateInKbit: bitrateList[1].bandwidth / 1000,
                    bandwidth: bitrateList[1].bandwidth,
                    mediaInfo,
                    id: 2,
                    width: 720
                },
                {
                    bitrateInKbit: bitrateList[2].bandwidth / 1000,
                    bandwidth: bitrateList[2].bandwidth,
                    mediaInfo,
                    id: 3,
                    width: 1920
                }
            ]
        }

        adapterMock.areMediaInfosEqual = () => {
            return true
        }

        mediaInfo.streamInfo = streamProcessor.getStreamInfo();
        mediaInfo.type = Constants.VIDEO;

        let possibleVoRepresentations = abrCtrl.getPossibleVoRepresentations(mediaInfo);
        expect(possibleVoRepresentations.length).to.be.equal(2);
    });

    it('should return an appropriate Representation when calling getOptimalRepresentationForBitrate', function () {
        const mediaInfo = streamProcessor.getMediaInfo();
        const bitrateList = mediaInfo.bitrateList;

        adapterMock.getVoRepresentations = () => {
            return [
                {
                    bitrateInKbit: bitrateList[0].bandwidth / 1000,
                    bandwidth: bitrateList[0].bandwidth,
                    mediaInfo,
                    id: 1
                },
                {
                    bitrateInKbit: bitrateList[1].bandwidth / 1000,
                    bandwidth: bitrateList[1].bandwidth,
                    mediaInfo,
                    id: 2
                },
                {
                    bitrateInKbit: bitrateList[2].bandwidth / 1000,
                    bandwidth: bitrateList[2].bandwidth,
                    mediaInfo,
                    id: 3
                }
            ]
        }

        adapterMock.areMediaInfosEqual = () => {
            return true
        }

        mediaInfo.streamInfo = streamProcessor.getStreamInfo();
        mediaInfo.type = Constants.VIDEO;

        let optimalRepresentationForBitrate = abrCtrl.getOptimalRepresentationForBitrate(mediaInfo, bitrateList[2].bandwidth / 1000);
        expect(optimalRepresentationForBitrate.id).to.be.equal(3);
    });

});
