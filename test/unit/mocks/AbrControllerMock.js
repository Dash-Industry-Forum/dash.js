/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
import FactoryMaker from '../../../src/core/FactoryMaker';

const ABANDON_LOAD = 'abandonload';
const QUALITY_DEFAULT = 0;

function AbrControllerMock() {

    let instance,
        bitrateDict,
        ratioDict,
        qualityDict,
        elementWidth,
        elementHeight,
        windowResizeEventCalled,
        limitBitrateByPortal,
        usePixelRatioInLimitBitrateByPortal,
        autoSwitchBitrate;

    function setup() {
        bitrateDict = {};
        ratioDict = {};
        qualityDict = {};
        elementWidth = undefined;
        elementHeight = undefined;
        windowResizeEventCalled = false;
        limitBitrateByPortal = false;
        usePixelRatioInLimitBitrateByPortal = false;
        autoSwitchBitrate = {video: true, audio: true};
    }

    function initialize() {}

    function reset() {}

    function setConfig() {}

    function getTopQualityIndexFor(type, id) {

    }

    /**
     * @param {string} type
     * @returns {number} A value of the initial bitrate, kbps
     * @memberof AbrController#
     */
    function getInitialBitrateFor(type) {
        if (!bitrateDict.hasOwnProperty(type)) {
            return null;
        }

        return bitrateDict[type];
    }

    /**
     * @param {string} type
     * @param {number} value A value of the initial bitrate, kbps
     * @memberof AbrController#
     */
    function setInitialBitrateFor(type, value) {
        bitrateDict[type] = value;
    }

    function getInitialRepresentationRatioFor(type) {
        if (!ratioDict.hasOwnProperty(type)) {
            return null;
        }

        return ratioDict[type];
    }

    function setInitialRepresentationRatioFor(type, value) {
        ratioDict[type] = value;
    }

    function getMaxAllowedBitrateFor(type) {
        if (bitrateDict.hasOwnProperty('max') && bitrateDict.max.hasOwnProperty(type)) {
            return bitrateDict.max[type];
        }
        return NaN;
    }

    function getMinAllowedBitrateFor(type) {
        if (bitrateDict.hasOwnProperty('min') && bitrateDict.min.hasOwnProperty(type)) {
            return bitrateDict.min[type];
        }
        return NaN;
    }

    //TODO  change bitrateDict structure to hold one object for video and audio with initial and max values internal.
    // This means you need to update all the logic around initial bitrate DOMStorage, RebController etc...
    function setMaxAllowedBitrateFor(type, value) {
        bitrateDict.max = bitrateDict.max || {};
        bitrateDict.max[type] = value;
    }

    function setMinAllowedBitrateFor(type, value) {
        bitrateDict.min = bitrateDict.min || {};
        bitrateDict.min[type] = value;
    }

    function getMaxAllowedRepresentationRatioFor(type) {
        if (ratioDict.hasOwnProperty('max') && ratioDict.max.hasOwnProperty(type)) {
            return ratioDict.max[type];
        }
        return 1;
    }

    function setMaxAllowedRepresentationRatioFor(type, value) {
        ratioDict.max = ratioDict.max || {};
        ratioDict.max[type] = value;
    }

    function getAutoSwitchBitrateFor(type) {
        return autoSwitchBitrate[type];
    }

    function setAutoSwitchBitrateFor(type, value) {
        autoSwitchBitrate[type] = value;
    }

    function getLimitBitrateByPortal() {
        return limitBitrateByPortal;
    }

    function setLimitBitrateByPortal(value) {
        limitBitrateByPortal = value;
    }

    function getUsePixelRatioInLimitBitrateByPortal() {
        return usePixelRatioInLimitBitrateByPortal;
    }

    function setUsePixelRatioInLimitBitrateByPortal(value) {
        usePixelRatioInLimitBitrateByPortal = value;
    }


    function checkPlaybackQuality() {

    }

    function setPlaybackQuality(type, streamInfo, newQuality) {
        setQualityFor(type,streamInfo.id,newQuality);
    }

    function setAbandonmentStateFor() {}

    function getAbandonmentStateFor() {}

    /**
     * @param {MediaInfo} mediaInfo
     * @param {number} bitrate A bitrate value, kbps
     * @param {number} latency Expected latency of connection, ms
     * @returns {number} A quality index <= for the given bitrate
     * @memberof AbrControllerMock#
     */
    function getQualityForBitrate() {

    }

    /**
     * @param {MediaInfo} mediaInfo
     * @returns {Array|null} A list of {@link BitrateInfo} objects
     * @memberof AbrControllerMock#
     */
    function getBitrateList() {

    }

    function setAverageThroughput() {}

    function getAverageThroughput() {}

    function updateTopQualityIndex() {}

    function isPlayingAtTopQuality() {}

    function getQualityFor(type, streamInfo) {

        var id = streamInfo.id;
        var quality;

        if (!qualityDict.hasOwnProperty(id)) {
            return QUALITY_DEFAULT;
        }

        if (!qualityDict[id].hasOwnProperty(type)) {
            return QUALITY_DEFAULT;
        }

        quality = qualityDict[id][type];
        return quality;
    }

    function setQualityFor(type, id, value) {
        qualityDict[id] = qualityDict[id] || {};
        qualityDict[id][type] = value;
    }


    function setWindowResizeEventCalled(value) {
        windowResizeEventCalled = value;
    }

    function getWindowResizeEventCalled() {
        return windowResizeEventCalled;
    }

    function setElementSize() {
        elementWidth = 10;
        elementHeight = 10;
    }

    function getElementWidth() {
        return elementWidth;
    }

    function getElementHeight() {
        return elementWidth;
    }

    instance = {
        isPlayingAtTopQuality: isPlayingAtTopQuality,
        updateTopQualityIndex: updateTopQualityIndex,
        getAverageThroughput: getAverageThroughput,
        getBitrateList: getBitrateList,
        getQualityForBitrate: getQualityForBitrate,
        getMaxAllowedBitrateFor: getMaxAllowedBitrateFor,
        getMinAllowedBitrateFor: getMinAllowedBitrateFor,
        setMaxAllowedBitrateFor: setMaxAllowedBitrateFor,
        setMinAllowedBitrateFor: setMinAllowedBitrateFor,
        getMaxAllowedRepresentationRatioFor: getMaxAllowedRepresentationRatioFor,
        setMaxAllowedRepresentationRatioFor: setMaxAllowedRepresentationRatioFor,
        getInitialBitrateFor: getInitialBitrateFor,
        setInitialBitrateFor: setInitialBitrateFor,
        getInitialRepresentationRatioFor: getInitialRepresentationRatioFor,
        setInitialRepresentationRatioFor: setInitialRepresentationRatioFor,
        setAutoSwitchBitrateFor: setAutoSwitchBitrateFor,
        getAutoSwitchBitrateFor: getAutoSwitchBitrateFor,
        setLimitBitrateByPortal: setLimitBitrateByPortal,
        getLimitBitrateByPortal: getLimitBitrateByPortal,
        getUsePixelRatioInLimitBitrateByPortal: getUsePixelRatioInLimitBitrateByPortal,
        setUsePixelRatioInLimitBitrateByPortal: setUsePixelRatioInLimitBitrateByPortal,
        getQualityFor: getQualityFor,
        getAbandonmentStateFor: getAbandonmentStateFor,
        setAbandonmentStateFor: setAbandonmentStateFor,
        setPlaybackQuality: setPlaybackQuality,
        checkPlaybackQuality: checkPlaybackQuality,
        setAverageThroughput: setAverageThroughput,
        getTopQualityIndexFor: getTopQualityIndexFor,
        setElementSize: setElementSize,
        getElementWidth: getElementWidth,
        getElementHeight: getElementHeight,
        setWindowResizeEventCalled: setWindowResizeEventCalled,
        getWindowResizeEventCalled: getWindowResizeEventCalled,
        initialize: initialize,
        setConfig: setConfig,
        reset: reset
    };

    setup();

    return instance;
}

AbrControllerMock.__dashjs_factory_name = 'AbrControllerMock';
let factory = FactoryMaker.getSingletonFactory(AbrControllerMock);
factory.ABANDON_LOAD = ABANDON_LOAD;
factory.QUALITY_DEFAULT = QUALITY_DEFAULT;
FactoryMaker.updateSingletonFactory(AbrControllerMock.__dashjs_factory_name, factory);
export default factory;
