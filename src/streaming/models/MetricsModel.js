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
import Constants from '../constants/Constants';
import MetricsConstants from '../constants/MetricsConstants';
import MetricsList from '../vo/MetricsList';
import {HTTPRequest, HTTPRequestTrace} from '../vo/metrics/HTTPRequest';
import TrackSwitch from '../vo/metrics/RepresentationSwitch';
import BufferLevel from '../vo/metrics/BufferLevel';
import BufferState from '../vo/metrics/BufferState';
import DVRInfo from '../vo/metrics/DVRInfo';
import DroppedFrames from '../vo/metrics/DroppedFrames';
import {ManifestUpdate, ManifestUpdateStreamInfo, ManifestUpdateRepresentationInfo} from '../vo/metrics/ManifestUpdate';
import SchedulingInfo from '../vo/metrics/SchedulingInfo';
import EventBus from '../../core/EventBus';
import RequestsQueue from '../vo/metrics/RequestsQueue';
import Events from '../../core/events/Events';
import FactoryMaker from '../../core/FactoryMaker';

function MetricsModel(config) {

    config = config || {};

    const settings = config.settings;

    let context = this.context;
    let eventBus = EventBus(context).getInstance();

    let instance,
        streamMetrics;

    function setup() {
        streamMetrics = {};
    }

    function metricsChanged() {
        eventBus.trigger(Events.METRICS_CHANGED);
    }

    function metricChanged(mediaType) {
        eventBus.trigger(Events.METRIC_CHANGED, { mediaType: mediaType });
        metricsChanged();
    }

    function metricUpdated(mediaType, metricType, vo) {
        eventBus.trigger(Events.METRIC_UPDATED, { mediaType: mediaType, metric: metricType, value: vo });
        metricChanged(mediaType);
    }

    function metricAdded(mediaType, metricType, vo) {
        eventBus.trigger(Events.METRIC_ADDED, { mediaType: mediaType, metric: metricType, value: vo });
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

    function getMetricsFor(type, readOnly) {
        let metrics = null;

        if (!type) {
            return metrics;
        }

        if (streamMetrics.hasOwnProperty(type)) {
            metrics = streamMetrics[type];
        } else if (!readOnly) {
            metrics = new MetricsList();
            streamMetrics[type] = metrics;
        }

        return metrics;
    }

    function pushMetrics(type, list, value) {
        let metrics = getMetricsFor(type);
        if (metrics !== null) {
            metrics[list].push(value);
            if (metrics[list].length > settings.get().streaming.metrics.maxListDepth) {
                metrics[list].shift();
            }
        }
    }

    function appendHttpTrace(httpRequest, s, d, b, t) {
        let vo = new HTTPRequestTrace();

        vo.s = s;
        vo.d = d;
        vo.b = b;
        vo.t = t;

        httpRequest.trace.push(vo);

        if (!httpRequest.interval) {
            httpRequest.interval = 0;
        }

        httpRequest.interval += d;

        return vo;
    }

    function addHttpRequest(mediaType, tcpid, type, url, quality, actualurl, serviceLocation, range, trequest, tresponse, tfinish, responsecode, mediaduration, responseHeaders, traces) {
        let vo = new HTTPRequest();

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
                quality,
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
        vo._quality = quality;
        vo._responseHeaders = responseHeaders;
        vo._serviceLocation = serviceLocation;

        if (traces) {
            traces.forEach(trace => {
                appendHttpTrace(vo, trace.s, trace.d, trace.b, trace.t);
            });
        } else {
            // The interval and trace shall be absent for redirect and failure records.
            delete vo.interval;
            delete vo.trace;
        }

        pushAndNotify(mediaType, MetricsConstants.HTTP_REQUEST, vo);
    }

    function addRepresentationSwitch(mediaType, t, mt, to, lto) {
        let vo = new TrackSwitch();

        vo.t = t;
        vo.mt = mt;
        vo.to = to;

        if (lto) {
            vo.lto = lto;
        } else {
            delete vo.lto;
        }

        pushAndNotify(mediaType, MetricsConstants.TRACK_SWITCH, vo);
    }

    function pushAndNotify(mediaType, metricType, metricObject) {
        pushMetrics(mediaType, metricType, metricObject);
        metricAdded(mediaType, metricType, metricObject);
    }

    function addBufferLevel(mediaType, t, level) {
        let vo = new BufferLevel();
        vo.t = t;
        vo.level = level;

        pushAndNotify(mediaType, MetricsConstants.BUFFER_LEVEL, vo);
    }

    function addBufferState(mediaType, state, target) {
        let vo = new BufferState();
        vo.target = target;
        vo.state = state;

        pushAndNotify(mediaType, MetricsConstants.BUFFER_STATE, vo);
    }

    function addDVRInfo(mediaType, currentTime, mpd, range) {
        let vo = new DVRInfo();
        vo.time = currentTime;
        vo.range = range;
        vo.manifestInfo = mpd;

        pushAndNotify(mediaType, MetricsConstants.DVR_INFO, vo);
    }

    function addDroppedFrames(mediaType, quality) {
        let vo = new DroppedFrames();
        let list = getMetricsFor(mediaType).DroppedFrames;

        if (!quality) {
            return;
        }

        vo.time = quality.creationTime;
        vo.droppedFrames = quality.droppedVideoFrames;

        if (list.length > 0 && list[list.length - 1] == vo) {
            return;
        }

        pushAndNotify(mediaType, MetricsConstants.DROPPED_FRAMES, vo);
    }

    function addSchedulingInfo(mediaType, t, type, startTime, availabilityStartTime, duration, quality, range, state) {
        let vo = new SchedulingInfo();

        vo.mediaType = mediaType;
        vo.t = t;

        vo.type = type;
        vo.startTime = startTime;
        vo.availabilityStartTime = availabilityStartTime;
        vo.duration = duration;
        vo.quality = quality;
        vo.range = range;

        vo.state = state;

        pushAndNotify(mediaType, MetricsConstants.SCHEDULING_INFO, vo);
    }

    function addRequestsQueue(mediaType, loadingRequests, executedRequests) {
        let vo = new RequestsQueue();

        vo.loadingRequests = loadingRequests;
        vo.executedRequests = executedRequests;

        getMetricsFor(mediaType).RequestsQueue = vo;
        metricAdded(mediaType, MetricsConstants.REQUESTS_QUEUE, vo);
    }

    function addManifestUpdate(mediaType, type, requestTime, fetchTime, availabilityStartTime, presentationStartTime, clientTimeOffset, currentTime, buffered, latency) {
        let vo = new ManifestUpdate();

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

        pushMetrics(Constants.STREAM, MetricsConstants.MANIFEST_UPDATE, vo);
        metricAdded(mediaType, MetricsConstants.MANIFEST_UPDATE, vo);
    }

    function updateManifestUpdateInfo(manifestUpdate, updatedFields) {
        if (manifestUpdate) {
            for (let field in updatedFields) {
                manifestUpdate[field] = updatedFields[field];
            }

            metricUpdated(manifestUpdate.mediaType, MetricsConstants.MANIFEST_UPDATE, manifestUpdate);
        }
    }

    function addManifestUpdateStreamInfo(manifestUpdate, id, index, start, duration) {
        if (manifestUpdate) {
            let vo = new ManifestUpdateStreamInfo();

            vo.id = id;
            vo.index = index;
            vo.start = start;
            vo.duration = duration;

            manifestUpdate.streamInfo.push(vo);
            metricUpdated(manifestUpdate.mediaType, MetricsConstants.MANIFEST_UPDATE_STREAM_INFO, manifestUpdate);
        }
    }

    function addManifestUpdateRepresentationInfo(manifestUpdate, id, index, streamIndex, mediaType, presentationTimeOffset, startNumber, fragmentInfoType) {
        if (manifestUpdate && manifestUpdate.representationInfo) {

            const vo = new ManifestUpdateRepresentationInfo();
            vo.id = id;
            vo.index = index;
            vo.streamIndex = streamIndex;
            vo.mediaType = mediaType;
            vo.startNumber = startNumber;
            vo.fragmentInfoType = fragmentInfoType;
            vo.presentationTimeOffset = presentationTimeOffset;

            manifestUpdate.representationInfo.push(vo);
            metricUpdated(manifestUpdate.mediaType, MetricsConstants.MANIFEST_UPDATE_TRACK_INFO, manifestUpdate);
        }
    }

    function addPlayList(vo) {
        if (vo.trace && Array.isArray(vo.trace)) {
            vo.trace.forEach(trace => {
                if (trace.hasOwnProperty('subreplevel') && !trace.subreplevel) {
                    delete trace.subreplevel;
                }
            });
        } else {
            delete vo.trace;
        }

        pushAndNotify(Constants.STREAM, MetricsConstants.PLAY_LIST, vo);
    }

    function addDVBErrors(vo) {
        pushAndNotify(Constants.STREAM, MetricsConstants.DVB_ERRORS, vo);
    }

    instance = {
        clearCurrentMetricsForType: clearCurrentMetricsForType,
        clearAllCurrentMetrics: clearAllCurrentMetrics,
        getMetricsFor: getMetricsFor,
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
        addDVBErrors: addDVBErrors
    };

    setup();
    return instance;
}

MetricsModel.__dashjs_factory_name = 'MetricsModel';
export default FactoryMaker.getSingletonFactory(MetricsModel);
