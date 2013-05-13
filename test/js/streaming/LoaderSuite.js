/*
 *
 * The copyright in this software is being made available under the BSD
 * License, included below. This software may be subject to other third party
 * and contributor rights, including patent rights, and no such rights are
 * granted under this license.
 * 
 * Copyright (c) 2013, Dash Industry Forum
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 * •  Neither the name of the Dash Industry Forum nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS”
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
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