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
 
 describe("BufferLengthController Test Suite", function(){
 	var bufferLengthController = null,
 		metrics = null;
 	
 	beforeEach(function(){
 		bufferLengthController = new MediaPlayer.dependencies.BufferLengthController();
 		metrics = new Stream.vo.StreamMetrics();
 	});
 	
 	it("shouldBufferMore | true", function(){
 		var promise = null,
 			bufferLength = 1000,
 			minBufferTime = 1500,
 			successResult = false,
 			flag = false,
			success = function(result) {
				successResult = result;
				flag = true;
			},
			failure = function(error) {
				flag = true;
			};
			
		runs(function(){
			promise = bufferLengthController.shouldBufferMore(bufferLength, minBufferTime, metrics);
			promise.then(success, failure);
		});
		
		waitsFor(function(){
			return flag;
		});
		
		runs(function(){
			expect(successResult).toEqual(true);
		});
 	});
 	
 	it("shouldBufferMore | false", function(){
 		var promise = null,
 			bufferLength = 2000,
 			minBufferTime = 1500,
 			successResult = false,
 			flag = false,
			success = function(result) {
				successResult = result;
				flag = true;
			},
			failure = function(error) {
				flag = true;
			};
 		
 		runs(function(){
			promise = bufferLengthController.shouldBufferMore(bufferLength, minBufferTime, metrics);
			promise.then(success, failure);
		});
		
		waitsFor(function(){
			return flag;
		});
		
		runs(function(){
			expect(successResult).toEqual(false);
		});
 	});
 });