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

import SwitchRequest from '../rules/SwitchRequest';
import BitrateInfo from '../vo/BitrateInfo.js';
import DOMStorage from '../utils/DOMStorage.js';
import ABRRulesCollection from '../rules/abr/ABRRulesCollection.js';
import MediaPlayerModel from '../models/MediaPlayerModel.js';
import FragmentModel from '../models/FragmentModel.js';
import EventBus from '../../core/EventBus.js';
import Events from '../../core/events/Events.js';
import FactoryMaker from '../../core/FactoryMaker.js';
import ManifestModel from '../models/ManifestModel.js';
import DashManifestModel from '../../dash/models/DashManifestModel.js';
import VideoModel from '../models/VideoModel.js';

const ABANDON_LOAD = 'abandonload';
const ALLOW_LOAD = 'allowload';
const DEFAULT_VIDEO_BITRATE = 1000;
const DEFAULT_AUDIO_BITRATE = 100;

function AbrController() {

    let context = this.context;
    let eventBus = EventBus(context).getInstance();

    let instance,
        abrRulesCollection,
        rulesController,
        streamController,
        autoSwitchBitrate,
        topQualities,
        qualityDict,
        confidenceDict,
        bitrateDict,
        ratioDict,
        averageThroughputDict,
        streamProcessorDict,
        abandonmentStateDict,
        abandonmentTimeout,
        limitBitrateByPortal,
        manifestModel,
        dashManifestModel,
        videoModel,
        mediaPlayerModel,
        domStorage;

    function setup() {
        autoSwitchBitrate = {video: true, audio: true};
        topQualities = {};
        qualityDict = {};
        confidenceDict = {};
        bitrateDict = {};
        ratioDict = {};
        averageThroughputDict = {};
        abandonmentStateDict = {};
        streamProcessorDict = {};
        limitBitrateByPortal = false;
        domStorage = DOMStorage(context).getInstance();
        mediaPlayerModel = MediaPlayerModel(context).getInstance();
        manifestModel = ManifestModel(context).getInstance();
        dashManifestModel = DashManifestModel(context).getInstance();
        videoModel = VideoModel(context).getInstance();
    }

    function initialize(type, streamProcessor) {
        streamProcessorDict[type] = streamProcessor;
        abandonmentStateDict[type] = abandonmentStateDict[type] || {};
        abandonmentStateDict[type].state = ALLOW_LOAD;
        eventBus.on(Events.LOADING_PROGRESS, onFragmentLoadProgress, this);
    }

    function setConfig(config) {
        if (!config) return;

        if (config.abrRulesCollection) {
            abrRulesCollection = config.abrRulesCollection;
        }
        if (config.rulesController) {
            rulesController = config.rulesController;
        }
        if (config.streamController) {
            streamController = config.streamController;
        }
    }

    function getTopQualityIndexFor(type, id) {
        var idx;
        topQualities[id] = topQualities[id] || {};

        if (!topQualities[id].hasOwnProperty(type)) {
            topQualities[id][type] = 0;
        }

        idx = checkMaxBitrate(topQualities[id][type], type);
        idx = checkMaxRepresentationRatio(idx, type, topQualities[id][type]);
        idx = checkPortalSize(idx, type);
        return idx;
    }

    /**
     * @param type
     * @returns {number} A value of the initial bitrate, kbps
     * @memberof AbrController#
     */
    function getInitialBitrateFor(type) {

        let savedBitrate = domStorage.getSavedBitrateSettings(type);

        if (!bitrateDict.hasOwnProperty(type)) {
            if (ratioDict.hasOwnProperty(type)) {
                let manifest = manifestModel.getValue();
                let representation = dashManifestModel.getAdaptationForType(manifest, 0, type).Representation;

                if (Array.isArray(representation)) {
                    bitrateDict[type] = representation[Math.round(representation.length * ratioDict[type]) - 1].bandwidth;
                } else {
                    bitrateDict[type] = 0;
                }
            } else if (!isNaN(savedBitrate)) {
                bitrateDict[type] = savedBitrate;
            } else {
                bitrateDict[type] = (type === 'video') ? DEFAULT_VIDEO_BITRATE : DEFAULT_AUDIO_BITRATE;
            }
        }

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

    //TODO  change bitrateDict structure to hold one object for video and audio with initial and max values internal.
    // This means you need to update all the logic around initial bitrate DOMStorage, RebController etc...
    function setMaxAllowedBitrateFor(type, value) {
        bitrateDict.max = bitrateDict.max || {};
        bitrateDict.max[type] = value;
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

    function getPlaybackQuality(streamProcessor, completedCallback) {
        var type = streamProcessor.getType();
        var streamInfo = streamProcessor.getStreamInfo();
        var streamId = streamInfo.id;
        var quality,
            oldQuality,
            rules,
            confidence;
        var callback = function (res) {
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
            if (quality === oldQuality || (abandonmentStateDict[type].state === ABANDON_LOAD &&  quality > oldQuality)) return;
            if (quality !== oldQuality) {

                setInternalQuality(type, streamId, quality);
                //log("New quality of " + quality);
                setConfidenceFor(type, streamId, confidence);
                //log("New confidence of " + confidence);
                eventBus.trigger(Events.QUALITY_CHANGED, {mediaType: type, streamInfo: streamProcessor.getStreamInfo(), oldQuality: oldQuality, newQuality: quality});

            }

            if (completedCallback !== undefined) {
                completedCallback();
            }
        };

        quality = getQualityFor(type, streamInfo);
        confidence = getConfidenceFor(type, streamId);

        //log("ABR enabled? (" + autoSwitchBitrate + ")");
        if (!getAutoSwitchBitrateFor(type)) {
            if (completedCallback !== undefined) {
                completedCallback();
            }
        } else {
            rules = abrRulesCollection.getRules(ABRRulesCollection.QUALITY_SWITCH_RULES);
            rulesController.applyRules(rules, streamProcessor, callback, quality, function (currentValue, newValue) {
                currentValue = currentValue === SwitchRequest.NO_CHANGE ? 0 : currentValue;
                return Math.max(currentValue, newValue);
            });
        }
    }

    function setPlaybackQuality(type, streamInfo, newPlaybackQuality) {
        var id = streamInfo.id;
        var quality = getQualityFor(type, streamInfo);
        var isInt = newPlaybackQuality !== null && !isNaN(newPlaybackQuality) && (newPlaybackQuality % 1 === 0);

        if (!isInt) throw 'argument is not an integer';

        if (newPlaybackQuality !== quality && newPlaybackQuality >= 0 && newPlaybackQuality <= getTopQualityIndexFor(type, id)) {
            setInternalQuality(type, id, newPlaybackQuality);
            eventBus.trigger(Events.QUALITY_CHANGED, {mediaType: type, streamInfo: streamInfo, oldQuality: quality, newQuality: newPlaybackQuality});
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
        var bitrateList = getBitrateList(mediaInfo);
        var ln = bitrateList.length;
        var bitrateInfo;

        for (var i = 0; i < ln; i++) {
            bitrateInfo = bitrateList[i];

            if (bitrate * 1000 <= bitrateInfo.bitrate) {
                return Math.max(i - 1, 0);
            }
        }

        return (ln - 1);
    }

    /**
     * @param mediaInfo
     * @returns {Array} A list of {@link BitrateInfo} objects
     * @memberof AbrController#
     */
    function getBitrateList(mediaInfo) {
        if (!mediaInfo || !mediaInfo.bitrateList) return null;

        var bitrateList = mediaInfo.bitrateList;
        var type = mediaInfo.type;

        var infoList = [];
        var bitrateInfo;

        for (var i = 0, ln = bitrateList.length; i < ln; i++) {
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
        var type = mediaInfo.type;
        var streamId = mediaInfo.streamInfo.id;
        var max = mediaInfo.representationCount - 1;

        setTopQualityIndex(type, streamId, max);

        return max;
    }

    function isPlayingAtTopQuality(streamInfo) {
        var isAtTop;
        var streamId = streamInfo.id;
        var audioQuality = getQualityFor('audio', streamInfo);
        var videoQuality = getQualityFor('video', streamInfo);

        isAtTop = (audioQuality === getTopQualityIndexFor('audio', streamId)) &&
            (videoQuality === getTopQualityIndexFor('video', streamId));

        return isAtTop;
    }

    function reset () {
        eventBus.off(Events.LOADING_PROGRESS, onFragmentLoadProgress, this);
        clearTimeout(abandonmentTimeout);
        abandonmentTimeout = null;
        setup();
    }

    function getQualityFor(type, streamInfo) {
        var id = streamInfo.id;
        var quality;

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

    function getConfidenceFor(type, id) {
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

    function checkMaxBitrate(idx, type) {
        var maxBitrate = getMaxAllowedBitrateFor(type);
        if (isNaN(maxBitrate) || !streamProcessorDict[type]) {
            return idx;
        }
        var maxIdx = getQualityForBitrate(streamProcessorDict[type].getMediaInfo(), maxBitrate);
        return Math.min (idx , maxIdx);
    }

    function checkMaxRepresentationRatio(idx, type, maxIdx) {
        var maxRepresentationRatio = getMaxAllowedRepresentationRatioFor(type);
        if (isNaN(maxRepresentationRatio) || maxRepresentationRatio >= 1 || maxRepresentationRatio < 0) {
            return idx;
        }
        return Math.min( idx , Math.round(maxIdx * maxRepresentationRatio) );
    }

    function checkPortalSize(idx, type) {
        if (type !== 'video' || !limitBitrateByPortal || !streamProcessorDict[type]) {
            return idx;
        }

        let element = videoModel.getElement();
        let elementWidth = element.clientWidth;
        let elementHeight = element.clientHeight;
        let manifest = manifestModel.getValue();
        let representation = dashManifestModel.getAdaptationForType(manifest, 0, type).Representation;
        let newIdx = idx;

        if (elementWidth > 0 && elementHeight > 0) {
            while (
                newIdx > 0 &&
                representation[newIdx] &&
                elementWidth < representation[newIdx].width &&
                elementWidth - representation[newIdx - 1].width < representation[newIdx].width - elementWidth
            ) {
                newIdx = newIdx - 1;
            }

            if (representation.length - 2 >= newIdx && representation[newIdx].width === representation[newIdx + 1].width) {
                newIdx = Math.min(idx, newIdx + 1);
            }
        }

        return newIdx;
    }

    function onFragmentLoadProgress(e) {
        var type = e.request.mediaType;
        if (getAutoSwitchBitrateFor(type)) { //check to see if there are parallel request or just one at a time.

            var rules = abrRulesCollection.getRules(ABRRulesCollection.ABANDON_FRAGMENT_RULES);
            var scheduleController = streamProcessorDict[type].getScheduleController();
            var fragmentModel = scheduleController.getFragmentModel();
            var callback = function (switchRequest) {

                function setupTimeout(type) {
                    abandonmentTimeout = setTimeout(function () {
                        setAbandonmentStateFor(type, ALLOW_LOAD);
                    }, mediaPlayerModel.getAbandonLoadTimeout());
                }

                if (switchRequest.confidence === SwitchRequest.STRONG) {

                    var requests = fragmentModel.getRequests({ state: FragmentModel.FRAGMENT_MODEL_LOADING});
                    var newQuality = switchRequest.value;
                    var currentQuality = getQualityFor(type, streamController.getActiveStreamInfo());

                    if (newQuality < currentQuality) {

                        fragmentModel.abortRequests();
                        setAbandonmentStateFor(type, ABANDON_LOAD);
                        setPlaybackQuality(type, streamController.getActiveStreamInfo(), newQuality);
                        scheduleController.replaceCanceledRequests(requests);
                        setupTimeout(type);
                    }
                }
            };

            rulesController.applyRules(rules, streamProcessorDict[type], callback, e, function (currentValue, newValue) {
                return newValue;
            });
        }
    }

    instance = {
        isPlayingAtTopQuality: isPlayingAtTopQuality,
        updateTopQualityIndex: updateTopQualityIndex,
        getAverageThroughput: getAverageThroughput,
        getBitrateList: getBitrateList,
        getQualityForBitrate: getQualityForBitrate,
        getMaxAllowedBitrateFor: getMaxAllowedBitrateFor,
        setMaxAllowedBitrateFor: setMaxAllowedBitrateFor,
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
        getConfidenceFor: getConfidenceFor,
        getQualityFor: getQualityFor,
        getAbandonmentStateFor: getAbandonmentStateFor,
        setAbandonmentStateFor: setAbandonmentStateFor,
        setPlaybackQuality: setPlaybackQuality,
        getPlaybackQuality: getPlaybackQuality,
        setAverageThroughput: setAverageThroughput,
        getTopQualityIndexFor: getTopQualityIndexFor,
        initialize: initialize,
        setConfig: setConfig,
        reset: reset
    };

    setup();

    return instance;
}

AbrController.__dashjs_factory_name = 'AbrController';
let factory = FactoryMaker.getSingletonFactory(AbrController);
factory.ABANDON_LOAD = ABANDON_LOAD;
export default factory;