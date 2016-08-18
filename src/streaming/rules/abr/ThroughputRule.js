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
import BufferController from '../../controllers/BufferController';
import AbrController from '../../controllers/AbrController';
import MediaPlayerModel from '../../models/MediaPlayerModel';
import {HTTPRequest} from '../../vo/metrics/HTTPRequest';
import FactoryMaker from '../../../core/FactoryMaker';
import Debug from '../../../core/Debug';

function ThroughputRule(config) {

    const MAX_MEASUREMENTS_TO_KEEP = 20;
    const AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_LIVE = 3;
    const AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_VOD = 4;
    const CACHE_LOAD_THRESHOLD_VIDEO = 50;
    const CACHE_LOAD_THRESHOLD_AUDIO = 5;
    const THROUGHPUT_DECREASE_SCALE = 1.3;
    const THROUGHPUT_INCREASE_SCALE = 1.3;

    const context = this.context;
    const log = Debug(context).getInstance().log;
    const dashMetrics = config.dashMetrics;
    const metricsModel = config.metricsModel;

    let throughputArray,
        cacheLoadDict,
        mediaPlayerModel;

    function setup() {
        throughputArray = [];
        cacheLoadDict = {audio: {threshold: CACHE_LOAD_THRESHOLD_AUDIO, value: NaN}, video: {threshold: CACHE_LOAD_THRESHOLD_VIDEO, value: NaN}};//threshold is in milliseconds
        mediaPlayerModel = MediaPlayerModel(context).getInstance();
    }

    function storeLastRequestThroughputByType(type, throughput) {
        throughputArray[type] = throughputArray[type] || [];
        throughputArray[type].push(throughput);
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

    function execute (rulesContext, callback) {

        const mediaInfo = rulesContext.getMediaInfo();
        const mediaType = mediaInfo.type;
        const currentQuality = rulesContext.getCurrentValue();
        const metrics = metricsModel.getReadOnlyMetricsFor(mediaType);
        const streamProcessor = rulesContext.getStreamProcessor();
        const abrController = streamProcessor.getABRController();
        const isDynamic = streamProcessor.isDynamic();
        const lastRequest = dashMetrics.getCurrentHttpRequest(metrics);
        const bufferStateVO = (metrics.BufferState.length > 0) ? metrics.BufferState[metrics.BufferState.length - 1] : null;
        const switchRequest = SwitchRequest(context).create(SwitchRequest.NO_CHANGE, SwitchRequest.WEAK, {name: ThroughputRule.__dashjs_factory_name});

        if (!metrics || !lastRequest || lastRequest.type !== HTTPRequest.MEDIA_SEGMENT_TYPE || !bufferStateVO ) {
            callback(switchRequest);
            return;
        }

        let downloadTimeInMilliseconds;

        if (lastRequest.trace && lastRequest.trace.length) {

            downloadTimeInMilliseconds = lastRequest._tfinish.getTime() - lastRequest.tresponse.getTime() + 1; //Make sure never 0 we divide by this value. Avoid infinity!

            const bytes = lastRequest.trace.reduce((a, b) => a + b.b[0], 0);
            const lastRequestThroughput = Math.round((bytes * 8) / (downloadTimeInMilliseconds / 1000));

            //Prevent cached fragment loads from skewing the average throughput value - allow first even if cached to set allowance for ABR rules..
            if (downloadTimeInMilliseconds <= cacheLoadDict[mediaType].threshold) {
                cacheLoadDict[mediaType].value = lastRequestThroughput / 1000;
            } else {
                cacheLoadDict[mediaType].value = NaN;
                storeLastRequestThroughputByType(mediaType, lastRequestThroughput);
            }
        }

        const throughput = Math.round(!isNaN(cacheLoadDict[mediaType].value) ? cacheLoadDict[mediaType].value  : getAverageThroughput(mediaType, isDynamic));
        abrController.setAverageThroughput(mediaType, throughput);

        if (abrController.getAbandonmentStateFor(mediaType) !== AbrController.ABANDON_LOAD) {

            if (bufferStateVO.state === BufferController.BUFFER_LOADED || isDynamic) {
                const newQuality = abrController.getQualityForBitrate(mediaInfo, throughput);
                streamProcessor.getScheduleController().setTimeToLoadDelay(0);
                switchRequest.value = newQuality;
                switchRequest.priority = SwitchRequest.DEFAULT;
                switchRequest.reason.throughput = throughput;
            }

            if (switchRequest.value !== SwitchRequest.NO_CHANGE && switchRequest.value !== currentQuality) {
                log('ThroughputRule requesting switch to index: ', switchRequest.value, 'type: ',mediaType, ' Priority: ',
                    switchRequest.priority === SwitchRequest.DEFAULT ? 'Default' :
                        switchRequest.priority === SwitchRequest.STRONG ? 'Strong' : 'Weak', 'Average throughput', Math.round(throughput), 'kbps');
            }
        }

        callback(switchRequest);
    }

    function reset() {
        setup();
    }

    const instance = {
        execute: execute,
        reset: reset
    };

    setup();
    return instance;
}

ThroughputRule.__dashjs_factory_name = 'ThroughputRule';
export default FactoryMaker.getClassFactory(ThroughputRule);
