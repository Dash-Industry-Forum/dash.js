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

import SwitchRequest from '../SwitchRequest.js';
import FactoryMaker from '../../../core/FactoryMaker.js';
import MediaPlayerModel from '../../models/MediaPlayerModel.js';
import PlaybackController from '../../controllers/PlaybackController.js';
import HTTPRequest from '../../vo/metrics/HTTPRequest.js';
import DashAdapter from '../../../dash/DashAdapter.js';
import EventBus from '../../../core/EventBus.js';
import Events from '../../../core/events/Events.js';

// BOLA_STATE_ONE_BITRATE   : If there is only one bitrate (or initialization failed), always return NO_CHANGE.
// BOLA_STATE_STARTUP       : Download fragments at most recently measured throughput.
// BOLA_STATE_STARTUP_NO_INC: If quality increased then decreased during startup, then quality cannot be increased.
// BOLA_STATE_STEADY        : Buffer primed, we switch to steady operation.
// TODO: add BOLA_STATE_SEEK and tune Bola behavior on seeking
const BOLA_STATE_ONE_BITRATE    = 0;
const BOLA_STATE_STARTUP        = 1;
const BOLA_STATE_STARTUP_NO_INC = 2;
const BOLA_STATE_STEADY         = 3;
const BOLA_DEBUG = false; // TODO: remove

function BolaRule(config) {

    // Bola needs some space between buffer levels.
    const MINIMUM_BUFFER_LEVEL_SPACING = 5.0;

    let context = this.context;
    let dashMetrics = config.dashMetrics;
    let metricsModel = config.metricsModel;
    let eventBus = EventBus(context).getInstance();

    let instance,
        seekMediaTypes,
        mediaPlayerModel,
        playbackController,
        adapter;

    function setup() {
        seekMediaTypes = [];
        mediaPlayerModel = MediaPlayerModel(context).getInstance();
        playbackController = PlaybackController(context).getInstance();
        adapter = DashAdapter(context).getInstance();
        eventBus.on(Events.PLAYBACK_SEEKING, onPlaybackSeeking, instance);
    }

    function calculateInitialState(rulesContext) {
        // TODO: analyze behavior of weird inputs and handle as gracefully as possible

        let initialState = {};

        let mediaInfo = rulesContext.getMediaInfo();

        let bitrate = mediaInfo.bitrateList;
        let bitrateCount = bitrate.length;
        if (bitrateCount < 2 || bitrate[0] >= bitrate[1] || bitrate[bitrateCount -  2] >= bitrate[bitrateCount - 1]) {
            // if bitrate list irregular, stick to lowest bitrate
            // TODO: should we tolerate repeated bitrates?
            initialState.state = BOLA_STATE_ONE_BITRATE;
            return initialState;
        }

        let streamProcessor = rulesContext.getStreamProcessor();
        let streamInfo = rulesContext.getStreamInfo();
        let trackInfo = rulesContext.getTrackInfo();

        let isDynamic = streamProcessor.isDynamic();
        let duration = streamInfo.manifestInfo.duration;
        let fragmentDuration = trackInfo.fragmentDuration;

        let bufferTarget;
        let bufferMax;
        // Note: If isDynamic (live streaming) we keep the same target for cases where the user is playing behind live edge, but then make throughput-based decisions when the buffer level is low because of availability.
        bufferTarget = mediaPlayerModel.getStableBufferTime();
        if (duration >= mediaPlayerModel.getLongFormContentDurationThreshold()) {
            bufferMax = mediaPlayerModel.getBufferTimeAtTopQualityLongForm();
        } else {
            bufferMax = mediaPlayerModel.getBufferTimeAtTopQuality();
        }

        // During live streaming, there might not be enough fragments available to fill all the way to the buffer target. In such a case, Bola detects the lack of fragment availability and calculate a bitrate depending on what the buffer level would have been had more fragments been available. This is done by keeping an additional virtualBuffer level. Of course, in such a case Bola needs to also keep track of the real buffer to avoid rebuffering.

        // Bola needs some space between buffer levels. If bolaBufferTarget is set to a level higher than the real bufferTarget, the Schedule Controller will still not fill up the buffer up to bolaBufferTarget. However, Bola will detect the effect of the Schedule Controller and calculate a bitrate depending on what the buffer level would have been had the Schedule Controller filled more buffer. This is handled similar to the live streaming scenario using the additional virtualBuffer level.
        let bolaBufferTarget = bufferTarget;
        if (bolaBufferTarget < fragmentDuration + MINIMUM_BUFFER_LEVEL_SPACING) {

            bolaBufferTarget = fragmentDuration + MINIMUM_BUFFER_LEVEL_SPACING;
        }

        let utility = [];
        for (let i = 0; i < bitrateCount; ++i) {
            utility.push(Math.log(bitrate[i] / bitrate[0]));
        }

        // BOLA parameters V and gamma (multiplied by p === fragmentDuration):
        // Choose Vp and gp such that logarithmic utility would always prefer the lowest bitrate when bufferLevel === fragmentDuration and would always prefer the highest bitrate when bufferLevel === bufferTarget.
        // TODO: document the math
        let Vp = (bolaBufferTarget - fragmentDuration) / utility[bitrateCount - 1];
        let gp = 1.0 + utility[bitrateCount - 1] / (bolaBufferTarget / fragmentDuration - 1.0);

        // If the bufferTarget (the real bufferTarget and not bolaBufferTarget) is large enough, we might guarantee that Bola will never rebuffer unless the network bandwidth drops below the lowest encoded bitrate level. For this to work Bola needs to use the real buffer level without the additional virtualBuffer. Also, for this to work efficiently, we need to make sure that if the buffer level drops to one fragment during a download, the current download does not have more bits remaining than the size of one fragment at the lowest quality.
        let maxRtt = 0.2; // TODO: is this reasonable?
        let safetyGuarantee = !isDynamic && bolaBufferTarget === bufferTarget;
        if (safetyGuarantee) {
            // TODO: document the math
            // we might need to adjust Vp and gp
            let VpNew = Vp;
            let gpNew = gp;
            for (let i = 1; i < bitrateCount; ++i) {
                let threshold = VpNew * (gpNew - bitrate[0] * utility[i] / (bitrate[i] - bitrate[0]));
                let minThreshold = fragmentDuration * (2.0 - bitrate[0] / bitrate[i]) + maxRtt;
                if (minThreshold >= bufferTarget) {
                    safetyGuarantee = false;
                    break;
                }
                if (threshold < minThreshold) {
                    VpNew *= (bufferTarget - minThreshold) / (bufferTarget - threshold);
                    gpNew = minThreshold / VpNew + utility[i] * bitrate[0] / (bitrate[i] - bitrate[0]);
                }
            }
            if (safetyGuarantee && (bufferTarget - fragmentDuration) * VpNew / Vp < MINIMUM_BUFFER_LEVEL_SPACING) {
                safetyGuarantee = false;
            }
            if (safetyGuarantee) {
                Vp = VpNew;
                gp = gpNew;
            }
        }

        // When using the virtualBuffer, it must be capped.
        // TODO: document the math
        let bolaBufferMax = Vp * (utility[bitrateCount - 1] + gp);

        // Note: We either use the virtualBuffer or the safetyGuarantee, but not both.

        initialState.state                 = BOLA_STATE_STARTUP;

        initialState.bitrate               = bitrate;
        initialState.utility               = utility;
        initialState.Vp                    = Vp;
        initialState.gp                    = gp;

        initialState.fragmentDuration      = fragmentDuration;
        initialState.bandwidthSafetyFactor = mediaPlayerModel.getBandwidthSafetyFactor();
        initialState.bufferTarget          = bufferTarget;
        initialState.bufferMax             = bufferMax;
        initialState.bolaBufferTarget      = bolaBufferTarget;
        initialState.bolaBufferMax         = bolaBufferMax;

        initialState.isDynamic             = isDynamic;
        initialState.safetyGuarantee       = safetyGuarantee;
        initialState.lastQuality           = 0;
        initialState.virtualBuffer         = 0.0;

        return initialState;
    }

    function getQualityFromBufferLevel(bolaState, bufferLevel) {
        let bitrateCount = bolaState.bitrate.length;
        let quality = bitrateCount - 1;
        let score = 0.0;
        for (let i = 0; i < bitrateCount; ++i) {
            let s = (bolaState.utility[i] + bolaState.gp - bufferLevel / bolaState.Vp) / bolaState.bitrate[i];
            if (s > score) {
                score = s;
                quality = i;
            }
        }
        return quality;
    }

    function getLastHttpRequest(metrics) {
        let httpRequests = dashMetrics.getHttpRequests(metrics);
        for (let i = httpRequests.length - 1; i >= 0; --i) {
            let request = httpRequests[i];
            if (request.type === HTTPRequest.MEDIA_SEGMENT_TYPE && request._tfinish && request.tresponse) {
                return request;
            }
        }
        return null;
    }

    function getLastThroughput(metrics, mediaType) { // TODO: mediaType only used for debugging, remove it
        // TODO: Should we replace this with an average of the last few throughputs?
        let lastRequest = getLastHttpRequest(metrics);
        if (!lastRequest) {
            return 0.0;
        }

        // The RTT delay results in a lower throughput. We can avoid this delay in the calculation, but we do not want to.
        let downloadSeconds = 0.001 * (lastRequest._tfinish.getTime() - lastRequest.trequest.getTime());
        let downloadBits = 8 * lastRequest.trace.reduce(function (a, b) {
            return a + b.b[0];
        }, 0);

        if (BOLA_DEBUG) console.log('BolaDebug ' + mediaType + ' BolaRule last throughput = ' + (downloadBits / 1000000).toFixed(3) + '/' + downloadSeconds.toFixed(3) + '=' + (downloadBits / downloadSeconds / 1000000).toFixed(3));

        return downloadBits / downloadSeconds;
    }

    function getQualityFromThroughput(bolaState, throughput) {
        // do not factor in bandwidthSafetyFactor here - it is factored at point of call

        let q = 0;
        for (let i = 1; i < bolaState.bitrate.length; ++i) {
            if (bolaState.bitrate[i] > throughput) {
                break;
            }
            q = i;
        }
        return q;
    }

    function getDelayFromLastFragmentInSeconds(metrics) {
        let lastRequest = getLastHttpRequest(metrics);
        if (!lastRequest) {
            return 0.0;
        }
        let nowMilliSeconds = new Date().getTime();
        let lastRequestFinishMilliSeconds = lastRequest._tfinish.getTime();
        let delayMilliSeconds = nowMilliSeconds - lastRequestFinishMilliSeconds;

        if (delayMilliSeconds < 0.0)
            return 0.0;
        return 0.001 * delayMilliSeconds;
    }

    function onPlaybackSeeking() {
        // TODO: Verify what happens if we seek mid-fragment.
        // TODO: If we have 10s fragments and seek, we would like to download the first fragment at a lower quality to restart playback quickly.
        for (let i = 0; i < seekMediaTypes.length; ++i) {
            let mediaType = seekMediaTypes[i];
            let metrics = metricsModel.getReadOnlyMetricsFor(mediaType);
            if (metrics.BolaState.length !== 0) {
                let bolaState = metrics.BolaState[0]._s;
                if (bolaState.state !== BOLA_STATE_ONE_BITRATE) {
                    bolaState.state = BOLA_STATE_STARTUP;
                }
                metricsModel.updateBolaState(mediaType, bolaState);
            }
        }
    }

    function execute(rulesContext, callback) {
        let streamProcessor = rulesContext.getStreamProcessor();
        streamProcessor.getScheduleController().setTimeToLoadDelay(0.0);

        let switchRequest = SwitchRequest(context).create(SwitchRequest.NO_CHANGE, SwitchRequest.WEAK);

        let mediaInfo = rulesContext.getMediaInfo();
        let mediaType = mediaInfo.type;
        let metrics = metricsModel.getReadOnlyMetricsFor(mediaType);

        if (metrics.BolaState.length === 0) {
            // initialization

            if (BOLA_DEBUG) console.log('BolaDebug ' + mediaType + '\nBolaDebug ' + mediaType + ' BolaRule for state=- fragmentStart=' + adapter.getIndexHandlerTime(rulesContext.getStreamProcessor()).toFixed(3));

            let initState = calculateInitialState(rulesContext);
            metricsModel.updateBolaState(mediaType, initState);

            let q = 0;
            if (initState.state !== BOLA_STATE_ONE_BITRATE) {
                // initState.state === BOLA_STATE_STARTUP

                seekMediaTypes.push(mediaType);

                // Bola is not invoked by dash.js to determine the bitrate quality of the first fragment. We might estimate the throughput level here, but the metric related to the HTTP request for the first fragment is usually not available.
                // TODO: at some point, we may want to consider a tweak that redownloads the first fragment at a higher quality

                let initThroughput = getLastThroughput(metrics, mediaType);
                q = getQualityFromThroughput(initState, initThroughput * initState.bandwidthSafetyFactor);
                initState.lastQuality = q;
                switchRequest = SwitchRequest(context).create(q, SwitchRequest.DEFAULT);
            }

            if (BOLA_DEBUG) console.log('BolaDebug ' + mediaType + ' BolaRule quality ' + q + ' for INITIALIZE');
            callback(switchRequest);
            return;
        }

        // metrics.BolaState.length > 0
        let bolaState = metrics.BolaState[0]._s;
        // TODO: does changing bolaState conform to coding style, or should we clone?

        if (bolaState.state === BOLA_STATE_ONE_BITRATE) {
            if (BOLA_DEBUG) console.log('BolaDebug ' + mediaType + ' BolaRule quality 0 for ONE_BITRATE');
            callback(switchRequest);
            return;
        }

        if (BOLA_DEBUG) console.log('BolaDebug ' + mediaType + '\nBolaDebug ' + mediaType + ' EXECUTE BolaRule for state=' + bolaState.state + ' fragmentStart=' + adapter.getIndexHandlerTime(rulesContext.getStreamProcessor()).toFixed(3));

        let bufferLevel = dashMetrics.getCurrentBufferLevel(metrics) ? dashMetrics.getCurrentBufferLevel(metrics) : 0.0;
        let bolaQuality = getQualityFromBufferLevel(bolaState, bufferLevel);
        let lastThroughput = getLastThroughput(metrics, mediaType);

        if (BOLA_DEBUG) console.log('BolaDebug ' + mediaType + ' BolaRule bufferLevel=' + bufferLevel.toFixed(3) + '(+' + bolaState.virtualBuffer.toFixed(3) + ') lastThroughput=' + (lastThroughput / 1000000.0).toFixed(3) + ' tentativeQuality=' + bolaQuality + ',' + getQualityFromBufferLevel(bolaState, bufferLevel + bolaState.virtualBuffer));

        if (bufferLevel <= 0.1) {
            // rebuffering occurred, reset virtual buffer
            bolaState.virtualBuffer = 0.0;
        }

        if (!bolaState.safetyGuarantee) { // we can use virtualBuffer
            // find out if there was delay because of lack of availability or because bolaBufferTarget > bufferTarget
            let timeSinceLastDownload = getDelayFromLastFragmentInSeconds(metrics);
            if (timeSinceLastDownload > 0.1) {
                bolaState.virtualBuffer += timeSinceLastDownload;
            }
            if (bufferLevel + bolaState.virtualBuffer > bolaState.bolaBufferMax) {
                bolaState.virtualBuffer = bolaState.bolaBufferMax - bufferLevel;
            }
            if (bolaState.virtualBuffer < 0.0) { // shouldn't really happen, but just making sure
                bolaState.virtualBuffer = 0.0;
            }

            // update bolaQuality using virtualBuffer: bufferLevel might be artificially low because of lack of availability

            let bolaQualityVirtual = getQualityFromBufferLevel(bolaState, bufferLevel + bolaState.virtualBuffer);
            if (bolaQualityVirtual > bolaQuality) {
                // May use quality higher than that indicated by real buffer level.

                // In this case, make sure there is enough throughput to download a fragment before real buffer runs out.

                let maxQuality = bolaQuality;
                while (maxQuality < bolaQualityVirtual &&
                       (bolaState.bitrate[maxQuality + 1] * bolaState.fragmentDuration) /
                       (lastThroughput * bolaState.bandwidthSafetyFactor) < bufferLevel
                      ) {
                    ++maxQuality;
                }

                // TODO: maybe we can use a more conservative level here, but this should be OK

                if (maxQuality > bolaQuality) {
                    // We can (and will) download at a quality higher than that indicated by real buffer level.
                    if (bolaQualityVirtual <= maxQuality) {
                        // we can download fragment indicated by real+virtual buffer without rebuffering
                        bolaQuality = bolaQualityVirtual;
                    } else {
                        // downloading fragment indicated by real+virtual rebuffers, use lower quality
                        bolaQuality = maxQuality;
                        // deflate virtual buffer to match quality
                        // TODO: document the math
                        let s  = bolaState.bitrate[maxQuality];     // relative size
                        let s1 = bolaState.bitrate[maxQuality + 1]; // relative size
                        let u  = bolaState.utility[maxQuality];
                        let u1 = bolaState.utility[maxQuality + 1];
                        let targetBufferLevel = bolaState.Vp * (bolaState.gp + (s1 * u - s * u1) / (s1 - s));
                        if (bufferLevel + bolaState.virtualBuffer > targetBufferLevel) { // should be true
                            bolaState.virtualBuffer = targetBufferLevel - bufferLevel;
                            if (bolaState.virtualBuffer < 0.0) { // should be false
                                bolaState.virtualBuffer = 0.0;
                            }
                        }
                    }
                }
            }
        } // !bolaState.safetyGuarantee: we can use virtualBuffer

        if (bolaState.state === BOLA_STATE_STARTUP || bolaState.state === BOLA_STATE_STARTUP_NO_INC) {
            // in startup phase, use some throughput estimation

            let q = getQualityFromThroughput(bolaState, lastThroughput * bolaState.bandwidthSafetyFactor);

            if (lastThroughput <= 0.0) {
                // something went wrong - go to steady state
                bolaState.state = BOLA_STATE_STEADY;
            }
            if (bolaState.state === BOLA_STATE_STARTUP && q < bolaState.lastQuality) {
                // Since the quality is decreasing during startup, it will not be allowed to increase again.
                bolaState.state = BOLA_STATE_STARTUP_NO_INC;
            }
            if (bolaState.state === BOLA_STATE_STARTUP_NO_INC && q > bolaState.lastQuality) {
                // In this state the quality is not allowed to increase until steady state.
                q = bolaState.lastQuality;
            }
            if (q <= bolaQuality) {
                // Since the buffer is full enough for steady state operation to match startup operation, switch over to steady state.
                bolaState.state = BOLA_STATE_STEADY;
            }
            if (bolaState.state !== BOLA_STATE_STEADY) {
                // still in startup mode
                if (BOLA_DEBUG) console.log('BolaDebug ' + mediaType + ' BolaRule quality ' + q + '>' + bolaQuality + ' for STARTUP');
                bolaState.lastQuality = q;
                metricsModel.updateBolaState(mediaType, bolaState);
                switchRequest = SwitchRequest(context).create(q, SwitchRequest.DEFAULT);
                callback(switchRequest);
                return;
            }
        }

        // steady state

        // we want to avoid oscillations
        // We implement the "BOLA-O" variant: when network bandwidth lies between two encoded bitrate levels, stick to the lowest level.
        let delaySeconds = 0.0;
        if (bolaQuality > bolaState.lastQuality) {
            // do not multiply throughput by bandwidthSafetyFactor here: we are not using throughput estimation but capping bitrate to avoid oscillations
            let q = getQualityFromThroughput(bolaState, lastThroughput);
            if (bolaQuality > q) {
                // only intervene if we are trying to *increase* quality to an *unsustainable* level

                if (q < bolaState.lastQuality) {
                    // we are only avoid oscillations - do not drop below last quality
                    q = bolaState.lastQuality;
                } else {
                    // We are dropping to an encoded bitrate which is a little less than the network bandwidth because bitrate levels are discrete. Quality q might lead to buffer inflation, so we deflate buffer to the threshold where algorithm would choose quality q over quality q+1.
                    // TODO: document the math
                    let s  = bolaState.bitrate[q];     // relative size
                    let s1 = bolaState.bitrate[q + 1]; // relative size
                    let u  = bolaState.utility[q];
                    let u1 = bolaState.utility[q + 1];
                    let wantBufferLevel = bolaState.Vp * (bolaState.gp + (s1 * u - s * u1) / (s1 - s));
                    delaySeconds = bufferLevel - wantBufferLevel;
                }
                bolaQuality = q;
            }
        }

        if (delaySeconds > 0.0) {
            // first reduce virtual buffer
            if (delaySeconds > bolaState.virtualBuffer) {
                delaySeconds -= bolaState.virtualBuffer;
                bolaState.virtualBuffer = 0.0;
            } else {
                bolaState.virtualBuffer -= delaySeconds;
                delaySeconds = 0.0;
            }
        }
        if (delaySeconds > 0.0) {
            streamProcessor.getScheduleController().setTimeToLoadDelay(1000.0 * delaySeconds);
        }

        bolaState.lastQuality = bolaQuality;
        metricsModel.updateBolaState(mediaType, bolaState);
        switchRequest = SwitchRequest(context).create(bolaQuality, SwitchRequest.DEFAULT);
        if (BOLA_DEBUG) console.log('BolaDebug ' + mediaType + ' BolaRule quality ' + bolaQuality + ' delay=' + delaySeconds.toFixed(3) + ' for STEADY');
        callback(switchRequest);
    }

    function reset() {
        eventBus.off(Events.PLAYBACK_SEEKING, onPlaybackSeeking, instance);
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
factory.BOLA_STATE_STARTUP_NO_INC = BOLA_STATE_STARTUP_NO_INC;
factory.BOLA_STATE_STEADY         = BOLA_STATE_STEADY;
factory.BOLA_DEBUG = BOLA_DEBUG; // TODO: remove
export default factory;
