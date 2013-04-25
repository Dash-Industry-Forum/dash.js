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

 describe("DashMetricsExtensions Test Suite", function(){
    var baseUrl, system, context, metricExtn;
    
    beforeEach(function(){
        baseUrl = "http://dashdemo.edgesuite.net/envivio/dashpr/clear/";
        
        // Set up DI.
        system = new dijon.System();
        system.mapValue("system", system);
        system.mapOutlet("system");

        context = new Dash.di.DashContext();
        system.injectInto(context);

        metricExtn = system.getObject("metricsExt");
       
        var common = [
                {
                    name: 'profiles',
                    merge: false
                },
                {
                    name: 'width',
                    merge: false
                },
                {
                    name: 'height',
                    merge: false
                },
                {
                    name: 'sar',
                    merge: false
                },
                {
                    name: 'frameRate',
                    merge: false
                },
                {
                    name: 'audioSamplingRate',
                    merge: false
                },
                {
                    name: 'mimeType',
                    merge: false
                },
                {
                    name: 'segmentProfiles',
                    merge: false
                },
                {
                    name: 'codecs',
                    merge: false
                },
                {
                    name: 'maximumSAPPeriod',
                    merge: false
                },
                {
                    name: 'startsWithSap',
                    merge: false
                },
                {
                    name: 'maxPlayoutRate',
                    merge: false
                },
                {
                    name: 'codingDependency',
                    merge: false
                },
                {
                    name: 'scanType',
                    merge: false
                },
                {
                    name: 'FramePacking',
                    merge: true
                },
                {
                    name: 'AudioChannelConfiguration',
                    merge: true
                },
                {
                    name: 'ContentProtection',
                    merge: true
                }
            ];

        manifest = {};
        manifest.name = "manifest";
        manifest.isRoot = true;
        manifest.isArray = true;
        manifest.parent = null;
        manifest.Period_asArray = [];//children
        manifest.properties = common;
        
        period = {};
        period.name = "period";
        period.isRoot = false;
        period.isArray = true;
        period.parent = manifest;
        period.AdaptationSet_asArray = [];//children
        period.properties = common;
        manifest.Period_asArray.push(period);
        
        adaptationSet = {};
        adaptationSet.name = "AdaptationSet";
        adaptationSet.isRoot = false;
        adaptationSet.isArray = true;
        adaptationSet.parent = period;
        adaptationSet.Representation_asArray = [];//children
        adaptationSet.properties = common;
                    
        adaptationSet.mimeType="video/mp4";
        adaptationSet.segmentAlignment="true";
        adaptationSet.startWithSAP="1";
        adaptationSet.maxWidth="1280";
        adaptationSet.maxHeight="720";
        adaptationSet.maxFrameRate="25";
        adaptationSet.par="16:9";
        period.AdaptationSet_asArray.push(adaptationSet);
        
        {
            representation = {};
            representation.name = "Representation";
            representation.isRoot = false;
            representation.isArray = true;
            representation.parent = adaptationSet;
            representation.children = null;
            representation.properties = common;

            representation.id="video1";
            representation.width="true";
            representation.height="1";
            representation.frameRate="1280";
            representation.sar="720";
            representation.scanType="25";
            representation.bandwidth="275000";
            representation.codecs="video/mp4";
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

            representation.id="video2";
            representation.width="true";
            representation.height="1";
            representation.frameRate="1280";
            representation.sar="720";
            representation.scanType="25";
            representation.bandwidth="475000";
            representation.codecs="video/mp4";
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

            representation.id="video3";
            representation.width="true";
            representation.height="1";
            representation.frameRate="1280";
            representation.sar="720";
            representation.scanType="25";
            representation.bandwidth="875000";
            representation.codecs="video/mp4";
            adaptationSet.Representation_asArray.push(representation);
        }

        // this updates the model 
        metricExtn.manifestModel.setValue(manifest);
        
    });
    
    it("getBandwidthForRepresentation returns correct bandwidth", function(){
    
        expect(metricExtn.getBandwidthForRepresentation("video1")).toEqual("275000");
    });
          
    it("getIndexForRepresentation returns correct index", function(){
            
        expect(metricExtn.getIndexForRepresentation('video2')).toEqual(1);
    });
    
    it("getMaxIndexForBufferType returns correct index", function(){
            
        expect(metricExtn.getMaxIndexForBufferType('video')).toEqual(3);
    });
    
    it("getCurrentRepresentationSwitch returns null", function(){
            
        expect(metricExtn.getCurrentRepresentationSwitch(null)).toBeNull();
    });

    it("getCurrentHttpRequest returns null", function(){
        var metrics = {};
        metrics.BufferLevel = "";
        metrics.PlayList = [];
        metrics.RepSwitchList = [];
        metrics.DroppedFrames = [];
        metrics.HttpList = [];
        metrics.TcpList = [];
        
        expect(metricExtn.getCurrentHttpRequest(metrics)).toBeNull();
    });
       
    it("getCurrentDroppedFrames returns correct currentDroppedFrames", function(){
        
        var metrics = {};
        metrics.DroppedFrames = [];
        metrics.DroppedFrames[0] = 1;
        
        expect(metricExtn.getCurrentDroppedFrames(metrics)).toEqual(1);
    });	
    
    it("getCurrentDroppedFrames returns null", function(){
        
        var metrics = null;		
        expect(metricExtn.getCurrentDroppedFrames(metrics)).toBeNull();
    });	
    
 });