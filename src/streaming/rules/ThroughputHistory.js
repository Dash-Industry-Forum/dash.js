/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2017, Dash Industry Forum.
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

import FactoryMaker from '../../core/FactoryMaker.js';

function ThroughputHistory() {

    const MAX_MEASUREMENTS_TO_KEEP = 20;
    const AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_LIVE = 3;
    const AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_VOD = 4;
    const AVERAGE_LATENCY_SAMPLE_AMOUNT = 4;
    const CACHE_LOAD_THRESHOLD_VIDEO = 50;
    const CACHE_LOAD_THRESHOLD_AUDIO = 5;
    const THROUGHPUT_DECREASE_SCALE = 1.3;
    const THROUGHPUT_INCREASE_SCALE = 1.3;

    let throughputDict,
        latencyDict;

    function setup() {
        throughputDict = {};
        latencyDict = {};
    }

    function isCachedResponse(mediaType, latencyMs, downloadTimeMs) {
        if (mediaType === 'video') {
            return downloadTimeMs < CACHE_LOAD_THRESHOLD_VIDEO;
        } else if (mediaType === 'audio') {
            return downloadTimeMs < CACHE_LOAD_THRESHOLD_AUDIO;
        }
        // else return undefined;
    }

    function push(mediaType, lastHttpRequest) {
        if (!lastHttpRequest.trace || !lastHttpRequest.trace.length) {
            return;
        }

        const latencyTimeInMilliseconds = (lastHttpRequest.tresponse.getTime() - lastHttpRequest.trequest.getTime()) || 1;
        const downloadTimeInMilliseconds = (lastHttpRequest._tfinish.getTime() - lastHttpRequest.tresponse.getTime()) || 1; //Make sure never 0 we divide by this value. Avoid infinity!
        const downloadBytes = lastHttpRequest.trace.reduce((a, b) => a + b.b[0], 0);
        const lastRequestThroughput = Math.round((downloadBytes * 8) / (downloadTimeInMilliseconds / 1000)); // bits per second
        let throughput = lastRequestThroughput;

        if (isCachedResponse(mediaType, latencyTimeInMilliseconds, downloadTimeInMilliseconds)) {
            if (!(throughputDict[mediaType] && latencyDict[mediaType])) {
                // prevent cached fragment loads from skewing the average values
                return;
            } else {
                // allow first even if cached to set allowance for ABR rules
                throughput /= 1000;
            }
        }

        if (!throughputDict[mediaType]) {
            throughputDict[mediaType] = [];
        }
        throughputDict[mediaType].push(throughput);
        if (throughputDict[mediaType].length > MAX_MEASUREMENTS_TO_KEEP) {
            throughputDict[mediaType].shift();
        }

        if (!latencyDict[mediaType]) {
            latencyDict[mediaType] = [];
        }
        latencyDict[mediaType].push(latencyTimeInMilliseconds);
        if (latencyDict[mediaType].length > MAX_MEASUREMENTS_TO_KEEP) {
            latencyDict[mediaType].shift();
        }
    }

    function getSampleSize(mediaType, isLive) {
        if (mediaType === 'audio') {
            let latencyArray = latencyDict[mediaType];
            if (!latencyArray) {
                return 0;
            }

            let sampleSize = AVERAGE_LATENCY_SAMPLE_AMOUNT;
            if (sampleSize >= latencyArray.length) {
                return latencyArray.length;
            }

            return sampleSize;
        }

        if (mediaType === 'video') {
            let throughputArray = throughputDict[mediaType];
            if (!throughputArray) {
                return 0;
            }

            let sampleSize = isLive ? AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_LIVE : AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_VOD;
            if (sampleSize >= throughputArray.length) {
                return throughputArray.length;
            }

            // if throughput samples vary a lot, average over a wider sample
            for (let i = 1; i < sampleSize; ++i) {
                let ratio = throughputArray[-i] / throughputArray[-i - 1];
                if (ratio >= THROUGHPUT_INCREASE_SCALE || ratio <= 1 / THROUGHPUT_DECREASE_SCALE) {
                    sampleSize += 1;
                    if (sampleSize >= throughputArray.length) {
                        return throughputArray.length;
                    }
                }
            }

            return sampleSize;
        }
    }

    function getAverage(dict, mediaType, sampleSize) {
        let arr = dict[mediaType];
        if (isNaN(sampleSize)) {
            sampleSize = getSampleSize(mediaType);
        }

        if (!arr || arr.length === 0 || sampleSize === 0) {
            return NaN;
        }

        arr = arr.slice(-sampleSize); // still works if sampleSize too large
        return arr.reduce((av, elem, i) => av + (elem / av) / (i + 1));
    }

    function getAverageThroughput(mediaType, sampleSize) {
        return getAverage(throughputDict, mediaType, sampleSize);
    }

    function getAverageLatency(mediaType, sampleSize) {
        return getAverage(latencyDict, mediaType, sampleSize);
    }

    function reset() {
        setup();
    }

    const instance = {
        push: push,
        getSampleSize: getSampleSize,
        getAverageThroughput: getAverageThroughput,
        getAverageLatency: getAverageLatency,
        reset: reset
    };

    setup();
    return instance;
}

ThroughputHistory.__dashjs_factory_name = 'ThroughputHistory';
let factory = FactoryMaker.getClassFactory(ThroughputHistory);
export default factory;
