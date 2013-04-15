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

 describe("Handler Test Suite", function () {
 	var baseUrl, handler,debug,baseURLExt;
 	
 	beforeEach(function(){
 		baseUrl = "http://dashdemo.edgesuite.net/envivio/dashpr/clear/";
 		handler = new Dash.dependencies.DashHandler();
		parser = new Dash.dependencies.DashParser();
		debug = new MediaPlayer.utils.Debug;
		system = new dijon.System();
		system.mapValue("debug", debug);
		system.mapOutlet("debug");
		system.injectInto(handler);
		
		
		baseURLExt = new Dash.dependencies.BaseURLExtensions();
		//system = new dijon.System();
		system.mapValue("baseURLExt", baseURLExt);
		system.mapOutlet("baseURLExt");
		system.injectInto(baseURLExt);
		system.injectInto(handler);
 	});
 
 
 it("getSegmentRequestForTime", function(){ 
		var data = '<MPD xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="urn:mpeg:DASH:schema:MPD:2011" xsi:schemaLocation="urn:mpeg:DASH:schema:MPD:2011 DASH-MPD.xsd" type="static" mediaPresentationDuration="PT260.266S" availabilityStartTime="2012-09-05T09:00:00Z" maxSegmentDuration="PT4.080S" minBufferTime="PT5.001S" profiles="urn:mpeg:dash:profile:isoff-live:2011">' + 
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
					
		    var data = {};
            data.name = "AdaptationSet";
            data.isRoot = true;
            data.isArray = true;
            data.parent = null;
            data.Representation_asArray = [];//children
            data.properties = common;
            
			
			representation = {};
            representation.name = "Representation";
            representation.isRoot = false;
            representation.isArray = true;
            representation.parent = data;
            representation.children = null;
            representation.properties = common;
			
			data.properties[0].mimeType="video/mp4";
			data.properties[0].segmentAlignment="true";
			data.properties[0].startWithSAP="1";
			data.properties[0].maxWidth="1280";
			data.properties[0].maxHeight="720";
			data.properties[0].maxFrameRate="25";
			data.properties[0].par="video/mp4";
			data.properties[0].maxFrameRate="video/mp4";
			data.properties[0].mimeType="video/mp4";
			data.properties[0].maxFrameRate="video/mp4";
			data.properties[0].par="16:9";
			
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
			
			data.Representation_asArray.push(representation);
		quality=0;
		expect(handler.getSegmentRequestForTime(null,quality,data)).not.toBeNull();
		//expect(handler.getSegmentRequestForTime(null,null,data)).toBeNull();
	});
	
it("getInitRequest", function(){ 
		var data = '<MPD xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="urn:mpeg:DASH:schema:MPD:2011" xsi:schemaLocation="urn:mpeg:DASH:schema:MPD:2011 DASH-MPD.xsd" type="static" mediaPresentationDuration="PT260.266S" availabilityStartTime="2012-09-05T09:00:00Z" maxSegmentDuration="PT4.080S" minBufferTime="PT5.001S" profiles="urn:mpeg:dash:profile:isoff-live:2011">' + 
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
					
		    var data = {};
            data.name = "AdaptationSet";
            data.isRoot = true;
            data.isArray = true;
            data.parent = null;
            data.Representation_asArray = [];//children
            data.properties = common;
            
			
			representation = {};
            representation.name = "Representation";
            representation.isRoot = false;
            representation.isArray = true;
            representation.parent = data;
            representation.children = null;
            representation.properties = common;
			
			data.properties[0].mimeType="video/mp4";
			data.properties[0].segmentAlignment="true";
			data.properties[0].startWithSAP="1";
			data.properties[0].maxWidth="1280";
			data.properties[0].maxHeight="720";
			data.properties[0].maxFrameRate="25";
			data.properties[0].par="video/mp4";
			data.properties[0].maxFrameRate="video/mp4";
			data.properties[0].mimeType="video/mp4";
			data.properties[0].maxFrameRate="video/mp4";
			data.properties[0].par="16:9";
			
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
			
			data.Representation_asArray.push(representation);
		quality=0; 
					
		
		expect(handler.getInitRequest(quality,data)).not.toBeNull();
 	});
/*			
it("getNextSegmentRequest", function(){ 
		var data = '<MPD xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="urn:mpeg:DASH:schema:MPD:2011" xsi:schemaLocation="urn:mpeg:DASH:schema:MPD:2011 DASH-MPD.xsd" type="static" mediaPresentationDuration="PT260.266S" availabilityStartTime="2012-09-05T09:00:00Z" maxSegmentDuration="PT4.080S" minBufferTime="PT5.001S" profiles="urn:mpeg:dash:profile:isoff-live:2011">' + 
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
					
		    var data = {};
            data.name = "AdaptationSet";
            data.isRoot = true;
            data.isArray = true;
            data.parent = null;
            data.Representation_asArray = [];//children
            data.properties = common;
            
			
			representation = {};
            representation.name = "Representation";
            representation.isRoot = false;
            representation.isArray = true;
            representation.parent = data;
            representation.children = null;
            representation.properties = common;
			
			data.properties[0].mimeType="video/mp4";
			data.properties[0].segmentAlignment="true";
			data.properties[0].startWithSAP="1";
			data.properties[0].maxWidth="1280";
			data.properties[0].maxHeight="720";
			data.properties[0].maxFrameRate="25";
			data.properties[0].par="video/mp4";
			data.properties[0].maxFrameRate="video/mp4";
			data.properties[0].mimeType="video/mp4";
			data.properties[0].maxFrameRate="video/mp4";
			data.properties[0].par="16:9";
			
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
			
			data.Representation_asArray.push(representation);
		quality=0; 
		handler.getSegmentRequestForTime(null,quality,data);
		//expect(handler.getNextSegmentRequest(quality,data)).not.toBeNull();
		//expect(handler.getNextSegmentRequest(null,data)).toBeNull();
	});*/

 });
 