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

import ABRRulesCollection from '../rules/abr/ABRRulesCollection';
import Constants from '../constants/Constants';
import BitrateInfo from '../vo/BitrateInfo';
import FragmentModel from '../models/FragmentModel';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import MediaPlayerEvents from '../MediaPlayerEvents.js';
import FactoryMaker from '../../core/FactoryMaker';
import RulesContext from '../rules/RulesContext.js';
import SwitchRequest from '../rules/SwitchRequest.js';
import SwitchRequestHistory from '../rules/SwitchRequestHistory.js';
import DroppedFramesHistory from '../rules/DroppedFramesHistory.js';
import ThroughputHistory from '../rules/ThroughputHistory.js';
import {HTTPRequest} from '../vo/metrics/HTTPRequest';
import Debug from '../../core/Debug';

const ABANDON_LOAD = 'abandonload';
const ALLOW_LOAD = 'allowload';
const DEFAULT_VIDEO_BITRATE = 1000;
const DEFAULT_AUDIO_BITRATE = 100;
const QUALITY_DEFAULT = 0;

function AbrController() {

    let context = this.context;
    let debug = Debug(context).getInstance();
    let eventBus = EventBus(context).getInstance();

    let instance,
        log,
        abrRulesCollection,
        streamController,
        autoSwitchBitrate,
        topQualities,
        qualityDict,
        bitrateDict,
        ratioDict,
        streamProcessorDict,
        abandonmentStateDict,
        abandonmentTimeout,
        limitBitrateByPortal,
        usePixelRatioInLimitBitrateByPortal,
        windowResizeEventCalled,
        elementWidth,
        elementHeight,
        manifestModel,
        dashManifestModel,
        adapter,
        videoModel,
        mediaPlayerModel,
        domStorage,
        playbackIndex,
        switchHistoryDict,
        droppedFramesHistory,
        throughputHistory,
        metricsModel,
        dashMetrics,
        useDeadTimeLatency;

    function setup() {
        log = debug.log.bind(instance);

        reset();
    }

    function registerStreamType(type, streamProcessor) {
        switchHistoryDict[type] = SwitchRequestHistory(context).create();
        streamProcessorDict[type] = streamProcessor;
        abandonmentStateDict[type] = abandonmentStateDict[type] || {};
        abandonmentStateDict[type].state = ALLOW_LOAD;
        eventBus.on(Events.LOADING_PROGRESS, onFragmentLoadProgress, this);
        if (type == Constants.VIDEO) {
            eventBus.on(MediaPlayerEvents.QUALITY_CHANGE_RENDERED, onQualityChangeRendered, this);
            droppedFramesHistory = DroppedFramesHistory(context).create();
            setElementSize();
        }
        eventBus.on(MediaPlayerEvents.METRIC_ADDED, onMetricAdded, this);
        throughputHistory = ThroughputHistory(context).create({
            mediaPlayerModel: mediaPlayerModel
        });
    }

    function createAbrRulesCollection() {
        abrRulesCollection = ABRRulesCollection(context).create({
            metricsModel: metricsModel,
            dashMetrics: dashMetrics,
            mediaPlayerModel: mediaPlayerModel,
            adapter: adapter
        });

        abrRulesCollection.initialize();
    }

    function reset() {
        autoSwitchBitrate = {video: true, audio: true};
        topQualities = {};
        qualityDict = {};
        bitrateDict = {};
        ratioDict = {};
        abandonmentStateDict = {};
        streamProcessorDict = {};
        switchHistoryDict = {};
        limitBitrateByPortal = false;
        useDeadTimeLatency = true;
        usePixelRatioInLimitBitrateByPortal = false;
        if (windowResizeEventCalled === undefined) {
            windowResizeEventCalled = false;
        }
        eventBus.off(Events.LOADING_PROGRESS, onFragmentLoadProgress, this);
        eventBus.off(MediaPlayerEvents.QUALITY_CHANGE_RENDERED, onQualityChangeRendered, this);
        eventBus.off(MediaPlayerEvents.METRIC_ADDED, onMetricAdded, this);
        playbackIndex = undefined;
        droppedFramesHistory = undefined;
        throughputHistory = undefined;
        clearTimeout(abandonmentTimeout);
        abandonmentTimeout = null;
        if (abrRulesCollection) {
            abrRulesCollection.reset();
        }
    }

    function setConfig(config) {
        if (!config) return;

        if (config.streamController) {
            streamController = config.streamController;
        }
        if (config.domStorage) {
            domStorage = config.domStorage;
        }
        if (config.mediaPlayerModel) {
            mediaPlayerModel = config.mediaPlayerModel;
        }
        if (config.metricsModel) {
            metricsModel = config.metricsModel;
        }
        if (config.dashMetrics) {
            dashMetrics = config.dashMetrics;
        }
        if (config.dashManifestModel) {
            dashManifestModel = config.dashManifestModel;
        }
        if (config.adapter) {
            adapter = config.adapter;
        }
        if (config.manifestModel) {
            manifestModel = config.manifestModel;
        }
        if (config.videoModel) {
            videoModel = config.videoModel;
        }
    }

    function onQualityChangeRendered(e) {
        if (e.mediaType === Constants.VIDEO) {
            playbackIndex = e.oldQuality;
            droppedFramesHistory.push(playbackIndex, videoModel.getPlaybackQuality());
        }
    }

    function onMetricAdded(e) {
        if (e.metric === 'HttpList' && e.value && e.value.type === HTTPRequest.MEDIA_SEGMENT_TYPE && (e.mediaType === Constants.AUDIO || e.mediaType === Constants.VIDEO)) {
            throughputHistory.push(e.mediaType, e.value, useDeadTimeLatency);
        }
    }

    function getTopQualityIndexFor(type, id) {
        let idx;
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
     * @param {string} type
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
                    let repIdx = Math.max(Math.round(representation.length * ratioDict[type]) - 1, 0);
                    bitrateDict[type] = representation[repIdx].bandwidth;
                } else {
                    bitrateDict[type] = 0;
                }
            } else if (!isNaN(savedBitrate)) {
                bitrateDict[type] = savedBitrate;
            } else {
                bitrateDict[type] = (type === Constants.VIDEO) ? DEFAULT_VIDEO_BITRATE : DEFAULT_AUDIO_BITRATE;
            }
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

    function getUseDeadTimeLatency() {
        return useDeadTimeLatency;
    }

    function setUseDeadTimeLatency(value) {
        useDeadTimeLatency = value;
    }

    function checkPlaybackQuality(type) {
        if (type  && streamProcessorDict && streamProcessorDict[type]) {
            const streamInfo = streamProcessorDict[type].getStreamInfo();
            const streamId = streamInfo ? streamInfo.id : null;
            const oldQuality = getQualityFor(type);
            const rulesContext = RulesContext(context).create({
                abrController: instance,
                streamProcessor: streamProcessorDict[type],
                currentValue: oldQuality,
                switchHistory: switchHistoryDict[type],
                droppedFramesHistory: droppedFramesHistory,
                hasRichBuffer: hasRichBuffer(type)
            });

            if (droppedFramesHistory) {
                droppedFramesHistory.push(playbackIndex, videoModel.getPlaybackQuality());
            }

            //log("ABR enabled? (" + autoSwitchBitrate + ")");
            if (getAutoSwitchBitrateFor(type)) {
                const topQualityIdx = getTopQualityIndexFor(type, streamId);
                const switchRequest = abrRulesCollection.getMaxQuality(rulesContext);
                let newQuality = switchRequest.quality;
                if (newQuality > topQualityIdx) {
                    newQuality = topQualityIdx;
                }
                switchHistoryDict[type].push({oldValue: oldQuality, newValue: newQuality});

                if (newQuality > SwitchRequest.NO_CHANGE && newQuality != oldQuality) {
                    if (abandonmentStateDict[type].state === ALLOW_LOAD || newQuality > oldQuality) {
                        changeQuality(type, oldQuality, newQuality, topQualityIdx, switchRequest.reason);
                    }
                } else if (debug.getLogToBrowserConsole()) {
                    const bufferLevel = dashMetrics.getCurrentBufferLevel(metricsModel.getReadOnlyMetricsFor(type));
                    log('AbrController (' + type + ') stay on ' + oldQuality + '/' + topQualityIdx + ' (buffer: ' + bufferLevel + ')');
                }
            }
        }
    }

    function setPlaybackQuality(type, streamInfo, newQuality, reason) {
        const id = streamInfo.id;
        const oldQuality = getQualityFor(type);
        const isInt = newQuality !== null && !isNaN(newQuality) && (newQuality % 1 === 0);

        if (!isInt) throw new Error('argument is not an integer');

        const topQualityIdx = getTopQualityIndexFor(type, id);
        if (newQuality !== oldQuality && newQuality >= 0 && newQuality <= topQualityIdx) {
            changeQuality(type, oldQuality, newQuality, topQualityIdx, reason);
        }
    }

    function changeQuality(type, oldQuality, newQuality, topQualityIdx, reason) {
        if (type  && streamProcessorDict[type]) {
            var streamInfo = streamProcessorDict[type].getStreamInfo();
            var id = streamInfo ? streamInfo.id : null;
            if (debug.getLogToBrowserConsole()) {
                const bufferLevel = dashMetrics.getCurrentBufferLevel(metricsModel.getReadOnlyMetricsFor(type));
                log('AbrController (' + type + ') switch from ' + oldQuality + ' to ' + newQuality + '/' + topQualityIdx + ' (buffer: ' + bufferLevel + ')\n' + JSON.stringify(reason));
            }
            setQualityFor(type, id, newQuality);
            eventBus.trigger(Events.QUALITY_CHANGE_REQUESTED, {mediaType: type, streamInfo: streamInfo, oldQuality: oldQuality, newQuality: newQuality, reason: reason});
        }
    }

    function setAbandonmentStateFor(type, state) {
        abandonmentStateDict[type].state = state;
    }

    function getAbandonmentStateFor(type) {
        return abandonmentStateDict[type].state;
    }

    /**
     * @param {MediaInfo} mediaInfo
     * @param {number} bitrate A bitrate value, kbps
     * @param {number} latency Expected latency of connection, ms
     * @returns {number} A quality index <= for the given bitrate
     * @memberof AbrController#
     */
    function getQualityForBitrate(mediaInfo, bitrate, latency) {
        if (useDeadTimeLatency && latency && streamProcessorDict[mediaInfo.type].getCurrentRepresentationInfo() && streamProcessorDict[mediaInfo.type].getCurrentRepresentationInfo().fragmentDuration) {
            latency = latency / 1000;
            let fragmentDuration = streamProcessorDict[mediaInfo.type].getCurrentRepresentationInfo().fragmentDuration;
            if (latency > fragmentDuration) {
                return 0;
            } else {
                let deadTimeRatio = latency / fragmentDuration;
                bitrate = bitrate * (1 - deadTimeRatio);
            }
        }

        const bitrateList = getBitrateList(mediaInfo);
        if (!bitrateList || bitrateList.length === 0) {
            return QUALITY_DEFAULT;
        }

        for (let i = bitrateList.length - 1; i >= 0; i--) {
            const bitrateInfo = bitrateList[i];
            if (bitrate * 1000 >= bitrateInfo.bitrate) {
                return i;
            }
        }
        return 0;
    }

    /**
     * @param {MediaInfo} mediaInfo
     * @returns {Array|null} A list of {@link BitrateInfo} objects
     * @memberof AbrController#
     */
    function getBitrateList(mediaInfo) {
        if (!mediaInfo || !mediaInfo.bitrateList) return null;

        let bitrateList = mediaInfo.bitrateList;
        let type = mediaInfo.type;

        let infoList = [];
        let bitrateInfo;

        for (let i = 0, ln = bitrateList.length; i < ln; i++) {
            bitrateInfo = new BitrateInfo();
            bitrateInfo.mediaType = type;
            bitrateInfo.qualityIndex = i;
            bitrateInfo.bitrate = bitrateList[i].bandwidth;
            bitrateInfo.width = bitrateList[i].width;
            bitrateInfo.height = bitrateList[i].height;
            bitrateInfo.scanType = bitrateList[i].scanType;
            infoList.push(bitrateInfo);
        }

        return infoList;
    }

    function hasRichBuffer(type) {
        const metrics = metricsModel.getReadOnlyMetricsFor(type);
        const bufferLevel = dashMetrics.getCurrentBufferLevel(metrics);
        const bufferState = (metrics.BufferState.length > 0) ? metrics.BufferState[metrics.BufferState.length - 1] : null;
        let isBufferRich = false;

        // This will happen when another rule tries to switch down from highest quality index
        // If there is enough buffer why not try to stay at high level
        if (bufferState && bufferLevel > bufferState.target) {
            // Are we currently over the buffer target by at least RICH_BUFFER_THRESHOLD?
            isBufferRich = bufferLevel > ( bufferState.target + mediaPlayerModel.getRichBufferThreshold() );
        }

        return isBufferRich;
    }

    function getThroughputHistory() {
        return throughputHistory;
    }

    function updateTopQualityIndex(mediaInfo) {
        let type = mediaInfo.type;
        let streamId = mediaInfo.streamInfo.id;
        let max = mediaInfo.representationCount - 1;

        setTopQualityIndex(type, streamId, max);

        return max;
    }

    function isPlayingAtTopQuality(streamInfo) {
        let isAtTop;
        let streamId = streamInfo.id;
        const audioQuality = getQualityFor(Constants.AUDIO);
        const videoQuality = getQualityFor(Constants.VIDEO);

        isAtTop = (audioQuality === getTopQualityIndexFor(Constants.AUDIO, streamId)) &&
            (videoQuality === getTopQualityIndexFor(Constants.VIDEO, streamId));

        return isAtTop;
    }

    function getQualityFor(type) {
        if (type && streamProcessorDict[type]) {
            let streamInfo = streamProcessorDict[type].getStreamInfo();
            const id = streamInfo ? streamInfo.id : null;
            let quality;

            if (id) {
                qualityDict[id] = qualityDict[id] || {};

                if (!qualityDict[id].hasOwnProperty(type)) {
                    qualityDict[id][type] = QUALITY_DEFAULT;
                }

                quality = qualityDict[id][type];
                return quality;
            }
        }
        return QUALITY_DEFAULT;
    }

    function setQualityFor(type, id, value) {
        qualityDict[id] = qualityDict[id] || {};
        qualityDict[id][type] = value;
    }

    function setTopQualityIndex(type, id, value) {
        topQualities[id] = topQualities[id] || {};
        topQualities[id][type] = value;
    }

    function checkMaxBitrate(idx, type) {
        let newIdx = idx;

        if (!streamProcessorDict[type]) {
            return newIdx;
        }

        let minBitrate = getMinAllowedBitrateFor(type);
        if (minBitrate) {
            let minIdx = getQualityForBitrate(streamProcessorDict[type].getMediaInfo(), minBitrate);
            newIdx = Math.max (idx , minIdx);
        }

        let maxBitrate = getMaxAllowedBitrateFor(type);
        if (maxBitrate) {
            let maxIdx = getQualityForBitrate(streamProcessorDict[type].getMediaInfo(), maxBitrate);
            newIdx = Math.min (newIdx , maxIdx);
        }

        return newIdx;
    }

    function checkMaxRepresentationRatio(idx, type, maxIdx) {
        let maxRepresentationRatio = getMaxAllowedRepresentationRatioFor(type);
        if (isNaN(maxRepresentationRatio) || maxRepresentationRatio >= 1 || maxRepresentationRatio < 0) {
            return idx;
        }
        return Math.min( idx , Math.round(maxIdx * maxRepresentationRatio) );
    }

    function setWindowResizeEventCalled(value) {
        windowResizeEventCalled = value;
    }

    function setElementSize() {
        let hasPixelRatio = usePixelRatioInLimitBitrateByPortal && window.hasOwnProperty('devicePixelRatio');
        let pixelRatio = hasPixelRatio ? window.devicePixelRatio : 1;
        elementWidth = videoModel.getClientWidth() * pixelRatio;
        elementHeight = videoModel.getClientHeight() * pixelRatio;
    }

    function checkPortalSize(idx, type) {
        if (type !== Constants.VIDEO || !limitBitrateByPortal || !streamProcessorDict[type]) {
            return idx;
        }

        if (!windowResizeEventCalled) {
            setElementSize();
        }

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
        const type = e.request.mediaType;
        if (getAutoSwitchBitrateFor(type)) {
            const streamProcessor = streamProcessorDict[type];
            if (!streamProcessor) return;// There may be a fragment load in progress when we switch periods and recreated some controllers.

            let rulesContext = RulesContext(context).create({
                abrController: instance,
                streamProcessor: streamProcessor,
                currentRequest: e.request,
                hasRichBuffer: hasRichBuffer(type)
            });
            let switchRequest = abrRulesCollection.shouldAbandonFragment(rulesContext);
            //Removed overrideFunc
            //    function (currentValue, newValue) {
            //        return newValue;
            //    });

            if (switchRequest.quality > SwitchRequest.NO_CHANGE) {
                const fragmentModel = streamProcessor.getFragmentModel();
                const request = fragmentModel.getRequests({state: FragmentModel.FRAGMENT_MODEL_LOADING, index: e.request.index})[0];
                if (request) {
                    //TODO Check if we should abort or if better to finish download. check bytesLoaded/Total
                    fragmentModel.abortRequests();
                    setAbandonmentStateFor(type, ABANDON_LOAD);
                    switchHistoryDict[type].reset();
                    switchHistoryDict[type].push({oldValue: getQualityFor(type, streamController.getActiveStreamInfo()), newValue: switchRequest.quality, confidence: 1, reason: switchRequest.reason});
                    setPlaybackQuality(type, streamController.getActiveStreamInfo(), switchRequest.quality, switchRequest.reason);
                    eventBus.trigger(Events.FRAGMENT_LOADING_ABANDONED, {streamProcessor: streamProcessorDict[type], request: request, mediaType: type});

                    clearTimeout(abandonmentTimeout);
                    abandonmentTimeout = setTimeout(
                        () => {setAbandonmentStateFor(type, ALLOW_LOAD); abandonmentTimeout = null;},
                        mediaPlayerModel.getAbandonLoadTimeout()
                    );
                }
            }
        }
    }

    instance = {
        isPlayingAtTopQuality: isPlayingAtTopQuality,
        updateTopQualityIndex: updateTopQualityIndex,
        getThroughputHistory: getThroughputHistory,
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
        getUseDeadTimeLatency: getUseDeadTimeLatency,
        setUseDeadTimeLatency: setUseDeadTimeLatency,
        setLimitBitrateByPortal: setLimitBitrateByPortal,
        getLimitBitrateByPortal: getLimitBitrateByPortal,
        getUsePixelRatioInLimitBitrateByPortal: getUsePixelRatioInLimitBitrateByPortal,
        setUsePixelRatioInLimitBitrateByPortal: setUsePixelRatioInLimitBitrateByPortal,
        getQualityFor: getQualityFor,
        getAbandonmentStateFor: getAbandonmentStateFor,
        setPlaybackQuality: setPlaybackQuality,
        checkPlaybackQuality: checkPlaybackQuality,
        getTopQualityIndexFor: getTopQualityIndexFor,
        setElementSize: setElementSize,
        setWindowResizeEventCalled: setWindowResizeEventCalled,
        createAbrRulesCollection: createAbrRulesCollection,
        registerStreamType: registerStreamType,
        setConfig: setConfig,
        reset: reset
    };

    setup();

    return instance;
}

AbrController.__dashjs_factory_name = 'AbrController';
let factory = FactoryMaker.getSingletonFactory(AbrController);
factory.ABANDON_LOAD = ABANDON_LOAD;
factory.QUALITY_DEFAULT = QUALITY_DEFAULT;
FactoryMaker.updateSingletonFactory(AbrController.__dashjs_factory_name, factory);
export default factory;
