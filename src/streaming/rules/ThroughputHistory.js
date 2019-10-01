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

import Constants from '../constants/Constants';
import FactoryMaker from '../../core/FactoryMaker';

// throughput generally stored in kbit/s
// latency generally stored in ms

function ThroughputHistory(config) {

    config = config || {};
    // sliding window constants
    const MAX_MEASUREMENTS_TO_KEEP = 20;
    const AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_LIVE = 3;
    const AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_VOD = 4;
    const AVERAGE_LATENCY_SAMPLE_AMOUNT = 4;
    const THROUGHPUT_DECREASE_SCALE = 1.3;
    const THROUGHPUT_INCREASE_SCALE = 1.3;

    // EWMA constants
    const EWMA_THROUGHPUT_SLOW_HALF_LIFE_SECONDS = 8;
    const EWMA_THROUGHPUT_FAST_HALF_LIFE_SECONDS = 3;
    const EWMA_LATENCY_SLOW_HALF_LIFE_COUNT = 2;
    const EWMA_LATENCY_FAST_HALF_LIFE_COUNT = 1;

    const settings = config.settings;

    let throughputDict,
        latencyDict,
        ewmaThroughputDict,
        ewmaLatencyDict,
        ewmaHalfLife;

    function setup() {
        ewmaHalfLife = {
            throughputHalfLife: { fast: EWMA_THROUGHPUT_FAST_HALF_LIFE_SECONDS, slow: EWMA_THROUGHPUT_SLOW_HALF_LIFE_SECONDS },
            latencyHalfLife:    { fast: EWMA_LATENCY_FAST_HALF_LIFE_COUNT,      slow: EWMA_LATENCY_SLOW_HALF_LIFE_COUNT }
        };

        reset();
    }

    function isCachedResponse(mediaType, latencyMs, downloadTimeMs) {
        if (mediaType === Constants.VIDEO) {
            return downloadTimeMs < settings.get().streaming.cacheLoadThresholds[Constants.VIDEO];
        } else if (mediaType === Constants.AUDIO) {
            return downloadTimeMs < settings.get().streaming.cacheLoadThresholds[Constants.AUDIO];
        }
    }

    function push(mediaType, httpRequest, useDeadTimeLatency) {
        if (!httpRequest.trace || !httpRequest.trace.length) {
            return;
        }

        const latencyTimeInMilliseconds = (httpRequest.tresponse.getTime() - httpRequest.trequest.getTime()) || 1;
        const downloadTimeInMilliseconds = (httpRequest._tfinish.getTime() - httpRequest.tresponse.getTime()) || 1; //Make sure never 0 we divide by this value. Avoid infinity!
        const downloadBytes = httpRequest.trace.reduce((a, b) => a + b.b[0], 0);

        let throughputMeasureTime;
        if (settings.get().streaming.lowLatencyEnabled) {
            throughputMeasureTime = httpRequest.trace.reduce((a, b) => a + b.d, 0);
        } else {
            throughputMeasureTime = useDeadTimeLatency ? downloadTimeInMilliseconds : latencyTimeInMilliseconds + downloadTimeInMilliseconds;
        }

        const throughput = Math.round((8 * downloadBytes) / throughputMeasureTime); // bits/ms = kbits/s

        checkSettingsForMediaType(mediaType);

        if (isCachedResponse(mediaType, latencyTimeInMilliseconds, downloadTimeInMilliseconds)) {
            if (throughputDict[mediaType].length > 0 && !throughputDict[mediaType].hasCachedEntries) {
                // already have some entries which are not cached entries
                // prevent cached fragment loads from skewing the average values
                return;
            } else { // have no entries || have cached entries
                // no uncached entries yet, rely on cached entries because ABR rules need something to go by
                throughputDict[mediaType].hasCachedEntries = true;
            }
        } else if (throughputDict[mediaType] && throughputDict[mediaType].hasCachedEntries) {
            // if we are here then we have some entries already, but they are cached, and now we have a new uncached entry
            clearSettingsForMediaType(mediaType);
        }

        throughputDict[mediaType].push(throughput);
        if (throughputDict[mediaType].length > MAX_MEASUREMENTS_TO_KEEP) {
            throughputDict[mediaType].shift();
        }

        latencyDict[mediaType].push(latencyTimeInMilliseconds);
        if (latencyDict[mediaType].length > MAX_MEASUREMENTS_TO_KEEP) {
            latencyDict[mediaType].shift();
        }

        updateEwmaEstimate(ewmaThroughputDict[mediaType], throughput, 0.001 * downloadTimeInMilliseconds, ewmaHalfLife.throughputHalfLife);
        updateEwmaEstimate(ewmaLatencyDict[mediaType], latencyTimeInMilliseconds, 1, ewmaHalfLife.latencyHalfLife);
    }

    function updateEwmaEstimate(ewmaObj, value, weight, halfLife) {
        // Note about startup:
        // Estimates start at 0, so early values are underestimated.
        // This effect is countered in getAverageEwma() by dividing the estimates by:
        //     1 - Math.pow(0.5, ewmaObj.totalWeight / halfLife)

        const fastAlpha = Math.pow(0.5, weight / halfLife.fast);
        ewmaObj.fastEstimate = (1 - fastAlpha) * value + fastAlpha * ewmaObj.fastEstimate;

        const slowAlpha = Math.pow(0.5, weight / halfLife.slow);
        ewmaObj.slowEstimate = (1 - slowAlpha) * value + slowAlpha * ewmaObj.slowEstimate;

        ewmaObj.totalWeight += weight;
    }

    function getSampleSize(isThroughput, mediaType, isLive) {
        let arr,
            sampleSize;

        if (isThroughput) {
            arr = throughputDict[mediaType];
            sampleSize = isLive ? AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_LIVE : AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_VOD;
        } else {
            arr = latencyDict[mediaType];
            sampleSize = AVERAGE_LATENCY_SAMPLE_AMOUNT;
        }

        if (!arr) {
            sampleSize = 0;
        } else if (sampleSize >= arr.length) {
            sampleSize = arr.length;
        } else if (isThroughput) {
            // if throughput samples vary a lot, average over a wider sample
            for (let i = 1; i < sampleSize; ++i) {
                const ratio = arr[i] / arr[i - 1];
                if (ratio >= THROUGHPUT_INCREASE_SCALE || ratio <= 1 / THROUGHPUT_DECREASE_SCALE) {
                    sampleSize += 1;
                    if (sampleSize === arr.length) { // cannot increase sampleSize beyond arr.length
                        break;
                    }
                }
            }
        }

        return sampleSize;
    }

    function getAverage(isThroughput, mediaType, isDynamic) {
        // only two moving average methods defined at the moment
        return settings.get().streaming.abr.movingAverageMethod !== Constants.MOVING_AVERAGE_SLIDING_WINDOW ?
            getAverageEwma(isThroughput, mediaType) : getAverageSlidingWindow(isThroughput, mediaType, isDynamic);
    }

    function getAverageSlidingWindow(isThroughput, mediaType, isDynamic) {
        const sampleSize = getSampleSize(isThroughput, mediaType, isDynamic);
        const dict = isThroughput ? throughputDict : latencyDict;
        let arr = dict[mediaType];

        if (sampleSize === 0 || !arr || arr.length === 0) {
            return NaN;
        }

        arr = arr.slice(-sampleSize); // still works if sampleSize too large
        // arr.length >= 1
        return arr.reduce((total, elem) => total + elem) / arr.length;
    }

    function getAverageEwma(isThroughput, mediaType) {
        const halfLife = isThroughput ? ewmaHalfLife.throughputHalfLife : ewmaHalfLife.latencyHalfLife;
        const ewmaObj = isThroughput ? ewmaThroughputDict[mediaType] : ewmaLatencyDict[mediaType];

        if (!ewmaObj || ewmaObj.totalWeight <= 0) {
            return NaN;
        }

        // to correct for startup, divide by zero factor = 1 - Math.pow(0.5, ewmaObj.totalWeight / halfLife)
        const fastEstimate = ewmaObj.fastEstimate / (1 - Math.pow(0.5, ewmaObj.totalWeight / halfLife.fast));
        const slowEstimate = ewmaObj.slowEstimate / (1 - Math.pow(0.5, ewmaObj.totalWeight / halfLife.slow));
        return isThroughput ? Math.min(fastEstimate, slowEstimate) : Math.max(fastEstimate, slowEstimate);
    }

    function getAverageThroughput(mediaType, isDynamic) {
        return getAverage(true, mediaType, isDynamic);
    }

    function getSafeAverageThroughput(mediaType, isDynamic) {
        let average = getAverageThroughput(mediaType, isDynamic);
        if (!isNaN(average)) {
            average *= settings.get().streaming.abr.bandwidthSafetyFactor;
        }
        return average;
    }

    function getAverageLatency(mediaType) {
        return getAverage(false, mediaType);
    }

    function checkSettingsForMediaType(mediaType) {
        throughputDict[mediaType] = throughputDict[mediaType] || [];
        latencyDict[mediaType] = latencyDict[mediaType] || [];
        ewmaThroughputDict[mediaType] = ewmaThroughputDict[mediaType] || {fastEstimate: 0, slowEstimate: 0, totalWeight: 0};
        ewmaLatencyDict[mediaType] = ewmaLatencyDict[mediaType] || {fastEstimate: 0, slowEstimate: 0, totalWeight: 0};
    }

    function clearSettingsForMediaType(mediaType) {
        delete throughputDict[mediaType];
        delete latencyDict[mediaType];
        delete ewmaThroughputDict[mediaType];
        delete ewmaLatencyDict[mediaType];
        checkSettingsForMediaType(mediaType);
    }

    function reset() {
        throughputDict = {};
        latencyDict = {};
        ewmaThroughputDict = {};
        ewmaLatencyDict = {};
    }

    const instance = {
        push: push,
        getAverageThroughput: getAverageThroughput,
        getSafeAverageThroughput: getSafeAverageThroughput,
        getAverageLatency: getAverageLatency,
        reset: reset
    };

    setup();
    return instance;
}

ThroughputHistory.__dashjs_factory_name = 'ThroughputHistory';
export default FactoryMaker.getClassFactory(ThroughputHistory);
