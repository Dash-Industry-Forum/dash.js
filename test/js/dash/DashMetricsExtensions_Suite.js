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
describe("DashMetricsExtensions Test Suite", function () {
	var baseUrl,
	system,
	context,
	metricExtn,
	metrics = {};

	beforeEach(function () {
		baseUrl = "http://dashdemo.edgesuite.net/envivio/dashpr/clear/";

		// Set up DI.
		system = new dijon.System();
		system.mapValue("system", system);
		system.mapOutlet("system");
		context = new Dash.di.DashContext();
		system.injectInto(context);
		metricExtn = system.getObject("metricsExt");

		var common = [{
				name : 'profiles',
				merge : false
			}, {
				name : 'width',
				merge : false
			}, {
				name : 'height',
				merge : false
			}, {
				name : 'sar',
				merge : false
			}, {
				name : 'frameRate',
				merge : false
			}, {
				name : 'audioSamplingRate',
				merge : false
			}, {
				name : 'mimeType',
				merge : false
			}, {
				name : 'segmentProfiles',
				merge : false
			}, {
				name : 'codecs',
				merge : false
			}, {
				name : 'maximumSAPPeriod',
				merge : false
			}, {
				name : 'startsWithSap',
				merge : false
			}, {
				name : 'maxPlayoutRate',
				merge : false
			}, {
				name : 'codingDependency',
				merge : false
			}, {
				name : 'scanType',
				merge : false
			}, {
				name : 'FramePacking',
				merge : true
			}, {
				name : 'AudioChannelConfiguration',
				merge : true
			}, {
				name : 'ContentProtection',
				merge : true
			}
		];
		manifest = {};
		manifest.name = "manifest";
		manifest.isRoot = true;
		manifest.isArray = true;
		manifest.parent = null;
		manifest.Period_asArray = []; //children
		manifest.properties = common;

		period = {};
		period.name = "period";
		period.isRoot = false;
		period.isArray = true;
		period.parent = manifest;
		period.AdaptationSet_asArray = []; //children
		period.properties = common;
		manifest.Period_asArray.push(period);

		adaptationSet = {};
		adaptationSet.name = "AdaptationSet";
		adaptationSet.isRoot = false;
		adaptationSet.isArray = true;
		adaptationSet.parent = period;
		adaptationSet.Representation_asArray = []; //children
		adaptationSet.properties = common;

		adaptationSet.mimeType = "video/mp4";
		adaptationSet.segmentAlignment = "true";
		adaptationSet.startWithSAP = "1";
		adaptationSet.maxWidth = "1280";
		adaptationSet.maxHeight = "720";
		adaptationSet.maxFrameRate = "25";
		adaptationSet.par = "16:9";
		period.AdaptationSet_asArray.push(adaptationSet);
		{
			representation = {};
			representation.name = "Representation";
			representation.isRoot = false;
			representation.isArray = true;
			representation.parent = adaptationSet;
			representation.children = null;
			representation.properties = common;
			representation.id = "video1";
			representation.width = "true";
			representation.height = "1";
			representation.frameRate = "1280";
			representation.sar = "720";
			representation.scanType = "25";
			representation.bandwidth = "275000";
			representation.codecs = "video/mp4";
			adaptationSet.Representation_asArray.push(representation);
		}
		{
			representation = {};
			representation.name = "Representation";
			representation.isRoot = false;
			representation.isArray = true;
			representation.parent = adaptationSet;
			representation.children = null;
			representation.properties = common;
			representation.id = "video2";
			representation.width = "true";
			representation.height = "1";
			representation.frameRate = "1280";
			representation.sar = "720";
			representation.scanType = "25";
			representation.bandwidth = "475000";
			representation.codecs = "video/mp4";
			adaptationSet.Representation_asArray.push(representation);
		}
		{
			representation = {};
			representation.name = "Representation";
			representation.isRoot = false;
			representation.isArray = true;
			representation.parent = adaptationSet;
			representation.children = null;
			representation.properties = common;
			representation.id = "video3";
			representation.width = "true";
			representation.height = "1";
			representation.frameRate = "1280";
			representation.sar = "720";
			representation.scanType = "25";
			representation.bandwidth = "875000";
			representation.codecs = "video/mp4";
			adaptationSet.Representation_asArray.push(representation);
		}
		// this updates the model
		metricExtn.manifestModel.setValue(manifest);

		var objBufferLevel = [];
		var subObjBufferLevel = new MediaPlayer.vo.metrics.BufferLevel();
		subObjBufferLevel.level = 0;
		subObjBufferLevel.t = new Date();
		objBufferLevel.push(subObjBufferLevel);
		metrics.BufferLevel = objBufferLevel;

		var objDroppedFrames = [];
		metrics.DroppedFrames = objDroppedFrames;

		var objHttpList = [];
		var subobjHttpList = new MediaPlayer.vo.metrics.HTTPRequest();
		subobjHttpList.actualurl = null;
		subobjHttpList.interval = null;
		subobjHttpList.mediaduration = NaN;
		subobjHttpList.range = null;
		subobjHttpList.responsecode = 200;
		subobjHttpList.tcpid = null;

		var subobjTrace = new MediaPlayer.vo.metrics.HTTPRequest.Trace();
		subobjTrace.b = {};
		subobjTrace.d = 1631;
		subobjTrace.s = new Date();
		subobjHttpList.trace = subobjTrace;
		subobjHttpList.trequest = new Date();
		subobjHttpList.tresponse = new Date();
		subobjHttpList.type = "Initialization Segment";
		subobjHttpList.url = "http://dashdemo.edgesuite.net/envivio/dashpr/clear/audio/Header.m4s"

			objHttpList.push(subobjHttpList);

		var subobjHttpList = new MediaPlayer.vo.metrics.HTTPRequest();
		subobjHttpList.actualurl = null;
		subobjHttpList.interval = null;
		subobjHttpList.mediaduration = 4;
		subobjHttpList.range = null;
		subobjHttpList.responsecode = 200;
		subobjHttpList.tcpid = null;

		var subobjTrace = new MediaPlayer.vo.metrics.HTTPRequest.Trace();
		subobjTrace.b = {};
		subobjTrace.d = 1697;
		subobjTrace.s = new Date();
		subobjHttpList.trace = subobjTrace;
		subobjHttpList.trequest = new Date();
		subobjHttpList.tresponse = new Date();
		subobjHttpList.type = "Media Segment";
		subobjHttpList.url = "http://dashdemo.edgesuite.net/envivio/dashpr/clear/audio/0.m4s"

			objHttpList.push(subobjHttpList);

		metrics.HttpList = objHttpList;

		var objPlayList = [];
		var subobjPlayList = new MediaPlayer.vo.metrics.PlayList();
		subobjPlayList.mstart = 0;
		subobjPlayList.start = new Date();
		subobjPlayList.starttype = "initial_start";

		var subobjTrace = new MediaPlayer.vo.metrics.PlayList.Trace();
		subobjTrace.duration = null;
		subobjTrace.mstart = 0;
		subobjTrace.playbackspeed = 1;
		subobjTrace.representationid = "audio";
		subobjTrace.start = new Date();
		subobjTrace.stopreason = null;
		subobjTrace.subreplevel = null;
		subobjPlayList.trace = subobjTrace;

		objPlayList.push(subobjPlayList);
		metrics.PlayList = objPlayList;

		var objRepSwitchList = [];
		var subobjRepSwitchList = new MediaPlayer.vo.metrics.RepresentationSwitch();
		subobjRepSwitchList.lto = undefined;
		subobjRepSwitchList.mt = 0;
		subobjRepSwitchList.t = new Date();
		subobjRepSwitchList.to = "audio";
		objRepSwitchList.push(subobjRepSwitchList);

		metrics.RepSwitchList = objRepSwitchList;

		metrics.TcpList == [];

	});

	it("getBandwidthForRepresentation returns correct bandwidth", function () {
		expect(metricExtn.getBandwidthForRepresentation("video1")).toEqual("275000");
	});

	it("getIndexForRepresentation returns correct index", function () {
		expect(metricExtn.getIndexForRepresentation('video2')).toEqual(1);
	});

	it("getMaxIndexForBufferType returns correct index", function () {
		expect(metricExtn.getMaxIndexForBufferType('video')).toEqual(3);
	});

	it("getCurrentRepresentationSwitch function", function () {
		var vo = new MediaPlayer.vo.metrics.RepresentationSwitch();
		vo = metricExtn.getCurrentRepresentationSwitch(metrics);
		expect(vo.to).toBe("audio");
	});

	it("getCurrentBufferLevel returns correct bandwidth", function () {
		var vo = new MediaPlayer.vo.metrics.BufferLevel();
		vo = metricExtn.getCurrentBufferLevel(metrics);
		expect(vo.level).toEqual(0);
	});

	it("getCurrentHttpRequest function", function () {
		var vo = new MediaPlayer.vo.metrics.PlayList();
		vo = metricExtn.getCurrentHttpRequest(metrics);
		expect(vo.responsecode).toBe(200);
	});

	it("getCurrentDroppedFrames returns null", function () {
		expect(metricExtn.getCurrentDroppedFrames(metrics)).toBeNull();
	});

	/* Negative Testcases */
	it("getBandwidthForRepresentation returns correct bandwidth with input as null", function () {
		expect(metricExtn.getBandwidthForRepresentation(null)).toBeNull();
	});

	it("getIndexForRepresentation returns correct index with input as null", function () {
		expect(metricExtn.getIndexForRepresentation(null)).toBe(-1);
	});

	it("getMaxIndexForBufferType returns correct index with input as empty string", function () {
		expect(metricExtn.getMaxIndexForBufferType("")).toBe(-1);
	});

	it("getMaxIndexForBufferType returns correct index with input as video4 string", function () {
		expect(metricExtn.getMaxIndexForBufferType("video4")).toBe(-1);
	});

	it("getCurrentRepresentationSwitch function with input as null", function () {
		var vo = new MediaPlayer.vo.metrics.RepresentationSwitch();
		vo = metricExtn.getCurrentRepresentationSwitch(null);
		expect(vo).toBeNull();
	});

	it("getCurrentBufferLevel returns correct bandwidth with input as null", function () {
		var vo = new MediaPlayer.vo.metrics.BufferLevel();
		vo = metricExtn.getCurrentBufferLevel(null);
		expect(vo).toBeNull();
	});

	it("getCurrentHttpRequest function with input as null", function () {
		var vo = new MediaPlayer.vo.metrics.PlayList();
		vo = metricExtn.getCurrentHttpRequest(null);
		expect(vo).toBeNull();
	});

	it("getCurrentDroppedFrames returns null with input as null", function () {
		expect(metricExtn.getCurrentDroppedFrames(null)).toBeNull();
	});

});