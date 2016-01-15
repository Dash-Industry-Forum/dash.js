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
import MediaPlayerModel from '../../models/MediaPlayerModel.js';
import HTTPRequest from '../../vo/metrics/HTTPRequest.js';
import FactoryMaker from '../../../core/FactoryMaker.js';
import Debug from '../../../core/Debug.js';

function ThroughputRule(config) {

    const AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_LIVE = 2;
    const AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_VOD = 3;

    let context = this.context;
    let log = Debug(context).getInstance().log;
    let metricsExt = config.metricsExt;
    let metricsModel = config.metricsModel;

    let instance,
        throughputArray,
        mediaPlayerModel;

    function setup() {
        throughputArray = [];
        mediaPlayerModel = MediaPlayerModel(context).getInstance();
    }

    function storeLastRequestThroughputByType(type, lastRequestThroughput) {
        throughputArray[type] = throughputArray[type] || [];
        if (lastRequestThroughput !== Infinity &&
            lastRequestThroughput !== throughputArray[type][throughputArray[type].length - 1]) {
            throughputArray[type].push(lastRequestThroughput);
        }
    }

    function getAverageThroughput(type, isDynamic) {
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

        return (averageThroughput / 1000 ) * mediaPlayerModel.getBandwidthSafetyFactor();
    }

    function execute (rulesContext, callback) {
        var downloadTime;
        var bytes;
        var averageThroughput;
        var lastRequestThroughput;

        var mediaInfo = rulesContext.getMediaInfo();
        var mediaType = mediaInfo.type;
        var current = rulesContext.getCurrentValue();
        var metrics = metricsModel.getReadOnlyMetricsFor(mediaType);
        var streamProcessor = rulesContext.getStreamProcessor();
        var abrController = streamProcessor.getABRController();
        var isDynamic = streamProcessor.isDynamic();
        var lastRequest = metricsExt.getCurrentHttpRequest(metrics);
        var bufferStateVO = (metrics.BufferState.length > 0) ? metrics.BufferState[metrics.BufferState.length - 1] : null;
        var bufferLevelVO = (metrics.BufferLevel.length > 0) ? metrics.BufferLevel[metrics.BufferLevel.length - 1] : null;
        var switchRequest = SwitchRequest(context).create(SwitchRequest.NO_CHANGE, SwitchRequest.WEAK);

        if (!metrics || !lastRequest || lastRequest.type !== HTTPRequest.MEDIA_SEGMENT_TYPE ||
            !bufferStateVO || !bufferLevelVO ) {

            callback(switchRequest);
            return;

        }

        if (lastRequest.trace.length) {
            downloadTime = (lastRequest._tfinish.getTime() - lastRequest.tresponse.getTime()) / 1000;

            bytes = lastRequest.trace.reduce(function (a, b) {
                return a + b.b[0];
            }, 0);

            lastRequestThroughput = Math.round(bytes * 8) / downloadTime;
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
                log('ThroughputRule requesting switch to index: ', switchRequest.value, 'type: ',mediaType, ' Priority: ',
                    switchRequest.priority === SwitchRequest.DEFAULT ? 'Default' :
                        switchRequest.priority === SwitchRequest.STRONG ? 'Strong' : 'Weak', 'Average throughput', Math.round(averageThroughput), 'kbps');
            }
        }

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

ThroughputRule.__dashjs_factory_name = 'ThroughputRule';
export default FactoryMaker.getClassFactory(ThroughputRule);
