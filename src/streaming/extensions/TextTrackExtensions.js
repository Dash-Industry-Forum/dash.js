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
        video,
        textTrackQueue = [],
        trackElementArr = [],
        currentTrackIdx = -1,
        actualVideoLeft = 0,
        actualVideoTop = 0,
        actualVideoWidth = 0,
        actualVideoHeight = 0,
        captionContainer = null,
        videoSizeCheckInterval = null,
        isIE11orEdge = false,// Temp solution for the addCue InvalidStateError..
        isChrome = false,
        fullscreenAttribute = null,
        displayCCOnTop = false,
        topZIndex = 2147483647,

        createTrackForUserAgent = function(i){
            var kind = textTrackQueue[i].kind;
            var label = textTrackQueue[i].label !== undefined ? textTrackQueue[i].label : textTrackQueue[i].lang;
            var lang = textTrackQueue[i].lang;
            var track = isIE11orEdge ? video.addTextTrack(kind, label, lang) : document.createElement('track');

             if (!isIE11orEdge) {
                 track.kind = kind;
                 track.label = label;
                 track.srclang = lang;
             }

            return track;
        };


    return {
        mediaController:undefined,
        videoModel:undefined,
        eventBus:undefined,

        setup: function() {
            Cue = window.VTTCue || window.TextTrackCue;
            //TODO Check if IE has resolved issues: Then revert to not using the addTextTrack API for all browsers.
            // https://connect.microsoft.com/IE/feedbackdetail/view/1660701/text-tracks-do-not-fire-change-addtrack-or-removetrack-events
            // https://connect.microsoft.com/IE/feedback/details/1573380/htmltrackelement-track-addcue-throws-invalidstateerror-when-adding-new-cue
            isIE11orEdge = !!navigator.userAgent.match(/Trident.*rv[ :]*11\./) || navigator.userAgent.match(/Edge/);
            isChrome = !!navigator.userAgent.match(/Chrome/) && !navigator.userAgent.match(/Edge/);
            if (document.fullscreenElement !== undefined) {
                fullscreenAttribute = "fullscreenElement"; // Standard and Edge
            } else if (document.webkitIsFullScreen !== undefined) {
                fullscreenAttribute = "webkitIsFullScreen"; // Chrome and Safari (and Edge)
            } else if (document.msFullscreenElement) { // IE11
                fullscreenAttribute = "msFullscreenElement";
            } else if (document.mozFullScreen) { // Firefox
                fullscreenAttribute = "mozFullScreen";
            }
        },

        displayCConTop: function(value) {
            displayCCOnTop = value;

            if (!captionContainer || document[fullscreenAttribute]) return;

            captionContainer.style.zIndex = value ? topZIndex : null;
        },

        addTextTrack: function(textTrackInfoVO, totalTextTracks) {

            textTrackQueue.push(textTrackInfoVO);
            if (video === undefined) {
                video = textTrackInfoVO.video;
            }

            if(textTrackQueue.length === totalTextTracks) {
                textTrackQueue.sort(function(a, b) { //Sort in same order as in manifest
                    return a.index - b.index;
                });
                captionContainer = this.videoModel.getTTMLRenderingDiv();
                var defaultIndex = 0;
                for(var i = 0 ; i < textTrackQueue.length; i++) {
                    var track = createTrackForUserAgent(i);
                    currentTrackIdx = i;//set to i for external track setup. rest to default value at end of loop
                    trackElementArr.push(track); //used to remove tracks from video element when added manually

                    if (textTrackQueue[i].defaultTrack) {
                        // track.default is an object property identifier that is a reserved word
                        // The following jshint directive is used to suppressed the warning "Expected an identifier and instead saw 'default' (a reserved word)"
                        /*jshint -W024 */
                        track.default = true;
                        defaultIndex = i;
                    }
                    if (!isIE11orEdge){
                        video.appendChild(track);
                    }
                    var textTrack = video.textTracks[i];
                    if (captionContainer && textTrackQueue[i].isTTML) {
                        textTrack.renderingType = "html";
                    } else {
                        textTrack.renderingType = "default";
                    }
                    this.addCaptions(0, textTrackQueue[i].captionData);
                    this.eventBus.dispatchEvent({type:MediaPlayer.events.TEXT_TRACK_ADDED});
                }
                this.setCurrentTrackIdx(defaultIndex);
                this.eventBus.dispatchEvent({type:MediaPlayer.events.TEXT_TRACKS_ADDED, data:{index:currentTrackIdx, tracks:textTrackQueue}});//send default idx.
            }
        },

        getVideoVisibleVideoSize: function(viewWidth, viewHeight, videoWidth, videoHeight) {
            var viewAspectRatio = viewWidth / viewHeight;
            var videoAspectRatio = videoWidth / videoHeight;

            var videoPictureX = 0;
            var videoPictureY = 0;
            var videoPictureWidth = 0;
            var videoPictureHeight = 0;

            if (viewAspectRatio > videoAspectRatio) {
                videoPictureHeight = viewHeight;
                videoPictureWidth = (videoPictureHeight / videoHeight) * videoWidth;
                videoPictureX = (viewWidth - videoPictureWidth) / 2;
                videoPictureY = 0;
            } else {
                videoPictureWidth = viewWidth;
                videoPictureHeight = (videoPictureWidth / videoWidth) * videoHeight;
                videoPictureX = 0;
                videoPictureY = (viewHeight - videoPictureHeight) / 2;
            }

            return { x:videoPictureX,
                     y:videoPictureY,
                     w:videoPictureWidth,
                     h:videoPictureHeight }; /* Maximal picture size in videos aspect ratio */
        },

        checkVideoSize: function() {
            var track = this.getCurrentTextTrack();
            if (track && track.renderingType === "html") {
                var newVideoWidth = video.clientWidth;
                var newVideoHeight = video.clientHeight;

                var realVideoSize = this.getVideoVisibleVideoSize(video.clientWidth, video.clientHeight, video.videoWidth, video.videoHeight);

                newVideoWidth = realVideoSize.w;
                newVideoHeight = realVideoSize.h;

                if (newVideoWidth != actualVideoWidth || newVideoHeight != actualVideoHeight) {
                    actualVideoLeft = realVideoSize.x;
                    actualVideoTop = realVideoSize.y;
                    actualVideoWidth = newVideoWidth;
                    actualVideoHeight = newVideoHeight;
                    captionContainer.style.left = actualVideoLeft + "px";
                    captionContainer.style.top = actualVideoTop + "px";
                    captionContainer.style.width = actualVideoWidth + "px";
                    captionContainer.style.height = actualVideoHeight + "px";

                    // Video view has changed size, so resize all active cues
                    for (var i = 0; i < track.activeCues.length; ++i) {
                        var cue = track.activeCues[i];
                            cue.scaleCue(cue);
                    }

                    if ((fullscreenAttribute && document[fullscreenAttribute]) || displayCCOnTop) {
                        captionContainer.style.zIndex = topZIndex;
                    } else {
                        captionContainer.style.zIndex = null;
                    }
                }
            }
        },

        scaleCue: function(activeCue) {
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

                        for (var j = 0; j < elements.length; j++) {
                            elements[j].style.cssText = elements[j].style.cssText.replace(/(font-size\s*:\s*)[\d.,]+(?=\s*px)/gi, "$1" + replaceValue);
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
                        for (var k = 0; k < elements.length; k++) {
                            elements[k].style.cssText = elements[k].style.cssText.replace(/(line-height\s*:\s*)[\d.,]+(?=\s*px)/gi, "$1" + replaceValue);
                        }
                    }
                }
            }
        },

        addCaptions: function(timeOffset, captionData) {
            var track = this.getCurrentTextTrack();
            if(!track) return;

            track.mode = "showing";//make sure tracks are showing to be able to add the cue...

            for(var item in captionData) {
                var cue,
                    currentItem = captionData[item];

                if (!videoSizeCheckInterval && currentItem.type=="html") {
                    videoSizeCheckInterval = setInterval(this.checkVideoSize.bind(this), 500);
                }

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
                        if (captionContainer) {
                            captionContainer.appendChild(img);
                        } else {
                            video.parentNode.appendChild(img);
                        }
                    };

                    cue.onexit =  function () {
                        var container,
                            i,
                            imgs;
                        if (captionContainer) {
                            container = captionContainer;
                        } else {
                            container = video.parentNode;
                        }
                        imgs = container.childNodes;
                        for(i=0;i<imgs.length;i++){
                            if(imgs[i].id=='ttmlImage_'+this.id){
                                container.removeChild(imgs[i]);
                            }
                        }
                    };
                }
                else if (currentItem.type === "html") {
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
                    captionContainer.style.left = actualVideoLeft + "px";
                    captionContainer.style.top = actualVideoTop + "px";
                    captionContainer.style.width = actualVideoWidth + "px";
                    captionContainer.style.height = actualVideoHeight + "px";

                    cue.onenter =  function () {
                        if (track.mode == "showing") {
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
            return currentTrackIdx >= 0 ? video.textTracks[currentTrackIdx] : null;
        },

        getCurrentTrackIdx: function(){
            return currentTrackIdx;
        },

        setCurrentTrackIdx : function(idx){
            currentTrackIdx = idx;
            this.clearCues();
            if (idx >= 0) {
                var track = video.textTracks[idx];
                if (track.renderingType === "html") {
                    this.setNativeCueStyle();
                } else {
                    this.removeNativeCueStyle();
                }
            } else {
                this.removeNativeCueStyle();
            }
        },

        getTextTrack: function(idx) {
            return video.textTracks[idx];
        },

        deleteTrackCues: function(track) {
            if (track.cues){
                var cues = track.cues,
                    lastIdx = cues.length - 1;

                for (var r = lastIdx; r >= 0 ; r--) {
                    track.removeCue(cues[r]);
                }

                track.mode = "disabled";
            }
        },

        deleteAllTextTracks:  function() {
            var ln = trackElementArr.length;
            for(var i = 0; i < ln; i++){
                if (isIE11orEdge) {
                    this.deleteTrackCues(this.getTextTrack(i));
                }else {
                    video.removeChild(trackElementArr[i]);
                }

            }
            trackElementArr = [];
            textTrackQueue = [];
            if (videoSizeCheckInterval){
                clearInterval(videoSizeCheckInterval);
                videoSizeCheckInterval = null;
            }
            this.clearCues();
        },

        deleteTextTrack: function(idx) {
            video.removeChild(trackElementArr[idx]);
            trackElementArr.splice(idx, 1);
        },

        /* Set native cue style to transparent background to avoid it being displayed. */
        setNativeCueStyle: function() {
            if (!isChrome) return;
            var styleElement = document.getElementById('native-cue-style');
            if (styleElement) return; //Already set

            styleElement = document.createElement('style');
            styleElement.id  = 'native-cue-style';
            document.head.appendChild(styleElement);
            var stylesheet = styleElement.sheet;
            if(video.id) {
                stylesheet.insertRule("#" + video.id + '::cue {background: transparent}', 0);
            } else if(video.classList.length !== 0) {
                stylesheet.insertRule("." + video.className + '::cue {background: transparent}', 0);
            } else {
                stylesheet.insertRule('video::cue {background: transparent}', 0);
            }
        },

        /* Remove the extra cue style with transparent background for native cues. */
        removeNativeCueStyle: function() {
            if (!isChrome) return;
            var styleElement = document.getElementById('native-cue-style');
            if (styleElement) {
                document.head.removeChild(styleElement);
            }
        },

        clearCues: function() {
            if (captionContainer) {
                while(captionContainer.firstChild) {
                    captionContainer.removeChild(captionContainer.firstChild);
                }
            }
        }
    };
};
