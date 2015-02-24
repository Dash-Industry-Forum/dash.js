/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 * 
 * Copyright (c) 2013, Digital Primates
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.models.MetricsModel = function () {
    "use strict";

    return {
        system : undefined,
        eventBus: undefined,
        adapter: undefined,
        streamMetrics: {},
        metricsChanged: function () {
            this.eventBus.dispatchEvent({
                type: MediaPlayer.events.METRICS_CHANGED,
                data: {}
            });
        },

        metricChanged: function (mediaType) {
            this.eventBus.dispatchEvent({
                type: MediaPlayer.events.METRIC_CHANGED,
                data: {stream: mediaType}
            });
            this.metricsChanged();
        },

        metricUpdated: function (mediaType, metricType, vo) {
            this.eventBus.dispatchEvent({
                type: MediaPlayer.events.METRIC_UPDATED,
                data: {stream: mediaType, metric: metricType, value: vo}
            });
            this.metricChanged(mediaType);
        },

        metricAdded: function (mediaType, metricType, vo) {
            this.eventBus.dispatchEvent({
                type: MediaPlayer.events.METRIC_ADDED,
                data: {stream: mediaType, metric: metricType, value: vo}
            });
            this.metricChanged(mediaType);
        },

        clearCurrentMetricsForType: function (type) {
            delete this.streamMetrics[type];
            this.metricChanged(type);
        },

        clearAllCurrentMetrics: function () {
            var self = this;
            this.streamMetrics = {};
            this.metricsChanged.call(self);
        },

        getReadOnlyMetricsFor: function(type) {
            if (this.streamMetrics.hasOwnProperty(type)) {
                return this.streamMetrics[type];
            }

            return null;
        },

        getMetricsFor: function(type) {
            var metrics;

            if (this.streamMetrics.hasOwnProperty(type)) {
                metrics = this.streamMetrics[type];
            } else {
                metrics = this.system.getObject("metrics");
                this.streamMetrics[type] = metrics;
            }

            return metrics;
        },

        addTcpConnection: function (mediaType, tcpid, dest, topen, tclose, tconnect) {
            var vo = new MediaPlayer.vo.metrics.TCPConnection();

            vo.tcpid = tcpid;
            vo.dest = dest;
            vo.topen = topen;
            vo.tclose = tclose;
            vo.tconnect = tconnect;

            this.getMetricsFor(mediaType).TcpList.push(vo);

            this.metricAdded(mediaType, this.adapter.metricsList.TCP_CONNECTION, vo);
            return vo;
        },

        addHttpRequest: function (mediaType, tcpid, type, url, actualurl, range, trequest, tresponse, tfinish, responsecode, interval, mediaduration, responseHeaders) {
            var vo = new MediaPlayer.vo.metrics.HTTPRequest();

            vo.stream = mediaType;
            vo.tcpid = tcpid;
            vo.type = type;
            vo.url = url;
            vo.actualurl = actualurl;
            vo.range = range;
            vo.trequest = trequest;
            vo.tresponse = tresponse;
            vo.tfinish = tfinish;
            vo.responsecode = responsecode;
            vo.interval = interval;
            vo.mediaduration = mediaduration;
            vo.responseHeaders = responseHeaders;
            this.getMetricsFor(mediaType).HttpList.push(vo);

            this.metricAdded(mediaType, this.adapter.metricsList.HTTP_REQUEST, vo);
            return vo;
        },

        appendHttpTrace: function (httpRequest, s, d, b) {
            var vo = new MediaPlayer.vo.metrics.HTTPRequest.Trace();

            vo.s = s;
            vo.d = d;
            vo.b = b;

            httpRequest.trace.push(vo);

            this.metricUpdated(httpRequest.stream, this.adapter.metricsList.HTTP_REQUEST_TRACE, httpRequest);
            return vo;
        },

        addTrackSwitch: function (mediaType, t, mt, to, lto) {
            var vo = new MediaPlayer.vo.metrics.TrackSwitch();

            vo.t = t;
            vo.mt = mt;
            vo.to = to;
            vo.lto = lto;

            this.getMetricsFor(mediaType).RepSwitchList.push(vo);

            this.metricAdded(mediaType, this.adapter.metricsList.TRACK_SWITCH, vo);
            return vo;
        },

        addBufferLevel: function (mediaType, t, level) {
            var vo = new MediaPlayer.vo.metrics.BufferLevel();
            vo.t = t;
            vo.level = level;
            this.getMetricsFor(mediaType).BufferLevel.push(vo);

            this.metricAdded(mediaType, this.adapter.metricsList.BUFFER_LEVEL, vo);
            return vo;
        },

        addBufferState: function (mediaType, state, target) {
            var vo = new MediaPlayer.vo.metrics.BufferState();
            vo.target = target;
            vo.state = state;
            this.getMetricsFor(mediaType).BufferState.push(vo);

            this.metricAdded(mediaType, this.adapter.metricsList.BUFFER_STATE, vo);
            return vo;
        },


        addDVRInfo: function (mediaType, currentTime, mpd, range)
        {
            var vo = new MediaPlayer.vo.metrics.DVRInfo();

            vo.time = currentTime ;
            vo.range = range;
            vo.manifestInfo = mpd;

            this.getMetricsFor(mediaType).DVRInfo.push(vo);
            this.metricAdded(mediaType, this.adapter.metricsList.DVR_INFO, vo);

            return vo;
        },

        addDroppedFrames: function (mediaType, quality) {
            var vo = new MediaPlayer.vo.metrics.DroppedFrames(),
                list = this.getMetricsFor(mediaType).DroppedFrames;

            vo.time = quality.creationTime;
            vo.droppedFrames = quality.droppedVideoFrames;

            if (list.length > 0 && list[list.length - 1] == vo) {
                return list[list.length - 1];
            }

            list.push(vo);

            this.metricAdded(mediaType, this.adapter.metricsList.DROPPED_FRAMES, vo);
            return vo;
        },

        addSchedulingInfo: function(mediaType, t, type, startTime, availabilityStartTime, duration, quality, range, state) {
            var vo = new MediaPlayer.vo.metrics.SchedulingInfo();

            vo.mediaType = mediaType;
            vo.t = t;

            vo.type = type;
            vo.startTime = startTime;
            vo.availabilityStartTime = availabilityStartTime;
            vo.duration = duration;
            vo.quality = quality;
            vo.range = range;

            vo.state = state;

            this.getMetricsFor(mediaType).SchedulingInfo.push(vo);

            this.metricAdded(mediaType, this.adapter.metricsList.SCHEDULING_INFO, vo);
            return vo;
        },

        addManifestUpdate: function(mediaType, type, requestTime, fetchTime, availabilityStartTime, presentationStartTime, clientTimeOffset, currentTime, buffered, latency) {
            var vo = new MediaPlayer.vo.metrics.ManifestUpdate(),
                metrics = this.getMetricsFor("stream");

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
            this.metricAdded(mediaType, this.adapter.metricsList.MANIFEST_UPDATE, vo);

            return vo;
        },

        updateManifestUpdateInfo: function(manifestUpdate, updatedFields) {
            for (var field in updatedFields) {
                manifestUpdate[field] = updatedFields[field];
            }

            this.metricUpdated(manifestUpdate.mediaType, this.adapter.metricsList.MANIFEST_UPDATE, manifestUpdate);
        },

        addManifestUpdateStreamInfo: function(manifestUpdate, id, index, start, duration) {
            var vo = new MediaPlayer.vo.metrics.ManifestUpdate.StreamInfo();

            vo.id = id;
            vo.index = index;
            vo.start = start;
            vo.duration = duration;

            manifestUpdate.streamInfo.push(vo);
            this.metricUpdated(manifestUpdate.mediaType, this.adapter.metricsList.MANIFEST_UPDATE_STREAM_INFO, manifestUpdate);

            return vo;
        },

        addManifestUpdateTrackInfo: function(manifestUpdate, id, index, streamIndex, mediaType, presentationTimeOffset, startNumber, fragmentInfoType) {
            var vo = new MediaPlayer.vo.metrics.ManifestUpdate.TrackInfo();

            vo.id = id;
            vo.index = index;
            vo.streamIndex = streamIndex;
            vo.mediaType = mediaType;
            vo.startNumber = startNumber;
            vo.fragmentInfoType = fragmentInfoType;
            vo.presentationTimeOffset = presentationTimeOffset;

            manifestUpdate.trackInfo.push(vo);
            this.metricUpdated(manifestUpdate.mediaType, this.adapter.metricsList.MANIFEST_UPDATE_TRACK_INFO, manifestUpdate);

            return vo;
        },

        addPlayList: function (mediaType, start, mstart, starttype) {
            var vo = new MediaPlayer.vo.metrics.PlayList();

            vo.stream = mediaType;
            vo.start = start;
            vo.mstart = mstart;
            vo.starttype = starttype;

            this.getMetricsFor(mediaType).PlayList.push(vo);

            this.metricAdded(mediaType, this.adapter.metricsList.PLAY_LIST, vo);
            return vo;
        },

        appendPlayListTrace: function (playList, trackId, subreplevel, start, mstart, duration, playbackspeed, stopreason) {
            var vo = new MediaPlayer.vo.metrics.PlayList.Trace();

            vo.representationid = trackId;
            vo.subreplevel = subreplevel;
            vo.start = start;
            vo.mstart = mstart;
            vo.duration = duration;
            vo.playbackspeed = playbackspeed;
            vo.stopreason = stopreason;

            playList.trace.push(vo);

            this.metricUpdated(playList.stream, this.adapter.metricsList.PLAY_LIST_TRACE, playList);
            return vo;
        }
    };
};

MediaPlayer.models.MetricsModel.prototype = {
    constructor: MediaPlayer.models.MetricsModel
};