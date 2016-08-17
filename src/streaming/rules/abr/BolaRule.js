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

import SwitchRequest from '../SwitchRequest';
import FactoryMaker from '../../../core/FactoryMaker';
import MediaPlayerModel from '../../models/MediaPlayerModel';
import PlaybackController from '../../controllers/PlaybackController';
import {HTTPRequest} from '../../vo/metrics/HTTPRequest';
import DashAdapter from '../../../dash/DashAdapter';
import EventBus from '../../../core/EventBus';
import Events from '../../../core/events/Events';
import Debug from '../../../core/Debug';

// BOLA_STATE_ONE_BITRATE   : If there is only one bitrate (or initialization failed), always return NO_CHANGE.
// BOLA_STATE_STARTUP       : Set virtual buffer such that we download fragments at most recently measured throughput.
// BOLA_STATE_STEADY        : Buffer primed, we switch to steady operation.
// TODO: add BOLA_STATE_SEEK and tune Bola behavior on seeking
const BOLA_STATE_ONE_BITRATE    = 0;
const BOLA_STATE_STARTUP        = 1;
const BOLA_STATE_STEADY         = 2;
const BOLA_DEBUG = false; // TODO: remove

const MINIMUM_BUFFER_S = 10; // BOLA should never add artificial delays if buffer is less than MINIMUM_BUFFER_S.
const BUFFER_TARGET_S = 30; // If Schedule Controller does not allow buffer level to reach BUFFER_TARGET_S, this can be a virtual buffer level.
const REBUFFER_SAFETY_FACTOR = 0.5; // Used when buffer level is dangerously low, might happen often in live streaming.

function BolaRule(config) {

    const AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_LIVE = 2;
    const AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_VOD = 3;

    let context = this.context;
    let log = Debug(context).getInstance().log;
    let dashMetrics = config.dashMetrics;
    let metricsModel = config.metricsModel;
    let eventBus = EventBus(context).getInstance();

    let instance,
        lastCallTimeDict,
        eventMediaTypes,
        mediaPlayerModel,
        playbackController,
        adapter;

    function setup() {
        lastCallTimeDict = {};
        eventMediaTypes = [];
        mediaPlayerModel = MediaPlayerModel(context).getInstance();
        playbackController = PlaybackController(context).getInstance();
        adapter = DashAdapter(context).getInstance();
        eventBus.on(Events.BUFFER_EMPTY, onBufferEmpty, instance);
        eventBus.on(Events.PLAYBACK_SEEKING, onPlaybackSeeking, instance);
        eventBus.on(Events.PERIOD_SWITCH_STARTED, onPeriodSwitchStarted, instance);
    }

    function utilitiesFromBitrates(bitrates) {
        return bitrates.map(b => Math.log(b));
        // no need to worry about offset, any offset will be compensated for by gp
    }

    // NOTE: in live streaming, the real buffer level can drop below minimumBufferS, but bola should not stick to lowest bitrate by using a virtual buffer level
    function calculateParameters(minimumBufferS, bufferTargetS, bitrates, utilities) {
        let highest_utility_index = NaN;
        if (!utilities) {
            utilities = utilitiesFromBitrates(bitrates);
            highest_utility_index = utilities.length - 1;
        } else {
            highest_utility_index = 0;
            utilities.forEach((u, i) => {if (u > utilities[highest_utility_index]) highest_utility_index = i;});
        }

        if (highest_utility_index === 0) {
            // if highest_utility_index === 0, then always use lowest bitrate
            return null;
        }

        // TODO: Investigate if following can be better if utilities are not the default Math.log utilities.
        // If using Math.log utilities, we can choose Vp and gp to always prefer bitrates[0] at minimumBufferS and bitrates[max] at bufferTargetS.
        // (Vp * (utility + gp) - buffer_level) / bitrate has the maxima described when:
        // Vp * (utilities[0] + gp - 1) = minimumBufferS and Vp * (utilities[max] + gp - 1) = bufferTargetS
        // giving:
        let gp = 1 - utilities[0] + (utilities[highest_utility_index] - utilities[0]) / (bufferTargetS / minimumBufferS - 1);
        let Vp = minimumBufferS / (utilities[0] + gp - 1);

        return {utilities: utilities, gp: gp, Vp: Vp};
    }

    function calculateInitialState(rulesContext) {
        let initialState = {};

        let mediaInfo = rulesContext.getMediaInfo();

        let streamProcessor = rulesContext.getStreamProcessor();
        let streamInfo = rulesContext.getStreamInfo();
        let trackInfo = rulesContext.getTrackInfo();

        let isDynamic = streamProcessor.isDynamic();
        let duration = streamInfo.manifestInfo.duration;
        let fragmentDuration = trackInfo.fragmentDuration;

        let bitrates = mediaInfo.bitrateList.map(b => b.bandwidth);
        let params = calculateParameters(MINIMUM_BUFFER_S, BUFFER_TARGET_S, bitrates, null);
        if (params === null) {
            // The best soloution is to always use the lowest bitrate...
            initialState.state = BOLA_STATE_ONE_BITRATE;
            return initialState;
        }

        initialState.state                 = BOLA_STATE_STARTUP;

        initialState.bitrates              = bitrates;
        initialState.utilities             = params.utilities;
        initialState.Vp                    = params.Vp;
        initialState.gp                    = params.gp;

        initialState.isDynamic             = isDynamic;
        initialState.movieDuration         = duration;
        initialState.fragmentDuration      = fragmentDuration;
        initialState.bandwidthSafetyFactor = mediaPlayerModel.getBandwidthSafetyFactor();
        initialState.rebufferSafetyFactor  = REBUFFER_SAFETY_FACTOR;
        initialState.bufferTarget          = mediaPlayerModel.getStableBufferTime();

        initialState.lastQuality           = 0;
        initialState.virtualBuffer         = 0;
        initialState.throughputCount       = (isDynamic ? AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_LIVE : AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_VOD);

        if (BOLA_DEBUG) {
            let info = '';
            for (let i = 0; i < bitrates.length; ++i) {
                let u  = params.utilities[i];
                let b  = bitrates[i];
                let th = 0;
                if (i > 0) {
                    let u1 = params.utilities[i - 1];
                    let b1 = bitrates[i - 1];
                    th  = params.Vp * ((u1 * b - u * b1) / (b - b1) + params.gp);
                }
                let z = params.Vp * (u + params.gp);
                info += '\n' + i + ':' + (0.000001 * bitrates[i]).toFixed(3) + 'Mbps ' + th.toFixed(3) + '/' + z.toFixed(3);
            }
            log('BolaDebug ' + mediaInfo.type + ' bitrates' + info);
        }

        return initialState;
    }

    function getQualityFromBufferLevel(bolaState, bufferLevel) {
        let bitrateCount = bolaState.bitrates.length;
        let quality = NaN;
        let score = NaN;
        for (let i = 0; i < bitrateCount; ++i) {
            let s = (bolaState.Vp * (bolaState.utilities[i] + bolaState.gp) - bufferLevel) / bolaState.bitrates[i];
            if (isNaN(score) || s >= score) {
                score = s;
                quality = i;
            }
        }
        return quality;
    }

    function getLastHttpRequests(metrics, count) {
        let allHttpRequests = dashMetrics.getHttpRequests(metrics);
        let httpRequests = [];

        for (let i = allHttpRequests.length - 1; i >= 0 && httpRequests.length < count; --i) {
            let request = allHttpRequests[i];
            if (request.type === HTTPRequest.MEDIA_SEGMENT_TYPE && request._tfinish && request.tresponse && request.trace) {
                httpRequests.push(request);
            }
        }

        return httpRequests;
    }

    function getRecentThroughput(metrics, count, mediaType) { // TODO: mediaType only used for debugging, remove it
        let lastRequests = getLastHttpRequests(metrics, count);
        if (lastRequests.length === 0) {
            return 0;
        }

        let totalInverse = 0;
        let msg = '';
        for (let i = 0; i < lastRequests.length; ++i) {
            // The RTT delay results in a lower throughput. We can avoid this delay in the calculation, but we do not want to.
            let downloadSeconds = 0.001 * (lastRequests[i]._tfinish.getTime() - lastRequests[i].trequest.getTime());
            let downloadBits = 8 * lastRequests[i].trace.reduce((prev, cur) => (prev + cur.b[0]), 0);
            if (BOLA_DEBUG) msg += ' ' + (0.000001 * downloadBits).toFixed(3) + '/' + downloadSeconds.toFixed(3) + '=' + (0.000001 * downloadBits / downloadSeconds).toFixed(3) + 'Mbps';
            totalInverse += downloadSeconds / downloadBits;
        }

        if (BOLA_DEBUG) log('BolaDebug ' + mediaType + ' BolaRule recent throughput = ' + (lastRequests.length / (1000000 * totalInverse)).toFixed(3) + 'Mbps:' + msg);

        return lastRequests.length / totalInverse;
    }

    function getQualityFromThroughput(bolaState, throughput) {
        // do not factor in bandwidthSafetyFactor here - it is factored at point of function invocation

        let q = 0;

        bolaState.bitrates.some(function (value, index) {
            if (value > throughput) {
                return true;
            }
            q = index;
            return false;
        });

        return q;
    }

    function getDelayFromLastFragmentInSeconds(metrics, mediaType) {
        let lastRequests = getLastHttpRequests(metrics, 1);
        if (lastRequests.length === 0) {
            return 0;
        }
        let lastRequest = lastRequests[0];
        let nowMs = Date.now();
        let lastRequestFinishMs = lastRequest._tfinish.getTime();

        if (lastRequestFinishMs > nowMs) {
            // this shouldn't happen, try to handle gracefully
            lastRequestFinishMs = nowMs;
        }

        // return the time since the finish of the last request.
        // The return will be added cumulatively to the virtual buffer, so we must be sure not to add the same delay twice.

        let lctMs = lastCallTimeDict[mediaType];
        lastCallTimeDict[mediaType] = nowMs;
        let delayMs = 0;
        if (lctMs && lctMs > lastRequestFinishMs) {
            delayMs = nowMs - lctMs;
        } else {
            delayMs = nowMs - lastRequestFinishMs;
        }

        if (delayMs <= 0)
            return 0;
        return 0.001 * delayMs;
    }

    function onBufferEmpty() {
        if (BOLA_DEBUG) log('BolaDebug BUFFER_EMPTY');
        // if we rebuffer, we don't want the virtual buffer to artificially raise BOLA quality
        eventMediaTypes.forEach(function (mediaType) {
            let metrics = metricsModel.getReadOnlyMetricsFor(mediaType);
            if (metrics.BolaState.length !== 0) {
                let bolaState = metrics.BolaState[0]._s;
                if (bolaState.state === BOLA_STATE_STEADY) {
                    bolaState.virtualBuffer = 0;
                    metricsModel.updateBolaState(mediaType, bolaState);
                }
            }
        });
    }

    function onPlaybackSeeking(e) {
        if (BOLA_DEBUG) log('BolaDebug PLAYBACK_SEEKING ' + e.seekTime.toFixed(3));
        // TODO: 1. Verify what happens if we seek mid-fragment.
        // TODO: 2. If e.g. we have 10s fragments and seek, we might want to download the first fragment at a lower quality to restart playback quickly.
        eventMediaTypes.forEach(function (mediaType) {
            let metrics = metricsModel.getReadOnlyMetricsFor(mediaType);
            if (metrics.BolaState.length !== 0) {
                let bolaState = metrics.BolaState[0]._s;
                if (bolaState.state !== BOLA_STATE_ONE_BITRATE) {
                    bolaState.state = BOLA_STATE_STARTUP;
                }
                metricsModel.updateBolaState(mediaType, bolaState);
            }
        });
    }

    function onPeriodSwitchStarted() {
        // TODO
    }

    function execute(rulesContext, callback) {
        let streamProcessor = rulesContext.getStreamProcessor();
        streamProcessor.getScheduleController().setTimeToLoadDelay(0);

        let switchRequest = SwitchRequest(context).create(SwitchRequest.NO_CHANGE, SwitchRequest.WEAK, {name: BolaRule.__dashjs_factory_name});

        let mediaInfo = rulesContext.getMediaInfo();
        let mediaType = mediaInfo.type;
        let metrics = metricsModel.getReadOnlyMetricsFor(mediaType);

        if (metrics.BolaState.length === 0) {
            // initialization

            if (BOLA_DEBUG) log('BolaDebug ' + mediaType + '\nBolaDebug ' + mediaType + ' BolaRule for state=- fragmentStart=' + adapter.getIndexHandlerTime(rulesContext.getStreamProcessor()).toFixed(3));

            let initState = calculateInitialState(rulesContext);
            metricsModel.updateBolaState(mediaType, initState);

            let q = 0;
            if (initState.state !== BOLA_STATE_ONE_BITRATE) {
                // initState.state === BOLA_STATE_STARTUP

                eventMediaTypes.push(mediaType);

                // Bola is not invoked by dash.js to determine the bitrate quality for the first fragment. We might estimate the throughput level here, but the metric related to the HTTP request for the first fragment is usually not available.
                // TODO: at some point, we may want to consider a tweak that redownloads the first fragment at a higher quality

                let initThroughput = getRecentThroughput(metrics, initState.throughputCount, mediaType);
                if (initThroughput === 0) {
                    // We don't have information about any download yet - let someone else decide quality.
                    if (BOLA_DEBUG) log('BolaDebug ' + mediaType + ' BolaRule quality unchanged for INITIALIZE');
                    callback(switchRequest);
                    return;
                }
                q = getQualityFromThroughput(initState, initThroughput * initState.bandwidthSafetyFactor);
                initState.lastQuality = q;
                switchRequest.value = q;
                switchRequest.priority = SwitchRequest.DEFAULT;
                switchRequest.reason.state = initState.state;
                switchRequest.reason.throughput = initThroughput;
            }

            if (BOLA_DEBUG) log('BolaDebug ' + mediaType + ' BolaRule quality ' + q + ' for INITIALIZE');
            callback(switchRequest);
            return;
        } // initialization

        // metrics.BolaState.length > 0
        let bolaState = metrics.BolaState[0]._s;
        // TODO: does changing bolaState conform to coding style, or should we clone?

        if (bolaState.state === BOLA_STATE_ONE_BITRATE) {
            if (BOLA_DEBUG) log('BolaDebug ' + mediaType + ' BolaRule quality 0 for ONE_BITRATE');
            callback(switchRequest);
            return;
        }

        let bitrates = bolaState.bitrates;
        let utilities = bolaState.utilities;

        if (BOLA_DEBUG) log('BolaDebug ' + mediaType + '\nBolaDebug ' + mediaType + ' EXECUTE BolaRule for state=' + bolaState.state + ' fragmentStart=' + adapter.getIndexHandlerTime(rulesContext.getStreamProcessor()).toFixed(3));

        let bufferLevel = dashMetrics.getCurrentBufferLevel(metrics) ? dashMetrics.getCurrentBufferLevel(metrics) : 0;
        let recentThroughput = getRecentThroughput(metrics, bolaState.throughputCount, mediaType);

        if (bufferLevel <= 0.1) {
            // rebuffering occurred, reset virtual buffer
            bolaState.virtualBuffer = 0;
        }

        // find out if there was delay because of lack of availability or because buffer level > bufferTarget
        let timeSinceLastDownload = getDelayFromLastFragmentInSeconds(metrics, mediaType);
        if (timeSinceLastDownload > 0) { // TODO: maybe we should set some positive threshold here
            bolaState.virtualBuffer += timeSinceLastDownload;
        }
        if (bolaState.virtualBuffer < 0) {
            bolaState.virtualBuffer = 0;
        }

        let effectiveBufferLevel = bufferLevel + bolaState.virtualBuffer;
        let bolaQuality = getQualityFromBufferLevel(bolaState, effectiveBufferLevel);

        if (BOLA_DEBUG) log('BolaDebug ' + mediaType + ' BolaRule bufferLevel=' + bufferLevel.toFixed(3) + '(+' + bolaState.virtualBuffer.toFixed(3) + '=' + effectiveBufferLevel.toFixed(3) + ') recentThroughput=' + (0.000001 * recentThroughput).toFixed(3) + ' tentativeQuality=' + bolaQuality);

        if (bolaState.state === BOLA_STATE_STARTUP) {
            // in startup phase, use some throughput estimation

            let q = getQualityFromThroughput(bolaState, recentThroughput * bolaState.bandwidthSafetyFactor);

            if (bufferLevel > bolaState.fragmentDuration / REBUFFER_SAFETY_FACTOR) {
                // only switch to steady state if we believe we have enough buffer to not trigger quality drop to a safeBitrate
                bolaState.state = BOLA_STATE_STEADY;

                let wantEffectiveBuffer = 0;
                for (let i = 0; i < q; ++i) {
                    // We want minimum effective buffer (bufferLevel + virtualBuffer) that gives a higher score for q when compared with any other i < q.
                    // We want
                    //     (Vp * (utilities[q] + gp) - bufferLevel) / bitrates[q]
                    // to be >= any score for i < q.
                    // We get score equality for q and i when:
                    let b = bolaState.Vp * (bolaState.gp + (bitrates[q] * utilities[i] - bitrates[i] * utilities[q]) / (bitrates[q] - bitrates[i]));
                    if (b > wantEffectiveBuffer) {
                        wantEffectiveBuffer = b;
                    }
                }
                if (wantEffectiveBuffer > bufferLevel) {
                    bolaState.virtualBuffer = wantEffectiveBuffer - bufferLevel;
                }
            }

            if (BOLA_DEBUG) log('BolaDebug ' + mediaType + ' BolaRule quality ' + q + ' for STARTUP');
            bolaState.lastQuality = q;
            metricsModel.updateBolaState(mediaType, bolaState);
            switchRequest.value = q;
            switchRequest.priority = SwitchRequest.DEFAULT;
            switchRequest.reason.state = BOLA_STATE_STARTUP;
            switchRequest.reason.throughput = recentThroughput;
            callback(switchRequest);
            return;
        }

        // steady state

        // we want to avoid oscillations
        // We implement the "BOLA-O" variant: when network bandwidth lies between two encoded bitrate levels, stick to the lowest level.
        if (bolaQuality > bolaState.lastQuality) {
            // do not multiply throughput by bandwidthSafetyFactor here: we are not using throughput estimation but capping bitrate to avoid oscillations
            let q = getQualityFromThroughput(bolaState, recentThroughput);
            if (bolaQuality > q) {
                // only intervene if we are trying to *increase* quality to an *unsustainable* level

                if (q < bolaState.lastQuality) {
                    // we are only avoid oscillations - do not drop below last quality
                    q = bolaState.lastQuality;
                }
                // We are dropping to an encoding bitrate which is a little less than the network bandwidth because bitrate levels are discrete. Quality q might lead to buffer inflation, so we deflate buffer to the level that q gives postive utility. This delay will be added below.
                bolaQuality = q;
            }
        }

        // Try to make sure that we can download a chunk without rebuffering. This is especially important for live streaming.
        if (recentThroughput > 0) {
            // We can only perform this check if we have a throughput estimate.
            let safeBitrate = REBUFFER_SAFETY_FACTOR * recentThroughput * bufferLevel / bolaState.fragmentDuration;
            while (bolaQuality > 0 && bitrates[bolaQuality] > safeBitrate) {
                --bolaQuality;
            }
        }

        // We do not want to overfill buffer with low quality chunks.
        // Note that there will be no delay if buffer level is below MINIMUM_BUFFER_S, probably even with some margin higher than MINIMUM_BUFFER_S.
        let delaySeconds = 0;
        let wantBufferLevel = bolaState.Vp * (utilities[bolaQuality] + bolaState.gp);
        delaySeconds = effectiveBufferLevel - wantBufferLevel;
        if (delaySeconds > 0) {
            // First reduce virtual buffer.
            // Note that this "delay" is the main mechanism of depleting virtualBuffer - the real buffer is depleted by playback.
            if (delaySeconds > bolaState.virtualBuffer) {
                delaySeconds -= bolaState.virtualBuffer;
                bolaState.virtualBuffer = 0;
            } else {
                bolaState.virtualBuffer -= delaySeconds;
                delaySeconds = 0;
            }
        }
        if (delaySeconds > 0) {
            // After depleting all virtual buffer, set delay.
            if (bolaQuality === bitrates.length - 1) {
                // At top quality, allow schedule controller to decide how far to fill buffer.
                delaySeconds = 0;
            } else {
                streamProcessor.getScheduleController().setTimeToLoadDelay(1000 * delaySeconds);
            }
        } else {
            delaySeconds = 0;
        }

        bolaState.lastQuality = bolaQuality;
        metricsModel.updateBolaState(mediaType, bolaState);

        switchRequest.value = bolaQuality;
        switchRequest.priority = SwitchRequest.DEFAULT;
        switchRequest.reason.state = bolaState.state;
        switchRequest.reason.throughput = recentThroughput;
        switchRequest.reason.bufferLevel = bufferLevel;

        if (BOLA_DEBUG) log('BolaDebug ' + mediaType + ' BolaRule quality ' + bolaQuality + ' delay=' + delaySeconds.toFixed(3) + ' for STEADY');
        callback(switchRequest);
    }

    function reset() {
        eventBus.off(Events.BUFFER_EMPTY, onBufferEmpty, instance);
        eventBus.off(Events.PLAYBACK_SEEKING, onPlaybackSeeking, instance);
        eventBus.off(Events.PERIOD_SWITCH_STARTED, onPeriodSwitchStarted, instance);
        setup();
    }

    instance = {
        execute: execute,
        reset: reset
    };

    setup();
    return instance;
}

BolaRule.__dashjs_factory_name = 'BolaRule';
let factory = FactoryMaker.getClassFactory(BolaRule);
factory.BOLA_STATE_ONE_BITRATE    = BOLA_STATE_ONE_BITRATE;
factory.BOLA_STATE_STARTUP        = BOLA_STATE_STARTUP;
factory.BOLA_STATE_STEADY         = BOLA_STATE_STEADY;
factory.BOLA_DEBUG = BOLA_DEBUG; // TODO: remove
export default factory;
