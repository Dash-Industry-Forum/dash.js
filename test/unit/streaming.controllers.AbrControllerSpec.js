import VoHelper from './helpers/VOHelper';
import ObjectsHelper from './helpers/ObjectsHelper';
import AbrController from '../../src/streaming/controllers/AbrController';
import BitrateInfo from '../../src/streaming/vo/BitrateInfo';
import Constants from '../../src/streaming/constants/Constants';

import DashManifestModelMock from './mocks/DashManifestModelMock';
import VideoModelMock from './mocks/VideoModelMock';
import DomStorageMock from './mocks/DomStorageMock';
import MetricsModelMock from './mocks/MetricsModelMock';
import DashMetricsMock from './mocks/DashMetricsMock';
import ManifestModelMock from './mocks/ManifestModelMock';

const expect = require('chai').expect;

describe('AbrController', function () {
    const context = {};
    const testType = 'video';
    const voHelper = new VoHelper();
    const objectsHelper = new ObjectsHelper();
    const defaultQuality = AbrController.QUALITY_DEFAULT;

    const abrCtrl = AbrController(context).getInstance();
    const dummyMediaInfo = voHelper.getDummyMediaInfo(testType);
    const representationCount = dummyMediaInfo.representationCount;
    const streamProcessor = objectsHelper.getDummyStreamProcessor(testType);
    const manifestModelMock = new ManifestModelMock();
    const dashManifestModelMock = new DashManifestModelMock();
    const videoModelMock = new VideoModelMock();
    const domStorageMock = new DomStorageMock();
    const metricsModelMock = new MetricsModelMock();
    const dashMetricsMock = new DashMetricsMock();

    beforeEach(function () {
        abrCtrl.setConfig({
            metricsModel: metricsModelMock,
            dashMetrics: dashMetricsMock,
            videoModel: videoModelMock,
            manifestModel: manifestModelMock,
            dashManifestModel: dashManifestModelMock,
            domStorage: domStorageMock
        });
        abrCtrl.registerStreamType('video', streamProcessor);
    });

    afterEach(function () {
        abrCtrl.reset();
    });

    it('should return null when attempting to get abandonment state when abandonmentStateDict array is empty', function () {
        const state = abrCtrl.getAbandonmentStateFor(Constants.AUDIO);
        expect(state).to.be.null;    // jshint ignore:line
    });

    it('should return 0 when calling getQualityForBitrate with no mediaInfo', function () {
        const quality = abrCtrl.getQualityForBitrate(undefined, undefined, true);
        expect(quality).to.be.equal(0);    // jshint ignore:line
    });

    it('should not set UsePixelRatioInLimitBitrateByPortal value if it\'s not a boolean type', function () {
        let usePixelRatioInLimitBitrateByPortal = abrCtrl.getUsePixelRatioInLimitBitrateByPortal();
        expect(usePixelRatioInLimitBitrateByPortal).to.be.false; // jshint ignore:line

        expect(abrCtrl.setUsePixelRatioInLimitBitrateByPortal.bind(abrCtrl, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        usePixelRatioInLimitBitrateByPortal = abrCtrl.getUsePixelRatioInLimitBitrateByPortal();

        expect(usePixelRatioInLimitBitrateByPortal).to.be.false; // jshint ignore:line

        expect(abrCtrl.setUsePixelRatioInLimitBitrateByPortal.bind(abrCtrl, 1)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        usePixelRatioInLimitBitrateByPortal = abrCtrl.getUsePixelRatioInLimitBitrateByPortal();

        expect(usePixelRatioInLimitBitrateByPortal).to.be.false; // jshint ignore:line

        abrCtrl.setUsePixelRatioInLimitBitrateByPortal(true);
        usePixelRatioInLimitBitrateByPortal = abrCtrl.getUsePixelRatioInLimitBitrateByPortal();

        expect(usePixelRatioInLimitBitrateByPortal).to.be.true; // jshint ignore:line
    });

    it('should not set setLimitBitrateByPortal value if it\'s not a boolean type', function () {
        let limitBitrateByPortal = abrCtrl.getLimitBitrateByPortal();
        expect(limitBitrateByPortal).to.be.false; // jshint ignore:line

        expect(abrCtrl.setLimitBitrateByPortal.bind(abrCtrl, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        limitBitrateByPortal = abrCtrl.getLimitBitrateByPortal();

        expect(limitBitrateByPortal).to.be.false; // jshint ignore:line

        expect(abrCtrl.setLimitBitrateByPortal.bind(abrCtrl, 1)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        limitBitrateByPortal = abrCtrl.getLimitBitrateByPortal();

        expect(limitBitrateByPortal).to.be.false; // jshint ignore:line

        abrCtrl.setLimitBitrateByPortal(true);
        limitBitrateByPortal = abrCtrl.getLimitBitrateByPortal();

        expect(limitBitrateByPortal).to.be.true; // jshint ignore:line
    });

    it('should not set setAutoSwitchBitrateFor value if it\'s not a boolean type', function () {
        let autoSwitchBitrateForVideo = abrCtrl.getAutoSwitchBitrateFor(Constants.VIDEO);
        expect(autoSwitchBitrateForVideo).to.be.true; // jshint ignore:line

        expect(abrCtrl.setAutoSwitchBitrateFor.bind(abrCtrl, Constants.VIDEO, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);

        autoSwitchBitrateForVideo = abrCtrl.getAutoSwitchBitrateFor(Constants.VIDEO);

        expect(autoSwitchBitrateForVideo).to.be.true; // jshint ignore:line

        expect(abrCtrl.setAutoSwitchBitrateFor.bind(abrCtrl, Constants.VIDEO, 1)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        autoSwitchBitrateForVideo = abrCtrl.getAutoSwitchBitrateFor(Constants.VIDEO);

        expect(autoSwitchBitrateForVideo).to.be.true; // jshint ignore:line

        abrCtrl.setAutoSwitchBitrateFor(Constants.VIDEO, false);
        autoSwitchBitrateForVideo = abrCtrl.getAutoSwitchBitrateFor(Constants.VIDEO);

        expect(autoSwitchBitrateForVideo).to.be.false; // jshint ignore:line
    });

    it('should return true if isPlayingAtTopQuality function is called without parameter', function () {
        let isPlayingTopQuality = abrCtrl.isPlayingAtTopQuality();
        expect(isPlayingTopQuality).to.be.true; // jshint ignore:line
    });

    it('should not set setMaxAllowedBitrateFor value if it\'s not a number type or NaN or if type is not Video or Audio', function () {
        expect(abrCtrl.setMaxAllowedBitrateFor.bind(abrCtrl, Constants.TEXT, 12)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(abrCtrl.setMaxAllowedBitrateFor.bind(abrCtrl, true, 12)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(abrCtrl.setMaxAllowedBitrateFor.bind(abrCtrl, 1, 12)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(abrCtrl.setMaxAllowedBitrateFor.bind(abrCtrl, Constants.VIDEO, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(abrCtrl.setMaxAllowedBitrateFor.bind(abrCtrl, Constants.VIDEO, NaN)).not.to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(abrCtrl.setMaxAllowedBitrateFor.bind(abrCtrl, Constants.VIDEO, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('should not set setMinAllowedBitrateFor value if it\'s not a number type or NaN or if type is not Video or Audio', function () {
        expect(abrCtrl.setMinAllowedBitrateFor.bind(abrCtrl, Constants.TEXT, 12)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(abrCtrl.setMinAllowedBitrateFor.bind(abrCtrl, true, 12)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(abrCtrl.setMinAllowedBitrateFor.bind(abrCtrl, 1, 12)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(abrCtrl.setMinAllowedBitrateFor.bind(abrCtrl, Constants.VIDEO, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(abrCtrl.setMinAllowedBitrateFor.bind(abrCtrl, Constants.VIDEO, NaN)).not.to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(abrCtrl.setMinAllowedBitrateFor.bind(abrCtrl, Constants.VIDEO, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('should not set setInitialBitrateFor value if it\'s not a number type or NaN or if type is not Video or Audio', function () {
        expect(abrCtrl.setInitialBitrateFor.bind(abrCtrl, Constants.TEXT, 12)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(abrCtrl.setInitialBitrateFor.bind(abrCtrl, true, 12)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(abrCtrl.setInitialBitrateFor.bind(abrCtrl, 1, 12)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(abrCtrl.setInitialBitrateFor.bind(abrCtrl, Constants.VIDEO, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(abrCtrl.setInitialBitrateFor.bind(abrCtrl, Constants.VIDEO, NaN)).not.to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(abrCtrl.setInitialBitrateFor.bind(abrCtrl, Constants.VIDEO, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);

        abrCtrl.setInitialBitrateFor(Constants.VIDEO, 180);
        const initialBitrate = abrCtrl.getInitialBitrateFor(Constants.VIDEO);
        expect(initialBitrate).to.equal(180);
    });

    it('Method setUseDeadTimeLatency should throw an exception if given bad values', function () {
        expect(abrCtrl.setUseDeadTimeLatency.bind(abrCtrl, 13)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(abrCtrl.setUseDeadTimeLatency.bind(abrCtrl, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
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
        abrCtrl.setPlaybackQuality(testType, dummyMediaInfo.streamInfo, testQuality);
        newQuality = abrCtrl.getQualityFor(testType);
        expect(newQuality).to.be.equal(testQuality);
    });

    it('should throw an exception when attempting to set not a number value for a quality', function () {
        let testQuality = 'a';
        expect(abrCtrl.setPlaybackQuality.bind(abrCtrl, testType, dummyMediaInfo.streamInfo, testQuality)).to.throw(Constants.BAD_ARGUMENT_ERROR + ' : argument is not an integer');

        testQuality = null;
        expect(abrCtrl.setPlaybackQuality.bind(abrCtrl, testType, dummyMediaInfo.streamInfo, testQuality)).to.throw(Constants.BAD_ARGUMENT_ERROR + ' : argument is not an integer');

        testQuality = 2.5;
        expect(abrCtrl.setPlaybackQuality.bind(abrCtrl, testType, dummyMediaInfo.streamInfo, testQuality)).to.throw(Constants.BAD_ARGUMENT_ERROR + ' : argument is not an integer');

        testQuality = {};
        expect(abrCtrl.setPlaybackQuality.bind(abrCtrl, testType, dummyMediaInfo.streamInfo, testQuality)).to.throw(Constants.BAD_ARGUMENT_ERROR + ' : argument is not an integer');
    });

    it('should ignore an attempt to set a negative quality value', function () {
        const negativeQuality = -1;
        const oldQuality = abrCtrl.getQualityFor(testType);
        let newQuality;

        abrCtrl.setPlaybackQuality(testType, dummyMediaInfo.streamInfo, negativeQuality);
        newQuality = abrCtrl.getQualityFor(testType);
        expect(newQuality).to.be.equal(oldQuality);
    });

    it('should ignore an attempt to set a quality greater than top quality index', function () {
        const greaterThanTopQualityValue = representationCount;
        const oldQuality = abrCtrl.getQualityFor(testType);
        let newQuality;

        abrCtrl.setPlaybackQuality(testType, dummyMediaInfo.streamInfo, greaterThanTopQualityValue);
        newQuality = abrCtrl.getQualityFor(testType);

        expect(newQuality).to.be.equal(oldQuality);
    });

    it('should restore a default quality value after reset', function () {
        const testQuality = 1;
        let newQuality;

        abrCtrl.setPlaybackQuality(testType, dummyMediaInfo.streamInfo, testQuality);
        abrCtrl.reset();
        newQuality = abrCtrl.getQualityFor(testType);
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
        let maxAllowedIndex;

        // Max allowed bitrate in kbps, bandwidth is in bps
        abrCtrl.setMaxAllowedBitrateFor(testType, streamProcessor.getMediaInfo().bitrateList[0].bandwidth / 1000);
        maxAllowedIndex = abrCtrl.getMaxAllowedIndexFor(testType);
        expect(maxAllowedIndex).to.be.equal(0);

        abrCtrl.setMaxAllowedBitrateFor(testType, streamProcessor.getMediaInfo().bitrateList[1].bandwidth / 1000);
        maxAllowedIndex = abrCtrl.getMaxAllowedIndexFor(testType);
        expect(maxAllowedIndex).to.be.equal(1);

        abrCtrl.setMaxAllowedBitrateFor(testType, streamProcessor.getMediaInfo().bitrateList[2].bandwidth / 1000);
        maxAllowedIndex = abrCtrl.getMaxAllowedIndexFor(testType);
        expect(maxAllowedIndex).to.be.equal(2);

        abrCtrl.setMaxAllowedBitrateFor(testType, (streamProcessor.getMediaInfo().bitrateList[0].bandwidth / 1000) + 1);
        maxAllowedIndex = abrCtrl.getMaxAllowedIndexFor(testType);
        expect(maxAllowedIndex).to.be.equal(0);

        abrCtrl.setMaxAllowedBitrateFor(testType, (streamProcessor.getMediaInfo().bitrateList[1].bandwidth / 1000) + 1);
        maxAllowedIndex = abrCtrl.getMaxAllowedIndexFor(testType);
        expect(maxAllowedIndex).to.be.equal(1);

        abrCtrl.setMaxAllowedBitrateFor(testType, (streamProcessor.getMediaInfo().bitrateList[2].bandwidth / 1000) + 1);
        maxAllowedIndex = abrCtrl.getMaxAllowedIndexFor(testType);
        expect(maxAllowedIndex).to.be.equal(2);

        abrCtrl.setMaxAllowedBitrateFor(testType, (streamProcessor.getMediaInfo().bitrateList[0].bandwidth / 1000) - 1);
        maxAllowedIndex = abrCtrl.getMaxAllowedIndexFor(testType);
        expect(maxAllowedIndex).to.be.equal(0);
    });

    it('should return the appropriate min allowed index for the min allowed bitrate set', function () {
        let minAllowedIndex;

        // Min allowed bitrate in kbps, bandwidth is in bps
        abrCtrl.setMinAllowedBitrateFor(testType, streamProcessor.getMediaInfo().bitrateList[0].bandwidth / 1000);
        minAllowedIndex = abrCtrl.getMinAllowedIndexFor(testType);
        expect(minAllowedIndex).to.be.equal(0);

        abrCtrl.setMinAllowedBitrateFor(testType, streamProcessor.getMediaInfo().bitrateList[1].bandwidth / 1000);
        minAllowedIndex = abrCtrl.getMinAllowedIndexFor(testType);
        expect(minAllowedIndex).to.be.equal(1);

        abrCtrl.setMinAllowedBitrateFor(testType, streamProcessor.getMediaInfo().bitrateList[2].bandwidth / 1000);
        minAllowedIndex = abrCtrl.getMinAllowedIndexFor(testType);
        expect(minAllowedIndex).to.be.equal(2);

        abrCtrl.setMinAllowedBitrateFor(testType, (streamProcessor.getMediaInfo().bitrateList[0].bandwidth / 1000) + 1);
        minAllowedIndex = abrCtrl.getMinAllowedIndexFor(testType);
        expect(minAllowedIndex).to.be.equal(1);

        abrCtrl.setMinAllowedBitrateFor(testType, (streamProcessor.getMediaInfo().bitrateList[1].bandwidth / 1000) + 1);
        minAllowedIndex = abrCtrl.getMinAllowedIndexFor(testType);
        expect(minAllowedIndex).to.be.equal(2);

        abrCtrl.setMinAllowedBitrateFor(testType, (streamProcessor.getMediaInfo().bitrateList[2].bandwidth / 1000) + 1);
        minAllowedIndex = abrCtrl.getMinAllowedIndexFor(testType);
        expect(minAllowedIndex).to.be.equal(2);

        abrCtrl.setMinAllowedBitrateFor(testType, (streamProcessor.getMediaInfo().bitrateList[0].bandwidth / 1000) - 1);
        minAllowedIndex = abrCtrl.getMinAllowedIndexFor(testType);
        expect(minAllowedIndex).to.be.equal(0);
    });

    it('should return an appropriate BitrateInfo when calling getTopBitrateInfoFor', function () {
        abrCtrl.updateTopQualityIndex(dummyMediaInfo);

        let bitrateInfo = abrCtrl.getTopBitrateInfoFor(testType);
        expect(bitrateInfo).to.be.an.instanceOf(BitrateInfo);
        expect(bitrateInfo.bitrate).to.be.equal(3000000);
        expect(bitrateInfo.qualityIndex).to.be.equal(2);

        abrCtrl.setLimitBitrateByPortal(true);
        bitrateInfo = abrCtrl.getTopBitrateInfoFor(testType);
        expect(bitrateInfo).to.be.an.instanceOf(BitrateInfo);
        expect(bitrateInfo.bitrate).to.be.equal(2000000);
        expect(bitrateInfo.qualityIndex).to.be.equal(1);
    });
});
