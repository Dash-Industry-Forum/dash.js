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
MediaPlayer.dependencies.TextSourceBuffer = function () {

    var video,
        data,
        mimeType;

    return {
        system:undefined,
        eventBus:undefined,
        errHandler: undefined,

        initialize: function (type, bufferController) {
            mimeType = type;
            video = bufferController.getVideoModel().getElement();
            data = bufferController.getData();
        },

        append: function (bytes) {
            var self = this,
                ccContent = String.fromCharCode.apply(null, new Uint16Array(bytes));

            self.getParser().parse(ccContent).then(
                function(result)
                {
                    var label = data.Representation_asArray[0].id,
                        lang = data.lang;

                    self.getTextTrackExtensions().addTextTrack(video, result, label, lang, true).then(
                        function(/*track*/)
                        {
                            self.eventBus.dispatchEvent({type:"updateend"});
                        }
                    );
                },
                function(errMsg) {
                    self.errHandler.closedCaptionsError(errMsg, "parse", ccContent);
                }
            );
        },

        abort:function() {
            this.getTextTrackExtensions().deleteCues(video);
        },

        getParser:function() {
            var parser;

            if (mimeType === "text/vtt") {
                parser = this.system.getObject("vttParser");
            } else if (mimeType === "application/ttml+xml") {
                parser = this.system.getObject("ttmlParser");
            }

            return parser;
        },

        getTextTrackExtensions:function() {
            return this.system.getObject("textTrackExtensions");
        },

        addEventListener: function (type, listener, useCapture) {
            this.eventBus.addEventListener(type, listener, useCapture);
        },

        removeEventListener: function (type, listener, useCapture) {
            this.eventBus.removeEventListener(type, listener, useCapture);
        }
    };
};

MediaPlayer.dependencies.TextSourceBuffer.prototype = {
    constructor: MediaPlayer.dependencies.TextSourceBuffer
};
