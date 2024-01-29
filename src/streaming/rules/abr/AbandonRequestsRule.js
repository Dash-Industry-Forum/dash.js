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
import SwitchRequest from '../SwitchRequest.js';
import FactoryMaker from '../../../core/FactoryMaker.js';
import Debug from '../../../core/Debug.js';
import Settings from '../../../core/Settings.js';

function AbandonRequestsRule(config) {

    config = config || {};
    const mediaPlayerModel = config.mediaPlayerModel;
    const dashMetrics = config.dashMetrics;
    const context = this.context;
    const settings = Settings(context).getInstance();

    let instance,
        logger,
        abandonDict;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        reset();
    }


    function shouldAbandon(rulesContext) {
        const switchRequest = SwitchRequest(context).create();
        switchRequest.rule = this.getClassName();

        try {
            if (!rulesContext) {
                return switchRequest
            }
            const request = rulesContext.getCurrentRequest();

            if (!isNaN(request.index)) {

                // In case we abandoned already or do not have enough information to proceed we return here
                if (request.firstByteDate === null || abandonDict.hasOwnProperty(request.index)) {
                    return switchRequest;
                }

                // Do not abandon if the buffer level is larger than the stable time
                const stableBufferTime = mediaPlayerModel.getBufferTimeDefault();
                const mediaType = rulesContext.getMediaType();
                const bufferLevel = dashMetrics.getCurrentBufferLevel(mediaType);
                if (bufferLevel > stableBufferTime) {
                    return switchRequest;
                }

                // Activate rule once we have enough samples, the initial startup time has elapsed and the download is not finished yet
                const elapsedTimeSinceFirstByteInMs = Date.now() - request.firstByteDate.getTime();
                if (request.traces.length >= settings.get().streaming.abr.rules.abandonRequestsRule.parameters.minThroughputSamplesThreshold &&
                    elapsedTimeSinceFirstByteInMs > settings.get().streaming.abr.rules.abandonRequestsRule.parameters.minSegmentDownloadTimeThresholdInMs &&
                    request.bytesLoaded < request.bytesTotal) {
                    return _getSwitchRequest(rulesContext, request, switchRequest);
                }
            }

            return switchRequest;
        } catch (e) {
            logger.error(e);
            return switchRequest
        }
    }

    function _getSwitchRequest(rulesContext, request, switchRequest) {
        const mediaInfo = rulesContext.getMediaInfo();
        const mediaType = rulesContext.getMediaType();

        // Use the traces of the request to derive the mean throughput. We ignore the first entries as they contain the latency of the request.
        const downloadedBytes = request.traces.reduce((prev, curr) => prev + curr.b[0], 0) - request.traces[0].b[0];
        const downloadTimeInMs = Math.max(request.traces.reduce((prev, curr) => prev + curr.d, 0) - request.traces[0].d, 1);
        const throughputInKbit = Math.round((8 * downloadedBytes) / downloadTimeInMs)
        const estimatedTimeOfDownloadInSeconds = Number((request.bytesTotal * 8 / throughputInKbit) / 1000).toFixed(2);

        // We do not abandon if the estimated download time is below a constant multiple of the segment duration, or if we are on the lowest quality anyway.
        const representation = rulesContext.getRepresentation();
        const abrController = rulesContext.getAbrController();
        if (estimatedTimeOfDownloadInSeconds < request.duration * settings.get().streaming.abr.rules.abandonRequestsRule.parameters.abandonDurationMultiplier || abrController.isPlayingAtLowestQuality(representation)) {
            return switchRequest;
        }

        if (!abandonDict.hasOwnProperty(request.index)) {
            const abrController = rulesContext.getAbrController();
            const remainingBytesToDownload = request.bytesTotal - request.bytesLoaded;
            const optimalRepresentationForBitrate = abrController.getOptimalRepresentationForBitrate(mediaInfo, throughputInKbit, true);
            const currentRequestedRepresentation = request.representation;
            const totalBytesForOptimalRepresentation = request.bytesTotal * optimalRepresentationForBitrate.bitrateInKbit / currentRequestedRepresentation.bitrateInKbit;

            if (remainingBytesToDownload > totalBytesForOptimalRepresentation) {
                switchRequest.representation = optimalRepresentationForBitrate;
                switchRequest.reason = {
                    throughputInKbit,
                    message: `[AbandonRequestRule][${mediaType} is asking to abandon and switch to quality to ${optimalRepresentationForBitrate.absoluteIndex}. The measured bandwidth was ${throughputInKbit} kbit/s`
                }
                abandonDict[request.index] = true;
            }
        }

        return switchRequest
    }

    function reset() {
        abandonDict = {};
    }

    instance = {
        shouldAbandon,
        reset
    };

    setup();

    return instance;
}

AbandonRequestsRule.__dashjs_factory_name = 'AbandonRequestsRule';
export default FactoryMaker.getClassFactory(AbandonRequestsRule);
