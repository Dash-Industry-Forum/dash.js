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
 
 describe("Parser Test Suite", function(){
    var baseUrl, parser, system, stub;   

    beforeEach(function(){
        baseUrl = "http://dashdemo.edgesuite.net/envivio/dashpr/clear/";
        
        // Set up DI.
        system = new dijon.System();
        system.mapValue("system", system);
        system.mapOutlet("system");

        context = new Dash.di.DashContext();
        system.injectInto(context);

        parser = system.getObject("parser");
        
                stub = '<MPD xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="urn:mpeg:DASH:schema:MPD:2011" xsi:schemaLocation="urn:mpeg:DASH:schema:MPD:2011  DASH-MPD.xsd" type="static" mediaPresentationDuration="PT260.266S" availabilityStartTime="2012-09-05T09:00:00Z" maxSegmentDuration="PT4.080S" minBufferTime="PT5.001S" profiles="urn:mpeg:dash:profile:isoff-live:2011">' + 
                        '<Period>' +
                            '<AdaptationSet mimeType="video/mp4" segmentAlignment="true" startWithSAP="1" maxWidth="1280" maxHeight="720" maxFrameRate="25" par="16:9">' +
                                '<SegmentTemplate presentationTimeOffset="0" timescale="90000" initialization="$RepresentationID$/Header.m4s" media="$RepresentationID$/$Number$.m4s" duration="360000" startNumber="0"/>' +
                                '<Representation id="video1" width="1280" height="720" frameRate="25" sar="1:1" scanType="progressive" bandwidth="3000000" codecs="avc1.4D4020"/>' +
                                '<Representation id="video2" width="1024" height="576" frameRate="25" sar="1:1" scanType="progressive" bandwidth="2000000" codecs="avc1.4D401F"/>' +
                                '<Representation id="video3" width="704" height="396" frameRate="25" sar="1:1" scanType="progressive" bandwidth="1000000" codecs="avc1.4D401E"/>' +
                                '<Representation id="video4" width="480" height="270" frameRate="25" sar="1:1" scanType="progressive" bandwidth="600000" codecs="avc1.4D4015"/>' +
                                '<Representation id="video5" width="320" height="180" frameRate="25" sar="1:1" scanType="progressive" bandwidth="349952" codecs="avc1.4D400D"/>' +
                            '</AdaptationSet>' +
                            '<AdaptationSet mimeType="audio/mp4" lang="en" segmentAlignment="true" startWithSAP="1">' +
                                '<SegmentTemplate presentationTimeOffset="0" timescale="48000" initialization="$RepresentationID$/Header.m4s" media="$RepresentationID$/$Number$.m4s" duration="192000" startNumber="0"/>' +
                                '<Representation id="audio" audioSamplingRate="48000" bandwidth="56000" codecs="mp4a.40.2">' +
                                    '<AudioChannelConfiguration schemeIdUri="urn:mpeg:dash:23003:3:audio_channel_configuration:2011" value="2"/>' +
                                '</Representation>' +
                            '</AdaptationSet>' +
                        '</Period>' +
                    '</MPD>';     
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
                },
                {
                    name: 'SegmentBase',
                    merge: true
                },
                {
                    name: 'SegmentTemplate',
                    merge: true
                },
                {
                    name: 'SegmentList',
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
        manifest.mediaPresentationDuration=260.266;
        manifest.availabilityStartTime="2012-09-05T09:00:00Z";
        manifest.maxSegmentDuration="4.080";
        manifest.minBufferTime="5.001";
        manifest.profiles="urn:mpeg:dash:profile:isoff-live:2011";

        
        period = {};
        period.name = "period";
        period.isRoot = false;
        period.isArray = true;
        period.parent = manifest;
        period.AdaptationSet_asArray = [];//children
        period.properties = common;
        manifest.Period_asArray.push(period);
        {        
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
            // adaptationSet.SegmentTemplate.presentationTimeOffset="0";
            // adaptationSet.SegmentTemplate.timescale="90000";
            // adaptationSet.SegmentTemplate.initialization="$RepresentationID$/Header.m4s";
            // adaptationSet.SegmentTemplate.media="$RepresentationID$/$Number$.m4s";
            // adaptationSet.SegmentTemplate.duration="360000";
            // adaptationSet.SegmentTemplate.startNumber="0";
            period.AdaptationSet_asArray.push(adaptationSet);
        }

        
        {
            representation = {};
            representation.name = "Representation";
            representation.isRoot = false;
            representation.isArray = true;
            representation.parent = adaptationSet;
            representation.children = null;
            representation.properties = common;

            representation.id="video1";
            representation.width="1280";
            representation.height="720";
            representation.frameRate="25";
            representation.sar="1:1";
            representation.scanType="progressive";            
            representation.codecs="avc1.4D4020";
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
            representation.width="1024";
            representation.height="576";
            representation.frameRate="25";
            representation.sar="1:1";
            representation.scanType="progressive";
            representation.bandwidth="2000000";
            representation.codecs="avc1.4D401F";
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
            representation.width="704";
            representation.height="396";
            representation.frameRate="25";
            representation.sar="1:1";
            representation.scanType="pogressive";
            representation.bandwidth="1000000";
            representation.codecs="avc1.4D401E";
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

            representation.id="video4";
            representation.width="480";
            representation.height="270";
            representation.frameRate="25";
            representation.sar="1:1";
            representation.scanType="pogressive";
            representation.bandwidth="1000000";
            representation.codecs="avc1.4D4015";
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

            representation.id="video5";
            representation.width="320";
            representation.height="180";
            representation.frameRate="25";
            representation.sar="1:1";
            representation.scanType="pogressive";
            representation.bandwidth="1000000";
            representation.codecs="avc1.4D400D";
            adaptationSet.Representation_asArray.push(representation);
        }
    {        
            adaptationSet = {};
            adaptationSet.name = "AdaptationSet";
            adaptationSet.isRoot = false;
            adaptationSet.isArray = true;
            adaptationSet.parent = period;
            adaptationSet.Representation_asArray = [];//children
            adaptationSet.properties = common;
                        
            adaptationSet.mimeType="audio/mp4";
            adaptationSet.segmentAlignment="true";
            period.AdaptationSet_asArray.push(adaptationSet);
        }
    {
            representation = {};
            representation.name = "Representation";
            representation.isRoot = false;
            representation.isArray = true;
            representation.parent = adaptationSet;
            representation.children = null;
            representation.properties = common;

            representation.id="audio";
            representation.audioSamplingRate="48000";
            representation.bandwidth="bandwidth";
            representation.codecs="mp4a.40.2";
            adaptationSet.Representation_asArray.push(representation);
       }
         
    });
    
    it("has method parse", function(){      
        
        var result = (typeof parser.parse);		
        expect(result).toEqual('function');
    });
    
   it("parse returns valid mimeType", function () {
        var data = '';
        parser.parse(stub, baseUrl).then(function (Data) {
        
            data = Data.Period.AdaptationSet[0].mimeType;
        }, function (Error) {
            data = Error;
        });
        waitsFor(function () {
            if (data != '') return true;
        }, "parsed data is null", 50);
        runs(function () {
            expect(data).toEqual("video/mp4");
        });
        
    });
    
    it("parse returns valid RepresentationID", function () {
        var data = '';
        parser.parse(stub,baseUrl).then(function (Data) {
        
            data = Data.Period.AdaptationSet[0].Representation[0].id;
            
        }, function (Error) {
            data = Error;
        });
        waitsFor(function () {
            if (data != '') return true;
        }, "parsed data is null", 50);
        runs(function () {
            expect(data).toEqual("video1");
        });
        
    });
    
    it("parse returns valid manifestPresentationDuration", function () {
        var data = '';
        parser.parse(stub,baseUrl).then(function (Data) {
        
            data = Data.mediaPresentationDuration;
            
        }, function (Error) {
            data = Error;
        });
        waitsFor(function () {
            if (data != '') return true;
        }, "parsed data is null", 50);
        runs(function () {
            expect(data).toEqual(manifest.mediaPresentationDuration);
        });
        
    });
    
    it("parse returns valid width", function () {
        var data = '';
        parser.parse(stub,baseUrl).then(function (Data) {
        
            data = Data.Period.AdaptationSet[0].Representation[1].width;
            
        }, function (Error) {
            data = Error;
        });
        waitsFor(function () {
            if (data != '') return true;
        }, "parsed data is null", 50);
        runs(function () {
            expect(data).toEqual(1024);
        });
        
    });
    
    it("parse returns valid codecs", function () {
        var data = '';
        parser.parse(stub,baseUrl).then(function (Data) {
        
            data = Data.Period.AdaptationSet[0].Representation[0].codecs;
            
        }, function (Error) {
            data = Error;
        });
        waitsFor(function () {
            if (data != '') return true;
        }, "parsed data is null", 50);
        runs(function () {
            expect(data).toEqual("avc1.4D4020");
        });
        
    });

 });