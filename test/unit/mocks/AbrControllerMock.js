import ThroughputHistoryMock from './ThroughputHistoryMock';

const QUALITY_DEFAULT = 0;

function AbrControllerMock () {
    this.qualityDict = {};
    this.elementWidth = undefined;
    this.elementHeight = undefined;
    this.windowResizeEventCalled = false;
    this.throughputHistory = undefined;
    this.currentStreamId = undefined;

    this.QUALITY_DEFAULT = function () {
        return QUALITY_DEFAULT;
    };

    this.initialize = function () {};

    this.createAbrRulesCollection = function () {};

    this.reset = function () {
    };

    this.setConfig = function () {};

    this.getTopQualityIndexFor = function () {};

    this.getTopBitrateInfoFor = function () {
        return null;
    };

    this.getInitialBitrateFor = function (/*type*/) {
        return null;
    };

    this.checkPlaybackQuality = function () {};

    this.setPlaybackQuality = function (type, streamInfo, newQuality) {
        this.setQualityFor(type,streamInfo.id,newQuality);
    };

    this.setAbandonmentStateFor = function () {};

    this.getAbandonmentStateFor = function () {};

    this.getQualityForBitrate = function () {};

    this.getBitrateList = function () {
        return [];
    };

    this.getThroughputHistory = function () {
        return this.throughputHistory;
    };

    this.updateTopQualityIndex = function () {};

    this.isPlayingAtTopQuality = function () {};

    this.getQualityFor = function (type) {
        var quality;

        if (!this.currentStreamId || !this.qualityDict.hasOwnProperty(this.currentStreamId)) {
            return QUALITY_DEFAULT;
        }

        if (!this.qualityDict[this.currentStreamId].hasOwnProperty(type)) {
            return QUALITY_DEFAULT;
        }

        quality = this.qualityDict[this.currentStreamId][type];
        return quality;
    };

    this.setQualityFor = function (type, id, value) {
        this.currentStreamId = id;
        this.qualityDict[id] = this.qualityDict[id] || {};
        this.qualityDict[id][type] = value;
    };

    this.setWindowResizeEventCalled = function (value) {
        this.windowResizeEventCalled = value;
    };

    this.getWindowResizeEventCalled = function () {
        return this.windowResizeEventCalled;
    };

    this.setElementSize = function () {
        this.elementWidth = 10;
        this.elementHeight = 10;
    };

    this.getElementWidth = function () {
        return this.elementWidth;
    };

    this.getElementHeight = function () {
        return this.elementHeight;
    };

    this.registerStreamType = function () {
        this.throughputHistory = new ThroughputHistoryMock();
    };

    this.unRegisterStreamType = function (/*type*/) {
    };


    this.getMinAllowedIndexFor = function () {};
}

export default AbrControllerMock;
