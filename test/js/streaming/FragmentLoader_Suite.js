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
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE
 
describe("Fragment Loader Test Suite", function () {
            var fragmentLoader,
            context,
            source,
            flag,
            system;
 
            beforeEach(function () {
                            system = new dijon.System();
                            system.mapValue("system", system);
                            system.mapOutlet("system");
                            context = new Dash.di.DashContext();
                            system.injectInto(context);
                            source = "http://127.0.0.1:3000/test/js/utils/Manifest.mpd";
                            fragmentLoader = system.getObject('fragmentLoader');
    
              });
    
             it("Fragment Loader Load method ", function () {
               req=new MediaPlayer.vo.SegmentRequest();
                  req.action="download";
                  req.deffered=null;
                  req.duration=4;
                  req.range=null;
                  req.requestEndDate=null;
                  req.requestStartDate=null;
                  req.startTime=4;
                  req.streamType="audio";
                  req.timescale=48000;
                  req.type="Media Segment";
                  req.url=source;
                  
              var promise = null,
              success,
              successResult,
              failure;
                  
                success = function(result) {
                   successResult = result;
                   flag = true;
                  },
                failure = function(error) {
                   flag = false;
                  };
                runs(function(){
                  promise =  fragmentLoader.load(req);
                  promise.then(success, failure);
                 });
                 
                waitsFor(function(){
                  return flag;
                 },"",100);
                 
                runs(function(){
                  expect(successResult.request.action).toEqual("download");
                    });
            });
  });