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
import SwitchRequest from '../SwitchRequest.js';
import FactoryMaker from '../../../core/FactoryMaker.js';
import MediaPlayerModel from '../../models/MediaPlayerModel.js';
import PlaybackController from '../../controllers/PlaybackController.js';
import HTTPRequest from '../../vo/metrics/HTTPRequest.js';
import DashAdapter from '../../../dash/DashAdapter.js';

function BolaRule(config) {

    // When live streaming (as opposed to VOD), if the last HTTP request finish time happened more than LIVE_DELAY_DETECT_THRESHOLD_MS ago, and the buffer level is below the buffer target, then we guess that there was a delay because of fragment availability.
    const LIVE_DELAY_DETECT_THRESHOLD_S = 0.1;

    let context = this.context;
    let metricsExt = config.metricsExt;
    let metricsModel = config.metricsModel;

    let instance,
        mediaPlayerModel,
        playbackController,
        adapter;

    function setup() {
        mediaPlayerModel = MediaPlayerModel(context).getInstance();
        playbackController = PlaybackController(context).getInstance();
        adapter = DashAdapter(context).getInstance();
    }

    function calculateInitialState(rulesContext) {
        // TODO: analyze behavior of weird inputs and handle as gracefully as possible

        let initialState = {};

        let mediaInfo = rulesContext.getMediaInfo();

        let bitrate = mediaInfo.bitrateList;
        let bitrateCount = bitrate.length;
        if (bitrateCount < 2 || bitrate[0] >= bitrate[1] || bitrate[bitrateCount -  2] >= bitrate[bitrateCount - 1]) {
            // if bitrate list irregular, stick to lowest bitrate
            // TODO: tolerate repeated bitrates
            initialState.state = BolaRule.BOLA_STATE_ONE_BITRATE;
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
        // Note: If isDyanamic (live streaming) we keep the same target for cases where the user is playing behind live edge, but then make throughput-based decisions when the buffer level is low because of availability.
        bufferTarget = mediaPlayerModel.getStableBufferTime();
        if (duration >= mediaPlayerModel.getLongFormContentDurationThreshold()) {
            bufferMax = mediaPlayerModel.getBufferTimeAtTopQualityLongForm();
        } else {
            bufferMax = mediaPlayerModel.getBufferTimeAtTopQuality();
        }

        if (bufferTarget < 3 * fragmentDuration) {
            // bufferTarget is too small to have buffer levels work effectively: use live streaming mode instead
            // TODO: maybe replace this hack by updating Buffer Controller to have higher buffer target, otherwise rename variable below from "live" to something else
            isDynamic = true;
            bufferTarget = 3 * fragmentDuration;
            // TODO: while tests indicate 3*fragmentDuration is sufficient, this may need to be analyzed more rigorously
        }

        let utility = [];
        for (let i = 0; i < bitrateCount; ++i) {
            utility.push(Math.log(bitrate[i] / bitrate[0]));
        }

        // BOLA parameters V and gamma (multiplied by p === fragmentDuration):
        // Choose Vp and gp such that logarithmic utility would always prefer the lowest bitrate when bufferLevel === fragmentDuration and would always prefer the highest bitrate when bufferLevel === bufferTarget.
        // TODO: document arithmetic
        let Vp = (bufferTarget - fragmentDuration) / utility[bitrateCount - 1];
        let gp = 1.0 + utility[bitrateCount - 1] / (bufferTarget / fragmentDuration - 1.0);

        // Make sure that if we prefer downloading at a not-lowest quality that matches the network bandwidth, then the by the time the buffer level drops to 1 fragment we have at most the size of the smallest fragment left to download. Thus we avoid starting a download that will very likely be abandoned.
        // TODO: document the arithmetic
        let maxRTT = 0.2;
        for (let i = 1; i < bitrateCount; ++i) {
            let threshold = Vp * (gp - bitrate[0] * utility[i] / (bitrate[i] - bitrate[0]));
            let minThreshold = fragmentDuration * (2.0 - bitrate[0] / bitrate[i]) + maxRTT;
            if (threshold < minThreshold) {
                Vp *= (bufferTarget - minThreshold) / (bufferTarget - threshold);
                gp = minThreshold / Vp + utility[i] * bitrate[0] / (bitrate[i] - bitrate[0]);
            }
        }

        initialState.state = BolaRule.BOLA_STATE_STARTUP;
        initialState.bitrate = bitrate;
        initialState.utility = utility;
        initialState.fragmentDuration = fragmentDuration;
        initialState.bandwidthSafetyFactor = mediaPlayerModel.getBandwidthSafetyFactor();
        initialState.bufferTarget = bufferTarget;
        initialState.bufferMax = bufferMax;
        initialState.Vp = Vp;
        initialState.gp = gp;
        initialState.live = isDynamic;
        initialState.lastQuality = 0;
        initialState.virtualBuffer = 0.0; // used in live
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
        let httpRequests = metricsExt.getHttpRequests(metrics);
        for (let i = httpRequests.length - 1; i >= 0; --i) {
            let request = httpRequests[i];
            if (request.type === HTTPRequest.MEDIA_SEGMENT_TYPE && request._tfinish && request.tresponse) {
                return request;
            }
        }
        return null;
    }

    function getLastThroughput(metrics) {
        let lastRequest = getLastHttpRequest(metrics);
        if (!lastRequest) {
            return 0.0;
        }

        let downloadSeconds = 0.001 * (lastRequest._tfinish.getTime() - lastRequest.trequest.getTime());
        let downloadBits = 8 * lastRequest.trace[lastRequest.trace.length - 1].b;
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
        return delayMilliSeconds;
    }

    function execute(rulesContext, callback) {
        let switchRequest = SwitchRequest(context).create(SwitchRequest.NO_CHANGE, SwitchRequest.WEAK);

        let mediaInfo = rulesContext.getMediaInfo();
        let mediaType = mediaInfo.type;
        let metrics = metricsModel.getReadOnlyMetricsFor(mediaType);

        if (metrics.BolaState.length === 0) {
            // startup

            // console.log('BolaDebug ' + mediaType + ' BolaRule for state=- fragmentStart=' + adapter.getIndexHandlerTime(rulesContext.getStreamProcessor()));

            let bolaState = calculateInitialState(rulesContext);
            metricsModel.updateBolaState(mediaType, bolaState);

            if (bolaState.state !== BolaRule.BOLA_STATE_ONE_BITRATE) {
                // bolaState.state === BolaRule.BOLA_STATE_STARTUP

                // download first fragment at lowest quality
                // TODO: at some point, we may want to make algorithm redownload first fragment at a higher quality
                switchRequest = SwitchRequest(context).create(0, SwitchRequest.DEFAULT);
            }

            // console.log('BolaDebug ' + mediaType + ' BolaRule quality 0 for INITIALIZE');
            callback(switchRequest);
            return;
        }

        // metrics.BolaState.length > 0
        let bolaState = metrics.BolaState[0].s;
        // TODO: is it OK to change bolaState, or should we clone?

        if (bolaState.state === BolaRule.BOLA_STATE_ONE_BITRATE) {
            // console.log('BolaDebug ' + mediaType + ' BolaRule quality 0 for ONE_BITRATE');
            callback(switchRequest);
            return;
        }

        // console.log('BolaDebug ' + mediaType + ' BolaRule for state=' + bolaState.state + ' fragmentStart=' + adapter.getIndexHandlerTime(rulesContext.getStreamProcessor()));

        let bufferLevel = metricsExt.getCurrentBufferLevel(metrics) ? metricsExt.getCurrentBufferLevel(metrics) : 0.0;
        let bolaQuality = getQualityFromBufferLevel(bolaState, bufferLevel);
        let lastThroughput = getLastThroughput(metrics);

        // console.log('BolaDebug ' + mediaType + ' BolaRule bufferLevel=' + bufferLevel + '(+' + bolaState.virtualBuffer + ') lt=' + lastThroughput);

        if (bufferLevel <= 0.001) {
            // rebuffering event occured, reset virtual buffer
            bolaState.virtualBuffer = 0.0;
        }

        if (bolaState.live) {
            // find out if there was delay because of lack of availability
            // TODO: add metric that specifies this delay explicity
            let liveDelaySeconds = getDelayFromLastFragmentInSeconds(metrics);
            if (liveDelaySeconds >= LIVE_DELAY_DETECT_THRESHOLD_S) {
                // Is it because bufferLevel is at target?
                if (bufferLevel < bolaState.bufferTarget - bolaState.fragmentDuration) {
                    // guess not
                    bolaState.virtualBuffer += liveDelaySeconds;
                }
            }

            // update bolaQuality for live: bufferLevel might be artificially low because of lack of availability

            let bolaQualityVirtual = getQualityFromBufferLevel(bolaState, bufferLevel + bolaState.virtualBuffer);
            if (bolaQualityVirtual > bolaQuality) {
                // May use quality higher than that indicated by real buffer level.

                // In this case, make sure there is enough throughput to download fragment before real buffer runs out.
                let newQuality = bolaQuality;
                while (newQuality < bolaQualityVirtual &&
                       (bolaState.bitrate[newQuality + 1] * bolaState.fragmentDuration) /
                       (lastThroughput * bolaState.bandwidthSafetyFactor) < bufferLevel
                      ) {
                    ++newQuality;
                }

                if (newQuality > bolaQuality) {
                    // We can (and will) download at a quality higher than that indicated by real buffer level.
                    if (bolaQualityVirtual <= newQuality) {
                        // we can download fragment indicated by real+virtual buffer without rebuffering
                        bolaQuality = bolaQualityVirtual;
                    } else {
                        // downloading fragment indicated by real+virtual rebuffers, use lower quality
                        bolaQuality = newQuality;
                        // deflate virtual buffer to match quality
                        // TODO: document the arithmetic
                        let s  = bolaState.bitrate[newQuality];     // relative size
                        let s1 = bolaState.bitrate[newQuality + 1]; // relative size
                        let u  = bolaState.utility[newQuality];
                        let u1 = bolaState.utility[newQuality + 1];
                        let targetBufferLevel = bolaState.Vp * (bolaState.gp + (s1 * u - s * u1) / (s1 - s));
                        if (bufferLevel + bolaState.virtualBuffer > targetBufferLevel) { // should be true
                            bolaState.virtualBuffer = targetBufferLevel - bufferLevel;
                            if (bolaState.virtualBuffer < 0.0) {
                                bolaState.virtualBuffer = 0.0;
                            }
                        }
                    }
                }
            }
        } // bolaState.live

        if (bolaState.state === BolaRule.BOLA_STATE_STARTUP || bolaState.state === BolaRule.BOLA_STATE_STARTUP_NO_INC) {
            // in startup phase, use some throughput estimation

            let q = getQualityFromThroughput(bolaState, lastThroughput * bolaState.bandwidthSafetyFactor);

            if (lastThroughput <= 0.0) {
                // something went wrong - go to steady state
                bolaState.state = BolaRule.BOLA_STATE_STEADY;
            }
            if (bolaState.state === BolaRule.BOLA_STATE_STARTUP && q < bolaState.lastQuality) {
                // Since the quality decreased during startup, it will not be allowed to increase again.
                bolaState.state = BolaRule.BOLA_STATE_STARTUP_NO_INC;
            }
            if (bolaState.state === BolaRule.BOLA_STATE_STARTUP_NO_INC && q > bolaState.lastQuality) {
                // In this state the quality is not allowed to increase until steady state.
                q = bolaState.lastQuality;
            }
            if (q <= bolaQuality) {
                // Since the buffer is full enough for steady state to match startup, switch over to steady state.
                bolaState.state = BolaRule.BOLA_STATE_STEADY;
            }
            if (bolaState.state !== BolaRule.BOLA_STATE_STEADY) {
                // still in startup mode
                // console.log('BolaDebug ' + mediaType + ' BolaRule quality ' + q + '/' + bolaQuality + ' for STARTUP');
                bolaState.lastQuality = q;
                metricsModel.updateBolaState(mediaType, bolaState);
                switchRequest = SwitchRequest(context).create(q, SwitchRequest.DEFAULT);
                callback(switchRequest);
                return;
            }
        }

        // steady state

        // we want to avoid oscillations
        // We implement the "BOLA-O" variant: when network bandwidth lies between two bitrate levels, stick to the lowest level.
        let delaySeconds = 0.0;
        if (bolaQuality > bolaState.lastQuality) {
            // do not used bandwidthSafetyFactor here: we are not using throughput estimation but capping bitrate to avoid oscillations
            let q = getQualityFromThroughput(bolaState, lastThroughput);
            if (bolaQuality > q) {
                // only intervene if we are trying to *increase* quality to an *unsustainable* level

                if (q < bolaState.lastQuality) {
                    // we are only avoid oscillations - do not drop below last quality
                    q = bolaState.lastQuality;
                } else {
                    // since bitrates are quantized, quality q might lead to buffer inflation
                    // deflate buffer to threshold where algorithm would choose quality q over quality q+1
                    // TODO: document the arithmetic
                    let s  = bolaState.bitrate[q];     // relative size
                    let s1 = bolaState.bitrate[q + 1]; // relative size
                    let u  = bolaState.utility[q];
                    let u1 = bolaState.utility[q + 1];
                    let targetBufferLevel = bolaState.Vp * (bolaState.gp + (s1 * u - s * u1) / (s1 - s));
                    delaySeconds = bufferLevel - targetBufferLevel;
                }
                bolaQuality = q;
            }
        }

        if (delaySeconds > 0.0 && bolaState.live) {
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
            let streamProcessor = rulesContext.getStreamProcessor();
            streamProcessor.getScheduleController().setTimeToLoadDelay(1000.0 * delaySeconds);
        } else {
            let streamProcessor = rulesContext.getStreamProcessor();
            streamProcessor.getScheduleController().setTimeToLoadDelay(0.0);
        }

        metricsModel.updateBolaState(mediaType, bolaState);
        switchRequest = SwitchRequest(context).create(bolaQuality, SwitchRequest.DEFAULT);
        // console.log('BolaDebug ' + mediaType + ' BolaRule quality ' + bolaQuality + ' for STEADY');
        callback(switchRequest);
    }

    function reset() {
        setup();
    }

    instance = {
        execute: execute,
        reset: reset
    };

    setup();
    return instance;
}

// BOLA_STATE_ONE_BITRATE   : If there is only one bitrate (or initialization failed), always return NO_CHANGE.
// BOLA_STATE_STARTUP       : Download fragments at most recently measured throughput.
// BOLA_STATE_STARTUP_NO_INC: If quality increased then decreased during startup, then quality cannot be increased.
// BOLA_STATE_STEADY        : Buffer primed, we switch to steady operation.
BolaRule.BOLA_STATE_ONE_BITRATE    = 0;
BolaRule.BOLA_STATE_STARTUP        = 1;
BolaRule.BOLA_STATE_STARTUP_NO_INC = 2;
BolaRule.BOLA_STATE_STEADY         = 3;

BolaRule.__dashjs_factory_name = 'BolaRule';
export default FactoryMaker.getClassFactory(BolaRule);
