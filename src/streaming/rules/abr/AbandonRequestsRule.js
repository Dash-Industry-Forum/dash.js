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

    config = config || {};
    const ABANDON_MULTIPLIER = 1.8;
    const GRACE_TIME_THRESHOLD = 500;
    const MIN_LENGTH_TO_AVERAGE = 5;

    const context = this.context;
    const mediaPlayerModel = config.mediaPlayerModel;
    const dashMetrics = config.dashMetrics;
    const settings = config.settings;

    let instance,
        logger,
        fragmentDict,
        abandonDict,
        throughputArray;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        reset();
    }

    function setFragmentRequestDict(type, id) {
        fragmentDict[type] = fragmentDict[type] || {};
        fragmentDict[type][id] = fragmentDict[type][id] || {};
    }

    function storeLastRequestThroughputByType(type, throughput) {
        throughputArray[type] = throughputArray[type] || [];
        throughputArray[type].push(throughput);
    }

    function shouldAbandon(rulesContext) {
        const switchRequest = SwitchRequest(context).create(SwitchRequest.NO_CHANGE, {name: AbandonRequestsRule.__dashjs_factory_name});

        if (!rulesContext || !rulesContext.hasOwnProperty('getMediaInfo') || !rulesContext.hasOwnProperty('getMediaType') || !rulesContext.hasOwnProperty('getCurrentRequest') ||
            !rulesContext.hasOwnProperty('getRepresentationInfo') || !rulesContext.hasOwnProperty('getAbrController')) {
            return switchRequest;
        }

        const mediaInfo = rulesContext.getMediaInfo();
        const mediaType = rulesContext.getMediaType();
        const req = rulesContext.getCurrentRequest();

        if (!isNaN(req.index)) {
            setFragmentRequestDict(mediaType, req.index);

            const stableBufferTime = mediaPlayerModel.getStableBufferTime();
            const bufferLevel = dashMetrics.getCurrentBufferLevel(mediaType, true);
            if ( bufferLevel > stableBufferTime ) {
                return switchRequest;
            }

            const fragmentInfo = fragmentDict[mediaType][req.index];
            if (fragmentInfo === null || req.firstByteDate === null || abandonDict.hasOwnProperty(fragmentInfo.id)) {
                return switchRequest;
            }

            //setup some init info based on first progress event
            if (fragmentInfo.firstByteTime === undefined) {
                throughputArray[mediaType] = [];
                fragmentInfo.firstByteTime = req.firstByteDate.getTime();
                fragmentInfo.segmentDuration = req.duration;
                fragmentInfo.bytesTotal = req.bytesTotal;
                fragmentInfo.id = req.index;
            }
            fragmentInfo.bytesLoaded = req.bytesLoaded;
            fragmentInfo.elapsedTime = new Date().getTime() - fragmentInfo.firstByteTime;

            if (fragmentInfo.bytesLoaded > 0 && fragmentInfo.elapsedTime > 0) {
                storeLastRequestThroughputByType(mediaType, Math.round(fragmentInfo.bytesLoaded * 8 / fragmentInfo.elapsedTime));
            }

            if (throughputArray[mediaType].length >= MIN_LENGTH_TO_AVERAGE &&
                fragmentInfo.elapsedTime > GRACE_TIME_THRESHOLD &&
                fragmentInfo.bytesLoaded < fragmentInfo.bytesTotal) {

                const totalSampledValue = throughputArray[mediaType].reduce((a, b) => a + b, 0);
                fragmentInfo.measuredBandwidthInKbps = Math.round(totalSampledValue / throughputArray[mediaType].length);
                fragmentInfo.estimatedTimeOfDownload = +((fragmentInfo.bytesTotal * 8 / fragmentInfo.measuredBandwidthInKbps) / 1000).toFixed(2);

                if (fragmentInfo.estimatedTimeOfDownload < fragmentInfo.segmentDuration * ABANDON_MULTIPLIER || rulesContext.getRepresentationInfo().quality === 0 ) {
                    return switchRequest;
                } else if (!abandonDict.hasOwnProperty(fragmentInfo.id)) {

                    const abrController = rulesContext.getAbrController();
                    const bytesRemaining = fragmentInfo.bytesTotal - fragmentInfo.bytesLoaded;
                    const bitrateList = abrController.getBitrateList(mediaInfo);
                    const quality = abrController.getQualityForBitrate(mediaInfo, fragmentInfo.measuredBandwidthInKbps * settings.get().streaming.abr.bandwidthSafetyFactor);
                    const minQuality = abrController.getMinAllowedIndexFor(mediaType);
                    const newQuality = (minQuality !== undefined) ? Math.max(minQuality, quality) : quality;
                    const estimateOtherBytesTotal = fragmentInfo.bytesTotal * bitrateList[newQuality].bitrate / bitrateList[abrController.getQualityFor(mediaType)].bitrate;

                    if (bytesRemaining > estimateOtherBytesTotal) {
                        switchRequest.quality = newQuality;
                        switchRequest.reason.throughput = fragmentInfo.measuredBandwidthInKbps;
                        switchRequest.reason.fragmentID = fragmentInfo.id;
                        abandonDict[fragmentInfo.id] = fragmentInfo;
                        logger.debug('[' + mediaType + '] frag id',fragmentInfo.id,' is asking to abandon and switch to quality to ', newQuality, ' measured bandwidth was', fragmentInfo.measuredBandwidthInKbps);
                        delete fragmentDict[mediaType][fragmentInfo.id];
                    }
                }
            } else if (fragmentInfo.bytesLoaded === fragmentInfo.bytesTotal) {
                delete fragmentDict[mediaType][fragmentInfo.id];
            }
        }

        return switchRequest;
    }

    function reset() {
        fragmentDict = {};
        abandonDict = {};
        throughputArray = [];
    }

    instance = {
        shouldAbandon: shouldAbandon,
        reset: reset
    };

    setup();

    return instance;
}

AbandonRequestsRule.__dashjs_factory_name = 'AbandonRequestsRule';
export default FactoryMaker.getClassFactory(AbandonRequestsRule);
