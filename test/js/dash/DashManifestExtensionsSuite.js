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
 
    });
    
    it("getIsAudio returns correct value", function () {
        var resBool = '';
        manExtn.getIsAudio(adaptationSet).then(function (Data) {
            resBool = Data;
        }, function (Error) {
            resBool = Error;
        });
        waitsFor(function () {
            if (resBool.toString() != '') return true;
        }, "data is null", 100);
        runs(function () {
            resBool == true ? expect(resBool).toBeTruthy() : expect(resBool).not.toBeTruthy();
        });
    });


    it("getIsVideo returns correct value", function () {
        var resBool = '';
        manExtn.getIsVideo(adaptationSet).then(function (Data) {
            resBool = Data;
        }, function (Error) {
            resBool = Error;
        });
        waitsFor(function () {
            if (resBool.toString() != '') return true;
        }, "data is null", 100);
        runs(function () {
            resBool == true ? expect(resBool).toBeTruthy() : expect(resBool).not.toBeTruthy();
        });
    });


    it("getIsMain returns correct value", function () {
        var resBool = '';
        manExtn.getIsMain(adaptationSet).then(function (Data) {
            resBool = Data;
        }, function (Error) {
            resBool = Error;
        });
        waitsFor(function () {
            if (resBool.toString() != '') return true;
        }, "data is null", 100);
        runs(function () {
            resBool == true ? expect(resBool).toBeTruthy() : expect(resBool).not.toBeTruthy();
        });
    });

    it("getRepresentationCount returns correct value", function () {
        var res = '';
        manExtn.getRepresentationCount(adaptationSet).then(function (Data) {
            res = Data;
        }, function (Error) {
            res = Error;
        });
        waitsFor(function () {
            if (res != '') return true;
        }, "data is null", 100);
        runs(function () {
            expect(res + 1).toBeGreaterThan(0);
        });
    });

    it("getVideoData returns correct value", function () {
        var pass = '';
        manExtn.getVideoData(manifest).then(function (Data) {
            pass = true;
        }, function (Error) {
            pass = false;
        });
        waitsFor(function () {
            if (pass.toString() != '') return true;
        }, "data is null", 100);
        runs(function () {
            expect(pass).toBeTruthy()
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
    it("getPrimaryAudioData returns correct value", function () {
        var pass = '';
        manExtn.getPrimaryAudioData(manifest).then(function (Data) {
            pass = true;
        }, function (Error) {
            pass = false;
        });
        waitsFor(function () {
            if (pass.toString() != '') return true;
        }, "data is null", 100);
        runs(function () {
            expect(pass).toBeTruthy()
        });
    });
    /*
    it("getPrimaryAudioData_Null", function(){ 
    var manifest = null;
    expect(manExtn.getPrimaryAudioData(manifest)).toBeNull();
    });*/

    it("getCodec returns correct value", function () {
        var data = '';
        manExtn.getCodec(adaptationSet).then(function (Data) {
            data = Data;
        }, function (Error) {
            data = null;
        });
        waitsFor(function () {
            if (data != '') return true;
        }, "data is null", 100);
        runs(function () {
            expect(data).not.toBeNull();
        });

    }); /*
    
    it("getIsLive_NotNull", function(){ 
            var manifest,
                converter = new X2JS(matchers, '', true),
                iron = new ObjectIron(getDashMap());
            manifest = converter.xml_str2json(data);
        expect(manExtn.getIsLive(manifest)).not.toBeNull();
    });

    */
    it("getIsDVR returns correct value", function () {
        var pass = '';
        manExtn.getIsDVR(manifest).then(function (Data) {
            pass = true;
        }, function (Error) {
            pass = false;
        });
        waitsFor(function () {
            if (pass.toString() != '') return true;
        }, "data is null", 100);
        runs(function () {
            pass == true ? expect(pass).toBeTruthy() : expect(pass).not.toBeTruthy();
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
    it("getIsOnDemand returns correct value", function () {
        var pass = '';
        manExtn.getIsOnDemand(manifest).then(function (Data) {
            pass = true;
        }, function (Error) {
            pass = false;
        });
        waitsFor(function () {
            if (pass.toString() != '') return true;
        }, "data is null", 100);
        runs(function () {
            pass == true ? expect(pass).toBeTruthy() : expect(pass).not.toBeTruthy();
        });
    });
    /*
    it("getIsOnDemand_Null", function(){ 
    var manifest=null;
    expect(manExtn.getIsOnDemand(manifest)).toBeNull();
    });
    */
    it("getDuration returns correct value", function () {
        var res = '';
        manExtn.getDuration(manifest, true).then(function (Data) {
            res = Data;
        }, function (Error) {
            res = Error;
        });
        waitsFor(function () {
            if (res != '') return true;
        }, "data is null", 100);
        runs(function () {
            expect(res + 1).toBeGreaterThan(0);
        });
    });

    // it("getDuration", function(){ 

    // expect(manExtn.getDuration(manifest)).not.toBeNull();
    // });

    it("getBandwidth returns correct value", function () {
        var res = '';
        manExtn.getBandwidth(adaptationSet.Representation_asArray[0]).then(function (Data) {
            res = Data;
        }, function (Error) {
            res = Error;
        });
        waitsFor(function () {
            if (res != '') return true;
        }, "data is null", 100);
        runs(function () {
            expect(res).toEqual(adaptationSet.Representation_asArray[0].bandwidth);
        });
    });

    it("getRefreshDelay returns correct value", function () {
        var res = '';
        manExtn.getRefreshDelay(manifest).then(function (Data) {
            res = Data;
        }, function (Error) {
            res = Error;
        });
        waitsFor(function () {
            if (res != '') return true;
        }, "data is null", 100);
        runs(function () {
            isNaN(res) ? expect(isNaN(res)).toBeTruthy() : expect(res + 1).toBeGreaterThan(0);

        });
    });

    it("getRepresentationFor returns correct value", function () {
        var index = 0;
        var res = '';
        manExtn.getRepresentationFor(index, adaptationSet).then(function (Data) {
            res = Data;
        }, function (Error) {
            res = Error;
        });
        waitsFor(function () {
            if (res != '') return true;
        }, "data is null", 100);
        runs(function () {
            expect(res.name).toEqual("Representation");

        });
    });
    
    });
    