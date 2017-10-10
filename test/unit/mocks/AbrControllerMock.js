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
        this.bitrateDict = {};
        this.ratioDict = {};
        this.qualityDict = {};
        this.elementWidth = undefined;
        this.elementHeight = undefined;
        this.windowResizeEventCalled = false;
        this.limitBitrateByPortal = false;
        this.usePixelRatioInLimitBitrateByPortal = false;
        this.autoSwitchBitrate = {video: true, audio: true};
        this.throughputHistory = undefined;
    }

    initialize() {}

    createAbrRulesCollection() {}

    reset() {
        this.setup();
    }

    setConfig() {}

    getTopQualityIndexFor() {}

    getInitialBitrateFor(type) {
        if (!this.bitrateDict.hasOwnProperty(type)) {
            return null;
        }

        return this.bitrateDict[type];
    }

    /**
     * @param {string} type
     * @param {number} value A value of the initial bitrate, kbps
     * @memberof AbrController#
     */
    setInitialBitrateFor(type, value) {
        this.bitrateDict[type] = value;
    }

    getInitialRepresentationRatioFor(type) {
        if (!this.ratioDict.hasOwnProperty(type)) {
            return null;
        }

        return this.ratioDict[type];
    }

    setInitialRepresentationRatioFor(type, value) {
        this.ratioDict[type] = value;
    }

    getMaxAllowedBitrateFor(type) {
        if (this.bitrateDict.hasOwnProperty('max') && this.bitrateDict.max.hasOwnProperty(type)) {
            return this.bitrateDict.max[type];
        }
        return NaN;
    }

    getMinAllowedBitrateFor(type) {
        if (this.bitrateDict.hasOwnProperty('min') && this.bitrateDict.min.hasOwnProperty(type)) {
            return this.bitrateDict.min[type];
        }
        return NaN;
    }

    //TODO  change this.bitrateDict structure to hold one object for video and audio with initial and max values internal.
    // This means you need to update all the logic around initial bitrate DOMStorage, RebController etc...
    setMaxAllowedBitrateFor(type, value) {
        this.bitrateDict.max = this.bitrateDict.max || {};
        this.bitrateDict.max[type] = value;
    }

    setMinAllowedBitrateFor(type, value) {
        this.bitrateDict.min = this.bitrateDict.min || {};
        this.bitrateDict.min[type] = value;
    }

    getMaxAllowedRepresentationRatioFor(type) {
        if (this.ratioDict.hasOwnProperty('max') && this.ratioDict.max.hasOwnProperty(type)) {
            return this.ratioDict.max[type];
        }
        return 1;
    }

    setMaxAllowedRepresentationRatioFor(type, value) {
        this.ratioDict.max = this.ratioDict.max || {};
        this.ratioDict.max[type] = value;
    }

    getAutoSwitchBitrateFor(type) {
        return this.autoSwitchBitrate[type];
    }

    setAutoSwitchBitrateFor(type, value) {
        this.autoSwitchBitrate[type] = value;
    }

    getLimitBitrateByPortal() {
        return this.limitBitrateByPortal;
    }

    setLimitBitrateByPortal(value) {
        this.limitBitrateByPortal = value;
    }

    getUsePixelRatioInLimitBitrateByPortal() {
        return this.usePixelRatioInLimitBitrateByPortal;
    }

    setUsePixelRatioInLimitBitrateByPortal(value) {
        this.usePixelRatioInLimitBitrateByPortal = value;
    }


    checkPlaybackQuality() {

    }

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

    getQualityFor(type, streamInfo) {

        var id = streamInfo.id;
        var quality;

        if (!this.qualityDict.hasOwnProperty(id)) {
            return QUALITY_DEFAULT;
        }

        if (!this.qualityDict[id].hasOwnProperty(type)) {
            return QUALITY_DEFAULT;
        }

        quality = this.qualityDict[id][type];
        return quality;
    }

    setQualityFor(type, id, value) {
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
}

export default AbrControllerMock;
