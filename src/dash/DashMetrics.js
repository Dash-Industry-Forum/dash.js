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
import Utils from '../core/Utils';
import {
    PlayList,
    PlayListTrace
} from '../streaming/vo/metrics/PlayList';

/**
 * @module DashMetrics
 * @description The DashMetrics module can be accessed using the MediaPlayer API getDashMetrics()
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
     * Returns the latest Representation switch for a given media type
     * @param {MediaType} mediaType
     * @returns {*}
     * @memberof module:DashMetrics
     * @instance
     */
    function getCurrentRepresentationSwitch(mediaType) {
        const metrics = metricsModel.getMetricsFor(mediaType, true);
        return getCurrent(metrics, MetricsConstants.TRACK_SWITCH);
    }

    /**
     * @param {MediaType} mediaType
     * @param {Date} t time of the switch event
     * @param {Date} mt media presentation time
     * @param {string} to id of representation
     * @param {string} lto if present, subrepresentation reference
     * @memberof module:DashMetrics
     * @instance
     * @ignore
     */
    function addRepresentationSwitch(mediaType, t, mt, to, lto) {
        metricsModel.addRepresentationSwitch(mediaType, t, mt, to, lto);
    }

    /**
     * Returns the current buffer state for a given media type
     * @param {MediaType} mediaType
     * @returns {number}
     * @memberof module:DashMetrics
     * @instance
     */
    function getCurrentBufferState(mediaType) {
        const metrics = metricsModel.getMetricsFor(mediaType, true);
        return getCurrent(metrics, MetricsConstants.BUFFER_STATE);
    }

    /**
     * Returns the current buffer level for a given media type
     * @param {MediaType} mediaType
     * @returns {number}
     * @memberof module:DashMetrics
     * @instance
     */
    function getCurrentBufferLevel(mediaType) {
        const metrics = metricsModel.getMetricsFor(mediaType, true);
        const metric = getCurrent(metrics, MetricsConstants.BUFFER_LEVEL);

        if (metric) {
            return Round10.round10(metric.level / 1000, -3);
        }

        return 0;
    }

    /**
     * @param {MediaType} mediaType
     * @param {number} t
     * @param {number} level
     * @memberof module:DashMetrics
     * @instance
     * @ignore
     */
    function addBufferLevel(mediaType, t, level) {
        metricsModel.addBufferLevel(mediaType, t, level);
    }

    /**
     * @param {MediaType} mediaType
     * @param {string} state
     * @param {number} target
     * @memberof module:DashMetrics
     * @instance
     * @ignore
     */
    function addBufferState(mediaType, state, target) {
        metricsModel.addBufferState(mediaType, state, target);
    }

    /**
     * @memberof module:DashMetrics
     * @instance
     * @ignore
     */
    function clearAllCurrentMetrics () {
        metricsModel.clearAllCurrentMetrics();
    }

    /**
     * Returns the latest HTTP request for a given media type
     * @param {MediaType} mediaType
     * @returns {*}
     * @memberof module:DashMetrics
     * @instance
     */
    function getCurrentHttpRequest(mediaType) {
        const metrics = metricsModel.getMetricsFor(mediaType, true);

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
     * Returns all HTTP requests for a given media type
     * @param {MediaType} mediaType
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
     * @param {MediaType} mediaType
     * @param {Array} loadingRequests
     * @param {Array} executedRequests
     * @memberof module:DashMetrics
     * @instance
     * @ignore
     */
    function addRequestsQueue(mediaType, loadingRequests, executedRequests) {
        metricsModel.addRequestsQueue(mediaType, loadingRequests, executedRequests);
    }

    /**
     * Returns the latest metrics for a given metric list and specific metric name
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
        return (!list || list.length === 0) ? null : list[list.length - 1];
    }

    /**
     * Returns the number of dropped frames
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
     * @ignore
     */
    function addDroppedFrames(quality) {
        metricsModel.addDroppedFrames(Constants.VIDEO, quality);
    }

    /**
     * Returns the current scheduling info for a given media type
     * @param {MediaType} mediaType
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
     * @ignore
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
     * Returns the current manifest update information
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
     * @ignore
     */
    function updateManifestUpdateInfo(updatedFields) {
        const manifestUpdate = this.getCurrentManifestUpdate();
        metricsModel.updateManifestUpdateInfo(manifestUpdate, updatedFields);
    }

    /**
     * @param {object} streamInfo
     * @memberof module:DashMetrics
     * @instance
     * @ignore
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
     * @ignore
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
     * @ignore
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
     * @param {MediaType} mediaType
     * @memberof module:DashMetrics
     * @instance
     * @ignore
     */
    function addManifestUpdateRepresentationInfo(representation, mediaType) {
        if (representation) {
            const manifestUpdateInfo = this.getCurrentManifestUpdate();
            metricsModel.addManifestUpdateRepresentationInfo(manifestUpdateInfo, representation.id, representation.index, representation.streamIndex, mediaType, representation.presentationTimeOffset, representation.startNumber, representation.fragmentInfoType);
        }
    }

    /**
     * Returns the current DVR window
     * @param {MediaType} mediaType
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
     * @param {MediaType} mediaType
     * @param {Date} currentTime time of the switch event
     * @param {object} mpd mpd reference
     * @param {object} range range of the dvr info
     * @memberof module:DashMetrics
     * @instance
     * @ignore
     */
    function addDVRInfo(mediaType, currentTime, mpd, range) {
        metricsModel.addDVRInfo(mediaType, currentTime, mpd, range);
    }

    /**
     * Returns the value for a specific request headers used in the latest MPD request
     * @param {string} id
     * @returns {*}
     * @memberof module:DashMetrics
     * @instance
     */
    function getLatestMPDRequestHeaderValueByID(id) {
        if (!id) {
            return null;
        }

        let headers = {};
        let httpRequestList,
            httpRequest,
            i;

        httpRequestList = getHttpRequests(Constants.STREAM);

        for (i = httpRequestList.length - 1; i >= 0; i--) {
            httpRequest = httpRequestList[i];

            if (httpRequest.type === HTTPRequest.MPD_TYPE) {
                headers = Utils.parseHttpHeaders(httpRequest._responseHeaders);
                break;
            }
        }

        const value = headers[id.toLowerCase()];
        return value === undefined ? null : value;
    }

    /**
     * Returns the value for a specific request headers used in the latest fragment request
     * @param {MediaType} mediaType
     * @param {string} id
     * @returns {*}
     * @memberof module:DashMetrics
     * @instance
     */
    function getLatestFragmentRequestHeaderValueByID(mediaType, id) {
        if (!id) {
            return null;
        }

        let headers = {};
        let httpRequest = getCurrentHttpRequest(mediaType);
        if (httpRequest) {
            headers = Utils.parseHttpHeaders(httpRequest._responseHeaders);
        }

        const value = headers[id.toLowerCase()];
        return value === undefined ? null : value;
    }

    /**
     * @memberof module:DashMetrics
     * @instance
     * @ignore
     */
    function addPlayList() {
        if (playListMetrics) {
            metricsModel.addPlayList(playListMetrics);
            playListMetrics = null;
        }
    }

    /**
     * Create a new playlist metric
     * @param {number} mediaStartTime
     * @param {string} startReason
     * @ignore
     */
    function createPlaylistMetrics(mediaStartTime, startReason) {
        playListMetrics = new PlayList();

        playListMetrics.start = new Date();
        playListMetrics.mstart = mediaStartTime;
        playListMetrics.starttype = startReason;
    }

    /**
     * Create a playlist trace metric
     * @param {number} representationId
     * @param {number} mediaStartTime
     * @param {number} speed
     * @ignore
     */
    function createPlaylistTraceMetrics(representationId, mediaStartTime, speed) {
        if (playListTraceMetricsClosed === true ) {
            playListTraceMetricsClosed = false;
            playListTraceMetrics = new PlayListTrace();

            playListTraceMetrics.representationid = representationId;
            playListTraceMetrics.start = new Date();
            playListTraceMetrics.mstart = mediaStartTime;
            playListTraceMetrics.playbackspeed = speed !== null ? speed.toString() : null;
        }
    }

    /**
     * Update existing playlist trace metric
     * @param {object} traceToUpdate
     * @ignore
     */
    function updatePlayListTraceMetrics(traceToUpdate) {
        if (playListTraceMetrics) {
            for (let field in playListTraceMetrics) {
                playListTraceMetrics[field] = traceToUpdate[field];
            }
        }
    }

    /**
     * Push a new playlist trace metric
     * @param endTime
     * @param reason
     * @ignore
     */
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
     * @ignore
     */
    function addDVBErrors(errors) {
        metricsModel.addDVBErrors(errors);
    }

    instance = {
        getCurrentRepresentationSwitch,
        getCurrentBufferState,
        getCurrentBufferLevel,
        getCurrentHttpRequest,
        getHttpRequests,
        getCurrentDroppedFrames,
        getCurrentSchedulingInfo,
        getCurrentDVRInfo,
        getCurrentManifestUpdate,
        getLatestFragmentRequestHeaderValueByID,
        getLatestMPDRequestHeaderValueByID,
        addRepresentationSwitch,
        addDVRInfo,
        updateManifestUpdateInfo,
        addManifestUpdateStreamInfo,
        addManifestUpdateRepresentationInfo,
        addManifestUpdate,
        addHttpRequest,
        addSchedulingInfo,
        addRequestsQueue,
        addBufferLevel,
        addBufferState,
        addDroppedFrames,
        addPlayList,
        addDVBErrors,
        createPlaylistMetrics,
        createPlaylistTraceMetrics,
        updatePlayListTraceMetrics,
        pushPlayListTraceMetrics,
        clearAllCurrentMetrics
    };

    setup();

    return instance;
}

DashMetrics.__dashjs_factory_name = 'DashMetrics';
export default FactoryMaker.getSingletonFactory(DashMetrics);
