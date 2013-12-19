/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 * 
 * Copyright (c) 2013, Digital Primates
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
 
 describe("SourceBufferExtensions Test Suite", function() {
 	var codec = null,
		bufferController,
		system,
		context,
		mediaSource,
		video,
		element,
		buffer,
		bufferTime = "PT5.001S";
		minBufferTime = 0, 
		mediaSourceExt = null,
		bufferExt = null,
 		sourceBufferExtension = null;
 	
 	beforeEach(function(){
		debugger;
		system = new dijon.System();
		system.mapValue("system", system);
		system.mapOutlet("system");
		context = new Dash.di.DashContext();
		system.injectInto(context);	
		
 		codec = 'video/mp4; codecs="avc1.4D400D"';
 		sourceBufferExtension = new MediaPlayer.dependencies.SourceBufferExtensions();
		bufferController = system.getObject('bufferController');
		mediaSourceExt = system.getObject('mediaSourceExt');
		bufferExt = system.getObject('bufferExt');	
	
 	});
 	
	
 	 it("createSourceBuffer - check if its called with actual input", function(){
 		 var mediaSource = jasmine.createSpyObj('mediaSource', ['addSourceBuffer']),
			 flag = false,
			success = function(result) {
				 flag = true;
			 },
			 failure = function(error) {
				flag = true;
			 };
 		
 		runs(function(){			
 			promise = sourceBufferExtension.createSourceBuffer(mediaSource, codec);
 			promise.then(success, failure);
 		});
 		
 		waitsFor(function(){
 			return flag;
 		});
 		
 		runs(function(){
 			expect(mediaSource.addSourceBuffer).toHaveBeenCalledWith(codec);
 		});
 	 });
	
	if(window.location.href.indexOf("runner.html")>0)
	{
	
		 it("createSourceBuffer", function(){
			debugger;

				var flag = false,
				success = function(result) {
					flag = true;
				},
				failure = function(error) {
					flag = true;
				};
				 
			mediaSource = InitMediaSource();
			
			waits(1000);			
			waitsFor(function () {
			if(mediaSource != undefined)
				return true;		
			}, "data is null", 100);
				 
			runs(function(){
				promise = sourceBufferExtension.createSourceBuffer(mediaSource, codec);
				promise.then(success, failure);
			});
			
			waitsFor(function(){
				return flag;
			});
			
			runs(function(){
				expect(flag).toBeTruthy();
			});
		 }); 
		 
		 it("check buffer Range", function(){
			debugger;
			
			mediaSource = InitMediaSource();
			
			waits(1000);			
			waitsFor(function () {
			if(mediaSource != undefined)
				return true;		
			}, "data is null", 100);
			
			runs(function(){
				debugger;
				sourceBufferExtension.createSourceBuffer(mediaSource, codec).then(function(result){				
					buffer = result;										
				});
				waitsFor(function(){
					if(buffer != undefined) return true;
				},"data null",100);
				runs(function(){
					debugger;
					var res = sourceBufferExtension.getBufferRange(buffer,0);
					expect(res).not.toBe(null);
				});
			});	
		}); 
	}
	 
	/**
 	it("getBufferLength", function(){
		debugger;
 		var buffer = null,
 			time = null,
 			result;
			
		mediaSource = InitMediaSource();
		
		waits(1000);			
		waitsFor(function () {
		if(mediaSource != undefined)
			return true;		
		}, "data is null", 100);
		
		sourceBufferExtension.createSourceBuffer(mediaSource, codec).then(function(result){				
			buffer = result;										
		});
		waitsFor(function(){
			if(buffer != undefined) return true;
		},"data null",100);
		runs(function(){
			result = sourceBufferExtension.getBufferLength(buffer, time);
			expect(result).not.toBeNull();
		});
 	}); 
 	
 	it("append", function(){
		debugger;
 		var buffer = null,
 			expectedBuffer = null,
 			bytes = null;
 			
 		sourceBufferExtension.append(buffer, bytes);
 		expect(buffer).toContains(expectedBuffer);
 	}); */
	
	it("abort", function(){
 		var buffer = null,
 			expectedBuffer = null,
 			bytes = null;
 			
 		sourceBufferExtension.abort(buffer);
 		expect(buffer).toEqual(expectedBuffer);
 	}); 
	
	function InitMediaSource()
	{
		element = document.createElement('video');
		$(element).autoplay = true;
		video = system.getObject("videoModel");
		video.setElement($(element)[0]);	
		
		mediaSourceExt.createMediaSource().then(function(source){
			mediaSource = source;	
			mediaSourceExt.attachMediaSource(mediaSource, video);
		});
		return mediaSource;
	
	}
	
 });