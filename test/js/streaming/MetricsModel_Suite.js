// The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
//
// Copyright (c) 2013, Microsoft Open Technologies, Inc.
//
// All rights reserved.
// Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
//     -             Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
//     -             Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
//     -             Neither the name of the Microsoft Open Technologies, Inc. nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

//This class parses the MPDs using DashParser framework.


describe("Metrics Model Suite", function () {
        var context,
            system,
            result,
            metricsModel;
           
             beforeEach(function () {
                system = new dijon.System();
                system.mapValue("system", system);
                system.mapOutlet("system");
                context = new Dash.di.DashContext();
                system.injectInto(context);
                metricsModel=system.getObject('metricsModel');           
            });
			
           
             it("addHttpRequest function", function(){
                 var outPutVo = new MediaPlayer.vo.metrics.HTTPRequest();
                 var streamType="stream",
                     tcpid=null,
                     type="MPD",
                     url="http://dashdemo.edgesuite.net/envivio/dashpr/clear/Manifest.mpd",
                     actualurl=null,
                     range=null,
                     trequest=new Date(),
                     tresponse=new Date(),
                     responsecode=200,
                     interval=null,
                     mediaduration=null;
               
                   outPutVo=metricsModel.addHttpRequest(streamType,tcpid,type,url,actualurl,range,trequest,tresponse,responsecode,interval,mediaduration);
                   expect(outPutVo.type).toEqual(type);
             });
             
             it("appendHttpTrace function", function(){
                 var outPutVo = new MediaPlayer.vo.metrics.HTTPRequest.Trace();
                 var reqOutPut=new MediaPlayer.vo.metrics.HTTPRequest();
                     reqOutPut.actualurl=null;
                     reqOutPut.interval=null;
                     reqOutPut.mediaduration=NaN;
                     reqOutPut.range=null;
                     reqOutPut.responsecode=200;
                     reqOutPut.tcpid=null;
                     reqOutPut.trace=new Array();
                     reqOutPut.trequest=new Date();
                     reqOutPut.tresponse=new Date();
                     reqOutPut.type="Initialization Segment";
                     s=new Date();
                     d=2014;
                     b=[686]
                     outPutVo=metricsModel.appendHttpTrace(reqOutPut,s,d,b);
                     expect(outPutVo.d).toEqual(d);
             });
             
             it("addRepresentationSwitch function", function(){
                    var outPutVo = new MediaPlayer.vo.metrics.RepresentationSwitch();
                    streamType="video";
                    t=new Date();
                    mt=0;
                    to="video5";
                    lto=undefined;
                    outPutVo=metricsModel.addRepresentationSwitch(streamType, t, mt, to, lto);
                    expect(outPutVo.to).toEqual(to);
             });
             
              it("addBufferLevel function", function(){
                    var outPutVo =new MediaPlayer.vo.metrics.BufferLevel();
                    streamType="video";
                    t=new Date();
                    level=0;
                    outPutVo=metricsModel.addBufferLevel(streamType, t,level);
                    expect(outPutVo.level).toEqual(level);
             });
             
              it("addPlayList function", function(){
                    var outPutVo =new MediaPlayer.vo.metrics.PlayList();
                    streamType="video";
                    start=new Date();
                    mstart=0;
                    starttype="initial_start";
                    outPutVo=metricsModel.addPlayList(streamType, start, mstart, starttype);
                    expect(outPutVo.starttype).toEqual(starttype);
             });
             
              it("appendPlayListTrace function", function(){
                    var outPutVo = new MediaPlayer.vo.metrics.PlayList.Trace();
                    var playlist=new  MediaPlayer.vo.metrics.PlayList();
                    playlist.start=new Date();
                    playlist.mstart=0;
                    playlist.starttype="initial_start";
                    playlist.trace=new Array();
                   
                    representationid="video1";
                    subreplevel=null;
                    start=new Date();
                    mstart=0;
                    duration=null;
                    playbackspeed=1;
                    stopreason=null;
                   
                    outPutVo=metricsModel.appendPlayListTrace(playlist, representationid, subreplevel, start, mstart, duration, playbackspeed, stopreason);
                    expect(outPutVo.representationid).toEqual(representationid);
             });
             
             //Negative testcases
             it("addHttpRequest function with url as null", function(){
                 var outPutVo = new MediaPlayer.vo.metrics.HTTPRequest();
                 var 
                     tcpid=null,
                     type="MPD",
                     url="http://dashdemo.edgesuite.net/envivio/dashpr/clear/Manifest.mpd",
                     actualurl=null,
                     range=null,
                     trequest=new Date(),
                     tresponse=new Date(),
                     responsecode=200,
                     interval=null,
                     mediaduration=null;
               
                   outPutVo=metricsModel.addHttpRequest(null,tcpid,type,null,actualurl,range,trequest,tresponse,responsecode,interval,mediaduration);
                   expect(outPutVo.stream).toEqual(null);
             });
             
             it("addHttpRequest function with all parameters as null", function(){
                  var outPutVo = new MediaPlayer.vo.metrics.HTTPRequest();
                   outPutVo=metricsModel.addHttpRequest(null,null,null,null,null,null,null,null,null,null,null);
                   expect(outPutVo.type).toEqual(null);
             });
             
			 			 
             it("appendHttpTrace function with one of the field in reqOutPut as null", function(){
                 var outPutVo = new MediaPlayer.vo.metrics.HTTPRequest.Trace();
                 var reqOutPut=new MediaPlayer.vo.metrics.HTTPRequest();
                     reqOutPut.actualurl=null;
                     reqOutPut.interval=null;
                     reqOutPut.mediaduration=NaN;
                     reqOutPut.range=null;
                     reqOutPut.responsecode=200;
                     reqOutPut.tcpid=null;
                     reqOutPut.trace=new Array();
                     reqOutPut.trequest=new Date();
                     reqOutPut.tresponse=new Date();
                     reqOutPut.type="Initialization Segment";
                     s=new Date();
                     d=2014;
                     b=[686]
                     outPutVo=metricsModel.appendHttpTrace(reqOutPut,s,d,b);
                     expect(outPutVo.reqOutPut).toEqual(undefined);
             });
             
              it("appendHttpTrace function with all parameters as null", function(){
                 var outPutVo = new MediaPlayer.vo.metrics.HTTPRequest.Trace();
                     var reqOutPut=new MediaPlayer.vo.metrics.HTTPRequest();
                     outPutVo=metricsModel.appendHttpTrace(reqOutPut,null,null,null);
                     expect(outPutVo.reqOutPut).toEqual(undefined);
             });
             it("addRepresentationSwitch function with streamType as null", function(){
                    var outPutVo = new MediaPlayer.vo.metrics.RepresentationSwitch();
                    t=new Date();
                    mt=0;
                    to="video5";
                    lto=undefined;
                    outPutVo=metricsModel.addRepresentationSwitch(null, t, mt, to, lto);
                    expect(outPutVo.streamType).toEqual(null);
             });
             
             it("addRepresentationSwitch function with all parameters as null", function(){
                    var outPutVo = new MediaPlayer.vo.metrics.RepresentationSwitch();
                    t=new Date();
                    mt=0;
                    to="video5";
                    lto=undefined;
                    outPutVo=metricsModel.addRepresentationSwitch(null, null, null, null, null);
                    expect(outPutVo.streamType).toEqual(null);
             });
             
              it("addBufferLevel function with streamType as null", function(){
                    var outPutVo =new MediaPlayer.vo.metrics.BufferLevel();
                    t=new Date();
                    level=0;
                    outPutVo=metricsModel.addBufferLevel(null, t,level);
                    expect(outPutVo.streamType).toEqual(null);
             });
             
             it("addBufferLevel function with with all parameters as null", function(){
                    var outPutVo =new MediaPlayer.vo.metrics.BufferLevel();
                    t=new Date();
                    level=0;
                    outPutVo=metricsModel.addBufferLevel(null, null,null);
                    expect(outPutVo.streamType).toEqual(null);
             });
             
              it("addPlayList function with streamType as null", function(){
                    var outPutVo =new MediaPlayer.vo.metrics.PlayList();
                    start=new Date();
                    mstart=0;
                    starttype="initial_start";
                    outPutVo=metricsModel.addPlayList(null, start, mstart, starttype);
                    expect(outPutVo.streamType).toEqual(null);
             });
             
              it("addPlayList function with all parameter as null", function(){
                    var outPutVo =new MediaPlayer.vo.metrics.PlayList();
                    start=new Date();
                    mstart=0;
                    starttype="initial_start";
                    outPutVo=metricsModel.addPlayList(null, null, null, null);
                    expect(outPutVo.streamType).toEqual(null);
             });
             
             it("clearCurrentMetricsForType", function(){
                   metricsModel.streamMetrics.audio=2;
                   metricsModel.clearCurrentMetricsForType("audio");
                   expect(metricsModel.streamMetrics.length).toEqual(undefined);
             });
			 
			 it("clearAllCurrentMetrics", function(){
                   metricsModel.streamMetrics.audio=2;
                   metricsModel.clearAllCurrentMetrics();
                   expect(metricsModel.streamMetrics).toEqual({});
             });			 
			 
              it("appendPlayListTrace function with playlist.start as null", function(){
                    var outPutVo = new MediaPlayer.vo.metrics.PlayList.Trace();
                    var playlist=new  MediaPlayer.vo.metrics.PlayList();
                    playlist.start=null;
                    playlist.mstart=0;
                    playlist.starttype="initial_start";
                    playlist.trace=new Array();
                   
                    representationid="video1";
                    subreplevel=null;
                    start=new Date();
                    mstart=0;
                    duration=null;
                    playbackspeed=1;
                    stopreason=null;
                   
                    outPutVo=metricsModel.appendPlayListTrace(playlist, representationid, subreplevel, start, mstart, duration, playbackspeed, stopreason);
                    expect(outPutVo.playlist).toEqual(null);
             });
             
             it("appendPlayListTrace function", function(){
                    var outPutVo = new MediaPlayer.vo.metrics.PlayList.Trace();
                    var playlist=new  MediaPlayer.vo.metrics.PlayList();
                    outPutVo=metricsModel.appendPlayListTrace(playlist, null, null, null, null, null, null, null);
                    expect(outPutVo.representationid).toEqual(null);
             });
			 
			 it("getReadOnlyMetricsFor function without streamMetrics",function(){
				var metricsValue = metricsModel.getReadOnlyMetricsFor("video");
				expect(metricsValue).toBe(null);
			 });	 
			 
			 
			 it("addTcpConnection function", function(){
                    var outPutVo =new MediaPlayer.vo.metrics.TCPConnection();
                    streamType="video";
                    tcpid="";
                    dest=0;
                    topen="";
                    tclose="";
                    tconnect="";
                    outPutVo=metricsModel.addTcpConnection(streamType,tcpid, dest,topen, tclose, tconnect);
                    expect(outPutVo.dest).toEqual(0);
             });

			 it("Check getMetrics Structure",function(){
				var metricsValue = metricsModel.getMetricsFor("video");
				expect(metricsValue).not.toBe(null);
			 });
			 
			 it("Check PlayList Size before Initializing",function(){
				var metricsValue = metricsModel.getMetricsFor("");
				expect(metricsValue.PlayList.length).toBe(0);
			 });
			 
			 it("Check BufferLevel Size before Initializing",function(){
				var metricsValue = metricsModel.getMetricsFor("");
				expect(metricsValue.BufferLevel.length).toBe(0);
			 });
			 
			 it("Check HTTPRequest Size before Initializing",function(){
				var metricsValue = metricsModel.getMetricsFor("");
				expect(metricsValue.HttpList.length).toBe(0);
			 });
			 
			 it("Check RepresentationSwitch Size before Initializing",function(){
				var metricsValue = metricsModel.getMetricsFor("");
				expect(metricsValue.RepSwitchList.length).toBe(0);
			 });
			 
			 it("Check TCPConnection Size before Initializing",function(){
				var metricsValue = metricsModel.getMetricsFor("");
				expect(metricsValue.TcpList.length).toBe(0);
			 });
    });