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
import Debug from '../../core/Debug';


/**
 * Throughput generally stored in kbit/s
 * Latency generally stored in ms
 * @param {object} config
 * @constructor
 */
function ThroughputHistory(config) {

    config = config || {};
    const context = this.context;
    const settings = config.settings;
    const debug = Debug(context).getInstance();

    let throughputDict,
        latencyDict,
        ewmaThroughputDict,
        ewmaLatencyDict,
        logger,
        ewmaHalfLife;

    function setup() {
        logger = debug.getLogger(instance);
        ewmaHalfLife = {
            throughputHalfLife: {
                fast: settings.get().streaming.abr.throughputHistory.ewma.throughputFastHalfLifeSeconds,
                slow: settings.get().streaming.abr.throughputHistory.ewma.throughputSlowHalfLifeSeconds
            },
            latencyHalfLife: {
                fast: settings.get().streaming.abr.throughputHistory.ewma.latencyFastHalfLifeCount,
                slow: settings.get().streaming.abr.throughputHistory.ewma.latencySlowHalfLifeCount
            }
        };

        reset();
    }

    /**
     * Use the provided request to add new entries for throughput and latency. Update the Ewma state as well.
     * @param {MediaType} mediaType
     * @param {object} httpRequest
     */
    function push(mediaType, httpRequest) {
        if (!httpRequest.trace || !httpRequest.trace.length) {
            return;
        }

        const latencyInMs = (httpRequest.tresponse.getTime() - httpRequest.trequest.getTime()) || 1;

        let values = _calculateThroughputAndDownloadTime(httpRequest, latencyInMs);
        const throughput = values.throughput;
        const downloadTimeInMs = values.downloadTimeInMs;

        if (isNaN(throughput) || !isFinite(throughput)) {
            return;
        }

        _createSettingsForMediaType(mediaType);

        const cacheReferenceTime = (httpRequest._tfinish.getTime() - httpRequest.tresponse.getTime());
        if (_isCachedResponse(mediaType, cacheReferenceTime)) {
            logger.debug(`${mediaType} Assuming segment ${httpRequest.url} came from cache`);
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

        latencyDict[mediaType].push(latencyInMs);
        if (latencyDict[mediaType].length > settings.get().streaming.abr.throughputHistory.maxMeasurementsToKeep) {
            latencyDict[mediaType].shift();
        }

        _updateEwmaEstimate(ewmaThroughputDict[mediaType], throughput, 0.001 * downloadTimeInMs, ewmaHalfLife.throughputHalfLife);
        _updateEwmaEstimate(ewmaLatencyDict[mediaType], latencyInMs, 1, ewmaHalfLife.latencyHalfLife);
    }

    /**
     * Returns the throughput in kbit/s and the download time in ms for an HTTP request
     * @param {object} httpRequest
     * @return {number}
     * @private
     */
    function _calculateThroughputAndDownloadTime(httpRequest, latencyInMs) {
        // Low latency is enabled, we used the fetch API and received chunks
        if (httpRequest._fileLoaderType && httpRequest._fileLoaderType === Constants.FILE_LOADER_TYPES.FETCH) {
            return _calculateThroughputAndDownloadTimeForFetch(httpRequest);
        }
        // Standard case, we used standard XHR requests
        else {
            return _calculateThroughputAndDownloadTimeForXhr(httpRequest, latencyInMs);
        }
    }

    /**
     * Calculates the throughput for requests using the Fetch API
     * @param {object} httpRequest
     * @return {number}
     * @private
     */
    function _calculateThroughputAndDownloadTimeForFetch(httpRequest) {
        const calculationMode = settings.get().streaming.abr.fetchThroughputCalculationMode;
        const downloadBytes = httpRequest.trace.reduce((prev, curr) => prev + curr.b[0], 0);

        if (calculationMode === Constants.ABR_FETCH_THROUGHPUT_CALCULATION_MOOF_PARSING) {
            const sumOfThroughputValues = httpRequest.trace.reduce((a, b) => a + b._t, 0);
            return Math.round(sumOfThroughputValues / httpRequest.trace.length);
        } else {
            let throughputMeasureTime = httpRequest.trace.reduce((prev, curr) => prev + curr.d, 0);
            return Math.round((8 * downloadBytes) / throughputMeasureTime); // bits/ms = kbits/s
        }

    }

    /**
     * Returns the throughput in kbit/s and the download time in ms for requests using XHR
     * @param {object} httpRequest
     * @param {number} latencyInMs
     * @return {number}
     * @private
     */
    function _calculateThroughputAndDownloadTimeForXhr(httpRequest, latencyInMs) {
        let downloadBytes;
        let downloadTimeInMs = NaN;

        // Calculate the throughput using the ResourceTimingAPI if we got useful values
        if (httpRequest._resourceTimingValues && !isNaN(httpRequest._resourceTimingValues.responseStart) && httpRequest._resourceTimingValues.responseStart > 0
            && !isNaN(httpRequest._resourceTimingValues.responseEnd) && httpRequest._resourceTimingValues.responseEnd > 0 && !isNaN(httpRequest._resourceTimingValues.transferSize) && httpRequest._resourceTimingValues.transferSize > 0) {
            downloadBytes = httpRequest._resourceTimingValues.transferSize;
            downloadTimeInMs = httpRequest._resourceTimingValues.responseEnd - httpRequest._resourceTimingValues.responseStart;
        }

        // Use the standard throughput calculation if we can not use the Resource Timing API
        else {
            // We need at least two entries in the traces. The first entry includes the latency and the XHR progress event was thrown once bytes have already been received.
            // The second progress event can be set in relation to the first progress event and therefor gives us more accurate values
            if (httpRequest.trace.length <= 1) {
                return { throughput: NaN, downloadTimeInMs: NaN }
            }
            downloadBytes = httpRequest.trace.reduce((prev, curr) => prev + curr.b[0], 0) - httpRequest.trace[0].b[0];
            downloadTimeInMs = Math.max(httpRequest.trace.reduce((prev, curr) => prev + curr.d, 0) - httpRequest.trace[0].d, 1);
        }
        const referenceTimeInMs = settings.get().streaming.abr.useDeadTimeLatency ? downloadTimeInMs : downloadTimeInMs + latencyInMs;

        return {
            throughput: Math.round((8 * downloadBytes) / referenceTimeInMs), // bits/ms = kbits/s
            downloadTimeInMs
        };
    }

    /**
     * Check if the response was cached.
     * @param {MediaType} mediaType
     * @param {number} cacheReferenceTime
     * @return {boolean}
     * @private
     */
    function _isCachedResponse(mediaType, cacheReferenceTime) {
        if (isNaN(cacheReferenceTime)) {
            return false;
        }
        if (mediaType === Constants.VIDEO) {
            return cacheReferenceTime < settings.get().streaming.cacheLoadThresholds[Constants.VIDEO];
        } else if (mediaType === Constants.AUDIO) {
            return cacheReferenceTime < settings.get().streaming.cacheLoadThresholds[Constants.AUDIO];
        }
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
     * Get average value
     * @param {boolean} isThroughput
     * @param {string} mediaType
     * @param {boolean} isDynamic
     * @return {number}
     * @private
     */
    function _getAverage(isThroughput, mediaType, isDynamic) {
        // only two moving average methods defined at the moment
        return settings.get().streaming.abr.movingAverageMethod !== Constants.MOVING_AVERAGE_SLIDING_WINDOW ?
            _getAverageEwma(isThroughput, mediaType) : _getAverageSlidingWindow(isThroughput, mediaType, isDynamic);
    }

    /**
     *
     * @param {boolean} isThroughput
     * @param {string} mediaType
     * @return {number}
     * @private
     */
    function _getAverageEwma(isThroughput, mediaType) {
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

    /**
     *
     * @param {boolean} isThroughput
     * @param {string} mediaType
     * @param {boolean} isDynamic
     * @return {number}
     * @private
     */
    function _getAverageSlidingWindow(isThroughput, mediaType, isDynamic) {
        const sampleSize = _getDefaultSampleSize(isThroughput, mediaType, isDynamic);
        const dict = isThroughput ? throughputDict : latencyDict;
        let arr = dict[mediaType];

        if (sampleSize === 0 || !arr || arr.length === 0) {
            return NaN;
        }

        arr = arr.slice(-sampleSize); // still works if sampleSize too large
        // arr.length >= 1
        return arr.reduce((total, elem) => total + elem) / arr.length;
    }

    /**
     * @param {boolean} isThroughput
     * @param {string} mediaType
     * @param {boolean} isLive
     * @return {number}
     * @private
     */
    function _getDefaultSampleSize(isThroughput, mediaType, isDynamic) {
        let arr,
            sampleSize;

        if (isThroughput) {
            arr = throughputDict[mediaType];
            sampleSize = isDynamic ? settings.get().streaming.abr.throughputHistory.averageThroughputSampleAmount.live : settings.get().streaming.abr.throughputHistory.averageThroughputSampleAmount.vod;
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
