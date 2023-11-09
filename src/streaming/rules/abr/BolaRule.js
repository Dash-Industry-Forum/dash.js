/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2016, Dash Industry Forum.
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

// For a description of the BOLA adaptive bitrate (ABR) algorithm, see http://arxiv.org/abs/1601.06748

import MetricsConstants from '../../constants/MetricsConstants.js';
import SwitchRequest from '../SwitchRequest.js';
import FactoryMaker from '../../../core/FactoryMaker.js';
import {HTTPRequest} from '../../vo/metrics/HTTPRequest.js';
import EventBus from '../../../core/EventBus.js';
import Events from '../../../core/events/Events.js';
import Debug from '../../../core/Debug.js';
import MediaPlayerEvents from '../../MediaPlayerEvents.js';
import Constants from '../../constants/Constants.js';
import AbrController from '../../controllers/AbrController.js';

// BOLA_STATE_ONE_BITRATE   : If there is only one bitrate (or initialization failed), always return NO_CHANGE.
// BOLA_STATE_STARTUP       : Set placeholder buffer such that we download fragments at most recently measured throughput.
// BOLA_STATE_STEADY        : Buffer primed, we switch to steady operation.
// TODO: add BOLA_STATE_SEEK and tune BOLA behavior on seeking
const BOLA_STATE_ONE_BITRATE = 'BOLA_STATE_ONE_BITRATE';
const BOLA_STATE_STARTUP = 'BOLA_STATE_STARTUP';
const BOLA_STATE_STEADY = 'BOLA_STATE_STEADY';

const MINIMUM_BUFFER_S = 10; // BOLA should never add artificial delays if buffer is less than MINIMUM_BUFFER_S.
const MINIMUM_BUFFER_PER_BITRATE_LEVEL_S = 2;
// E.g. if there are 5 bitrates, BOLA switches to top bitrate at buffer = 10 + 5 * 2 = 20s.
// If Schedule Controller does not allow buffer to reach that level, it can be achieved through the placeholder buffer level.

const PLACEHOLDER_BUFFER_DECAY = 0.99; // Make sure placeholder buffer does not stick around too long.

function BolaRule(config) {

    config = config || {};
    const context = this.context;

    const dashMetrics = config.dashMetrics;
    const mediaPlayerModel = config.mediaPlayerModel;
    const eventBus = EventBus(context).getInstance();
    const abrController = AbrController(context).getInstance();

    let instance,
        logger,
        bolaStateDict;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        resetInitialSettings();
        eventBus.on(MediaPlayerEvents.BUFFER_EMPTY, _onBufferEmpty, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_SEEKING, _onPlaybackSeeking, instance);
        eventBus.on(MediaPlayerEvents.METRIC_ADDED, _onMetricAdded, instance);
        eventBus.on(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, _onQualityChangeRequested, instance);
        eventBus.on(MediaPlayerEvents.FRAGMENT_LOADING_ABANDONED, _onFragmentLoadingAbandoned, instance);
        eventBus.on(Events.MEDIA_FRAGMENT_LOADED, _onMediaFragmentLoaded, instance);
    }

    /**
     * If we rebuffer, we don't want the placeholder buffer to artificially raise BOLA quality
     * @param {object} e
     * @private
     */
    function _onBufferEmpty(e) {
        const mediaType = e.mediaType;
        const streamId = e.streamId;
        // if audio buffer runs empty (due to track switch for example) then reset placeholder buffer only for audio (to avoid decrease video BOLA quality)
        const stateDict = mediaType === Constants.AUDIO ? [Constants.AUDIO] : bolaStateDict[streamId];
        for (const mediaType in stateDict) {
            if (bolaStateDict[streamId] && bolaStateDict[streamId].hasOwnProperty(mediaType) && bolaStateDict[streamId][mediaType].state === BOLA_STATE_STEADY) {
                bolaStateDict[streamId][mediaType].placeholderBuffer = 0;
            }
        }
    }

    /**
     * Clear BOLA parameters for each media type once we seek. By setting to BOLA_STATE_STARTUP we use the throughput to get the possible quality.
     * @private
     */
    function _onPlaybackSeeking(e) {
        // TODO: 1. Verify what happens if we seek mid-fragment.
        // TODO: 2. If e.g. we have 10s fragments and seek, we might want to download the first fragment at a lower quality to restart playback quickly.
        const streamId = e.streamId
        for (const mediaType in bolaStateDict[streamId]) {
            if (bolaStateDict[streamId].hasOwnProperty(mediaType)) {
                const bolaState = bolaStateDict[streamId][mediaType];
                if (bolaState.state !== BOLA_STATE_ONE_BITRATE) {
                    bolaState.state = BOLA_STATE_STARTUP; // TODO: BOLA_STATE_SEEK?
                    _clearBolaStateOnSeek(bolaState);
                }
            }
        }
    }

    /**
     * Handle situations in which the downloaded quality differs from what the BOLA algorithm recommended
     * @param e
     * @private
     */
    function _onMetricAdded(e) {
        if (e && e.metric === MetricsConstants.HTTP_REQUEST && e.value && e.value.type === HTTPRequest.MEDIA_SEGMENT_TYPE && e.value.trace && e.value.trace.length) {
            const bolaState = bolaStateDict[e.streamId] && bolaStateDict[e.streamId][e.mediaType] ? bolaStateDict[e.streamId][e.mediaType] : null;
            if (bolaState && bolaState.state !== BOLA_STATE_ONE_BITRATE) {
                bolaState.lastSegmentRequestTimeMs = e.value.trequest.getTime();
                bolaState.lastSegmentFinishTimeMs = e.value._tfinish.getTime();
                _checkNewSegment(bolaState, e.mediaType);
            }
        }
    }

    /**
     * Useful to store change requests when abandoning a download.
     * @param e
     * @private
     */
    function _onQualityChangeRequested(e) {
        if (e && bolaStateDict[e.streamId] && bolaStateDict[e.streamId][e.mediaType]) {
            const bolaState = bolaStateDict[e.streamId][e.mediaType];
            if (bolaState && bolaState.state !== BOLA_STATE_ONE_BITRATE) {
                bolaState.currentRepresentation = e.newRepresentation;
            }
        }
    }

    /**
     *
     * @param rulesContext
     * @returns {{}}
     * @private
     */
    function _getInitialBolaState(rulesContext) {
        const initialState = {};
        const mediaInfo = rulesContext.getMediaInfo();
        const representations = abrController.getPossibleVoRepresentations(mediaInfo, true);
        const bitrates = representations.map(r => r.bandwidth);
        let utilities = bitrates.map(b => Math.log(b));
        utilities = utilities.map(u => u - utilities[0] + 1); // normalize
        const bufferTimeDefault = mediaPlayerModel.getBufferTimeDefault();
        const params = _calculateBolaParameters(bufferTimeDefault, representations, utilities);

        // only happens when there is only one bitrate level
        if (!params) {
            initialState.state = BOLA_STATE_ONE_BITRATE;
        } else {
            initialState.state = BOLA_STATE_STARTUP;
            initialState.representations = representations;
            initialState.utilities = utilities;
            initialState.bufferTimeDefault = bufferTimeDefault;
            initialState.Vp = params.Vp;
            initialState.gp = params.gp;
            initialState.currentRepresentation = null;
            _clearBolaStateOnSeek(initialState);
        }

        return initialState;
    }

    /**
     *  NOTE: in live streaming, the real buffer level can drop below minimumBufferS, but bola should not stick to lowest bitrate by using a placeholder buffer level
     * @param bufferTimeDefault
     * @param representations
     * @param utilities
     * @returns {{gp: number, Vp: number}|null}
     * @private
     */
    function _calculateBolaParameters(bufferTimeDefault, representations, utilities) {
        const highestUtilityIndex = utilities.reduce((highestIndex, u, uIndex) => (u > utilities[highestIndex] ? uIndex : highestIndex), 0);

        // if highestUtilityIndex === 0, then always use lowest bitrate
        if (highestUtilityIndex === 0) {
            return null;
        }

        const bufferTime = Math.max(bufferTimeDefault, MINIMUM_BUFFER_S + MINIMUM_BUFFER_PER_BITRATE_LEVEL_S * representations.length);

        // TODO: Investigate if following can be better if utilities are not the default Math.log utilities.
        // If using Math.log utilities, we can choose Vp and gp to always prefer bitrates[0] at minimumBufferS and bitrates[max] at bufferTarget.
        // (Vp * (utility + gp) - bufferLevel) / bitrate has the maxima described when:
        // Vp * (utilities[0] + gp - 1) === minimumBufferS and Vp * (utilities[max] + gp - 1) === bufferTarget
        // giving:
        const gp = (utilities[highestUtilityIndex] - 1) / (bufferTime / MINIMUM_BUFFER_S - 1);
        const Vp = MINIMUM_BUFFER_S / gp;
        // note that expressions for gp and Vp assume utilities[0] === 1, which is true because of normalization

        return { gp: gp, Vp: Vp };
    }

    /**
     *
     * @param bolaState
     * @private
     */
    function _clearBolaStateOnSeek(bolaState) {
        bolaState.placeholderBuffer = 0;
        bolaState.mostAdvancedSegmentStart = NaN;
        bolaState.lastSegmentWasReplacement = false;
        bolaState.lastSegmentStart = NaN;
        bolaState.lastSegmentDurationS = NaN;
        bolaState.lastSegmentRequestTimeMs = NaN;
        bolaState.lastSegmentFinishTimeMs = NaN;
    }

    /**
     * If the buffer target is changed (can this happen mid-stream?), then adjust BOLA parameters accordingly.
     * @param bolaState
     * @param mediaType
     * @private
     */
    function _checkBolaStateBufferTimeDefault(bolaState, mediaType) {
        const bufferTimeDefault = mediaPlayerModel.getBufferTimeDefault();
        if (bolaState.bufferTimeDefault !== bufferTimeDefault) {
            const params = _calculateBolaParameters(bufferTimeDefault, bolaState.representations, bolaState.utilities);
            if (params.Vp !== bolaState.Vp || params.gp !== bolaState.gp) {
                // correct placeholder buffer using two criteria:
                // 1. do not change effective buffer level at effectiveBufferLevel === MINIMUM_BUFFER_S ( === Vp * gp )
                // 2. scale placeholder buffer by Vp subject to offset indicated in 1.

                const bufferLevel = dashMetrics.getCurrentBufferLevel(mediaType);
                let effectiveBufferLevel = bufferLevel + bolaState.placeholderBuffer;

                effectiveBufferLevel -= MINIMUM_BUFFER_S;
                effectiveBufferLevel *= params.Vp / bolaState.Vp;
                effectiveBufferLevel += MINIMUM_BUFFER_S;

                bolaState.bufferTimeDefault = bufferTimeDefault;
                bolaState.Vp = params.Vp;
                bolaState.gp = params.gp;
                bolaState.placeholderBuffer = Math.max(0, effectiveBufferLevel - bufferLevel);
            }
        }
    }

    /**
     * The core idea of BOLA.
     * @param bolaState
     * @param bufferLevel
     * @returns {Representation}
     * @private
     */
    function _getRepresentationFromBufferLevel(bolaState, bufferLevel) {
        const bitrateCount = bolaState.representations.length;
        let quality = NaN;
        let score = NaN;
        for (let i = 0; i < bitrateCount; ++i) {
            let s = (bolaState.Vp * (bolaState.utilities[i] + bolaState.gp) - bufferLevel) / bolaState.representations[i].bandwidth;
            if (isNaN(score) || s >= score) {
                score = s;
                quality = i;
            }
        }
        return bolaState.representations[quality];
    }

    /**
     * Maximum buffer level which prefers to download at quality rather than wait
     * @param bolaState
     * @param representation
     * @returns {number}
     * @private
     */
    function _maxBufferLevelForRepresentation(bolaState, representation) {
        return bolaState.Vp * (bolaState.utilities[representation.absoluteIndex] + bolaState.gp);
    }


    /**
     *  The placeholder buffer increases the effective buffer that is used to calculate the bitrate.
     *  There are two main reasons we might want to increase the placeholder buffer:
     *
     *  1. When a segment finishes downloading, we would expect to get a call on getSwitchRequest() regarding the quality for
     *  the next segment. However, there might be a delay before the next call. E.g. when streaming live content, the
     *  next segment might not be available yet. If the call to getSwitchRequest() does happens after a delay, we don't
     *  want the delay to change the BOLA decision - we only want to factor download time to decide on bitrate level.
     *
     * 2. It is possible to get a call to getSwitchRequest() without having a segment download. The buffer target in dash.js
     * is different for top-quality segments and lower-quality segments. If getSwitchRequest() returns a lower-than-top
     * quality, then the buffer controller might decide not to download a segment. When dash.js is ready for the next
     * segment, getSwitchRequest() will be called again. We don't want this extra delay to factor in the bitrate decision.
     * @param bolaState
     * @param mediaType
     * @private
     */
    function _updatePlaceholderBuffer(bolaState, mediaType) {
        const nowMs = Date.now();

        if (!isNaN(bolaState.lastSegmentFinishTimeMs)) {
            // compensate for non-bandwidth-derived delays, e.g., live streaming availability, buffer controller
            const delay = 0.001 * (nowMs - bolaState.lastSegmentFinishTimeMs);
            bolaState.placeholderBuffer += Math.max(0, delay);
        } else if (!isNaN(bolaState.lastCallTimeMs)) {
            // no download after last call, compensate for delay between calls
            const delay = 0.001 * (nowMs - bolaState.lastCallTimeMs);
            bolaState.placeholderBuffer += Math.max(0, delay);
        }

        bolaState.lastCallTimeMs = nowMs;
        bolaState.lastSegmentStart = NaN;
        bolaState.lastSegmentRequestTimeMs = NaN;
        bolaState.lastSegmentFinishTimeMs = NaN;

        _checkBolaStateBufferTimeDefault(bolaState, mediaType);
    }

    function _onMediaFragmentLoaded(e) {
        if (e && e.chunk && e.chunk.representation.mediaInfo && bolaStateDict[e.streamId]) {
            const bolaState = bolaStateDict[e.streamId][e.chunk.representation.mediaInfo.type];
            if (bolaState && bolaState.state !== BOLA_STATE_ONE_BITRATE) {
                const start = e.chunk.start;
                if (isNaN(bolaState.mostAdvancedSegmentStart) || start > bolaState.mostAdvancedSegmentStart) {
                    bolaState.mostAdvancedSegmentStart = start;
                    bolaState.lastSegmentWasReplacement = false;
                } else {
                    bolaState.lastSegmentWasReplacement = true;
                }

                bolaState.lastSegmentStart = start;
                bolaState.lastSegmentDurationS = e.chunk.duration;
                bolaState.currentRepresentation = e.chunk.representation;
                _checkNewSegment(bolaState, e.chunk.representation.mediaInfo.type);
            }
        }
    }

    /**
     * When a new segment is downloaded, we get two notifications: onMediaFragmentLoaded() and onMetricAdded(). It is
     * possible that the quality for the downloaded segment was lower (not higher) than the quality indicated by BOLA.
     * This might happen because of other rules such as the DroppedFramesRule. When this happens, we trim the
     * placeholder buffer to make BOLA more stable. This mechanism also avoids inflating the buffer when BOLA itself
     * decides not to increase the quality to avoid oscillations.
     *
     * We should also check for replacement segments (fast switching). In this case, a segment is downloaded but does
     * not grow the actual buffer. Fast switching might cause the buffer to deplete, causing BOLA to drop the bitrate.
     * We avoid this by growing the placeholder buffer.
     * @param bolaState
     * @param mediaType
     */
    function _checkNewSegment(bolaState, mediaType) {
        if (!isNaN(bolaState.lastSegmentStart) && !isNaN(bolaState.lastSegmentRequestTimeMs) && !isNaN(bolaState.placeholderBuffer)) {
            bolaState.placeholderBuffer *= PLACEHOLDER_BUFFER_DECAY;

            // Find what maximum buffer corresponding to last segment was, and ensure placeholder is not relatively larger.
            if (!isNaN(bolaState.lastSegmentFinishTimeMs)) {
                const bufferLevel = dashMetrics.getCurrentBufferLevel(mediaType);
                const bufferAtLastSegmentRequest = bufferLevel + 0.001 * (bolaState.lastSegmentFinishTimeMs - bolaState.lastSegmentRequestTimeMs); // estimate
                const maxEffectiveBufferForLastSegment = _maxBufferLevelForRepresentation(bolaState, bolaState.currentRepresentation);
                const maxPlaceholderBuffer = Math.max(0, maxEffectiveBufferForLastSegment - bufferAtLastSegmentRequest);
                bolaState.placeholderBuffer = Math.min(maxPlaceholderBuffer, bolaState.placeholderBuffer);
            }

            // then see if we should grow placeholder buffer

            if (bolaState.lastSegmentWasReplacement && !isNaN(bolaState.lastSegmentDurationS)) {
                // compensate for segments that were downloaded but did not grow the buffer
                bolaState.placeholderBuffer += bolaState.lastSegmentDurationS;
            }

            bolaState.lastSegmentStart = NaN;
            bolaState.lastSegmentRequestTimeMs = NaN;
        }
    }

    /**
     * The minimum buffer level that would cause BOLA to choose target quality rather than a lower bitrate
     * @param bolaState
     * @param representation
     * @returns {number}
     * @private
     */
    function _minBufferLevelForRepresentation(bolaState, representation) {
        const absoluteIndex = representation.absoluteIndex
        const qBitrate = representation.bandwidth;
        const qUtility = bolaState.utilities[absoluteIndex];

        let min = 0;

        // for each bitrate less than bitrates[absoluteIndex], BOLA should prefer quality (unless other bitrate has higher utility)
        for (let i = absoluteIndex - 1; i >= 0; --i) {
            if (bolaState.utilities[i] < bolaState.utilities[absoluteIndex]) {
                const iBitrate = bolaState.representations[i].bandwidth;
                const iUtility = bolaState.utilities[i];

                const level = bolaState.Vp * (bolaState.gp + (qBitrate * iUtility - iBitrate * qUtility) / (qBitrate - iBitrate));
                min = Math.max(min, level); // we want min to be small but at least level(i) for all i
            }
        }
        return min;
    }

    /**
     *
     * @param e
     * @private
     */
    function _onFragmentLoadingAbandoned(e) {
        if (e) {
            const bolaState = bolaStateDict[e.streamId][e.mediaType];
            if (bolaState && bolaState.state !== BOLA_STATE_ONE_BITRATE) {
                // deflate placeholderBuffer - note that we want to be conservative when abandoning
                const bufferLevel = dashMetrics.getCurrentBufferLevel(e.mediaType);
                let wantEffectiveBufferLevel;
                if (bolaState.currentRepresentation.absoluteIndex > 0) {
                    // deflate to point where BOLA just chooses newQuality over newQuality-1
                    wantEffectiveBufferLevel = _minBufferLevelForRepresentation(bolaState, bolaState.currentRepresentation);
                } else {
                    wantEffectiveBufferLevel = MINIMUM_BUFFER_S;
                }
                const maxPlaceholderBuffer = Math.max(0, wantEffectiveBufferLevel - bufferLevel);
                bolaState.placeholderBuffer = Math.min(bolaState.placeholderBuffer, maxPlaceholderBuffer);
            }
        }
    }

    /**
     * At startup we decide on the best quality based on the throughput. The placeholderBuffer is adjusted accordingly.
     * @param switchRequest
     * @param rulesContext
     * @param bolaState
     * @private
     */
    function _handleBolaStateStartup(switchRequest, rulesContext, bolaState) {
        const mediaType = rulesContext.getMediaType();
        const throughputController = rulesContext.getThroughputController();
        const safeThroughput = throughputController.getSafeAverageThroughput(mediaType);

        if (isNaN(safeThroughput)) {
            return
        }

        const mediaInfo = rulesContext.getMediaInfo();
        const representation = abrController.getOptimalRepresentationForBitrate(mediaInfo, safeThroughput, true);
        const bufferLevel = dashMetrics.getCurrentBufferLevel(mediaType);
        switchRequest.representation = representation;
        switchRequest.reason.throughput = safeThroughput;
        bolaState.placeholderBuffer = Math.max(0, _minBufferLevelForRepresentation(bolaState, representation) - bufferLevel);
        bolaState.currentRepresentation = representation;

        if (!isNaN(bolaState.lastSegmentDurationS) && bufferLevel >= bolaState.lastSegmentDurationS) {
            bolaState.state = BOLA_STATE_STEADY;
        }
    }

    /**
     *
     * @param switchRequest
     * @param rulesContext
     * @param bolaState
     * @private
     */
    function _handleBolaStateSteady(switchRequest, rulesContext, bolaState) {
        const mediaType = rulesContext.getMediaType();
        const throughputController = rulesContext.getThroughputController();
        const mediaInfo = rulesContext.getMediaInfo();
        const safeThroughput = throughputController.getSafeAverageThroughput(mediaType);
        const scheduleController = rulesContext.getScheduleController();
        _updatePlaceholderBuffer(bolaState, mediaType);

        const bufferLevel = dashMetrics.getCurrentBufferLevel(mediaType);
        // NB: The placeholder buffer is added to bufferLevel to come up with a bitrate.
        //     This might lead BOLA to be too optimistic and to choose a bitrate that would lead to rebuffering -
        //     if the real buffer bufferLevel runs out, the placeholder buffer cannot prevent rebuffering.
        //     However, the InsufficientBufferRule takes care of this scenario.
        let representation = _getRepresentationFromBufferLevel(bolaState, bufferLevel + bolaState.placeholderBuffer);

        // we want to avoid oscillations
        // We implement the "BOLA-O" variant: when network bandwidth lies between two encoded bitrate levels, stick to the lowest level.
        const representationForThroughput = abrController.getOptimalRepresentationForBitrate(mediaInfo, safeThroughput, true);
        if (representation.absoluteIndex > bolaState.currentRepresentation.absoluteIndex && representation.absoluteIndex > representationForThroughput.absoluteIndex) {
            // only intervene if we are trying to *increase* quality to an *unsustainable* level
            // we are only avoid oscillations - do not drop below last quality
            representation = representationForThroughput.absoluteIndex > bolaState.currentRepresentation.absoluteIndex ? representationForThroughput : bolaState.currentRepresentation;
        }

        // We do not want to overfill buffer with low quality chunks.
        // Note that there will be no delay if buffer level is below MINIMUM_BUFFER_S, probably even with some margin higher than MINIMUM_BUFFER_S.
        let delayS = Math.max(0, bufferLevel + bolaState.placeholderBuffer - _maxBufferLevelForRepresentation(bolaState, representation));

        // First reduce placeholder buffer, then tell schedule controller to pause.
        if (delayS <= bolaState.placeholderBuffer) {
            bolaState.placeholderBuffer -= delayS;
            delayS = 0;
        } else {
            delayS -= bolaState.placeholderBuffer;
            bolaState.placeholderBuffer = 0;

            if (!abrController.isPlayingAtTopQuality(representation)) {
                // At top quality, allow schedule controller to decide how far to fill buffer.
                scheduleController.setTimeToLoadDelay(1000 * delayS);
            } else {
                delayS = 0;
            }
        }

        switchRequest.representation = representation;
        switchRequest.reason.throughput = safeThroughput;
        switchRequest.reason.bufferLevel = bufferLevel;
        switchRequest.reason.placeholderBuffer = bolaState.placeholderBuffer;
        switchRequest.reason.delay = delayS;
        bolaState.currentRepresentation = representation;
    }

    /**
     * Bad state we should not have arrived here. Try to recover.
     * @param switchRequest
     * @param rulesContext
     * @param bolaState
     */
    function _handleBolaStateBad(switchRequest, rulesContext, bolaState) {
        logger.debug('BOLA ABR rule invoked in bad state.');
        const mediaInfo = rulesContext.getMediaInfo();
        const mediaType = rulesContext.getMediaType();
        const throughputController = rulesContext.getThroughputController();
        const safeThroughput = throughputController.getSafeAverageThroughput(mediaType);
        switchRequest.representation = abrController.getOptimalRepresentationForBitrate(mediaInfo, safeThroughput, true);
        switchRequest.reason.state = bolaState.state;
        switchRequest.reason.throughput = safeThroughput;
        bolaState.state = BOLA_STATE_STARTUP;
        _clearBolaStateOnSeek(bolaState);
    }

    function getSwitchRequest(rulesContext) {
        try {
            const switchRequest = SwitchRequest(context).create();

            const scheduleController = rulesContext.getScheduleController();
            scheduleController.setTimeToLoadDelay(0);

            switchRequest.rule = this.getClassName();
            switchRequest.reason = switchRequest.reason || {};

            const bolaState = _getBolaState(rulesContext);
            switchRequest.reason.state = bolaState.state;

            switch (bolaState.state) {
                case BOLA_STATE_ONE_BITRATE:
                    break;
                case BOLA_STATE_STARTUP:
                    _handleBolaStateStartup(switchRequest, rulesContext, bolaState);
                    break;
                case BOLA_STATE_STEADY:
                    _handleBolaStateSteady(switchRequest, rulesContext, bolaState)
                    break;
                default:
                    _handleBolaStateBad(switchRequest, rulesContext, bolaState)
                    break;
            }

            return switchRequest;
        } catch (e) {
            logger.error(e);
            return SwitchRequest(context).create();
        }
    }

    function _getBolaState(rulesContext) {
        const mediaType = rulesContext.getMediaType();
        const streamId = rulesContext.getStreamInfo().id;
        if (!bolaStateDict[streamId]) {
            bolaStateDict[streamId] = {};
        }
        let bolaState = bolaStateDict[streamId][mediaType];
        if (!bolaState) {
            bolaState = _getInitialBolaState(rulesContext);
            bolaStateDict[streamId][mediaType] = bolaState;
        } else if (bolaState.state !== BOLA_STATE_ONE_BITRATE) {
            _checkBolaStateBufferTimeDefault(bolaState, mediaType);
        }
        return bolaState;
    }

    function resetInitialSettings() {
        bolaStateDict = {};
    }

    function reset() {
        resetInitialSettings();

        eventBus.off(MediaPlayerEvents.BUFFER_EMPTY, _onBufferEmpty, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_SEEKING, _onPlaybackSeeking, instance);
        eventBus.off(MediaPlayerEvents.METRIC_ADDED, _onMetricAdded, instance);
        eventBus.off(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, _onQualityChangeRequested, instance);
        eventBus.off(MediaPlayerEvents.FRAGMENT_LOADING_ABANDONED, _onFragmentLoadingAbandoned, instance);
        eventBus.off(Events.MEDIA_FRAGMENT_LOADED, _onMediaFragmentLoaded, instance);
    }

    instance = {
        getSwitchRequest,
        reset
    };

    setup();
    return instance;
}

BolaRule.__dashjs_factory_name = 'BolaRule';
export default FactoryMaker.getClassFactory(BolaRule);
