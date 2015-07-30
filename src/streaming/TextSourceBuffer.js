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


    return {
        system:undefined,
        videoModel: undefined,
        eventBus:undefined,
        errHandler: undefined,
        adapter: undefined,

        initialize: function (type, bufferController) {
            this.mediaInfos = bufferController.streamProcessor.getMediaInfoArr();
            this.buffered =  this.system.getObject("customTimeRanges");
            this.textTrackExtensions = this.system.getObject("textTrackExtensions");
            this.initializationSegmentReceived= false;
            this.timescale= 90000;
            this.initLoad = false
        },

        onTextTrackChange : function(evt){
            // notify event to change adaptations and when changed set this.initializationSegmentReceived to true so init segment gets inserted
            console.log(evt.target.currentTarget)
        },

        append: function (bytes, chunk) {
            var self = this,
                result,
                samplesInfo,
                i,
                ccContent,
                mediaInfo = chunk.mediaInfo,
                mimeType = mediaInfo.type === "fragmentedText" ? mediaInfo.type : mediaInfo.mimeType;

            function createTextTrackFromMediaInfo(captionData, mediaInfo){
                var textTrackInfo = new MediaPlayer.vo.TextTrackInfo();
                textTrackInfo.captionData = captionData;
                textTrackInfo.lang = mediaInfo.lang;
                textTrackInfo.label = mediaInfo.id;
                textTrackInfo.video = self.videoModel.getElement();
                textTrackInfo.defaultTrack = self.getIsDefault(mediaInfo);
                self.textTrackExtensions.addTextTrack(textTrackInfo, self.mediaInfos.length);
                self.eventBus.dispatchEvent({type:MediaPlayer.events.TEXT_TRACK_ADDED});
            }

            if(mimeType=="fragmentedText"){
                var fragmentExt;
                if(!this.initializationSegmentReceived){
                    this.initializationSegmentReceived=true;

                    if (!this.initLoad) {
                        this.initLoad = true;
                        for (i = 0; i < this.mediaInfos.length; i++){
                            createTextTrackFromMediaInfo(null, this.mediaInfos[i]);
                        }

                        self.videoModel.getElement().textTracks.addEventListener('change', self.onTextTrackChange);
                    }

                    //Need a way to alert that is init bytes for text track to get timescale.  Not sure how this should work just yet. Needs to move into else statement.
                    fragmentExt = self.system.getObject("fragmentExt");
                    this.timescale = fragmentExt.getMediaTimescaleFromMoov(bytes);

                }else{

                    fragmentExt = self.system.getObject("fragmentExt");
                    samplesInfo = fragmentExt.getSamplesInfo(bytes);
                    for(i= 0 ; i < samplesInfo.length ; i++) {
                        if(!this.firstSubtitleStart){
                            this.firstSubtitleStart = samplesInfo[0].cts-chunk.start*this.timescale;
                        }
                        samplesInfo[i].cts -= this.firstSubtitleStart;
                        this.buffered.add(samplesInfo[i].cts/this.timescale,(samplesInfo[i].cts+samplesInfo[i].duration)/this.timescale);
                        ccContent = window.UTF8.decode(new Uint8Array(bytes.slice(samplesInfo[i].offset,samplesInfo[i].offset+samplesInfo[i].size)));
                        var parser = self.getParser(mimeType);
                        try{
                            result = parser.parse(ccContent);
                            this.textTrackExtensions.addCaptions(this.firstSubtitleStart/this.timescale,result);
                        } catch(e) {
                            //empty cue ?
                        }
                    }
                }
            }else{
                bytes = new Uint8Array(bytes);
                ccContent=window.UTF8.decode(bytes);
                try {
                    result = self.getParser(mimeType).parse(ccContent);
                    createTextTrackFromMediaInfo(result, mediaInfo);
                } catch(e) {
                    self.errHandler.closedCaptionsError(e, "parse", ccContent);
                }
            }
        },

        getIsDefault:function(mediaInfo){
            return mediaInfo.lang === this.mediaInfos[0].lang; //TODO How to tag default. currently same order as in manifest. Is there a way to mark a text adaptation set as the default one?
        },

        abort:function() {
            this.textTrackExtensions.deleteCues(this.videoModel.getElement());
        },

        getParser:function(mimeType) {
            var parser;

            if (mimeType === "text/vtt") {
                parser = this.system.getObject("vttParser");
            } else if (mimeType === "application/ttml+xml" || "fragmentedText") {
                parser = this.system.getObject("ttmlParser");
            }

            return parser;
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
