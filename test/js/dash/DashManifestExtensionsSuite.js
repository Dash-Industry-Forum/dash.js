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

var MpdArray = ["http://dash.edgesuite.net/dash264/TestCases/1b/thomson-networks/manifest.mpd",
                "http://www.digitalprimates.net/dash/streams/gpac/mp4-main-multi-mpd-AV-NBS.mpd"];

for(var iLoop = 0;iLoop < MpdArray.length;iLoop++){
    (function(iLoop) {
        describe("Manifest Extension Test Suite for " + MpdArray[iLoop], function () {
            var context, baseUrl, manExtn, adaptationSetAudio, adaptationSetVideo, representation, matchers, durationRegex, datetimeRegex, numericRegex, manifest, period, stub, manifestObj,docMpdProto;

        //Method to read mpd and convert to string
        function XmlToString(xmlPath) {

        // predeclare to prevent strict js error.
        var xmlDoc;
        var mpdString;

        // For IE based browsers:
        if (window.ActiveXObject) {
            xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
            xmlDoc.async = false;
            xmlDoc.load(xmlPath);
            mpdString = xmlDoc.xml.toString();
        }

        // For Mozilla/chrome based (standards compliant) browsers:
        else if (document.implementation && document.implementation.createDocument) {
            var xmlHttp = new window.XMLHttpRequest();
            xmlHttp.open("GET", xmlPath, false);
            xmlHttp.send(null);
            xmlDoc = xmlHttp.responseXML.documentElement;

            var serializer = new XMLSerializer();
            mpdString = serializer.serializeToString(xmlDoc);
        }

        return mpdString;

    }
            
            beforeEach(function () {
                baseUrl = "http://dashdemo.edgesuite.net/envivio/dashpr/clear/";

                // Set up DI.
                system = new dijon.System();
                system.mapValue("system", system);
                system.mapOutlet("system");

                context = new Dash.di.DashContext();
                system.injectInto(context);
                
                stub = XmlToString(MpdArray[0]);

                manExtn = system.getObject("manifestExt");
                parser = system.getObject("parser");
                
                parser.parse(stub,baseUrl).then(function(data){
                    manifestObj = data;
                    if(MpdArray[0] == "http://www.digitalprimates.net/dash/streams/gpac/mp4-main-multi-mpd-AV-NBS.mpd"){
                        docMpdProto = 1;
                        adaptationSetAudio = manifestObj.Period.AdaptationSet[1];
                        adaptationSetVideo = manifestObj.Period.AdaptationSet[0];
                    } else if(MpdArray[0] == "http://dash.edgesuite.net/dash264/TestCases/1b/thomson-networks/manifest.mpd"){
                        docMpdProto = 2;
                        adaptationSetAudio = manifestObj.Period.AdaptationSet[1];
                        adaptationSetVideo = manifestObj.Period.AdaptationSet[0];
                    }
                },function(err){
                    manifestObj = err;
                });
                waitsFor(function () {
                    if (manifestObj) return true;
                }, "data is null", 100);
                runs(function () {
                    return manifestObj;
                });
                
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
            });

            it("getIsAudio", function () {
                var resBool = '';
                if(adaptationSetAudio){
                    manExtn.getIsAudio(adaptationSetAudio).then(function (Data) {
                        resBool = Data;
                    }, function (Error) {
                        resBool = Error;
                    });
                    waitsFor(function () {
                        if (resBool.toString() != '') return true;
                    }, "data is null", 100);
                    runs(function () {
                        expect(resBool).toBeTruthy();
                    });
                } else
                    expect(true).toBeTruthy();
            });

            it("getIsVideo", function () {
                var resBool = '';
                if(adaptationSetVideo){
                    manExtn.getIsVideo(adaptationSetVideo).then(function (Data) {
                        resBool = Data;
                    }, function (Error) {
                        resBool = Error;
                    });
                    waitsFor(function () {
                        if (resBool.toString() != '') return true;
                    }, "data is null", 100);
                    runs(function () {
                        expect(resBool).toBeTruthy();
                    });
                }
                else
                    expect(true).toBeTruthy();
            });

            it("getIsMain", function () {
                var resBool = '';
                manExtn.getIsMain(manifestObj).then(function (Data) {
                    resBool = Data;
                }, function (Error) {
                    resBool = Error;
                });
                waitsFor(function () {
                    if (resBool.toString() != '') return true;
                }, "data is null", 100);
                runs(function () {
                    switch(docMpdProto){
                        case 1:
                            expect(resBool).not.toBeTruthy();
                            break;
                        default:
                            expect(resBool).not.toBeNull();
                    } 
                });
            });

            it("processAdaptation", function () {
                var resBool = true,tempObj;
                var ResObj =  manExtn.processAdaptation(manifestObj.Period.AdaptationSet[0]);
                for(var i=0;i<ResObj.Representation_asArray.length;i++){
                    if(tempObj){
                        resBool = (tempObj.bandwidth < ResObj.Representation_asArray[i].bandwidth);
                        if(resBool) 
                            tempObj = ResObj.Representation_asArray[i];
                        else
                            break;
                    } else{
                        tempObj = ResObj.Representation_asArray[i];
                    }
                }
                expect(resBool).toBeTruthy();
             });

            it("getDataForId", function () {
                var res='';
                var id = '';
                switch(docMpdProto){
                    case 1:
                        id = 'h264bl_low';
                        break;
                    case 2:
                        id = 'v0';
                        break;
                }
                manExtn.getDataForId(id,manifestObj).then(function (Data) {
                   res = Data ? Data.id : null;
                }, function (Error) {
                    res = Error;
                });
                waitsFor(function () {
                    if (res != '') return true;
                }, "data is null", 1000);
                runs(function () {
                    switch(docMpdProto){
                        case 1:
                            expect(res).toBeNull();
                            break;
                        case 2:
                            expect(res).toBeNull();
                            break;
                        default:
                            expect(res).not.toBeNull();
                    }
                    
                });
            });

            it("getDataForIndex", function () {
                var index = 0,res='';
                manExtn.getDataForIndex(index,manifestObj).then(function (Data) {
                   res = Data;
                }, function (Error) {
                    res = Error;
                });
                waitsFor(function () {
                    if (res != '') return true;
                }, "data is null", 1000);
                runs(function () {
                    switch(docMpdProto){
                        case 1:
                            expect(res.ContentComponent.contentType).toEqual("video");
                            break;
                        default:
                            expect(res).not.toBeNull();
                    }
                   
                });
            });

            it("getDataIndex", function () {
                var data = manifestObj.Period.AdaptationSet[1],res='';
                manExtn.getDataIndex(data,manifestObj).then(function (Data) {
                   res = Data;
                }, function (Error) {
                    res = Error;
                });
                waitsFor(function () {
                    if (res != '') return true;
                }, "data is null", 3000);
                runs(function () {
                    expect(res).toEqual(1);
                });
            });

            it("GetRepresentationCount for Audio", function () {
                var res = '';
                manExtn.getRepresentationCount(adaptationSetAudio).then(function (Data) {
                    res = Data;
                }, function (Error) {
                    res = Error;
                });
                waitsFor(function () {
                    if (res != '') return true;
                }, "data is null", 100);
                runs(function () {
                    switch(docMpdProto){
                        case 1:
                            expect(res).toEqual(2);
                            break;
                        default:
                            expect(res).not.toBeNull();
                    }
                   
                });
            });

            it("GetRepresentationCount for Video", function () {
                var res = '';
                manExtn.getRepresentationCount(adaptationSetVideo).then(function (Data) {
                    res = Data;
                }, function (Error) {
                    res = Error;
                });
                waitsFor(function () {
                    if (res != '') return true;
                }, "data is null", 100);
                runs(function () {
                    switch(docMpdProto){
                        case 1:
                            expect(res).toEqual(4);
                            break;
                        default:
                            expect(res).not.toBeNull();
                    }
                });
            });

            it("getVideoData", function () {
                var data = '';
                manExtn.getVideoData(manifestObj).then(function (Data) {
                    switch(docMpdProto){
                        case 1:
                            data = Data.ContentComponent.contentType;
                            break;
                        case 2:
                            data = Data.mimeType;
                            break;
                    } 
                   
                }, function (Error) {
                    data = Error;
                });
                waitsFor(function () {
                    if (data.toString() != '') return true;
                }, "data is null", 100);
                runs(function () {
                    expect(data).toMatch("video");
                });

            });

            it("getAudioData", function () {
                var data = '';
                manExtn.getAudioDatas(manifestObj).then(function (Data) {
                    switch(docMpdProto){
                        case 1:
                            data = Data[0].ContentComponent.contentType;
                            break;
                        case 2:
                            data = Data[0].mimeType;
                            break;
                    }
                }, function (Error) {
                    data = Error;
                });
                waitsFor(function () {
                    if (data.toString() != '') return true;
                }, "data is null", 100);
                runs(function () {
                    expect(data).toMatch("audio");
                });

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
            it("getPrimaryAudioData", function () {
                var data = '';
                manExtn.getPrimaryAudioData(manifestObj).then(function (Data) {
                    switch(docMpdProto){
                        case 1:
                            data = Data.ContentComponent.contentType;
                            break;
                        case 2:
                            data = Data.mimeType;
                            break;
                    }
                }, function (Error) {
                    data = Error;
                });
                waitsFor(function () {
                    if (data.toString() != '') return true;
                }, "data is null", 100);
                runs(function () {
                    expect(data).toMatch("audio");
                });

            });
            /*
            it("getPrimaryAudioData_Null", function(){ 
            var manifest = null;
            expect(manExtn.getPrimaryAudioData(manifest)).toBeNull();
            });*/

            it("getCodec - Video", function () {
                var data = '';
                manExtn.getCodec(adaptationSetVideo).then(function (Data) {
                    data = Data;
                }, function (Error) {
                    data = null;
                });
                waitsFor(function () {
                    if (data != '') return true;
                }, "data is null", 100);
                runs(function () {
                    switch(docMpdProto){
                        case 1:
                            expect(data).toEqual("video/mp4;codecs=\"avc1.42c00d\"");
                            break;
                        default:
                            expect(data).not.toBeNull();
                    }
                });

             });
             
            it("getCodec - Audio", function () {
                var data = '';
                manExtn.getCodec(adaptationSetAudio).then(function (Data) {
                    data = Data;
                }, function (Error) {
                    data = null;
                });
                waitsFor(function () {
                    if (data != '') return true;
                }, "data is null", 100);
                runs(function () {
                    switch(docMpdProto){
                        case 1:
                            expect(data).toEqual("audio/mp4;codecs=\"mp4a.40.2\"");
                            break;
                        default:
                            expect(data).not.toBeNull();
                    }            
                });

            }); 

            it("getLiveOffset", function () {
                var data = '';
                manExtn.getLiveOffset(manifestObj).then(function (Data) {
                    data = Data;
                }, function (Error) {
                    data = null;
                });
                waitsFor(function () {
                    if (data != '') return true;
                }, "data is null", 100);
                runs(function () {
                    switch(docMpdProto){
                        case 1:
                            expect(data).toEqual(5);
                            break;
                        default:
                            expect(data).not.toBeNull();
                    }            
                });

            });

             /* it("getLiveOffset", function () {
                var data = '',timeout=50;
                manExtn.getLiveEdge(manifestObj).then(function (Data) {alert(2)
                    data = Data;
                }, function (Error) {alert(1)
                    data = null;
                });
                waitsFor(function () {
                    if (data != '') return true;
                    timeout+=50;
                }, "data is null", timeout);
                runs(function () {
                    expect(data).toEqual(5);
                });

            }); */

            /*

            it("getIsLive_NotNull", function(){ 
                    var manifest,
                        converter = new X2JS(matchers, '', true),
                        iron = new ObjectIron(getDashMap());
                    manifest = converter.xml_str2json(data);
                expect(manExtn.getIsLive(manifest)).not.toBeNull();
            });

            */
            it("getIsDVR", function () {
                var boolRes = '';
                manExtn.getIsDVR(manifestObj,false).then(function (Data) {
                    boolRes = Data;
                }, function (Error) {
                    boolRes = Error;
                });
                waitsFor(function () {
                    if (boolRes.toString() != '') return true;
                }, "data is null", 100);
                runs(function () {
                    switch(docMpdProto){
                        case 1:
                            expect(boolRes).not.toBeTruthy();
                            break;
                        default:
                            expect(boolRes).not.toBeNull();
                    }
                });
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
            it("getIsOnDemand", function () {
                var boolRes = '';
                manExtn.getIsOnDemand(manifestObj).then(function (Data) {
                    boolRes = Data;
                }, function (Error) {
                    boolRes = Error;
                });
                waitsFor(function () {
                    if (boolRes.toString() != '') return true;
                }, "data is null", 100);
                runs(function () {
                    switch(docMpdProto){
                        case 1:
                            expect(boolRes).not.toBeTruthy();
                            break;
                        default:
                            expect(boolRes).not.toBeNull();
                    }            
                });
            });
            /*
            it("getIsOnDemand_Null", function(){ 
            var manifest=null;
            expect(manExtn.getIsOnDemand(manifest)).toBeNull();
            });
            */
            it("getDuration", function () {
                var res = '';
                manExtn.getDuration(manifestObj, false).then(function (Data) {
                    res = Data;
                }, function (Error) {
                    res = Error;
                });
                waitsFor(function () {
                    if (res != '') return true;
                }, "data is null", 100);
                runs(function () {
                    switch(docMpdProto){
                        case 1:
                            expect(res).toEqual(600);
                            break;
                        default:
                            expect(res).not.toBeNull();
                    } 
                });
            });

            it("getBandwidth", function () {
                var res = '';
                var adapObj = manifestObj.Period.AdaptationSet;
                manExtn.getBandwidth(adapObj[0].Representation[0]).then(function (Data) {
                    res = Data;
                }, function (Error) {
                    res = Error;
                });
               
                waitsFor(function () {
                    if (res != '') return true;
                }, "data is null", 100);
                runs(function () {
                    switch(docMpdProto){
                        case 1:
                            expect(res).toEqual(50877);
                            break;
                        default:
                            expect(res).not.toBeNull();
                    } 
                });
            });

            it("getRefreshDelay", function () {
                var res = '';
                manExtn.getRefreshDelay(manifestObj).then(function (Data) {
                    res = Data;
                }, function (Error) {
                    res = Error;
                });
                waitsFor(function () {
                    if (res != '') return true;
                }, "data is null", 100);
                runs(function () {
                    switch(docMpdProto){
                        case 1:
                             expect(isNaN(res)).toBeTruthy();
                             break;
                        default:
                            expect(res).not.toBeNull();
                    } 
                });
            });

            it("getRepresentationFor", function () {
                var index = 0;
                var res = '';
                manExtn.getRepresentationFor(index, manifestObj.Period.AdaptationSet[index]).then(function (Data) {
                    res = Data;
                }, function (Error) {
                    res = Error;
                });
                waitsFor(function () {
                    if (res != '') return true;
                }, "data is null", 100);
                runs(function () {
                    switch(docMpdProto){
                        case 1:
                            expect(res.id).toEqual("h264bl_low");
                            break;
                        default:
                            expect(res).not.toBeNull();
                    } 
                });
            });

        });
    })(iLoop);
}    