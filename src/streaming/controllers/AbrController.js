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
        capabilities,
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
        switchRequestHistory,
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
        switchRequestHistory = SwitchRequestHistory(context).create();
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
        streamProcessorDict[streamId][type] = streamProcessor;

        if (!abandonmentStateDict[streamId]) {
            abandonmentStateDict[streamId] = {};
        }
        abandonmentStateDict[streamId][type] = {};
        abandonmentStateDict[streamId][type].state = MetricsConstants.ALLOW_LOAD;

        // Do not change current value if it has been set before
        const currentState = abrRulesCollection.getBolaState(type)
        if (currentState === undefined) {
            abrRulesCollection.setBolaState(type, settings.get().streaming.abr.rules.bolaRule.active && !_shouldApplyDynamicAbrStrategy());
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

            if (abandonmentStateDict[streamId] && abandonmentStateDict[streamId][type]) {
                delete abandonmentStateDict[streamId][type];
            }

        } catch (e) {

        }
    }

    function resetInitialSettings() {
        abandonmentStateDict = {};
        streamProcessorDict = {};

        if (windowResizeEventCalled === undefined) {
            windowResizeEventCalled = false;
        }
        if (droppedFramesHistory) {
            droppedFramesHistory.reset();
        }

        if (switchRequestHistory) {
            switchRequestHistory.reset();
        }

        playbackRepresentationId = undefined;
        droppedFramesHistory = undefined;
        switchRequestHistory = undefined;
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
        if (!config) {
            return;
        }

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
        if (config.capabilities) {
            capabilities = config.capabilities;
        }
    }

    function getOptimalRepresentationForBitrate(mediaInfo, bitrateInKbit, includeCompatibleMediaInfos = true) {
        const possibleVoRepresentations = getPossibleVoRepresentationsFilteredBySettings(mediaInfo, includeCompatibleMediaInfos);

        if (!possibleVoRepresentations || possibleVoRepresentations.length === 0) {
            return null;
        }

        // If bitrate should be as small as possible return the Representation with the lowest bitrate
        const smallestRepresentation = possibleVoRepresentations.reduce((a, b) => {
            return a.bandwidth < b.bandwidth ? a : b;
        })
        if (bitrateInKbit <= 0) {
            return smallestRepresentation
        }

        // Get all Representations that have lower or equal bitrate than our target bitrate
        const targetRepresentations = possibleVoRepresentations.filter((rep) => {
            return rep.bitrateInKbit <= bitrateInKbit
        });

        if (!targetRepresentations || targetRepresentations.length === 0) {
            return smallestRepresentation
        }

        return targetRepresentations.reduce((max, curr) => {
            return (curr.absoluteIndex > max.absoluteIndex) ? curr : max;
        })

    }

    function getRepresentationByAbsoluteIndex(absoluteIndex, mediaInfo, includeCompatibleMediaInfos = true) {
        if (isNaN(absoluteIndex) || absoluteIndex < 0) {
            return null;
        }

        const possibleVoRepresentations = getPossibleVoRepresentationsFilteredBySettings(mediaInfo, includeCompatibleMediaInfos);

        return possibleVoRepresentations.find((rep) => {
            return rep.absoluteIndex === absoluteIndex
        })
    }

    function getPossibleVoRepresentations(mediaInfo, includeCompatibleMediaInfos = true) {
        return _getPossibleVoRepresentations(mediaInfo, includeCompatibleMediaInfos)
    }

    function getPossibleVoRepresentationsFilteredBySettings(mediaInfo, includeCompatibleMediaInfos = true) {
        let voRepresentations = _getPossibleVoRepresentations(mediaInfo, includeCompatibleMediaInfos);

        // Filter the list of options based on the provided settings
        voRepresentations = _filterByAllowedSettings(voRepresentations)

        return voRepresentations;
    }

    function _getPossibleVoRepresentations(mediaInfo, includeCompatibleMediaInfos) {
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
        // Resolve dependencies
        voRepresentations = _resolveDependencies(voRepresentations);

        // Now sort by quality (usually simply by bitrate)
        voRepresentations = _sortRepresentationsByQuality(voRepresentations);

        // Add an absolute index
        voRepresentations.forEach((rep, index) => {
            rep.absoluteIndex = index
        })

        // Filter the Representations in case we do not want to include compatible Media Infos
        // We can not apply the filter before otherwise the absolute index would be wrong
        // Also ignore Representations with a key ID that is not usable

        voRepresentations = voRepresentations.filter((representation) => {
            const isMediaInfoAllowed = includeCompatibleMediaInfos ? true : adapter.areMediaInfosEqual(representation.mediaInfo, mediaInfo);
            const areKeyIdsUsable =
                representation && representation.mediaInfo ? capabilities.areKeyIdsUsable(representation.mediaInfo) : true;
            return isMediaInfoAllowed && areKeyIdsUsable
        })

        return voRepresentations
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
                const representationBitrate = voRepresentation.bitrateInKbit;
                const maxBitrate = mediaPlayerModel.getAbrBitrateParameter('maxBitrate', type);
                const minBitrate = mediaPlayerModel.getAbrBitrateParameter('minBitrate', type);

                if (maxBitrate > -1 && representationBitrate > maxBitrate) {
                    return false;
                }

                return !(minBitrate > -1 && representationBitrate < minBitrate);
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

    function _sortRepresentationsByQuality(voRepresentations) {
        if (_shouldSortByQualityRankingAttribute(voRepresentations)) {
            voRepresentations = _sortByQualityRankingAttribute(voRepresentations)
        } else {
            voRepresentations = _sortByDefaultParameters(voRepresentations)
        }

        return voRepresentations
    }

    function _shouldSortByQualityRankingAttribute(voRepresentations) {
        let firstMediaInfo = null;
        const filteredRepresentations = voRepresentations.filter((rep) => {
            if (!firstMediaInfo) {
                firstMediaInfo = rep.mediaInfo;
            }
            return !isNaN(rep.qualityRanking) && adapter.areMediaInfosEqual(firstMediaInfo, rep.mediaInfo);
        })

        return filteredRepresentations.length === voRepresentations.length
    }

    function _sortByQualityRankingAttribute(voRepresentations) {
        voRepresentations.sort((a, b) => {
            return b.qualityRanking - a.qualityRanking;
        })

        return voRepresentations
    }


    function _sortByDefaultParameters(voRepresentations) {
        voRepresentations.sort((a, b) => {

            // In case both Representations are coming from the same MediaInfo then choose the one with the highest resolution and highest bitrate
            if (adapter.areMediaInfosEqual(a.mediaInfo, b.mediaInfo)) {
                if (!isNaN(a.pixelsPerSecond) && !isNaN(b.pixelsPerSecond) && a.pixelsPerSecond !== b.pixelsPerSecond) {
                    return a.pixelsPerSecond - b.pixelsPerSecond
                } else {
                    return a.bandwidth - b.bandwidth
                }
            }

            // In case the Representations are coming from different MediaInfos they might have different codecs. The bandwidth is not a good indicator, use bits per pixel instead
            else {
                if (!isNaN(a.pixelsPerSecond) && !isNaN(b.pixelsPerSecond) && a.pixelsPerSecond !== b.pixelsPerSecond) {
                    return a.pixelsPerSecond - b.pixelsPerSecond
                } else if (!isNaN(a.bitsPerPixel) && !isNaN(b.bitsPerPixel)) {
                    return b.bitsPerPixel - a.bitsPerPixel
                } else {
                    return a.bandwidth - b.bandwidth
                }
            }
        })

        return voRepresentations
    }


    function _resolveDependencies(voRepresentations) {
        voRepresentations.forEach(rep => {
            if (rep.dependentRepresentation && rep.dependentRepresentation.mediaInfo === null) {
                let dependentId = rep.dependentRepresentation.id;
                let dependentRep = voRepresentations.find((element) => element.id === dependentId);
                if (dependentRep) {
                    rep.dependentRepresentation = dependentRep;
                }
            }
        });
        return voRepresentations;
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
            adapter,
            videoModel
        });
        const switchRequest = abrRulesCollection.shouldAbandonFragment(rulesContext);

        if (switchRequest && switchRequest.representation !== SwitchRequest.NO_CHANGE) {
            _onSegmentDownloadShouldBeAbandoned(e, streamId, type, streamProcessor, switchRequest);
        }
    }

    function _onSegmentDownloadShouldBeAbandoned(e, streamId, type, streamProcessor, switchRequest) {
        const fragmentModel = streamProcessor.getFragmentModel();
        const request = fragmentModel.getRequests({
            state: FragmentModel.FRAGMENT_MODEL_LOADING,
            index: e.request.index
        })[0];
        if (request) {
            const targetAbandonmentStateDict = _getAbandonmentStateDictFor(streamId, type);

            if (targetAbandonmentStateDict) {
                targetAbandonmentStateDict.state = MetricsConstants.ABANDON_LOAD;
            }
            switchRequestHistory.reset();
            setPlaybackQuality(type, streamController.getActiveStreamInfo(), switchRequest.representation, switchRequest.reason);

            clearTimeout(abandonmentTimeout);
            abandonmentTimeout = setTimeout(
                () => {
                    if (targetAbandonmentStateDict) {
                        abandonmentStateDict[streamId][type].state = MetricsConstants.ALLOW_LOAD;
                    }
                    abandonmentTimeout = null;
                },
                settings.get().streaming.abandonLoadTimeout
            );
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

        if (type === Constants.TEXT) {
            return NaN;
        }

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

            if (!settings.get().streaming.abr.autoSwitchBitrate[type]) {
                return false;
            }

            const streamProcessor = streamProcessorDict[streamId][type];
            const currentRepresentation = streamProcessor.getAbrRepresentation();
            const rulesContext = RulesContext(context).create({
                abrController: instance,
                throughputController,
                switchRequestHistory,
                droppedFramesHistory,
                streamProcessor,
                adapter,
                videoModel
            });
            const switchRequest = abrRulesCollection.getBestPossibleSwitchRequest(rulesContext);

            if (!switchRequest || !switchRequest.representation) {
                return false;
            }

            let newRepresentation = switchRequest.representation;
            switchRequestHistory.push({
                currentRepresentation,
                newRepresentation
            });

            if (newRepresentation.id !== currentRepresentation.id && (abandonmentStateDict[streamId][type].state === MetricsConstants.ALLOW_LOAD || newRepresentation.absoluteIndex < currentRepresentation.absoluteIndex)) {
                _changeQuality(type, currentRepresentation, newRepresentation, switchRequest.reason);
                return true;
            }

            return false;
        } catch (e) {
            logger.error(e);
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
     * @param {string} rule
     */
    function setPlaybackQuality(type, streamInfo, representation, reason = {}) {
        if (!streamInfo || !streamInfo.id || !type || !streamProcessorDict || !streamProcessorDict[streamInfo.id] || !streamProcessorDict[streamInfo.id][type] || !representation) {
            return;
        }

        const streamProcessor = streamProcessorDict[streamInfo.id][type];
        const currentRepresentation = streamProcessor.getAbrRepresentation();


        if (!currentRepresentation || representation.id !== currentRepresentation.id) {
            _changeQuality(type, currentRepresentation, representation, reason);
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

    function _getAbandonmentStateDictFor(streamId, type) {
        return abandonmentStateDict[streamId] && abandonmentStateDict[streamId][type] ? abandonmentStateDict[streamId][type] : null;

    }


    /**
     * Changes the internal qualityDict values according to the new quality
     * @param {Representation} oldRepresentation
     * @param {Representation} newRepresentation
     * @param {string} reason
     * @private
     */
    function _changeQuality(type, oldRepresentation, newRepresentation, reason) {
        const streamId = newRepresentation.mediaInfo.streamInfo.id;
        if (type && streamProcessorDict[streamId] && streamProcessorDict[streamId][type]) {
            const streamInfo = streamProcessorDict[streamId][type].getStreamInfo();
            const bufferLevel = dashMetrics.getCurrentBufferLevel(type);
            const isAdaptationSetSwitch = oldRepresentation !== null && !adapter.areMediaInfosEqual(oldRepresentation.mediaInfo, newRepresentation.mediaInfo);

            const oldBitrate = oldRepresentation ? oldRepresentation.bitrateInKbit : 0;
            logger.info(`[AbrController]: Switching quality in period ${streamId} for media type ${type}. Switch from bitrate ${oldBitrate} to bitrate ${newRepresentation.bitrateInKbit}. Current buffer level: ${bufferLevel}. Reason:` + (reason ? JSON.stringify(reason) : '/'));

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
        return settings.get().streaming.abr.rules.bolaRule.active && settings.get().streaming.abr.rules.throughputRule.active
    }

    /**
     * Switch between BOLA and ThroughputRule
     * @param mediaType
     * @param bufferLevel
     * @private
     */
    function _updateDynamicAbrStrategy(mediaType, bufferLevel) {
        try {
            const bufferTimeDefault = mediaPlayerModel.getBufferTimeDefault();
            const switchOnThreshold = bufferTimeDefault;
            const switchOffThreshold = 0.5 * bufferTimeDefault;

            const isUsingBolaRule = abrRulesCollection.getBolaState(mediaType)
            const shouldUseBolaRule = bufferLevel >= (isUsingBolaRule ? switchOffThreshold : switchOnThreshold); // use hysteresis to avoid oscillating rules
            abrRulesCollection.setBolaState(mediaType, shouldUseBolaRule);

            if (shouldUseBolaRule !== isUsingBolaRule) {
                if (shouldUseBolaRule) {
                    logger.info('[' + mediaType + '] switching from throughput to buffer occupancy ABR rule (buffer: ' + bufferLevel.toFixed(3) + ').');
                } else {
                    logger.info('[' + mediaType + '] switching from buffer occupancy to throughput ABR rule (buffer: ' + bufferLevel.toFixed(3) + ').');
                }
            }
        } catch (e) {
            logger.error(e);
        }
    }

    /**
     * Checks if the provided Representation has the lowest possible quality
     * @param representation
     * @returns {boolean}
     */
    function isPlayingAtLowestQuality(representation) {
        const voRepresentations = getPossibleVoRepresentationsFilteredBySettings(representation.mediaInfo, true);

        return voRepresentations[0].id === representation.id
    }

    /**
     * Checks if the provided Representation has the highest possible quality
     * @param representation
     * @returns {boolean}
     */
    function isPlayingAtTopQuality(representation) {
        if (!representation) {
            return true;
        }
        const voRepresentations = getPossibleVoRepresentationsFilteredBySettings(representation.mediaInfo, true);

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
        if (switchRequestHistory) {
            switchRequestHistory.clearForStream(streamId);
        }
        if (abandonmentStateDict[streamId]) {
            delete abandonmentStateDict[streamId];
        }

        abrRulesCollection.clearDataForStream(streamId);
    }

    function handleNewMediaInfo(newMediaInfo) {
        abrRulesCollection.handleNewMediaInfo(newMediaInfo);
    }


    instance = {
        checkPlaybackQuality,
        clearDataForStream,
        getAbandonmentStateFor,
        getInitialBitrateFor,
        getOptimalRepresentationForBitrate,
        getPossibleVoRepresentations,
        getPossibleVoRepresentationsFilteredBySettings,
        getRepresentationByAbsoluteIndex,
        handleNewMediaInfo,
        initialize,
        isPlayingAtLowestQuality,
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
