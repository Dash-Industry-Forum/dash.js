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
function ThroughputModel(config) {

    config = config || {};
    const context = this.context;
    const debug = Debug(context).getInstance();
    const settings = config.settings;

    let throughputDict,
        latencyDict,
        ewmaThroughputDict,
        ewmaLatencyDict,
        ewmaHalfLife,
        logger;

    function setup() {
        logger = debug.getLogger(instance);
        ewmaHalfLife = {
            bandwidthHalfLife: {
                fast: settings.get().streaming.abr.throughput.ewma.throughputFastHalfLifeSeconds,
                slow: settings.get().streaming.abr.throughput.ewma.throughputSlowHalfLifeSeconds
            },
            latencyHalfLife: {
                fast: settings.get().streaming.abr.throughput.ewma.latencyFastHalfLifeCount,
                slow: settings.get().streaming.abr.throughput.ewma.latencySlowHalfLifeCount
            }
        };
        reset();
    }

    /**
     * Use the provided request to add new entries for throughput and latency. Update the Ewma state as well.
     * @param {MediaType} mediaType
     * @param {object} httpRequest
     */
    function addEntry(mediaType, httpRequest) {
        try {

            if (!mediaType || !httpRequest || !httpRequest.trace || !httpRequest.trace.length) {
                return;
            }

            _createSettingsForMediaType(mediaType);

            const latencyInMs = (httpRequest.tresponse.getTime() - httpRequest.trequest.getTime()) || 1;
            let throughputValues = _calculateThroughputValues(httpRequest, latencyInMs);
            throughputValues.latencyInMs = latencyInMs;

            if (isNaN(throughputValues.throughputInKbit) || !isFinite(throughputValues.throughputInKbit)) {
                return;
            }

            // Get estimated throughput (etp, in kbits/s) from CMSD response headers
            if (httpRequest.cmsd) {
                const etp = httpRequest.cmsd.dynamic && httpRequest.cmsd.dynamic.etp ? httpRequest.cmsd.dynamic.etp : null;
                if (etp) {
                    // Apply weight ratio on etp
                    const etpWeightRatio = settings.get().streaming.cmsd.abr.etpWeightRatio;
                    if (etpWeightRatio > 0 && etpWeightRatio <= 1) {
                        throughputValues.throughputInKbit = (throughputValues.throughputInKbit * (1 - etpWeightRatio)) + (etp * etpWeightRatio);
                    }
                }
            }

            const cacheReferenceTime = (httpRequest._tfinish.getTime() - httpRequest.trequest.getTime());

            if (_isCachedResponse(mediaType, cacheReferenceTime)) {
                logger.debug(`${mediaType} Assuming segment ${httpRequest.url} came from cache, ignoring it for throughput calculation`);
                return;
            }

            logger.debug(`Added throughput entry for ${mediaType}: ${throughputValues.throughputInKbit} kbit/s`)
            throughputDict[mediaType].push(throughputValues.throughputInKbit);
            latencyDict[mediaType].push(latencyInMs);
            _cleanupDict(mediaType);

            _updateEwmaValues(ewmaThroughputDict[mediaType], throughputValues.throughputInKbit, 0.001 * throughputValues.downloadTimeInMs, ewmaHalfLife.bandwidthHalfLife);
            _updateEwmaValues(ewmaLatencyDict[mediaType], latencyInMs, 1, ewmaHalfLife.latencyHalfLife);
        } catch (e) {
            logger.error(e);
        }
    }

    /**
     * Returns the throughput in kbit/s and the download time in ms for an HTTP request
     * @param {object} httpRequest
     * @return {object}
     * @private
     */
    function _calculateThroughputValues(httpRequest, latencyInMs) {

        // Low latency is enabled, we used the fetch API and received chunks
        if (httpRequest._fileLoaderType && httpRequest._fileLoaderType === Constants.FILE_LOADER_TYPES.FETCH) {
            return _calculateThroughputValuesForFetch(httpRequest, latencyInMs);
        }

        // Standard case, we used standard XHR requests
        else {
            return _calculateThroughputValuesForXhr(httpRequest, latencyInMs);
        }
    }

    /**
     * Calculates the throughput for requests using the Fetch API
     * @param {object} httpRequest
     * @param {number} latencyInMs
     * @return {number}
     * @private
     */
    function _calculateThroughputValuesForFetch(httpRequest) {
        console.log(`Traces length ${httpRequest.trace.length}`);

        // Use the standard throughput calculation if we can not use the Resource Timing API. Use the total download duration and the total number of bytes
        const downloadedBytes = httpRequest.trace.reduce((prev, curr) => prev + curr.b[0], 0);
        const downloadTimeInMs = httpRequest.trace.reduce((prev, curr) => prev + curr.d, 0);
        const throughputInKbit = Math.round((8 * downloadedBytes) / downloadTimeInMs); // bits/ms = kbits/s

        return {
            downloadedBytes,
            throughputInKbit,
            downloadTimeInMs
        };
    }

    /**
     * Returns the throughput in kbit/s and the download time in ms for requests using XHR
     * @param {object} httpRequest
     * @param {number} latencyInMs
     * @return {object}
     * @private
     */
    function _calculateThroughputValuesForXhr(httpRequest, latencyInMs) {
        let resourceTimingValues = null;
        let downloadedBytes = NaN;
        let downloadTimeInMs = NaN;


        if (settings.get().streaming.abr.throughput.useResourceTimingApi) {
            resourceTimingValues = _deriveDownloadValuesFromResourceTimingApi(httpRequest)
        }

        // Calculate the throughput using the ResourceTimingAPI if we got useful values
        if (resourceTimingValues && !isNaN(resourceTimingValues.downloadedBytes) && !isNaN(resourceTimingValues.downloadTimeInMs)) {
            downloadTimeInMs = resourceTimingValues.downloadTimeInMs;
            downloadedBytes = resourceTimingValues.downloadedBytes;
        }

        // Use the standard throughput calculation if we can not use the Resource Timing API
        else {
            // We need at least two entries in the traces. The first entry includes the latency and the XHR progress event was thrown once bytes have already been received.
            // The second progress event can be set in relation to the first progress event and therefor gives us more accurate values
            if (httpRequest.trace.length <= 1) {
                return { throughput: NaN, downloadTimeInMs: NaN }
            }
            downloadedBytes = httpRequest.trace.reduce((prev, curr) => prev + curr.b[0], 0) - httpRequest.trace[0].b[0];
            downloadTimeInMs = Math.max(httpRequest.trace.reduce((prev, curr) => prev + curr.d, 0) - httpRequest.trace[0].d, 1);
        }

        const referenceTimeInMs = settings.get().streaming.abr.throughput.useDeadTimeLatency ? downloadTimeInMs : downloadTimeInMs + latencyInMs;
        const throughputInKbit = Math.round((8 * downloadedBytes) / referenceTimeInMs) // bits/ms = kbits/s

        return {
            downloadedBytes,
            throughputInKbit,
            downloadTimeInMs
        };
    }

    /**
     * Calculate the downloaded bytes and the download times using the resource timing API
     * @param httpRequest
     * @returns {{downloadTimeInMs: (*|number|NaN), downloadedBytes: (*|number|NaN)}}
     * @private
     */
    function _deriveDownloadValuesFromResourceTimingApi(httpRequest) {
        let downloadedBytes = NaN;
        let downloadTimeInMs = NaN;

        if (httpRequest._resourceTimingValues && !isNaN(httpRequest._resourceTimingValues.responseStart) && httpRequest._resourceTimingValues.responseStart > 0
            && !isNaN(httpRequest._resourceTimingValues.responseEnd) && httpRequest._resourceTimingValues.responseEnd > 0 && !isNaN(httpRequest._resourceTimingValues.encodedBodySize) && httpRequest._resourceTimingValues.encodedBodySize > 0) {
            downloadedBytes = httpRequest._resourceTimingValues.encodedBodySize;
            downloadTimeInMs = httpRequest._resourceTimingValues.responseEnd - httpRequest._resourceTimingValues.responseStart;
        }

        return { downloadedBytes, downloadTimeInMs }
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
    function _updateEwmaValues(ewmaObj, value, weight, halfLife) {
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
     * Shift old entries once we reached the threshold
     * @param {MediaType} mediaType
     * @private
     */
    function _cleanupDict(mediaType) {
        if (throughputDict[mediaType].length > settings.get().streaming.abr.throughput.maxMeasurementsToKeep) {
            throughputDict[mediaType].shift();
        }
        if (latencyDict[mediaType].length > settings.get().streaming.abr.throughput.maxMeasurementsToKeep) {
            latencyDict[mediaType].shift();
        }
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

    function getThroughputDict(mediaType) {
        return throughputDict[mediaType];
    }

    function getEwmaThroughputDict(mediaType) {
        return ewmaThroughputDict[mediaType]
    }

    function getLatencyDict(mediaType) {
        return latencyDict[mediaType];
    }

    function getEwmaLatencyDict(mediaType) {
        return ewmaLatencyDict[mediaType];
    }

    function getEwmaHalfLife() {
        return ewmaHalfLife;
    }

    /**
     * Reset all values
     */
    function reset() {
        throughputDict = {};
        latencyDict = {};
        ewmaThroughputDict = {};
        ewmaLatencyDict = {};
    }

    const instance = {
        addEntry,
        getThroughputDict,
        getEwmaThroughputDict,
        getEwmaLatencyDict,
        getEwmaHalfLife,
        getLatencyDict,
        reset
    };

    setup();

    return instance;
}

ThroughputModel.__dashjs_factory_name = 'ThroughputModel';
export default FactoryMaker.getClassFactory(ThroughputModel);
