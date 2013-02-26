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
 
 describe("Parser Test Suite", function(){
 	var baseUrl, parser;
 	
 	beforeEach(function(){
 		baseUrl = "http://dashdemo.edgesuite.net/envivio/dashpr/clear/";
 		parser = new Dash.dependencies.DashParser();
 	});
 	
 	it("has method parse", function(){
 		var result = (typeof parser.parse);
 		expect(result).toEqual('function');
 	});
 	
 	it("parse returns value", function() {
		var stub = '<MPD xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="urn:mpeg:DASH:schema:MPD:2011" xsi:schemaLocation="urn:mpeg:DASH:schema:MPD:2011 DASH-MPD.xsd" type="static" mediaPresentationDuration="PT260.266S" availabilityStartTime="2012-09-05T09:00:00Z" maxSegmentDuration="PT4.080S" minBufferTime="PT5.001S" profiles="urn:mpeg:dash:profile:isoff-live:2011">' + 
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
					'</MPD>',
			result = parser.parse(stub, baseUrl);
			
		expect(result).not.toBeNull();
	});
 });