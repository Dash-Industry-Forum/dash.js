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

import ABRRulesCollection from '../rules/abr/ABRRulesCollection.js';
import Constants from '../constants/Constants.js';
import MetricsConstants from '../constants/MetricsConstants.js';
import FragmentModel from '../models/FragmentModel.js';
import EventBus from '../../core/EventBus.js';
import Events from '../../core/events/Events.js';
import FactoryMaker from '../../core/FactoryMaker.js';
import RulesContext from '../rules/RulesContext.js';
import SwitchRequest from '../rules/SwitchRequest.js';
import SwitchRequestHistory from '../rules/SwitchRequestHistory.js';
import DroppedFramesHistory from '../rules/DroppedFramesHistory.js';
import Debug from '../../core/Debug.js';
import MediaPlayerEvents from '../MediaPlayerEvents.js';

const DEFAULT_VIDEO_BITRATE = 1000;
const DEFAULT_BITRATE = 100;

function AbrController() {

    const context = this.context;
    const debug = Debug(context).getInstance();
    const eventBus = EventBus(context).getInstance();

    let instance,
        logger,
        abrRulesCollection,
        streamController,
        streamProcessorDict,
        abandonmentStateDict,
        abandonmentTimeout,
        windowResizeEventCalled,
        adapter,
        videoModel,
        mediaPlayerModel,
        customParametersModel,
        cmsdModel,
        domStorage,
        playbackRepresentationId,
        switchHistoryDict,
        droppedFramesHistory,
        throughputController,
        dashMetrics,
        settings;

    function setup() {
        logger = debug.getLogger(instance);
        resetInitialSettings();
    }

    /**
     * Initialize everything that is not period specific. We only have one instance of the ABR Controller for all periods.
     */
    function initialize() {
        droppedFramesHistory = DroppedFramesHistory(context).create();
        abrRulesCollection = ABRRulesCollection(context).create({
            dashMetrics,
            customParametersModel,
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

        // Do not change current value if it has been set before
        const currentState = abrRulesCollection.getBolaState(type)
        if (currentState === undefined) {
            abrRulesCollection.setBolaState(type, settings.get().streaming.abr.activeRules.bolaRule && !_shouldApplyDynamicAbrStrategy());
        }

    }

    /**
     * Remove all parameters that belong to a specific period
     * @param {string} streamId
     * @param {string} type
     */
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
        abandonmentStateDict = {};
        streamProcessorDict = {};
        switchHistoryDict = {};

        if (windowResizeEventCalled === undefined) {
            windowResizeEventCalled = false;
        }
        if (droppedFramesHistory) {
            droppedFramesHistory.reset();
        }

        playbackRepresentationId = undefined;
        droppedFramesHistory = undefined;
        clearTimeout(abandonmentTimeout);
        abandonmentTimeout = null;
    }

    function reset() {

        resetInitialSettings();

        eventBus.off(MediaPlayerEvents.QUALITY_CHANGE_RENDERED, _onQualityChangeRendered, instance);
        eventBus.off(MediaPlayerEvents.METRIC_ADDED, _onMetricAdded, instance);
        eventBus.off(Events.LOADING_PROGRESS, _onFragmentLoadProgress, instance);

        if (abrRulesCollection) {
            abrRulesCollection.reset();
        }
    }

    function setConfig(config) {
        if (!config) return;

        if (config.streamController) {
            streamController = config.streamController;
        }
        if (config.throughputController) {
            throughputController = config.throughputController;
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

    function getOptimalRepresentationForBitrate(mediaInfo, bitrate, includeCompatibleMediaInfos = true, applySettingsFilter = true) {
        const possibleVoRepresentations = getPossibleVoRepresentations(mediaInfo, includeCompatibleMediaInfos, applySettingsFilter);

        if (!possibleVoRepresentations || possibleVoRepresentations.length === 0) {
            return null;
        }

        // If bitrate should be as small as possible return the Representation with the lowest bitrate
        if (bitrate <= 0) {
            return possibleVoRepresentations.sort((a, b) => {
                return a.bandwidth - b.bandwidth;
            })[0]
        }

        // Get all Representations that have lower or equal bitrate than our target bitrate
        const targetRepresentations = possibleVoRepresentations.filter((rep) => {
            return rep.bitrateInKbit <= bitrate
        });

        if (!targetRepresentations || targetRepresentations.length === 0) {
            return possibleVoRepresentations[0];
        }

        // Return the one that has the highest quality rank. This is not necessarily the one with the highest bitrate
        return targetRepresentations.reduce((prev, curr) => {
            return prev.calculatedQualityRank > curr.calculatedQualityRank ? prev : curr
        })
    }


    function getPossibleVoRepresentations(mediaInfo, includeCompatibleMediaInfos = true, applySettingsFilter = true) {
        let voRepresentations = [];
        if (!mediaInfo) {
            return voRepresentations;
        }

        const mediaInfos = _getPossibleMediaInfos(mediaInfo)
        mediaInfos.forEach((mediaInfo) => {
            let currentVoRepresentations = adapter.getVoRepresentations(mediaInfo);

            if (currentVoRepresentations && currentVoRepresentations.length > 0) {
                voRepresentations = voRepresentations.concat(currentVoRepresentations)
            }
        })

        // If set to true we filter the list of options based on the provided settings
        if (applySettingsFilter) {
            voRepresentations = _filterByAllowedSettings(voRepresentations)
        }
        voRepresentations = _assignAndSortByCalculatedQualityRank(voRepresentations);

        // Add an absolute index
        voRepresentations.forEach((rep, index) => {
            rep.absoluteIndex = index
        })

        // Filter the Representations in case we do not want to include compatible Media Infos
        // We can not apply the filter before otherwise the absolute index would be wrong
        if (!includeCompatibleMediaInfos) {
            voRepresentations = voRepresentations.filter((rep) => {
                return adapter.areMediaInfosEqual(rep.mediaInfo, mediaInfo);
            })
        }

        return voRepresentations;
    }

    function _getPossibleMediaInfos(mediaInfo) {
        try {
            const possibleMediaInfos = [];

            if (mediaInfo) {
                possibleMediaInfos.push(mediaInfo);
            }

            // If AS switching is disabled return only the current MediaInfo
            if (!settings.get().streaming.abr.enableSupplementalPropertyAdaptationSetSwitching
                || !mediaInfo.adaptationSetSwitchingCompatibleIds
                || mediaInfo.adaptationSetSwitchingCompatibleIds.length === 0) {
                return possibleMediaInfos
            }

            // Otherwise add everything that is compatible
            const mediaInfoArr = streamProcessorDict[mediaInfo.streamInfo.id][mediaInfo.type].getAllMediaInfos()
            const compatibleMediaInfos = mediaInfoArr.filter((entry) => {
                return mediaInfo.adaptationSetSwitchingCompatibleIds.includes(entry.id)
            })

            return possibleMediaInfos.concat(compatibleMediaInfos);
        } catch (e) {
            return [mediaInfo]
        }
    }

    /**
     * @param {Representation[]} voRepresentations
     * @return {Representation[]}
     */
    function _filterByAllowedSettings(voRepresentations) {
        try {
            voRepresentations = _filterByPossibleBitrate(voRepresentations);
            voRepresentations = _filterByPortalSize(voRepresentations);
            voRepresentations = _filterByCmsdMaxBitrate(voRepresentations);

            return voRepresentations;
        } catch (e) {
            logger.error(e);
            return voRepresentations
        }
    }

    /**
     * Returns all RepresentationInfo objects that have at least one bitrate that fulfills the constraint
     * @param {Representation[]} voRepresentations
     * @return {Representation[]}
     */
    function _filterByPossibleBitrate(voRepresentations) {
        try {
            const filteredArray = voRepresentations.filter((voRepresentation) => {
                const type = voRepresentation.mediaInfo.type;
                const currentBitrate = voRepresentation.bitrateInKbit;
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

            return voRepresentations
        } catch (e) {
            logger.error(e);
            return voRepresentations
        }
    }

    /**
     * @param {Representation[]} voRepresentations
     * @return {Representation[]}
     * @private
     */
    function _filterByPortalSize(voRepresentations) {
        try {
            if (!settings.get().streaming.abr.limitBitrateByPortal) {
                return voRepresentations;
            }

            const { elementWidth } = videoModel.getVideoElementSize();

            const filteredArray = voRepresentations.filter((voRepresentation) => {
                return voRepresentation.mediaInfo.type !== Constants.VIDEO || voRepresentation.width <= elementWidth;
            })

            if (filteredArray.length > 0) {
                return filteredArray
            }

            return voRepresentations
        } catch (e) {
            logger.error(e);
            return voRepresentations
        }
    }

    /**
     * @param {Representation[]} voRepresentations
     * @return {Representation[]}
     */
    function _filterByCmsdMaxBitrate(voRepresentations) {
        try {
            // Check CMSD max suggested bitrate only for video segments
            if (!settings.get().streaming.cmsd.enabled || !settings.get().streaming.cmsd.abr.applyMb) {
                return voRepresentations
            }

            const filteredArray = voRepresentations.filter((voRepresentation) => {
                const type = voRepresentation.mediaInfo.type;
                let maxCmsdBitrate = cmsdModel.getMaxBitrate(type);

                if (type !== Constants.VIDEO || maxCmsdBitrate < 0) {
                    return true
                }
                // Subtract audio bitrate
                const streamId = voRepresentation.mediaInfo.streamInfo.id;
                const streamProcessor = streamProcessorDict[streamId][Constants.AUDIO];
                const representation = streamProcessor.getRepresentation();
                const audioBitrate = representation.bitrateInKbit;
                maxCmsdBitrate -= audioBitrate ? audioBitrate : 0;
                return voRepresentation.bitrateInKbit <= maxCmsdBitrate
            })

            if (filteredArray.length > 0) {
                return filteredArray
            }

            return voRepresentations
        } catch (e) {
            logger.error(e);
            return voRepresentations
        }
    }

    /**
     * Calculate a quality rank based on bandwidth, codec and qualityRanking. Lower value means better quality.
     * @param voRepresentations
     * @private
     */
    function _assignAndSortByCalculatedQualityRank(voRepresentations) {

        // All Representations must have a qualityRanking otherwise we ignore it
        // QualityRanking only applies to Representations within one AS. If we merged multiple AS based on the adaptation-set-switching-2016 supplemental property we can not apply this logic
        let firstMediaInfo = null;
        const filteredRepresentations = voRepresentations.filter((rep) => {
            if (!firstMediaInfo) {
                firstMediaInfo = rep.mediaInfo;
            }
            return !isNaN(rep.qualityRanking) && adapter.areMediaInfosEqual(firstMediaInfo, rep.mediaInfo);
        })

        if (filteredRepresentations.length === voRepresentations.length) {
            voRepresentations.sort((a, b) => {
                return b.qualityRanking - a.qualityRanking;
            })
        } else {
            voRepresentations.sort((a, b) => {
                return a.bandwidth - b.bandwidth;
            })
        }

        return voRepresentations.map((rep, index) => {
            rep.calculatedQualityRank = index
            return rep;
        })
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
            streamProcessor,
            currentRequest: e.request,
            throughputController,
            videoModel
        });
        const switchRequest = abrRulesCollection.shouldAbandonFragment(rulesContext, streamId);
        const currentRepresentation = streamProcessor.getRepresentation();

        if (switchRequest.quality > SwitchRequest.NO_CHANGE) {
            const fragmentModel = streamProcessor.getFragmentModel();
            const request = fragmentModel.getRequests({
                state: FragmentModel.FRAGMENT_MODEL_LOADING,
                index: e.request.index
            })[0];
            if (request) {
                abandonmentStateDict[streamId][type].state = MetricsConstants.ABANDON_LOAD;
                switchHistoryDict[streamId][type].reset();
                switchHistoryDict[streamId][type].push({
                    previousId: currentRepresentation ? currentRepresentation.id : null,
                    newId: switchRequest.quality,
                    confidence: 1,
                    reason: switchRequest.reason
                });
                setPlaybackQuality(type, streamController.getActiveStreamInfo(), switchRequest.representation, switchRequest.reason);

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
            if (playbackRepresentationId !== undefined) {
                droppedFramesHistory.push(e.streamId, playbackRepresentationId, videoModel.getPlaybackQuality());
            }
            playbackRepresentationId = e.newRepresentation.id;
        }
    }

    /**
     * When the buffer level is updated we check if we need to change the ABR strategy
     * @param e
     * @private
     */
    function _onMetricAdded(e) {
        if (_shouldApplyDynamicAbrStrategy()
            && e.metric === MetricsConstants.BUFFER_LEVEL
            && (e.mediaType === Constants.AUDIO || e.mediaType === Constants.VIDEO)) {
            _updateDynamicAbrStrategy(e.mediaType, 0.001 * e.value.level);
        }
    }

    /**
     * Returns the initial bitrate for a specific media type
     * @param {string} type
     * @returns {number} A value of the initial bitrate, kbps
     * @memberof AbrController#
     */
    function getInitialBitrateFor(type) {
        let configBitrate = mediaPlayerModel.getAbrBitrateParameter('initialBitrate', type);
        if (configBitrate > 0) {
            return configBitrate;
        }

        let savedBitrate = NaN;
        if (domStorage && domStorage.hasOwnProperty('getSavedBitrateSettings')) {
            savedBitrate = domStorage.getSavedBitrateSettings(type);
        }
        if (!isNaN(savedBitrate)) {
            return savedBitrate
        }

        const averageThroughput = throughputController.getAverageThroughput(type);
        if (!isNaN(averageThroughput) && averageThroughput > 0) {
            return averageThroughput
        }

        return (type === Constants.VIDEO) ? DEFAULT_VIDEO_BITRATE : DEFAULT_BITRATE;
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
                    droppedFramesHistory.push(streamId, playbackRepresentationId, playbackQuality);
                }
            }

            // ABR is turned off, do nothing
            if (!settings.get().streaming.abr.autoSwitchBitrate[type]) {
                return false;
            }

            const streamProcessor = streamProcessorDict[streamId][type];
            const currentRepresentation = streamProcessor.getRepresentation();
            const rulesContext = RulesContext(context).create({
                abrController: instance,
                throughputController,
                switchHistory: switchHistoryDict[streamId][type],
                droppedFramesHistory,
                streamProcessor,
                videoModel
            });
            const switchRequest = abrRulesCollection.getBestPossibleSwitchRequest(rulesContext);

            if (!switchRequest || !switchRequest.representation) {
                return false;
            }

            let newRepresentation = switchRequest.representation;

            if (newRepresentation.id !== currentRepresentation.id && (abandonmentStateDict[streamId][type].state === MetricsConstants.ALLOW_LOAD || newRepresentation.bitrateInKbit < currentRepresentation.bitrateInKbit)) {
                switchHistoryDict[streamId][type].push({
                    oldValue: currentRepresentation,
                    newValue: newRepresentation
                });
                _changeQuality(streamId, type, currentRepresentation, newRepresentation, switchRequest.reason);
                return true;
            }

            return false;
        } catch (e) {
            return false;
        }

    }

    /**
     * Sets the new playback quality. Starts from index 0.
     * If the index of the new quality is the same as the old one changeQuality will not be called.
     * @param {string} type
     * @param {object} streamInfo
     * @param {Representation} representation
     * @param {string} reason
     */
    function setPlaybackQuality(type, streamInfo, representation, reason = null) {
        if (!streamInfo || !streamInfo.id || !type || !streamProcessorDict || !streamProcessorDict[streamInfo.id] || !streamProcessorDict[streamInfo.id][type]) {
            return;
        }

        const streamProcessor = streamProcessorDict[streamInfo.id][type];
        const streamId = streamInfo.id;
        const currentRepresentation = streamProcessor.getRepresentation();


        if (!currentRepresentation || representation.id !== currentRepresentation.id) {
            _changeQuality(streamId, type, currentRepresentation, representation, reason,);
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
     * @param {string} streamId
     * @param {string} type
     * @param {Representation} oldRepresentation
     * @param {Representation} newRepresentation
     * @param {string} reason
     * @private
     */
    function _changeQuality(streamId, type, oldRepresentation, newRepresentation, reason) {
        if (type && streamProcessorDict[streamId] && streamProcessorDict[streamId][type]) {
            const streamInfo = streamProcessorDict[streamId][type].getStreamInfo();
            const bufferLevel = dashMetrics.getCurrentBufferLevel(type);
            const isAdaptationSetSwitch = oldRepresentation !== null && !adapter.areMediaInfosEqual(oldRepresentation.mediaInfo, newRepresentation.mediaInfo);
            logger.info('Stream ID: ' + streamId + ' [' + type + '] switch from bitrate' + oldRepresentation.bitrateInKbit + ' to bitrate' + newRepresentation.bitrateInKbit + ' (buffer: ' + bufferLevel + ') ' + (reason ? JSON.stringify(reason) : '.'));
            eventBus.trigger(Events.QUALITY_CHANGE_REQUESTED,
                {
                    oldRepresentation: oldRepresentation,
                    newRepresentation: newRepresentation,
                    reason,
                    streamInfo,
                    mediaType: type,
                    isAdaptationSetSwitch
                },
                { streamId: streamInfo.id, mediaType: type }
            );
            const bitrate = throughputController.getAverageThroughput(type);
            if (!isNaN(bitrate)) {
                domStorage.setSavedBitrateSettings(type, bitrate);
            }
        }
    }


    /**
     * If both BOLA and Throughput Rule are active we switch dynamically between both of them
     * @returns {boolean}
     * @private
     */
    function _shouldApplyDynamicAbrStrategy() {
        return settings.get().streaming.abr.activeRules.bolaRule && settings.get().streaming.abr.activeRules.throughputRule
    }

    function _updateDynamicAbrStrategy(mediaType, bufferLevel) {
        try {
            const bufferTimeDefault = mediaPlayerModel.getBufferTimeDefault();
            const switchOnThreshold = bufferTimeDefault;
            const switchOffThreshold = 0.5 * bufferTimeDefault;

            const useBufferABR = abrRulesCollection.getBolaState(mediaType)
            const newUseBufferABR = bufferLevel > (useBufferABR ? switchOffThreshold : switchOnThreshold); // use hysteresis to avoid oscillating rules
            abrRulesCollection.setBolaState(mediaType, newUseBufferABR);

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

    function isPlayingAtTopQuality(representation) {
        const voRepresentations = getPossibleVoRepresentations(representation.mediaInfo, true, true);

        return voRepresentations[voRepresentations.length - 1].id === representation.id;
    }

    function setWindowResizeEventCalled(value) {
        windowResizeEventCalled = value;
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
        getAbandonmentStateFor,
        getInitialBitrateFor,
        getOptimalRepresentationForBitrate,
        getPossibleVoRepresentations,
        initialize,
        isPlayingAtTopQuality,
        registerStreamType,
        reset,
        setConfig,
        setPlaybackQuality,
        setWindowResizeEventCalled,
        unRegisterStreamType,
    };

    setup();

    return instance;
}

AbrController.__dashjs_factory_name = 'AbrController';
const factory = FactoryMaker.getSingletonFactory(AbrController);
FactoryMaker.updateSingletonFactory(AbrController.__dashjs_factory_name, factory);
export default factory;
