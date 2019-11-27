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
import Constants from '../streaming/constants/Constants';
import { HTTPRequest } from '../streaming/vo/metrics/HTTPRequest';
import FactoryMaker from '../core/FactoryMaker';
import MetricsConstants from '../streaming/constants/MetricsConstants';
import Round10 from './utils/Round10';
import MetricsModel from '../streaming/models/MetricsModel';
import {
    PlayList,
    PlayListTrace
} from '../streaming/vo/metrics/PlayList';

/**
 * @module DashMetrics
 * @ignore
 * @param {object} config
 */

function DashMetrics(config) {

    config = config || {};

    const context = this.context;
    let instance,
        playListTraceMetricsClosed,
        playListTraceMetrics,
        playListMetrics;

    let metricsModel = config.metricsModel;

    function setup() {
        metricsModel = metricsModel || MetricsModel(context).getInstance({settings: config.settings});
        resetInitialSettings();
    }

    function resetInitialSettings() {
        playListTraceMetricsClosed = true;
        playListTraceMetrics = null;
        playListMetrics = null;
    }

    /**
     * @param {string} mediaType
     * @param {boolean} readOnly
     * @returns {*}
     * @memberof module:DashMetrics
     * @instance
     */
    function getCurrentRepresentationSwitch(mediaType, readOnly) {
        const metrics = metricsModel.getMetricsFor(mediaType, readOnly);
        return getCurrent(metrics, MetricsConstants.TRACK_SWITCH);
    }

    /**
     * @param {string} mediaType
     * @param {Date} t time of the switch event
     * @param {Date} mt media presentation time
     * @param {string} to id of representation
     * @param {string} lto if present, subrepresentation reference
     * @memberof module:DashMetrics
     * @instance
     */
    function addRepresentationSwitch(mediaType, t, mt, to, lto) {
        metricsModel.addRepresentationSwitch(mediaType, t, mt, to, lto);
    }

    /**
     * @param {string} mediaType
     * @param {boolean} readOnly
     * @param {string} infoType
     * @returns {*}
     * @memberof module:DashMetrics
     * @instance
     */
    function getLatestBufferInfoVO(mediaType, readOnly, infoType) {
        const metrics = metricsModel.getMetricsFor(mediaType, readOnly);
        return getCurrent(metrics, infoType);
    }

    /**
     * @param {string} type
     * @param {boolean} readOnly
     * @returns {number}
     * @memberof module:DashMetrics
     * @instance
     */
    function getCurrentBufferLevel(type, readOnly) {
        const vo = getLatestBufferInfoVO(type, readOnly, MetricsConstants.BUFFER_LEVEL);

        if (vo) {
            return Round10.round10(vo.level / 1000, -3);
        }

        return 0;
    }

    /**
     * @param {string} mediaType
     * @param {number} t
     * @param {number} level
     * @memberof module:DashMetrics
     * @instance
     */
    function addBufferLevel(mediaType, t, level) {
        metricsModel.addBufferLevel(mediaType, t, level);
    }

    /**
     * @param {string} mediaType
     * @param {string} state
     * @param {number} target
     * @memberof module:DashMetrics
     * @instance
     */
    function addBufferState(mediaType, state, target) {
        metricsModel.addBufferState(mediaType, state, target);
    }

    /**
     * @memberof module:DashMetrics
     * @instance
     */
    function clearAllCurrentMetrics () {
        metricsModel.clearAllCurrentMetrics();
    }

    /**
     * @param {string} mediaType
     * @param {boolean} readOnly
     * @returns {*}
     * @memberof module:DashMetrics
     * @instance
     */
    function getCurrentHttpRequest(mediaType, readOnly) {
        const metrics = metricsModel.getMetricsFor(mediaType, readOnly);

        if (!metrics) {
            return null;
        }

        const httpList = metrics.HttpList;
        let currentHttpList = null;

        let httpListLastIndex;

        if (!httpList || httpList.length <= 0) {
            return null;
        }

        httpListLastIndex = httpList.length - 1;

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
     * @param {string} mediaType
     * @returns {*}
     * @memberof module:DashMetrics
     * @instance
     */
    function getHttpRequests(mediaType) {
        const metrics = metricsModel.getMetricsFor(mediaType, true);
        if (!metrics) {
            return [];
        }

        return !!metrics.HttpList ? metrics.HttpList : [];
    }

    /**
     * @param {string} mediaType
     * @param {Array} loadingRequests
     * @param {Array} executedRequests
     * @memberof module:DashMetrics
     * @instance
     */
    function addRequestsQueue(mediaType, loadingRequests, executedRequests) {
        metricsModel.addRequestsQueue(mediaType, loadingRequests, executedRequests);
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
     * @returns {*}
     * @memberof module:DashMetrics
     * @instance
     */
    function getCurrentDroppedFrames() {
        const metrics = metricsModel.getMetricsFor(Constants.VIDEO, true);
        return getCurrent(metrics, MetricsConstants.DROPPED_FRAMES);
    }

    /**
     * @param {number} quality
     * @memberof module:DashMetrics
     * @instance
     */
    function addDroppedFrames(quality) {
        metricsModel.addDroppedFrames(Constants.VIDEO, quality);
    }

    /**
     * @param {string} mediaType
     * @returns {*}
     * @memberof module:DashMetrics
     * @instance
     */
    function getCurrentSchedulingInfo(mediaType) {
        const metrics = metricsModel.getMetricsFor(mediaType, true);
        return getCurrent(metrics, MetricsConstants.SCHEDULING_INFO);
    }

    /**
     * @param {object} request
     * @param {string} state
     * @memberof module:DashMetrics
     * @instance
     */
    function addSchedulingInfo(request, state) {
        metricsModel.addSchedulingInfo(
            request.mediaType,
            new Date(),
            request.type,
            request.startTime,
            request.availabilityStartTime,
            request.duration,
            request.quality,
            request.range,
            state);
    }

    /**
     * @returns {*}
     * @memberof module:DashMetrics
     * @instance
     */
    function getCurrentManifestUpdate() {
        const streamMetrics = metricsModel.getMetricsFor(Constants.STREAM);
        return getCurrent(streamMetrics, MetricsConstants.MANIFEST_UPDATE);
    }

    /**
     * @param {object} updatedFields fields to be updated
     * @memberof module:DashMetrics
     * @instance
     */
    function updateManifestUpdateInfo(updatedFields) {
        const manifestUpdate = this.getCurrentManifestUpdate();
        metricsModel.updateManifestUpdateInfo(manifestUpdate, updatedFields);
    }

    /**
     * @param {object} streamInfo
     * @memberof module:DashMetrics
     * @instance
     */
    function addManifestUpdateStreamInfo(streamInfo) {
        if (streamInfo) {
            const manifestUpdate = this.getCurrentManifestUpdate();
            metricsModel.addManifestUpdateStreamInfo(manifestUpdate, streamInfo.id, streamInfo.index, streamInfo.start, streamInfo.duration);
        }
    }

    /**
     * @param {object} request
     * @memberof module:DashMetrics
     * @instance
     */
    function addManifestUpdate(request) {
        metricsModel.addManifestUpdate(Constants.STREAM, request.type, request.requestStartDate, request.requestEndDate);
    }

    /**
     * @param {object} request
     * @param {string} responseURL
     * @param {number} responseStatus
     * @param {object} responseHeaders
     * @param {object} traces
     * @memberof module:DashMetrics
     * @instance
     */
    function addHttpRequest(request, responseURL, responseStatus, responseHeaders, traces) {
        metricsModel.addHttpRequest(request.mediaType,
            null,
            request.type,
            request.url,
            request.quality,
            responseURL,
            request.serviceLocation || null,
            request.range || null,
            request.requestStartDate,
            request.firstByteDate,
            request.requestEndDate,
            responseStatus,
            request.duration,
            responseHeaders,
            traces);
    }

    /**
     * @param {object} representation
     * @param {string} mediaType
     * @memberof module:DashMetrics
     * @instance
     */
    function addManifestUpdateRepresentationInfo(representation, mediaType) {
        if (representation) {
            const manifestUpdateInfo = this.getCurrentManifestUpdate();
            metricsModel.addManifestUpdateRepresentationInfo(manifestUpdateInfo, representation.id, representation.index, representation.streamIndex, mediaType, representation.presentationTimeOffset, representation.startNumber, representation.fragmentInfoType);
        }
    }

    /**
     * @param {string} mediaType
     * @returns {*}
     * @memberof module:DashMetrics
     * @instance
     */
    function getCurrentDVRInfo(mediaType) {
        const metrics = mediaType ? metricsModel.getMetricsFor(mediaType, true) :
            metricsModel.getMetricsFor(Constants.VIDEO, true) || metricsModel.getMetricsFor(Constants.AUDIO, true);
        return getCurrent(metrics, MetricsConstants.DVR_INFO);
    }

    /**
     * @param {string} mediaType
     * @param {Date} currentTime time of the switch event
     * @param {object} mpd mpd reference
     * @param {object} range range of the dvr info
     * @memberof module:DashMetrics
     * @instance
     */
    function addDVRInfo(mediaType, currentTime, mpd, range) {
        metricsModel.addDVRInfo(mediaType, currentTime, mpd, range);
    }

    /**
     * @param {string} id
     * @returns {*}
     * @memberof module:DashMetrics
     * @instance
     */
    function getLatestMPDRequestHeaderValueByID(id) {
        let headers = {};
        let httpRequestList,
            httpRequest,
            i;

        httpRequestList = getHttpRequests(Constants.STREAM);

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
     * @param {string} type
     * @param {string} id
     * @returns {*}
     * @memberof module:DashMetrics
     * @instance
     */
    function getLatestFragmentRequestHeaderValueByID(type, id) {
        let headers = {};
        let httpRequest = getCurrentHttpRequest(type, true);
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

    /**
     * @memberof module:DashMetrics
     * @instance
     */
    function addPlayList() {
        if (playListMetrics) {
            metricsModel.addPlayList(playListMetrics);
            playListMetrics = null;
        }
    }

    function createPlaylistMetrics(mediaStartTime, startReason) {
        playListMetrics = new PlayList();

        playListMetrics.start = new Date();
        playListMetrics.mstart = mediaStartTime;
        playListMetrics.starttype = startReason;
    }

    function createPlaylistTraceMetrics(representationId, mediaStartTime, speed) {
        if (playListTraceMetricsClosed === true ) {
            playListTraceMetricsClosed = false;
            playListTraceMetrics = new PlayListTrace();

            playListTraceMetrics.representationid = representationId;
            playListTraceMetrics.start = new Date();
            playListTraceMetrics.mstart = mediaStartTime;
            playListTraceMetrics.playbackspeed = speed;
        }
    }

    function updatePlayListTraceMetrics(traceToUpdate) {
        if (playListTraceMetrics) {
            for (let field in playListTraceMetrics) {
                playListTraceMetrics[field] = traceToUpdate[field];
            }
        }
    }

    function pushPlayListTraceMetrics(endTime, reason) {
        if (playListTraceMetricsClosed === false && playListMetrics && playListTraceMetrics && playListTraceMetrics.start) {
            const startTime = playListTraceMetrics.start;
            const duration = endTime.getTime() - startTime.getTime();
            playListTraceMetrics.duration = duration;
            playListTraceMetrics.stopreason = reason;
            playListMetrics.trace.push(playListTraceMetrics);
            playListTraceMetricsClosed = true;
        }
    }

    /**
     * @param {object} errors
     * @memberof module:DashMetrics
     * @instance
     */
    function addDVBErrors(errors) {
        metricsModel.addDVBErrors(errors);
    }

    instance = {
        getCurrentRepresentationSwitch: getCurrentRepresentationSwitch,
        getLatestBufferInfoVO: getLatestBufferInfoVO,
        getCurrentBufferLevel: getCurrentBufferLevel,
        getCurrentHttpRequest: getCurrentHttpRequest,
        getHttpRequests: getHttpRequests,
        getCurrentDroppedFrames: getCurrentDroppedFrames,
        getCurrentSchedulingInfo: getCurrentSchedulingInfo,
        getCurrentDVRInfo: getCurrentDVRInfo,
        getCurrentManifestUpdate: getCurrentManifestUpdate,
        getLatestFragmentRequestHeaderValueByID: getLatestFragmentRequestHeaderValueByID,
        getLatestMPDRequestHeaderValueByID: getLatestMPDRequestHeaderValueByID,
        addRepresentationSwitch: addRepresentationSwitch,
        addDVRInfo: addDVRInfo,
        updateManifestUpdateInfo: updateManifestUpdateInfo,
        addManifestUpdateStreamInfo: addManifestUpdateStreamInfo,
        addManifestUpdateRepresentationInfo: addManifestUpdateRepresentationInfo,
        addManifestUpdate: addManifestUpdate,
        addHttpRequest: addHttpRequest,
        addSchedulingInfo: addSchedulingInfo,
        addRequestsQueue: addRequestsQueue,
        addBufferLevel: addBufferLevel,
        addBufferState: addBufferState,
        addDroppedFrames: addDroppedFrames,
        addPlayList: addPlayList,
        addDVBErrors: addDVBErrors,
        createPlaylistMetrics: createPlaylistMetrics,
        createPlaylistTraceMetrics: createPlaylistTraceMetrics,
        updatePlayListTraceMetrics: updatePlayListTraceMetrics,
        pushPlayListTraceMetrics: pushPlayListTraceMetrics,
        clearAllCurrentMetrics: clearAllCurrentMetrics
    };

    setup();

    return instance;
}

DashMetrics.__dashjs_factory_name = 'DashMetrics';
export default FactoryMaker.getSingletonFactory(DashMetrics);
