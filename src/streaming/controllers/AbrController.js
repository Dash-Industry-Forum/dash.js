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
import MetricsConstants from '../constants/MetricsConstants';
import BitrateInfo from '../vo/BitrateInfo';
import FragmentModel from '../models/FragmentModel';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import FactoryMaker from '../../core/FactoryMaker';
import RulesContext from '../rules/RulesContext';
import SwitchRequest from '../rules/SwitchRequest';
import SwitchRequestHistory from '../rules/SwitchRequestHistory';
import DroppedFramesHistory from '../rules/DroppedFramesHistory';
import ThroughputHistory from '../rules/ThroughputHistory';
import Debug from '../../core/Debug';
import {HTTPRequest} from '../vo/metrics/HTTPRequest';
import {checkInteger} from '../utils/SupervisorTools';
import MediaPlayerEvents from '../MediaPlayerEvents';

const DEFAULT_VIDEO_BITRATE = 1000;
const DEFAULT_AUDIO_BITRATE = 100;
const QUALITY_DEFAULT = 0;

function AbrController() {

    const context = this.context;
    const debug = Debug(context).getInstance();
    const eventBus = EventBus(context).getInstance();

    let instance,
        logger,
        abrRulesCollection,
        streamController,
        topQualities,
        qualityDict,
        streamProcessorDict,
        abandonmentStateDict,
        abandonmentTimeout,
        windowResizeEventCalled,
        elementWidth,
        elementHeight,
        adapter,
        videoModel,
        mediaPlayerModel,
        domStorage,
        playbackIndex,
        switchHistoryDict,
        droppedFramesHistory,
        throughputHistory,
        isUsingBufferOccupancyAbrDict,
        isUsingL2AAbrDict,
        isUsingLoLPAbrDict,
        dashMetrics,
        settings;

    function setup() {
        logger = debug.getLogger(instance);
        resetInitialSettings();
    }

    /**
     * Initialize everything that is not Stream specific. We only have one instance of the ABR Controller for all periods.
     */
    function initialize() {
        droppedFramesHistory = DroppedFramesHistory(context).create();
        throughputHistory = ThroughputHistory(context).create({
            settings: settings
        });

        abrRulesCollection = ABRRulesCollection(context).create({
            dashMetrics: dashMetrics,
            mediaPlayerModel: mediaPlayerModel,
            settings: settings
        });

        abrRulesCollection.initialize();

        eventBus.on(MediaPlayerEvents.QUALITY_CHANGE_RENDERED, _onQualityChangeRendered, instance);
        eventBus.on(MediaPlayerEvents.METRIC_ADDED, _onMetricAdded, instance);
        eventBus.on(Events.LOADING_PROGRESS, _onFragmentLoadProgress, instance);
    }

    /**
     * Whenever a StreamProcessor is created it is added to the list of streamProcessorDict
     * In addition, the corresponding objects for this object and its stream id are created
     * @param {object} type
     * @param {object} streamProcessor
     */
    function registerStreamType(type, streamProcessor) {
        const streamId = streamProcessor.getStreamInfo().id;

        if (!streamProcessorDict[streamId]) {
            streamProcessorDict[streamId] = {};
        }

        if (!switchHistoryDict[streamId]) {
            switchHistoryDict[streamId] = {};
        }

        if (!abandonmentStateDict[streamId]) {
            abandonmentStateDict[streamId] = {};
        }

        switchHistoryDict[streamId][type] = SwitchRequestHistory(context).create();
        streamProcessorDict[streamId][type] = streamProcessor;

        abandonmentStateDict[streamId][type] = {};
        abandonmentStateDict[streamId][type].state = MetricsConstants.ALLOW_LOAD;

        _initializeAbrStrategy(type);

        if (type === Constants.VIDEO) {
            setElementSize();
        }
    }

    function _initializeAbrStrategy(type) {
        const strategy = settings.get().streaming.abr.ABRStrategy;

        if (strategy === Constants.ABR_STRATEGY_L2A) {
            isUsingBufferOccupancyAbrDict[type] = false;
            isUsingLoLPAbrDict[type] = false;
            isUsingL2AAbrDict[type] = true;
        } else if (strategy === Constants.ABR_STRATEGY_LoLP) {
            isUsingBufferOccupancyAbrDict[type] = false;
            isUsingLoLPAbrDict[type] = true;
            isUsingL2AAbrDict[type] = false;
        } else if (strategy === Constants.ABR_STRATEGY_BOLA) {
            isUsingBufferOccupancyAbrDict[type] = true;
            isUsingLoLPAbrDict[type] = false;
            isUsingL2AAbrDict[type] = false;
        } else if (strategy === Constants.ABR_STRATEGY_THROUGHPUT) {
            isUsingBufferOccupancyAbrDict[type] = false;
            isUsingLoLPAbrDict[type] = false;
            isUsingL2AAbrDict[type] = false;
        } else if (strategy === Constants.ABR_STRATEGY_DYNAMIC) {
            isUsingBufferOccupancyAbrDict[type] = isUsingBufferOccupancyAbrDict && isUsingBufferOccupancyAbrDict[type] ? isUsingBufferOccupancyAbrDict[type] : false;
            isUsingLoLPAbrDict[type] = false;
            isUsingL2AAbrDict[type] = false;
        }
    }

    function unRegisterStreamType(streamId, type) {
        try {
            if (streamProcessorDict[streamId] && streamProcessorDict[streamId][type]) {
                delete streamProcessorDict[streamId][type];
            }

            if (switchHistoryDict[streamId] && switchHistoryDict[streamId][type]) {
                delete switchHistoryDict[streamId][type];
            }

            if (abandonmentStateDict[streamId] && abandonmentStateDict[streamId][type]) {
                delete abandonmentStateDict[streamId][type];
            }

        } catch (e) {

        }
    }

    function resetInitialSettings() {
        topQualities = {};
        qualityDict = {};
        abandonmentStateDict = {};
        streamProcessorDict = {};
        switchHistoryDict = {};
        isUsingBufferOccupancyAbrDict = {};
        isUsingL2AAbrDict = {};
        isUsingLoLPAbrDict = {};

        if (windowResizeEventCalled === undefined) {
            windowResizeEventCalled = false;
        }
        if (droppedFramesHistory) {
            droppedFramesHistory.reset();
        }

        playbackIndex = undefined;
        droppedFramesHistory = undefined;
        throughputHistory = undefined;
        clearTimeout(abandonmentTimeout);
        abandonmentTimeout = null;
    }

    function reset() {

        resetInitialSettings();

        eventBus.off(Events.LOADING_PROGRESS, _onFragmentLoadProgress, instance);
        eventBus.off(MediaPlayerEvents.QUALITY_CHANGE_RENDERED, _onQualityChangeRendered, instance);
        eventBus.off(MediaPlayerEvents.METRIC_ADDED, _onMetricAdded, instance);

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
        if (config.dashMetrics) {
            dashMetrics = config.dashMetrics;
        }
        if (config.adapter) {
            adapter = config.adapter;
        }
        if (config.videoModel) {
            videoModel = config.videoModel;
        }
        if (config.settings) {
            settings = config.settings;
        }
    }

    function checkConfig() {
        if (!domStorage || !domStorage.hasOwnProperty('getSavedBitrateSettings')) {
            throw new Error(Constants.MISSING_CONFIG_ERROR);
        }
    }

    /**
     * While fragment loading is in progress we check if we might need to abort the request
     * @param {object} e
     * @private
     */
    function _onFragmentLoadProgress(e) {
        const type = e.request.mediaType;
        const streamId = e.streamId;

        if (!type || !streamId || !streamProcessorDict[streamId] || !settings.get().streaming.abr.autoSwitchBitrate[type]) {
            return;
        }

        const streamProcessor = streamProcessorDict[streamId][type];
        if (!streamProcessor) {
            return;
        }

        const rulesContext = RulesContext(context).create({
            abrController: instance,
            streamProcessor: streamProcessor,
            currentRequest: e.request,
            useBufferOccupancyABR: isUsingBufferOccupancyAbrDict[type],
            useL2AABR: isUsingL2AAbrDict[type],
            useLoLPABR: isUsingLoLPAbrDict[type],
            videoModel
        });
        const switchRequest = abrRulesCollection.shouldAbandonFragment(rulesContext, streamId);

        if (switchRequest.quality > SwitchRequest.NO_CHANGE) {
            const fragmentModel = streamProcessor.getFragmentModel();
            const request = fragmentModel.getRequests({
                state: FragmentModel.FRAGMENT_MODEL_LOADING,
                index: e.request.index
            })[0];
            if (request) {
                fragmentModel.abortRequests();
                abandonmentStateDict[streamId][type].state = MetricsConstants.ABANDON_LOAD;
                switchHistoryDict[streamId][type].reset();
                switchHistoryDict[streamId][type].push({
                    oldValue: getQualityFor(type, streamId),
                    newValue: switchRequest.quality,
                    confidence: 1,
                    reason: switchRequest.reason
                });
                setPlaybackQuality(type, streamController.getActiveStreamInfo(), switchRequest.quality, switchRequest.reason);

                clearTimeout(abandonmentTimeout);
                abandonmentTimeout = setTimeout(
                    () => {
                        abandonmentStateDict[streamId][type].state = MetricsConstants.ALLOW_LOAD;
                        abandonmentTimeout = null;
                    },
                    settings.get().streaming.abandonLoadTimeout
                );
            }
        }
    }

    /**
     * Update dropped frames history when the quality was changed
     * @param {object} e
     * @private
     */
    function _onQualityChangeRendered(e) {
        if (e.mediaType === Constants.VIDEO) {
            if (playbackIndex !== undefined) {
                droppedFramesHistory.push(e.streamId, playbackIndex, videoModel.getPlaybackQuality());
            }
            playbackIndex = e.newQuality;
        }
    }

    /**
     * When the buffer level is updated we check if we need to change the ABR strategy
     * @param e
     * @private
     */
    function _onMetricAdded(e) {
        if (e.metric === MetricsConstants.HTTP_REQUEST && e.value && e.value.type === HTTPRequest.MEDIA_SEGMENT_TYPE && (e.mediaType === Constants.AUDIO || e.mediaType === Constants.VIDEO)) {
            throughputHistory.push(e.mediaType, e.value, settings.get().streaming.abr.useDeadTimeLatency);
        }

        if (e.metric === MetricsConstants.BUFFER_LEVEL && (e.mediaType === Constants.AUDIO || e.mediaType === Constants.VIDEO)) {
            _updateAbrStrategy(e.mediaType, 0.001 * e.value.level);
        }
    }

    /**
     * Returns the highest possible index taking limitations like maxBitrate, representationRatio and portal size into account.
     * @param {string} type
     * @param {string} streamId
     * @return {number}
     */
    function getMaxAllowedIndexFor(type, streamId) {
        try {
            let idx;
            topQualities[streamId] = topQualities[streamId] || {};

            if (!topQualities[streamId].hasOwnProperty(type)) {
                topQualities[streamId][type] = 0;
            }

            idx = _checkMaxBitrate(type, streamId);
            idx = _checkMaxRepresentationRatio(idx, type, streamId);
            idx = _checkPortalSize(idx, type, streamId);
            return idx;
        } catch (e) {
            return undefined
        }
    }

    /**
     * Returns the minimum allowed index. We consider thresholds defined in the settings, i.e. minBitrate for the corresponding media type.
     * @param {string} type
     * @param {string} streamId
     * @return {undefined|number}
     */
    function getMinAllowedIndexFor(type, streamId) {
        try {
            return _getMinIndexBasedOnBitrateFor(type, streamId);
        } catch (e) {
            return undefined
        }
    }

    /**
     * Returns the maximum allowed index.
     * @param {string} type
     * @param {string} streamId
     * @return {undefined|number}
     */
    function _getMaxIndexBasedOnBitrateFor(type, streamId) {
        try {
            const maxBitrate = settings.get().streaming.abr.maxBitrate[type];
            if (maxBitrate > -1) {
                return getQualityForBitrate(streamProcessorDict[streamId][type].getMediaInfo(), maxBitrate, streamId);
            } else {
                return undefined;
            }
        } catch (e) {
            return undefined
        }
    }

    /**
     * Returns the minimum allowed index.
     * @param {string} type
     * @param {string} streamId
     * @return {undefined|number}
     */
    function _getMinIndexBasedOnBitrateFor(type, streamId) {
        try {
            const minBitrate = settings.get().streaming.abr.minBitrate[type];

            if (minBitrate > -1) {
                const mediaInfo = streamProcessorDict[streamId][type].getMediaInfo();
                const bitrateList = getBitrateList(mediaInfo);
                // This returns the quality index <= for the given bitrate
                let minIdx = getQualityForBitrate(mediaInfo, minBitrate, streamId);
                if (bitrateList[minIdx] && minIdx < bitrateList.length - 1 && bitrateList[minIdx].bitrate < minBitrate * 1000) {
                    minIdx++; // Go to the next bitrate
                }
                return minIdx;
            } else {
                return undefined;
            }
        } catch (e) {
            return undefined;
        }
    }

    /**
     * Returns the maximum possible index
     * @param type
     * @param streamId
     * @return {number|*}
     */
    function _checkMaxBitrate(type, streamId) {
        let idx = topQualities[streamId][type];
        let newIdx = idx;

        if (!streamProcessorDict[streamId] || !streamProcessorDict[streamId][type]) {
            return newIdx;
        }

        const minIdx = getMinAllowedIndexFor(type, streamId);
        if (minIdx !== undefined) {
            newIdx = Math.max(idx, minIdx);
        }

        const maxIdx = _getMaxIndexBasedOnBitrateFor(type, streamId);
        if (maxIdx !== undefined) {
            newIdx = Math.min(newIdx, maxIdx);
        }

        return newIdx;
    }

    /**
     * Returns the maximum index according to maximum representation ratio
     * @param idx
     * @param type
     * @param streamId
     * @return {number|*}
     * @private
     */
    function _checkMaxRepresentationRatio(idx, type, streamId) {
        let maxIdx = topQualities[streamId][type]
        const maxRepresentationRatio = settings.get().streaming.abr.maxRepresentationRatio[type];

        if (isNaN(maxRepresentationRatio) || maxRepresentationRatio >= 1 || maxRepresentationRatio < 0) {
            return idx;
        }
        return Math.min(idx, Math.round(maxIdx * maxRepresentationRatio));
    }

    /**
     * Returns the maximum index according to the portal size
     * @param idx
     * @param type
     * @param streamId
     * @return {number|*}
     * @private
     */
    function _checkPortalSize(idx, type, streamId) {
        if (type !== Constants.VIDEO || !settings.get().streaming.abr.limitBitrateByPortal || !streamProcessorDict[streamId] || !streamProcessorDict[streamId][type]) {
            return idx;
        }

        if (!windowResizeEventCalled) {
            setElementSize();
        }
        const streamInfo = streamProcessorDict[streamId][type].getStreamInfo();
        const representation = adapter.getAdaptationForType(streamInfo.index, type, streamInfo).Representation;
        let newIdx = idx;

        if (elementWidth > 0 && elementHeight > 0) {
            while (
                newIdx > 0 &&
                representation[newIdx] &&
                elementWidth < representation[newIdx].width &&
                elementWidth - representation[newIdx - 1].width < representation[newIdx].width - elementWidth) {
                newIdx = newIdx - 1;
            }

            // Make sure that in case of multiple representation elements have same
            // resolution, every such element is included
            while (newIdx < representation.length - 1 && representation[newIdx].width === representation[newIdx + 1].width) {
                newIdx = newIdx + 1;
            }
        }

        return newIdx;
    }

    /**
     * Gets top BitrateInfo for the player
     * @param {string} type - 'video' or 'audio' are the type options.
     * @param {string} streamId - Id of the stream
     * @returns {BitrateInfo | null}
     */
    function getTopBitrateInfoFor(type, streamId = null) {
        if (!streamId) {
            streamId = streamController.getActiveStreamInfo().id;
        }
        if (type && streamProcessorDict && streamProcessorDict[streamId] && streamProcessorDict[streamId][type]) {
            const idx = getMaxAllowedIndexFor(type, streamId);
            const bitrates = getBitrateList(streamProcessorDict[streamId][type].getMediaInfo());
            return bitrates[idx] ? bitrates[idx] : null;
        }
        return null;
    }

    /**
     * Returns the initial bitrate for a specific media type and stream id
     * @param {string} type
     * @param {string} streamId
     * @returns {number} A value of the initial bitrate, kbps
     * @memberof AbrController#
     */
    function getInitialBitrateFor(type, streamId) {
        checkConfig();

        if (type === Constants.TEXT) {
            return NaN;
        }

        const savedBitrate = domStorage.getSavedBitrateSettings(type);
        let configBitrate = settings.get().streaming.abr.initialBitrate[type];
        let configRatio = settings.get().streaming.abr.initialRepresentationRatio[type];

        if (configBitrate === -1) {
            if (configRatio > -1) {
                const streamInfo = streamProcessorDict[streamId][type].getStreamInfo();
                const representation = adapter.getAdaptationForType(streamInfo.index, type, streamInfo).Representation;
                if (Array.isArray(representation)) {
                    const repIdx = Math.max(Math.round(representation.length * configRatio) - 1, 0);
                    configBitrate = representation[repIdx].bandwidth / 1000;
                } else {
                    configBitrate = 0;
                }
            } else if (!isNaN(savedBitrate)) {
                configBitrate = savedBitrate;
            } else {
                configBitrate = (type === Constants.VIDEO) ? DEFAULT_VIDEO_BITRATE : DEFAULT_AUDIO_BITRATE;
            }
        }

        return configBitrate;
    }

    /**
     * This function is called by the scheduleControllers to check if the quality should be changed.
     * Consider this the main entry point for the ABR decision logic
     * @param {string} type
     * @param {string} streamId
     */
    function checkPlaybackQuality(type, streamId) {
        try {
            if (!type || !streamProcessorDict || !streamProcessorDict[streamId] || !streamProcessorDict[streamId][type]) {
                return false;
            }

            if (droppedFramesHistory) {
                const playbackQuality = videoModel.getPlaybackQuality();
                if (playbackQuality) {
                    droppedFramesHistory.push(streamId, playbackIndex, playbackQuality);
                }
            }

            // ABR is turned off, do nothing
            if (!settings.get().streaming.abr.autoSwitchBitrate[type]) {
                return false;
            }

            const oldQuality = getQualityFor(type, streamId);
            const rulesContext = RulesContext(context).create({
                abrController: instance,
                switchHistory: switchHistoryDict[streamId][type],
                droppedFramesHistory: droppedFramesHistory,
                streamProcessor: streamProcessorDict[streamId][type],
                currentValue: oldQuality,
                useBufferOccupancyABR: isUsingBufferOccupancyAbrDict[type],
                useL2AABR: isUsingL2AAbrDict[type],
                useLoLPABR: isUsingLoLPAbrDict[type],
                videoModel
            });
            const minIdx = getMinAllowedIndexFor(type, streamId);
            const maxIdx = getMaxAllowedIndexFor(type, streamId);
            const switchRequest = abrRulesCollection.getMaxQuality(rulesContext);
            let newQuality = switchRequest.quality;

            if (minIdx !== undefined && ((newQuality > SwitchRequest.NO_CHANGE) ? newQuality : oldQuality) < minIdx) {
                newQuality = minIdx;
            }
            if (newQuality > maxIdx) {
                newQuality = maxIdx;
            }

            switchHistoryDict[streamId][type].push({ oldValue: oldQuality, newValue: newQuality });

            if (newQuality > SwitchRequest.NO_CHANGE && newQuality !== oldQuality && (abandonmentStateDict[streamId][type].state === MetricsConstants.ALLOW_LOAD || newQuality > oldQuality)) {
                _changeQuality(type, oldQuality, newQuality, maxIdx, switchRequest.reason, streamId);
                return true;
            }

            return false;
        } catch (e) {
            return false;
        }

    }

    /**
     * Returns the current quality for a specific media type and a specific streamId
     * @param {string} type
     * @param {string} streamId
     * @return {number|*}
     */
    function getQualityFor(type, streamId = null) {
        try {
            if (!streamId) {
                streamId = streamController.getActiveStreamInfo().id;
            }
            if (type && streamProcessorDict[streamId] && streamProcessorDict[streamId][type]) {
                let quality;

                if (streamId) {
                    qualityDict[streamId] = qualityDict[streamId] || {};

                    if (!qualityDict[streamId].hasOwnProperty(type)) {
                        qualityDict[streamId][type] = QUALITY_DEFAULT;
                    }

                    quality = qualityDict[streamId][type];
                    return quality;
                }
            }
            return QUALITY_DEFAULT;
        } catch (e) {
            return QUALITY_DEFAULT;
        }
    }

    /**
     * Sets the new playback quality. Starts from index 0.
     * If the index of the new quality is the same as the old one changeQuality will not be called.
     * @param {string} type
     * @param {object} streamInfo
     * @param {number} newQuality
     * @param {string} reason
     */
    function setPlaybackQuality(type, streamInfo, newQuality, reason = null) {
        if (!streamInfo || !streamInfo.id || !type) {
            return;
        }
        const streamId = streamInfo.id;
        const oldQuality = getQualityFor(type, streamId);

        checkInteger(newQuality);

        const topQualityIdx = getMaxAllowedIndexFor(type, streamId);

        if (newQuality !== oldQuality && newQuality >= 0 && newQuality <= topQualityIdx) {
            _changeQuality(type, oldQuality, newQuality, topQualityIdx, reason, streamId);
        }
    }

    /**
     *
     * @param {string} streamId
     * @param {type} type
     * @return {*|null}
     */
    function getAbandonmentStateFor(streamId, type) {
        return abandonmentStateDict[streamId] && abandonmentStateDict[streamId][type] ? abandonmentStateDict[streamId][type].state : null;
    }


    /**
     * Changes the internal qualityDict values according to the new quality
     * @param {string} type
     * @param {number} oldQuality
     * @param {number} newQuality
     * @param {number} maxIdx
     * @param {string} reason
     * @param {object} streamId
     * @private
     */
    function _changeQuality(type, oldQuality, newQuality, maxIdx, reason, streamId) {
        if (type && streamProcessorDict[streamId] && streamProcessorDict[streamId][type]) {
            const streamInfo = streamProcessorDict[streamId][type].getStreamInfo();
            const bufferLevel = dashMetrics.getCurrentBufferLevel(type);
            logger.info('Stream ID: ' + streamId + ' [' + type + '] switch from ' + oldQuality + ' to ' + newQuality + '/' + maxIdx + ' (buffer: ' + bufferLevel + ') ' + (reason ? JSON.stringify(reason) : '.'));

            qualityDict[streamId] = qualityDict[streamId] || {};
            qualityDict[streamId][type] = newQuality;
            const bitrateInfo = _getBitrateInfoForQuality(streamId, type, newQuality);
            eventBus.trigger(Events.QUALITY_CHANGE_REQUESTED,
                {
                    oldQuality,
                    newQuality,
                    reason,
                    streamInfo,
                    bitrateInfo,
                    maxIdx,
                    mediaType: type
                },
                { streamId: streamInfo.id, mediaType: type }
            );
            const bitrate = throughputHistory.getAverageThroughput(type);
            if (!isNaN(bitrate)) {
                domStorage.setSavedBitrateSettings(type, bitrate);
            }
        }
    }

    function _getBitrateInfoForQuality(streamId, type, idx) {
        if (type && streamProcessorDict && streamProcessorDict[streamId] && streamProcessorDict[streamId][type]) {
            const bitrates = getBitrateList(streamProcessorDict[streamId][type].getMediaInfo());
            return bitrates[idx] ? bitrates[idx] : null;
        }
        return null;
    }

    /**
     * @param {MediaInfo} mediaInfo
     * @param {number} bitrate A bitrate value, kbps
     * @param {String} streamId Period ID
     * @param {number|null} latency Expected latency of connection, ms
     * @returns {number} A quality index <= for the given bitrate
     * @memberof AbrController#
     */
    function getQualityForBitrate(mediaInfo, bitrate, streamId, latency = null) {
        const voRepresentation = mediaInfo && mediaInfo.type ? streamProcessorDict[streamId][mediaInfo.type].getRepresentationInfo() : null;

        if (settings.get().streaming.abr.useDeadTimeLatency && latency && voRepresentation && voRepresentation.fragmentDuration) {
            latency = latency / 1000;
            const fragmentDuration = voRepresentation.fragmentDuration;
            if (latency > fragmentDuration) {
                return 0;
            } else {
                const deadTimeRatio = latency / fragmentDuration;
                bitrate = bitrate * (1 - deadTimeRatio);
            }
        }

        const bitrateList = getBitrateList(mediaInfo);

        for (let i = bitrateList.length - 1; i >= 0; i--) {
            const bitrateInfo = bitrateList[i];
            if (bitrate * 1000 >= bitrateInfo.bitrate) {
                return i;
            }
        }
        return QUALITY_DEFAULT;
    }

    /**
     * @param {MediaInfo} mediaInfo
     * @returns {Array|null} A list of {@link BitrateInfo} objects
     * @memberof AbrController#
     */
    function getBitrateList(mediaInfo) {
        const infoList = [];
        if (!mediaInfo || !mediaInfo.bitrateList) return infoList;

        const bitrateList = mediaInfo.bitrateList;
        const type = mediaInfo.type;

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

    function _updateAbrStrategy(mediaType, bufferLevel) {
        // else ABR_STRATEGY_DYNAMIC
        const strategy = settings.get().streaming.abr.ABRStrategy;

        if (strategy === Constants.ABR_STRATEGY_DYNAMIC) {
            _updateDynamicAbrStrategy(mediaType, bufferLevel);
        }
    }

    function _updateDynamicAbrStrategy(mediaType, bufferLevel) {
        const stableBufferTime = mediaPlayerModel.getStableBufferTime();
        const switchOnThreshold = stableBufferTime;
        const switchOffThreshold = 0.5 * stableBufferTime;

        const useBufferABR = isUsingBufferOccupancyAbrDict[mediaType];
        const newUseBufferABR = bufferLevel > (useBufferABR ? switchOffThreshold : switchOnThreshold); // use hysteresis to avoid oscillating rules
        isUsingBufferOccupancyAbrDict[mediaType] = newUseBufferABR;

        if (newUseBufferABR !== useBufferABR) {
            if (newUseBufferABR) {
                logger.info('[' + mediaType + '] switching from throughput to buffer occupancy ABR rule (buffer: ' + bufferLevel.toFixed(3) + ').');
            } else {
                logger.info('[' + mediaType + '] switching from buffer occupancy to throughput ABR rule (buffer: ' + bufferLevel.toFixed(3) + ').');
            }
        }
    }

    function getThroughputHistory() {
        return throughputHistory;
    }

    function updateTopQualityIndex(mediaInfo) {
        const type = mediaInfo.type;
        const streamId = mediaInfo.streamInfo.id;
        const max = mediaInfo.representationCount - 1;

        topQualities[streamId] = topQualities[streamId] || {};
        topQualities[streamId][type] = max;

        return max;
    }

    function isPlayingAtTopQuality(streamInfo) {
        const streamId = streamInfo ? streamInfo.id : null;
        const audioQuality = getQualityFor(Constants.AUDIO, streamId);
        const videoQuality = getQualityFor(Constants.VIDEO, streamId);

        const isAtTop = (audioQuality === getMaxAllowedIndexFor(Constants.AUDIO, streamId)) &&
            (videoQuality === getMaxAllowedIndexFor(Constants.VIDEO, streamId));

        return isAtTop;
    }

    function setWindowResizeEventCalled(value) {
        windowResizeEventCalled = value;
    }

    function setElementSize() {
        if (videoModel) {
            const hasPixelRatio = settings.get().streaming.abr.usePixelRatioInLimitBitrateByPortal && window.hasOwnProperty('devicePixelRatio');
            const pixelRatio = hasPixelRatio ? window.devicePixelRatio : 1;
            elementWidth = videoModel.getClientWidth() * pixelRatio;
            elementHeight = videoModel.getClientHeight() * pixelRatio;
        }
    }

    function clearDataForStream(streamId) {
        if (droppedFramesHistory) {
            droppedFramesHistory.clearForStream(streamId);
        }
        if (streamProcessorDict[streamId]) {
            delete streamProcessorDict[streamId];
        }
        if (switchHistoryDict[streamId]) {
            delete switchHistoryDict[streamId];
        }

        if (abandonmentStateDict[streamId]) {
            delete abandonmentStateDict[streamId];
        }
    }

    instance = {
        initialize,
        isPlayingAtTopQuality,
        updateTopQualityIndex,
        clearDataForStream,
        getThroughputHistory,
        getBitrateList,
        getQualityForBitrate,
        getTopBitrateInfoFor,
        getMinAllowedIndexFor,
        getMaxAllowedIndexFor,
        getInitialBitrateFor,
        getQualityFor,
        getAbandonmentStateFor,
        setPlaybackQuality,
        checkPlaybackQuality,
        setElementSize,
        setWindowResizeEventCalled,
        registerStreamType,
        unRegisterStreamType,
        setConfig,
        reset
    };

    setup();

    return instance;
}

AbrController.__dashjs_factory_name = 'AbrController';
const factory = FactoryMaker.getSingletonFactory(AbrController);
factory.QUALITY_DEFAULT = QUALITY_DEFAULT;
FactoryMaker.updateSingletonFactory(AbrController.__dashjs_factory_name, factory);
export default factory;
