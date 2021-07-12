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

    const settings = config.settings;

    let throughputDict,
        latencyDict,
        ewmaThroughputDict,
        ewmaLatencyDict,
        ewmaHalfLife;

    function setup() {
        ewmaHalfLife = {
            throughputHalfLife: {
                fast: settings.get().streaming.abr.throughputHistory.ewma.throughputFastHalfLifeSeconds,
                slow: settings.get().streaming.abr.throughputHistory.ewma.throughputSlowHalfLifeSeconds
            },
            latencyHalfLife: { fast: settings.get().streaming.abr.throughputHistory.ewma.latencyFastHalfLifeCount, slow: settings.get().streaming.abr.throughputHistory.ewma.latencySlowHalfLifeCount }
        };

        reset();
    }

    /**
     * Use the provided request to add new entries for throughput and latency. Update the Ewma state as well.
     * @param {MediaType} mediaType
     * @param {object} httpRequest
     * @param {boolean} useDeadTimeLatency
     */
    function push(mediaType, httpRequest, useDeadTimeLatency) {
        if (!httpRequest.trace || !httpRequest.trace.length) {
            return;
        }

        const latencyTimeInMilliseconds = (httpRequest.tresponse.getTime() - httpRequest.trequest.getTime()) || 1; // Time between first byte received and start time of the request
        const downloadTimeInMilliseconds = (httpRequest._tfinish.getTime() - httpRequest.tresponse.getTime()) || 1; //Make sure never 0 we divide by this value. Avoid infinity!

        let throughput = _calculateThroughput(httpRequest, useDeadTimeLatency, latencyTimeInMilliseconds, downloadTimeInMilliseconds);


        _createSettingsForMediaType(mediaType);

        if (_isCachedResponse(mediaType, downloadTimeInMilliseconds)) {
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
            _clearSettingsForMediaType(mediaType);
            _createSettingsForMediaType(mediaType);
        }

        throughputDict[mediaType].push(throughput);
        if (throughputDict[mediaType].length > settings.get().streaming.abr.throughputHistory.maxMeasurementsToKeep) {
            throughputDict[mediaType].shift();
        }

        latencyDict[mediaType].push(latencyTimeInMilliseconds);
        if (latencyDict[mediaType].length > settings.get().streaming.abr.throughputHistory.maxMeasurementsToKeep) {
            latencyDict[mediaType].shift();
        }

        _updateEwmaEstimate(ewmaThroughputDict[mediaType], throughput, 0.001 * downloadTimeInMilliseconds, ewmaHalfLife.throughputHalfLife);
        _updateEwmaEstimate(ewmaLatencyDict[mediaType], latencyTimeInMilliseconds, 1, ewmaHalfLife.latencyHalfLife);
    }

    /**
     * Check if the response was cached.
     * @param {MediaType} mediaType
     * @param {number} downloadTimeMs
     * @return {boolean}
     * @private
     */
    function _isCachedResponse(mediaType, downloadTimeMs) {
        if (mediaType === Constants.VIDEO) {
            return downloadTimeMs < settings.get().streaming.cacheLoadThresholds[Constants.VIDEO];
        } else if (mediaType === Constants.AUDIO) {
            return downloadTimeMs < settings.get().streaming.cacheLoadThresholds[Constants.AUDIO];
        }
    }

    /**
     * Calculates the throughput for an HTTP request
     * @param {object} httpRequest
     * @param {boolean} useDeadTimeLatency
     * @param {number} latencyTimeInMilliseconds
     * @param {number} downloadTimeInMilliseconds
     * @return {number}
     * @private
     */
    function _calculateThroughput(httpRequest, useDeadTimeLatency, latencyTimeInMilliseconds, downloadTimeInMilliseconds) {
        let throughputMeasureTime = 0;
        let throughput = 0;

        const downloadBytes = httpRequest.trace.reduce((a, b) => a + b.b[0], 0);

        if (settings.get().streaming.lowLatencyEnabled) {
            const calculationMode = settings.get().streaming.abr.fetchThroughputCalculationMode;
            if (calculationMode === Constants.ABR_FETCH_THROUGHPUT_CALCULATION_MOOF_PARSING) {
                const sumOfThroughputValues = httpRequest.trace.reduce((a, b) => a + b.t, 0);
                throughput = Math.round(sumOfThroughputValues / httpRequest.trace.length);
            }
            if (throughput === 0) {
                throughputMeasureTime = httpRequest.trace.reduce((a, b) => a + b.d, 0);
            }
        } else {
            throughputMeasureTime = useDeadTimeLatency ? downloadTimeInMilliseconds : latencyTimeInMilliseconds + downloadTimeInMilliseconds;
        }

        if (throughputMeasureTime !== 0) {
            throughput = Math.round((8 * downloadBytes) / throughputMeasureTime); // bits/ms = kbits/s
        }

        return throughput;
    }

    /**
     *
     * @param {object} ewmaObj
     * @param {number} value
     * @param {number} weight
     * @param {object} halfLife
     * @private
     */
    function _updateEwmaEstimate(ewmaObj, value, weight, halfLife) {
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

    /**
     *
     * @param isThroughput
     * @param mediaType
     * @param isLive
     * @return {number}
     * @private
     */
    function _getSampleSize(isThroughput, mediaType, isLive) {
        let arr,
            sampleSize;

        if (isThroughput) {
            arr = throughputDict[mediaType];
            sampleSize = isLive ? settings.get().streaming.abr.throughputHistory.averageThroughputSampleAmount.live : settings.get().streaming.abr.throughputHistory.averageThroughputSampleAmount.vod;
        } else {
            arr = latencyDict[mediaType];
            sampleSize = settings.get().streaming.abr.throughputHistory.averageLatencySampleAmount;
        }

        if (!arr) {
            sampleSize = 0;
        } else if (sampleSize >= arr.length) {
            sampleSize = arr.length;
        } else if (isThroughput) {
            // if throughput samples vary a lot, average over a wider sample
            for (let i = 1; i < sampleSize; ++i) {
                const ratio = arr[arr.length - i] / arr[arr.length - i - 1];
                if (ratio >= settings.get().streaming.abr.throughputHistory.throughputIncreaseScale || ratio <= 1 / settings.get().streaming.abr.throughputHistory.throughputDecreaseScale) {
                    sampleSize += 1;
                    if (sampleSize === arr.length) { // cannot increase sampleSize beyond arr.length
                        break;
                    }
                }
            }
        }

        return sampleSize;
    }

    function _getAverage(isThroughput, mediaType, isDynamic) {
        // only two moving average methods defined at the moment
        return settings.get().streaming.abr.movingAverageMethod !== Constants.MOVING_AVERAGE_SLIDING_WINDOW ?
            getAverageEwma(isThroughput, mediaType) : getAverageSlidingWindow(isThroughput, mediaType, isDynamic);
    }

    function getAverageSlidingWindow(isThroughput, mediaType, isDynamic) {
        const sampleSize = _getSampleSize(isThroughput, mediaType, isDynamic);
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
        return _getAverage(true, mediaType, isDynamic);
    }

    function getSafeAverageThroughput(mediaType, isDynamic) {
        let average = getAverageThroughput(mediaType, isDynamic);
        if (!isNaN(average)) {
            average *= settings.get().streaming.abr.bandwidthSafetyFactor;
        }
        return average;
    }

    function getAverageLatency(mediaType) {
        return _getAverage(false, mediaType);
    }

    /**
     * Setup the dict objects for a specific media type
     * @param mediaType
     * @private
     */
    function _createSettingsForMediaType(mediaType) {
        throughputDict[mediaType] = throughputDict[mediaType] || [];
        latencyDict[mediaType] = latencyDict[mediaType] || [];
        ewmaThroughputDict[mediaType] = ewmaThroughputDict[mediaType] || {
            fastEstimate: 0,
            slowEstimate: 0,
            totalWeight: 0
        };
        ewmaLatencyDict[mediaType] = ewmaLatencyDict[mediaType] || { fastEstimate: 0, slowEstimate: 0, totalWeight: 0 };
    }

    function _clearSettingsForMediaType(mediaType) {
        delete throughputDict[mediaType];
        delete latencyDict[mediaType];
        delete ewmaThroughputDict[mediaType];
        delete ewmaLatencyDict[mediaType];
    }

    function reset() {
        throughputDict = {};
        latencyDict = {};
        ewmaThroughputDict = {};
        ewmaLatencyDict = {};
    }

    const instance = {
        push,
        getAverageThroughput,
        getSafeAverageThroughput,
        getAverageLatency,
        reset
    };

    setup();
    return instance;
}

ThroughputHistory.__dashjs_factory_name = 'ThroughputHistory';
export default FactoryMaker.getClassFactory(ThroughputHistory);
