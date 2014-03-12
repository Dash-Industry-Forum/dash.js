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


//This class parses the MPDs using DashParser framework


describe("AbrController Suite", function () {
        var context,
            system,
            result,
            abrController,
            data={},
			baseUrl="http://dash.edgesuite.net/envivio/dashpr/clear/Manifest.mpd",
            flag;
           
             beforeEach(function () {
                system = new dijon.System();
                system.mapValue("system", system);
                system.mapOutlet("system");
                context = new Dash.di.DashContext();
                system.injectInto(context);
                abrController=system.getObject("abrController");
                                
                data.BaseURL=baseUrl;
                var objSegmentTemplate={};
                objSegmentTemplate.__cnt= 6;
                objSegmentTemplate.duration=360000;
                objSegmentTemplate.initialization="$RepresentationID$/Header.m4s";
                objSegmentTemplate.media="$RepresentationID$/$Number$.m4s";
                objSegmentTemplate.presentationTimeOffset=0;
                objSegmentTemplate.startNumber=0;
                objSegmentTemplate.timescale=90000;
                var objRepresentation=[];
                var objSubRepresentation=[];
                objSubRepresentation.BaseURL=baseUrl;
                objSubRepresentation.SegmentTemplate=objSegmentTemplate;
                objSubRepresentation.__cnt=8;
                objSubRepresentation.bandwidth=349952;
                objSubRepresentation.codecs="avc1.4D400D";
                objSubRepresentation.frameRate=25;
                objSubRepresentation.height=180;
                objSubRepresentation.id="video5";
                objSubRepresentation.mimeType="video/mp4";
                objSubRepresentation.sar="1:1";
                objSubRepresentation.scanType= "progressive";
                objSubRepresentation.width=  320;
                objRepresentation.push(objSubRepresentation);
                var objSubRepresentation=[];
                objSubRepresentation.BaseURL=baseUrl;
                objSubRepresentation.SegmentTemplate=objSegmentTemplate;
                objSubRepresentation.__cnt=8;
                objSubRepresentation.bandwidth=600000;
                objSubRepresentation.codecs= "avc1.4D4015";
                objSubRepresentation.frameRate=25;
                objSubRepresentation.height= 270;
                objSubRepresentation.id="video4";
                objSubRepresentation.mimeType="video/mp4";
                objSubRepresentation.sar="1:1";
                objSubRepresentation.scanType= "progressive";
                objSubRepresentation.width=  480;
                objRepresentation.push(objSubRepresentation);
                var objSubRepresentation=[];
                objSubRepresentation.BaseURL=baseUrl;
                objSubRepresentation.SegmentTemplate=objSegmentTemplate;
                objSubRepresentation.__cnt=8;
                objSubRepresentation.bandwidth=1000000;
                objSubRepresentation.codecs= "avc1.4D401E";
                objSubRepresentation.frameRate=25;
                objSubRepresentation.height= 396;
                objSubRepresentation.id="video3";
                objSubRepresentation.mimeType="video/mp4";
                objSubRepresentation.sar="1:1";
                objSubRepresentation.scanType= "progressive";
                objSubRepresentation.width=  704;
                objRepresentation.push(objSubRepresentation);
                var objSubRepresentation=[];
                objSubRepresentation.BaseURL=baseUrl;
                objSubRepresentation.SegmentTemplate=objSegmentTemplate;
                objSubRepresentation.__cnt=8;
                objSubRepresentation.bandwidth= 2000000;
                objSubRepresentation.codecs= "avc1.4D401F";
                objSubRepresentation.frameRate=25;
                objSubRepresentation.height=  576;
                objSubRepresentation.id="video2";
                objSubRepresentation.mimeType="video/mp4";
                objSubRepresentation.sar="1:1";
                objSubRepresentation.scanType= "progressive";
                objSubRepresentation.width=   1024;
                objRepresentation.push(objSubRepresentation);
                var objSubRepresentation=[];
                objSubRepresentation.BaseURL=baseUrl;
                objSubRepresentation.SegmentTemplate=objSegmentTemplate;
                objSubRepresentation.__cnt=8;
                objSubRepresentation.bandwidth= 3000000;
                objSubRepresentation.codecs= "avc1.4D4020";
                objSubRepresentation.frameRate=25;
                objSubRepresentation.height=  720;
                objSubRepresentation.id="video1";
                objSubRepresentation.mimeType="video/mp4";
                objSubRepresentation.sar="1:1";
                objSubRepresentation.scanType= "progressive";
                objSubRepresentation.width=   1280;
                objRepresentation.push(objSubRepresentation);
                data.Representation=objRepresentation;
                data.Representation_asArray=objRepresentation;
                data.SegmentTemplate=objSegmentTemplate;
                data.SegmentTemplate_asArray=objSegmentTemplate;
                data.__cnt= 20;
                data.__text= "";
                data.maxFrameRate=25;
                data.maxHeight= 720;
                data.maxWidth= 1280;
                data.mimeType= "video/mp4";
                data.par= "16:9";
                data.segmentAlignment= "true";
                data.startWithSAP= 1;
            });


 
       it("getPlaybackQuality", function(){
				debugger;
                var promise = null,
                  success,
                  successResult,
                  failure;
 
                  flag=false; 
                  success = function(result) {
				   debugger;
                   successResult = result;
                   flag = true;
                  },
                  failure = function(error) {
				  debugger;
                   flag = false;
                  };

                 runs(function(){
				debugger;
                  promise =  abrController.getPlaybackQuality("video",data);
                  promise.then(success, failure);
	                 });
                 
                  // waitsFor(function(){
				  // if (flag) return true;	  
                  
                 // },"data null",100);
                 
                 // runs(function(){
					// debugger;
                     // //expect(successResult.quality).toEqual(0);
                  // });
        });
        
         it("getPlaybackQuality with type as null", function(){
                    var promise = null,
                      success,
                      successResult,
                      failure;
     
                      flag=false; 
                      success = function(result) {
                       successResult = result;
                       flag = true;
                      },
                      failure = function(error) {
                       flag = false;
                      };

                     runs(function(){
                      promise =  abrController.getPlaybackQuality(null,data);
                      promise.then(success, failure);
                      expect(successResult).toEqual(undefined);
                     });
 
            });
 
       
			it("setAutoSwitchBitrate and getAutoSwitchBitrate", function(){
			  abrController.setAutoSwitchBitrate(5);
			  expect(abrController.getAutoSwitchBitrate()).toEqual(5);
			});  
        
       
       
		   it("setPlaybackQuality and getQualityFor", function(){
				  abrController.setPlaybackQuality("audio",1);
				  expect(abrController.getQualityFor("audio")).toEqual(1);
			});
        
        if(window.location.href.indexOf("runner.html")==0)
        {
            describe("Abr Controller Negative Test Suite", function(){
              it("getPlaybackQuality with type and data as null", function(){
                    var promise = null,
                      success,
                      successResult,
                      failure;
     
                      flag=false; 
                      success = function(result) {
                       successResult = result;
                       flag = true;
                      },
                      failure = function(error) {
                       flag = false;
                      };

                     runs(function(){
                      promise =  abrController.getPlaybackQuality(null,null);
                      promise.then(success, failure);
                      expect(successResult).toEqual(null);
                     });
               });
        
                it("getPlaybackQuality with  data as null", function(){
                        var promise = null,
                          success,
                          successResult,
                          failure;
         
                          flag=false; 
                          success = function(result) {
                           successResult = result;
                           flag = true;
                          },
                          failure = function(error) {
                           flag = false;
                          };

                         runs(function(){
                          promise =  abrController.getPlaybackQuality('video',null);
                          promise.then(success, failure);
                          expect(successResult).toEqual(null);
                         });
                });
                
                
               
            });
       }
   });