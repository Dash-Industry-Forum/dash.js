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
import BufferController from '../../controllers/BufferController.js';
import AbrController from '../../controllers/AbrController.js';
import HTTPRequest from '../../vo/metrics/HTTPRequest.js';
import FactoryMaker from '../../../core/FactoryMaker.js';
import Debug from '../../../core/Debug.js';

export default FactoryMaker.getClassFactory(ThroughputRule);

function ThroughputRule(config) {

    const AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_LIVE = 2;
    const AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_VOD = 3;

    let context = this.context;
    let log = Debug(context).getInstance().log;

    let metricsExt = config.metricsExt;
    let metricsModel = config.metricsModel;

    let instance = {
        execute: execute,
        reset: reset
    };

    reset();
    return instance;

    let throughputArray;

    function storeLastRequestThroughputByType(type, lastRequestThroughput) {
        throughputArray[type] = throughputArray[type] || [];
        if (lastRequestThroughput !== Infinity &&
            lastRequestThroughput !== throughputArray[type][throughputArray[type].length-1]) {
            throughputArray[type].push(lastRequestThroughput);
        }
    }

    function getAverageThroughput(type,  isDynamic) {
        var averageThroughput = 0;
        var sampleAmount = isDynamic ? AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_LIVE : AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_VOD;
        var arr = throughputArray[type];
        var len = arr.length;

        sampleAmount = len < sampleAmount ? len : sampleAmount;

        if (len > 0) {
            var startValue = len - sampleAmount;
            var totalSampledValue = 0;

            for (var i = startValue; i < len; i++) {
                totalSampledValue += arr[i];
            }
            averageThroughput = totalSampledValue / sampleAmount;
        }

        if (arr.length > sampleAmount) {
            arr.shift();
        }

        return (averageThroughput / 1000 ) * AbrController.BANDWIDTH_SAFETY;
    }

    function execute (rulesContext, callback) {
        var downloadTime;
        var averageThroughput;
        var lastRequestThroughput;

        var mediaInfo = rulesContext.getMediaInfo(),
            mediaType = mediaInfo.type,
            current = rulesContext.getCurrentValue(),
            metrics = metricsModel.getReadOnlyMetricsFor(mediaType),
            streamProcessor = rulesContext.getStreamProcessor(),
            abrController = streamProcessor.getABRController(),
            isDynamic= streamProcessor.isDynamic(),
            lastRequest = metricsExt.getCurrentHttpRequest(metrics),
            bufferStateVO = (metrics.BufferState.length > 0) ? metrics.BufferState[metrics.BufferState.length - 1] : null,
            bufferLevelVO = (metrics.BufferLevel.length > 0) ? metrics.BufferLevel[metrics.BufferLevel.length - 1] : null,
            switchRequest =  SwitchRequest(context).create(SwitchRequest.NO_CHANGE, SwitchRequest.WEAK);

        if (!metrics || !lastRequest || lastRequest.type !== HTTPRequest.MEDIA_SEGMENT_TYPE ||
            !bufferStateVO || !bufferLevelVO ) {

            callback(switchRequest);
            return;

        }

        downloadTime = (lastRequest.tfinish.getTime() - lastRequest.tresponse.getTime()) / 1000;

        if (lastRequest.trace.length) {
            lastRequestThroughput = Math.round((lastRequest.trace[lastRequest.trace.length - 1].b * 8 ) / downloadTime);
            storeLastRequestThroughputByType(mediaType, lastRequestThroughput);
        }

        averageThroughput = Math.round(getAverageThroughput(mediaType, isDynamic));
        abrController.setAverageThroughput(mediaType, averageThroughput);

        if (abrController.getAbandonmentStateFor(mediaType) !== AbrController.ABANDON_LOAD) {

            if (bufferStateVO.state === BufferController.BUFFER_LOADED || isDynamic) {
                var newQuality = abrController.getQualityForBitrate(mediaInfo, averageThroughput);
                streamProcessor.getScheduleController().setTimeToLoadDelay(0); // TODO Watch out for seek event - no delay when seeking.!!
                switchRequest = SwitchRequest(context).create(newQuality, SwitchRequest.DEFAULT);
            }

            if (switchRequest.value !== SwitchRequest.NO_CHANGE && switchRequest.value !== current) {
                log("ThroughputRule requesting switch to index: ", switchRequest.value, "type: ",mediaType, " Priority: ",
                    switchRequest.priority === SwitchRequest.DEFAULT ? "Default" :
                        switchRequest.priority === SwitchRequest.STRONG ? "Strong" : "Weak", "Average throughput", Math.round(averageThroughput), "kbps");
            }
        }

        callback(switchRequest);
    }

    function reset() {
        throughputArray = [];
    }
}