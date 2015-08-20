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
MediaPlayer.utils.TextTrackExtensions = function () {
    "use strict";
    var Cue,
        textTrackQueue = [],
        trackElementArr = [],
        currentTrackIdx = 0,
        trackKindMap = {subtitle:"subtitles", caption:"captions"},
        actualVideoWidth = 0,
        actualVideoHeight = 0,
        captionContainer = document.getElementById('caption-container'),
        videoSizeCheckInterval = null,
        currentTrack = null;

    return {
        mediaController:undefined,

        setup: function() {
            Cue = window.VTTCue || window.TextTrackCue;
        },

        addTextTrack: function(textTrackInfoVO, totalTextTracks) {

            textTrackQueue.push(textTrackInfoVO);
            if (this.video === undefined) {
                this.video = textTrackInfoVO.video;
            }

            if(textTrackQueue.length === totalTextTracks) {

                var defaultIndex = 0;
                for(var i = 0 ; i < textTrackQueue.length; i++) {
                    var track = document.createElement('track'),
                        captionType = trackKindMap[textTrackQueue[i].role];

                    currentTrackIdx = i;
                    trackElementArr.push(track);

                    track.kind = captionType !== undefined ? captionType : trackKindMap.caption;
                    track.label = textTrackQueue[i].lang;
                    track.srclang = textTrackQueue[i].lang;

                    // track.default is an object property identifier that is a reserved word
                    // The following jshint directive is used to suppressed the warning "Expected an identifier and instead saw 'default' (a reserved word)"
                    /*jshint -W024 */
                    track.default = textTrackQueue[i].defaultTrack;
                    if (textTrackQueue[i].defaultTrack) {
                        defaultIndex = i;
                    }

                    this.video.appendChild(track);
                    this.addCaptions(0, textTrackQueue[i].captionData);
                }

                currentTrackIdx = defaultIndex;
            }
        },

        checkVideoSize: function() {
            if (currentTrack && currentTrack.renderingType === "html") {
                var newVideoWidth = this.video.clientWidth;
                var newVideoHeight = this.video.clientHeight;

                if (newVideoWidth != actualVideoWidth || newVideoHeight != actualVideoHeight) {
                    console.log("videoSize changed to " + newVideoWidth + "x" + newVideoHeight);
                    actualVideoWidth = newVideoWidth;
                    actualVideoHeight = newVideoHeight;
                    captionContainer.style.width = actualVideoWidth + "px";
                    captionContainer.style.height = actualVideoHeight + "px";

                    // Video view has changed size, so resize all active cues
                    for (var i = 0; i < currentTrack.activeCues.length; ++i) {
                        var cue = currentTrack.activeCues[i];
                            cue.scaleCue(cue);
                    }
                }
            }
        },

        scaleCue: function(activeCue) {
            console.log("Scaling cue");
            var videoWidth = actualVideoWidth;
            var videoHeight = actualVideoHeight;
            var key,
                replaceValue,
                elements;

            var cellUnit = [videoWidth / activeCue.cellResolution[0], videoHeight / activeCue.cellResolution[1]];

            if (activeCue.linePadding) {
                for (key in activeCue.linePadding) {
                    if (activeCue.linePadding.hasOwnProperty(key)) {
                        var valueLinePadding = activeCue.linePadding[key];
                        replaceValue = (valueLinePadding * cellUnit[0]).toString();
                        // Compute the CellResolution unit in order to process properties using sizing (fontSize, linePadding, etc).
                        var elementsSpan = document.getElementsByClassName('spanPadding');
                        for (var i = 0; i < elementsSpan.length; i++) {
                            elementsSpan[i].style.cssText = elementsSpan[i].style.cssText.replace(/(padding-left\s*:\s*)[\d.,]+(?=\s*px)/gi, "$1" + replaceValue);
                            elementsSpan[i].style.cssText = elementsSpan[i].style.cssText.replace(/(padding-right\s*:\s*)[\d.,]+(?=\s*px)/gi, "$1" + replaceValue);
                        }
                    }
                }
            }

            if(activeCue.fontSize) {
                for (key in activeCue.fontSize) {
                    if (activeCue.fontSize.hasOwnProperty(key)) {
                        var valueFontSize = activeCue.fontSize[key] / 100;
                        replaceValue  = (valueFontSize * cellUnit[1]).toString();

                        if (key !== 'defaultFontSize') {
                            elements = document.getElementsByClassName(key);
                        } else {
                            elements = document.getElementsByClassName('paragraph');
                        }

                        for (i = 0; i < elements.length; i++) {
                            elements[i].style.cssText = elements[i].style.cssText.replace(/(font-size\s*:\s*)[\d.,]+(?=\s*px)/gi, "$1" + replaceValue);
                        }
                    }
                }
            }

            if (activeCue.lineHeight) {
                for (key in activeCue.lineHeight) {
                    if (activeCue.lineHeight.hasOwnProperty(key)) {
                        var valueLineHeight = activeCue.lineHeight[key] / 100;
                        replaceValue = (valueLineHeight * cellUnit[1]).toString();
                        elements = document.getElementsByClassName(key);
                        for (i = 0; i < elements.length; i++) {
                            elements[i].style.cssText = elements[i].style.cssText.replace(/(line-height\s*:\s*)[\d.,]+(?=\s*px)/gi, "$1" + replaceValue);
                        }
                    }
                }
            }
        },

        addCaptions: function(timeOffset, captionData) {
            var track = this.getCurrentTextTrack();
            currentTrack = track;
            track.mode = "showing";//make sure tracks are showing to be able to add the cue...

            if (!videoSizeCheckInterval) {
                videoSizeCheckInterval = 500;
                setInterval(this.checkVideoSize.bind(this), videoSizeCheckInterval);
            }

            for(var item in captionData) {
                var cue;
                var currentItem = captionData[item];

                //image subtitle extracted from TTML
                if(currentItem.type=="image"){
                    cue = new Cue(currentItem.start-timeOffset, currentItem.end-timeOffset, "");
                    cue.image=currentItem.data;
                    cue.id=currentItem.id;
                    cue.size=0; //discard the native display for this subtitles
                    cue.type="image"; // active image overlay
                    cue.onenter =  function () {
                        var img = new Image();
                        img.id = 'ttmlImage_'+this.id;
                        img.src = this.image;
                        img.className = 'cue-image';
                        captionContainer.appendChild(img);
                    };

                    cue.onexit =  function () {
                        var imgs = captionContainer.childNodes;
                        var i;
                        for(i=0;i<imgs.length;i++){
                            if(imgs[i].id=='ttmlImage_'+this.id){
                                captionContainer.removeChild(imgs[i]);
                            }
                        }
                    };
                }
                else if (currentItem.type=="html") {
                    if (track.renderingType != "html") {
                        track.renderingType = "html";
                        this.setCueStyle();
                    }
                    cue = new Cue(currentItem.start-timeOffset, currentItem.end-timeOffset, "");
                    cue.cueHTMLElement = currentItem.cueHTMLElement;
                    cue.regions = currentItem.regions;
                    cue.regionID = currentItem.regionID;
                    cue.cueID=currentItem.cueID;
                    cue.videoWidth = currentItem.videoWidth;
                    cue.videoHeight = currentItem.videoHeight;
                    cue.cellResolution = currentItem.cellResolution;
                    cue.fontSize = currentItem.fontSize;
                    cue.lineHeight = currentItem.lineHeight;
                    cue.linePadding = currentItem.linePadding;
                    cue.scaleCue = this.scaleCue;
                    captionContainer.style.width = this.video.clientWidth + "px";
                    captionContainer.style.height = this.video.clientHeight + "px";

                    cue.onenter =  function () {
                        currentTrack = track;
                        if (track.mode == "showing") {
                            var text = this.cueHTMLElement.innerHTML;
                            console.log("Showing text: " + text + ", id: " + this.cueID);
                            captionContainer.appendChild(this.cueHTMLElement);
                            this.scaleCue(this);
                        }
                    };

                    cue.onexit =  function () {
                        var divs = captionContainer.childNodes;
                        for (var i = 0; i < divs.length; ++i) {
                            if (divs[i].id == "subtitle_" + this.cueID) {
                                captionContainer.removeChild(divs[i]);
                            }
                        }
                    };
                }
                else{
                    cue = new Cue(currentItem.start-timeOffset, currentItem.end-timeOffset, currentItem.data);
                    if(currentItem.styles){
                        if (currentItem.styles.align !== undefined && cue.hasOwnProperty("align")) {
                            cue.align = currentItem.styles.align;
                        }
                        if (currentItem.styles.line !== undefined && cue.hasOwnProperty("line")) {
                            cue.line = currentItem.styles.line;
                        }
                        if (currentItem.styles.position !== undefined && cue.hasOwnProperty("position")) {
                            cue.position = currentItem.styles.position ;
                        }
                        if (currentItem.styles.size !== undefined && cue.hasOwnProperty("size")) {
                            cue.size = currentItem.styles.size;
                        }
                    }
                }

                track.addCue(cue);
            }

            if (!textTrackQueue[currentTrackIdx].isFragmented){
                track.mode = textTrackQueue[currentTrackIdx].defaultTrack ? "showing" : "hidden";
            }
        },

        getCurrentTextTrack: function(){
            return this.video.textTracks[currentTrackIdx];
        },

        getTextTrack: function(idx) {
            return this.video.textTracks[idx];
        },

        deleteTrackCues: function(track) {
            if (track.cues){
                var cues = track.cues,
                    lastIdx = cues.length - 1;

                for (var r = lastIdx; r >= 0 ; r--) {
                    track.removeCue(cues[r]);
                }
            }
        },

        deleteAllTextTracks:  function() {
            var ln = trackElementArr.length;
            for(var i = 0; i < ln; i++){
                this.video.removeChild(trackElementArr[i]);
            }
            trackElementArr = [];
            textTrackQueue = [];
        },

        deleteTextTrack: function(idx) {
            this.video.removeChild(trackElementArr[idx]);
            trackElementArr.splice(idx, 1);
        },

        setCurrentTrackIdx : function(value){
            currentTrackIdx = value;
        },
        
        setCueStyle: function() {
            var stylesheet = document.styleSheets[0];
            if(!this.video.id) {
                stylesheet.addRule('video::cue','background: transparent');
                stylesheet.insertRule('video::cue { background: transparent }', stylesheet.rules.length - 1);
            } else if(this.video.id) {
                stylesheet.addRule("#" + this.video.id + '::cue','background: transparent');
                stylesheet.insertRule("#" + this.video.id + '::cue { background: transparent }', stylesheet.rules.length - 1);
            } else if(this.video.classList.length !== 0) {
                stylesheet.addRule("." + this.video.className + '::cue','background: transparent');
                stylesheet.insertRule("." + this.video.className + '::cue { background: transparent }', stylesheet.rules.length - 1);
            }
        },
        
        removeCueStyle: function() {
            var stylesheet = document.styleSheets[0];
            stylesheet.removeRule(stylesheet.rules.length - 1);
            stylesheet.deleteRule(stylesheet.rules.length - 1);
        }

    };
};