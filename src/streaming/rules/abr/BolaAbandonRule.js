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
import SwitchRequest from '../SwitchRequest';
import MediaPlayerModel from '../../models/MediaPlayerModel';
import FactoryMaker from '../../../core/FactoryMaker';
import Debug from '../../../core/Debug';
import BolaRule from './BolaRule';

function BolaAbandonRule(config) {

    // do not abandon during the grace period
    const GRACE_PERIOD_MS = 500;
    const POOR_RTT_MS = 200;

    let context = this.context;
    let log = Debug(context).getInstance().log;
    let dashMetrics = config.dashMetrics;
    let metricsModel = config.metricsModel;

    let instance,
        abandonDict,
        mediaPlayerModel;

    function setup() {
        abandonDict = {};
        mediaPlayerModel = MediaPlayerModel(context).getInstance();
    }

    function rememberAbandon(mediaType, index, quality) {
        // if this is called, then canStillAbandon(mediaType, index, quality) should have returned true
        abandonDict[mediaType] = {index: index, quality: quality};
    }

    function canStillAbandon(mediaType, index, quality) {
        let adm = abandonDict[mediaType];
        if (!adm)
            return true;
        return index > adm.index || (index == adm.index && quality < adm.quality);
    }

    function execute(rulesContext, callback) {
        let mediaInfo = rulesContext.getMediaInfo();
        let mediaType = mediaInfo.type;
        let metrics = metricsModel.getReadOnlyMetricsFor(mediaType);
        let progressEvent = rulesContext.getCurrentValue();
        let request = progressEvent.request;
        let switchRequest = SwitchRequest(context).create(SwitchRequest.NO_CHANGE, SwitchRequest.WEAK);

        // TODO: should we abandon during startup?
        if (metrics.BolaState.length === 0 || metrics.BolaState[0]._s.state !== BolaRule.BOLA_STATE_STEADY) {
            abandonDict = {}; // otherwise seek back might disable abandonment - TODO: handle cleaner
            callback(switchRequest);
            return;
        }

        let bolaState = metrics.BolaState[0]._s;
        // TODO: does changing bolaState conform to coding style, or should we clone?

        let index = request.index;
        let quality = request.quality;

        if (isNaN(index) || quality === 0 || !canStillAbandon(mediaType, index, quality) || !request.firstByteDate) {
            callback(switchRequest);
            return;
        }

        let nowMilliSeconds = new Date().getTime();
        let elapsedTimeMilliSeconds = nowMilliSeconds - request.firstByteDate.getTime();

        let bytesLoaded = request.bytesLoaded;
        let bytesTotal = request.bytesTotal;
        let bytesRemaining = bytesTotal - bytesLoaded;
        let duration = request.duration;

        let bufferLevel = dashMetrics.getCurrentBufferLevel(metrics) ? dashMetrics.getCurrentBufferLevel(metrics) : 0.0;

        let estimateThroughputBSF = bolaState.bandwidthSafetyFactor * 8000.0 * bytesLoaded / elapsedTimeMilliSeconds; // throughput in bits per second
        let rttSeconds = 0.001 * (request.firstByteDate.getTime() - request.requestStartDate.getTime());
        if (rttSeconds < 0.001 * POOR_RTT_MS)
            rttSeconds = 0.001 * POOR_RTT_MS;

        let diagnosticMessage = 'index=' + index + ' quality=' + quality + ' bytesLoaded/bytesTotal=' + bytesLoaded + '/' + bytesTotal + ' bufferLevel=' + bufferLevel + ' timeSince1stByte=' + (elapsedTimeMilliSeconds / 1000).toFixed(3) + ' estThroughput=' + (estimateThroughputBSF / 1000000).toFixed(3) + ' latency=' + rttSeconds.toFixed(3);

        let estimateOtherBytesTotal = bytesTotal * bolaState.bitrate[0] / bolaState.bitrate[quality];
        let estimateBytesRemainingAfterRtt = bytesRemaining - rttSeconds * estimateThroughputBSF / 8.0;
        if (estimateBytesRemainingAfterRtt < 1.0) {
            estimateBytesRemainingAfterRtt = 1.0;
        }

        if (elapsedTimeMilliSeconds < GRACE_PERIOD_MS ||
            bytesRemaining <= estimateOtherBytesTotal ||
            bufferLevel > bolaState.bufferTarget ||
            estimateBytesRemainingAfterRtt <= estimateOtherBytesTotal ||
            8 * bytesTotal / estimateThroughputBSF <= duration) {
            // Do not abandon during first GRACE_PERIOD_MS.
            // Do not abandon if we need to download less bytes than the size of the lowest quality fragment.
            // Do not abandon if buffer level is above bufferTarget because the schedule controller will not download anything anyway.
            // Do not abandon if after rttSeconds bytesRemaining is estimated to drop below size of lowest quality fragment.
            // Do not abandon if fragment takes less than 1 fragment duration to download.
            callback(switchRequest);
            return;
        }

        // check if we are giving the safety guarantee (see comment in BolaRule.js)
        if (bolaState.safetyGuarantee && bufferLevel <= bolaState.fragmentDuration && bolaState.state === BolaRule.BOLA_STATE_STEADY) {
            // If the buffer only has one fragment left, then this is the last chance to abandon without rebuffering if the network bandwidth corresponds to the lowest bitrate.

            // BOLA_STATE_STEADY: During startup the buffer has not yet grown enough and will give false positives.

            bolaState.lastQuality = 0;
            metricsModel.updateBolaState(mediaType, bolaState);

            rememberAbandon(mediaType, index, quality);
            switchRequest = SwitchRequest(context).create(0, SwitchRequest.STRONG);
            if (BolaRule.BOLA_DEBUG) log('BolaDebug ' + mediaType + ' BolaAbandonRule to 0 for safety guarantee' + ' - ' + diagnosticMessage);
            callback(switchRequest);
            return;
        }

        let estimateTimeRemainSeconds = 8.0 * bytesRemaining / estimateThroughputBSF;

        // find maximum allowed quality that shouldn't lead to rebuffering
        let maxQualityAllowed = quality; // recall that quality > 0; if quality === 0 then we would have returned early
        if (estimateTimeRemainSeconds > bufferLevel) {
            --maxQualityAllowed;
            while (maxQualityAllowed > 0) {
                estimateOtherBytesTotal = bytesTotal * bolaState.bitrate[maxQualityAllowed] / bolaState.bitrate[quality];
                estimateTimeRemainSeconds = rttSeconds + 8 * estimateOtherBytesTotal / estimateThroughputBSF;
                if (estimateTimeRemainSeconds <= bufferLevel) {
                    break;
                }
                --maxQualityAllowed;
            }
        }

        // If we abandon, there will be RTT time before we get first byte at lower quality.
        // By that time, the no-abandon option would have downloaded some more, and the buffer level would have depleted some more.
        // Introducing this RTT cushion also helps avoid extra abandonment, especially with close bitrates.

        let bufferAfterRtt = bufferLevel + bolaState.virtualBuffer - rttSeconds;

        // check if we should abandon using BOLA utility criteria
        let newQuality = quality;
        let score = (bolaState.utility[quality] + bolaState.gp - bufferAfterRtt / bolaState.Vp) / estimateBytesRemainingAfterRtt;

        for (let i = 0; i < quality; ++i) {
            estimateOtherBytesTotal = bytesTotal * bolaState.bitrate[i] / bolaState.bitrate[quality];
            if (estimateOtherBytesTotal > estimateBytesRemainingAfterRtt) {
                // abandoning to download at q such that i <= q < quality is not helpful
                break;
            }
            let s = (bolaState.utility[i] + bolaState.gp - bufferAfterRtt / bolaState.Vp) / estimateOtherBytesTotal;
            if (s > score) {
                newQuality = i;
                score = s;
            }
        }

        // compare with maximum allowed quality that shouldn't lead to rebuffering
        if (newQuality > maxQualityAllowed) {
            newQuality = maxQualityAllowed;
        }

        if (newQuality === quality) {
            // no change
            callback(switchRequest);
            return;
        }

        // Abandon, but to which quality? Abandoning should not happen often, and it's OK to be more conservative when it does.
        while (newQuality > 0 && bolaState.bitrate[newQuality] > estimateThroughputBSF) {
            --newQuality;
        }

        bolaState.lastQuality = newQuality;
        metricsModel.updateBolaState(mediaType, bolaState);

        rememberAbandon(mediaType, index, quality);
        switchRequest = SwitchRequest(context).create(newQuality, SwitchRequest.STRONG);
        if (BolaRule.BOLA_DEBUG) log('BolaDebug ' + mediaType + ' BolaAbandonRule abandon to ' + newQuality + ' - ' + diagnosticMessage);
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
