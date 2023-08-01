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
import ThroughputModel from '../models/ThroughputModel';
import MetricsConstants from '../constants/MetricsConstants';
import {HTTPRequest} from '../vo/metrics/HTTPRequest';
import MediaPlayerEvents from '../MediaPlayerEvents';
import EventBus from '../../core/EventBus';

/**
 * @constructor
 */
function ThroughputController() {

    const context = this.context;
    const eventBus = EventBus(context).getInstance();

    let throughputModel,
        playbackController,
        settings;

    function initialize() {
        throughputModel = ThroughputModel(context).create({
            settings
        });
        _registerEvents();
    }

    function setConfig(config) {
        if (config.settings) {
            settings = config.settings;
        }

        if (config.playbackController) {
            playbackController = config.playbackController;
        }
    }

    function _registerEvents() {
        eventBus.on(MediaPlayerEvents.METRIC_ADDED, _onMetricAdded, instance);
    }

    function _resetEvents() {
        eventBus.off(MediaPlayerEvents.METRIC_ADDED, _onMetricAdded, instance);
    }

    /**
     * Push new values to the throughput model once a HTTP request completed
     * @param {object} e
     * @private
     */
    function _onMetricAdded(e) {
        if (e.metric === MetricsConstants.HTTP_REQUEST && e.value && (e.value.type === HTTPRequest.MPD_TYPE || (e.value.type === HTTPRequest.MEDIA_SEGMENT_TYPE && (e.mediaType === Constants.AUDIO || e.mediaType === Constants.VIDEO)))) {
            throughputModel.addEntry(e.mediaType, e.value);
        }
    }

    /**
     * Get average value
     * @param {string} throughputType
     * @param {string} mediaType
     * @param {string|null} calculationMode
     * @param {number} sampleSize
     * @return {number}
     * @private
     */
    function _getAverage(throughputType, mediaType, calculationMode = null, sampleSize = NaN, serviceLocation = null) {
        let dict = null;
        let ewmaHalfLife = throughputModel.getEwmaHalfLife();
        let halfLife = null;
        let useMin = true;

        if (!calculationMode) {
            calculationMode = settings.get().streaming.abr.throughput.averageCalculationMode;
        }

        switch (throughputType) {

            // Set the parameters for the standard bandwidth calculation based on throughput values for a media type
            case Constants.THROUGHPUT_TYPES.BANDWIDTH:
                dict = calculationMode === Constants.THROUGHPUT_CALCULATION_MODES.EWMA ? throughputModel.getEwmaThroughputDict(mediaType) : throughputModel.getThroughputDict(mediaType);
                halfLife = ewmaHalfLife.bandwidthHalfLife;
                useMin = true;
                sampleSize = !isNaN(sampleSize) ? sampleSize : playbackController.getIsDynamic() ? settings.get().streaming.abr.throughput.sampleSettings.live : settings.get().streaming.abr.throughput.sampleSettings.vod;
                break;

            // Set the parameters for the standard latency calculation based on throughput values for a media type
            case Constants.THROUGHPUT_TYPES.LATENCY:
                dict = calculationMode === Constants.THROUGHPUT_CALCULATION_MODES.EWMA ? throughputModel.getEwmaLatencyDict(mediaType) : throughputModel.getLatencyDict(mediaType);
                halfLife = ewmaHalfLife.latencyHalfLife;
                useMin = false;
                sampleSize = !isNaN(sampleSize) ? sampleSize : settings.get().streaming.abr.throughput.sampleSettings.averageLatencySampleAmount;
                break;

            // Set the parameters for the  bandwidth calculation based for a specific service location. Used for content steering
            case Constants.THROUGHPUT_TYPES.BANDWIDTH_FOR_SERVICE_LOCATION:
                if (!serviceLocation) {
                    dict = null;
                } else {
                    dict = _getThroughputValuesByServiceLocation(throughputModel.getThroughputDict(), serviceLocation)
                    if (!dict || dict.length === 0) {
                        dict = _getThroughputValuesByServiceLocation(throughputModel.getMpdThroughputDict(), serviceLocation)
                    }
                    sampleSize = !isNaN(sampleSize) ? sampleSize : playbackController.getIsDynamic() ? settings.get().streaming.abr.throughput.sampleSettings.live : settings.get().streaming.abr.throughput.sampleSettings.vod;
                }
                break;
        }

        if (!dict || dict.length === 0) {
            return NaN;
        }

        if (calculationMode === Constants.THROUGHPUT_CALCULATION_MODES.EWMA) {
            return _getEwma(dict, halfLife, useMin);
        } else if (calculationMode === Constants.THROUGHPUT_CALCULATION_MODES.ARITHMETIC_MEAN) {
            const adjustedSampleSize = _getAdjustedSampleSize(dict, sampleSize, throughputType);
            return _getArithmeticMean(dict, adjustedSampleSize);
        } else if (calculationMode === Constants.THROUGHPUT_CALCULATION_MODES.BYTE_SIZE_WEIGHTED_ARITHMETIC_MEAN) {
            const adjustedSampleSize = _getAdjustedSampleSize(dict, sampleSize, throughputType);
            return _getArithmeticMean(dict, adjustedSampleSize, true);
        } else if (calculationMode === Constants.THROUGHPUT_CALCULATION_MODES.HARMONIC_MEAN) {
            const adjustedSampleSize = _getAdjustedSampleSize(dict, sampleSize, throughputType);
            return _getHarmonicMean(dict, adjustedSampleSize);
        } else if (calculationMode === Constants.THROUGHPUT_CALCULATION_MODES.BYTE_SIZE_WEIGHTED_HARMONIC_MEAN) {
            const adjustedSampleSize = _getAdjustedSampleSize(dict, sampleSize, throughputType);
            return _getHarmonicMean(dict, adjustedSampleSize, true);
        }
    }

    function _getThroughputValuesByServiceLocation(throughputDict, serviceLocation) {
        return Object.keys(throughputDict).reduce((acc, mediaType) => {
            const curr = throughputDict[mediaType].filter((entry) => {
                return entry.serviceLocation === serviceLocation
            })

            return acc.concat(curr)
        }, [])
    }

    /**
     * @param {array} dict
     * @param {number} sampleSize
     * @param {string} type
     * @return {number}
     * @private
     */
    function _getAdjustedSampleSize(dict, sampleSize, type) {
        if (!dict) {
            sampleSize = 0;
        } else if (sampleSize >= dict.length) {
            sampleSize = dict.length;
        } else if (type === Constants.THROUGHPUT_TYPES.BANDWIDTH && settings.get().streaming.abr.throughput.sampleSettings.enableSampleSizeAdjustment) {
            // if throughput samples vary a lot, average over a wider sample
            for (let i = 1; i < sampleSize; ++i) {
                const ratio = dict[dict.length - i].value / dict[dict.length - i - 1].value;
                if (ratio >= settings.get().streaming.abr.throughput.sampleSettings.increaseScale || ratio <= settings.get().streaming.abr.throughput.sampleSettings.decreaseScale) {
                    sampleSize += 1;
                    if (sampleSize === dict.length) { // cannot increase sampleSize beyond arr.length
                        break;
                    }
                }
            }
        }

        return sampleSize;
    }

    /**
     * Calculate the arithmetic mean of the values provided via the dict
     * @param {array} dict
     * @param {number} sampleSize
     * @param {boolean} applyByteSizeWeighting
     * @return {number|*}
     * @private
     */
    function _getArithmeticMean(dict, sampleSize, applyByteSizeWeighting = false) {
        let arr = dict;

        if (sampleSize === 0 || !arr || arr.length === 0) {
            return NaN;
        }

        // Extract the last n elements
        arr = arr.slice(-sampleSize);
        let divideBy = 0;

        return arr.reduce((total, entry) => {
            let weight = applyByteSizeWeighting && !isNaN(entry.downloadedBytes) ? Math.sqrt(entry.downloadedBytes) : 1
            divideBy += weight;

            return total + entry.value * weight
        }, 0) / divideBy;
    }

    /**
     * Calculate the harmonic mean of the values provided via the dict
     * @param {array} dict
     * @param {number} sampleSize
     * @param {boolean} applyByteSizeWeighting
     * @return {number|*}
     * @private
     */
    function _getHarmonicMean(dict, sampleSize, applyByteSizeWeighting = false) {
        let arr = dict;

        if (sampleSize === 0 || !arr || arr.length === 0) {
            return NaN;
        }

        // Extract the last n elements
        arr = arr.slice(-sampleSize);
        let dividend = 0;

        const value = arr.reduce((total, entry) => {
            let weight = applyByteSizeWeighting && !isNaN(entry.downloadedBytes) ? Math.sqrt(entry.downloadedBytes) : 1
            dividend += weight;

            return total + 1 / entry.value * weight
        }, 0);

        return dividend / value
    }

    /**
     * Calculated the exponential weighted moving average for the values provided via the dict
     * @param {object} dict
     * @param {object} halfLife
     * @param {boolean} useMin - Whether to apply Math.min of the fastEstimate and the slowEstimate
     * @return {number}
     * @private
     */
    function _getEwma(dict, halfLife, useMin = true) {

        if (!dict || dict.totalWeight <= 0) {
            return NaN;
        }

        // to correct for startup, divide by zero factor = 1 - Math.pow(0.5, ewmaObj.totalWeight / halfLife)
        const fastEstimate = dict.fastEstimate / (1 - Math.pow(0.5, dict.totalWeight / halfLife.fast));
        const slowEstimate = dict.slowEstimate / (1 - Math.pow(0.5, dict.totalWeight / halfLife.slow));

        return useMin ? Math.min(fastEstimate, slowEstimate) : Math.max(fastEstimate, slowEstimate);
    }

    /**
     * Returns the average throughput based on the provided calculation mode. The returned value is depicted in kbit/s
     * @param {string} mediaType
     * @param {string | null} calculationMode
     * @param {number | NaN} sampleSize
     * @return {number}
     */
    function getAverageThroughput(mediaType, calculationMode = null, sampleSize = NaN) {
        const value = _getAverage(Constants.THROUGHPUT_TYPES.BANDWIDTH, mediaType, calculationMode, sampleSize);

        console.log(`Average throughput for ${mediaType} is ${value}`);
        return Math.round(value);
    }

    /**
     * Returns the average throughout applying the bandwidth safety factor provided in the settings. The returned value is depicted in kbit/s
     * @param {string} mediaType
     * @param {string | null} calculationMode
     * @param {number | NaN} sampleSize
     * @return {number}
     */
    function getSafeAverageThroughput(mediaType, calculationMode = null, sampleSize = NaN) {
        let average = getAverageThroughput(mediaType, calculationMode, sampleSize);

        if (!isNaN(average)) {
            average *= settings.get().streaming.abr.throughput.bandwidthSafetyFactor;
        }

        return average;
    }

    function getAverageThroughputForServiceLocation(serviceLocation) {
        const value = _getAverage(Constants.THROUGHPUT_TYPES.BANDWIDTH_FOR_SERVICE_LOCATION, null, Constants.THROUGHPUT_CALCULATION_MODES.BYTE_SIZE_WEIGHTED_ARITHMETIC_MEAN, NaN, serviceLocation);

        return Math.round(value);
    }

    /**
     * Returns the average latency based on the provided calculation mode
     * @param {string} mediaType
     * @param {string | null} calculationMode
     * @param {number | NaN} sampleSize
     * @return {number}
     */
    function getAverageLatency(mediaType, calculationMode = null, sampleSize = NaN) {
        const value = _getAverage(Constants.THROUGHPUT_TYPES.LATENCY, mediaType, calculationMode, sampleSize);

        return Math.round(value);
    }

    /**
     * Returns the raw throughput measurements without calculating the average
     * @param mediaType
     * @returns {*}
     */
    function getRawThroughputData(mediaType) {
        if (!mediaType) {
            return []
        }
        return throughputModel.getThroughputDict(mediaType);
    }

    function reset() {
        throughputModel.reset();
        _resetEvents();
    }

    const instance = {
        initialize,
        setConfig,
        getAverageThroughput,
        getSafeAverageThroughput,
        getAverageThroughputForServiceLocation,
        getAverageLatency,
        getRawThroughputData,
        reset
    };

    return instance;
}

ThroughputController.__dashjs_factory_name = 'ThroughputController';
export default FactoryMaker.getSingletonFactory(ThroughputController);
