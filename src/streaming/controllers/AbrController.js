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
import SegmentSequenceProperties from '../../dash/vo/SegmentSequenceProperties.js';

const DEFAULT_VIDEO_BITRATE = 1000;
const DEFAULT_BITRATE = 100;
// SAP types 1 and 2 are closed GOP random access points, a client can start decoding there and switch into them coming
// from any Representation (SegmentSequenceProperties.isRandomAccessSapType). SAP type 7 signals a switching frame, for
// instance an AV1 S-Frame, which is only decodable when switching from another Representation of the same switching
// set.
const S_FRAME_SAP_TYPE = 7;
// AV1 scaled reference limits (AV1 spec 7.9, motion vector scaling): a reference frame may be at most 2x larger and at
// most 16x smaller than the frame that references it, per dimension. An S-Frame references frames of the Representation
// we are switching away from.
const S_FRAME_MAX_DOWNSCALE_FACTOR = 2;
const S_FRAME_MAX_UPSCALE_FACTOR = 16;

function AbrController() {

    const context = this.context;
    const debug = Debug(context).getInstance();
    const eventBus = EventBus(context).getInstance();

    let abandonmentStateDict,
        abandonmentTimeout,
        abrRulesCollection,
        adapter,
        capabilities,
        cmsdModel,
        currentRepresentationId,
        customParametersModel,
        dashMetrics,
        domStorage,
        droppedFramesHistory,
        excludedRepresentationIds,
        instance,
        logger,
        mediaPlayerModel,
        queuedManualQualitySwitches,
        segmentSequenceSwitchStateDict,
        settings,
        streamController,
        streamProcessorDict,
        switchRequestHistory,
        throughputController,
        videoModel

    function setup() {
        logger = debug.getLogger(instance);
        resetInitialSettings();
    }

    /**
     * Initialize everything that is not period specific. We only have one instance of the ABR Controller for all
     * periods.
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
        eventBus.on(Events.VIDEO_ELEMENT_RESIZED, _onVideoElementResized, instance);
    }

    /**
     * Whenever a StreamProcessor is created it is added to the list of streamProcessorDict<br>
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

        if (!segmentSequenceSwitchStateDict[streamId]) {
            segmentSequenceSwitchStateDict[streamId] = {};
        }
        segmentSequenceSwitchStateDict[streamId][type] = _createSegmentSequenceSwitchState(NaN);

        // Do not change current value if it has been set before
        const currentState = abrRulesCollection.getBolaState(type)
        if (currentState === undefined) {
            abrRulesCollection.setBolaState(
                type,
                settings.get().streaming.abr.rules.bolaRule.active && !_shouldApplyDynamicAbrStrategy()
            );
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

            if (segmentSequenceSwitchStateDict[streamId] && segmentSequenceSwitchStateDict[streamId][type]) {
                delete segmentSequenceSwitchStateDict[streamId][type];
            }

        } catch (e) {

        }
    }

    function resetInitialSettings() {
        abandonmentStateDict = {};
        excludedRepresentationIds = {};
        segmentSequenceSwitchStateDict = {};
        streamProcessorDict = {};
        queuedManualQualitySwitches = new Map();

        if (droppedFramesHistory) {
            droppedFramesHistory.reset();
        }

        if (switchRequestHistory) {
            switchRequestHistory.reset();
        }

        currentRepresentationId = undefined;
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
        eventBus.off(Events.VIDEO_ELEMENT_RESIZED, _onVideoElementResized, instance);

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
        const possibleVoRepresentations =
            getPossibleVoRepresentationsFilteredBySettings(mediaInfo, includeCompatibleMediaInfos);

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

        const possibleVoRepresentations =
            getPossibleVoRepresentationsFilteredBySettings(mediaInfo, includeCompatibleMediaInfos);

        return possibleVoRepresentations.find((rep) => {
            return rep.absoluteIndex === absoluteIndex
        })
    }

    function getPossibleVoRepresentations(mediaInfo, includeCompatibleMediaInfos = true) {
        return _getPossibleVoRepresentations(mediaInfo, includeCompatibleMediaInfos)
    }

    /**
     * @param {MediaInfo} mediaInfo
     * @param {boolean} includeCompatibleMediaInfos
     * @param {boolean} includeBootstrapRepresentations - Bootstrap Representations are no quality option for the ABR
     * logic. The public API lists them, as playback starts with them.
     * @return {Representation[]}
     */
    function getPossibleVoRepresentationsFilteredBySettings(mediaInfo, includeCompatibleMediaInfos = true,
        includeBootstrapRepresentations = false) {
        let voRepresentations = _getPossibleVoRepresentations(mediaInfo, includeCompatibleMediaInfos);

        // Drop excluded Representations first, so the settings filters fall back to the remaining ones
        voRepresentations = _filterExcluded(voRepresentations);

        // Filter the list of options based on the provided settings
        voRepresentations = _filterByAllowedSettings(voRepresentations, includeBootstrapRepresentations)

        return voRepresentations;
    }

    function _isExcluded(rep) {
        // An unresolved dependentRepresentation is a placeholder without mediaInfo
        const excludedUntil =
            excludedRepresentationIds[rep.mediaInfo?.streamInfo?.id]?.[rep.mediaInfo?.type]?.get(rep.id);
        return excludedUntil !== undefined && Date.now() < excludedUntil;
    }

    function _filterExcluded(voRepresentations) {
        // A Representation is not playable either if the one it depends on (e.g. its base layer) is excluded
        const filteredRepresentations = voRepresentations.filter((rep) =>
            !_isExcluded(rep) && !(rep.dependentRepresentation && _isExcluded(rep.dependentRepresentation)));

        // Like the settings filters, never return an empty list
        if (filteredRepresentations.length === 0) {
            return voRepresentations;
        }

        return filteredRepresentations;
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

        // Bootstrap Representations are no ABR candidates (_filterOutBootstrapRepresentations). List them last, so the
        // absolute index of the candidates matches their position in the filtered list. Rules like BOLA and L2A rely on
        // that.
        voRepresentations = _moveBootstrapRepresentationsToTheEnd(voRepresentations);

        // Add an absolute index
        voRepresentations.forEach((rep, index) => {
            rep.absoluteIndex = index
        })

        // Filter the Representations in case we do not want to include compatible Media Infos
        // We can not apply the filter before otherwise the absolute index would be wrong
        // Also ignore Representations with a key ID that is not usable

        voRepresentations = voRepresentations.filter((representation) => {
            const isMediaInfoAllowed =
                includeCompatibleMediaInfos ? true : adapter.areMediaInfosEqual(representation.mediaInfo, mediaInfo);
            const areKeyIdsUsable =
                representation && representation.mediaInfo ?
                    capabilities.areKeyIdsUsable(representation.mediaInfo) : true;
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
    function _filterByAllowedSettings(voRepresentations, includeBootstrapRepresentations = false) {
        try {
            voRepresentations = _filterByPossibleBitrate(voRepresentations);
            voRepresentations = _filterByPortalSize(voRepresentations);
            voRepresentations = _filterByCmsdMaxBitrate(voRepresentations);
            if (!includeBootstrapRepresentations) {
                voRepresentations = _filterOutBootstrapRepresentations(voRepresentations);
            }

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
            const minimum = (settings.get().streaming.abr.limitBitrateByPortalMinimum * 1000) || 0;

            const { elementWidth } = videoModel.getVideoElementSize();

            const filteredArray = voRepresentations.filter((voRepresentation) => {
                return voRepresentation.mediaInfo.type !== Constants.VIDEO ||
                    voRepresentation.width <= elementWidth ||
                    voRepresentation.bandwidth <= minimum;
            });

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
     * Bootstrap Representations only exist for tune-in, they are not a quality option during playback. Their bitrate is
     * inflated by the IDR at every partial segment, so without this filter the ABR rules would happily switch into
     * them.
     * If every candidate is a bootstrap Representation (startup inside the bootstrap AdaptationSet) the list is
     * returned unchanged.
     * @param {Representation[]} voRepresentations
     * @return {Representation[]}
     * @private
     */
    function _filterOutBootstrapRepresentations(voRepresentations) {
        const filteredArray = voRepresentations.filter((voRepresentation) => {
            return !voRepresentation.isBootstrapRepresentation || !voRepresentation.isBootstrapRepresentation();
        });

        return filteredArray.length > 0 ? filteredArray : voRepresentations;
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
            if (adapter.areMediaInfosEqual(a.mediaInfo, b.mediaInfo)) {
                return _sortForSameMediaInfos(a, b);
            }
            return _sortForDifferentMediaInfos(a, b);
        });

        return voRepresentations
    }

    function _sortForSameMediaInfos(a, b) {
        return _sortForSameCodecs(a, b);
    }

    function _sortForSameCodecs(a, b) {
        if (!isNaN(a.pixelsPerSecond) && !isNaN(b.pixelsPerSecond) && a.pixelsPerSecond !== b.pixelsPerSecond) {
            return a.pixelsPerSecond - b.pixelsPerSecond;
        }

        const bwDiff = a.bandwidth - b.bandwidth;
        if (bwDiff !== 0) {
            return bwDiff;
        }

        return _sortBySegmentSequenceProperties(a, b);
    }

    function _sortForDifferentMediaInfos(a, b) {
        // if the codec family is the same we can sort by pixelsPerSecond. Bootstrap Representations (L3D-DASH) are
        // moved to the end afterwards, see _moveBootstrapRepresentationsToTheEnd
        if (a.codecFamily && b.codecFamily && a.codecFamily === b.codecFamily) {
            return _sortForSameCodecs(a, b);
        }

        if (!isNaN(a.pixelsPerSecond) && !isNaN(b.pixelsPerSecond) && a.pixelsPerSecond !== b.pixelsPerSecond) {
            return a.pixelsPerSecond - b.pixelsPerSecond;
        }

        if (!isNaN(a.bitsPerPixel) && !isNaN(b.bitsPerPixel) && a.bitsPerPixel !== b.bitsPerPixel) {
            return b.bitsPerPixel - a.bitsPerPixel;
        }

        const bwDiff = a.bandwidth - b.bandwidth;
        if (bwDiff !== 0) {
            return bwDiff;
        }

        return _sortBySegmentSequenceProperties(a, b);
    }

    function _isBootstrapRepresentation(representation) {
        return !!(representation.isBootstrapRepresentation && representation.isBootstrapRepresentation());
    }

    function _moveBootstrapRepresentationsToTheEnd(voRepresentations) {
        return voRepresentations.filter((representation) => !_isBootstrapRepresentation(representation))
            .concat(voRepresentations.filter((representation) => _isBootstrapRepresentation(representation)));
    }

    function _sortBySegmentSequenceProperties(a, b) {
        return b.k - a.k;
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

        if (!type || !streamId || !streamProcessorDict[streamId] ||
            !settings.get().streaming.abr.autoSwitchBitrate[type]) {
            return;
        }

        const streamProcessor = streamProcessorDict[streamId][type];
        if (!streamProcessor) {
            return;
        }

        const lastSegment = streamProcessor.getLastSegment();
        const canAbandonRequest = _canAbandonRequest(lastSegment);

        if (!canAbandonRequest) {
            return;
        }

        const rulesContext = _createRulesContext(streamProcessor, e.request);
        const switchRequest = abrRulesCollection.shouldAbandonFragment(rulesContext);

        if (switchRequest && switchRequest.representation !== SwitchRequest.NO_CHANGE) {
            _onSegmentDownloadShouldBeAbandoned(e, streamId, type, streamProcessor, switchRequest);
        }
    }

    function _onVideoElementResized() {
        if (settings.get().streaming.abr.limitBitrateByPortal) {
            for (const streamId in streamProcessorDict) {
                for (const mediaType in streamProcessorDict[streamId]) {
                    checkPlaybackQuality(mediaType, streamId);
                }
            }
        }
    }

    function _createRulesContext(streamProcessor, currentRequest) {
        return RulesContext(context).create({
            abrController: instance,
            adapter,
            currentRequest,
            droppedFramesHistory,
            streamProcessor,
            switchRequestHistory,
            throughputController,
            videoModel
        });
    }

    function _canAbandonRequest(lastSegment) {
        // For now we only allow abandoning the first partial segment as we are sure there is an IDR at the beginning
        // of the segment
        if (!lastSegment || !lastSegment.isPartialSegment || isNaN(lastSegment.totalNumberOfPartialSegments) ||
            isNaN(lastSegment.replacementSubNumber)) {
            return true
        }
        return lastSegment.replacementSubNumber === 0;
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
            setPlaybackQuality(
                type,
                streamController.getActiveStreamInfo(),
                switchRequest.representation,
                switchRequest.reason
            );

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
            _addDroppedFramesHistoryEntry(e.streamId);
            currentRepresentationId = e.newRepresentation.id;
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
     * Excludes a Representation from quality decisions, e.g. because its segment list could not be loaded,
     * and switches to the best remaining Representation at or below its bitrate.
     * @param {object} representation
     * @param {number} [duration] in milliseconds, excluded for good if not set
     */
    function excludeRepresentation(representation, duration = Infinity) {
        const mediaInfo = representation.mediaInfo;
        const streamId = mediaInfo.streamInfo.id;
        // Content often reuses Representation ids across media types, keep them apart
        excludedRepresentationIds[streamId] = excludedRepresentationIds[streamId] || {};
        excludedRepresentationIds[streamId][mediaInfo.type] =
            excludedRepresentationIds[streamId][mediaInfo.type] || new Map();
        excludedRepresentationIds[streamId][mediaInfo.type].set(representation.id, Date.now() + duration);

        // Rules like BOLA cache the list of possible Representations, make them rebuild it without the excluded one.
        // ponytail: BOLA only picks the Representation up again once the exclusion expired and its list is rebuilt
        // for another reason
        handleNewMediaInfo(mediaInfo);

        // A late failure must not override a newer selection, only switch away if we are still on (or depend on) the
        // excluded one
        const currentRepresentation = streamProcessorDict[streamId]?.[mediaInfo.type]
            ?.getRepresentationController()
            ?.getCurrentCompositeRepresentation();
        if (!currentRepresentation ||
            (currentRepresentation.id !== representation.id &&
                currentRepresentation.dependentRepresentation?.id !== representation.id)) {
            logger.warn(`Excluded representation ${representation.id} for ${mediaInfo.type}`);
            return;
        }

        const fallbackRepresentation = getOptimalRepresentationForBitrate(mediaInfo, representation.bitrateInKbit);
        if (!fallbackRepresentation || fallbackRepresentation.id === representation.id) {
            logger.error(`Excluded representation ${representation.id} for ${mediaInfo.type}, no other representation left to switch to`);
            return;
        }
        logger.warn(`Excluded representation ${representation.id} for ${mediaInfo.type}, switching to representation ${fallbackRepresentation.id}`);
        _switchAwayFromExcludedRepresentation(mediaInfo, currentRepresentation, fallbackRepresentation, {
            message: `[AbrController]: Representation ${representation.id} is excluded`
        });
    }

    /**
     * In partial segment streams the fallback might not be enterable at the next partial segment, e.g. because it is
     * below the S-Frame downscale limit. Hop towards it like a manual switch. If not even a hop is possible, replace
     * the buffer, loading then restarts at a random access point of the fallback.
     * @private
     */
    function _switchAwayFromExcludedRepresentation(mediaInfo, currentRepresentation, fallbackRepresentation, reason) {
        const type = mediaInfo.type;
        const streamInfo = mediaInfo.streamInfo;
        const lastSegment = streamProcessorDict[streamInfo.id][type].getLastSegment();
        const reachableRepresentation = _isWaitingForPartialSegmentOfRepresentation(lastSegment, currentRepresentation)
            ? null
            : _getReachableRepresentationTowards(lastSegment, currentRepresentation, fallbackRepresentation);

        if (!reachableRepresentation) {
            const replaceReason = Object.assign({}, reason, { forceReplace: true });
            setPlaybackQuality(type, streamInfo, fallbackRepresentation, replaceReason);
            return;
        }

        if (reachableRepresentation.id !== fallbackRepresentation.id) {
            _queueManualQualitySwitch(type, streamInfo, fallbackRepresentation, reason);
        }
        setPlaybackQuality(type, streamInfo, reachableRepresentation, reason);
    }

    /**
     * This function is called by the scheduleControllers to check if the quality should be changed.<br>
     * Consider this the main entry point for the ABR decision logic
     * @param {string} type
     * @param {string} streamId
     */
    function checkPlaybackQuality(type, streamId) {
        try {
            if (!type || !streamProcessorDict || !streamProcessorDict[streamId] ||
                !streamProcessorDict[streamId][type]) {
                return false;
            }

            _addDroppedFramesHistoryEntry(streamId)

            const streamProcessor = streamProcessorDict[streamId][type];
            const lastSegment = streamProcessor.getLastSegment();
            const currentRepresentation =
                streamProcessor.getRepresentationController()?.getCurrentCompositeRepresentation();

            // Leaving a bootstrap Representation is a startup transition and not a quality decision, it is applied
            // independently of the ABR rules and independently of whether ABR is enabled at all.
            const bootstrapExitRepresentation = _getBootstrapExitRepresentation(lastSegment, currentRepresentation);
            if (bootstrapExitRepresentation) {
                logger.debug(`Leaving bootstrap Representation ${currentRepresentation.id} for Representation ${bootstrapExitRepresentation.id} for ${type} at partial segment ${lastSegment.replacementSubNumber}`);
                _addSwitchHistoryEntry(currentRepresentation, bootstrapExitRepresentation);
                _changeQuality(type, currentRepresentation, bootstrapExitRepresentation, { message: '[AbrController]: Leaving the bootstrap Representation at the first possible switch point' });
                return true;
            }

            // The reference frames of an S-Frame come from the last requested partial segment. After a switch they
            // still belong to the previous Representation until a partial segment of the current one has been
            // requested, switching again before would splice against the wrong frames.
            const canSwitchQuality = !_isWaitingForPartialSegmentOfRepresentation(lastSegment, currentRepresentation) &&
                canPerformQualitySwitch(lastSegment, currentRepresentation);

            if (!settings.get().streaming.abr.autoSwitchBitrate[type] || !canSwitchQuality) {
                return false;
            }

            const rulesContext = _createRulesContext(streamProcessor);
            const switchRequest = abrRulesCollection.getBestPossibleSwitchRequest(rulesContext);

            if (!switchRequest || !switchRequest.representation) {
                return false;
            }

            let newRepresentation = switchRequest.representation;
            _addSwitchHistoryEntry(currentRepresentation, newRepresentation);
            if (newRepresentation.id !== currentRepresentation.id &&
                (abandonmentStateDict[streamId][type].state === MetricsConstants.ALLOW_LOAD ||
                    newRepresentation.absoluteIndex < currentRepresentation.absoluteIndex)) {
                // Now that we know the target we can verify that we are allowed to switch into it at this partial
                // segment boundary. If not, hop towards it.
                const reachableRepresentation =
                    _getReachableRepresentationTowards(lastSegment, currentRepresentation, newRepresentation);
                if (!reachableRepresentation) {
                    logger.debug(`Can not switch to Representation ${newRepresentation.id} for ${type} at partial segment ${lastSegment.replacementSubNumber}. Waiting for the next possible switch point.`);
                    return false;
                }
                if (!_isAllowedBySegmentSequenceSwitchingSettings(
                    streamId, type, lastSegment, currentRepresentation, reachableRepresentation
                )) {
                    logger.debug(`Not switching to Representation ${reachableRepresentation.id} for ${type} at partial segment ${lastSegment.replacementSubNumber}. The segment sequence switching settings do not allow another switch in this direction.`);
                    return false;
                }
                if (reachableRepresentation.id !== newRepresentation.id) {
                    logger.debug(`Can not switch to Representation ${newRepresentation.id} for ${type} at partial segment ${lastSegment.replacementSubNumber}. Hopping via Representation ${reachableRepresentation.id}.`);
                }
                _changeQuality(type, currentRepresentation, reachableRepresentation, switchRequest.reason);
                _addSegmentSequenceSwitch(streamId, type, lastSegment, currentRepresentation, reachableRepresentation);
                return true;
            }

            return false;
        } catch (e) {
            logger.error(e);
            return false;
        }
    }

    function _createSegmentSequenceSwitchState(segmentIndex) {
        return { segmentIndex, upSwitchCount: 0, downSwitchCount: 0 };
    }

    /**
     * A switch in the middle of a segment sequence enters the target at a partial segment boundary. Switches at the
     * start of a segment sequence enter at a regular SAP and are not limited.
     * @private
     */
    function _isMidSegmentSequenceSwitch(lastSegment) {
        if (!lastSegment || !lastSegment.isPartialSegment || isNaN(lastSegment.totalNumberOfPartialSegments) ||
            isNaN(lastSegment.replacementSubNumber)) {
            return false;
        }

        return _getNextPartialSubNumber(lastSegment) !== 0;
    }

    /**
     * Returns the switches performed in the segment sequence the next partial segment belongs to. A new segment
     * sequence starts with fresh counters.
     * @private
     */
    function _getSegmentSequenceSwitchState(streamId, type, lastSegment) {
        if (!segmentSequenceSwitchStateDict[streamId]) {
            segmentSequenceSwitchStateDict[streamId] = {};
        }
        const state = segmentSequenceSwitchStateDict[streamId][type];
        if (!state || state.segmentIndex !== lastSegment.index) {
            segmentSequenceSwitchStateDict[streamId][type] = _createSegmentSequenceSwitchState(lastSegment.index);
        }

        return segmentSequenceSwitchStateDict[streamId][type];
    }

    function _isBelowSwitchLimit(switchCount, limit) {
        if (isNaN(limit) || limit < 0) {
            return true;
        }

        return switchCount < limit;
    }

    /**
     * Limits the switches the ABR rules request within one segment sequence, e.g. at most one up-switch and no
     * up-switch after a down-switch.
     * @private
     */
    function _isAllowedBySegmentSequenceSwitchingSettings(
        streamId, type, lastSegment, currentRepresentation, targetRepresentation
    ) {
        if (!_isMidSegmentSequenceSwitch(lastSegment) ||
            targetRepresentation.bandwidth === currentRepresentation.bandwidth) {
            return true;
        }

        const switchingSettings = settings.get().streaming.abr.segmentSequenceSwitching;
        const state = _getSegmentSequenceSwitchState(streamId, type, lastSegment);

        if (targetRepresentation.bandwidth > currentRepresentation.bandwidth) {
            return _isBelowSwitchLimit(state.upSwitchCount, switchingSettings.maxUpSwitchesPerSequence)
                && (switchingSettings.allowUpSwitchAfterDownSwitch || state.downSwitchCount === 0);
        }

        return _isBelowSwitchLimit(state.downSwitchCount, switchingSettings.maxDownSwitchesPerSequence)
            && (switchingSettings.allowDownSwitchAfterUpSwitch || state.upSwitchCount === 0);
    }

    function _addSegmentSequenceSwitch(streamId, type, lastSegment, currentRepresentation, targetRepresentation) {
        if (!_isMidSegmentSequenceSwitch(lastSegment) ||
            targetRepresentation.bandwidth === currentRepresentation.bandwidth) {
            return;
        }

        const state = _getSegmentSequenceSwitchState(streamId, type, lastSegment);
        if (targetRepresentation.bandwidth > currentRepresentation.bandwidth) {
            state.upSwitchCount += 1;
        } else {
            state.downSwitchCount += 1;
        }
    }

    /**
     * When playing Segment Sequence Representations we can not simply switch from one partial segment to another
     * partial segment or another full segment.
     * A switch is only possible if the upcoming partial segment starts with a Stream Access Point that we are allowed
     * to switch into.
     * @param {object} lastSegment
     * @param {Representation} currentRepresentation
     * @param {Representation} [targetRepresentation] - The Representation we want to switch to. If it has not been
     * selected yet only the target agnostic checks are applied.
     * @returns {boolean}
     */
    function canPerformQualitySwitch(lastSegment, currentRepresentation, targetRepresentation = null) {
        if (!lastSegment || !lastSegment.isPartialSegment || isNaN(lastSegment.totalNumberOfPartialSegments) ||
            isNaN(lastSegment.replacementSubNumber)) {
            return true
        }

        // For partial segments we allow switching at the end of a segment sequence
        if (lastSegment.replacementSubNumber === (lastSegment.totalNumberOfPartialSegments - 1)) {
            return true;
        }

        if (!_hasAccessPointAtNextPartialSegment(lastSegment, currentRepresentation)) {
            return false;
        }

        // The ABR rules have not selected a target Representation yet. The target is validated separately once it is
        // known.
        if (!targetRepresentation) {
            return true;
        }

        return _targetAllowsSwitchInAtNextPartialSegment(lastSegment, currentRepresentation, targetRepresentation);
    }

    function _getNextPartialSubNumber(lastSegment) {
        return (lastSegment.replacementSubNumber + 1) % lastSegment.totalNumberOfPartialSegments;
    }

    /**
     * Checks whether a Representation signals a partial segment boundary that lines up with the next partial segment.
     * The cadence applies to the whole switching set, consequently the current Representation is a valid proxy for this
     * check.
     * @private
     */
    function _hasAccessPointAtNextPartialSegment(lastSegment, representation) {
        if (!representation || !representation.segmentSequenceProperties ||
            representation.segmentSequenceProperties.length <= 0) {
            return false;
        }

        const nextPartialSubNumber = _getNextPartialSubNumber(lastSegment);

        return representation.segmentSequenceProperties.some((ssp) => {
            return nextPartialSubNumber % ssp.cadence === 0
        })
    }

    /**
     * The SAP type describes where a Representation can be switched into, consequently it has to be evaluated against
     * the target Representation.
     * SAP type 0 and 1 are closed GOPs, we can splice them in coming from any Representation.
     * SAP type 7 is a switching frame such as an AV1 S-Frame. It is not a random access point: it only decodes
     * correctly when the preceding reference frames come from a Representation of the same switching set.
     * @private
     */
    function _targetAllowsSwitchInAtNextPartialSegment(lastSegment, currentRepresentation, targetRepresentation) {
        if (!targetRepresentation || !targetRepresentation.segmentSequenceProperties ||
            targetRepresentation.segmentSequenceProperties.length <= 0) {
            return false;
        }

        const nextPartialSubNumber = _getNextPartialSubNumber(lastSegment);

        return targetRepresentation.segmentSequenceProperties.some((ssp) => {
            if (isNaN(ssp.sapType) || nextPartialSubNumber % ssp.cadence !== 0) {
                return false;
            }
            if (SegmentSequenceProperties.isRandomAccessSapType(ssp.sapType)) {
                return true;
            }
            return ssp.sapType === S_FRAME_SAP_TYPE &&
                _canSpliceIntoSFrame(currentRepresentation, targetRepresentation);
        })
    }

    /**
     * An S-Frame of the target only decodes correctly if the reference frames of the current Representation are usable:
     * both have to be part of the same switching set, use the same codec family and the resolution change has to stay
     * within the codec's scaled reference limits.
     * @private
     */
    function _canSpliceIntoSFrame(currentRepresentation, targetRepresentation) {
        return _isInSameSwitchingSet(currentRepresentation, targetRepresentation)
            && _isSameCodecFamily(currentRepresentation, targetRepresentation)
            && _isWithinScaledReferenceLimits(currentRepresentation, targetRepresentation);
    }

    /**
     * Linked AdaptationSets may use different codecs. An S-Frame can not reference frames of another codec, and the
     * S-Frame path neither appends an init segment nor calls changeType(). The check is skipped if either
     * Representation does not signal a codec family.
     * @private
     */
    function _isSameCodecFamily(currentRepresentation, targetRepresentation) {
        if (!currentRepresentation.codecFamily || !targetRepresentation.codecFamily) {
            return true;
        }
        return currentRepresentation.codecFamily === targetRepresentation.codecFamily;
    }

    /**
     * The check is skipped if either Representation does not signal its dimensions (audio, or an MPD without
     * width/height).
     * @private
     */
    function _isWithinScaledReferenceLimits(currentRepresentation, targetRepresentation) {
        const dimensions = [
            [currentRepresentation.width, targetRepresentation.width],
            [currentRepresentation.height, targetRepresentation.height]
        ];

        return dimensions.every(([current, target]) => {
            if (isNaN(current) || isNaN(target) || !current || !target) {
                return true;
            }
            return target * S_FRAME_MAX_DOWNSCALE_FACTOR >= current && target <= current * S_FRAME_MAX_UPSCALE_FACTOR;
        });
    }

    /**
     * Two Representations belong to the same switching set if they are part of the same AdaptationSet, or if their
     * AdaptationSets are linked via the adaptation set switching supplemental property.
     * This is the condition for splicing into an S-Frame: the frame is not a random access point, it only decodes
     * correctly when the preceding reference frames come from a Representation of the same switching set. The codecs
     * string is deliberately not compared, Representations of one bitstream switching set legitimately differ in
     * profile and level.
     * @private
     */
    function _isInSameSwitchingSet(currentRepresentation, targetRepresentation) {
        const currentMediaInfo = currentRepresentation ? currentRepresentation.mediaInfo : null;
        const targetMediaInfo = targetRepresentation ? targetRepresentation.mediaInfo : null;

        if (!currentMediaInfo || !targetMediaInfo) {
            return false;
        }

        if (adapter.areMediaInfosEqual(currentMediaInfo, targetMediaInfo)) {
            return true;
        }

        return (currentMediaInfo.adaptationSetSwitchingCompatibleIds || []).includes(targetMediaInfo.id)
            || (targetMediaInfo.adaptationSetSwitchingCompatibleIds || []).includes(currentMediaInfo.id);
    }

    /**
     * Checks whether a quality switch enters the target Representation at an S-Frame.
     * In that case no init segment must be downloaded and appended, as re-initializing the decode pipeline would break
     * the decoding of the S-Frame, which references frames of the Representation we are switching away from.
     * @private
     */
    function _entersTargetAtSFrame(lastSegment, currentRepresentation, targetRepresentation) {
        if (!lastSegment || !lastSegment.isPartialSegment || isNaN(lastSegment.totalNumberOfPartialSegments) ||
            isNaN(lastSegment.replacementSubNumber)) {
            return false;
        }
        if (!targetRepresentation || !targetRepresentation.segmentSequenceProperties ||
            targetRepresentation.segmentSequenceProperties.length <= 0) {
            return false;
        }

        const nextPartialSubNumber = _getNextPartialSubNumber(lastSegment);

        // At the start of a segment sequence the target starts with a regular SAP (startWithSAP), the init segment can
        // be appended
        if (nextPartialSubNumber === 0) {
            return false;
        }

        const alignedSegmentSequenceProperties = targetRepresentation.segmentSequenceProperties.filter((ssp) => {
            return !isNaN(ssp.sapType) && nextPartialSubNumber % ssp.cadence === 0
        });

        // If the target signals a regular SAP at this partial segment the entry point is an IDR, the init segment can
        // be appended
        if (alignedSegmentSequenceProperties.some(
            (ssp) => SegmentSequenceProperties.isRandomAccessSapType(ssp.sapType))) {
            return false;
        }

        return alignedSegmentSequenceProperties.some((ssp) => ssp.sapType === S_FRAME_SAP_TYPE)
            && _canSpliceIntoSFrame(currentRepresentation, targetRepresentation);
    }

    /**
     * Returns the Representation to switch to on the way to the target. If the target itself can be entered at the next
     * partial segment it is returned as is.
     * Otherwise, for instance because an S-Frame down-switch exceeds the scaled reference limits, the reachable
     * Representation closest to the target that lies between the current Representation and the target is returned, so
     * a large switch hops through the rungs in between instead of waiting for the next IDR. Returns null if nothing is
     * reachable.
     * @param {object} lastSegment
     * @param {Representation} currentRepresentation
     * @param {Representation} targetRepresentation
     * @returns {Representation|null}
     * @private
     */
    function _getReachableRepresentationTowards(lastSegment, currentRepresentation, targetRepresentation) {
        if (canPerformQualitySwitch(lastSegment, currentRepresentation, targetRepresentation)) {
            return targetRepresentation;
        }

        const lowerBandwidth = Math.min(currentRepresentation.bandwidth, targetRepresentation.bandwidth);
        const upperBandwidth = Math.max(currentRepresentation.bandwidth, targetRepresentation.bandwidth);
        const candidates = getPossibleVoRepresentationsFilteredBySettings(currentRepresentation.mediaInfo, true)
            .filter((representation) => {
                return representation.id !== currentRepresentation.id
                    && representation.bandwidth >= lowerBandwidth
                    && representation.bandwidth <= upperBandwidth
                    && canPerformQualitySwitch(lastSegment, currentRepresentation, representation);
            });

        if (candidates.length === 0) {
            return null;
        }

        return candidates.reduce((closest, candidate) => {
            return _isCloserInQuality(candidate, closest, targetRepresentation) ? candidate : closest;
        });
    }

    /**
     * A bootstrap Representation only exists to start playback quickly: every one of its partial segments starts with
     * an IDR, at the cost of bitrate efficiency.
     * Leaving it is therefore not a quality decision, it has to happen at the first partial segment we are allowed to
     * splice into, no matter what the ABR rules propose. Relying on the ABR rules is not enough, the bootstrap and the
     * target Representation may have the exact same resolution and bitrate.
     * Returns the non-bootstrap Representation closest in quality, so the transition is quality neutral and the ABR
     * rules adapt from there.
     * @param {object} lastSegment
     * @param {Representation} currentRepresentation
     * @returns {Representation|null}
     * @private
     */
    function _getBootstrapExitRepresentation(lastSegment, currentRepresentation) {
        // As long as no media segment has been requested there is nothing to splice into, the partial segment with the
        // IDR has to be downloaded first
        if (!lastSegment || !currentRepresentation || !currentRepresentation.isBootstrapRepresentation ||
            !currentRepresentation.isBootstrapRepresentation()) {
            return null;
        }

        const candidates = getPossibleVoRepresentationsFilteredBySettings(currentRepresentation.mediaInfo, true)
            .filter((representation) => {
                return representation.id !== currentRepresentation.id
                    && !representation.isBootstrapRepresentation()
                    && canPerformQualitySwitch(lastSegment, currentRepresentation, representation)
            });

        if (candidates.length === 0) {
            return null;
        }

        return candidates.reduce((closest, candidate) => {
            return _isBetterBootstrapExit(candidate, closest, currentRepresentation) ? candidate : closest;
        });
    }

    /**
     * The bitrate of a bootstrap Representation is inflated by its IDRs and does not reflect its quality. Leave it to
     * the Representation with the closest resolution and the lowest bitrate among those, the ABR rules take over from
     * there. Falls back to the closest bitrate if the resolution is not signaled.
     * @private
     */
    function _isBetterBootstrapExit(candidate, currentBest, bootstrapRepresentation) {
        const pixels = (representation) => representation.width * representation.height;
        const bootstrapPixels = pixels(bootstrapRepresentation);
        const candidatePixelsDelta = Math.abs(pixels(candidate) - bootstrapPixels);
        const bestPixelsDelta = Math.abs(pixels(currentBest) - bootstrapPixels);

        if (isNaN(candidatePixelsDelta) || isNaN(bestPixelsDelta)) {
            return _isCloserInQuality(candidate, currentBest, bootstrapRepresentation);
        }
        if (candidatePixelsDelta !== bestPixelsDelta) {
            return candidatePixelsDelta < bestPixelsDelta;
        }

        return candidate.bandwidth < currentBest.bandwidth;
    }

    /**
     * @private
     */
    function _isCloserInQuality(candidate, currentClosest, referenceRepresentation) {
        const candidateBandwidthDelta = Math.abs(candidate.bandwidth - referenceRepresentation.bandwidth);
        const closestBandwidthDelta = Math.abs(currentClosest.bandwidth - referenceRepresentation.bandwidth);
        if (candidateBandwidthDelta !== closestBandwidthDelta) {
            return candidateBandwidthDelta < closestBandwidthDelta;
        }

        const candidatePixelsDelta = Math.abs(candidate.pixelsPerSecond - referenceRepresentation.pixelsPerSecond);
        const closestPixelsDelta = Math.abs(currentClosest.pixelsPerSecond - referenceRepresentation.pixelsPerSecond);
        if (!isNaN(candidatePixelsDelta) && !isNaN(closestPixelsDelta) && candidatePixelsDelta !== closestPixelsDelta) {
            return candidatePixelsDelta < closestPixelsDelta;
        }

        return candidate.absoluteIndex > currentClosest.absoluteIndex;
    }

    function _addDroppedFramesHistoryEntry(streamId) {
        if (droppedFramesHistory) {
            const playbackQuality = videoModel.getPlaybackQuality();
            if (playbackQuality) {
                droppedFramesHistory.push(streamId, currentRepresentationId, playbackQuality);
            }
        }
    }

    function _addSwitchHistoryEntry(currentRepresentation, newRepresentation) {
        switchRequestHistory.push({
            currentRepresentation,
            newRepresentation
        })
    }

    /**
     * Sets the new playback quality. Starts from index 0.<br>
     * If the index of the new quality is the same as the old one changeQuality will not be called.
     * @param {string} type
     * @param {object} streamInfo
     * @param {Representation} representation
     * @param {string} reason
     * @param {string} rule
     */
    function setPlaybackQuality(type, streamInfo, representation, reason = {}) {
        if (!streamInfo || !streamInfo.id || !type || !streamProcessorDict || !streamProcessorDict[streamInfo.id] ||
            !streamProcessorDict[streamInfo.id][type] || !representation) {
            return false;
        }

        const streamProcessor = streamProcessorDict[streamInfo.id][type];
        const currentRepresentation =
            streamProcessor.getRepresentationController()?.getCurrentCompositeRepresentation();

        if (!currentRepresentation || representation.id !== currentRepresentation.id) {
            return _changeQuality(type, currentRepresentation, representation, reason);
        }

        return false;
    }

    function manuallySetPlaybackQuality(type, streamInfo, representation, reason = {}) {
        const streamProcessor = streamProcessorDict[streamInfo.id][type];
        const lastSegment = streamProcessor.getLastSegment();
        const currentRepresentation = streamProcessor.getRepresentation();

        // A newer manual switch replaces a queued one
        queuedManualQualitySwitches.delete(_getManualQualitySwitchKey(streamInfo.id, type));

        // A replacement prunes the buffer and restarts loading at a random access point of the target, it never enters
        // the target at an S-Frame. The switch point and hop rules do not apply.
        if (reason && (reason.forceReplace || reason.forceAbandon)) {
            return setPlaybackQuality(type, streamInfo, representation, reason);
        }

        // The reference frames of an S-Frame come from the last requested partial segment. After a switch they still
        // belong to the previous Representation until a partial segment of the current one has been requested.
        const canSwitchQuality =
            !_isWaitingForPartialSegmentOfRepresentation(lastSegment, currentRepresentation) &&
            canPerformQualitySwitch(lastSegment, currentRepresentation, representation);

        if (!canSwitchQuality) {
            _queueManualQualitySwitch(type, streamInfo, representation, reason);
            return;
        }

        return setPlaybackQuality(type, streamInfo, representation, reason);
    }

    function _queueManualQualitySwitch(type, streamInfo, representation, reason) {
        try {
            logger.debug(`[AbrController] Queuing manual quality switch for stream ${streamInfo.id} and type ${type} to representation ${representation.id}`);
            const key = _getManualQualitySwitchKey(streamInfo.id, type);
            queuedManualQualitySwitches.set(key, { type, streamInfo, representation, reason });
        } catch (e) {
            logger.error(`Can not queue manual quality switch: ${e}`);
        }
    }

    function handlePendingManualQualitySwitch(streamId, mediaType) {
        try {
            const manualQualitySwitchKey = _getManualQualitySwitchKey(streamId, mediaType);
            let switchRequest = null;
            if (queuedManualQualitySwitches.has(manualQualitySwitchKey)) {
                switchRequest = queuedManualQualitySwitches.get(manualQualitySwitchKey);
            }

            if (!switchRequest) {
                return false
            }

            const { type, streamInfo, representation, reason } = switchRequest;

            const streamProcessor = streamProcessorDict[streamId][mediaType];
            const lastSegment = streamProcessor.getLastSegment();
            const currentRepresentation = streamProcessor.getRepresentation();

            // After a hop, wait until a partial segment of the intermediate Representation has been requested. The
            // reachability of the next hop is evaluated relative to it, otherwise we would append the next hop directly
            // after a partial segment of the previous Representation.
            if (_isWaitingForPartialSegmentOfRepresentation(lastSegment, currentRepresentation)) {
                return false;
            }

            const reachableRepresentation = currentRepresentation
                ? _getReachableRepresentationTowards(lastSegment, currentRepresentation, representation)
                : representation;

            if (!reachableRepresentation) {
                return false
            }

            // The target is not reachable yet, hop towards it and keep the request queued for the next partial segment
            if (reachableRepresentation.id !== representation.id) {
                logger.debug(`[AbrController] Hopping via Representation ${reachableRepresentation.id} on the way to the manually selected Representation ${representation.id}`);
                return setPlaybackQuality(type, streamInfo, reachableRepresentation, reason);
            }

            queuedManualQualitySwitches.delete(manualQualitySwitchKey);
            // If the target became the current Representation in the meantime nothing changes, the caller has to
            // continue scheduling
            return setPlaybackQuality(type, streamInfo, representation, reason);
        } catch (e) {
            logger.error(`Can not handle pending manual quality switch: ${e}`);
        }
    }

    function _isWaitingForPartialSegmentOfRepresentation(lastSegment, currentRepresentation) {
        return !!(lastSegment && lastSegment.isPartialSegment && lastSegment.representation && currentRepresentation &&
            lastSegment.representation.id !== currentRepresentation.id);
    }

    function _getManualQualitySwitchKey(streamId, mediaType) {
        return `${streamId}-${mediaType}`
    }

    /**
     *
     * @param {string} streamId
     * @param {type} type
     * @return {*|null}
     */
    function getAbandonmentStateFor(streamId, type) {
        return abandonmentStateDict[streamId] && abandonmentStateDict[streamId][type] ?
            abandonmentStateDict[streamId][type].state : null;
    }

    function _getAbandonmentStateDictFor(streamId, type) {
        return abandonmentStateDict[streamId] && abandonmentStateDict[streamId][type] ?
            abandonmentStateDict[streamId][type] : null;

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
        if (!type || !streamProcessorDict[streamId] || !streamProcessorDict[streamId][type]) {
            return false
        }

        const streamProcessor = streamProcessorDict[streamId][type];
        const streamInfo = streamProcessor.getStreamInfo();
        const bufferLevel = dashMetrics.getCurrentBufferLevel(type);
        const isAdaptationSetSwitch = oldRepresentation !== null &&
            !adapter.areMediaInfosEqual(oldRepresentation.mediaInfo, newRepresentation.mediaInfo);
        const oldBitrate = oldRepresentation ? oldRepresentation.bitrateInKbit : 0;

        // When entering the target Representation at an S-Frame no init segment must be appended. Not applicable when
        // abandoning or replacing, as the switch does not continue at the next partial segment.
        const noInitSegmentRequired = !(reason && (reason.forceReplace || reason.forceAbandon))
            && _entersTargetAtSFrame(streamProcessor.getLastSegment(), oldRepresentation, newRepresentation);

        logger.info(`[AbrController]: Switching quality in period ${streamId} for media type ${type}. Switch from bitrate ${oldBitrate} to bitrate ${newRepresentation.bitrateInKbit}. Current buffer level: ${bufferLevel}. Reason:` + (reason ? JSON.stringify(reason) : '/'));
        eventBus.trigger(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED,
            {
                isAdaptationSetSwitch,
                mediaType: type,
                newRepresentation: newRepresentation,
                noInitSegmentRequired,
                oldRepresentation: oldRepresentation,
                reason,
                streamInfo,
            },
            { streamId: streamInfo.id, mediaType: type }
        );

        _saveBitrateSettings(type)
        return true
    }

    function _saveBitrateSettings(type) {
        const bitrate = throughputController.getAverageThroughput(type);
        if (!isNaN(bitrate)) {
            domStorage.setSavedBitrateSettings(type, bitrate);
        }
    }


    /**
     * If both BOLA and Throughput Rule are active we switch dynamically between both of them
     * @returns {boolean}
     * @private
     */
    function _shouldApplyDynamicAbrStrategy() {
        return settings.get().streaming.abr.rules.bolaRule.active &&
            settings.get().streaming.abr.rules.throughputRule.active
    }

    /**
     * Switch between BOLA and ThroughputRule
     * @param mediaType
     * @param bufferLevel
     * @private
     */
    function _updateDynamicAbrStrategy(mediaType, bufferLevel) {
        try {
            const hybridSwitchBufferTime = settings.get().streaming.abr.hybridSwitchBufferTime;
            const switchOnThreshold = hybridSwitchBufferTime;
            const switchOffThreshold = 0.5 * hybridSwitchBufferTime;

            const isUsingBolaRule = abrRulesCollection.getBolaState(mediaType)
            // use hysteresis to avoid oscillating rules
            const shouldUseBolaRule = bufferLevel >= (isUsingBolaRule ? switchOffThreshold : switchOnThreshold);
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
        delete excludedRepresentationIds[streamId];
        delete segmentSequenceSwitchStateDict[streamId];

        abrRulesCollection.clearDataForStream(streamId);
    }

    function handleNewMediaInfo(newMediaInfo) {
        abrRulesCollection.handleNewMediaInfo(newMediaInfo);
    }


    instance = {
        canPerformQualitySwitch,
        checkPlaybackQuality,
        clearDataForStream,
        excludeRepresentation,
        getAbandonmentStateFor,
        getInitialBitrateFor,
        getOptimalRepresentationForBitrate,
        getPossibleVoRepresentations,
        getPossibleVoRepresentationsFilteredBySettings,
        getRepresentationByAbsoluteIndex,
        handleNewMediaInfo,
        handlePendingManualQualitySwitch,
        initialize,
        isPlayingAtLowestQuality,
        isPlayingAtTopQuality,
        manuallySetPlaybackQuality,
        registerStreamType,
        reset,
        setConfig,
        setPlaybackQuality,
        unRegisterStreamType,
    };

    setup();

    return instance;
}

AbrController.__dashjs_factory_name = 'AbrController';
const factory = FactoryMaker.getSingletonFactory(AbrController);
FactoryMaker.updateSingletonFactory(AbrController.__dashjs_factory_name, factory);
export default factory;

