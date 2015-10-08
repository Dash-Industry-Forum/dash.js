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
    var allTracksAreDisabled = false,
        parser = null,

        setTextTrack = function() {
            var el = this.videoModel.getElement(),
                tracks = el.textTracks,
                ln = tracks.length,
                self = this;

            for (var i = 0; i < ln; i++ ) {
                var track = tracks[i];
                allTracksAreDisabled = track.mode !== "showing";
                if (track.mode === "showing") {
                    if (self.textTrackExtensions.getCurrentTrackIdx() !== i) { // do not reset track if already the current track.  This happens when all captions get turned off via UI and then turned on again and with videojs.
                        self.textTrackExtensions.setCurrentTrackIdx(i);
                        if (self.isFragmented) {
                            if (!self.mediaController.isCurrentTrack(self.allTracks[i])) {
                                self.textTrackExtensions.deleteTrackCues(self.textTrackExtensions.getCurrentTextTrack());
                                self.fragmentModel.cancelPendingRequests();
                                self.fragmentModel.abortRequests();
                                self.buffered.clear();
                                self.mediaController.setTrack(self.allTracks[i]);
                            }
                        }
                    }
                    break;
                }
            }

            if (allTracksAreDisabled){
                self.textTrackExtensions.setCurrentTrackIdx(-1);
            }
        };

    return {
        system:undefined,
        videoModel: undefined,
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
                var textTrackInfo = new MediaPlayer.vo.TextTrackInfo(),
                    trackKindMap = {subtitle:"subtitles", caption:"captions"},//Dash Spec has no "s" on end of KIND but HTML needs plural.
                    getKind = function () {
                        var kind = (mediaInfo.roles.length > 0) ? trackKindMap[mediaInfo.roles[0]] : trackKindMap.caption;
                        kind = (kind === trackKindMap.caption || kind === trackKindMap.subtitle) ? kind : trackKindMap.caption;
                        return kind;
                    },
                    
                    checkTTML = function () {
                        var ttml = false;
                        if (mediaInfo.codec && mediaInfo.codec.search("stpp") >= 0) {
                            ttml = true;
                        }
                        if (mediaInfo.mimeType && mediaInfo.mimeType.search("ttml") >= 0) {
                            ttml = true;
                        }
                        return ttml;
                    };

                textTrackInfo.captionData = captionData;
                textTrackInfo.lang = mediaInfo.lang;
                textTrackInfo.label = mediaInfo.id; // AdaptationSet id (an unsigned int)
                textTrackInfo.index = mediaInfo.index; // AdaptationSet index in manifest
                textTrackInfo.isTTML = checkTTML();
                textTrackInfo.video = self.videoModel.getElement();
                textTrackInfo.defaultTrack = self.getIsDefault(mediaInfo);
                textTrackInfo.isFragmented = self.isFragmented;
                textTrackInfo.kind = getKind();
                self.textTrackExtensions.addTextTrack(textTrackInfo, self.mediaInfos.length);
            }

            if(mediaType === "fragmentedText"){
                var fragmentExt = self.system.getObject("fragmentExt");
                if(!this.initializationSegmentReceived){
                    this.initializationSegmentReceived=true;
                    for (i = 0; i < this.mediaInfos.length; i++){
                        createTextTrackFromMediaInfo(null, this.mediaInfos[i]);
                    }
                    this.timescale = fragmentExt.getMediaTimescaleFromMoov(bytes);
                }else {
                    samplesInfo = fragmentExt.getSamplesInfo(bytes);
                    for(i= 0 ; i < samplesInfo.length ; i++) {
                        if(!this.firstSubtitleStart){
                            this.firstSubtitleStart = samplesInfo[0].cts-chunk.start*this.timescale;
                        }
                        samplesInfo[i].cts -= this.firstSubtitleStart;
                        this.buffered.add(samplesInfo[i].cts/this.timescale,(samplesInfo[i].cts+samplesInfo[i].duration)/this.timescale);
                        ccContent = window.UTF8.decode(new Uint8Array(bytes.slice(samplesInfo[i].offset,samplesInfo[i].offset+samplesInfo[i].size)));
                        parser = parser !== null ? parser : self.getParser(mimeType);
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
            //TODO How to tag default. currently same order as listed in manifest.
            // Is there a way to mark a text adaptation set as the default one? DASHIF meeting talk about using role which is being used for track KIND
            // Eg subtitles etc. You can have multiple role tags per adaptation Not defined in the spec yet.
            return mediaInfo.index === this.mediaInfos[0].index;
        },

        abort:function() {
            this.textTrackExtensions.deleteAllTextTracks();
            allTracksAreDisabled = false;
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

        setTextTrack: setTextTrack,
    };
};

MediaPlayer.dependencies.TextSourceBuffer.prototype = {
    constructor: MediaPlayer.dependencies.TextSourceBuffer
};
