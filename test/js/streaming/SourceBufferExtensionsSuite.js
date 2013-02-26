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
 * copyright Digital Primates 2012
 */
 
 describe("SourceBufferExtensions Test Suite", function() {
 	var codec = null, 
 		sourceBufferExtension = null;
 	
 	beforeEach(function(){
 		codec = 'video/mp4; codecs="avc1.4D400D"';
 		sourceBufferExtension = new MediaPlayer.dependencies.SourceBufferExtensions();
 	});
 	
 	it("createSourceBuffer", function(){
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
 	
 	xit("getBufferLength", function(){
 		var buffer = null,
 			time = null,
 			result = sourceBufferExtension.getBufferLength(buffer, time);
 		
 		expect(result).not.toBeNull();
 	});
 	
 	xit("append", function(){
 		var buffer = null,
 			expectedBuffer = null,
 			bytes = null;
 			
 		sourceBufferExtension.append(buffer, bytes);
 		expect(buffer).toEqual(expectedBuffer);
 	});
 });