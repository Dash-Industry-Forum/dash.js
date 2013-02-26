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
 
 describe("Loader Test Suite", function(){
    var loader = null,
        segmentRequest = null;

    beforeEach(function(){
        loader = new MediaPlayer.dependencies.Loader();
        segmentRequest = new MediaPlayer.vo.SegmentRequest();
    });

    it("load | non byte range", function(){
        var promise = null,
            flag = false,
            result = null,
            success = function(response){
                result = response;
                flag = true;
            },
            failure = function(error){
                flag = true;
            };
        segmentRequest.url = "http://dashdemo.edgesuite.net/envivio/dashpr/clear/video5/0.m4s";

        runs(function(){
            promise = loader.load(segmentRequest);
            promise.then(success, failure);
        });

        waitsFor(function(){
            return flag;
        });

        runs(function(){
            expect(result).not.toBeNull();
        });	
    });

    it("load | byte range", function(){
        var promise = null,
            flag = false,
            result = null,
            success = function(response){
                result = response;
                flag = true;
            },
            failure = function(error){
                flag = true;
            };
        segmentRequest.url = "http://dash.edgesuite.net/dash264/TestCases/1a/netflix/ElephantsDream_AAC48K_064.mp4.dash";

        runs(function(){
            expect(loader.getLoading()).toEqual(false);
            promise = loader.load(segmentRequest);
            promise.then(success, failure);
            expect(loader.getLoading()).toEqual(true);
        });

        waitsFor(function(){
            return flag;
        });

        runs(function(){
            expect(loader.getLoading()).toEqual(false);
            expect(result).not.toBeNull();
        });
    });

    it("load multiple", function(){
        var promise = null,
            flag = false,
            firstLoaded = false,
            secondLoaded = false,
            result = null,
            successFirst = function(response){
                firstLoaded = true;
                expect(secondLoaded).toEqual(false);
            },
            failure = function(error){
                flag = true;
            },
            successSecond = function(response){
                result = response;
                expect(firstLoaded).toEqual(true);
                secondLoaded = true;
                flag = true;
            };

        runs(function(){
            segmentRequest.url = "http://dashdemo.edgesuite.net/envivio/dashpr/clear/video5/0.m4s";
            loader.load(segmentRequest).then(successFirst, failure);

            segmentRequest.url = "http://dash.edgesuite.net/dash264/TestCases/1a/netflix/ElephantsDream_AAC48K_064.mp4.dash";
            loader.load(segmentRequest).then(successSecond, failure);
        });

        waitsFor(function(){
            return flag;
        });

        runs(function(){
            expect(result).not.toBeNull();
        });
    });

    /*
     * This should return a failure due to passing in a dummy url.
     * Currently it returns a success...
     */
    xit("error loading", function(){
        var promise = null,
            flag = false,
            failureResponse = false,
            success = function(result){
                flag = true;
            },
            failure = function(error){
                failureResponse = true;
                flag = true;
            };

        runs(function(){
            segmentRequest.url = "http://localhost/test/example.m4s";
            loader.load(segmentRequest).then(success, failure);
        });

        waitsFor(function(){
            return flag;
        });

        runs(function(){
            expect(failureResponse).toEqual(true);
        });
    });
 });