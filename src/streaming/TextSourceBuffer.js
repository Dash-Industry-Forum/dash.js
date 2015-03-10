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
MediaPlayer.dependencies.TextSourceBuffer = function () {

    var mediaInfo,
        mimeType;

    return {
        system:undefined,
        eventBus:undefined,
        errHandler: undefined,

        initialize: function (type, bufferController) {
            mimeType = type;
            this.videoModel = bufferController.videoModel;
            mediaInfo = bufferController.streamProcessor.getCurrentTrack().mediaInfo;
            this.buffered =  this.system.getObject("customTimeRanges");
            this.initializationSegmentReceived= false;
            this.timescale= 90000;
        },
        append: function (bytes,appendedBytesInfo) {
            var self = this,
                result,
                label,
                lang,
                samplesInfo,
                i,
                ccContent;

            if(mimeType=="fragmentedText"){
                var fragmentExt;
                if(!this.initializationSegmentReceived){
                    this.initializationSegmentReceived=true;
                    label = mediaInfo.id;
                    lang = mediaInfo.lang;
                    this.textTrackExtensions=self.getTextTrackExtensions();
                    this.textTrackExtensions.addTextTrack(self.videoModel.getElement(), result, label, lang, true);
                    self.eventBus.dispatchEvent({type:MediaPlayer.events.TEXT_TRACK_ADDED});
                    fragmentExt = self.system.getObject("fragmentExt");
                    this.timescale= fragmentExt.getMediaTimescaleFromMoov(bytes.buffer);
                }else{
                    fragmentExt = self.system.getObject("fragmentExt");

                    samplesInfo=fragmentExt.getSamplesInfo(bytes.buffer);
                    for(i= 0 ; i<samplesInfo.length ;i++) {
                        if(!this.firstSubtitleStart){
                            this.firstSubtitleStart=samplesInfo[0].cts-appendedBytesInfo.startTime*this.timescale;
                        }
                        samplesInfo[i].cts-=this.firstSubtitleStart;
                        this.buffered.add(samplesInfo[i].cts/this.timescale,(samplesInfo[i].cts+samplesInfo[i].duration)/this.timescale);

                        ccContent=window.UTF8.decode(new Uint8Array(bytes.buffer.slice(samplesInfo[i].offset,samplesInfo[i].offset+samplesInfo[i].size)));
                        var parser = this.system.getObject("ttmlParser");
                        try{
                            result = parser.parse(ccContent);
                            this.textTrackExtensions.addCaptions(this.firstSubtitleStart/this.timescale,result);
                        } catch(e) {
                            //empty cue ?
                        }
                    }
                }
            }else{
                ccContent=window.UTF8.decode(bytes);
                try {
                    result = self.getParser().parse(ccContent);
                    label = mediaInfo.id;
                    lang = mediaInfo.lang;
                    self.getTextTrackExtensions().addTextTrack(self.videoModel.getElement(), result, label, lang, true);
                    self.eventBus.dispatchEvent({type:MediaPlayer.events.TEXT_TRACK_ADDED});
                } catch(e) {
                    self.errHandler.closedCaptionsError(e, "parse", ccContent);
                }
            }
        },

        abort:function() {
            this.getTextTrackExtensions().deleteCues(this.videoModel.getElement());
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
