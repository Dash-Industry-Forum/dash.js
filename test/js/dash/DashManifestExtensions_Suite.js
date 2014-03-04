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

/**
* Test suite for DashManifestExtensions.js
*/

for (var MPDstring in strMpd) {
	(function (MPDstring) {
		describe("Manifest Extension Test Suite for " + MPDstring, function () {
			var context,
			baseUrl,
			manExtn,
			adaptationSetAudio,
			adaptationSetVideo,
			representation,
			matchers,
			durationRegex,
			datetimeRegex,
			numericRegex,
			manifest,
			period,
			stub,
			manifestObj,
			periodIndex = 0,
			docMpdProto;

			beforeEach(function () {
                 baseUrl = "http://dashdemo.edgesuite.net/envivio/dashpr/clear/";
				// Set up DI.
				system = new dijon.System();
				system.mapValue("system", system);
				system.mapOutlet("system");

				context = new Dash.di.DashContext();
				system.injectInto(context);

				stub = strMpd[MPDstring];

				manExtn = system.getObject("manifestExt");
				parser = system.getObject("parser");

				parser.parse(stub, baseUrl).then(function (data) {
					manifestObj = data;
					if (MPDstring == "MPD2") {
						docMpdProto = 1;
						adaptationSetAudio = manifestObj.Period.AdaptationSet[1];
						adaptationSetVideo = manifestObj.Period.AdaptationSet[0];
					} else if (MPDstring == "MPD1") {
						docMpdProto = 2;
						adaptationSetAudio = manifestObj.Period.AdaptationSet[1];
						adaptationSetVideo = manifestObj.Period.AdaptationSet[0];
					} else if (MPDstring == "MPD3") {
						docMpdProto = 3;
						adaptationSetAudio = manifestObj.Period.AdaptationSet[1];
						adaptationSetVideo = manifestObj.Period.AdaptationSet[0];
					} else if (MPDstring == "MPD4") {
						docMpdProto = 4;
						adaptationSetAudio = manifestObj.Period.AdaptationSet[0];
						adaptationSetVideo = manifestObj.Period.AdaptationSet[1];
					}
				}, function (err) {
					manifestObj = err;
				});
				waitsFor(function () {
					if (manifestObj)
						return true;
				}, "data is null", 100);
				runs(function () {
					return manifestObj;
				});

				durationRegex = /PT(([0-9]*)H)?(([0-9]*)M)?(([0-9.]*)S)?/;
				datetimeRegex = /^(\d{4}\-\d\d\-\d\d([tT][\d:\.]*)?)([zZ]|([+\-])(\d\d):(\d\d))?$/;
				numericRegex = /^[-+]?[0-9]+[.]?[0-9]*([eE][-+]?[0-9]+)?$/;
				matchers = [{
						type : "duration",
						test : function (str) {
							return durationRegex.test(str);
						},
						converter : function (str) {
							var match = durationRegex.exec(str);
							return (parseFloat(match[2] || 0) * 3600 +
								parseFloat(match[4] || 0) * 60 +
								parseFloat(match[6] || 0));
						}
					}, {
						type : "datetime",
						test : function (str) {
							return datetimeRegex.test(str);
						},
						converter : function (str) {
							return new Date(str);
						}
					}, {
						type : "numeric",
						test : function (str) {
							return numericRegex.test(str);
						},
						converter : function (str) {
							return parseFloat(str);
						}
					}
				]
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
			});

			/**
			 * Check if the mpd file has contentType or mimeType of audio
			 */
			it("getIsAudio", function () {
				var resBool = '';
				if (adaptationSetAudio) {
					manExtn.getIsAudio(adaptationSetAudio).then(function (Data) {
						resBool = Data;
					}, function (Error) {
						resBool = Error;
					});
					waitsFor(function () {
						if (resBool.toString() != '')
							return true;
					}, "data is null", 100);
					runs(function () {
						expect(resBool).toBeTruthy();
					});
				} else
					expect(true).toBeTruthy();
			});

			/**
			 * Check if the mpd file has contentType or mimeType of video
			 */
			it("getIsVideo", function () {
				var resBool = '';
				if (adaptationSetVideo) {
					manExtn.getIsVideo(adaptationSetVideo).then(function (Data) {
						resBool = Data;
					}, function (Error) {
						resBool = Error;
					});
					waitsFor(function () {
						if (resBool.toString() != '')
							return true;
					}, "data is null", 100);
					runs(function () {
						expect(resBool).toBeTruthy();
					});
				} else
					expect(true).toBeTruthy();
			});

			/**
			 * The method is always check against boolean false
			 */
			it("getIsMain", function () {
				var resBool = '';
				manExtn.getIsMain(manifestObj).then(function (Data) {
					resBool = Data;
				}, function (Error) {
					resBool = Error;
				});
				waitsFor(function () {
					if (resBool.toString() != '')
						return true;
				}, "data is null", 100);
				runs(function () {
					switch (docMpdProto) {
					case 1:
						expect(resBool).not.toBeTruthy();
						break;
					case 2:
						expect(resBool).not.toBeTruthy();
						break;
					case 3:
						expect(resBool).not.toBeTruthy();
						break;
					case 4:
						expect(resBool).not.toBeTruthy();
						break;
					default:
						expect(resBool).not.toBeNull();
					}
				});
			});

			/**
			 * The method returns the Representation Array of Adaptation set. The array is sorted ascendingly on bandwidth parameter
			 */
			it("processAdaptation", function () {
				var resBool = true,
				tempObj;
				var ResObj = manExtn.processAdaptation(manifestObj.Period.AdaptationSet[0]);
				for (var i = 0; i < ResObj.Representation_asArray.length; i++) {
					if (tempObj) {
						resBool = (tempObj.bandwidth < ResObj.Representation_asArray[i].bandwidth);
						if (resBool)
							tempObj = ResObj.Representation_asArray[i];
						else
							break;
					} else {
						tempObj = ResObj.Representation_asArray[i];
					}
				}
				expect(resBool).toBeTruthy();
			});

			/**
			 * The method returns the data for the given Adaptation set
			 */
			it("getDataForId", function () {
				var res = '';
				var id = '';
				switch (docMpdProto) {
				case 1:
					id = 'h264bl_low';
					break;
				case 2:
					id = 'v0';
					break;
				case 3:
					id = 'aaclc_low';
					break;
				case 4:
					id = 'audio=148000';
					break;
				}
				manExtn.getDataForId(id, manifestObj,periodIndex).then(function (Data) {
					res = Data ? Data.id : null;
				}, function (Error) {
					res = Error;
				});
				waitsFor(function () {
					if (res != '')
						return true;
				}, "data is null", 1000);
				runs(function () {
					switch (docMpdProto) {
					case 1:
						expect(res).toBeNull();
						break;
					case 2:
						expect(res).toBeNull();
						break;
					case 3:
						expect(res).toBeNull();
						break;
					case 4:
						expect(res).toBeNull();
						break;
					default:
						expect(res).not.toBeNull();
					}

				});
			});

            it("getDataForId with id=0", function () {
				var res = '';
				var id = 0;
				
				manExtn.getDataForId(id, manifestObj,periodIndex).then(function (Data) {
					res = Data ? Data.id : null;
				}, function (Error) {
					res = Error;
				});
				waitsFor(function () {
					if (res != '')
						return true;
				}, "data is null", 1000);
				runs(function () {
					switch (docMpdProto) {
					case 1:
						expect(res).toBeNull();
						break;
					case 2:
						expect(res).toBeNull();
						break;
					case 3:
						expect(res).toBeNull();
						break;
					case 4:
						expect(res).toBeNull();
						break;
					default:
						expect(res).not.toBeNull();
					}

				});
			});
			/**
			 * The method returns the data for the given index of Adaptation set
			 */
			it("getDataIndex with data null", function () {
				var data ="",
				res = '';
				manExtn.getDataIndex(data, manifestObj,periodIndex).then(function (Data) {
					res = Data;
				}, function (Error) {
					res = Error;
				});
				waitsFor(function () {
					if (res != '')
						return true;
				}, "data is null", 3000);
				runs(function () {
					expect(res).not.toBeNull();
				});
			});
            
            it("getDataForIndex", function () {
				var index = 0,
				res = '';
				manExtn.getDataForIndex(index, manifestObj,periodIndex).then(function (Data) {
					res = Data;
				}, function (Error) {
					res = Error;
				});
				waitsFor(function () {
					if (res != '')
						return true;
				}, "data is null", 1000);
				runs(function () {
					switch (docMpdProto) {
					case 1:
						expect(res.ContentComponent.contentType).toEqual("video");
						break;
					case 2:
						expect(res.mimeType).toEqual("video/mp4");
						break;
					case 3:
						expect(res.ContentComponent.contentType).toEqual("video");
						break;
					case 3:
						expect(res.mimeType).toEqual("audio/mp4");
						break;
					default:
						expect(res).not.toBeNull();
					}

				});
			});

			/**
			 * The method returns the index of the given of Adaptation set item
			 */
			it("getDataIndex", function () {
				var data = manifestObj.Period.AdaptationSet[1],
				res = '';
				manExtn.getDataIndex(data, manifestObj,periodIndex).then(function (Data) {
					res = Data;
				}, function (Error) {
					res = Error;
				});
				waitsFor(function () {
					if (res != '')
						return true;
				}, "data is null", 3000);
				runs(function () {
					expect(res).toEqual(1);
				});
			});

			/**
			 * The method returns the count of Representation items present in Adaptation set for audio
			 */
			it("GetRepresentationCount for Audio", function () {
				var res = '';
				manExtn.getRepresentationCount(adaptationSetAudio).then(function (Data) {
					res = Data;
				}, function (Error) {
					res = Error;
				});
				waitsFor(function () {
					if (res != '')
						return true;
				}, "data is null", 100);
				runs(function () {
					switch (docMpdProto) {
					case 1:
						expect(res).toEqual(2);
						break;
					case 2:
						expect(res).toEqual(1);
						break;
					case 3:
						expect(res).toEqual(2);
						break;
					case 4:
						expect(res).toEqual(1);
						break;
					default:
						expect(res).not.toBeNull();
					}

				});
			});

			/**
			 * The method returns the count of Representation items present in Adaptation set for video
			 */
			it("GetRepresentationCount for Video", function () {
				var res = '';
				manExtn.getRepresentationCount(adaptationSetVideo).then(function (Data) {
					res = Data;
				}, function (Error) {
					res = Error;
				});
				waitsFor(function () {
					if (res != '')
						return true;
				}, "data is null", 100);
				runs(function () {
					switch (docMpdProto) {
					case 1:
						expect(res).toEqual(4);
						break;
					case 2:
						expect(res).toEqual(2);
						break;
					case 3:
						expect(res).toEqual(4);
						break;
					case 4:
						expect(res).toEqual(4);
						break;
					default:
						expect(res).not.toBeNull();
					}
				});
			});

			/**
			 * The method returns video data from the mpd file
			 */
			it("getVideoData", function () {
				var data = '';
				manExtn.getVideoData(manifestObj,periodIndex).then(function (Data) {
					switch (docMpdProto) {
					case 1:
						data = Data.ContentComponent.contentType;
						break;
					case 2:
						data = Data.mimeType;
						break;
					case 3:
						data = Data.ContentComponent.contentType;
						break;
					case 4:
						data = Data.mimeType;
						break;
					}

				}, function (Error) {
					data = Error;
				});
				waitsFor(function () {
					if (data.toString() != '')
						return true;
				}, "data is null", 100);
				runs(function () {
					expect(data).toMatch("video");
				});

			});

			/**
			 * The method returns audio data from the mpd file
			 */
			it("getAudioData", function () {
				var data = '';
				manExtn.getAudioDatas(manifestObj,periodIndex).then(function (Data) {
					switch (docMpdProto) {
					case 1:
						data = Data[0].ContentComponent.contentType;
						break;
					case 2:
						data = Data[0].mimeType;
						break;
					case 3:
						data = Data[0].ContentComponent.contentType;
						break;
					case 4:
						data = Data[0].mimeType;
						break;
					}
				}, function (Error) {
					data = Error;
				});
				waitsFor(function () {
					if (data.toString() != '')
						return true;
				}, "data is null", 100);
				runs(function () {
					expect(data).toMatch("audio");
				});

			});		
			

			/**
			 * The method returns audio data from the mpd file
			 */
			it("getPrimaryAudioData", function () {
				var data = '';
				manExtn.getPrimaryAudioData(manifestObj,periodIndex).then(function (Data) {
					switch (docMpdProto) {
					case 1:
						data = Data.ContentComponent.contentType;
						break;
					case 2:
						data = Data.mimeType;
						break;
					case 3:
						data = Data.ContentComponent.contentType;
						break;
					case 4:
						data = Data.mimeType;
						break;
					}
				}, function (Error) {
					data = Error;
				});
				waitsFor(function () {
					if (data.toString() != '')
						return true;
				}, "data is null", 100);
				runs(function () {
					expect(data).toMatch("audio");
				});

			});

			/**
			 * The method returns video codec info from the mpd file
			 */
			it("getCodec - Video", function () {
				var data = '';
				manExtn.getCodec(adaptationSetVideo).then(function (Data) {
					data = Data;
				}, function (Error) {
					data = null;
				});
				waitsFor(function () {
					if (data != '')
						return true;
				}, "data is null", 100);
				runs(function () {
					switch (docMpdProto) {
					case 1:
						expect(data).toEqual("video/mp4;codecs=\"avc1.42c00d\"");
						break;
					case 2:
						expect(data).toEqual('video/mp4;codecs="avc1.4d401e"');
						break;
					case 3:
						expect(data).toEqual("video/mp4;codecs=\"avc1.42c00d\"");
						break;
					case 4:
						expect(data).toEqual('video/mp4;codecs="avc1.42C00D"');
						break;
					default:
						expect(data).not.toBeNull();
					}
				});

			});

			/**
			 * The method returns audio codec info from the mpd file
			 */
			it("getCodec - Audio", function () {
				var data = '';
				manExtn.getCodec(adaptationSetAudio).then(function (Data) {
					data = Data;
				}, function (Error) {
					data = null;
				});
				waitsFor(function () {
					if (data != '')
						return true;
				}, "data is null", 100);
				runs(function () {
					switch (docMpdProto) {
					case 1:
						expect(data).toEqual("audio/mp4;codecs=\"mp4a.40.2\"");
						break;
					case 2:
						expect(data).toEqual('audio/mp4;codecs="mp4a.40.5"');
						break;
					case 3:
						expect(data).toEqual("audio/mp4;codecs=\"mp4a.40.2\"");
						break;
					case 4:
						expect(data).toEqual("audio/mp4;codecs=\"mp4a.40.2\"");
						break;
					default:
						expect(data).not.toBeNull();
					}
				});

			});

			/**
			 * The method returns suggestedPresentationDelay(Live offset) fo the manifest
			 commented this methods as getLiveOffset method is removed in DashManifestExtensions.js
			it("getLiveOffset", function () {
				var data = '';
				manExtn.getLiveOffset(manifestObj).then(function (Data) {
					data = Data;
				}, function (Error) {
					data = null;
				});
				waitsFor(function () {
					if (data != '')
						return true;
				}, "data is null", 100);
				runs(function () {
					switch (docMpdProto) {
					case 1:
						expect(data).toEqual(15);
						break;
					case 2:
						expect(data).toEqual(15);
						break;
					case 3:
						expect(data).toEqual(15);
						break;
					case 4:
						expect(data).toEqual(15);
						break;
					default:
						expect(data).not.toBeNull();
					}
				});

			}); */

			/**
			 * Check if the mpd file has timeShiftBufferDepth for Live stream data
			 */
			it("getIsDVR", function () {
				var boolRes = '';
				manExtn.getIsDVR(manifestObj, false).then(function (Data) {
					boolRes = Data;
				}, function (Error) {
					boolRes = Error;
				});
				waitsFor(function () {
					if (boolRes.toString() != '')
						return true;
				}, "data is null", 100);
				runs(function () {
					switch (docMpdProto) {
					case 1:
						expect(boolRes).not.toBeTruthy();
						break;
					case 2:
						expect(boolRes).not.toBeTruthy();
						break;
					case 3:
						expect(boolRes).not.toBeTruthy();
						break;
					case 4:
						expect(boolRes).not.toBeTruthy();
						break;
					default:
						expect(boolRes).not.toBeNull();
					}
				});
			});

			/**
			 * Check if the mpd profile is on-demand
			 */
			it("getIsOnDemand", function () {
				var boolRes = '';
				manExtn.getIsOnDemand(manifestObj).then(function (Data) {
					boolRes = Data;
				}, function (Error) {
					boolRes = Error;
				});
				waitsFor(function () {
					if (boolRes.toString() != '')
						return true;
				}, "data is null", 100);
				runs(function () {
					switch (docMpdProto) {
					case 1:
						expect(boolRes).not.toBeTruthy();
						break;
					case 2:
						expect(boolRes).not.toBeTruthy();
						break;
					case 3:
						expect(boolRes).not.toBeTruthy();
						break;
					case 4:
						expect(boolRes).not.toBeTruthy();
						break;
					default:
						expect(boolRes).not.toBeNull();
					}
				});
			});

			/**
			 * return the duration of the media presenter
			 */
			it("getDuration", function () {
				var res = '';
				manExtn.getDuration(manifestObj, false).then(function (Data) {
					res = Data;
				}, function (Error) {
					res = Error;
				});
				waitsFor(function () {
					if (res != '')
						return true;
				}, "data is null", 100);
				runs(function () {
					switch (docMpdProto) {
					case 1:
						expect(res).toEqual(600);
						break;
					case 2:
						expect(res).toEqual(234);
						break;
					case 3:
						expect(res).toEqual(600);
						break;
					case 4:
						expect(res).toEqual(102.72800000000001);
						break;
					default:
						expect(res).not.toBeNull();
					}
				});
			});

			/**
			 * return the bandwidth of the media representer
			 */
			it("getBandwidth", function () {
				var res = '';
				var RepObj = manifestObj.Period.AdaptationSet[0].Representation[0] ? manifestObj.Period.AdaptationSet[0].Representation[0] : manifestObj.Period.AdaptationSet[0].Representation;
				manExtn.getBandwidth(RepObj).then(function (Data) {
					res = Data;
				}, function (Error) {
					res = Error;
				});

				waitsFor(function () {
					if (res != '')
						return true;
				}, "data is null", 100);
				runs(function () {
					switch (docMpdProto) {
					case 1:
						expect(res).toEqual(50877);
						break;
					case 2:
						expect(res).toEqual(900000);
						break;
					case 3:
						expect(res).toEqual(50842);
						break;
					case 4:
						expect(res).toEqual(148000);
						break;
					default:
						expect(res).not.toBeNull();
					}
				});
			});

			/**
			 * return the update period(refresh time buffer) of the media representer
			 */
			it("getRefreshDelay", function () {
				var res = '';
				manExtn.getRefreshDelay(manifestObj).then(function (Data) {
					res = Data;
				}, function (Error) {
					res = Error;
				});
				waitsFor(function () {
					if (res != '')
						return true;
				}, "data is null", 100);
				runs(function () {
					switch (docMpdProto) {
					case 1:
						expect(isNaN(res)).toBeTruthy();
						break;
					case 2:
						expect(isNaN(res)).toBeTruthy();
						break;
					case 3:
						expect(isNaN(res)).toBeTruthy();
						break;
					case 4:
						expect(isNaN(res)).toBeTruthy();
						break;
					default:
						expect(res).not.toBeNull();
					}
				});
			});

			/**
			 * The method returns the Representation data for the given index in a Adaptation set
			 */
			it("getRepresentationFor", function () {
				var index = 0;
				var res = '';
				manExtn.getRepresentationFor(index, manifestObj.Period.AdaptationSet[index]).then(function (Data) {
					res = Data;
				}, function (Error) {
					res = Error;
				});
				waitsFor(function () {
					if (res != '')
						return true;
				}, "data is null", 100);
				runs(function () {
					switch (docMpdProto) {
					case 1:
						expect(res.id).toEqual("h264bl_low");
						break;
					case 2:
						expect(res.id).toEqual("v0");
						break;
					case 3:
						expect(res.id).toEqual("h264bl_low");
						break;
					case 4:
						expect(res.id).toEqual('audio=148000');
						break;
					default:
						expect(res).not.toBeNull();
					}
				});
			});
            
			
            it("getKID without data", function () {
				var data = null;
				var res = '';
				res=manExtn.getKID(data);
                expect(res).toEqual(null);
			});
            
            it("getKID with data", function () {
                var data = { "cenc:default_KID" :2 },
			    res = '';
				res=manExtn.getKID(data);
                expect(res).toEqual(2);
			});
            
            it("getContentProtectionData with data", function () {
				debugger;
                var data = { "ContentProtection_asArray" :2 },
			    res = '';
				res=manExtn.getContentProtectionData(data);
                expect(res).not.toBeNull();
			});            
			
			
			/** Commented these as getLiveStart, getLiveEdge,getSegmentInfoFor is removed in DashManifestExetension.js
            it("getLiveStart", function () {
                res = '';
                manExtn.getLiveStart(manifestObj,periodIndex).then(function (Data) {
					res = Data;
				}, function (Error) {
					res = Error;
				});

				waitsFor(function () {
					if (res == 0)
						return true;
				}, "data is null", 100);
				runs(function () {
						expect(res).toBe("");
				});
			}); 
			
			
            it("getLiveEdge", function () {
                res = '';
                manExtn.getLiveEdge(manifestObj).then(function (Data) {
					res = Data;
				}, function (Error) {
					res = Error;
				});

				waitsFor(function () {
					if (res == 0)
						return true;
				}, "data is null", 100);
				runs(function () {
						expect(res).toBe("");
				});
			}); 
 
            it("getSegmentInfoFor with SegmentBase", function () {
                var representation={ "SegmentBase" :2 },
                res = '';
                res =manExtn.getSegmentInfoFor(representation);
                expect(res).toBe(2);
			});
            
             it("getSegmentInfoFor with SegmentList", function () {
                var representation={ "SegmentList" :2 },
                res = '';
                res =manExtn.getSegmentInfoFor(representation);
                expect(res).toBe(2);
			});
            
            it("getSegmentInfoFor", function () {
                var representation={ "empty" :2 },
                res = '';
                res =manExtn.getSegmentInfoFor(representation);
                expect(res).toBe(null);
			}); */
			
			it("Is Text Track - text/vtt", function () {
				debugger;
                var type="text/vtt",
                res = '';
                res =manExtn.getIsTextTrack(type);
                expect(res).toBeTruthy();
			}); 
			
			it("Is Text Track - application type", function () {
                var type="application/ttml+xml",
                res = '';
                res =manExtn.getIsTextTrack(type);
                expect(res).toBeTruthy();
			});
			
			it("getIsText", function () {
                var objContentComponent=[],
					objCont=[],
					data=[],
                res = '';
				
				objContentComponent.mimeType="text/vtt";
				objContentComponent.lang = "en";				
				objContentComponent.segmentAlignment = "true";
				objContentComponent.startWithSAP = "1";
				objContentComponent.contentType="text";
				objCont.push(objContentComponent);
				data.ContentComponent=objCont;
				data.ContentComponent_asArray=objCont;
				
                manExtn.getIsText(data).then(function(res){
					expect(res).toBeTruthy();
				});
                
			});
			
			it("get Mime type - Video", function () {
				debugger;
				var data = '';
				manExtn.getMimeType(adaptationSetVideo).then(function (Data) {
					debugger;
					data = Data;
				}, function (Error) {
					data = null;
				});
				waitsFor(function () {
					if (data != '')
						return true;
				}, "data is null", 100);
				runs(function () {
					debugger;
					switch (docMpdProto) {
					case 1:
						expect(data).toEqual('video/mp4');
						break;
					case 2:
						expect(data).toEqual('video/mp4');
						break;
					case 3:
						expect(data).toEqual('video/mp4');
						break;
					case 4:
						expect(data).toEqual('video/mp4');
						break;
					default:
						expect(data).not.toBeNull();
					}
				});

			});
			
			it("get Mime type - Audio", function () {
				debugger;
				var data = '';
				manExtn.getMimeType(adaptationSetAudio).then(function (Data) {
					debugger;
					data = Data;
				}, function (Error) {
					data = null;
				});
				waitsFor(function () {
					if (data != '')
						return true;
				}, "data is null", 100);
				runs(function () {
					debugger;
					switch (docMpdProto) {
					case 1:
						expect(data).toEqual('audio/mp4');
						break;
					case 2:
						expect(data).toEqual('audio/mp4');
						break;
					case 3:
						expect(data).toEqual('audio/mp4');
						break;
					case 4:
						expect(data).toEqual('audio/mp4');
						break;
					default:
						expect(data).not.toBeNull();
					}
				});

			});
		});
	})(MPDstring);
}