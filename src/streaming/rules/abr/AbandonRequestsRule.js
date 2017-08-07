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
 *  WHETHER IN CONTRAC  T, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
import SwitchRequest from '../SwitchRequest';
import FactoryMaker from '../../../core/FactoryMaker';
import Debug from '../../../core/Debug';

function AbandonRequestsRule(config) {

    const ABANDON_MULTIPLIER = 1.8;
    const GRACE_TIME_THRESHOLD = 500;
    const MIN_LENGTH_TO_AVERAGE = 5;

    const context = this.context;
    const log = Debug(context).getInstance().log;

    const mediaPlayerModel = config.mediaPlayerModel;
    const metricsModel = config.metricsModel;
    const dashMetrics = config.dashMetrics;

    let fragmentDict,
        abandonDict,
        throughputArray;

    function setup() {
        reset();
    }

    function checkFragmentDictHasFragmentInfo(type, id) {
        fragmentDict[type] = fragmentDict[type] || {};
        fragmentDict[type][id] = fragmentDict[type][id] || {};
    }

    function storeLastRequestThroughputByType(type, throughput) {
        throughputArray[type] = throughputArray[type] || [];
        throughputArray[type].push(throughput);
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
        if (quality === 0 || isNaN(req.index) || !req.firstByteDate) {
            // either we are already downloading at lowest bitrate,
            // or we are not downloading a media segment,
            // or we are still waiting for some progress (no bytes received yet)
            return switchRequest;
        }

        if (req.bytesLoaded === req.bytesTotal) {
            // segment fully downloaded
            delete fragmentDict[mediaType][req.index];
            return switchRequest;
        }

        const stableBufferTime = mediaPlayerModel.getStableBufferTime();
        const bufferLevel = dashMetrics.getCurrentBufferLevel(metricsModel.getReadOnlyMetricsFor(mediaType));
        if (bufferLevel > stableBufferTime) {
            // we have plenty of buffer, no need for emergency measures (i.e. no need for segment abandonment)
            return switchRequest;
        }

        checkFragmentDictHasFragmentInfo(mediaType, req.index);
        const fragmentInfo = fragmentDict[mediaType][req.index];
        if (abandonDict.hasOwnProperty(fragmentInfo.id)) {
            // already abandoned this segment - but shouldAbandon() might still be called a few times for this segment
            return switchRequest;
        }

        //setup some init info based on first progress event
        if (!fragmentInfo.firstByteTime) {
            throughputArray[mediaType] = [];
            fragmentInfo.firstByteTime = req.firstByteDate.getTime();
            fragmentInfo.segmentDuration = req.duration;
            fragmentInfo.bytesTotal = req.bytesTotal;
            fragmentInfo.id = req.index;
        }
        fragmentInfo.bytesLoaded = req.bytesLoaded;
        fragmentInfo.elapsedTime = Date.now() - fragmentInfo.firstByteTime;

        if (fragmentInfo.bytesLoaded > 0 && fragmentInfo.elapsedTime > 0) {
            storeLastRequestThroughputByType(mediaType, Math.round(fragmentInfo.bytesLoaded * 8 / fragmentInfo.elapsedTime));
        }

        if (throughputArray[mediaType].length < MIN_LENGTH_TO_AVERAGE || fragmentInfo.elapsedTime < GRACE_TIME_THRESHOLD) {
            // too soon to make abandonment decision - we need some minimum onProgress calls and some minimum time since first byte
            return switchRequest;
        }

        // Estimate throughput calculation below gives more weight to the early stages of the segment download.
        // This may not be what we really want, but it does make AbandonRequestsRule less jumpy - it takes longer to make it decide to abandon.
        // Maybe we should update the logic, but this needs to be done without making AbandonRequestsRule trigger too often.
        fragmentInfo.measuredBandwidthInKbps = throughputArray[mediaType].reduce((a, b) => a + b) / throughputArray[mediaType].length;
        fragmentInfo.estimatedTimeOfDownloadInSeconds = (fragmentInfo.bytesTotal * 8 / fragmentInfo.measuredBandwidthInKbps) / 1000;

        if (fragmentInfo.estimatedTimeOfDownloadInSeconds < fragmentInfo.segmentDuration * ABANDON_MULTIPLIER) {
            // download is expected to finish in a reasonable time
            return switchRequest;
        }

        // if we are here, download is expected to take too long to finish

        const bytesRemaining = fragmentInfo.bytesTotal - fragmentInfo.bytesLoaded;
        const bitrateList = abrController.getBitrateList(mediaInfo);
        const newQuality = abrController.getQualityForBitrate(mediaInfo, fragmentInfo.measuredBandwidthInKbps * mediaPlayerModel.getBandwidthSafetyFactor());
        const estimateOtherBytesTotal = fragmentInfo.bytesTotal * bitrateList[newQuality].bitrate / bitrateList[quality].bitrate;

        if (bytesRemaining > estimateOtherBytesTotal) {
            // we only get here if new quality is lower than current download and it requires a smaller download than what is left in current download
            switchRequest.quality = newQuality;
            switchRequest.reason.throughput = fragmentInfo.measuredBandwidthInKbps;
            switchRequest.reason.fragmentID = fragmentInfo.id;
            abandonDict[fragmentInfo.id] = fragmentInfo;
            log('AbandonRequestsRule ( ', mediaType, 'frag id', fragmentInfo.id, ') is asking to abandon and switch to quality to ', newQuality, ' measured bandwidth was', fragmentInfo.measuredBandwidthInKbps);
            delete fragmentDict[mediaType][fragmentInfo.id];
        }

        return switchRequest;
    }

    function reset() {
        fragmentDict = {};
        abandonDict = {};
        throughputArray = [];
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
