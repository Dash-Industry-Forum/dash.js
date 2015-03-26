/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.dependencies.TextController = function () {

     var initialized = false,
         mediaSource,
         buffer,
         type,

         onDataUpdateCompleted = function(/*e*/) {
             if (!initialized) {
                 if (buffer.hasOwnProperty('initialize')) {
                     buffer.initialize(type, this);
                 }
                 initialized = true;
             }
             this.notify(MediaPlayer.dependencies.TextController.eventList.ENAME_CLOSED_CAPTIONING_REQUESTED, {CCIndex: 0});
         },

         onInitFragmentLoaded = function (e) {
             var self = this;

             if (e.data.fragmentModel !== self.streamProcessor.getFragmentModel()) return;

             if (e.data.bytes !== null) {
                 //self.log("Push text track bytes: " + data.byteLength);
                 self.sourceBufferExt.append(buffer, e.data.bytes, self.videoModel);
             }
         };

    return {
        sourceBufferExt: undefined,
        log: undefined,
        system: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        setup: function() {
            this[Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED] = onDataUpdateCompleted;
            this[MediaPlayer.dependencies.FragmentController.eventList.ENAME_INIT_FRAGMENT_LOADED] = onInitFragmentLoaded;
        },

        initialize: function (typeValue, buffer, source, streamProcessor) {
            var self = this;

            type = typeValue;
            self.setBuffer(buffer);
            self.setMediaSource(source);
            self.videoModel = streamProcessor.videoModel;
            self.trackController = streamProcessor.trackController;
            self.streamProcessor = streamProcessor;
        },

        getBuffer: function () {
            return buffer;
        },

        setBuffer: function (value) {
            buffer = value;
        },

        setMediaSource: function(value) {
            mediaSource = value;
        },

        reset: function (errored) {
            if (!errored) {
                this.sourceBufferExt.abort(mediaSource, buffer);
                this.sourceBufferExt.removeSourceBuffer(mediaSource, buffer);
            }
        }
    };
};

MediaPlayer.dependencies.TextController.prototype = {
    constructor: MediaPlayer.dependencies.TextController
};

MediaPlayer.dependencies.TextController.eventList = {
    ENAME_CLOSED_CAPTIONING_REQUESTED: "closedCaptioningRequested"
};