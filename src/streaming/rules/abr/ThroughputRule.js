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
import BufferController from '../../controllers/BufferController';
import AbrController from '../../controllers/AbrController';
import MediaPlayerModel from '../../models/MediaPlayerModel';
import {HTTPRequest} from '../../vo/metrics/HTTPRequest';
import FactoryMaker from '../../../core/FactoryMaker';
import Debug from '../../../core/Debug';
import SwitchRequest from '../SwitchRequest.js';

function ThroughputRule(config) {

    const MAX_MEASUREMENTS_TO_KEEP = 20;
    const AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_LIVE = 3;
    const AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_VOD = 4;
    const AVERAGE_LATENCY_SAMPLES = AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_VOD;
    const CACHE_LOAD_THRESHOLD_VIDEO = 50;
    const CACHE_LOAD_THRESHOLD_AUDIO = 5;
    const CACHE_LOAD_THRESHOLD_LATENCY = 50;
    const THROUGHPUT_DECREASE_SCALE = 1.3;
    const THROUGHPUT_INCREASE_SCALE = 1.3;

    const context = this.context;
    const log = Debug(context).getInstance().log;
    const dashMetrics = config.dashMetrics;
    const metricsModel = config.metricsModel;

    let throughputArray,
        latencyArray,
        mediaPlayerModel;

    function setup() {
        throughputArray = [];
        latencyArray = [];
        mediaPlayerModel = MediaPlayerModel(context).getInstance();
    }

    function storeLastRequestThroughputByType(type, throughput) {
        throughputArray[type] = throughputArray[type] || [];
        throughputArray[type].push(throughput);
    }

    function storeLatency(mediaType, latency) {
        if (!latencyArray[mediaType]) {
            latencyArray[mediaType] = [];
        }
        latencyArray[mediaType].push(latency);

        if (latencyArray[mediaType].length > AVERAGE_LATENCY_SAMPLES) {
            return latencyArray[mediaType].shift();
        }

        return undefined;
    }

    function getAverageLatency(mediaType) {
        let average;
        if (latencyArray[mediaType] && latencyArray[mediaType].length > 0) {
            average = latencyArray[mediaType].reduce((a, b) => { return a + b; }) / latencyArray[mediaType].length;
        }

        return average;
    }

    function getSample(type, isDynamic) {
        let size = Math.min(throughputArray[type].length, isDynamic ? AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_LIVE : AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_VOD);
        const sampleArray = throughputArray[type].slice(size * -1, throughputArray[type].length);
        if (sampleArray.length > 1) {
            sampleArray.reduce((a, b) => {
                if (a * THROUGHPUT_INCREASE_SCALE <= b || a >= b * THROUGHPUT_DECREASE_SCALE) {
                    size++;
                }
                return b;
            });
        }
        size = Math.min(throughputArray[type].length, size);
        return throughputArray[type].slice(size * -1, throughputArray[type].length);
    }

    function getAverageThroughput(type, isDynamic) {
        const sample = getSample(type, isDynamic);
        let averageThroughput = 0;
        if (sample.length > 0) {
            const totalSampledValue = sample.reduce((a, b) => a + b, 0);
            averageThroughput = totalSampledValue / sample.length;
        }
        if (throughputArray[type].length >= MAX_MEASUREMENTS_TO_KEEP) {
            throughputArray[type].shift();
        }
        return (averageThroughput / 1000 ) * mediaPlayerModel.getBandwidthSafetyFactor();
    }

    function isCachedResponse(latency, downloadTime, mediaType) {
        let ret = false;

        if (latency < CACHE_LOAD_THRESHOLD_LATENCY) {
            ret = true;
        }

        if (!ret) {
            switch (mediaType) {
                case 'video':
                    ret = downloadTime < CACHE_LOAD_THRESHOLD_VIDEO;
                    break;
                case 'audio':
                    ret = downloadTime < CACHE_LOAD_THRESHOLD_AUDIO;
                    break;
                default:
                    break;
            }
        }

        return ret;
    }

    function getMaxIndex(rulesContext) {
        const mediaInfo = rulesContext.getMediaInfo();
        const mediaType = mediaInfo.type;
        const metrics = metricsModel.getReadOnlyMetricsFor(mediaType);
        const streamProcessor = rulesContext.getStreamProcessor();
        const abrController = streamProcessor.getABRController();
        const isDynamic = streamProcessor.isDynamic();
        const lastRequest = dashMetrics.getCurrentHttpRequest(metrics);
        const bufferStateVO = (metrics.BufferState.length > 0) ? metrics.BufferState[metrics.BufferState.length - 1] : null;
        const hasRichBuffer = rulesContext.hasRichBuffer();
        const switchRequest = SwitchRequest(context).create();

        if (!metrics || !lastRequest || lastRequest.type !== HTTPRequest.MEDIA_SEGMENT_TYPE || !bufferStateVO || hasRichBuffer) {
            return switchRequest;
        }

        let downloadTimeInMilliseconds;
        let latencyTimeInMilliseconds;

        if (lastRequest.trace && lastRequest.trace.length) {

            latencyTimeInMilliseconds = (lastRequest.tresponse.getTime() - lastRequest.trequest.getTime()) || 1;
            downloadTimeInMilliseconds = (lastRequest._tfinish.getTime() - lastRequest.tresponse.getTime()) || 1; //Make sure never 0 we divide by this value. Avoid infinity!

            const bytes = lastRequest.trace.reduce((a, b) => a + b.b[0], 0);

            const lastRequestThroughput = Math.round((bytes * 8) / (downloadTimeInMilliseconds / 1000));

            let throughput;
            let latency;
            //Prevent cached fragment loads from skewing the average throughput value - allow first even if cached to set allowance for ABR rules..
            if (isCachedResponse(latencyTimeInMilliseconds, downloadTimeInMilliseconds, mediaType)) {
                if (!throughputArray[mediaType] || !latencyArray[mediaType]) {
                    throughput = lastRequestThroughput / 1000;
                    latency = latencyTimeInMilliseconds;
                } else {
                    throughput = getAverageThroughput(mediaType, isDynamic);
                    latency = getAverageLatency(mediaType);
                }
            } else {
                storeLastRequestThroughputByType(mediaType, lastRequestThroughput);
                throughput = getAverageThroughput(mediaType, isDynamic);
                storeLatency(mediaType, latencyTimeInMilliseconds);
                latency = getAverageLatency(mediaType, isDynamic);
            }

            abrController.setAverageThroughput(mediaType, throughput);

            if (abrController.getAbandonmentStateFor(mediaType) !== AbrController.ABANDON_LOAD) {

                if (bufferStateVO.state === BufferController.BUFFER_LOADED || isDynamic) {
                    switchRequest.value = abrController.getQualityForBitrate(mediaInfo, throughput, latency);
                    streamProcessor.getScheduleController().setTimeToLoadDelay(0);
                    log('ThroughputRule requesting switch to index: ', switchRequest.value, 'type: ',mediaType, 'Average throughput', Math.round(throughput), 'kbps');
                    switchRequest.reason = {throughput: throughput, latency: latency};
                }
            }
        }
        return switchRequest;
    }

    function reset() {
        setup();
    }

    const instance = {
        getMaxIndex: getMaxIndex,
        reset: reset
    };

    setup();
    return instance;
}

ThroughputRule.__dashjs_factory_name = 'ThroughputRule';
export default FactoryMaker.getClassFactory(ThroughputRule);
