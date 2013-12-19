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
    describe("Capabilities Suite", function () {
            var context,
                system,
                result,
                capabilitiesObj,
                flag;
               
                 beforeEach(function () {
                    system = new dijon.System();
                    system.mapValue("system", system);
                    system.mapOutlet("system");
                    context = new Dash.di.DashContext();
                    system.injectInto(context);
                    capabilitiesObj=system.getObject('capabilities');
					var element = document.createElement('video');
                    video = system.getObject("videoModel");
                    video.setElement(element);
                         
                    stream = system.getObject("stream");
                });
              
                it("supports Codec", function(){
					debugger;
                    stream.manifestModel.setValue(manifestRes);
						stream.manifestExt.getVideoData(manifestRes,0).then(
							function (videoData) {
								debugger;
								stream.manifestExt.getCodec(videoData).then(
									function (codec) {
										debugger;
										var result= stream.capabilities.supportsCodec(stream.videoModel.getElement(), codec)
										expect(result).toBe(true);
									});
						 });
                });
                   
                   it("supports Codec with manifestResult.Period_asArray[0].AdaptationSet_asArray as empty", function(){						
                        manifestRes.Period_asArray[0].AdaptationSet_asArray={};
						stream.manifestModel.setValue(manifestRes);
						stream.manifestExt.getVideoData(manifestRes,0).then(
							function (videoData) {
							   expect(videoData).not.toBe(null);
						});
                    });
                    
                    it("supports Codec with videoData as null", function(){
                        stream.manifestModel.setValue(manifestRes);
                        stream.manifestExt.getVideoData(manifestRes,0).then(
                        	function (videoData) {
                        	videoData = null;
                        	stream.manifestExt.getCodec(videoData).then(
                        		function (codec) {
                        		expect(codec).toBe(null);
                        	});
                        });
                    });
                    
                    it("supports MediaSource", function () {
                    	expect(capabilitiesObj.supportsMediaSource()).not.toBe(null);
                    });
                    it("supports MediaKeys", function () {
                    	expect(capabilitiesObj.supportsMediaKeys()).not.toBe(null);
                    });

                    it("supports Codec", function () {
                    	expect(function () {
                    		capabilitiesObj.supportsCodec(null, null, null)
                    	}).toThrow();
                    });
                  
        });
    }