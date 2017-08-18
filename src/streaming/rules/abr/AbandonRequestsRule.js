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
import SwitchRequest from '../SwitchRequest';
import FactoryMaker from '../../../core/FactoryMaker';
import Debug from '../../../core/Debug';

function AbandonRequestsRule(config) {

    const ABANDON_MULTIPLIER = 1.8;
    const GRACE_TIME_THRESHOLD = 500;
    const MIN_PROGRESS_EVENTS = 5;

    const context = this.context;
    const log = Debug(context).getInstance().log;

    const mediaPlayerModel = config.mediaPlayerModel;
    const metricsModel = config.metricsModel;
    const dashMetrics = config.dashMetrics;

    let fragmentDict;

    function setup() {
        reset();
    }

    function checkFragmentDictForType(mediaType, id, quality) {
        if (!fragmentDict[mediaType] || fragmentDict[mediaType].id !== id || fragmentDict[mediaType].quality !== quality) {
            fragmentDict[mediaType] = { id: id, quality: quality };
        }
    }

    function isAlreadyAbandoned(mediaType, id, quality) {
        const fragmentInfo = fragmentDict[mediaType];
        return fragmentInfo && fragmentInfo.id === id && fragmentInfo.quality === quality && fragmentInfo.abandoned;
    }

    function updateThroughput(mediaType, bytes, elapsedTime) {
        const fragmentInfo = fragmentDict[mediaType];
        const halfLife = 0.5 * fragmentInfo.segmentDurationMs; // short half life because we want to react to a sharp bandwidth drop in time
        if (elapsedTime > 0) {
            const alpha = Math.pow(0.5, elapsedTime / halfLife);
            const throughput = 8 * bytes / elapsedTime;
            fragmentInfo.throughput = alpha * fragmentInfo.throughput + (1 - alpha) * throughput;
        }
    }

    function shouldAbandon(rulesContext) {
        const switchRequest = SwitchRequest(context).create(SwitchRequest.NO_CHANGE, {name: AbandonRequestsRule.__dashjs_factory_name});

        if (!rulesContext ||
            !rulesContext.hasOwnProperty('getMediaInfo') ||
            !rulesContext.hasOwnProperty('getMediaType') ||
            !rulesContext.hasOwnProperty('getCurrentRequest') ||
            !rulesContext.hasOwnProperty('getAbrController')) {
            // should not have happened - something is wrong with the calling method
            return switchRequest;
        }

        const mediaInfo = rulesContext.getMediaInfo();
        const mediaType = rulesContext.getMediaType();
        const req = rulesContext.getCurrentRequest();
        const abrController = rulesContext.getAbrController();

        const quality = abrController.getQualityFor(mediaType);
        const bufferLevel = dashMetrics.getCurrentBufferLevel(metricsModel.getReadOnlyMetricsFor(mediaType));
        const stableBufferTime = mediaPlayerModel.getStableBufferTime();

        if (quality === 0 ||                         // we are already downloading at lowest bitrate
            isNaN(req.index) ||                      // we are not downloading a media segment
            !req.firstByteDate ||                    // we are still waiting for some progress (no bytes received yet)
            req.bytesLoaded === req.bytesTotal ||    // segment is fully downloaded
            bufferLevel > stableBufferTime ||        // we have plenty of buffer, no need for emergency measures (i.e. no need for segment abandonment)
            isAlreadyAbandoned(mediaType, req.index, quality)) {

            return switchRequest;
        }

        checkFragmentDictForType(mediaType, req.index, quality);
        const fragmentInfo = fragmentDict[mediaType];

        if (!fragmentInfo.firstByteTime) {
            // first progress event for this segment - initialize fragmentInfo

            fragmentInfo.firstByteTime = req.firstByteDate.getTime();
            fragmentInfo.latency = fragmentInfo.firstByteTime - req.requestStartDate.getTime();
            fragmentInfo.segmentDurationMs = 1000 * req.duration;
            fragmentInfo.bytesTotal = req.bytesTotal;
            fragmentInfo.id = req.index;

            fragmentInfo.bytesLoaded = req.bytesLoaded;
            fragmentInfo.elapsedTime = Date.now() - fragmentInfo.firstByteTime;

            let historicThroughput = abrController.getThroughputHistory().getAverageThroughput(mediaType);
            if (!isNaN(historicThroughput)) {
                fragmentInfo.throughput = historicThroughput;
                updateThroughput(mediaType, fragmentInfo.bytesLoaded, fragmentInfo.elapsedTime);
            } else {
                fragmentInfo.throughput = 8 * fragmentInfo.bytesLoaded / fragmentInfo.elapsedTime;
            }

            fragmentInfo.progressEventCount = 1;

        } else {
            // update fragmentInfo
            const newBytesLoaded = req.bytesLoaded;
            const newElapsedTime = Date.now() - fragmentInfo.firstByteTime;
            updateThroughput(mediaType, newBytesLoaded - fragmentInfo.bytesLoaded, newElapsedTime - fragmentInfo.elapsedTime);
            fragmentInfo.bytesLoaded = newBytesLoaded;
            fragmentInfo.elapsedTime = newElapsedTime;
            fragmentInfo.progressEventCount += 1;
        }

        if (fragmentInfo.progressEventCount < MIN_PROGRESS_EVENTS || fragmentInfo.elapsedTime < GRACE_TIME_THRESHOLD) {
            // too soon to make abandonment decision
            return switchRequest;
        }

        const bytesRemaining = fragmentInfo.bytesTotal - fragmentInfo.bytesLoaded;
        const estimatedTimeRemaining = 8 * bytesRemaining / fragmentInfo.throughput;
        fragmentInfo.estimatedTimeOfDownload = fragmentInfo.elapsedTime + estimatedTimeRemaining;

        const bufferLevelMs = 1000 * bufferLevel;
        if (fragmentInfo.estimatedTimeOfDownload < fragmentInfo.segmentDurationMs * ABANDON_MULTIPLIER  && estimatedTimeRemaining < bufferLevelMs) {
            // download is expected to finish in a reasonable time
            return switchRequest;
        }

        // if we are here, download is expected to take too long to finish

        const bitrateList = abrController.getBitrateList(mediaInfo);
        const safetyFactor = mediaPlayerModel.getBandwidthSafetyFactor() * Math.min(1, bufferLevelMs / fragmentInfo.segmentDurationMs);
        const newQuality = abrController.getQualityForBitrate(mediaInfo, fragmentInfo.throughput * safetyFactor, fragmentInfo.latency);
        const estimateOtherBytesTotal = fragmentInfo.bytesTotal * bitrateList[newQuality].bitrate / bitrateList[quality].bitrate;

        if (bytesRemaining > estimateOtherBytesTotal) {
            // we only get here if new quality is lower than current download and it requires a smaller download than what is left in current download
            switchRequest.quality = newQuality;
            switchRequest.reason.throughput = fragmentInfo.throughput;
            switchRequest.reason.fragmentID = fragmentInfo.id;
            fragmentInfo.abandoned = true;
            log('AbandonRequestsRule (' + mediaType + ' frag id ' + fragmentInfo.id + ') is asking to abandon and switch from quality ' + quality + ' to ' + newQuality + ', measured throughput is ' + fragmentInfo.throughput.toFixed());
        }

        return switchRequest;
    }

    function reset() {
        fragmentDict = {};
    }

    const instance = {
        shouldAbandon: shouldAbandon,
        reset: reset
    };

    setup();

    return instance;
}

AbandonRequestsRule.__dashjs_factory_name = 'AbandonRequestsRule';
export default FactoryMaker.getClassFactory(AbandonRequestsRule);
