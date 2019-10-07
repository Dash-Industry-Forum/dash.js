import VoHelper from './helpers/VOHelper';
import ObjectsHelper from './helpers/ObjectsHelper';
import AbrController from '../../src/streaming/controllers/AbrController';
import BitrateInfo from '../../src/streaming/vo/BitrateInfo';
import Constants from '../../src/streaming/constants/Constants';
import Settings from '../../src/core/Settings';

import VideoModelMock from './mocks/VideoModelMock';
import DomStorageMock from './mocks/DomStorageMock';
import DashMetricsMock from './mocks/DashMetricsMock';
import AdapterMock from './mocks/AdapterMock';
import MediaPlayerModelMock from './mocks/MediaPlayerModelMock';
import StreamControllerMock from './mocks/StreamControllerMock';

const expect = require('chai').expect;

describe('AbrController', function () {
    const context = {};
    const voHelper = new VoHelper();
    const objectsHelper = new ObjectsHelper();
    const defaultQuality = AbrController.QUALITY_DEFAULT;

    const settings = Settings(context).getInstance();
    const abrCtrl = AbrController(context).getInstance();
    const dummyMediaInfo = voHelper.getDummyMediaInfo(Constants.VIDEO);
    const representationCount = dummyMediaInfo.representationCount;
    const streamProcessor = objectsHelper.getDummyStreamProcessor(Constants.VIDEO);
    const adapterMock = new AdapterMock();
    const videoModelMock = new VideoModelMock();
    const domStorageMock = new DomStorageMock();
    const dashMetricsMock = new DashMetricsMock();
    const mediaPlayerModelMock = new MediaPlayerModelMock();
    const streamControllerMock = new StreamControllerMock();

    beforeEach(function () {
        abrCtrl.setConfig({
            dashMetrics: dashMetricsMock,
            videoModel: videoModelMock,
            adapter: adapterMock,
            domStorage: domStorageMock,
            mediaPlayerModel: mediaPlayerModelMock,
            settings: settings,
            streamController: streamControllerMock
        });
        abrCtrl.registerStreamType(Constants.VIDEO, streamProcessor);
    });

    afterEach(function () {
        abrCtrl.reset();
        settings.reset();
    });

    it('should return null when attempting to get abandonment state when abandonmentStateDict array is empty', function () {
        const state = abrCtrl.getAbandonmentStateFor(Constants.AUDIO);
        expect(state).to.be.null;    // jshint ignore:line
    });

    it('should return 0 when calling getQualityForBitrate with no mediaInfo', function () {
        const quality = abrCtrl.getQualityForBitrate(undefined, undefined, true);
        expect(quality).to.be.equal(0);    // jshint ignore:line
    });

    it('should return true if isPlayingAtTopQuality function is called without parameter', function () {
        let isPlayingTopQuality = abrCtrl.isPlayingAtTopQuality();
        expect(isPlayingTopQuality).to.be.true; // jshint ignore:line
    });

    it('should update top quality index', function () {
        const expectedTopQuality = representationCount - 1;
        let actualTopQuality;

        actualTopQuality = abrCtrl.updateTopQualityIndex(dummyMediaInfo);

        expect(actualTopQuality).to.be.equal(expectedTopQuality);
    });

    it('should set a quality in a range between zero and a top quality index', function () {
        const testQuality = 1;
        let newQuality;

        abrCtrl.updateTopQualityIndex(dummyMediaInfo);
        abrCtrl.setPlaybackQuality(Constants.VIDEO, dummyMediaInfo.streamInfo, testQuality);
        newQuality = abrCtrl.getQualityFor(Constants.VIDEO);
        expect(newQuality).to.be.equal(testQuality);
    });

    it('should throw an exception when attempting to set not a number value for a quality', function () {
        let testQuality = 'a';
        expect(abrCtrl.setPlaybackQuality.bind(abrCtrl, Constants.VIDEO, dummyMediaInfo.streamInfo, testQuality)).to.throw(Constants.BAD_ARGUMENT_ERROR + ' : argument is not an integer');

        testQuality = null;
        expect(abrCtrl.setPlaybackQuality.bind(abrCtrl, Constants.VIDEO, dummyMediaInfo.streamInfo, testQuality)).to.throw(Constants.BAD_ARGUMENT_ERROR + ' : argument is not an integer');

        testQuality = 2.5;
        expect(abrCtrl.setPlaybackQuality.bind(abrCtrl, Constants.VIDEO, dummyMediaInfo.streamInfo, testQuality)).to.throw(Constants.BAD_ARGUMENT_ERROR + ' : argument is not an integer');

        testQuality = {};
        expect(abrCtrl.setPlaybackQuality.bind(abrCtrl, Constants.VIDEO, dummyMediaInfo.streamInfo, testQuality)).to.throw(Constants.BAD_ARGUMENT_ERROR + ' : argument is not an integer');
    });

    it('should ignore an attempt to set a negative quality value', function () {
        const negativeQuality = -1;
        const oldQuality = abrCtrl.getQualityFor(Constants.VIDEO);
        let newQuality;

        abrCtrl.setPlaybackQuality(Constants.VIDEO, dummyMediaInfo.streamInfo, negativeQuality);
        newQuality = abrCtrl.getQualityFor(Constants.VIDEO);
        expect(newQuality).to.be.equal(oldQuality);
    });

    it('should ignore an attempt to set a quality greater than top quality index', function () {
        const greaterThanTopQualityValue = representationCount;
        const oldQuality = abrCtrl.getQualityFor(Constants.VIDEO);
        let newQuality;

        abrCtrl.setPlaybackQuality(Constants.VIDEO, dummyMediaInfo.streamInfo, greaterThanTopQualityValue);
        newQuality = abrCtrl.getQualityFor(Constants.VIDEO);

        expect(newQuality).to.be.equal(oldQuality);
    });

    it('should restore a default quality value after reset', function () {
        const testQuality = 1;
        let newQuality;

        abrCtrl.setPlaybackQuality(Constants.VIDEO, dummyMediaInfo.streamInfo, testQuality);
        abrCtrl.reset();
        newQuality = abrCtrl.getQualityFor(Constants.VIDEO);
        expect(newQuality).to.be.equal(defaultQuality);
    });

    it('should compose a list of available bitrates', function () {
        const expectedBitrates = dummyMediaInfo.bitrateList;
        const actualBitrates = abrCtrl.getBitrateList(dummyMediaInfo);
        let item,
            match;

        match = expectedBitrates.filter(function (val, idx) {
            item = actualBitrates[idx];
            return (item && (item.qualityIndex === idx) && (item.bitrate === val.bandwidth) && (item.mediaType === dummyMediaInfo.type) && (item.width === val.width) && (item.height === val.height));
        });

        expect(match.length).to.be.equal(expectedBitrates.length);
    });

    it('should return the appropriate max allowed index for the max allowed bitrate set', function () {
        // Max allowed bitrate in kbps, bandwidth is in bps
        const s = { streaming: { abr: { maxBitrate: {}}}};
        s.streaming.abr.maxBitrate[Constants.VIDEO] = streamProcessor.getMediaInfo().bitrateList[0].bandwidth / 1000;
        settings.update(s);

        let maxAllowedIndex = abrCtrl.getMaxAllowedIndexFor(Constants.VIDEO);
        expect(maxAllowedIndex).to.be.equal(0);

        s.streaming.abr.maxBitrate[Constants.VIDEO] = streamProcessor.getMediaInfo().bitrateList[1].bandwidth / 1000;
        settings.update(s);

        maxAllowedIndex = abrCtrl.getMaxAllowedIndexFor(Constants.VIDEO);
        expect(maxAllowedIndex).to.be.equal(1);

        s.streaming.abr.maxBitrate[Constants.VIDEO] = streamProcessor.getMediaInfo().bitrateList[2].bandwidth / 1000;
        settings.update(s);

        maxAllowedIndex = abrCtrl.getMaxAllowedIndexFor(Constants.VIDEO);
        expect(maxAllowedIndex).to.be.equal(2);

        s.streaming.abr.maxBitrate[Constants.VIDEO] = (streamProcessor.getMediaInfo().bitrateList[0].bandwidth / 1000) + 1;
        settings.update(s);

        maxAllowedIndex = abrCtrl.getMaxAllowedIndexFor(Constants.VIDEO);
        expect(maxAllowedIndex).to.be.equal(0);

        s.streaming.abr.maxBitrate[Constants.VIDEO] = (streamProcessor.getMediaInfo().bitrateList[1].bandwidth / 1000) + 1;
        settings.update(s);

        maxAllowedIndex = abrCtrl.getMaxAllowedIndexFor(Constants.VIDEO);
        expect(maxAllowedIndex).to.be.equal(1);

        s.streaming.abr.maxBitrate[Constants.VIDEO] = (streamProcessor.getMediaInfo().bitrateList[2].bandwidth / 1000) + 1;
        settings.update(s);

        maxAllowedIndex = abrCtrl.getMaxAllowedIndexFor(Constants.VIDEO);
        expect(maxAllowedIndex).to.be.equal(2);

        s.streaming.abr.maxBitrate[Constants.VIDEO] = (streamProcessor.getMediaInfo().bitrateList[0].bandwidth / 1000) - 1;
        settings.update(s);

        maxAllowedIndex = abrCtrl.getMaxAllowedIndexFor(Constants.VIDEO);
        expect(maxAllowedIndex).to.be.equal(0);
    });

    it('should return the appropriate min allowed index for the min allowed bitrate set', function () {
        // Min allowed bitrate in kbps, bandwidth is in bps
        const s = { streaming: { abr: { minBitrate: {}}}};
        s.streaming.abr.minBitrate[Constants.VIDEO] = streamProcessor.getMediaInfo().bitrateList[0].bandwidth / 1000;
        settings.update(s);

        let minAllowedIndex = abrCtrl.getMinAllowedIndexFor(Constants.VIDEO);
        expect(minAllowedIndex).to.be.equal(0);

        s.streaming.abr.minBitrate[Constants.VIDEO] = streamProcessor.getMediaInfo().bitrateList[1].bandwidth / 1000;
        settings.update(s);

        minAllowedIndex = abrCtrl.getMinAllowedIndexFor(Constants.VIDEO);
        expect(minAllowedIndex).to.be.equal(1);

        s.streaming.abr.minBitrate[Constants.VIDEO] = streamProcessor.getMediaInfo().bitrateList[2].bandwidth / 1000;
        settings.update(s);

        minAllowedIndex = abrCtrl.getMinAllowedIndexFor(Constants.VIDEO);
        expect(minAllowedIndex).to.be.equal(2);

        s.streaming.abr.minBitrate[Constants.VIDEO] = (streamProcessor.getMediaInfo().bitrateList[0].bandwidth / 1000) + 1;
        settings.update(s);

        minAllowedIndex = abrCtrl.getMinAllowedIndexFor(Constants.VIDEO);
        expect(minAllowedIndex).to.be.equal(1);

        s.streaming.abr.minBitrate[Constants.VIDEO] = (streamProcessor.getMediaInfo().bitrateList[1].bandwidth / 1000) + 1;
        settings.update(s);

        minAllowedIndex = abrCtrl.getMinAllowedIndexFor(Constants.VIDEO);
        expect(minAllowedIndex).to.be.equal(2);

        s.streaming.abr.minBitrate[Constants.VIDEO] = (streamProcessor.getMediaInfo().bitrateList[2].bandwidth / 1000) + 1;
        settings.update(s);

        minAllowedIndex = abrCtrl.getMinAllowedIndexFor(Constants.VIDEO);
        expect(minAllowedIndex).to.be.equal(2);

        s.streaming.abr.minBitrate[Constants.VIDEO] = (streamProcessor.getMediaInfo().bitrateList[0].bandwidth / 1000) - 1;
        settings.update(s);

        minAllowedIndex = abrCtrl.getMinAllowedIndexFor(Constants.VIDEO);
        expect(minAllowedIndex).to.be.equal(0);
    });

    it('should configure initial bitrate for video type', function () {
        domStorageMock.setSavedBitrateSettings(Constants.VIDEO, 50);

        let initialBitrateFor = abrCtrl.getInitialBitrateFor(Constants.VIDEO);
        expect(initialBitrateFor).to.equal(50);
    });

    it('should configure initial bitrate for fragmented text type', function () {
        let initialBitrateFor = abrCtrl.getInitialBitrateFor(Constants.FRAGMENTED_TEXT);
        expect(initialBitrateFor).to.be.NaN; // jshint ignore:line
    });

    it('should return an appropriate BitrateInfo when calling getTopBitrateInfoFor', function () {
        abrCtrl.updateTopQualityIndex(dummyMediaInfo);

        let bitrateInfo = abrCtrl.getTopBitrateInfoFor(Constants.VIDEO);
        expect(bitrateInfo).to.be.an.instanceOf(BitrateInfo);
        expect(bitrateInfo.bitrate).to.be.equal(3000000);
        expect(bitrateInfo.qualityIndex).to.be.equal(2);

        const s = { streaming: { abr: { limitBitrateByPortal: true }}};
        settings.update(s);

        bitrateInfo = abrCtrl.getTopBitrateInfoFor(Constants.VIDEO);
        expect(bitrateInfo).to.be.an.instanceOf(BitrateInfo);
        expect(bitrateInfo.bitrate).to.be.equal(2000000);
        expect(bitrateInfo.qualityIndex).to.be.equal(1);
    });

    it('should return the appropriate top quality index when calling getTopQualityIndexFor', function () {
        videoModelMock.setClientWidth(899);
        const s = { streaming: { abr: { limitBitrateByPortal: true }}};
        settings.update(s);
        abrCtrl.updateTopQualityIndex({type: Constants.VIDEO, streamInfo: {id: 'test'}, representationCount: 5});
        let topQualityIndex = abrCtrl.getTopQualityIndexFor(Constants.VIDEO, 'test');
        expect(topQualityIndex).to.be.equal(4);
    });
});
