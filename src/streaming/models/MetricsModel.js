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
import MetricsList from '../vo/MetricsList';
import TCPConnection from '../vo/metrics/TCPConnection';
import {HTTPRequest, HTTPRequestTrace} from '../vo/metrics/HTTPRequest';
import TrackSwitch from '../vo/metrics/RepresentationSwitch';
import BufferLevel from '../vo/metrics/BufferLevel';
import BufferState from '../vo/metrics/BufferState';
import DVRInfo from '../vo/metrics/DVRInfo';
import DroppedFrames from '../vo/metrics/DroppedFrames';
import {ManifestUpdate, ManifestUpdateStreamInfo, ManifestUpdateTrackInfo} from '../vo/metrics/ManifestUpdate';
import SchedulingInfo from '../vo/metrics/SchedulingInfo';
import EventBus from '../../core/EventBus';
import RequestsQueue from '../vo/metrics/RequestsQueue';
import Events from '../../core/events/Events';
import FactoryMaker from '../../core/FactoryMaker';
import BolaState from '../vo/metrics/BolaState';

function MetricsModel() {

    let context = this.context;
    let eventBus = EventBus(context).getInstance();

    let instance,
        adapter,
        streamMetrics;

    function setup() {
        streamMetrics = {};
    }

    function setConfig(config) {
        if (!config) return;

        if (config.adapter) {
            adapter = config.adapter;
        }
    }

    function metricsChanged() {
        eventBus.trigger(Events.METRICS_CHANGED);
    }

    function metricChanged(mediaType) {
        eventBus.trigger(Events.METRIC_CHANGED, {mediaType: mediaType});
        metricsChanged();
    }

    function metricUpdated(mediaType, metricType, vo) {
        eventBus.trigger(Events.METRIC_UPDATED, {mediaType: mediaType, metric: metricType, value: vo});
        metricChanged(mediaType);
    }

    function metricAdded(mediaType, metricType, vo) {
        eventBus.trigger(Events.METRIC_ADDED, {mediaType: mediaType, metric: metricType, value: vo});
        metricChanged(mediaType);
    }

    function clearCurrentMetricsForType(type) {
        delete streamMetrics[type];
        metricChanged(type);
    }

    function clearAllCurrentMetrics() {
        streamMetrics = {};
        metricsChanged();
    }

    function getReadOnlyMetricsFor(type) {
        if (streamMetrics.hasOwnProperty(type)) {
            return streamMetrics[type];
        }

        return null;
    }

    function getMetricsFor(type) {
        var metrics;

        if (streamMetrics.hasOwnProperty(type)) {
            metrics = streamMetrics[type];
        } else {
            metrics = new MetricsList();
            streamMetrics[type] = metrics;
        }

        return metrics;
    }

    function addTcpConnection(mediaType, tcpid, dest, topen, tclose, tconnect) {
        var vo = new TCPConnection();

        vo.tcpid = tcpid;
        vo.dest = dest;
        vo.topen = topen;
        vo.tclose = tclose;
        vo.tconnect = tconnect;

        getMetricsFor(mediaType).TcpList.push(vo);

        metricAdded(mediaType, adapter.metricsList.TCP_CONNECTION, vo);
        return vo;
    }

    function appendHttpTrace(httpRequest, s, d, b) {
        var vo = new HTTPRequestTrace();

        vo.s = s;
        vo.d = d;
        vo.b = b;

        httpRequest.trace.push(vo);

        if (!httpRequest.interval) {
            httpRequest.interval = 0;
        }

        httpRequest.interval += d;

        return vo;
    }

    function addHttpRequest(mediaType, tcpid, type, url, actualurl, serviceLocation, range, trequest, tresponse, tfinish, responsecode, mediaduration, responseHeaders, traces) {
        var vo = new HTTPRequest();

        // ISO 23009-1 D.4.3 NOTE 2:
        // All entries for a given object will have the same URL and range
        // and so can easily be correlated. If there were redirects or
        // failures there will be one entry for each redirect/failure.
        // The redirect-to URL or alternative url (where multiple have been
        // provided in the MPD) will appear as the actualurl of the next
        // entry with the same url value.
        if (actualurl && (actualurl !== url)) {

            // given the above, add an entry for the original request
            addHttpRequest(
                mediaType,
                null,
                type,
                url,
                null,
                null,
                range,
                trequest,
                null, // unknown
                null, // unknown
                null, // unknown, probably a 302
                mediaduration,
                null,
                null
            );

            vo.actualurl = actualurl;
        }

        vo.tcpid = tcpid;
        vo.type = type;
        vo.url = url;
        vo.range = range;
        vo.trequest = trequest;
        vo.tresponse = tresponse;
        vo.responsecode = responsecode;

        vo._tfinish = tfinish;
        vo._stream = mediaType;
        vo._mediaduration = mediaduration;
        vo._responseHeaders = responseHeaders;
        vo._serviceLocation = serviceLocation;

        if (traces) {
            traces.forEach(trace => {
                appendHttpTrace(vo, trace.s, trace.d, trace.b);
            });
        } else {
            // The interval and trace shall be absent for redirect and failure records.
            delete vo.interval;
            delete vo.trace;
        }

        getMetricsFor(mediaType).HttpList.push(vo);

        metricAdded(mediaType, adapter.metricsList.HTTP_REQUEST, vo);
        return vo;
    }

    function addRepresentationSwitch(mediaType, t, mt, to, lto) {
        var vo = new TrackSwitch();

        vo.t = t;
        vo.mt = mt;
        vo.to = to;

        if (lto) {
            vo.lto = lto;
        } else {
            delete vo.lto;
        }

        getMetricsFor(mediaType).RepSwitchList.push(vo);

        metricAdded(mediaType, adapter.metricsList.TRACK_SWITCH, vo);
        return vo;
    }

    function addBufferLevel(mediaType, t, level) {
        var vo = new BufferLevel();
        vo.t = t;
        vo.level = level;
        getMetricsFor(mediaType).BufferLevel.push(vo);

        metricAdded(mediaType, adapter.metricsList.BUFFER_LEVEL, vo);
        return vo;
    }

    function addBufferState(mediaType, state, target) {
        var vo = new BufferState();
        vo.target = target;
        vo.state = state;
        getMetricsFor(mediaType).BufferState.push(vo);

        metricAdded(mediaType, adapter.metricsList.BUFFER_STATE, vo);
        return vo;
    }


    function addDVRInfo(mediaType, currentTime, mpd, range) {
        var vo = new DVRInfo();

        vo.time = currentTime ;
        vo.range = range;
        vo.manifestInfo = mpd;

        getMetricsFor(mediaType).DVRInfo.push(vo);
        metricAdded(mediaType, adapter.metricsList.DVR_INFO, vo);

        return vo;
    }

    function addDroppedFrames(mediaType, quality) {
        var vo = new DroppedFrames();
        var list = getMetricsFor(mediaType).DroppedFrames;

        vo.time = quality.creationTime;
        vo.droppedFrames = quality.droppedVideoFrames;

        if (list.length > 0 && list[list.length - 1] == vo) {
            return list[list.length - 1];
        }

        list.push(vo);

        metricAdded(mediaType, adapter.metricsList.DROPPED_FRAMES, vo);
        return vo;
    }

    function addSchedulingInfo(mediaType, t, type, startTime, availabilityStartTime, duration, quality, range, state) {
        var vo = new SchedulingInfo();

        vo.mediaType = mediaType;
        vo.t = t;

        vo.type = type;
        vo.startTime = startTime;
        vo.availabilityStartTime = availabilityStartTime;
        vo.duration = duration;
        vo.quality = quality;
        vo.range = range;

        vo.state = state;

        getMetricsFor(mediaType).SchedulingInfo.push(vo);

        metricAdded(mediaType, adapter.metricsList.SCHEDULING_INFO, vo);
        return vo;
    }

    function addRequestsQueue(mediaType, loadingRequests, executedRequests) {
        var vo = new RequestsQueue();
        vo.loadingRequests = loadingRequests;
        vo.executedRequests = executedRequests;

        getMetricsFor(mediaType).RequestsQueue = vo;
        metricAdded(mediaType, adapter.metricsList.REQUESTS_QUEUE, vo);
    }

    function addManifestUpdate(mediaType, type, requestTime, fetchTime, availabilityStartTime, presentationStartTime, clientTimeOffset, currentTime, buffered, latency) {
        var vo = new ManifestUpdate();
        var metrics = getMetricsFor('stream');

        vo.mediaType = mediaType;
        vo.type = type;
        vo.requestTime = requestTime; // when this manifest update was requested
        vo.fetchTime = fetchTime; // when this manifest update was received
        vo.availabilityStartTime = availabilityStartTime;
        vo.presentationStartTime = presentationStartTime; // the seek point (liveEdge for dynamic, Stream[0].startTime for static)
        vo.clientTimeOffset = clientTimeOffset; // the calculated difference between the server and client wall clock time
        vo.currentTime = currentTime; // actual element.currentTime
        vo.buffered = buffered; // actual element.ranges
        vo.latency = latency; // (static is fixed value of zero. dynamic should be ((Now-@availabilityStartTime) - currentTime)

        metrics.ManifestUpdate.push(vo);
        metricAdded(mediaType, adapter.metricsList.MANIFEST_UPDATE, vo);

        return vo;
    }

    function updateManifestUpdateInfo(manifestUpdate, updatedFields) {
        if (manifestUpdate) {
            for (var field in updatedFields) {
                manifestUpdate[field] = updatedFields[field];
            }

            metricUpdated(manifestUpdate.mediaType, adapter.metricsList.MANIFEST_UPDATE, manifestUpdate);
        }
    }

    function addManifestUpdateStreamInfo(manifestUpdate, id, index, start, duration) {
        if (manifestUpdate) {
            var vo = new ManifestUpdateStreamInfo();

            vo.id = id;
            vo.index = index;
            vo.start = start;
            vo.duration = duration;

            manifestUpdate.streamInfo.push(vo);
            metricUpdated(manifestUpdate.mediaType, adapter.metricsList.MANIFEST_UPDATE_STREAM_INFO, manifestUpdate);

            return vo;
        }
        return null;
    }

    function addManifestUpdateRepresentationInfo(manifestUpdate, id, index, streamIndex, mediaType, presentationTimeOffset, startNumber, fragmentInfoType) {
        if (manifestUpdate) {
            var vo = new ManifestUpdateTrackInfo();

            vo.id = id;
            vo.index = index;
            vo.streamIndex = streamIndex;
            vo.mediaType = mediaType;
            vo.startNumber = startNumber;
            vo.fragmentInfoType = fragmentInfoType;
            vo.presentationTimeOffset = presentationTimeOffset;

            manifestUpdate.trackInfo.push(vo);
            metricUpdated(manifestUpdate.mediaType, adapter.metricsList.MANIFEST_UPDATE_TRACK_INFO, manifestUpdate);

            return vo;
        }
        return null;
    }

    function addPlayList(vo) {
        var type = 'stream';

        if (vo.trace && Array.isArray(vo.trace)) {
            vo.trace.forEach(trace => {
                if (trace.hasOwnProperty('subreplevel') && !trace.subreplevel) {
                    delete trace.subreplevel;
                }
            });
        } else {
            delete vo.trace;
        }

        getMetricsFor(type).PlayList.push(vo);

        metricAdded(type, adapter.metricsList.PLAY_LIST, vo);
        return vo;
    }

    function addDVBErrors(vo) {
        var type = 'stream';

        getMetricsFor(type).DVBErrors.push(vo);

        metricAdded(type, adapter.metricsList.DVB_ERRORS, vo);

        return vo;
    }

    function updateBolaState(mediaType, _s) {
        var vo = new BolaState();
        vo._s = _s;
        getMetricsFor(mediaType).BolaState = [vo];

        metricAdded(mediaType, 'BolaState', vo);
        return vo;
    }

    instance = {
        metricsChanged: metricsChanged,
        metricChanged: metricChanged,
        metricUpdated: metricUpdated,
        metricAdded: metricAdded,
        clearCurrentMetricsForType: clearCurrentMetricsForType,
        clearAllCurrentMetrics: clearAllCurrentMetrics,
        getReadOnlyMetricsFor: getReadOnlyMetricsFor,
        getMetricsFor: getMetricsFor,
        addTcpConnection: addTcpConnection,
        addHttpRequest: addHttpRequest,
        addRepresentationSwitch: addRepresentationSwitch,
        addBufferLevel: addBufferLevel,
        addBufferState: addBufferState,
        addDVRInfo: addDVRInfo,
        addDroppedFrames: addDroppedFrames,
        addSchedulingInfo: addSchedulingInfo,
        addRequestsQueue: addRequestsQueue,
        addManifestUpdate: addManifestUpdate,
        updateManifestUpdateInfo: updateManifestUpdateInfo,
        addManifestUpdateStreamInfo: addManifestUpdateStreamInfo,
        addManifestUpdateRepresentationInfo: addManifestUpdateRepresentationInfo,
        addPlayList: addPlayList,
        addDVBErrors: addDVBErrors,
        updateBolaState: updateBolaState,
        setConfig: setConfig
    };

    setup();
    return instance;
}

MetricsModel.__dashjs_factory_name = 'MetricsModel';
export default FactoryMaker.getSingletonFactory(MetricsModel);
