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
		describe("Manifest Extension Test Suite for first MDF", function () {
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
			docMpdProto,
			period = 0,
            tempManifest;

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


			

			it("getIsMain with manifestObj null", function () {
				var resBool = '';
                manifestObj=null;
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

			/** This method is commented as getLiveEdge method is removed in DashManifestExtension.js 
           it("getLiveEdge with parameter availabilityEndTime", function () {
                res = '';
                var lessDate = new Date();
                lessDate.setDate(lessDate.getDate()-5);
                manifestObj.availabilityEndTime=new Date();
                manifestObj.availabilityStartTime=lessDate;
                manifestObj.Period_asArray=[];
                manifestObj.Period_asArray.push(manifestObj.Period);

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
			});    **/

            it("getDataForId with id null", function () {
				var res = '';
				var id = null;
				manExtn.getDataForId(id, manifestObj,period).then(function (Data) {
					res = Data ? Data.id : null;
				}, function (Error) {
					res = Error;
				});
				waitsFor(function () {
					if (res != '')
						return true;
				}, "data is null", 1000);
				runs(function () {
						expect(res).toBeNull();
				});
			});    

           
             it("GetRepresentationCount for Audio with an empty array", function () {
				var res = '';
                adaptationSetAudio.Representation_asArray={};
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
						expect(res).toBe(undefined);

				});
			});

            it("getVideoData  with empty data", function () {
				var data = '';
                manifestObj.Period_asArray[0].AdaptationSet_asArray={};
				manExtn.getVideoData(manifestObj,period).then(function (Data) {
					expect(Data).toBe(null);
				}, function (Error) {
					data = Error;
				});

			});    

            it("getAudioData with empty data", function () {
				var data = [];
                manifestObj.Period_asArray[0].AdaptationSet_asArray={};
				manExtn.getAudioDatas(manifestObj,period).then(function (Data) {
						expect(Data).toBe(Data);
				}, function (Error) {
					data = Error;
				});
			});   

            it("getPrimaryAudioData with empty data", function () {
				var data = '';
                manifestObj.Period_asArray[0].AdaptationSet_asArray={};
				manExtn.getPrimaryAudioData(manifestObj,period).then(function (Data) {
					expect(Data).toBe(null);
				}, function (Error) {
					data = Error;
				});

			});    
            
            it("getCodec - Video with empty data", function () {
				var data = '';
                adaptationSetVideo.Representation_asArray[0]="";
				manExtn.getCodec(adaptationSetVideo).then(function (Data) {
					expect(Data).toEqual("undefined;codecs=\"undefined\"");
				}, function (Error) {
					data = Error;
				});

			});  

			/** Commented as getLiveOffset method is removed in DashManifestExtension.js
            it("getLiveOffset with empty data", function () {
				var data = '';
                manifestObj.suggestedPresentationDelay="";
				manExtn.getLiveOffset(manifestObj).then(function (Data) {
					expect(Data).toEqual("");
				}, function (Error) {
					data = null;
				});
			});    **/   

             it("getIsOnDemand with empty profiles", function () {
				var boolRes = '';
                manifestObj.profiles={};
				manExtn.getIsOnDemand(manifestObj).then(function (Data) {
					expect(Data).toEqual(false);
				}, function (Error) {
					boolRes = Error;
				});
			});  

            it("getDuration with islive true", function () {
				var res = '';
				manExtn.getDuration(manifestObj, true).then(function (Data) {
					expect(Data).toEqual(Infinity);
				}, function (Error) {
					res = Error;
				});
			});   

            it("getDuration with mediaPresentationDuration", function () {
				var res = '';
                manifestObj.mediaPresentationDuration="8";
				manExtn.getDuration(manifestObj, false).then(function (Data) {
					expect(Data).toEqual("8");
				}, function (Error) {
					res = Error;
				});
			});    
            it("getDuration with mediaPresentationDuration null", function () {
				var res = '';
                manifestObj.mediaPresentationDuration=null;
                manifestObj.availabilityEndTime=new Date();
                manifestObj.availabilityStartTime=new Date();
				manExtn.getDuration(manifestObj, false).then(function (Data) {
					expect(Data).toEqual(0);
				}, function (Error) {
					res = Error;
				});
			});   
            it("getDuration with all parameters are null", function () {
				var res = '';
                manifestObj.mediaPresentationDuration=null;
                manifestObj.availabilityEndTime=null;
                manifestObj.availabilityStartTime=null;
				manExtn.getDuration(manifestObj, false).then(function (Data) {
					expect(isNaN(Data)).toEqual(true);
				}, function (Error) {
					res = Error;
				});
			});
            
            it("getBandwidth with bandwidth as null", function () {
				var res = '';
                var RepObj = manifestObj.Period.AdaptationSet[0].Representation[0] ? manifestObj.Period.AdaptationSet[0].Representation[0] : manifestObj.Period.AdaptationSet[0].Representation;
				RepObj.bandwidth = null;
				manExtn.getBandwidth(RepObj).then(function (Data) {
					expect(Data).toEqual(null);
				}, function (Error) {
					res = Error;
				});
			});
            
            it("getRefreshDelay with minimumUpdatePeriod as null", function () {
				var res = '';
                manifestObj.minimumUpdatePeriod=null;
				manExtn.getRefreshDelay(manifestObj).then(function (Data) {
					expect(isNaN(Data)).toEqual(true);
				}, function (Error) {
					res = Error;
				});
			});
            
            
                  
         
        if(window.location.href.indexOf("runner.html")==0)
        {
           describe("ManifestExtensions for browsers only", function () {
               it("getRepresentationFor with manifestObj.Period.AdaptationSet[index] as null", function () {
                    var index = 0;
                    manifestObj.Period.AdaptationSet[index]=null;
                    var res = '';
                    manExtn.getRepresentationFor(index, manifestObj.Period.AdaptationSet[index]).then(function (Data) {
                        res = Data;
                    }, function (Error) {
                        res = Error;
                    });
			   });     
            
                it("getIsAudio with input null", function () {
                    var resBool = '';
                    adaptationSetAudio=null;
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
                });
                
                it("processAdaptation with manifestObj.Period.AdaptationSet[0] as null", function () {
                    var resBool = true,
                    tempObj;
                    var ResObj = manExtn.processAdaptation(null);
                    expect(ResObj.Representation_asArray).toBeNull();
			    });  

               
               
               it("getDataForId with manifestObj as null", function () {
				var res = '';
                var id = null;
				manifestObj.Period_asArray[0].AdaptationSet_asArray = null;
				manExtn.getDataForId(id, manifestObj).then(function (Data) {
					res = Data ? Data.id : null;
				}, function (Error) {
					res = Error;
				});
				waitsFor(function () {
					if (res != '')
						return true;
				}, "data is null", 1000);
				runs(function () {
					expect(res).toBeNull();
				});
			});

            it("getDataForIndex with index null", function () {
				var index = null,
				res = '';
				manExtn.getDataForIndex(index, manifestObj).then(function (Data) {
					res = Data;
				}, function (Error) {
					res = Error;
				});
				waitsFor(function () {
					if (res != '')
						return true;
				}, "data is null", 1000);
				runs(function () {
					expect(res).toBe(undefined);

				});
			 }); 

            it("getDataForIndex with manifest null", function () {
				var index = 0;
				manifest.Period_asArray[0].AdaptationSet_asArray = null;
				manExtn.getDataForIndex(index, manifestObj).then(function (Data) {
					res = Data;
				}, function (Error) {
					res = Error;
				});
				waitsFor(function () {
					if (res != '')
						return true;
				}, "data is null", 1000);
				runs(function () {
					expect(res).toBe(undefined);

				});
			});

            it("GetRepresentationCount for Audio with null", function () {
				var res = '';
				manExtn.getRepresentationCount(null).then(function (Data) {
					res = Data;
				}, function (Error) {
					res = Error;
				});
				waitsFor(function () {
					if (res != '')
						return true;
				}, "data is null", 100);
				runs(function () {
						expect(res).toBe(undefined);

				});
			}); 
            
            it("processAdaptation with manifestObj.Period.AdaptationSet[0].Representation_asArray as null", function () {
                    var resBool = true,
                    tempObj;
                    manifestObj.Period.AdaptationSet[0].Representation_asArray =null;
                    var ResObj = manExtn.processAdaptation(manifestObj.Period.AdaptationSet[0]);
                    expect(ResObj.Representation_asArray).toBeNull();
			 }); 
             
            it("getRepresentationFor with index null", function () {
				var index = null;
				var res = '';
				manExtn.getRepresentationFor(index, manifestObj.Period.AdaptationSet[index]).then(function (Data) {
					expect(res.id).not.toEqual(null);
				}, function (Error) {
					res = Error;
				});
			});
            
            
          });
        }
    });
})(MPDstring);
    break;
}

