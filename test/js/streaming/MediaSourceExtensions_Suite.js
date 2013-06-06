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

describe("MediaSourceExtensions Test Suite", function(){
	var extensions = null,
		codec = null,
		element = null;
	
	beforeEach(function(){
		extensions = new MediaPlayer.dependencies.MediaSourceExtensions();
		codec = 'video/mp4; codecs="avc1.4D400D"';
		element = document.createElement('video');		
	});
	
	it("attachMediaSource", function () {
		// set Element src to null ( since we test to ensure the source has been set )
		element.src = null;
		
		// since we do not care what the source is, we will pass in 
		// a new Blob object and make sure the element.src is not null.
		var source = new Blob();
		
		extensions.attachMediaSource(source, element);
		expect(element.src).not.toBeNull();
	});
	
	it("createMediaSource", function(){
		var promise,
			successResult = null,
			failureError = null,
			flag = false,
			success = function(result) {
				successResult = result;
				flag = true;
			},
			failure = function(error) {
				failureError = error;
				flag = true;
			};
			
		runs(function(){
			promise = extensions.createMediaSource();
			promise.then(success, failure);
		});
		
		waitsFor(function(){
			return flag
		}, "createMediaSource should have returned", 750);
		
		runs(function(){
			expect(successResult).not.toBeNull();
			expect(failureError).toBeNull();
		});
	});
});