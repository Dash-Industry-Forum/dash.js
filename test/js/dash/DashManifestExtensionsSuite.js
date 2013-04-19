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

 describe("Manifest Extension Test Suite", function () {
    var context, baseUrl, manExtn, adaptationSet, representation, matchers, durationRegex, datetimeRegex, numericRegex, manifest, period;
 	
 	beforeEach(function(){
 		baseUrl = "http://dashdemo.edgesuite.net/envivio/dashpr/clear/";

 	    // Set up DI.
 		system = new dijon.System();
 		system.mapValue("system", system);
 		system.mapOutlet("system");

 		context = new Dash.di.DashContext();
 		system.injectInto(context);

 		manExtn = system.getObject("manifestExt");

		durationRegex = /PT(([0-9]*)H)?(([0-9]*)M)?(([0-9.]*)S)?/;
        datetimeRegex = /^(\d{4}\-\d\d\-\d\d([tT][\d:\.]*)?)([zZ]|([+\-])(\d\d):(\d\d))?$/;
        numericRegex = /^[-+]?[0-9]+[.]?[0-9]*([eE][-+]?[0-9]+)?$/;
		matchers = [
            {
                type: "duration",
                test: function (str) {
                    return durationRegex.test(str);
                },
                converter: function (str) {
                    var match = durationRegex.exec(str);
                    return (parseFloat(match[2] || 0) * 3600 +
                            parseFloat(match[4] || 0) * 60 +
                            parseFloat(match[6] || 0));
                }
            },
            {
                type: "datetime",
                test: function (str) {
                    return datetimeRegex.test(str);
                },
                converter: function (str) {
                    return new Date(str);
                }
            },
            {
                type: "numeric",
                test: function (str) {
                    return numericRegex.test(str);
                },
                converter: function (str) {
                    return parseFloat(str);
                }
            }
        ]
		var	common = [
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
            			
			representation = {};
            representation.name = "Representation";
            representation.isRoot = false;
            representation.isArray = true;
            representation.parent = adaptationSet;
            representation.children = null;
            representation.properties = common;
			
			adaptationSet.properties[0].mimeType="video/mp4";
			adaptationSet.properties[0].segmentAlignment="true";
			adaptationSet.properties[0].startWithSAP="1";
			adaptationSet.properties[0].maxWidth="1280";
			adaptationSet.properties[0].maxHeight="720";
			adaptationSet.properties[0].maxFrameRate="25";
			adaptationSet.properties[0].par="video/mp4";
			adaptationSet.properties[0].maxFrameRate="video/mp4";
			adaptationSet.properties[0].mimeType="video/mp4";
			adaptationSet.properties[0].maxFrameRate="video/mp4";
			adaptationSet.properties[0].par="16:9";
			period.AdaptationSet_asArray.push(adaptationSet);
			
			
			representation.properties[0].id="video1";
			representation.properties[0].width="true";
			representation.properties[0].height="1";
			representation.properties[0].frameRate="1280";
			representation.properties[0].sar="720";
			representation.properties[0].scanType="25";
			representation.properties[0].bandwidth="video/mp4";
			representation.properties[0].codecs="video/mp4";
		
			representation.properties[1].id="video2";
			representation.properties[1].width="true";
			representation.properties[1].height="1";
			representation.properties[1].frameRate="1280";
			representation.properties[1].sar="720";
			representation.properties[1].scanType="25";
			representation.properties[1].bandwidth="video/mp4";
			representation.properties[1].codecs="video/mp4";
			
			representation.properties[2].id="video3";
			representation.properties[2].width="true";
			representation.properties[2].height="1";
			representation.properties[2].frameRate="1280";
			representation.properties[2].sar="720";
			representation.properties[2].scanType="25";
			representation.properties[2].bandwidth="video/mp4";
			representation.properties[2].codecs="video/mp4";
			adaptationSet.Representation_asArray.push(representation);
 
 	});
    
	it("getIsAudio", function(){  
		
		expect(manExtn.getIsAudio(adaptationSet)).not.toBeNull();
		
 	});
	
	it("getIsVideo", function(){ 
	
		expect(manExtn.getIsVideo(adaptationSet)).not.toBeNull();
 	});
	
	
	it("getIsMain", function(){ 
		            
		expect(manExtn.getIsMain(adaptationSet)).not.toBeNull();
 	});

	it("getRepresentationCount", function(){ 
	
		expect(manExtn.getRepresentationCount(adaptationSet)).not.toBeNull();
 	});

	it("getVideoData", function(){ 
            
		expect(manExtn.getVideoData(manifest)).not.toBeNull();
 	});
	/*
	it("getAudioDatas_NotNull", function(){ 
			var manifest,
                converter = new X2JS(matchers, '', true),
                iron = new ObjectIron(getDashMap());
            manifest = converter.xml_str2json(data);
		expect(manExtn.getAudioDatas(manifest)).not.toBeNull();
 	});
	
	it("getAudioDatas_Null", function(){ 
			var manifest=null;
		expect(manExtn.getAudioDatas(manifest)).toBeNull();
 	});
	*/
	it("getPrimaryAudioData", function(){ 
			
		expect(manExtn.getPrimaryAudioData(manifest)).not.toBeNull();
 	});
	/*
	it("getPrimaryAudioData_Null", function(){ 
			var manifest = null;
		expect(manExtn.getPrimaryAudioData(manifest)).toBeNull();
 	});*/
	
	it("getCodec", function(){ 

		expect(manExtn.getCodec(adaptationSet)).not.toBeNull();
 	});/*
	
	it("getIsLive_NotNull", function(){ 
			var manifest,
                converter = new X2JS(matchers, '', true),
                iron = new ObjectIron(getDashMap());
            manifest = converter.xml_str2json(data);
		expect(manExtn.getIsLive(manifest)).not.toBeNull();
 	});
	*/
	it("getIsDVR_Null", function(){ 
	
		expect(manExtn.getIsDVR(manifest)).not.toBeNull();
 	});
	/*
	it("getIsLive_NotNull", function(){ 
			var manifest,
                converter = new X2JS(matchers, '', true),
                iron = new ObjectIron(getDashMap());
            manifest = converter.xml_str2json(data);
		expect(manExtn.getIsDVR(manifest)).not.toBeNull();
 	});
	*/
	it("getIsOnDemand", function(){ 
			
		expect(manExtn.getIsOnDemand(manifest)).not.toBeNull();
 	});
	/*
	it("getIsOnDemand_Null", function(){ 
			var manifest=null;
		expect(manExtn.getIsOnDemand(manifest)).toBeNull();
 	});
	*/
	it("getDuration", function(){ 
			
		expect(manExtn.getDuration(manifest)).not.toBeNull();
 	});
	
	// it("getDuration", function(){ 
			
		// expect(manExtn.getDuration(manifest)).not.toBeNull();
 	// });
	
	});
	