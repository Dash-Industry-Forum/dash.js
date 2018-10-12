import ThroughputHistoryMock from './ThroughputHistoryMock';

const ABANDON_LOAD = 'abandonload';
const QUALITY_DEFAULT = 0;

class AbrControllerMock{

    // Constants
    static get ABANDON_LOAD() {
        return ABANDON_LOAD;
    }

    static get QUALITY_DEFAULT() {
        return QUALITY_DEFAULT;
    }

    constructor() {
        this.setup();
    }

    setup() {
        this.qualityDict = {};
        this.elementWidth = undefined;
        this.elementHeight = undefined;
        this.windowResizeEventCalled = false;
        this.limitBitrateByPortal = false;
        this.usePixelRatioInLimitBitrateByPortal = false;
        this.autoSwitchBitrate = {video: true, audio: true};
        this.throughputHistory = undefined;
        this.currentStreamId = undefined;
    }

    initialize() {}

    createAbrRulesCollection() {}

    reset() {
        this.setup();
    }

    setConfig() {}

    getTopQualityIndexFor() {}

    getTopBitrateInfoFor() {}

    getInitialBitrateFor(/*type*/) {
        return null;
    }

    getAutoSwitchBitrateFor(type) {
        return this.autoSwitchBitrate[type];
    }

    setAutoSwitchBitrateFor(type, value) {
        this.autoSwitchBitrate[type] = value;
    }

    checkPlaybackQuality() {}

    setPlaybackQuality(type, streamInfo, newQuality) {
        this.setQualityFor(type,streamInfo.id,newQuality);
    }

    setAbandonmentStateFor() {}

    getAbandonmentStateFor() {}

    getQualityForBitrate() {}

    getBitrateList() {}

    getThroughputHistory() {
        return this.throughputHistory;
    }

    updateTopQualityIndex() {}

    isPlayingAtTopQuality() {}

    getQualityFor(type) {

        var quality;

        if (!this.currentStreamId || !this.qualityDict.hasOwnProperty(this.currentStreamId)) {
            return QUALITY_DEFAULT;
        }

        if (!this.qualityDict[this.currentStreamId].hasOwnProperty(type)) {
            return QUALITY_DEFAULT;
        }

        quality = this.qualityDict[this.currentStreamId][type];
        return quality;
    }

    setQualityFor(type, id, value) {
        this.currentStreamId = id;
        this.qualityDict[id] = this.qualityDict[id] || {};
        this.qualityDict[id][type] = value;
    }


    setWindowResizeEventCalled(value) {
        this.windowResizeEventCalled = value;
    }

    getWindowResizeEventCalled() {
        return this.windowResizeEventCalled;
    }

    setElementSize() {
        this.elementWidth = 10;
        this.elementHeight = 10;
    }

    getElementWidth() {
        return this.elementWidth;
    }

    getElementHeight() {
        return this.elementHeight;
    }

    registerStreamType() {
        this.throughputHistory = new ThroughputHistoryMock();
    }

    getMinAllowedIndexFor() {}
}

export default AbrControllerMock;
