/*
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * author Digital Primates
 * copyright dash-if 2012
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