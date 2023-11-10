/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2020, Unified Streaming.
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

// For a description of the Learn2Adapt-LowLatency (L2A-LL) bitrate adaptation algorithm, see https://github.com/unifiedstreaming/Learn2Adapt-LowLatency/blob/master/Online_learning_for_bitrate_adaptation_in_low_latency_live_streaming_CR.pdf

import MetricsConstants from '../../constants/MetricsConstants.js';
import SwitchRequest from '../SwitchRequest.js';
import FactoryMaker from '../../../core/FactoryMaker.js';
import {HTTPRequest} from '../../vo/metrics/HTTPRequest.js';
import EventBus from '../../../core/EventBus.js';
import Events from '../../../core/events/Events.js';
import Debug from '../../../core/Debug.js';
import Constants from '../../constants/Constants.js';

const L2A_STATE_ONE_BITRATE = 'L2A_STATE_ONE_BITRATE'; // If there is only one bitrate (or initialization failed), always return NO_CHANGE.
const L2A_STATE_STARTUP = 'L2A_STATE_STARTUP'; // Set placeholder buffer such that we download fragments at most recently measured throughput.
const L2A_STATE_STEADY = 'L2A_STATE_STEADY'; // Buffer primed, we switch to steady operation.
const HORIZON = 4; // Optimization horizon (The amount of steps required to achieve convergence)
const VL = Math.pow(HORIZON, 0.99);// Cautiousness parameter, used to control aggressiveness of the bitrate decision process.
const REACT = 2;

function L2ARule(config) {
    config = config || {};
    const context = this.context;

    const dashMetrics = config.dashMetrics;
    const eventBus = EventBus(context).getInstance();

    let instance,
        l2AStateDict,
        l2AParameterDict,
        logger;

    /**
     * Setup function to initialize L2ARule
     */
    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        _resetInitialSettings();

        eventBus.on(Events.PLAYBACK_SEEKING, _onPlaybackSeeking, instance);
        eventBus.on(Events.MEDIA_FRAGMENT_LOADED, _onMediaFragmentLoaded, instance);
        eventBus.on(Events.METRIC_ADDED, _onMetricAdded, instance);
    }

    /**
     * Sets the initial state of the algorithm. Calls the initialize function for the paramteters.
     * @param {object} rulesContext
     * @return {object} initialState
     * @private
     */
    function _getInitialL2AState(rulesContext) {
        const initialState = {};
        const mediaInfo = rulesContext.getMediaInfo();

        initialState.state = L2A_STATE_STARTUP;
        initialState.currentRepresentation = null;

        _initializeL2AParameters(mediaInfo);
        _clearL2AStateOnSeek(initialState);

        return initialState;
    }

    /**
     * Initializes the parameters of the algorithm. This will be done once for each media type.
     * @param {object} mediaInfo
     * @private
     */
    function _initializeL2AParameters(mediaInfo) {

        if (!mediaInfo || !mediaInfo.type) {
            return;
        }
        l2AParameterDict[mediaInfo.type] = {};
        l2AParameterDict[mediaInfo.type].w = []; //Vector of probabilities associated with bitrate decisions
        l2AParameterDict[mediaInfo.type].prev_w = []; //Vector of probabilities associated with bitrate decisions calculated in the previous step
        l2AParameterDict[mediaInfo.type].Q = 0; //Initialization of Lagrangian multiplier (This keeps track of the buffer displacement)
        l2AParameterDict[mediaInfo.type].segment_request_start_s = 0;
        l2AParameterDict[mediaInfo.type].segment_download_finish_s = 0;
        l2AParameterDict[mediaInfo.type].B_target = 1.5; //Target buffer level
    }


    /**
     * Clears the state object
     * @param {object} l2AState
     * @private
     */
    function _clearL2AStateOnSeek(l2AState) {
        l2AState.placeholderBuffer = 0;
        l2AState.mostAdvancedSegmentStart = NaN;
        l2AState.lastSegmentWasReplacement = false;
        l2AState.lastSegmentStart = NaN;
        l2AState.lastSegmentDurationS = NaN;
        l2AState.lastSegmentRequestTimeMs = NaN;
        l2AState.lastSegmentFinishTimeMs = NaN;
        l2AState.lastSegmentUrl = '';
    }


    /**
     * Returns the state object for a fiven media type. If the state object is not yet defined _getInitialL2AState is called
     * @param {object} rulesContext
     * @return {object} l2AState
     * @private
     */
    function _getL2AState(rulesContext) {
        const mediaType = rulesContext.getMediaType();
        let l2AState = l2AStateDict[mediaType];

        if (!l2AState) {
            l2AState = _getInitialL2AState(rulesContext);
            l2AStateDict[mediaType] = l2AState;
        }

        return l2AState;
    }

    /**
     * Event handler for the seeking event.
     * @private
     */
    function _onPlaybackSeeking() {
        for (const mediaType in l2AStateDict) {
            if (l2AStateDict.hasOwnProperty(mediaType)) {
                const l2aState = l2AStateDict[mediaType];
                if (l2aState.state !== L2A_STATE_ONE_BITRATE) {
                    l2aState.state = L2A_STATE_STARTUP;
                    _clearL2AStateOnSeek(l2aState);
                }
            }
        }
    }

    /**
     * Event handler for the mediaFragmentLoaded event
     * @param {object} e
     * @private
     */
    function _onMediaFragmentLoaded(e) {
        if (e && e.chunk && e.chunk.representation && e.chunk.representation.mediaInfo) {
            const l2AState = l2AStateDict[e.chunk.representation.mediaInfo.type];
            const l2AParameters = l2AParameterDict[e.chunk.representation.mediaInfo.type];

            if (l2AState && l2AState.state !== L2A_STATE_ONE_BITRATE) {
                const start = e.chunk.start;
                if (isNaN(l2AState.mostAdvancedSegmentStart) || start > l2AState.mostAdvancedSegmentStart) {
                    l2AState.mostAdvancedSegmentStart = start;
                    l2AState.lastSegmentWasReplacement = false;
                } else {
                    l2AState.lastSegmentWasReplacement = true;
                }

                l2AState.lastSegmentStart = start;
                l2AState.lastSegmentDurationS = e.chunk.duration;
                l2AState.currentRepresentation = e.chunk.representation;

                _checkNewSegment(l2AState, l2AParameters);
            }
        }
    }

    /**
     * Event handler for the metricAdded event
     * @param {object} e
     * @private
     */
    function _onMetricAdded(e) {
        if (e && e.metric === MetricsConstants.HTTP_REQUEST && e.value && e.value.type === HTTPRequest.MEDIA_SEGMENT_TYPE && e.value.trace && e.value.trace.length) {
            const l2AState = l2AStateDict[e.mediaType];
            const l2AParameters = l2AParameterDict[e.mediaType];

            if (l2AState && l2AState.state !== L2A_STATE_ONE_BITRATE) {
                l2AState.lastSegmentRequestTimeMs = e.value.trequest.getTime();
                l2AState.lastSegmentFinishTimeMs = e.value._tfinish.getTime();
                _checkNewSegment(l2AState, l2AParameters);
            }
        }
    }

    /**
     * When a new metric has been added or a media fragment has been loaded the state is adjusted accordingly
     * @param {object} L2AState
     * @param {object} l2AParameters
     * @private
     */
    function _checkNewSegment(L2AState, l2AParameters) {
        if (!isNaN(L2AState.lastSegmentStart) && !isNaN(L2AState.lastSegmentRequestTimeMs)) {
            l2AParameters.segment_request_start_s = 0.001 * L2AState.lastSegmentRequestTimeMs;
            l2AParameters.segment_download_finish_s = 0.001 * L2AState.lastSegmentFinishTimeMs;
            L2AState.lastSegmentStart = NaN;
            L2AState.lastSegmentRequestTimeMs = NaN;
        }
    }


    /**
     * Dot multiplication of two arrays
     * @param {array} arr1
     * @param {array} arr2
     * @return {number} sumdot
     * @private
     */

    function _dotmultiplication(arr1, arr2) {
        if (arr1.length !== arr2.length) {
            return -1;
        }
        let sumdot = 0;
        for (let i = 0; i < arr1.length; i++) {
            sumdot = sumdot + arr1[i] * arr2[i];
        }
        return sumdot;
    }

    /**
     * Project an n-dim vector y to the simplex Dn
     * Dn = { x : x n-dim, 1 >= x >= 0, sum(x) = 1}
     * Algorithm is explained at http://arxiv.org/abs/1101.6081
     * @param {array} arr
     * @return {array}
     */
    function euclideanProjection(arr) {
        const m = arr.length;
        let bget = false;
        let arr2 = [];
        for (let ii = 0; ii < m; ++ii) {
            arr2[ii] = arr[ii];
        }
        let s = arr.sort(function (a, b) {
            return b - a;
        });
        let tmpsum = 0;
        let tmax = 0;
        let x = [];
        for (let ii = 0; ii < m - 1; ++ii) {
            tmpsum = tmpsum + s[ii];
            tmax = (tmpsum - 1) / (ii + 1);
            if (tmax >= s[ii + 1]) {
                bget = true;
                break;
            }
        }
        if (!bget) {
            tmax = (tmpsum + s[m - 1] - 1) / m;
        }
        for (let ii = 0; ii < m; ++ii) {
            x[ii] = Math.max(arr2[ii] - tmax, 0);
        }
        return x;
    }

    /**
     *
     * @param rulesContext
     * @param switchRequest
     * @param l2AState
     * @private
     */
    function _handleStartupState(rulesContext, switchRequest, l2AState) {
        const mediaInfo = rulesContext.getMediaInfo();
        const mediaType = rulesContext.getMediaType();
        const throughputController = rulesContext.getThroughputController();
        const safeThroughput = throughputController.getSafeAverageThroughput(mediaType);

        if (isNaN(safeThroughput)) {
            // still starting up - not enough information
            return switchRequest;
        }

        const abrController = rulesContext.getAbrController();
        const representation = abrController.getOptimalRepresentationForBitrate(mediaInfo, safeThroughput, true);//During strat-up phase abr.controller is responsible for bitrate decisions.
        const bufferLevel = dashMetrics.getCurrentBufferLevel(mediaType, true);
        const l2AParameter = l2AParameterDict[mediaType];
        const possibleRepresentations = abrController.getPossibleVoRepresentations(mediaInfo, true);

        switchRequest.representation = representation;
        switchRequest.reason.throughput = safeThroughput;
        l2AState.currentRepresentation = representation;

        if (!isNaN(l2AState.lastSegmentDurationS) && bufferLevel >= l2AParameter.B_target) {
            l2AState.state = L2A_STATE_STEADY;
            l2AParameter.Q = VL;// Initialization of Q langrangian multiplier
            // Update of probability vector w, to be used in main adaptation logic of L2A below (steady state)
            for (let i = 0; i < possibleRepresentations.length; ++i) {
                const rep = possibleRepresentations[i];
                if (rep.id === l2AState.currentRepresentation.id) {
                    l2AParameter.prev_w[i] = 1;
                } else {
                    l2AParameter.prev_w[i] = 0;
                }
            }
        }
    }

    function _handleSteadyState(rulesContext, switchRequest, l2AState) {
        let diff1 = []; //Used to calculate the difference between consecutive decisions (w-w_prev)
        const throughputController = rulesContext.getThroughputController();
        const mediaType = rulesContext.getMediaType();
        let lastThroughput = throughputController.getAverageThroughput(mediaType, Constants.THROUGHPUT_CALCULATION_MODES.ARITHMETIC_MEAN, 1);
        let currentHttpRequest = dashMetrics.getCurrentHttpRequest(mediaType);
        let selectedRepresentation = null;
        const l2AParameter = l2AParameterDict[mediaType];

        //To avoid division with 0 (avoid infinity) in case of an absolute network outage
        if (lastThroughput < 1) {
            lastThroughput = 1;
        }

        // Note that for SegmentBase addressing the request url does not change.
        // As this is not relevant for low latency streaming at this point the check below is sufficient
        if (currentHttpRequest.url === l2AState.lastSegmentUrl ||
            currentHttpRequest.type === HTTPRequest.INIT_SEGMENT_TYPE) {
            // No change to inputs or init segment so use previously calculated quality
            selectedRepresentation = l2AState.currentRepresentation;

        } else { // Recalculate Q
            let V = l2AState.lastSegmentDurationS;
            let sign = 1;

            //Main adaptation logic of L2A-LL
            const abrController = rulesContext.getAbrController();
            const mediaInfo = rulesContext.getMediaInfo();
            const possibleRepresentations = abrController.getPossibleVoRepresentations(mediaInfo, true);
            const videoModel = rulesContext.getVideoModel();
            let currentPlaybackRate = videoModel.getPlaybackRate();
            const alpha = Math.max(Math.pow(HORIZON, 1), VL * Math.sqrt(HORIZON));// Step size, used for gradient descent exploration granularity
            for (let i = 0; i < possibleRepresentations.length; ++i) {
                const rep = possibleRepresentations[i];

                // In this case buffer would deplete, leading to a stall, which increases latency and thus the particular probability of selection of bitrate[i] should be decreased.
                if (currentPlaybackRate * rep.bitrateInKbit > lastThroughput) {
                    sign = -1;
                }

                // The objective of L2A is to minimize the overall latency=request-response time + buffer length after download+ potential stalling (if buffer less than chunk downlad time)
                l2AParameter.w[i] = l2AParameter.prev_w[i] + sign * (V / (2 * alpha)) * ((l2AParameter.Q + VL) * (currentPlaybackRate * rep.bitrateInKbit / lastThroughput));//Lagrangian descent
            }

            // Apply euclidean projection on w to ensure w expresses a probability distribution
            l2AParameter.w = euclideanProjection(l2AParameter.w);

            for (let i = 0; i < possibleRepresentations.length; ++i) {
                diff1[i] = l2AParameter.w[i] - l2AParameter.prev_w[i];
                l2AParameter.prev_w[i] = l2AParameter.w[i];
            }

            // Lagrangian multiplier Q calculation:
            const bitrates = possibleRepresentations.map((rep) => {
                return rep.bandwidth;
            })
            l2AParameter.Q = Math.max(0, l2AParameter.Q - V + V * currentPlaybackRate * ((_dotmultiplication(bitrates, l2AParameter.prev_w) + _dotmultiplication(bitrates, diff1)) / lastThroughput));

            // Quality is calculated as argmin of the absolute difference between available bitrates (bitrates[i]) and bitrate estimation (dotmultiplication(w,bitrates)).
            let temp = [];
            for (let i = 0; i < bitrates.length; ++i) {
                temp[i] = Math.abs(bitrates[i] - _dotmultiplication(l2AParameter.w, bitrates));
            }

            // Quality is calculated based on the probability distribution w (the output of L2A)
            const absoluteIndex = temp.indexOf(Math.min(...temp));
            selectedRepresentation = abrController.getRepresentationByAbsoluteIndex(absoluteIndex, mediaInfo, true);

            // We employ a cautious -stepwise- ascent
            if (selectedRepresentation.absoluteIndex > l2AState.currentRepresentation.absoluteIndex) {
                if (bitrates[l2AState.currentRepresentation.absoluteIndex + 1] <= lastThroughput) {
                    selectedRepresentation = abrController.getRepresentationByAbsoluteIndex(l2AState.currentRepresentation.absoluteIndex + 1, mediaInfo, true);
                }
            }

            // Provision against bitrate over-estimation, by re-calibrating the Lagrangian multiplier Q, to be taken into account for the next chunk
            if (selectedRepresentation.bitrateInKbit >= lastThroughput) {
                l2AParameter.Q = REACT * Math.max(VL, l2AParameter.Q);
            }
            l2AState.lastSegmentUrl = currentHttpRequest.url;
        }
        switchRequest.representation = selectedRepresentation;
        l2AState.currentRepresentation = switchRequest.representation;
    }

    function _handleErrorState(rulesContext, switchRequest, l2AState) {
        const abrController = rulesContext.getAbrController();
        const mediaInfo = rulesContext.getMediaInfo();
        const mediaType = rulesContext.getMediaType();
        const throughputController = rulesContext.getThroughputController();
        const safeThroughput = throughputController.getSafeAverageThroughput(mediaType);

        switchRequest.representation = abrController.getOptimalRepresentationForBitrate(mediaInfo, safeThroughput, true);//During strat-up phase abr.controller is responsible for bitrate decisions.
        switchRequest.reason.throughput = safeThroughput;
        l2AState.state = L2A_STATE_STARTUP;
        _clearL2AStateOnSeek(l2AState);
    }

    /**
     * Returns a switch request object indicating which quality is to be played
     * @param {object} rulesContext
     * @return {object}
     */
    function getSwitchRequest(rulesContext) {
        try {
            const switchRequest = SwitchRequest(context).create();
            switchRequest.rule = this.getClassName();
            const mediaType = rulesContext.getMediaType();
            const scheduleController = rulesContext.getScheduleController();

            switchRequest.reason = switchRequest.reason || {};

            // L2A decides bitrate only for video. Audio to be included in decision process in a later stage
            if ((mediaType === Constants.AUDIO)) {
                return switchRequest;
            }

            scheduleController.setTimeToLoadDelay(0);

            const l2AState = _getL2AState(rulesContext);
            const l2AParameter = l2AParameterDict[mediaType];
            if (!l2AParameter) {
                return switchRequest;
            }

            switchRequest.reason.state = l2AState.state;

            switch (l2AState.state) {
                case L2A_STATE_ONE_BITRATE:
                    break;
                case L2A_STATE_STARTUP:
                    _handleStartupState(rulesContext, switchRequest, l2AState);
                    break;
                case L2A_STATE_STEADY:
                    _handleSteadyState(rulesContext, switchRequest, l2AState);
                    break;
                default:
                    _handleErrorState(rulesContext, switchRequest, l2AState)
            }
            return switchRequest;
        } catch (e) {
            logger.error(e);
            return SwitchRequest(context).create();
        }
    }

    /**
     * Reset objects to their initial state
     * @private
     */
    function _resetInitialSettings() {
        l2AStateDict = {};
        l2AParameterDict = {};
    }

    /**
     * Reset the rule
     */
    function reset() {
        _resetInitialSettings();
        eventBus.off(Events.PLAYBACK_SEEKING, _onPlaybackSeeking, instance);
        eventBus.off(Events.MEDIA_FRAGMENT_LOADED, _onMediaFragmentLoaded, instance);
        eventBus.off(Events.METRIC_ADDED, _onMetricAdded, instance);
    }

    instance = {
        getSwitchRequest,
        reset
    };

    setup();
    return instance;
}

L2ARule.__dashjs_factory_name = 'L2ARule';
export default FactoryMaker.getClassFactory(L2ARule);
