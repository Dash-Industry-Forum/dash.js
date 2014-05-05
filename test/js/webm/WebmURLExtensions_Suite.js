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

// this file has 14 cues
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

        webmUrlExt = system.getObject("baseURLExt");
    });
    if(window.location.href.indexOf("_SpecRunner.html")>0) {
          describe("Webm url Extension Negative Test Suite", function(){
              it("loadSegments", function(){
                  var success,
                        successResult,
                        i,
                        failure,
                        flag=false;
                  runs(function () {
                      for (i = 0; i < files.length; i++) {
                          success = function(result) {
                              successResult = result;
                              flag = true;
                              expect(flag).toEqual(true);
                              expect(result.length).toEqual(files[i].cues);
                          };
                          failure = function(error) {
                              flag = false;
                              expect(flag).toEqual(false);
                          };

                          webmUrlExt.loadSegments(webmTestUrl + files[i].name, files[i].range)
                            .then(success, failure);

                          waitsFor(function () {
                              // if this triggers it means an exception was thrown
                              return flag;
                          }, "wait for cues to finish parsing", 500);
                      }
                  });
              });
          });
      }
    it("Creating and assigning segment ", function(){
       var objSegment  = new Dash.vo.Segment();
       expect(objSegment.index).toBeNull();
    });
});