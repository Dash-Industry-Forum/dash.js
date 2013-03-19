/*
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * author Digital Primates
 * copyright dash-if 2012
 */
MediaPlayer.models.MetricsModel = function () {
    "use strict";

    return {
        system:undefined,
        streamMetrics: {},

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

        addTcpConnection: function (streamType, tcpid, dest, topen, tclose, tconnect) {
            var vo = new MediaPlayer.vo.metrics.TCPConnection();

            vo.tcpid = tcpid;
            vo.dest = dest;
            vo.topen = topen;
            vo.tclose = tclose;
            vo.tconnect = tconnect;

            this.getMetricsFor(streamType).TcpList.push(vo);
            return vo;
        },

        addHttpRequest: function (streamType, tcpid, type, url, actualurl, range, trequest, tresponse, responsecode, interval, mediaduration) {
            var vo = new MediaPlayer.vo.metrics.HTTPRequest();

            vo.tcpid = tcpid;
            vo.type = type;
            vo.url = url;
            vo.actualurl = actualurl;
            vo.range = range;
            vo.trequest = trequest;
            vo.tresponse = tresponse;
            vo.responsecode = responsecode;
            vo.interval = interval;
            vo.mediaduration = mediaduration;

            this.getMetricsFor(streamType).HttpList.push(vo);
            return vo;
        },

        appendHttpTrace: function (httpRequest, s, d, b) {
            var vo = new MediaPlayer.vo.metrics.HTTPRequest.Trace();

            vo.s = s;
            vo.d = d;
            vo.b = b;

            httpRequest.trace.push(vo);
            return vo;
        },

        addRepresentationSwitch: function (streamType, t, mt, to, lto) {
            var vo = new MediaPlayer.vo.metrics.RepresentationSwitch();

            vo.t = t;
            vo.mt = mt;
            vo.to = to;
            vo.lto = lto;

            this.getMetricsFor(streamType).RepSwitchList.push(vo);
            return vo;
        },

        addBufferLevel: function (streamType, t, level) {
            var vo = new MediaPlayer.vo.metrics.BufferLevel();

            vo.t = t;
            vo.level = level;

            this.getMetricsFor(streamType).BufferLevel.push(vo);
            return vo;
        },

        addPlayList: function (streamType, start, mstart, starttype) {
            var vo = new MediaPlayer.vo.metrics.PlayList();

            vo.start = start;
            vo.mstart = mstart;
            vo.starttype = starttype;

            this.getMetricsFor(streamType).PlayList.push(vo);
            return vo;
        },

        appendPlayListTrace: function (playList, representationid, subreplevel, start, mstart, duration, playbackspeed, stopreason) {
            var vo = new MediaPlayer.vo.metrics.PlayList.Trace();

            vo.representationid = representationid;
            vo.subreplevel = subreplevel;
            vo.start = start;
            vo.mstart = mstart;
            vo.duration = duration;
            vo.playbackspeed = playbackspeed;
            vo.stopreason = stopreason;

            playList.trace.push(vo);
            return vo;
        }
    };
};

MediaPlayer.models.MetricsModel.prototype = {
    constructor: MediaPlayer.models.MetricsModel
};