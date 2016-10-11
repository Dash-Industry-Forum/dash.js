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
import EventBus from '../core/EventBus';
import Events from '../core/events/Events';
import FactoryMaker from '../core/FactoryMaker';
import Debug from '../core/Debug';

function TextTracks() {

    let context = this.context;
    let eventBus = EventBus(context).getInstance();
    let log = Debug(context).getInstance().log;

    let instance,
        Cue,
        videoModel,
        video,
        textTrackQueue,
        trackElementArr,
        currentTrackIdx,
        actualVideoLeft,
        actualVideoTop,
        actualVideoWidth,
        actualVideoHeight,
        captionContainer,
        videoSizeCheckInterval,
        isChrome,
        fullscreenAttribute,
        displayCCOnTop,
        topZIndex;

    function initialize () {
        Cue = window.VTTCue || window.TextTrackCue;
        textTrackQueue = [];
        trackElementArr = [];
        currentTrackIdx = -1;
        actualVideoLeft = 0;
        actualVideoTop = 0;
        actualVideoWidth = 0;
        actualVideoHeight = 0;
        captionContainer = null;
        videoSizeCheckInterval = null;
        displayCCOnTop = false;
        topZIndex = 2147483647;

        //TODO Check if IE has resolved issues: Then revert to not using the addTextTrack API for all browsers.
        // https://connect.microsoft.com/IE/feedbackdetail/view/1660701/text-tracks-do-not-fire-change-addtrack-or-removetrack-events
        // https://connect.microsoft.com/IE/feedback/details/1573380/htmltrackelement-track-addcue-throws-invalidstateerror-when-adding-new-cue
        // Same issue with Firefox.
        //isIE11orEdge = !!navigator.userAgent.match(/Trident.*rv[ :]*11\./) || navigator.userAgent.match(/Edge/);
        //isFirefox = !!navigator.userAgent.match(/Firefox/);
        isChrome = !!navigator.userAgent.match(/Chrome/) && !navigator.userAgent.match(/Edge/);
        if (document.fullscreenElement !== undefined) {
            fullscreenAttribute = 'fullscreenElement'; // Standard and Edge
        } else if (document.webkitIsFullScreen !== undefined) {
            fullscreenAttribute = 'webkitIsFullScreen'; // Chrome and Safari (and Edge)
        } else if (document.msFullscreenElement) { // IE11
            fullscreenAttribute = 'msFullscreenElement';
        } else if (document.mozFullScreen) { // Firefox
            fullscreenAttribute = 'mozFullScreen';
        }

    }

    function createTrackForUserAgent (i) {
        var kind = textTrackQueue[i].kind;
        var label = textTrackQueue[i].label !== undefined ? textTrackQueue[i].label : textTrackQueue[i].lang;
        var lang = textTrackQueue[i].lang;
        var track = isChrome ? document.createElement('track') : video.addTextTrack(kind, label, lang);

        if (isChrome) {
            track.kind = kind;
            track.label = label;
            track.srclang = lang;
        }

        return track;
    }

    function displayCConTop (value) {
        displayCCOnTop = value;
        if (!captionContainer || document[fullscreenAttribute]) return;
        captionContainer.style.zIndex = value ? topZIndex : null;
    }

    function addTextTrack(textTrackInfoVO, totalTextTracks) {

        if (textTrackQueue.length === totalTextTracks) {
            log('Trying to add too many tracks.');
            return;
        }

        textTrackQueue.push(textTrackInfoVO);
        if (video === undefined) {
            video = textTrackInfoVO.video;
        }

        if (textTrackQueue.length === totalTextTracks) {
            textTrackQueue.sort(function (a, b) { //Sort in same order as in manifest
                return a.index - b.index;
            });
            captionContainer = videoModel.getTTMLRenderingDiv();
            var defaultIndex = -1;
            for (var i = 0 ; i < textTrackQueue.length; i++) {
                var track = createTrackForUserAgent.call(this, i);
                trackElementArr.push(track); //used to remove tracks from video element when added manually

                if (textTrackQueue[i].defaultTrack) {
                    // track.default is an object property identifier that is a reserved word
                    // The following jshint directive is used to suppressed the warning "Expected an identifier and instead saw 'default' (a reserved word)"
                    /*jshint -W024 */
                    track.default = true;
                    defaultIndex = i;
                }
                if (isChrome) {
                    video.appendChild(track);
                }
                var textTrack = video.textTracks[i];
                textTrack.nonAddedCues = [];
                if (captionContainer && (textTrackQueue[i].isTTML || textTrackQueue[i].isEmbedded)) {
                    textTrack.renderingType = 'html';
                } else {
                    textTrack.renderingType = 'default';
                }
                this.addCaptions(i, 0, textTrackQueue[i].captionData);
                eventBus.trigger(Events.TEXT_TRACK_ADDED);
            }
            setCurrentTrackIdx.call(this, defaultIndex);
            if (defaultIndex >= 0) {
                video.textTracks[defaultIndex].mode = 'showing';
                this.addCaptions(defaultIndex, 0, null);
            }
            eventBus.trigger(Events.TEXT_TRACKS_ADDED, {index: currentTrackIdx, tracks: textTrackQueue});//send default idx.
        }
    }

    function getVideoVisibleVideoSize(viewWidth, viewHeight, videoWidth, videoHeight, aspectRatio, use80Percent) {
        var viewAspectRatio = viewWidth / viewHeight;
        var videoAspectRatio = videoWidth / videoHeight;

        var videoPictureWidth = 0;
        var videoPictureHeight = 0;

        if (viewAspectRatio > videoAspectRatio) {
            videoPictureHeight = viewHeight;
            videoPictureWidth = (videoPictureHeight / videoHeight) * videoWidth;
        } else {
            videoPictureWidth = viewWidth;
            videoPictureHeight = (videoPictureWidth / videoWidth) * videoHeight;
        }

        var videoPictureXAspect = 0;
        var videoPictureYAspect = 0;
        var videoPictureWidthAspect = 0;
        var videoPictureHeightAspect = 0;
        var videoPictureAspect = videoPictureWidth / videoPictureHeight;

        if (videoPictureAspect > aspectRatio) {
            videoPictureHeightAspect = videoPictureHeight;
            videoPictureWidthAspect = videoPictureHeight / (1 / aspectRatio);
            videoPictureXAspect = (viewWidth - videoPictureWidthAspect) / 2;
            videoPictureYAspect = 0;
        } else {
            videoPictureWidthAspect = videoPictureWidth;
            videoPictureHeightAspect = videoPictureWidth / aspectRatio;
            videoPictureXAspect = 0;
            videoPictureYAspect = (viewHeight - videoPictureHeightAspect) / 2;
        }

        if (use80Percent) {
            return { x: videoPictureXAspect + (videoPictureWidthAspect * 0.1),
                     y: videoPictureYAspect + (videoPictureHeightAspect * 0.1),
                     w: videoPictureWidthAspect * 0.8,
                     h: videoPictureHeightAspect * 0.8 }; /* Maximal picture size in videos aspect ratio */
        } else {
            return { x: videoPictureXAspect,
                     y: videoPictureYAspect,
                     w: videoPictureWidthAspect,
                     h: videoPictureHeightAspect }; /* Maximal picture size in videos aspect ratio */
        }
    }


    function checkVideoSize() {
        var track = this.getCurrentTextTrack();
        if (track && track.renderingType === 'html') {
            let aspectRatio = video.clientWidth / video.clientHeight;
            let use80Percent = false;
            if (track.isFromCEA608) {
                // If this is CEA608 then use predefined aspect ratio
                aspectRatio = 3.5 / 3.0;
                use80Percent = true;
            }

            const realVideoSize = getVideoVisibleVideoSize.call(this, video.clientWidth, video.clientHeight, video.videoWidth, video.videoHeight, aspectRatio, use80Percent);

            const newVideoWidth = realVideoSize.w;
            const newVideoHeight = realVideoSize.h;

            if (newVideoWidth != actualVideoWidth || newVideoHeight != actualVideoHeight) {
                actualVideoLeft = realVideoSize.x;
                actualVideoTop = realVideoSize.y;
                actualVideoWidth = newVideoWidth;
                actualVideoHeight = newVideoHeight;
                captionContainer.style.left = actualVideoLeft + 'px';
                captionContainer.style.top = actualVideoTop + 'px';
                captionContainer.style.width = actualVideoWidth + 'px';
                captionContainer.style.height = actualVideoHeight + 'px';

                // Video view has changed size, so resize any active cues
                for (let i = 0; track.activeCues && i < track.activeCues.length; ++i) {
                    let cue = track.activeCues[i];
                    cue.scaleCue(cue);
                }

                if ((fullscreenAttribute && document[fullscreenAttribute]) || displayCCOnTop) {
                    captionContainer.style.zIndex = topZIndex;
                } else {
                    captionContainer.style.zIndex = null;
                }
            }
        }
    }

    function convertToPixels(percentage, pixelMeasure) {
        let percentString = Math.round(0.01 * percentage * pixelMeasure).toString() + 'px';
        return percentString;
    }

    function scaleImageCue(activeCue) {
        var videoWidth = actualVideoWidth;
        var videoHeight = actualVideoHeight;

        if (videoWidth * videoHeight === 0) {
            return; //At least one of the measures is still zero
        }

        if (activeCue.layout) {
            let layout = activeCue.layout;
            let left = convertToPixels(layout.left, videoWidth);
            let top = convertToPixels(layout.top, videoHeight);
            let width = convertToPixels(layout.width, videoWidth);
            let height = convertToPixels(layout.height, videoHeight);
            captionContainer.style.left = left;
            captionContainer.style.top = top;
            captionContainer.style.width = width;
            captionContainer.style.height = height;
            let image = captionContainer.firstChild;
            if (image && image.style) {
                image.style.left = '0px';
                image.style.top = '0px';
                image.style.width = width;
                image.style.height = height;
            }
        }
    }

    function scaleCue(activeCue) {
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
                        elementsSpan[i].style.cssText = elementsSpan[i].style.cssText.replace(/(padding-left\s*:\s*)[\d.,]+(?=\s*px)/gi, '$1' + replaceValue);
                        elementsSpan[i].style.cssText = elementsSpan[i].style.cssText.replace(/(padding-right\s*:\s*)[\d.,]+(?=\s*px)/gi, '$1' + replaceValue);
                    }
                }
            }
        }

        if (activeCue.fontSize) {
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
                        elements[j].style.cssText = elements[j].style.cssText.replace(/(font-size\s*:\s*)[\d.,]+(?=\s*px)/gi, '$1' + replaceValue);
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
                        elements[k].style.cssText = elements[k].style.cssText.replace(/(line-height\s*:\s*)[\d.,]+(?=\s*px)/gi, '$1' + replaceValue);
                    }
                }
            }
        }
    }

    /*
    * Add captions to track, store for later adding, or add captions added before
    */
    function addCaptions(trackIdx, timeOffset, captionData) {
        var track = trackIdx >= 0 ?  video.textTracks[trackIdx] : null;
        var self = this;

        if (!track) return;
        if (track.mode !== 'showing') {
            if (captionData && captionData.length > 0) {
                track.nonAddedCues = track.nonAddedCues.concat(captionData);
            }
            return;
        }

        if (!captionData) {
            captionData = track.nonAddedCues;
            track.nonAddedCues = [];
        }

        if (!captionData || captionData.length === 0) {
            return;
        }

        for (var item in captionData) {
            var cue;
            var currentItem = captionData[item];

            track.cellResolution = currentItem.cellResolution;
            track.isFromCEA608 = currentItem.isFromCEA608;

            if (!videoSizeCheckInterval && (currentItem.type === 'html' || currentItem.type === 'image') ) {
                videoSizeCheckInterval = setInterval(checkVideoSize.bind(this), 500);
            }

            //image subtitle extracted from TTML
            if (currentItem.type === 'image') {
                cue = new Cue(currentItem.start - timeOffset, currentItem.end - timeOffset, '');
                cue.image = currentItem.data;
                cue.id = currentItem.id;
                cue.size = 0; //discard the native display for this subtitles
                cue.type = 'image'; // active image overlay
                cue.layout = currentItem.layout;
                cue.scaleCue = scaleImageCue.bind(self);
                cue.onenter = function () {
                    if (!captionContainer) { // Does not support image captions without a container
                        return;
                    }
                    if (track.mode === 'showing') {
                        var img = new Image();
                        img.id = 'ttmlImage_' + this.id;
                        img.src = this.image;
                        //img.className = 'cue-image';
                        img.style.cssText = 'z-index: 2147483648; pointer-events: none; display: block; visibility: visible !important; position: relative !important;';
                        captionContainer.appendChild(img);
                        scaleImageCue.call(self, this);
                    }
                };

                cue.onexit =  function () {
                    if (!captionContainer) {
                        return;
                    }
                    let imgs = captionContainer.childNodes;
                    for (let i = 0; i < imgs.length; i++) {
                        if (imgs[i].id === 'ttmlImage_' + this.id) {
                            captionContainer.removeChild(imgs[i]);
                        }
                    }
                };
            }
            else if (currentItem.type === 'html') {
                cue = new Cue(currentItem.start - timeOffset, currentItem.end - timeOffset, '');
                cue.cueHTMLElement = currentItem.cueHTMLElement;
                cue.regions = currentItem.regions;
                cue.regionID = currentItem.regionID;
                cue.cueID = currentItem.cueID;
                cue.videoWidth = currentItem.videoWidth;
                cue.videoHeight = currentItem.videoHeight;
                cue.cellResolution = currentItem.cellResolution;
                cue.fontSize = currentItem.fontSize;
                cue.lineHeight = currentItem.lineHeight;
                cue.linePadding = currentItem.linePadding;
                cue.scaleCue = scaleCue.bind(self);
                captionContainer.style.left = actualVideoLeft + 'px';
                captionContainer.style.top = actualVideoTop + 'px';
                captionContainer.style.width = actualVideoWidth + 'px';
                captionContainer.style.height = actualVideoHeight + 'px';

                cue.onenter =  function () {
                    if (track.mode === 'showing') {
                        log('Cue ' + this.startTime + '-' + this.endTime + ' : ' + this.cueHTMLElement.id + ' : ' + this.cueHTMLElement.innerText);
                        captionContainer.appendChild(this.cueHTMLElement);
                        scaleCue.call(self, this);
                    }
                };

                cue.onexit =  function () {
                    var divs = captionContainer.childNodes;
                    for (var i = 0; i < divs.length; ++i) {
                        if (divs[i].id === this.cueID) {
                            captionContainer.removeChild(divs[i]);
                        }
                    }
                };
            }
            else {
                cue = new Cue(currentItem.start - timeOffset, currentItem.end - timeOffset, currentItem.data);
                if (currentItem.styles) {
                    if (currentItem.styles.align !== undefined && cue.hasOwnProperty('align')) {
                        cue.align = currentItem.styles.align;
                    }
                    if (currentItem.styles.line !== undefined && cue.hasOwnProperty('line')) {
                        cue.line = currentItem.styles.line;
                    }
                    if (currentItem.styles.position !== undefined && cue.hasOwnProperty('position')) {
                        cue.position = currentItem.styles.position ;
                    }
                    if (currentItem.styles.size !== undefined && cue.hasOwnProperty('size')) {
                        cue.size = currentItem.styles.size;
                    }
                }
            }

            track.addCue(cue);
        }
    }

    function getCurrentTextTrack() {
        return currentTrackIdx >= 0 ? video.textTracks[currentTrackIdx] : null;
    }

    function getCurrentTrackIdx() {
        return currentTrackIdx;
    }

    function getTrackIdxForId(trackId) {
        var idx = -1;
        for (var i = 0; i < video.textTracks.length; i++) {
            if (video.textTracks[i].label === trackId) {
                idx = i;
                break;
            }
        }
        return idx;
    }

    function setCurrentTrackIdx(idx) {
        currentTrackIdx = idx;
        clearCaptionContainer.call(this);
        if (idx >= 0) {
            var track = video.textTracks[idx];
            if (track.renderingType === 'html') {
                setNativeCueStyle.call(this);
            } else {
                removeNativeCueStyle.call(this);
            }
        } else {
            removeNativeCueStyle.call(this);
        }
    }

    function getTextTrack(idx) {
        return video.textTracks[idx];
    }

    function deleteTrackCues(track) {
        if (track.cues) {
            var cues = track.cues;
            var lastIdx = cues.length - 1;

            for (var r = lastIdx; r >= 0 ; r--) {
                track.removeCue(cues[r]);
            }

            track.mode = 'disabled';
        }
    }

    function deleteAllTextTracks() {
        var ln = trackElementArr.length;
        for (var i = 0; i < ln; i++) {
            if (isChrome) {
                video.removeChild(trackElementArr[i]);
            }else {
                var track = getTextTrack.call(this, i);
                track.nonAddedCues = [];
                deleteTrackCues.call(this, track);
            }

        }
        trackElementArr = [];
        textTrackQueue = [];
        if (videoSizeCheckInterval) {
            clearInterval(videoSizeCheckInterval);
            videoSizeCheckInterval = null;
        }
        clearCaptionContainer.call(this);
    }

    function deleteTextTrack(idx) {
        video.removeChild(trackElementArr[idx]);
        trackElementArr.splice(idx, 1);
    }

    /* Set native cue style to transparent background to avoid it being displayed. */
    function setNativeCueStyle() {
        if (!isChrome) return;
        var styleElement = document.getElementById('native-cue-style');
        if (styleElement) return; //Already set

        styleElement = document.createElement('style');
        styleElement.id  = 'native-cue-style';
        document.head.appendChild(styleElement);
        var stylesheet = styleElement.sheet;
        if (video.id) {
            stylesheet.insertRule('#' + video.id + '::cue {background: transparent}', 0);
        } else if (video.classList.length !== 0) {
            stylesheet.insertRule('.' + video.className + '::cue {background: transparent}', 0);
        } else {
            stylesheet.insertRule('video::cue {background: transparent}', 0);
        }
    }

    /* Remove the extra cue style with transparent background for native cues. */
    function removeNativeCueStyle() {
        if (!isChrome) return;
        var styleElement = document.getElementById('native-cue-style');
        if (styleElement) {
            document.head.removeChild(styleElement);
        }
    }

    function clearCaptionContainer() {
        if (captionContainer) {
            while (captionContainer.firstChild) {
                captionContainer.removeChild(captionContainer.firstChild);
            }
        }
    }

    function setConfig(config) {
        if (!config) return;

        if (config.videoModel) {
            videoModel = config.videoModel;
        }
    }

    instance = {
        initialize: initialize,
        displayCConTop: displayCConTop,
        addTextTrack: addTextTrack,
        addCaptions: addCaptions,
        getTextTrack: getTextTrack,
        getCurrentTextTrack: getCurrentTextTrack,
        getCurrentTrackIdx: getCurrentTrackIdx,
        setCurrentTrackIdx: setCurrentTrackIdx,
        getTrackIdxForId: getTrackIdxForId,
        deleteTrackCues: deleteTrackCues,
        deleteAllTextTracks: deleteAllTextTracks,
        deleteTextTrack: deleteTextTrack,
        setConfig: setConfig
    };

    return instance;
}

TextTracks.__dashjs_factory_name = 'TextTracks';
export default FactoryMaker.getSingletonFactory(TextTracks);
