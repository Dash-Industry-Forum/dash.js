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
 * copyright Digital Primates 2012
 */
MediaPlayer.models.MetricsModel = function (element) {
    "use strict";
    
    this.TcpList = [];
    this.HttpList = [];
    this.RepSwitchList = [];
    this.BufferLevel = [];
    this.PlayList = [];
};

Constr.prototype = {
    constructor: MediaPlayer.models.MetricsModel,
    
    addTcpConnection: function (tcpid,
                                dest,
                                topen,
                                tclose,
                                tconnect) {
        var vo = new MediaPlayer.vo.metrics.TCPConnection();
        vo.tcpid = tcpid;
        vo.dest = dest;
        vo.topen = topen;
        vo.tclose = tclose;
        vo.tconnect = tconnect;
        
        this.TcpList.push(vo);
    },
    
    addHttpRequest: function (tcpid,
                              type,
                              url,
                              actualurl,
                              range,
                              trequest,
                              tresponse,
                              responsecode,
                              interval) {
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
        
        this.HttpList.push(vo);
    },
    
    addRepresentationSwitch: function (t,
                                       mt,
                                       to,
                                       lto) {
        var vo = new MediaPlayer.vo.metrics.RepresentationSwitch();
        vo.t = t;
        vo.mt = mt;
        vo.to = to;
        vo.lto = lto;
        
        this.RepSwitchList.push(vo);
    },
    
    addBufferLevel: function (t,
                              level) {
        var vo = new MediaPlayer.vo.metrics.BufferLevel();
        vo.t = t;
        vo.level = level;
        
        this.BufferLevel.push(vo);
    },
    
    addPlayAction: function (start,
                             mstart,
                             starttype) {
        var vo = new MediaPlayer.vo.metrics.PlayList();
        vo.start = start;
        vo.mstart = mstart;
        vo.starttype = starttype;
        
        this.PlayList.push(vo);
    }
};