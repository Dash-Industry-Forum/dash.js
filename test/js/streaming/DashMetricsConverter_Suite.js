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

describe("Dash Metrics Converter Test Suite", function(){
    var baseUrl, system, context, metricsConverter , metrics={};
		 beforeEach(function(){
			
			system = new dijon.System();
			system.mapValue("system", system);
			system.mapOutlet("system");

			context = new Dash.di.DashContext();
			system.injectInto(context);
			
			metricsConverter = system.getObject("metricsConverter");
			 
			var objBufferLevel=[];
			var subObjBufferLevel=new MediaPlayer.vo.metrics.BufferLevel();
			subObjBufferLevel.level=0;
			subObjBufferLevel.t=new Date();
			objBufferLevel.push(subObjBufferLevel);
			metrics.BufferLevel=objBufferLevel;
			
			var objDroppedFrames=[];
			var subobjDroppedFrame=new  MediaPlayer.vo.metrics.DroppedFrames();
			objDroppedFrames.push(subobjDroppedFrame);
			metrics.DroppedFrames=objDroppedFrames;
			
			var objHttpList=[];
			var subobjHttpList=new MediaPlayer.vo.metrics.HTTPRequest();
			subobjHttpList.actualurl=null;
			subobjHttpList.interval=null;
			subobjHttpList.mediaduration=NaN;
			subobjHttpList.range=null;
			subobjHttpList.responsecode=200;
			subobjHttpList.tcpid=null;
			
			var subobjTrace=new MediaPlayer.vo.metrics.HTTPRequest.Trace();
			subobjTrace.b={};
			subobjTrace.d= 1631;
			subobjTrace.s= new Date();
			subobjHttpList.trace=subobjTrace;
			subobjHttpList.trequest= new Date();
			subobjHttpList.tresponse= new Date();
			subobjHttpList.type= "Initialization Segment";
			subobjHttpList.url= "http://dashdemo.edgesuite.net/envivio/dashpr/clear/audio/Header.m4s"
			
			objHttpList.push(subobjHttpList);
			
			var subobjHttpList=new MediaPlayer.vo.metrics.HTTPRequest();
			subobjHttpList.actualurl=null;
			subobjHttpList.interval=null;
			subobjHttpList.mediaduration=4;
			subobjHttpList.range=null;
			subobjHttpList.responsecode=200;
			subobjHttpList.tcpid=null;
			
			var subobjTrace=new MediaPlayer.vo.metrics.HTTPRequest.Trace();
			subobjTrace.b={};
			subobjTrace.d= 1697;
			subobjTrace.s= new Date();
			subobjHttpList.trace=subobjTrace;
			subobjHttpList.trequest= new Date();
			subobjHttpList.tresponse= new Date();
			subobjHttpList.type="Media Segment";
			subobjHttpList.url= audioUrl;
			
			objHttpList.push(subobjHttpList);
			
			metrics.HttpList=objHttpList;
			
			var objPlayList=[];
			var subobjPlayList=new  MediaPlayer.vo.metrics.PlayList();
			subobjPlayList.mstart=0;
			subobjPlayList.start= new Date();
			subobjPlayList.starttype="initial_start";
			
			var subobjTrace=new MediaPlayer.vo.metrics.PlayList.Trace();
			subobjTrace.duration=null;
			subobjTrace.mstart= 0;
			subobjTrace.playbackspeed= 1;
			subobjTrace.representationid="audio";
			subobjTrace.start= new Date();
			subobjTrace.stopreason= null;
			subobjTrace.subreplevel= null;
			subobjPlayList.trace=subobjTrace;
			
			objPlayList.push(subobjPlayList);
			metrics.PlayList=objPlayList;
			
			var objRepSwitchList=[];
			var subobjRepSwitchList=new  MediaPlayer.vo.metrics.RepresentationSwitch();
			subobjRepSwitchList.lto=undefined;
			subobjRepSwitchList.mt=0;
			subobjRepSwitchList.t=new Date();
			subobjRepSwitchList.to="audio";
			objRepSwitchList.push(subobjRepSwitchList);
			
			metrics.RepSwitchList=objRepSwitchList;
			
			var objTcpList=[];
			var subobjTcpList=new  MediaPlayer.vo.metrics.TCPConnection();
			objTcpList.push(subobjTcpList);
			
			metrics.TcpList=objTcpList;
				
	});
	
	/**  
    it("toTreeViewDataSource function", function(){
        videoMetricDataSource = new kendo.data.HierarchicalDataSource();
		videoMetricDataSource=metricsConverter.toTreeViewDataSource(metrics);
		expect(videoMetricDataSource.options.data.length).toBe(6);
    }); */
});