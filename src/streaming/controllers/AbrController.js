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
import SwitchRequestHistory from '../rules/SwitchRequestHistory';
import DroppedFramesHistory from '../rules/DroppedFramesHistory';
import ThroughputHistory from '../rules/ThroughputHistory';
import Debug from '../../core/Debug';
import {HTTPRequest} from '../vo/metrics/HTTPRequest';
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
        bitrateInfoDict,
        streamProcessorDict,
        abandonmentStateDict,
        abandonmentTimeout,
        windowResizeEventCalled,
        elementWidth,
        adapter,
        videoModel,
        mediaPlayerModel,
        customParametersModel,
        cmsdModel,
        domStorage,
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
        _resetInitialSettings();
    }

    function _resetInitialSettings() {
        bitrateInfoDict = {};
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
        droppedFramesHistory = undefined;
        throughputHistory = undefined;
        clearTimeout(abandonmentTimeout);
        abandonmentTimeout = null;
    }

    /**
     * Initialize everything that is not Stream specific. We only have one instance of the ABR Controller for all periods.
     */
    function initialize() {
        droppedFramesHistory = DroppedFramesHistory(context).create();
        throughputHistory = ThroughputHistory(context).create({
            settings
        });

        abrRulesCollection = ABRRulesCollection(context).create({
            dashMetrics,
            customParametersModel,
            abrController: instance,
            mediaPlayerModel,
            settings
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

    function reset() {

        _resetInitialSettings();

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
        if (config.customParametersModel) {
            customParametersModel = config.customParametersModel;
        }
        if (config.cmsdModel) {
            cmsdModel = config.cmsdModel
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

        if (switchRequest.bitrateInfo) {
            const fragmentModel = streamProcessor.getFragmentModel();
            const request = fragmentModel.getRequests({
                state: FragmentModel.FRAGMENT_MODEL_LOADING,
                index: e.request.index
            })[0];
            if (request) {
                abandonmentStateDict[streamId][type].state = MetricsConstants.ABANDON_LOAD;
                switchHistoryDict[streamId][type].reset();
                switchHistoryDict[streamId][type].push({
                    oldValue: getCurrentBitrateInfoFor(type, streamId),
                    newValue: switchRequest.bitrateInfo,
                    confidence: 1,
                    reason: switchRequest.reason
                });
                setPlaybackQuality(switchRequest);

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
            _pushDroppedFrames(e.streamId, e.representationId);
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
        let configBitrate = mediaPlayerModel.getAbrBitrateParameter('initialBitrate', type);
        let configRatio = settings.get().streaming.abr.initialRepresentationRatio[type];

        if (configBitrate === -1) {
            if (configRatio > -1) {
                const streamInfo = streamProcessorDict[streamId][type].getStreamInfo();
                const representation = adapter.getAdaptationForType(streamInfo.index, type, streamInfo).Representation_asArray;
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
     * Update the dropped frames history values
     * @param {String} streamId
     * @private
     */
    function _pushDroppedFrames(streamId, representationId) {
        if (droppedFramesHistory && representationId !== undefined) {
            const playbackQuality = videoModel.getPlaybackQuality();
            if (playbackQuality) {
                droppedFramesHistory.push(streamId, representationId, playbackQuality);
            }
        }
    }

    /**
     * Returns the current quality for a specific media type and a specific streamId
     * @param {string} type
     * @param {string} streamId
     * @return {BitrateInfo}
     */
    function getCurrentBitrateInfoFor(type, streamId = null) {
        try {
            if (!streamId) {
                streamId = streamController.getActiveStreamInfo().id;
            }
            if (type && streamProcessorDict[streamId] && streamProcessorDict[streamId][type]) {
                if (streamId) {
                    bitrateInfoDict[streamId] = bitrateInfoDict[streamId] || {};

                    if (bitrateInfoDict[streamId].hasOwnProperty(type)) {
                        return bitrateInfoDict[streamId][type]
                    }
                }
            }
            return null
        } catch (e) {
            return null;
        }
    }

    function _setCurrentBitrateInfoFor(type, bitrateInfo, streamId) {
        bitrateInfoDict[streamId] = bitrateInfoDict[streamId] || {};
        bitrateInfoDict[streamId][type] = bitrateInfo;
    }

    /**
     * This function is called by the scheduleControllers to check if the quality should be changed.
     * Consider this the main entry point for the ABR decision logic
     * @param {string} type
     * @param {string} streamId
     */
    function checkPlaybackQuality(type, streamId) {
        // Missing parameters or ABR is turned off
        if (!type || !streamProcessorDict || !streamProcessorDict[streamId] || !streamProcessorDict[streamId][type] || !settings.get().streaming.abr.autoSwitchBitrate[type]) {
            return false;
        }

        const previousBitrateInfo = getCurrentBitrateInfoFor(type, streamId);
        const rulesContext = RulesContext(context).create({
            abrController: instance,
            switchHistory: switchHistoryDict[streamId][type],
            droppedFramesHistory: droppedFramesHistory,
            streamProcessor: streamProcessorDict[streamId][type],
            useBufferOccupancyABR: isUsingBufferOccupancyAbrDict[type],
            useL2AABR: isUsingL2AAbrDict[type],
            useLoLPABR: isUsingLoLPAbrDict[type],
            videoModel
        });
        const switchRequest = abrRulesCollection.getBestPossibleSwitchRequest(rulesContext);

        if (!switchRequest) {
            return false;
        }

        switchHistoryDict[streamId][type].push({
            oldValue: previousBitrateInfo,
            newValue: switchRequest.bitrateInfo
        });

        return setPlaybackQuality(switchRequest)
    }

    /**
     * Sets the new playback quality. Starts from index 0.
     * If the index of the new quality is the same as the old one changeQuality will not be called.
     * @param {SwitchRequest} switchRequest
     */
    function setPlaybackQuality(switchRequest) {
        try {
            if (!switchRequest || !switchRequest.bitrateInfo || !switchRequest.bitrateInfo.mediaInfo) {
                return false;
            }
            const mediaInfo = switchRequest.bitrateInfo.mediaInfo;
            const streamInfo = switchRequest.bitrateInfo.mediaInfo.streamInfo;
            const streamId = streamInfo.id;
            const type = switchRequest.bitrateInfo.mediaInfo.type;
            const previousBitrateInfo = getCurrentBitrateInfoFor(type, streamId);
            const isAdaptationSetSwitch = previousBitrateInfo !== null && !adapter.areMediaInfosEqual(mediaInfo, previousBitrateInfo.mediaInfo);

            if (!_isAllowedToChangeQuality(isAdaptationSetSwitch, previousBitrateInfo, switchRequest, streamId, type)) {
                return false;
            }

            return _changeQuality(switchRequest, previousBitrateInfo, isAdaptationSetSwitch);
        } catch (e) {
            logger.error(e)
        }
    }

    function _isAllowedToChangeQuality(isAdaptationSetSwitch, previousBitrateInfo, switchRequest, streamId, type) {
        // No AS Switch and index stays the same as before
        if (!isAdaptationSetSwitch && previousBitrateInfo && switchRequest.bitrateInfo.qualityIndex === previousBitrateInfo.qualityIndex) {
            return false
        }

        // Loading is stopped
        if (abandonmentStateDict[streamId][type].state !== MetricsConstants.ALLOW_LOAD) {
            return false
        }

        return true
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
     * @param {SwitchRequest} switchRequest
     * @param {BitrateInfo} previousBitrateInfo
     * @param {boolean} isAdaptationSetSwitch
     * @private
     */
    function _changeQuality(switchRequest, previousBitrateInfo, isAdaptationSetSwitch = false) {
        try {
            const newBitrateInfo = switchRequest.bitrateInfo;
            const streamInfo = newBitrateInfo.mediaInfo.streamInfo;
            const streamId = streamInfo.id;
            const type = newBitrateInfo.mediaInfo.type;
            const isDynamic = streamInfo && streamInfo.manifestInfo && streamInfo.manifestInfo.isDynamic;
            const reason = switchRequest.reason;
            const bufferLevel = dashMetrics.getCurrentBufferLevel(type);
            const oldIndex = previousBitrateInfo ? previousBitrateInfo.absoluteIndex : '0';
            logger.info(`Stream ID:  ${streamInfo.id}  [ ${type} ] switch from  ${oldIndex} to  ${newBitrateInfo.absoluteIndex}  (buffer: ${bufferLevel} ) (${reason ? JSON.stringify(reason) : '.'})`);


            const bitrate = throughputHistory.getAverageThroughput(type, isDynamic);
            if (!isNaN(bitrate)) {
                domStorage.setSavedBitrateSettings(type, bitrate);
            }

            _setCurrentBitrateInfoFor(type, switchRequest.bitrateInfo, streamId)

            eventBus.trigger(Events.QUALITY_CHANGE_REQUESTED,
                {
                    previousBitrateInfo,
                    newBitrateInfo,
                    reason,
                    streamInfo,
                    isAdaptationSetSwitch
                },
                { streamId: streamInfo.id, mediaType: type }
            );

            return true
        } catch (e) {
            logger.error(e);
            return false
        }
    }

    /**
     *
     * @param mediaInfo
     * @param bitrate
     * @param includeCompatibleMediaInfos
     * @param applySettingsFilter
     */
    function getBitrateInfoByBitrate(mediaInfo, bitrate, includeCompatibleMediaInfos = true, applySettingsFilter = true) {
        const bitrateList = getBitrateInfoList(mediaInfo, includeCompatibleMediaInfos, applySettingsFilter);

        for (let i = bitrateList.length - 1; i >= 0; i--) {
            const bitrateInfo = bitrateList[i];
            if (bitrate >= bitrateInfo.bitrate) {
                return bitrateInfo;
            }
        }

        return bitrateList[0]
    }

    function getBitrateInfoByIndex(mediaInfo, index, includeCompatibleMediaInfos = true, applySettingsFilter = true) {
        const bitrateList = getBitrateInfoList(mediaInfo, includeCompatibleMediaInfos, applySettingsFilter);

        return bitrateList[index];
    }

    function getBitrateInfoByRepresentationId(mediaInfo, id, includeCompatibleMediaInfos = true, applySettingsFilter = false) {
        const bitrateList = getBitrateInfoList(mediaInfo, includeCompatibleMediaInfos, applySettingsFilter);

        return bitrateList.filter((bInfo) => {
            return bInfo.representationId === id;
        })[0]
    }

    /**
     * @param mediaInfo
     * @param {boolean} includeCompatibleMediaInfos Whether to include AS that are compatible and can be used for ABR switching. For instance, according to the SupplementalProperty "adaptation-set-switching-2016"
     * @param applySettingsFilter
     * @returns {BitrateInfo[]} A list of {@link BitrateInfo} objects sorted by bitrate in ascending order
     * @memberof AbrController#
     */
    function getBitrateInfoList(mediaInfo, includeCompatibleMediaInfos = true, applySettingsFilter = true) {
        let combinedBitrateInfoArray = [];
        if (!mediaInfo) {
            return combinedBitrateInfoArray;
        }

        const mediaInfos = _getPossibleMediaInfos(mediaInfo, includeCompatibleMediaInfos)
        mediaInfos.forEach((mediaInfo, index) => {
            if (mediaInfo.bitrateList) {
                const bitrateList = mediaInfo.bitrateList;

                let bitrateInfo;

                for (let i = 0, ln = bitrateList.length; i < ln; i++) {
                    bitrateInfo = new BitrateInfo();
                    bitrateInfo.qualityIndex = i;
                    bitrateInfo.bitrate = bitrateList[i].bandwidth / 1000;
                    bitrateInfo.width = bitrateList[i].width;
                    bitrateInfo.height = bitrateList[i].height;
                    bitrateInfo.scanType = bitrateList[i].scanType;
                    bitrateInfo.mediaInfo = mediaInfo;
                    bitrateInfo.representationId = bitrateList[i].id;
                    bitrateInfo.mediaInfoIndex = index;
                    combinedBitrateInfoArray.push(bitrateInfo);
                }

            }
        })

        // Last entry is the top quality
        if (combinedBitrateInfoArray.length > 0) {
            combinedBitrateInfoArray[combinedBitrateInfoArray.length - 1].isTopBitrate = true;
        }

        // If set to true we filter the list of options based on the provided settings
        if (applySettingsFilter) {
            combinedBitrateInfoArray = _filterByAllowedSettings(combinedBitrateInfoArray)
        }

        //Sort by bitrate in ascending order. Lowest bitrate first
        combinedBitrateInfoArray.sort((a, b) => {
            return a.bitrate - b.bitrate;
        })

        //Set index values
        combinedBitrateInfoArray.forEach((bInfo, index) => {
            bInfo.absoluteIndex = index
        })

        return combinedBitrateInfoArray;
    }

    /**
     * @param {BitrateInfo[]} bitrateInfoArray
     * @return {BitrateInfo[]}
     */
    function _filterByAllowedSettings(bitrateInfoArray) {
        try {
            bitrateInfoArray = _filterByPossibleBitrate(bitrateInfoArray);
            bitrateInfoArray = _filterByMaxRepresentationRatio(bitrateInfoArray);
            bitrateInfoArray = _filterByPortalSize(bitrateInfoArray);
            bitrateInfoArray = _filterByCmsdMaxBitrate(bitrateInfoArray);

            return bitrateInfoArray;
        } catch (e) {
            logger.error(e);
            return bitrateInfoArray
        }
    }

    /**
     * Returns the maximum possible index
     * @param {BitrateInfo[]} bitrateInfoArray
     * @return {BitrateInfo[]}
     */
    function _filterByPossibleBitrate(bitrateInfoArray) {
        try {
            const filteredArray = bitrateInfoArray.filter((bitrateInfo) => {
                const type = bitrateInfo.mediaInfo.type;
                const currentBitrate = bitrateInfo.bitrate;
                const maxBitrate = mediaPlayerModel.getAbrBitrateParameter('maxBitrate', type);
                const minBitrate = mediaPlayerModel.getAbrBitrateParameter('minBitrate', type);

                if (maxBitrate > -1 && currentBitrate > maxBitrate) {
                    return false;
                }

                return !(minBitrate > -1 && currentBitrate < minBitrate);
            })

            if (filteredArray.length > 0) {
                return filteredArray
            }

            return bitrateInfoArray
        } catch (e) {
            logger.error(e);
            return bitrateInfoArray
        }
    }

    /**
     * @param {BitrateInfo[]} bitrateInfoArray
     * @return {BitrateInfo[]}
     * @private
     */
    function _filterByMaxRepresentationRatio(bitrateInfoArray) {
        try {
            const maxIdx = bitrateInfoArray.length - 1;
            const filteredArray = bitrateInfoArray.filter((bitrateInfo) => {
                const type = bitrateInfo.mediaInfo.type;
                const maxRepresentationRatio = settings.get().streaming.abr.maxRepresentationRatio[type];

                if (isNaN(maxRepresentationRatio) || maxRepresentationRatio >= 1 || maxRepresentationRatio < 0) {
                    return true;
                }

                return Math.min(bitrateInfo.qualityIndex, Math.round(maxIdx * maxRepresentationRatio));
            })

            if (filteredArray.length > 0) {
                return filteredArray
            }

            return bitrateInfoArray
        } catch (e) {
            logger.error(e);
            return bitrateInfoArray
        }
    }

    /**
     * @param {BitrateInfo[]} bitrateInfoArray
     * @return {BitrateInfo[]}
     * @private
     */
    function _filterByPortalSize(bitrateInfoArray) {
        try {
            if (!settings.get().streaming.abr.limitBitrateByPortal) {
                return bitrateInfoArray;
            }

            if (!windowResizeEventCalled) {
                setElementSize();
            }

            const filteredArray = bitrateInfoArray.filter((bitrateInfo) => {
                return bitrateInfo.mediaInfo.type !== Constants.VIDEO || bitrateInfo.width <= elementWidth;
            })

            if (filteredArray.length > 0) {
                return filteredArray
            }

            return bitrateInfoArray
        } catch (e) {
            logger.error(e);
            return bitrateInfoArray
        }
    }

    /**
     * @param {BitrateInfo[]} bitrateInfoArray
     * @return {BitrateInfo[]}
     */
    function _filterByCmsdMaxBitrate(bitrateInfoArray) {
        try {
            // Check CMSD max suggested bitrate only for video segments
            if (!settings.get().streaming.cmsd.enabled || !settings.get().streaming.cmsd.abr.applyMb) {
                return bitrateInfoArray
            }

            const filteredArray = bitrateInfoArray.filter((bitrateInfo) => {
                const type = bitrateInfo.mediaInfo.type;
                let maxCmsdBitrate = cmsdModel.getMaxBitrate(type);

                if (type !== Constants.VIDEO || maxCmsdBitrate < 0) {
                    return true
                }
                // Substract audio bitrate
                const streamId = bitrateInfo.mediaInfo.streamInfo.id;
                const audioBitrateInfo = getCurrentBitrateInfoFor(Constants.AUDIO, streamId);
                maxCmsdBitrate -= audioBitrateInfo ? audioBitrateInfo.bitrate : 0;
                return bitrateInfo.bitrate <= maxCmsdBitrate
            })

            if (filteredArray.length > 0) {
                return filteredArray
            }

            return bitrateInfoArray
        } catch (e) {
            logger.error(e);
            return bitrateInfoArray
        }
    }


    function _getPossibleMediaInfos(mediaInfo, includeCompatibleMediaInfos = false) {
        try {
            const possibleMediaInfos = [];

            if (mediaInfo) {
                possibleMediaInfos.push(mediaInfo);
            }

            // If AS switching is disabled return only the current MediaInfo
            if (!includeCompatibleMediaInfos || !settings.get().streaming.abr.enableSupplementalPropertyAdaptationSetSwitching
                || !mediaInfo.adaptationSetSwitchingCompatibleIds
                || mediaInfo.adaptationSetSwitchingCompatibleIds.length === 0) {
                return possibleMediaInfos
            }

            // Otherwise add everything that is compatible
            const mediaInfoArr = streamProcessorDict[mediaInfo.streamInfo.id][mediaInfo.type].getMediaInfoArr()
            const compatibleMediaInfos = mediaInfoArr.filter((entry) => {
                return mediaInfo.adaptationSetSwitchingCompatibleIds.includes(entry.id)
            })

            return possibleMediaInfos.concat(compatibleMediaInfos);
        } catch (e) {
            return [mediaInfo]
        }
    }

    function _updateAbrStrategy(mediaType, bufferLevel) {
        // else ABR_STRATEGY_DYNAMIC
        const strategy = settings.get().streaming.abr.ABRStrategy;

        if (strategy === Constants.ABR_STRATEGY_DYNAMIC) {
            _updateDynamicAbrStrategy(mediaType, bufferLevel);
        }
    }

    function _updateDynamicAbrStrategy(mediaType, bufferLevel) {
        try {
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
        } catch (e) {
            logger.error(e);
        }
    }

    function getThroughputHistory() {
        return throughputHistory;
    }

    function isPlayingAtTopQuality(streamInfo) {
        const streamId = streamInfo ? streamInfo.id : null;
        const audioQuality = getCurrentBitrateInfoFor(Constants.AUDIO, streamId);
        const videoQuality = getCurrentBitrateInfoFor(Constants.VIDEO, streamId);

        return audioQuality.isTopBitrate && videoQuality.isTopBitrate
    }

    function setWindowResizeEventCalled(value) {
        windowResizeEventCalled = value;
    }

    function setElementSize() {
        if (videoModel) {
            const hasPixelRatio = settings.get().streaming.abr.usePixelRatioInLimitBitrateByPortal && window.hasOwnProperty('devicePixelRatio');
            const pixelRatio = hasPixelRatio ? window.devicePixelRatio : 1;
            elementWidth = videoModel.getClientWidth() * pixelRatio;
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
        checkPlaybackQuality,
        clearDataForStream,
        getThroughputHistory,
        getAbandonmentStateFor,
        getBitrateInfoByBitrate,
        getBitrateInfoByIndex,
        getBitrateInfoByRepresentationId,
        getBitrateInfoList,
        getCurrentBitrateInfoFor,
        getInitialBitrateFor,
        initialize,
        isPlayingAtTopQuality,
        registerStreamType,
        reset,
        setConfig,
        setPlaybackQuality,
        setElementSize,
        setWindowResizeEventCalled,
        unRegisterStreamType
    };

    setup();

    return instance;
}

AbrController.__dashjs_factory_name = 'AbrController';
const factory = FactoryMaker.getSingletonFactory(AbrController);
factory.QUALITY_DEFAULT = QUALITY_DEFAULT;
FactoryMaker.updateSingletonFactory(AbrController.__dashjs_factory_name, factory);
export default factory;
