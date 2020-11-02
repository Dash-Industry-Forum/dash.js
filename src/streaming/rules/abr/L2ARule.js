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

import MetricsConstants from '../../constants/MetricsConstants';
import SwitchRequest from '../SwitchRequest';
import FactoryMaker from '../../../core/FactoryMaker';
import {HTTPRequest} from '../../vo/metrics/HTTPRequest';
import EventBus from '../../../core/EventBus';
import Events from '../../../core/events/Events';
import Debug from '../../../core/Debug';


const L2A_STATE_ONE_BITRATE = 0; // If there is only one bitrate (or initialization failed), always return NO_CHANGE.
const L2A_STATE_STARTUP = 1; // Set placeholder buffer such that we download fragments at most recently measured throughput.
const L2A_STATE_STEADY = 2; // Buffer primed, we switch to steady operation.


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
        eventBus.on(Events.QUALITY_CHANGE_REQUESTED, _onQualityChangeRequested, instance);
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
        const bitrates = mediaInfo.bitrateList.map((b) => {
            return b.bandwidth / 1000;
        });

        initialState.state = L2A_STATE_STARTUP;
        initialState.bitrates = bitrates;
        initialState.lastQuality = 0;

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
        l2AParameterDict[mediaInfo.type].w = [];//Vector of probabilities associated with bitrate decisions
        l2AParameterDict[mediaInfo.type].prev_w = [];//Vector of probabilities associated with bitrate decisions calculated in the previous step
        l2AParameterDict[mediaInfo.type].Q = 0;//Initialization of Lagrangian multiplier (This keeps track of the buffer displacement)
        l2AParameterDict[mediaInfo.type].segment_request_start_s = 0;
        l2AParameterDict[mediaInfo.type].segment_download_finish_s = 0;
        l2AParameterDict[mediaInfo.type].B_target = 1.5;//Target buffer level
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
        if (e && e.chunk && e.chunk.mediaInfo) {
            const l2AState = l2AStateDict[e.chunk.mediaInfo.type];
            const l2AParameters = l2AParameterDict[e.chunk.mediaInfo.type];

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
                l2AState.lastQuality = e.chunk.quality;

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
     * Event handler for the qualityChangeRequested event
     * @param {object} e
     * @private
     */
    function _onQualityChangeRequested(e) {
        // Useful to store change requests when abandoning a download.
        if (e && e.mediaType) {
            const L2AState = l2AStateDict[e.mediaType];
            if (L2AState && L2AState.state !== L2A_STATE_ONE_BITRATE) {
                L2AState.abrQuality = e.newQuality;
            }
        }
    }

    /**
     * Calculates the index of the minimum value of an array
     * @param {array} arr
     * @return {number} minIndex
     * @private
     */
    function _indexOfMin(arr) {
        if (arr.length === 0) {
            return -1;
        }
        let min = arr[0];
        let minIndex = 0;
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] <= min) {
                minIndex = i;
                min = arr[i];
            }
        }
        return minIndex;
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
     * @constructor
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
     * Returns a switch request object indicating which quality is to be played
     * @param {object} rulesContext
     * @return {object}
     */
    function getMaxIndex(rulesContext) {
        const switchRequest = SwitchRequest(context).create();
        const horizon = 8;//Optimization horizon
        const vl = Math.pow(horizon, 0.2);//Cautiousness parameter
        const alpha = Math.max(Math.pow(horizon, 0.7), vl * Math.sqrt(horizon));//Step size
        const mediaInfo = rulesContext.getMediaInfo();
        const mediaType = rulesContext.getMediaType();
        const bitrates = mediaInfo.bitrateList.map(b => b.bandwidth);
        const bitrateCount = bitrates.length;
        const scheduleController = rulesContext.getScheduleController();
        const streamInfo = rulesContext.getStreamInfo();
        const abrController = rulesContext.getAbrController();
        const throughputHistory = abrController.getThroughputHistory();
        const isDynamic = streamInfo && streamInfo.manifestInfo && streamInfo.manifestInfo.isDynamic;
        const useL2AABR = rulesContext.useL2AABR();
        const bufferLevel = dashMetrics.getCurrentBufferLevel(mediaType, true);
        const safeThroughput = throughputHistory.getSafeAverageThroughput(mediaType, isDynamic);
        const throughput = throughputHistory.getAverageThroughput(mediaType, isDynamic);
        const cThroughput = throughput / 1000; //Throughput in Mbps
        const react = 20;///Reactiveness to throughput drops
        const latency = throughputHistory.getAverageLatency(mediaType);
        let quality;

        if (!rulesContext || !rulesContext.hasOwnProperty('getMediaInfo') || !rulesContext.hasOwnProperty('getMediaType') ||
            !rulesContext.hasOwnProperty('getScheduleController') || !rulesContext.hasOwnProperty('getStreamInfo') ||
            !rulesContext.hasOwnProperty('getAbrController') || !rulesContext.hasOwnProperty('useL2AABR')) {
            return switchRequest;
        }

        switchRequest.reason = switchRequest.reason || {};

        if (!useL2AABR) {
            return switchRequest;
        }

        scheduleController.setTimeToLoadDelay(0);

        const l2AState = _getL2AState(rulesContext);
        if (l2AState.state === L2A_STATE_ONE_BITRATE) {
            // shouldn't even have been called
            return switchRequest;
        }

        const l2AParameter = l2AParameterDict[mediaType];
        if (!l2AParameter) {
            return switchRequest;
        }

        switchRequest.reason.state = l2AState.state;
        switchRequest.reason.throughput = throughput;
        switchRequest.reason.latency = latency;
        if (isNaN(throughput)) {
            // still starting up - not enough information
            return switchRequest;
        }

        switch (l2AState.state) {
            case L2A_STATE_STARTUP:
                quality = abrController.getQualityForBitrate(mediaInfo, safeThroughput, latency);
                switchRequest.quality = quality;
                switchRequest.reason.throughput = safeThroughput;
                l2AState.lastQuality = quality;
                if (!isNaN(l2AState.lastSegmentDurationS) && bufferLevel >= l2AState.lastSegmentDurationS) {
                    l2AState.state = L2A_STATE_STEADY;
                }
                break; // L2A_STATE_STARTUP
            case L2A_STATE_STEADY:
                /////////////////////////////Main adaptation logic of L2A-LL
                let V = l2AState.lastSegmentDurationS;
                let diff1 = [];//Used to calculate the difference between consecutive decisions (w-w_prev)
                if (l2AParameter.w.length === 0) {//Initialization of w and w_prev
                    l2AParameter.Q = 0;
                    for (let i = 0; i < bitrateCount; ++i) {
                        if (i === 0) {
                            l2AParameter.w[i] = 0.33;
                            l2AParameter.prev_w[i] = 1;
                        } else {
                            l2AParameter.w[i] = 0.33;
                            l2AParameter.prev_w[i] = 0;
                        }
                    }
                }
                for (let i = 0; i < bitrateCount; ++i) {
                    bitrates[i] = bitrates[i] / (1000 * 1000);   //Bitrates in Mbps
                    l2AParameter.w[i] = l2AParameter.prev_w[i] - (1 / (2 * alpha)) * (V * bitrates[i]) * ((l2AParameter.Q - vl) / Math.min(2 * bitrates[bitrateCount - 1], cThroughput));//Lagrangian descent
                    diff1[i] = l2AParameter.w[i] - l2AParameter.prev_w[i];
                }
                l2AParameter.w = euclideanProjection(l2AParameter.w);
                if (bitrates[l2AState.lastQuality] > ((bitrates[l2AState.lastQuality] * V / (l2AParameter.segment_download_finish_s - l2AParameter.segment_request_start_s)))) {
                    if (l2AParameter.Q < vl) {
                        l2AParameter.Q = horizon * vl * react;
                    }
                }//Reset Lagrangian multiplier (Q) to speed up potential bitrate switch based on previous throughput measurement
                l2AParameter.Q = Math.max(0, l2AParameter.Q + V * _dotmultiplication(bitrates, l2AParameter.prev_w) / Math.min(2 * bitrates[bitrateCount - 1], cThroughput) - (react / 2) * V + V * (_dotmultiplication(bitrates, diff1) / Math.min(2 * bitrates[bitrateCount - 1], cThroughput)));
                let temp = [];
                for (let i = 0; i < bitrateCount; ++i) {
                    l2AParameter.prev_w[i] = l2AParameter.w[i];
                    temp[i] = Math.abs(bitrates[i] - _dotmultiplication(l2AParameter.w, bitrates));
                }//// Quality is calculated as argmin of the aboslute differnce between available bitrates (bitrates[i]) and bitrate estimation (dotmultiplication(w,bitrates)). We employ a stepwise ascent/descent
                if (_indexOfMin(temp) > l2AState.lastQuality) {
                    quality = l2AState.lastQuality + 1;
                } else if (_indexOfMin(temp) < l2AState.lastQuality) {
                    quality = l2AState.lastQuality - 1;
                } else {
                    quality = _indexOfMin(temp);
                }
                /// Provision againts over-estimation.
                if ((bitrates[quality] >= cThroughput) && (bufferLevel < l2AParameter.B_target)) {
                    quality = l2AState.lastQuality;
                }
                switchRequest.quality = quality;
                switchRequest.reason.throughput = throughput;
                switchRequest.reason.latency = latency;
                switchRequest.reason.bufferLevel = bufferLevel;
                l2AState.lastQuality = quality;
                break; // L2A_STATE_STEADY
            default:
                logger.debug('L2A ABR rule invoked in bad state.');// should not arrive here, try to recover
                switchRequest.quality = abrController.getQualityForBitrate(mediaInfo, safeThroughput, latency);
                switchRequest.reason.state = l2AState.state;
                switchRequest.reason.throughput = safeThroughput;
                switchRequest.reason.latency = latency;
                l2AState.state = L2A_STATE_STARTUP;
                _clearL2AStateOnSeek(l2AState);
        }
        return switchRequest;
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
        eventBus.off(Events.QUALITY_CHANGE_REQUESTED, _onQualityChangeRequested, instance);
    }

    instance = {
        getMaxIndex: getMaxIndex,
        reset: reset
    };

    setup();
    return instance;
}

L2ARule.__dashjs_factory_name = 'L2ARule';
export default FactoryMaker.getClassFactory(L2ARule);
