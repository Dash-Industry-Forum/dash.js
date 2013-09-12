/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Akamai Technologies
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Akamai Technologies nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.dependencies.TextController = function () {

     var LOADING = "LOADING",
         //LOADED = "LOADED",
         READY = "READY",
         initialized = false,
         periodIndex = -1,
         data,
         buffer,
         state = READY,
         setState = function (value) {
             this.debug.log("TextController setState to:" + value);
             state = value;
         },
         startPlayback = function () {

             if (!initialized || state !== READY) {
                 return;
             }

             var self = this;
             setState.call(self, LOADING);
            // TODO Multiple tracks can be handled here by passing in quality level.
             self.indexHandler.getInitRequest(0, data).then(
                 function (request) {
                     self.debug.log("Loading text track initialization: " + request.url);
                     self.debug.log(request);
                     self.fragmentLoader.load(request).then(onBytesLoaded.bind(self, request), onBytesError.bind(self, request));
                     setState.call(self, LOADING);
                 }
             );
         },
         doStart = function () {
             startPlayback.call(this);
         },

         onBytesLoaded = function (request, response) {
             var self = this;
             self.debug.log(" Text track Bytes finished loading: " + request.url);
             self.fragmentController.process(response.data).then(
                 function (data) {
                     if (data !== null) {
                         self.debug.log("Push text track bytes: " + data.byteLength);
                         self.sourceBufferExt.append(buffer, data, self.videoModel);
                     }
                 }
             );
         },

         onBytesError = function (request) {
             this.errHandler.downloadError("Error loading text track" + request.url);
         };

    return {
        videoModel: undefined,
        fragmentLoader: undefined,
        fragmentController: undefined,
        indexHandler: undefined,
        sourceBufferExt: undefined,
        debug: undefined,
        initialize: function (periodIndex, data, buffer, videoModel) {
            var self = this;

            self.setVideoModel(videoModel);
            self.setPeriodIndex(periodIndex);
            self.setData(data);
            self.setBuffer(buffer);

            initialized = true;
        },

        getPeriodIndex: function () {
            return periodIndex;
        },

        setPeriodIndex: function (value) {
            periodIndex = value;
        },

        getVideoModel: function () {
            return this.videoModel;
        },

        setVideoModel: function (value) {
            this.videoModel = value;
        },

        getData: function () {
            return data;
        },

        setData: function (value) {
            data = value;
        },

        getBuffer: function () {
            return buffer;
        },

        setBuffer: function (value) {
            buffer = value;
        },
        start: doStart
    };
};

MediaPlayer.dependencies.TextController.prototype = {
    constructor: MediaPlayer.dependencies.TextController
};

