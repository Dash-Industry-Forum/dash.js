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
//This class parses the MPDs using DashParser framework.

if(window.location.href.indexOf("runner.html")>0)
{
    describe("Buffer Controller Suite", function () {
            var bufferController,
            context,
            obj,
            element,
            source,
            stream,
            system;
     
            beforeEach(function () {
                system = new dijon.System();
                system.mapValue("system", system); 
                system.mapOutlet("system");
                context = new Dash.di.DashContext();
                system.injectInto(context);
                source = "http://dashdemo.edgesuite.net/envivio/dashpr/clear/Manifest.mpd";
            });
            
           
            it("creating buffer controller object by setting  ready true and calling do start", function () {
                
                 stream=createObject(system,source); 

                 waitsFor(function () {
                   if(stream.manifestModel.getValue()!=undefined)
                    return true;
                   }, "data is null", 100);
                  runs(function () {
                        bufferController = system.getObject('bufferController');
                        currentTime = new Date();
                        var playlist=bufferController.metricsModel.addPlayList(bufferController.getType(), currentTime, 0, MediaPlayer.vo.metrics.PlayList.INITIAL_PLAY_START_REASON);
                        expect(playlist.starttype).toBe("initial_start");
                   });
                  // bufferController.start(); --Commented because already load is happening,
            });
            
             it("creating buffer controller object by setting started false and ready true", function () {
                 var result=false;
                 stream=createObject(system,source); 

                 manifestLoader = system.getObject('manifestLoader');
                 manifestLoader.load(source).then( function (manifestResult) {
                       stream.manifestModel.setValue(manifestResult);
                       result=true
                    });

                 waitsFor(function () {
                    if(result)
                       return true;
                      }, "data is null", 100);
                    runs(function () {
                        bufferController = system.getObject('bufferController');
                    });
            });
                
            it("creating buffer controller object by setting  ready true and calling do seek", function () {
                  stream=createObject(system,source); 

                  waitsFor(function () {
                    if(stream.manifestModel.getValue()!=undefined)
                     return true;
                    }, "data is null", 100);
                   runs(function () {
                        bufferController = system.getObject('bufferController')
                        //bufferController.seek(77.42845916748047); --Commented because already load is happening,
                       currentTime = new Date();
                       var playlist=bufferController.metricsModel.addPlayList(bufferController.getType(), currentTime, 0, MediaPlayer.vo.metrics.PlayList.SEEK_START_REASON);
                       expect(playlist.starttype).toBe("seek");
                  });
            });
            
            it("creating buffer controller object by setting  ready true and calling do stop", function () {
                    stream=createObject(system,source); 
                    waitsFor(function () {
                       if(stream.manifestModel.getValue()!=undefined)
                        return true;
                       }, "data is null", 100);
                    runs(function () {
                       bufferController = system.getObject('bufferController')
                       bufferController.stop();
                      currentTime = new Date();

                    });
            });
            
            //Negative test cases
            
            it("creating buffer controller object by setting  ready true and calling addPlayList method with out  type parameters", function () {
                 stream=createObject(system,source); 
                 waitsFor(function () {
                   if(stream.manifestModel.getValue()!=undefined)
                    return true;
                   }, "data is null", 100);
                  runs(function () {
                        bufferController = system.getObject('bufferController');
                        currentTime = new Date();
                        var playlist=bufferController.metricsModel.addPlayList("", currentTime, 0, MediaPlayer.vo.metrics.PlayList.INITIAL_PLAY_START_REASON);
                        expect(playlist.starttype).toBe("initial_start");
                   });
            });
            
            it("creating buffer controller object by setting  ready true and calling addPlayList method with out time and type parameters ", function () {
                 stream=createObject(system,source); 
                 waitsFor(function () {
                   if(stream.manifestModel.getValue()!=undefined)
                    return true;
                   }, "data is null", 100);
                  runs(function () {
                        bufferController = system.getObject('bufferController');
                        var playlist=bufferController.metricsModel.addPlayList("", null, 0, MediaPlayer.vo.metrics.PlayList.INITIAL_PLAY_START_REASON);
                        expect(playlist.starttype).toBe("initial_start");
                   });
            });
           
            it("creating buffer controller object by setting  ready true and calling addPlayList method with out time, seektarget and type parameters ", function () {
                 stream=createObject(system,source); 
                 waitsFor(function () {
                   if(stream.manifestModel.getValue()!=undefined)
                    return true;
                   }, "data is null", 100);
                  runs(function () {
                        bufferController = system.getObject('bufferController');
                        var playlist=bufferController.metricsModel.addPlayList("", null, null, MediaPlayer.vo.metrics.PlayList.INITIAL_PLAY_START_REASON);
                        expect(playlist.starttype).toBe("initial_start");
                   });
            });
            
            it("creating buffer controller object by setting  ready true and calling addPlayList with all parameters null", function () {
                 stream=createObject(system,source); 
                 waitsFor(function () {
                   if(stream.manifestModel.getValue()!=undefined)
                    return true;
                   }, "data is null", 100);
                  runs(function () {
                        bufferController = system.getObject('bufferController');
                        var playlist=bufferController.metricsModel.addPlayList("", null, null, null);
                        expect(playlist.starttype).toBe(null);
                   });
            });

            
      });
 
     
      function createObject(system,source) {
        "use strict";
        var element,video,stream;
        element = document.createElement('video');
        $(element).autoplay = true;
        video = system.getObject("videoModel");
        video.setElement($(element)[0]);

        stream = system.getObject("stream");
        stream.load(source);
        return stream;
        
      }
   }  
     
 
      
