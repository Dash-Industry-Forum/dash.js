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

/*global dashjs*/

let DownloadRatioRule;

function DownloadRatioRuleClass() {

    let factory = dashjs.FactoryMaker;
    let SwitchRequest = factory.getClassFactoryByName('SwitchRequest');
    let MetricsModel = factory.getSingletonFactoryByName('MetricsModel');
    let DashMetrics = factory.getSingletonFactoryByName('DashMetrics');
    let DashManifestModel = factory.getSingletonFactoryByName('DashManifestModel');
    let StreamController = factory.getSingletonFactoryByName('StreamController');
    let Debug = factory.getSingletonFactoryByName('Debug');

    let context = this.context;
    let instance,
        logger;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
    }

    function getBytesLength(request) {
        return request.trace.reduce(function (a, b) {
            return a + b.b[0]
        }, 0);
    }

    function getMaxIndex(rulesContext) {

        let mediaType = rulesContext.getMediaInfo().type;

        let metricsModel = MetricsModel(context).getInstance();
        let dashMetrics = DashMetrics(context).getInstance();
        let dashManifest = DashManifestModel(context).getInstance();
        let metrics = metricsModel.getReadOnlyMetricsFor(mediaType);
        let streamController = StreamController(context).getInstance();
        let abrController = rulesContext.getAbrController();
        let current = abrController.getQualityFor(mediaType, streamController.getActiveStreamInfo().id);

        let requests = dashMetrics.getHttpRequests(metrics),
            lastRequest = null,
            currentRequest = null,
            downloadTime,
            totalTime,
            calculatedBandwidth,
            currentBandwidth,
            latencyInBandwidth,
            switchUpRatioSafetyFactor,
            currentRepresentation,
            count,
            bandwidths = [],
            i,
            q = SwitchRequest.NO_CHANGE,
            p = SwitchRequest.PRIORITY.DEFAULT,
            totalBytesLength = 0;

        latencyInBandwidth = true;
        switchUpRatioSafetyFactor = 1.5;
        logger.debug("[CustomRules][" + mediaType + "][DownloadRatioRule] Checking download ratio rule... (current = " + current + ")");

        if (!metrics) {
            logger.debug("[CustomRules][" + mediaType + "][DownloadRatioRule] No metrics, bailing.");
            return SwitchRequest(context).create();
        }

        // Get last valid request
        i = requests.length - 1;
        while (i >= 0 && lastRequest === null) {
            currentRequest = requests[i];
            if (currentRequest._tfinish && currentRequest.trequest && currentRequest.tresponse && currentRequest.trace && currentRequest.trace.length > 0) {
                lastRequest = requests[i];
            }
            i--;
        }

        if (lastRequest === null) {
            logger.debug("[CustomRules][" + mediaType + "][DownloadRatioRule] No valid requests made for this stream yet, bailing.");
            return SwitchRequest(context).create();
        }

        if (lastRequest.type !== 'MediaSegment') {
            logger.debug("[CustomRules][" + mediaType + "][DownloadRatioRule] Last request is not a media segment, bailing.");
            return SwitchRequest(context).create();
        }

        totalTime = (lastRequest._tfinish.getTime() - lastRequest.trequest.getTime()) / 1000;
        downloadTime = (lastRequest._tfinish.getTime() - lastRequest.tresponse.getTime()) / 1000;

        if (totalTime <= 0) {
            logger.debug("[CustomRules][" + mediaType + "][DownloadRatioRule] Don't know how long the download of the last fragment took, bailing.");
            return SwitchRequest(context).create();
        }

        totalBytesLength = getBytesLength(lastRequest);

        logger.debug("[CustomRules][" + mediaType + "][DownloadRatioRule] DL: " + Number(downloadTime.toFixed(3)) + "s, Total: " + Number(totalTime.toFixed(3)) + "s, Length: " + totalBytesLength);

        // Take average bandwidth over 3 requests
        count = 1;
        while (i >= 0 && count < 3) {
            currentRequest = requests[i];

            if (currentRequest.type !== 'MediaSegment' && currentRequest._tfinish && currentRequest.trequest && currentRequest.tresponse && currentRequest.trace && currentRequest.trace.length > 0) {

                let _totalTime = (currentRequest._tfinish.getTime() - currentRequest.trequest.getTime()) / 1000;
                let _downloadTime = (currentRequest._tfinish.getTime() - currentRequest.tresponse.getTime()) / 1000;
                logger.debug("[CustomRules][" + mediaType + "][DownloadRatioRule] DL: " + Number(_downloadTime.toFixed(3)) + "s, Total: " + Number(_totalTime.toFixed(3)) + "s, Length: " + getBytesLength(currentRequest));

                totalTime += _totalTime;
                downloadTime += _downloadTime;
                totalBytesLength += getBytesLength(currentRequest);
                count += 1;
            }
            i--;
        }

        // Set length in bits
        totalBytesLength *= 8;

        calculatedBandwidth = latencyInBandwidth ? (totalBytesLength / totalTime) : (totalBytesLength / downloadTime);

        logger.debug("[CustomRules][" + mediaType + "][DownloadRatioRule] BW = " + Math.round(calculatedBandwidth / 1000) + " kb/s");

        if (isNaN(calculatedBandwidth)) {
            return SwitchRequest(context).create();
        }

        count = rulesContext.getMediaInfo().representationCount;
        currentRepresentation = rulesContext.getRepresentationInfo();
        currentBandwidth = dashManifest.getBandwidth(currentRepresentation);
        for (i = 0; i < count; i += 1) {
            bandwidths.push(rulesContext.getMediaInfo().bitrateList[i].bandwidth);
        }
        if (calculatedBandwidth <= currentBandwidth) {
            for (i = current - 1; i > 0; i -= 1) {
                if (bandwidths[i] <= calculatedBandwidth) {
                    break;
                }
            }
            q = i;
            p = SwitchRequest.PRIORITY.WEAK;

            logger.debug("[CustomRules] SwitchRequest: q=" + q + "/" + (count - 1) + " (" + bandwidths[q] + ")"/* + ", p=" + p*/);
            return SwitchRequest(context).create(q, { name: DownloadRatioRuleClass.__dashjs_factory_name }, p);
        } else {
            for (i = count - 1; i > current; i -= 1) {
                if (calculatedBandwidth > (bandwidths[i] * switchUpRatioSafetyFactor)) {
                    // logger.debug("[CustomRules][" + mediaType + "][DownloadRatioRule] bw = " + calculatedBandwidth + " results[i] * switchUpRatioSafetyFactor =" + (bandwidths[i] * switchUpRatioSafetyFactor) + " with i=" + i);
                    break;
                }
            }

            q = i;
            p = SwitchRequest.PRIORITY.STRONG;

            logger.debug("[CustomRules] SwitchRequest: q=" + q + "/" + (count - 1) + " (" + bandwidths[q] + ")"/* + ", p=" + p*/);
            return SwitchRequest(context).create(q, { name: DownloadRatioRuleClass.__dashjs_factory_name }, p);
        }
    }

    instance = {
        getMaxIndex: getMaxIndex
    };

    setup();

    return instance;
}

DownloadRatioRuleClass.__dashjs_factory_name = 'DownloadRatioRule';
DownloadRatioRule = dashjs.FactoryMaker.getClassFactory(DownloadRatioRuleClass);

