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
    var currentTrackIdx = 0,
        allTracksAreDisabled = false,
        parser = null,

        onTextTrackChange = function(evt) {
            for (var i = 0; i < evt.srcElement.length; i++ ) {
                var t = evt.srcElement[i],
                    el = this.videoModel.getElement();

                allTracksAreDisabled = t.mode !== "showing";
                if (t.mode === "showing" && el.currentTime > 0) { //TODO find a better way to block function when event is triggered at startup when listener is added.  Tried to delay adding listener.
                    if (currentTrackIdx !== i) { // do not reset track if already the current track.  This happens when all captions get turned off via UI and then turned on again.
                        currentTrackIdx = i;
                        this.textTrackExtensions.setCurrentTrackIdx(i);
                        this.textTrackExtensions.deleteTrackCues(this.textTrackExtensions.getCurrentTextTrack());
                        this.fragmentModel.cancelPendingRequests();
                        this.fragmentModel.abortRequests();
                        this.buffered.clear();
                        this.mediaController.setTrack(this.allTracks[i]);
                    }
                    break;
                }
             }
        };

    return {
        system:undefined,
        videoModel: undefined,
        eventBus:undefined,
        errHandler: undefined,
        adapter: undefined,
        manifestExt:undefined,
        mediaController:undefined,
        streamController:undefined,

        initialize: function (type, bufferController) {
            this.sp = bufferController.streamProcessor;
            this.mediaInfos = this.sp.getMediaInfoArr();
            this.textTrackExtensions = this.system.getObject("textTrackExtensions");
            this.isFragmented = !this.manifestExt.getIsTextTrack(type);
            if (this.isFragmented){
                // do not call following if not fragmented text....
                this.fragmentModel = this.sp.getFragmentModel();
                this.buffered =  this.system.getObject("customTimeRanges");
                this.initializationSegmentReceived= false;
                this.timescale= 90000;
                this.allTracks = this.mediaController.getTracksFor("fragmentedText", this.streamController.getActiveStreamInfo());
            }
        },

        append: function (bytes, chunk) {
            var self = this,
                result,
                samplesInfo,
                i,
                ccContent,
                mediaInfo = chunk.mediaInfo,
                mediaType = mediaInfo.type,
                mimeType = mediaInfo.mimeType;

            function createTextTrackFromMediaInfo(captionData, mediaInfo) {
                var textTrackInfo = new MediaPlayer.vo.TextTrackInfo();
                textTrackInfo.captionData = captionData;
                textTrackInfo.lang = mediaInfo.lang;
                textTrackInfo.label = mediaInfo.id;
                textTrackInfo.video = self.videoModel.getElement();
                textTrackInfo.defaultTrack = self.getIsDefault(mediaInfo);
                textTrackInfo.isFragmented = self.isFragmented;
                textTrackInfo.role = (mediaInfo.roles.length > 0) ? mediaInfo.roles[0] : null;
                self.textTrackExtensions.addTextTrack(textTrackInfo, self.mediaInfos.length);
                self.eventBus.dispatchEvent({type:MediaPlayer.events.TEXT_TRACK_ADDED});
            }

            if (allTracksAreDisabled) return;

            if(mediaType === "fragmentedText"){
                var fragmentExt = self.system.getObject("fragmentExt");
                if(!this.initializationSegmentReceived){
                    this.initializationSegmentReceived=true;
                    for (i = 0; i < this.mediaInfos.length; i++){
                        createTextTrackFromMediaInfo(null, this.mediaInfos[i]);
                    }
                    self.videoModel.getElement().textTracks.addEventListener('change', onTextTrackChange.bind(self));
                    this.timescale = fragmentExt.getMediaTimescaleFromMoov(bytes);
                }else {
                    samplesInfo = fragmentExt.getSamplesInfo(bytes);
                    for(i= 0 ; i < samplesInfo.length ; i++) {
                        if(!this.firstSubtitleStart){
                            this.firstSubtitleStart = samplesInfo[0].cts-chunk.start*this.timescale;
                        }
                        samplesInfo[i].cts -= this.firstSubtitleStart;
                        this.buffered.add(samplesInfo[i].cts/this.timescale,(samplesInfo[i].cts+samplesInfo[i].duration)/this.timescale);

                        //TODO: If do not block here captions will render even though all tracks are hidden.
                        // If I block above this line we get errors in Virtual Buffer. Ideally I need to figure
                        // out how to stop text fragments fom loading when they are not being rendered. But so
                        // far all attempts to do this result in all media stopping.


                        ccContent = window.UTF8.decode(new Uint8Array(bytes.slice(samplesInfo[i].offset,samplesInfo[i].offset+samplesInfo[i].size)));
                        parser = parser !== null ? parser : self.getParser(mimeType); //store locally for fragmented text so we do not fetch from dijon over and over again.
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
            return mediaInfo.index === this.mediaInfos[0].index; //TODO How to tag default. currently same order as in manifest. Is there a way to mark a text adaptation set as the default one?
        },

        abort:function() {
            this.videoModel.getElement().textTracks.removeEventListener('change', onTextTrackChange);
            this.textTrackExtensions.deleteAllTextTracks();
            allTracksAreDisabled = false;
            currentTrackIdx = 0;
            parser = null;
        },

        getParser:function(mimeType) {
            var parser;
            if (mimeType === "text/vtt") {
                parser = this.system.getObject("vttParser");
            } else if (mimeType === "application/ttml+xml" || mimeType === "application/mp4") {
                parser = this.system.getObject("ttmlParser");
            }
            return parser;
        },

        getAllTracksAreDisabled : function (){
            return allTracksAreDisabled;
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
