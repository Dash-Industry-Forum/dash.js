// The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
//
// Copyright (c) 2014, Google, Inc
//
// All rights reserved.
// Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
//     -             Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
//     -             Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
//     -             Neither the name of the Microsoft Open Technologies, Inc. nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

// These tests take a few seconds to run and require a live url so they are not
// run by default
var webmTestUrl =
  "http://yt-dash-mse-test.commondatastorage.googleapis.com/media/";

var files = [
  // vorbis
  { name: "feelings_vp9-20130806-171.webm", range: "4452-4686", cues: 14 },
  { name: "feelings_vp9-20130806-172.webm", range: "3995-4229", cues: 14 },
  { name: "feelings_vp9-20130806-242.webm", range: "234-682", cues: 27 },
  { name: "feelings_vp9-20130806-243.webm", range: "235-683", cues: 27 },
  { name: "feelings_vp9-20130806-244.webm", range: "235-683", cues: 27 },
  { name: "feelings_vp9-20130806-245.webm", range: "235-684", cues: 27 },
  { name: "feelings_vp9-20130806-246.webm", range: "235-696", cues: 27 },
  { name: "feelings_vp9-20130806-247.webm", range: "235-695", cues: 27 }
];

var webmUrlExt;

describe("Webm url Extensions Test Suite", function(){
    var baseUrl, system, baseURLExt;

    beforeEach(function() {
        // Set up DI.
        system = new dijon.System();
        system.mapValue("system", system);
        system.mapOutlet("system");

        context = new Webm.di.WebmContext();
        system.injectInto(context);

        system.getObject("notifier");
        webmUrlExt = system.getObject("baseURLExt");
    });
    if(window.location.href.indexOf("_SpecRunner.html")>0) {
          describe("Webm url Extension Negative Test Suite", function(){
              // TODO this test appears to be invalid because 'index' argument in 'verify' function has the same value after several calls. Disable it temporary
              xit("loadSegments", function(){
                  var successResult,
                      c,
                      i,
                      flag=false,
                      media,
                      representation,
                      verify;
                  for (i = 0; i < files.length; i++) {
                      flag = false;
                      verify = function(result, index) {
                        successResult = result;
                          expect(result).not.toBeNull();

                          for (c = 0; c < result.length; c++) {
                            expect(result[c].mediaRange).toEqual(validCues[index][c].mediaRange);
                            expect(result[c].media).toEqual(validCues[index][c].media);
                            expect(result[c].duration).toEqual(validCues[index][c].duration);
                            expect(result[c].startTime).toEqual(validCues[index][c].startTime);
                            expect(result[c].timescale).toEqual(validCues[index][c].timescale);
                          }
                          flag = true;
                          expect(result.length).toEqual(files[index].cues);
                      };
                      (function (index) {
                          runs(function () {
                            flag = false;
                            media = webmTestUrl + files[index].name;
                            representation = {index: 0, adaptation: {index: 0, period: {index: 0, mpd: {manifest: {Period_asArray: [{AdaptationSet_asArray: [{Representation_asArray: [{BaseURL: media}]}]}]}}}}};
                            webmUrlExt.subscribe(Webm.dependencies.WebmURLExtensions.eventList.ENAME_SEGMENTS_LOADED, {segmentsLoaded: function(e) {
                                verify(e.data.segments, index);
                            }});
                            webmUrlExt.loadSegments(representation, "video", files[index].range);
                          });
                      })(i);

                      waitsFor(function () {
                          // if this fails to wait then an exception was thrown
                          return flag;
                      }, "wait for cues to finish parsing", 10000);
                  }
              });
          });
      }
    it("Creating and assigning segment ", function(){
       var objSegment  = new Dash.vo.Segment();
       expect(objSegment.index).toBeNull();
    });
});


var validCues =
[
  [
    {"mediaRange":"4687-144902","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-171.webm","duration":10012,"startTime":0,"timescale":1000},
    {"mediaRange":"144903-297658","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-171.webm","duration":10014,"startTime":10012,"timescale":1000},
    {"mediaRange":"297659-459956","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-171.webm","duration":10022,"startTime":20026,"timescale":1000},
    {"mediaRange":"459957-618639","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-171.webm","duration":10019,"startTime":30048,"timescale":1000},
    {"mediaRange":"618640-773027","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-171.webm","duration":10014,"startTime":40067,"timescale":1000},
    {"mediaRange":"773028-924088","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-171.webm","duration":10019,"startTime":50081,"timescale":1000},
    {"mediaRange":"924089-1069118","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-171.webm","duration":10011,"startTime":60100,"timescale":1000},
    {"mediaRange":"1069119-1226239","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-171.webm","duration":10005,"startTime":70111,"timescale":1000},
    {"mediaRange":"1226240-1387393","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-171.webm","duration":10017,"startTime":80116,"timescale":1000},
    {"mediaRange":"1387394-1545707","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-171.webm","duration":10003,"startTime":90133,"timescale":1000},
    {"mediaRange":"1545708-1699982","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-171.webm","duration":10001,"startTime":100136,"timescale":1000},
    {"mediaRange":"1699983-1859341","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-171.webm","duration":10019,"startTime":110137,"timescale":1000},
    {"mediaRange":"1859342-2009815","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-171.webm","duration":10003,"startTime":120156,"timescale":1000},
    {"mediaRange":"2009816-2061224","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-171.webm","duration":5447,"startTime":130159,"timescale":1000}
  ],
  [
    {"mediaRange":"4230-207919","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-172.webm","duration":10012,"startTime":0,"timescale":1000},
    {"mediaRange":"207920-429458","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-172.webm","duration":10014,"startTime":10012,"timescale":1000},
    {"mediaRange":"429459-665027","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-172.webm","duration":10022,"startTime":20026,"timescale":1000},
    {"mediaRange":"665028-898125","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-172.webm","duration":10014,"startTime":30048,"timescale":1000},
    {"mediaRange":"898126-1119086","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-172.webm","duration":10019,"startTime":40062,"timescale":1000},
    {"mediaRange":"1119087-1334972","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-172.webm","duration":10019,"startTime":50081,"timescale":1000},
    {"mediaRange":"1334973-1540801","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-172.webm","duration":10011,"startTime":60100,"timescale":1000},
    {"mediaRange":"1540802-1769897","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-172.webm","duration":10008,"startTime":70111,"timescale":1000},
    {"mediaRange":"1769898-2004424","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-172.webm","duration":10014,"startTime":80119,"timescale":1000},
    {"mediaRange":"2004425-2234586","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-172.webm","duration":10003,"startTime":90133,"timescale":1000},
    {"mediaRange":"2234587-2455612","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-172.webm","duration":10018,"startTime":100136,"timescale":1000},
    {"mediaRange":"2455613-2688802","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-172.webm","duration":10002,"startTime":110154,"timescale":1000},
    {"mediaRange":"2688803-2910082","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-172.webm","duration":10003,"startTime":120156,"timescale":1000},
    {"mediaRange":"2910083-2985978","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-172.webm","duration":5447,"startTime":130159,"timescale":1000}
  ],
  [
    {"mediaRange":"683-111240","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-242.webm","duration":5005,"startTime":0,"timescale":1000},
    {"mediaRange":"111241-241186","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-242.webm","duration":5005,"startTime":5005,"timescale":1000},
    {"mediaRange":"241187-377687","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-242.webm","duration":5005,"startTime":10010,"timescale":1000},
    {"mediaRange":"377688-493103","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-242.webm","duration":5005,"startTime":15015,"timescale":1000},
    {"mediaRange":"493104-611438","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-242.webm","duration":5005,"startTime":20020,"timescale":1000},
    {"mediaRange":"611439-861254","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-242.webm","duration":5005,"startTime":25025,"timescale":1000},
    {"mediaRange":"861255-1065783","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-242.webm","duration":5005,"startTime":30030,"timescale":1000},
    {"mediaRange":"1065784-1372470","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-242.webm","duration":5005,"startTime":35035,"timescale":1000},
    {"mediaRange":"1372471-1528592","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-242.webm","duration":5005,"startTime":40040,"timescale":1000},
    {"mediaRange":"1528593-1673234","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-242.webm","duration":5005,"startTime":45045,"timescale":1000},
    {"mediaRange":"1673235-1789018","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-242.webm","duration":5005,"startTime":50050,"timescale":1000},
    {"mediaRange":"1789019-1928698","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-242.webm","duration":5005,"startTime":55055,"timescale":1000},
    {"mediaRange":"1928699-2108864","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-242.webm","duration":5005,"startTime":60060,"timescale":1000},
    {"mediaRange":"2108865-2305230","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-242.webm","duration":5005,"startTime":65065,"timescale":1000},
    {"mediaRange":"2305231-2585320","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-242.webm","duration":5005,"startTime":70070,"timescale":1000},
    {"mediaRange":"2585321-2854107","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-242.webm","duration":5005,"startTime":75075,"timescale":1000},
    {"mediaRange":"2854108-3051116","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-242.webm","duration":5005,"startTime":80080,"timescale":1000},
    {"mediaRange":"3051117-3252710","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-242.webm","duration":5005,"startTime":85085,"timescale":1000},
    {"mediaRange":"3252711-3456431","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-242.webm","duration":5005,"startTime":90090,"timescale":1000},
    {"mediaRange":"3456432-3636562","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-242.webm","duration":5005,"startTime":95095,"timescale":1000},
    {"mediaRange":"3636563-3826442","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-242.webm","duration":5005,"startTime":100100,"timescale":1000},
    {"mediaRange":"3826443-4017179","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-242.webm","duration":5005,"startTime":105105,"timescale":1000},
    {"mediaRange":"4017180-4135075","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-242.webm","duration":5005,"startTime":110110,"timescale":1000},
    {"mediaRange":"4135076-4249906","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-242.webm","duration":5005,"startTime":115115,"timescale":1000},
    {"mediaRange":"4249907-4360446","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-242.webm","duration":5005,"startTime":120120,"timescale":1000},
    {"mediaRange":"4360447-4459978","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-242.webm","duration":5005,"startTime":125125,"timescale":1000},
    {"mediaRange":"4459979-4478155","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-242.webm","duration":5339,"startTime":130130,"timescale":1000}
  ],
  [
    {"mediaRange":"684-201657","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-243.webm","duration":5005,"startTime":0,"timescale":1000},
    {"mediaRange":"201658-424345","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-243.webm","duration":5005,"startTime":5005,"timescale":1000},
    {"mediaRange":"424346-661984","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-243.webm","duration":5005,"startTime":10010,"timescale":1000},
    {"mediaRange":"661985-880943","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-243.webm","duration":5005,"startTime":15015,"timescale":1000},
    {"mediaRange":"880944-1101761","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-243.webm","duration":5005,"startTime":20020,"timescale":1000},
    {"mediaRange":"1101762-1568105","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-243.webm","duration":5005,"startTime":25025,"timescale":1000},
    {"mediaRange":"1568106-1928775","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-243.webm","duration":5005,"startTime":30030,"timescale":1000},
    {"mediaRange":"1928776-2508868","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-243.webm","duration":5005,"startTime":35035,"timescale":1000},
    {"mediaRange":"2508869-2785162","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-243.webm","duration":5005,"startTime":40040,"timescale":1000},
    {"mediaRange":"2785163-3019334","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-243.webm","duration":5005,"startTime":45045,"timescale":1000},
    {"mediaRange":"3019335-3237767","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-243.webm","duration":5005,"startTime":50050,"timescale":1000},
    {"mediaRange":"3237768-3471924","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-243.webm","duration":5005,"startTime":55055,"timescale":1000},
    {"mediaRange":"3471925-3789840","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-243.webm","duration":5005,"startTime":60060,"timescale":1000},
    {"mediaRange":"3789841-4113484","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-243.webm","duration":5005,"startTime":65065,"timescale":1000},
    {"mediaRange":"4113485-4611565","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-243.webm","duration":5005,"startTime":70070,"timescale":1000},
    {"mediaRange":"4611566-5088133","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-243.webm","duration":5005,"startTime":75075,"timescale":1000},
    {"mediaRange":"5088134-5399377","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-243.webm","duration":5005,"startTime":80080,"timescale":1000},
    {"mediaRange":"5399378-5739508","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-243.webm","duration":5005,"startTime":85085,"timescale":1000},
    {"mediaRange":"5739509-6059235","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-243.webm","duration":5005,"startTime":90090,"timescale":1000},
    {"mediaRange":"6059236-6376504","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-243.webm","duration":5005,"startTime":95095,"timescale":1000},
    {"mediaRange":"6376505-6699508","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-243.webm","duration":5005,"startTime":100100,"timescale":1000},
    {"mediaRange":"6699509-7044088","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-243.webm","duration":5005,"startTime":105105,"timescale":1000},
    {"mediaRange":"7044089-7262096","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-243.webm","duration":5005,"startTime":110110,"timescale":1000},
    {"mediaRange":"7262097-7474662","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-243.webm","duration":5005,"startTime":115115,"timescale":1000},
    {"mediaRange":"7474663-7682068","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-243.webm","duration":5005,"startTime":120120,"timescale":1000},
    {"mediaRange":"7682069-7874067","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-243.webm","duration":5005,"startTime":125125,"timescale":1000},
    {"mediaRange":"7874068-7902884","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-243.webm","duration":5339,"startTime":130130,"timescale":1000}
  ],
  [
    {"mediaRange":"684-410260","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-244.webm","duration":5005,"startTime":0,"timescale":1000},
    {"mediaRange":"410261-843202","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-244.webm","duration":5005,"startTime":5005,"timescale":1000},
    {"mediaRange":"843203-1286282","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-244.webm","duration":5005,"startTime":10010,"timescale":1000},
    {"mediaRange":"1286283-1721445","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-244.webm","duration":5005,"startTime":15015,"timescale":1000},
    {"mediaRange":"1721446-2143105","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-244.webm","duration":5005,"startTime":20020,"timescale":1000},
    {"mediaRange":"2143106-2845710","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-244.webm","duration":5005,"startTime":25025,"timescale":1000},
    {"mediaRange":"2845711-3384127","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-244.webm","duration":5005,"startTime":30030,"timescale":1000},
    {"mediaRange":"3384128-4268573","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-244.webm","duration":5005,"startTime":35035,"timescale":1000},
    {"mediaRange":"4268574-4725269","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-244.webm","duration":5005,"startTime":40040,"timescale":1000},
    {"mediaRange":"4725270-5156238","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-244.webm","duration":5005,"startTime":45045,"timescale":1000},
    {"mediaRange":"5156239-5587458","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-244.webm","duration":5005,"startTime":50050,"timescale":1000},
    {"mediaRange":"5587459-6021656","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-244.webm","duration":5005,"startTime":55055,"timescale":1000},
    {"mediaRange":"6021657-6515427","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-244.webm","duration":5005,"startTime":60060,"timescale":1000},
    {"mediaRange":"6515428-6991764","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-244.webm","duration":5005,"startTime":65065,"timescale":1000},
    {"mediaRange":"6991765-7728645","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-244.webm","duration":5005,"startTime":70070,"timescale":1000},
    {"mediaRange":"7728646-8438231","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-244.webm","duration":5005,"startTime":75075,"timescale":1000},
    {"mediaRange":"8438232-8882608","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-244.webm","duration":5005,"startTime":80080,"timescale":1000},
    {"mediaRange":"8882609-9367414","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-244.webm","duration":5005,"startTime":85085,"timescale":1000},
    {"mediaRange":"9367415-9832724","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-244.webm","duration":5005,"startTime":90090,"timescale":1000},
    {"mediaRange":"9832725-10307383","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-244.webm","duration":5005,"startTime":95095,"timescale":1000},
    {"mediaRange":"10307384-10783659","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-244.webm","duration":5005,"startTime":100100,"timescale":1000},
    {"mediaRange":"10783660-11292543","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-244.webm","duration":5005,"startTime":105105,"timescale":1000},
    {"mediaRange":"11292544-11725348","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-244.webm","duration":5005,"startTime":110110,"timescale":1000},
    {"mediaRange":"11725349-12140071","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-244.webm","duration":5005,"startTime":115115,"timescale":1000},
    {"mediaRange":"12140072-12557750","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-244.webm","duration":5005,"startTime":120120,"timescale":1000},
    {"mediaRange":"12557751-12898123","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-244.webm","duration":5005,"startTime":125125,"timescale":1000},
    {"mediaRange":"12898124-12941792","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-244.webm","duration":5339,"startTime":130130,"timescale":1000}
  ],
  [
    {"mediaRange":"685-627819","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-245.webm","duration":5005,"startTime":0,"timescale":1000},
    {"mediaRange":"627820-1280813","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-245.webm","duration":5005,"startTime":5005,"timescale":1000},
    {"mediaRange":"1280814-1943232","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-245.webm","duration":5005,"startTime":10010,"timescale":1000},
    {"mediaRange":"1943233-2593224","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-245.webm","duration":5005,"startTime":15015,"timescale":1000},
    {"mediaRange":"2593225-3230642","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-245.webm","duration":5005,"startTime":20020,"timescale":1000},
    {"mediaRange":"3230643-3977139","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-245.webm","duration":5005,"startTime":25025,"timescale":1000},
    {"mediaRange":"3977140-4632083","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-245.webm","duration":5005,"startTime":30030,"timescale":1000},
    {"mediaRange":"4632084-5527665","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-245.webm","duration":5005,"startTime":35035,"timescale":1000},
    {"mediaRange":"5527666-6180408","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-245.webm","duration":5005,"startTime":40040,"timescale":1000},
    {"mediaRange":"6180409-6822881","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-245.webm","duration":5005,"startTime":45045,"timescale":1000},
    {"mediaRange":"6822882-7458516","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-245.webm","duration":5005,"startTime":50050,"timescale":1000},
    {"mediaRange":"7458517-8103734","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-245.webm","duration":5005,"startTime":55055,"timescale":1000},
    {"mediaRange":"8103735-8758547","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-245.webm","duration":5005,"startTime":60060,"timescale":1000},
    {"mediaRange":"8758548-9408806","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-245.webm","duration":5005,"startTime":65065,"timescale":1000},
    {"mediaRange":"9408807-10175276","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-245.webm","duration":5005,"startTime":70070,"timescale":1000},
    {"mediaRange":"10175277-10892342","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-245.webm","duration":5005,"startTime":75075,"timescale":1000},
    {"mediaRange":"10892343-11545172","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-245.webm","duration":5005,"startTime":80080,"timescale":1000},
    {"mediaRange":"11545173-12197851","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-245.webm","duration":5005,"startTime":85085,"timescale":1000},
    {"mediaRange":"12197852-12844559","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-245.webm","duration":5005,"startTime":90090,"timescale":1000},
    {"mediaRange":"12844560-13494060","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-245.webm","duration":5005,"startTime":95095,"timescale":1000},
    {"mediaRange":"13494061-14131466","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-245.webm","duration":5005,"startTime":100100,"timescale":1000},
    {"mediaRange":"14131467-14779010","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-245.webm","duration":5005,"startTime":105105,"timescale":1000},
    {"mediaRange":"14779011-15426875","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-245.webm","duration":5005,"startTime":110110,"timescale":1000},
    {"mediaRange":"15426876-16055693","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-245.webm","duration":5005,"startTime":115115,"timescale":1000},
    {"mediaRange":"16055694-16693226","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-245.webm","duration":5005,"startTime":120120,"timescale":1000},
    {"mediaRange":"16693227-17174369","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-245.webm","duration":5005,"startTime":125125,"timescale":1000},
    {"mediaRange":"17174370-17220191","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-245.webm","duration":5339,"startTime":130130,"timescale":1000}
  ],
  [
    {"mediaRange":"697-1180610","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-246.webm","duration":5005,"startTime":0,"timescale":1000},
    {"mediaRange":"1180611-2468295","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-246.webm","duration":5005,"startTime":5005,"timescale":1000},
    {"mediaRange":"2468296-3776551","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-246.webm","duration":5005,"startTime":10010,"timescale":1000},
    {"mediaRange":"3776552-5060775","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-246.webm","duration":5005,"startTime":15015,"timescale":1000},
    {"mediaRange":"5060776-6344666","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-246.webm","duration":5005,"startTime":20020,"timescale":1000},
    {"mediaRange":"6344667-7643196","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-246.webm","duration":5005,"startTime":25025,"timescale":1000},
    {"mediaRange":"7643197-8936885","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-246.webm","duration":5005,"startTime":30030,"timescale":1000},
    {"mediaRange":"8936886-10251494","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-246.webm","duration":5005,"startTime":35035,"timescale":1000},
    {"mediaRange":"10251495-11531256","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-246.webm","duration":5005,"startTime":40040,"timescale":1000},
    {"mediaRange":"11531257-12788181","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-246.webm","duration":5005,"startTime":45045,"timescale":1000},
    {"mediaRange":"12788182-14060471","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-246.webm","duration":5005,"startTime":50050,"timescale":1000},
    {"mediaRange":"14060472-15337070","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-246.webm","duration":5005,"startTime":55055,"timescale":1000},
    {"mediaRange":"15337071-16644617","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-246.webm","duration":5005,"startTime":60060,"timescale":1000},
    {"mediaRange":"16644618-17943527","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-246.webm","duration":5005,"startTime":65065,"timescale":1000},
    {"mediaRange":"17943528-19215572","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-246.webm","duration":5005,"startTime":70070,"timescale":1000},
    {"mediaRange":"19215573-20519418","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-246.webm","duration":5005,"startTime":75075,"timescale":1000},
    {"mediaRange":"20519419-21811026","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-246.webm","duration":5005,"startTime":80080,"timescale":1000},
    {"mediaRange":"21811027-23109242","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-246.webm","duration":5005,"startTime":85085,"timescale":1000},
    {"mediaRange":"23109243-24402984","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-246.webm","duration":5005,"startTime":90090,"timescale":1000},
    {"mediaRange":"24402985-25686133","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-246.webm","duration":5005,"startTime":95095,"timescale":1000},
    {"mediaRange":"25686134-26977120","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-246.webm","duration":5005,"startTime":100100,"timescale":1000},
    {"mediaRange":"26977121-28264324","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-246.webm","duration":5005,"startTime":105105,"timescale":1000},
    {"mediaRange":"28264325-29550571","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-246.webm","duration":5005,"startTime":110110,"timescale":1000},
    {"mediaRange":"29550572-30789223","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-246.webm","duration":5005,"startTime":115115,"timescale":1000},
    {"mediaRange":"30789224-31914712","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-246.webm","duration":5005,"startTime":120120,"timescale":1000},
    {"mediaRange":"31914713-32556367","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-246.webm","duration":5005,"startTime":125125,"timescale":1000},
    {"mediaRange":"32556368-32602935","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-246.webm","duration":5339,"startTime":130130,"timescale":1000}
  ],
  [
    {"mediaRange":"696-829340","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-247.webm","duration":5005,"startTime":0,"timescale":1000},
    {"mediaRange":"829341-1705420","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-247.webm","duration":5005,"startTime":5005,"timescale":1000},
    {"mediaRange":"1705421-2590451","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-247.webm","duration":5005,"startTime":10010,"timescale":1000},
    {"mediaRange":"2590452-3464252","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-247.webm","duration":5005,"startTime":15015,"timescale":1000},
    {"mediaRange":"3464253-4319405","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-247.webm","duration":5005,"startTime":20020,"timescale":1000},
    {"mediaRange":"4319406-5841340","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-247.webm","duration":5005,"startTime":25025,"timescale":1000},
    {"mediaRange":"5841341-6995924","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-247.webm","duration":5005,"startTime":30030,"timescale":1000},
    {"mediaRange":"6995925-9445371","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-247.webm","duration":5005,"startTime":35035,"timescale":1000},
    {"mediaRange":"9445372-10424516","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-247.webm","duration":5005,"startTime":40040,"timescale":1000},
    {"mediaRange":"10424517-11295500","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-247.webm","duration":5005,"startTime":45045,"timescale":1000},
    {"mediaRange":"11295501-12181474","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-247.webm","duration":5005,"startTime":50050,"timescale":1000},
    {"mediaRange":"12181475-13048475","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-247.webm","duration":5005,"startTime":55055,"timescale":1000},
    {"mediaRange":"13048476-14079840","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-247.webm","duration":5005,"startTime":60060,"timescale":1000},
    {"mediaRange":"14079841-15144250","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-247.webm","duration":5005,"startTime":65065,"timescale":1000},
    {"mediaRange":"15144251-16814555","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-247.webm","duration":5005,"startTime":70070,"timescale":1000},
    {"mediaRange":"16814556-18443775","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-247.webm","duration":5005,"startTime":75075,"timescale":1000},
    {"mediaRange":"18443776-19336143","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-247.webm","duration":5005,"startTime":80080,"timescale":1000},
    {"mediaRange":"19336144-20320978","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-247.webm","duration":5005,"startTime":85085,"timescale":1000},
    {"mediaRange":"20320979-21225326","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-247.webm","duration":5005,"startTime":90090,"timescale":1000},
    {"mediaRange":"21225327-22226570","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-247.webm","duration":5005,"startTime":95095,"timescale":1000},
    {"mediaRange":"22226571-23212197","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-247.webm","duration":5005,"startTime":100100,"timescale":1000},
    {"mediaRange":"23212198-24369420","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-247.webm","duration":5005,"startTime":105105,"timescale":1000},
    {"mediaRange":"24369421-25238176","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-247.webm","duration":5005,"startTime":110110,"timescale":1000},
    {"mediaRange":"25238177-26074950","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-247.webm","duration":5005,"startTime":115115,"timescale":1000},
    {"mediaRange":"26074951-26921859","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-247.webm","duration":5005,"startTime":120120,"timescale":1000},
    {"mediaRange":"26921860-27670811","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-247.webm","duration":5005,"startTime":125125,"timescale":1000},
    {"mediaRange":"27670812-27757851","media":"http://yt-dash-mse-test.commondatastorage.googleapis.com/media/feelings_vp9-20130806-247.webm","duration":5339,"startTime":130130,"timescale":1000}
  ]
];

/**
 * This function is for printing out debug info for cue validation
 *
 * @param result
 */
function printCue(result) {
  console.info("[");
  for (var i = 0; i < result.length; i++) {
    var endToken = "}";
    if (i < result.length - 1) {
      endToken += ",";
    }
    console.info("    {\"mediaRange\":" + "\"" + result[i].mediaRange + "\"" +
      ",\"media\":" + "\"" + result[i].media + "\"" +
      ",\"duration\":" + result[i].duration +
      ",\"startTime\":" + result[i].startTime +
      ",\"timescale\":" + result[i].timescale +
      endToken);

  }
  console.info("]");
}
