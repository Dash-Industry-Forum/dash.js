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

import DashAdapter from "../dash/DashAdapter.js";
import MediaPlayer from './MediaPlayer.js';
import TextTrackInfo from './vo/TextTrackInfo.js';
import FragmentExtensions from '../dash/extensions/FragmentExtensions.js';
import BoxParser from './utils/BoxParser.js';
import TextTrackExtensions from './extensions/TextTrackExtensions.js';
import VTTPapser from './VTTParser.js';
import TTMLParser from './TTMLParser.js';

let TextSourceBuffer = function () {
    var allTracksAreDisabled = false,
        parser = null,
        fragmentExt = null,
        mediaInfos = null,
        textTrackExtensions = null,
        isFragmented = false,
        fragmentModel = null,
        initializationSegmentReceived= false,
        timescale = NaN,
        allTracks = null,

        setTextTrack = function() {

            var el = this.videoModel.getElement(),
                tracks = el.textTracks,
                ln = tracks.length,
                self = this;

            if (!allTracks) {
                allTracks = self.mediaController.getTracksFor("fragmentedText", self.streamController.getActiveStreamInfo());
            }

            for (var i = 0; i < ln; i++ ) {
                var track = tracks[i];
                allTracksAreDisabled = track.mode !== "showing";
                if (track.mode === "showing") {
                    if (textTrackExtensions.getCurrentTrackIdx() !== i) { // do not reset track if already the current track.  This happens when all captions get turned off via UI and then turned on again and with videojs.
                        textTrackExtensions.setCurrentTrackIdx(i);
                        if (isFragmented) {
                            if (!self.mediaController.isCurrentTrack(allTracks[i])) {
                                fragmentModel.abortRequests();
                                textTrackExtensions.deleteTrackCues(textTrackExtensions.getCurrentTextTrack());
                                self.mediaController.setTrack(allTracks[i]);
                            }
                        }
                    }
                    break;
                }
            }

            if (allTracksAreDisabled){
                textTrackExtensions.setCurrentTrackIdx(-1);
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
        log: undefined,

        initialize: function (type, bufferController) {
            let streamProcessor = bufferController.streamProcessor;
            mediaInfos = streamProcessor.getMediaInfoArr();
            textTrackExtensions = TextTrackExtensions.getInstance({videoModel:this.videoModel});
            isFragmented = !this.manifestExt.getIsTextTrack(type);
            if (isFragmented){
                fragmentExt = FragmentExtensions.getInstance({parser:this.system.getObject("boxParser")});
                fragmentModel = streamProcessor.getFragmentModel();
                this.buffered =  this.system.getObject("customTimeRanges");
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
                var textTrackInfo = new TextTrackInfo(),
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
                textTrackInfo.isFragmented = isFragmented;
                textTrackInfo.kind = getKind();
                textTrackExtensions.addTextTrack(textTrackInfo, mediaInfos.length);
            }

            if(mediaType === "fragmentedText"){
                if(!initializationSegmentReceived){
                    initializationSegmentReceived=true;
                    for (i = 0; i < mediaInfos.length; i++){
                        createTextTrackFromMediaInfo(null, mediaInfos[i]);
                    }
                    timescale = fragmentExt.getMediaTimescaleFromMoov(bytes);
                }else {
                    samplesInfo = fragmentExt.getSamplesInfo(bytes);
                    for(i= 0 ; i < samplesInfo.length ; i++) {
                        if(!this.firstSubtitleStart){
                            this.firstSubtitleStart = samplesInfo[0].cts - chunk.start * timescale;
                        }
                        samplesInfo[i].cts -= this.firstSubtitleStart;
                        this.buffered.add(samplesInfo[i].cts / timescale,(samplesInfo[i].cts + samplesInfo[i].duration) / timescale);
                        ccContent = window.UTF8.decode(new Uint8Array(bytes.slice(samplesInfo[i].offset, samplesInfo[i].offset+samplesInfo[i].size)));
                        parser = parser !== null ? parser : self.getParser(mimeType);
                        try{
                            result = parser.parse(ccContent);
                            textTrackExtensions.addCaptions(this.firstSubtitleStart / timescale,result);
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
                    self.errHandler.timedTextError(e, "parse", ccContent);
                }
            }
        },

        getIsDefault:function(mediaInfo){
            //TODO How to tag default. currently same order as listed in manifest.
            // Is there a way to mark a text adaptation set as the default one? DASHIF meeting talk about using role which is being used for track KIND
            // Eg subtitles etc. You can have multiple role tags per adaptation Not defined in the spec yet.
            return mediaInfo.index === mediaInfos[0].index;
        },

        abort:function() {
            textTrackExtensions.deleteAllTextTracks();
            allTracksAreDisabled = false;
            parser = null;
            fragmentExt = null;
            mediaInfos = null;
            textTrackExtensions = null;
            isFragmented = false;
            fragmentModel = null;
            initializationSegmentReceived= false;
            timescale = NaN;
            allTracks = null;
        },

        getParser:function(mimeType) {
            var parser;
            if (mimeType === "text/vtt") {
                parser = VTTPapser.getInstance();
                parser.setConfig({logger: this.log});
            } else if (mimeType === "application/ttml+xml" || mimeType === "application/mp4") {
                parser = TTMLParser.getInstance();
                parser.setConfig({videoModel: this.videoModel});
            }
            return parser;
        },

        getAllTracksAreDisabled : function (){
            return allTracksAreDisabled;
        },

        setTextTrack: setTextTrack
    };
};

TextSourceBuffer.prototype = {
    constructor: TextSourceBuffer
};

export default TextSourceBuffer;