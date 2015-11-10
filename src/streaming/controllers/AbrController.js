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
import ABRRulesCollection from '../rules/ABRRules/ABRRulesCollection';
import SwitchRequest from '../rules/SwitchRequest';
import BitrateInfo from '../vo/BitrateInfo.js';
import FragmentLoader from '../FragmentLoader.js';
import ScheduleController from './ScheduleController.js';
import EventBus from '../utils/EventBus.js';
import Events from '../Events.js';
import FactoryMaker from '../../core/FactoryMaker.js';

export default FactoryMaker.getSingletonFactory(AbrController);

function AbrController(config) {
    "use strict";

    const ABANDON_TIMEOUT = 10000;
    const BANDWIDTH_SAFETY = 0.9;
    const ABANDON_LOAD = "abandonload";
    const ALLOW_LOAD = "allowload";

    let log = config ? config.log : null,
        abrRulesCollection = config ? config.abrRulesCollection : null,
        rulesController = config ? config.rulesController : null,
        streamController = config ? config.streamController : null;

    let instance = {
        BANDWIDTH_SAFETY        :BANDWIDTH_SAFETY,
        ABANDON_LOAD            :ABANDON_LOAD,
        isPlayingAtTopQuality   :isPlayingAtTopQuality,
        updateTopQualityIndex   :updateTopQualityIndex,
        getAverageThroughput    :getAverageThroughput,
        getBitrateList          :getBitrateList,
        getQualityForBitrate    :getQualityForBitrate,
        getMaxAllowedBitrateFor :getMaxAllowedBitrateFor,
        setMaxAllowedBitrateFor :setMaxAllowedBitrateFor,
        getInitialBitrateFor    :getInitialBitrateFor,
        setInitialBitrateFor    :setInitialBitrateFor,
        setAutoSwitchBitrate    :setAutoSwitchBitrate,
        getAutoSwitchBitrate    :getAutoSwitchBitrate,
        getConfidenceFor        :getConfidenceFor,
        getQualityFor           :getQualityFor,
        getAbandonmentStateFor  :getAbandonmentStateFor,
        setAbandonmentStateFor  :setAbandonmentStateFor,
        setPlaybackQuality      :setPlaybackQuality,
        getPlaybackQuality      :getPlaybackQuality,
        setAverageThroughput    :setAverageThroughput,
        getTopQualityIndexFor   :getTopQualityIndexFor,
        initialize              :initialize,
        setConfig               :setConfig,
        reset                   :reset
    };

    setup();

    return instance;

    let autoSwitchBitrate,
        topQualities,
        qualityDict,
        confidenceDict,
        bitrateDict,
        averageThroughputDict,
        streamProcessorDict,
        abandonmentStateDict,
        abandonmentTimeout

    function setup() {
        autoSwitchBitrate = true,
        topQualities = {};
        qualityDict = {};
        confidenceDict = {};
        bitrateDict = {};
        averageThroughputDict = {};
        abandonmentStateDict = {};
        streamProcessorDict = {};
    }

    function initialize(type, streamProcessor) {
        streamProcessorDict[type] = streamProcessor;
        abandonmentStateDict[type] = abandonmentStateDict[type] || {};
        abandonmentStateDict[type].state = ALLOW_LOAD;
        EventBus.on(Events.LOADING_PROGRESS, onFragmentLoadProgress, this);
    }

    function getQualityFor(type, streamInfo) {
        var id = streamInfo.id,
            quality;

        qualityDict[id] = qualityDict[id] || {};

        if (!qualityDict[id].hasOwnProperty(type)) {
            qualityDict[id][type] = 0;
        }

        quality = qualityDict[id][type];
        return quality;
    }

    function setInternalQuality(type, id, value) {
        qualityDict[id] = qualityDict[id] || {};
        qualityDict[id][type] = value;
    }

    function  getConfidenceFor(type, id) {
        var confidence;

        confidenceDict[id] = confidenceDict[id] || {};

        if (!confidenceDict[id].hasOwnProperty(type)) {
            confidenceDict[id][type] = 0;
        }

        confidence = confidenceDict[id][type];

        return confidence;
    }

    function setConfidenceFor(type, id, value) {
        confidenceDict[id] = confidenceDict[id] || {};
        confidenceDict[id][type] = value;
    }

    function setTopQualityIndex(type, id, value) {
        topQualities[id] = topQualities[id] || {};
        topQualities[id][type] = value;
    }

    function checkMaxBitrate(idx, type){
        var maxBitrate = getMaxAllowedBitrateFor(type);
        if (isNaN(maxBitrate)) {
            return idx;
        }
        var maxIdx = getQualityForBitrate(streamProcessorDict[type].getMediaInfo(), maxBitrate);
        return Math.min (idx , maxIdx);
    }

    function onFragmentLoadProgress(e) {

        if (ScheduleController.LOADING_REQUEST_THRESHOLD === 0 && autoSwitchBitrate) { //check to see if there are parallel request or just one at a time.

            var type = e.request.mediaType,
                rules = abrRulesCollection.getRules(abrRulesCollection.ABANDON_FRAGMENT_RULES),
                scheduleController = streamProcessorDict[type].getScheduleController(),
                fragmentModel = scheduleController.getFragmentModel(),
                callback = function (switchRequest) {

                    function setupTimeout(type){
                        abandonmentTimeout = setTimeout(function () {
                            setAbandonmentStateFor(type, ALLOW_LOAD);
                        }, ABANDON_TIMEOUT);
                    }

                    if (switchRequest.confidence === SwitchRequest.prototype.STRONG) {

                        var requests = fragmentModel.getRequests({state:FragmentModel.states.LOADING, }),
                            newQuality = switchRequest.value,
                            currentQuality = getQualityFor(type, streamController.getActiveStreamInfo());

                        if (newQuality < currentQuality){

                            fragmentModel.abortRequests();
                            setAbandonmentStateFor(type, ABANDON_LOAD);
                            setPlaybackQuality(type, streamController.getActiveStreamInfo() , newQuality);
                            scheduleController.replaceCanceledRequests(requests);
                            setupTimeout(type);
                        }
                    }
                };

            rulesController.applyRules(rules, streamProcessorDict[type], callback, e, function(currentValue, newValue) {
                return newValue;
            });
        }
    }

    function getTopQualityIndexFor(type, id) {
        var idx;
        topQualities[id] = topQualities[id] || {};

        if (!topQualities[id].hasOwnProperty(type)) {
            topQualities[id][type] = 0;
        }

        idx = checkMaxBitrate(topQualities[id][type], type);
        return idx;
    }

    /**
     * @param type
     * @returns {number} A value of the initial bitrate, kbps
     * @memberof AbrController#
     */
    function getInitialBitrateFor(type) {
        return bitrateDict[type];
    }

    /**
     * @param type
     * @param {number} value A value of the initial bitrate, kbps
     * @memberof AbrController#
     */
    function setInitialBitrateFor(type, value) {
        bitrateDict[type] = value;
    }

    function getMaxAllowedBitrateFor(type) {
        if (bitrateDict.hasOwnProperty("max") && bitrateDict.max.hasOwnProperty(type)){
            return bitrateDict.max[type];
        }
        return NaN;
    }

    //TODO  change bitrateDict structure to hold one object for video and audio with initial and max values internal.
    // This means you need to update all the logic around intial bitrate DOMStorage, RebController etc...
    function setMaxAllowedBitrateFor(type, value) {
        bitrateDict.max = bitrateDict.max || {};
        bitrateDict.max[type] = value;
    }

    function  getAutoSwitchBitrate() {
        return autoSwitchBitrate;
    }

    function setAutoSwitchBitrate(value) {
        autoSwitchBitrate = value;
    }

    function getPlaybackQuality(streamProcessor, completedCallback) {
        var self = this,
            type = streamProcessor.getType(),
            streamInfo = streamProcessor.getStreamInfo(),
            streamId = streamInfo.id,
            quality,
            oldQuality,
            rules,
            confidence,
            callback = function(res) {
                var topQualityIdx = getTopQualityIndexFor(type, streamId);

                quality = res.value;
                confidence = res.confidence;

                // be sure the quality valid!
                if (quality < 0) {
                    quality = 0;
                }
                // zero based
                if (quality > topQualityIdx) {
                    quality = topQualityIdx;
                }

                oldQuality = getQualityFor(type, streamInfo);
                //if (quality === oldQuality || (abandonmentStateDict[type].state === ABANDON_LOAD &&  quality > oldQuality)) return;
                if (quality !== oldQuality) {

                    setInternalQuality(type, streamId, quality);
                    //log("New quality of " + quality);
                    setConfidenceFor(type, streamId, confidence);
                    //log("New confidence of " + confidence);
                    EventBus.trigger(Events.QUALITY_CHANGED, {mediaType: type, streamInfo: streamProcessor.getStreamInfo(), oldQuality: oldQuality, newQuality: quality});

                }

                if (completedCallback !== undefined) {
                    completedCallback();
                }
            };

        quality = getQualityFor(type, streamInfo);
        confidence = getConfidenceFor(type, streamId);

        //log("ABR enabled? (" + autoSwitchBitrate + ")");
        if (!autoSwitchBitrate) {
            if (completedCallback !== undefined) {
                completedCallback();
            }
        } else {
            rules = abrRulesCollection.getRules(abrRulesCollection.QUALITY_SWITCH_RULES);
            rulesController.applyRules(rules, streamProcessor, callback.bind(self), quality, function(currentValue, newValue) {
                currentValue = currentValue === SwitchRequest.prototype.NO_CHANGE ? 0 : currentValue;
                return Math.max(currentValue, newValue);
            });
        }
    }

    function setPlaybackQuality(type, streamInfo, newPlaybackQuality) {
        var id = streamInfo.id,
            quality = getQualityFor(type, streamInfo),
            isInt = newPlaybackQuality !== null && !isNaN(newPlaybackQuality) && (newPlaybackQuality % 1 === 0);

        if (!isInt) throw "argument is not an integer";

        if (newPlaybackQuality !== quality && newPlaybackQuality >= 0 && newPlaybackQuality <= getTopQualityIndexFor(type, id)) {
            setInternalQuality(type, id, newPlaybackQuality);
            EventBus.trigger(Events.QUALITY_CHANGED, {mediaType: type, streamInfo: streamInfo, oldQuality: quality, newQuality: newPlaybackQuality});
        }
    }

    function setAbandonmentStateFor(type, state) {
        abandonmentStateDict[type].state = state;
    }

    function getAbandonmentStateFor(type) {
        return abandonmentStateDict[type].state;
    }

    /**
     * @param mediaInfo
     * @param bitrate A bitrate value, kbps
     * @returns {number} A quality index <= for the given bitrate
     * @memberof AbrController#
     */
    function getQualityForBitrate(mediaInfo, bitrate) {
        var bitrateList = getBitrateList(mediaInfo),
            ln = bitrateList.length,
            bitrateInfo;

        for (var i = 0; i < ln; i +=1) {
            bitrateInfo = bitrateList[i];

            if (bitrate*1000 <= bitrateInfo.bitrate) {
                return Math.max(i-1, 0);
            }
        }

        return (ln-1);
    }

    /**
     * @param mediaInfo
     * @returns {Array} A list of {@link BitrateInfo} objects
     * @memberof AbrController#
     */
    function getBitrateList(mediaInfo) {
        if (!mediaInfo || !mediaInfo.bitrateList) return null;

        var bitrateList = mediaInfo.bitrateList,
            type = mediaInfo.type,
            infoList = [],
            bitrateInfo;

        for (var i = 0, ln = bitrateList.length; i < ln; i += 1) {
            bitrateInfo = new BitrateInfo();
            bitrateInfo.mediaType = type;
            bitrateInfo.qualityIndex = i;
            bitrateInfo.bitrate = bitrateList[i];
            infoList.push(bitrateInfo);
        }

        return infoList;
    }

    function setAverageThroughput(type, value) {
        averageThroughputDict[type] = value;
    }

    function getAverageThroughput(type) {
        return averageThroughputDict[type];
    }

    function updateTopQualityIndex(mediaInfo) {
        var type = mediaInfo.type,
            streamId = mediaInfo.streamInfo.id,
            max;

        max = mediaInfo.representationCount - 1;
        setTopQualityIndex(type, streamId, max);

        return max;
    }

    function isPlayingAtTopQuality(streamInfo) {
        var isAtTop,
            streamId = streamInfo.id,
            audioQuality = getQualityFor("audio", streamInfo),
            videoQuality = getQualityFor("video", streamInfo);

        isAtTop = (audioQuality === getTopQualityIndexFor("audio", streamId)) &&
            (videoQuality === getTopQualityIndexFor("video", streamId));

        return isAtTop;
    }

    function reset () {
        EventBus.off(Events.LOADING_PROGRESS, onFragmentLoadProgress, this);
        autoSwitchBitrate = true;
        topQualities = {};
        qualityDict = {};
        confidenceDict = {};
        streamProcessorDict = {};
        abandonmentStateDict = {};
        averageThroughputDict = {};
        clearTimeout(abandonmentTimeout);
        abandonmentTimeout = null;
    }

    function setConfig(config){
        if (!config) return;

        if (config.log){
            log = config.log;
        }
        if (config.abrRulesCollection){
            abrRulesCollection = config.abrRulesCollection;
        }
        if (config.rulesController){
            rulesController = config.rulesController;
        }
        if (config.streamController){
            streamController = config.streamController;
        }
    }
};