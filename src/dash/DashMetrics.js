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
import {HTTPRequest} from '../streaming/vo/metrics/HTTPRequest';
import FactoryMaker from '../core/FactoryMaker';
import MetricsConstants from '../streaming/constants/MetricsConstants';
import Round10 from './utils/Round10';

/**
 * @module DashMetrics
 */
function DashMetrics() {
    let instance;

    /**
     * @param {MetricsList} metrics
     * @returns {*}
     * @memberof module:DashMetrics
     * @instance
     */
    function getCurrentRepresentationSwitch(metrics) {
        return getCurrent(metrics, MetricsConstants.TRACK_SWITCH);
    }

    /**
     * @param {MetricsList} metrics
     * @returns {*}
     * @memberof module:DashMetrics
     * @instance
     */
    function getLatestBufferLevelVO(metrics) {
        return getCurrent(metrics, MetricsConstants.BUFFER_LEVEL);
    }

    /**
     * @param {MetricsList} metrics
     * @returns {number}
     * @memberof module:DashMetrics
     * @instance
     */
    function getCurrentBufferLevel(metrics) {
        const vo = getLatestBufferLevelVO(metrics);

        if (vo) {
            return Round10.round10(vo.level / 1000, -3);
        }

        return 0;
    }

    /**
     * @param {MetricsList} metrics
     * @returns {null|*|vo}
     * @memberof module:DashMetrics
     * @instance
     */
    function getRequestsQueue(metrics) {
        return metrics ? metrics.RequestsQueue : null;
    }

    /**
     * @param {MetricsList} metrics
     * @returns {*}
     * @memberof module:DashMetrics
     * @instance
     */
    function getCurrentHttpRequest(metrics) {
        if (!metrics) {
            return null;
        }

        const httpList = metrics.HttpList;
        let currentHttpList = null;

        let httpListLength,
            httpListLastIndex;

        if (!httpList || httpList.length <= 0) {
            return null;
        }

        httpListLength = httpList.length;
        httpListLastIndex = httpListLength - 1;

        while (httpListLastIndex >= 0) {
            if (httpList[httpListLastIndex].responsecode) {
                currentHttpList = httpList[httpListLastIndex];
                break;
            }
            httpListLastIndex--;
        }
        return currentHttpList;
    }

    /**
     * @param {MetricsList} metrics
     * @returns {*}
     * @memberof module:DashMetrics
     * @instance
     */
    function getHttpRequests(metrics) {
        if (!metrics) {
            return [];
        }

        return !!metrics.HttpList ? metrics.HttpList : [];
    }

    /**
     * @param {MetricsList} metrics
     * @param {string} metricName
     * @returns {*}
     * @memberof module:DashMetrics
     * @instance
     */
    function getCurrent(metrics, metricName) {
        if (!metrics) {
            return null;
        }

        const list = metrics[metricName];

        if (!list || list.length <= 0) {
            return null;
        }

        return list[list.length - 1];
    }

    /**
     * @param {MetricsList} metrics
     * @returns {*}
     * @memberof module:DashMetrics
     * @instance
     */
    function getCurrentDroppedFrames(metrics) {
        return getCurrent(metrics, MetricsConstants.DROPPED_FRAMES);
    }

    /**
     * @param {MetricsList} metrics
     * @returns {*}
     * @memberof module:DashMetrics
     * @instance
     */
    function getCurrentSchedulingInfo(metrics) {
        return getCurrent(metrics, MetricsConstants.SCHEDULING_INFO);
    }

    /**
     * @param {MetricsList} metrics
     * @returns {*}
     * @memberof module:DashMetrics
     * @instance
     */
    function getCurrentManifestUpdate(metrics) {
        return getCurrent(metrics, MetricsConstants.MANIFEST_UPDATE);
    }

    /**
     * @param {MetricsList} metrics
     * @returns {*}
     * @memberof module:DashMetrics
     * @instance
     */
    function getCurrentDVRInfo(metrics) {
        return getCurrent(metrics, MetricsConstants.DVR_INFO);
    }

    /**
     * @param {MetricsList} metrics
     * @param {string} id
     * @returns {*}
     * @memberof module:DashMetrics
     * @instance
     */
    function getLatestMPDRequestHeaderValueByID(metrics, id) {
        let headers = {};
        let httpRequestList,
            httpRequest,
            i;

        httpRequestList = getHttpRequests(metrics);

        for (i = httpRequestList.length - 1; i >= 0; i--) {
            httpRequest = httpRequestList[i];

            if (httpRequest.type === HTTPRequest.MPD_TYPE) {
                headers = parseResponseHeaders(httpRequest._responseHeaders);
                break;
            }
        }

        return headers[id] === undefined ? null :  headers[id];
    }

    /**
     * @param {MetricsList} metrics
     * @param {string} id
     * @returns {*}
     * @memberof module:DashMetrics
     * @instance
     */
    function getLatestFragmentRequestHeaderValueByID(metrics, id) {
        let headers = {};
        let httpRequest = getCurrentHttpRequest(metrics);
        if (httpRequest) {
            headers = parseResponseHeaders(httpRequest._responseHeaders);
        }
        return headers[id] === undefined ? null :  headers[id];
    }

    function parseResponseHeaders(headerStr) {
        let headers = {};
        if (!headerStr) {
            return headers;
        }

        // Trim headerStr to fix a MS Edge bug with xhr.getAllResponseHeaders method
        // which send a string starting with a "\n" character
        let headerPairs = headerStr.trim().split('\u000d\u000a');
        for (let i = 0, ilen = headerPairs.length; i < ilen; i++) {
            let headerPair = headerPairs[i];
            let index = headerPair.indexOf('\u003a\u0020');
            if (index > 0) {
                headers[headerPair.substring(0, index)] = headerPair.substring(index + 2);
            }
        }
        return headers;
    }

    instance = {
        getCurrentRepresentationSwitch: getCurrentRepresentationSwitch,
        getLatestBufferLevelVO: getLatestBufferLevelVO,
        getCurrentBufferLevel: getCurrentBufferLevel,
        getCurrentHttpRequest: getCurrentHttpRequest,
        getHttpRequests: getHttpRequests,
        getCurrentDroppedFrames: getCurrentDroppedFrames,
        getCurrentSchedulingInfo: getCurrentSchedulingInfo,
        getCurrentDVRInfo: getCurrentDVRInfo,
        getCurrentManifestUpdate: getCurrentManifestUpdate,
        getLatestFragmentRequestHeaderValueByID: getLatestFragmentRequestHeaderValueByID,
        getLatestMPDRequestHeaderValueByID: getLatestMPDRequestHeaderValueByID,
        getRequestsQueue: getRequestsQueue
    };

    return instance;
}

DashMetrics.__dashjs_factory_name = 'DashMetrics';
export default FactoryMaker.getSingletonFactory(DashMetrics);
