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
import MediaPlayerModel from '../../models/MediaPlayerModel.js';
import FactoryMaker from '../../../core/FactoryMaker.js';
import BolaRule from './BolaRule.js';

function BolaAbandonRule(config) {

    let context = this.context;
    let metricsExt = config.metricsExt;
    let metricsModel = config.metricsModel;

    let instance,
        abandonDict,
        mediaPlayerModel;

    function setup() {
        abandonDict = {};
        mediaPlayerModel = MediaPlayerModel(context).getInstance();
    }

    function setLastAbandon(mediaType, index, quality) {
        abandonDict[mediaType] = {index: index, quality: quality};
    }

    function isLastAbandon(mediaType, index, quality) {
        let la = abandonDict[mediaType];
        return la && la.index === index && la.quality === quality;
    }

    function execute(rulesContext, callback) {
        let mediaInfo = rulesContext.getMediaInfo();
        let mediaType = mediaInfo.type;
        let metrics = metricsModel.getReadOnlyMetricsFor(mediaType);
        let progressEvent = rulesContext.getCurrentValue();
        let request = progressEvent.request;
        let switchRequest = SwitchRequest(context).create(SwitchRequest.NO_CHANGE, SwitchRequest.WEAK);

        if (metrics.BolaState.length === 0 || metrics.BolaState[0].s.state === BolaRule.BOLA_STATE_ONE_BITRATE) {
            callback(switchRequest);
            return;
        }
        let bolaState = metrics.BolaState[0].s;
        // TODO: is it OK to change bolaState, or should we clone?

        let index = request.index;
        let quality = request.quality;

        if (isNaN(index) || index === 0 || quality === 0 || isLastAbandon(mediaType, index, quality) || !request.firstByteDate) {
            callback(switchRequest);
            return;
        }

        let bytesLoaded = request.bytesLoaded;
        let bytesTotal = request.bytesTotal;
        let bytesRemaining = bytesTotal - bytesLoaded;

        let estimateOtherBytesTotal = bytesTotal * bolaState.bitrate[0] / bolaState.bitrate[quality];

        if (bytesRemaining <= estimateOtherBytesTotal) {
            // we need to download less bytes than the size of the lowest quality fragment: do not abandon
            callback(switchRequest);
            return;
        }

        let bufferLevel = metricsExt.getCurrentBufferLevel(metrics) ? metricsExt.getCurrentBufferLevel(metrics).level : 0.0;

        // check if we should "panic" abandon
        if (!bolaState.live && bolaState.state === BolaRule.BOLA_STATE_STEADY && bufferLevel <= request.duration) {
            // If the buffer only has one fragment left, then this is the last chance to abandon without rebuffering if the network bandwidth corresponds to the lowest bitrate.

            // live: Since when live streaming we cannot build a large buffer, we would expect too many false triggers here.

            // BOLA_STATE_STEADY: During startup the buffer has not yet grown enough and will trigger falsely.

            bolaState.lastQuality = 0;
            metricsModel.updateBolaState(mediaType, bolaState);

            setLastAbandon(mediaType, index, quality);
            switchRequest = SwitchRequest(context).create(0, SwitchRequest.STRONG);
            // console.log('BolaDebug ' + mediaType + ' BolaAbandonRule to 0 in panic');
            callback(switchRequest);
            return;
        }

        let nowMilliSeconds = new Date().getTime();
        let elapsedTimeMilliSeconds = nowMilliSeconds - request.firstByteDate.getTime();
        let estimateThroughputSF = 8000.0 * bytesLoaded / elapsedTimeMilliSeconds * bolaState.bandwidthSafetyFactor; // throughput in bits per second
        let rttSeconds = 0.001 * (request.firstByteDate.getTime() - request.requestStartDate.getTime());

        let estimateTimeRemainSeconds = 8.0 * bytesRemaining / estimateThroughputSF;

        // find maximum allowed quality that shouldn't lead to rebuffering
        let maxQualityAllowed = quality;
        if (estimateTimeRemainSeconds > bufferLevel) {
            --maxQualityAllowed;
            while (maxQualityAllowed > 0) {
                estimateOtherBytesTotal = bytesTotal * bolaState.bitrate[maxQualityAllowed] / bolaState.bitrate[quality];
                if (8.0 * estimateOtherBytesTotal / estimateThroughputSF <= bufferLevel)
                    break;
                --maxQualityAllowed;
            }
        }

        let bufferAfterRtt = bufferLevel + bolaState.virtualBuffer - rttSeconds;

        let estimateBytesRemainAfterRtt = bytesRemaining - rttSeconds * estimateThroughputSF * 0.125;
        if (estimateBytesRemainAfterRtt < 1.0) {
            // shouldn't happen, but just want to make sure
            estimateBytesRemainAfterRtt = 1.0;
        }

        // check if we should abandon using BOLA score criteria
        let newQuality = quality;
        let score = (bolaState.utility[quality] + bolaState.gp - bufferAfterRtt / bolaState.Vp) / estimateBytesRemainAfterRtt;
        for (let i = 0; i < quality; ++i) {
            estimateOtherBytesTotal = bytesTotal * bolaState.bitrate[i] / bolaState.bitrate[quality];
            let s = (bolaState.utility[i] + bolaState.gp - bufferAfterRtt / bolaState.Vp) / estimateOtherBytesTotal;
            if (s > score) {
                newQuality = i;
                score = s;
            }
        }

        if (newQuality > maxQualityAllowed) {
            // cap new quality
            newQuality = maxQualityAllowed;
        }

        if (newQuality === quality) {
            // no change
            callback(switchRequest);
            return;
        }

        // Abandon, but to which quality? Make sure the chosen quality is sustainable. This should help avoid the case where we abandon multiple times for the same fragment.
        while (newQuality > 0 && bolaState.bitrate[newQuality] > estimateThroughputSF * (1.0 - rttSeconds / bolaState.fragmentDuration)) {
            --newQuality;
        }
        // if (bolaState.state !== BolaRule.BOLA_STATE_STEADY) {
        //     // when abandoning, startup will no longer be more aggressive than steady state
        //     bolaState.state = BolaRule.BOLA_STATE_STEADY;
        // }
        if (bolaState.state === BolaRule.BOLA_STATE_STARTUP) {
            bolaState.state = BolaRule.BOLA_STATE_STARTUP_NO_INC;
        }
        bolaState.lastQuality = newQuality;
        metricsModel.updateBolaState(mediaType, bolaState);

        setLastAbandon(mediaType, index, quality);
        switchRequest = SwitchRequest(context).create(newQuality, SwitchRequest.STRONG);
        // console.log('BolaDebug ' + mediaType + ' BolaAbandonRule abandon to ' + newQuality);
        callback(switchRequest);
    }

    function reset() {
        abandonDict = {};
    }

    instance = {
        execute: execute,
        reset: reset
    };

    setup();

    return instance;
}

BolaAbandonRule.__dashjs_factory_name = 'BolaAbandonRule';
export default FactoryMaker.getClassFactory(BolaAbandonRule);
