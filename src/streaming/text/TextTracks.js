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
import Constants from '../constants/Constants.js';
import EventBus from '../../core/EventBus.js';
import Events from '../../core/events/Events.js';
import MediaPlayerEvents from '../../streaming/MediaPlayerEvents.js';
import FactoryMaker from '../../core/FactoryMaker.js';
import Debug from '../../core/Debug.js';
import Utils from '../../core/Utils.js';
import {CueSet} from './CueSet.js';
import {renderHTML} from 'imsc';

const CUE_PROPS_TO_COMPARE = [
    'text',
    'align',
    'fontSize',
    'id',
    'isd',
    'line',
    'lineAlign',
    'lineHeight',
    'linePadding',
    'position',
    'positionAlign',
    'region',
    'size',
    'snapToLines',
    'vertical',
];

function TextTracks(config) {

    const context = this.context;
    const eventBus = EventBus(context).getInstance();
    const videoModel = config.videoModel;
    const streamInfo = config.streamInfo;
    const settings = config.settings;

    let instance,
        logger,
        Cue,
        textTrackInfos,
        nativeTexttracks,
        currentTrackIdx,
        actualVideoLeft,
        actualVideoTop,
        actualVideoWidth,
        actualVideoHeight,
        captionContainer,
        vttCaptionContainer,
        videoSizeCheckInterval,
        fullscreenAttribute,
        displayCCOnTop,
        previousISDState,
        topZIndex,
        resizeObserver,
        hasRequestAnimationFrame,
        currentCaptionEventCue;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
    }

    function initialize() {
        if (typeof window === 'undefined' || typeof navigator === 'undefined') {
            return;
        }

        Cue = window.VTTCue || window.TextTrackCue;
        textTrackInfos = [];
        nativeTexttracks = [];
        currentTrackIdx = -1;
        actualVideoLeft = 0;
        actualVideoTop = 0;
        actualVideoWidth = 0;
        actualVideoHeight = 0;
        captionContainer = null;
        vttCaptionContainer = null;
        videoSizeCheckInterval = null;
        displayCCOnTop = false;
        topZIndex = 2147483647;
        previousISDState = null;
        hasRequestAnimationFrame = ('requestAnimationFrame' in window);

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

    function getStreamId() {
        return streamInfo.id;
    }

    function createTracks() {
        //Sort in same order as in manifest
        textTrackInfos.sort(function (a, b) {
            return a.index - b.index;
        });

        captionContainer = videoModel.getTTMLRenderingDiv();
        vttCaptionContainer = videoModel.getVttRenderingDiv();
        let defaultIndex = -1;
        for (let i = 0; i < textTrackInfos.length; i++) {
            const nativeTexttrack = _createNativeTextrackElement(textTrackInfos[i]);

            //used to remove tracks from video element when added manually
            nativeTexttracks.push(nativeTexttrack);

            if (textTrackInfos[i].defaultTrack) {
                // track.default is an object property identifier that is a reserved word
                nativeTexttrack.default = true;
                defaultIndex = i;
            }

            const textTrack = getTrackByIdx(i);
            if (textTrack) {
                //each time a track is created, its mode should be showing by default
                //sometime, it's not on Chrome
                textTrack.mode = Constants.TEXT_SHOWING;
                if (captionContainer && (textTrackInfos[i].isTTML || textTrackInfos[i].isEmbedded)) {
                    textTrack.renderingType = 'html';
                } else {
                    textTrack.renderingType = 'default';
                }
            }

            addCaptions(i, 0, textTrackInfos[i].captionData);
            eventBus.trigger(MediaPlayerEvents.TEXT_TRACK_ADDED);
        }

        //set current track index in textTrackQueue array
        setCurrentTrackIdx.call(this, defaultIndex);

        if (defaultIndex >= 0) {

            let onMetadataLoaded = function () {
                const track = getTrackByIdx(defaultIndex);
                if (track && track.renderingType === 'html') {
                    checkVideoSize.call(this, track, true);
                }
                eventBus.off(MediaPlayerEvents.PLAYBACK_METADATA_LOADED, onMetadataLoaded, this);
            };

            eventBus.on(MediaPlayerEvents.PLAYBACK_METADATA_LOADED, onMetadataLoaded, this);

            for (let idx = 0; idx < textTrackInfos.length; idx++) {
                const videoTextTrack = getTrackByIdx(idx);
                if (videoTextTrack) {
                    const dispatchForManualRendering = settings.get().streaming.text.dispatchForManualRendering;
                    videoTextTrack.mode = (idx === defaultIndex && !dispatchForManualRendering) ? Constants.TEXT_SHOWING : Constants.TEXT_HIDDEN;
                    videoTextTrack.manualMode = (idx === defaultIndex) ? Constants.TEXT_SHOWING : Constants.TEXT_HIDDEN;
                }
            }
        }

        eventBus.trigger(Events.TEXT_TRACKS_QUEUE_INITIALIZED, {
            index: currentTrackIdx,
            tracks: textTrackInfos,
            streamId: streamInfo.id
        });
    }

    function _createNativeTextrackElement(element) {
        const kind = element.kind;
        const label = element.id !== undefined ? element.id : element.lang;
        const lang = element.lang;
        const isTTML = element.isTTML;
        const isEmbedded = element.isEmbedded;
        const track = videoModel.addTextTrack(kind, label, lang, isTTML, isEmbedded);

        return track;
    }

    function addTextTrackInfo(textTrackInfoVO) {
        textTrackInfos.push(textTrackInfoVO);
    }

    function getVideoVisibleVideoSize(viewWidth, viewHeight, videoWidth, videoHeight, aspectRatio, use80Percent) {
        const viewAspectRatio = viewWidth / viewHeight;
        const videoAspectRatio = videoWidth / videoHeight;

        let videoPictureWidth = 0;
        let videoPictureHeight = 0;

        if (viewAspectRatio > videoAspectRatio) {
            videoPictureHeight = viewHeight;
            videoPictureWidth = (videoPictureHeight / videoHeight) * videoWidth;
        } else {
            videoPictureWidth = viewWidth;
            videoPictureHeight = (videoPictureWidth / videoWidth) * videoHeight;
        }

        let videoPictureXAspect = 0;
        let videoPictureYAspect = 0;
        let videoPictureWidthAspect = 0;
        let videoPictureHeightAspect = 0;
        const videoPictureAspect = videoPictureWidth / videoPictureHeight;

        if (videoPictureAspect > aspectRatio) {
            videoPictureHeightAspect = videoPictureHeight;
            videoPictureWidthAspect = videoPictureHeight * aspectRatio;
        } else {
            videoPictureWidthAspect = videoPictureWidth;
            videoPictureHeightAspect = videoPictureWidth / aspectRatio;
        }
        videoPictureXAspect = (viewWidth - videoPictureWidthAspect) / 2;
        videoPictureYAspect = (viewHeight - videoPictureHeightAspect) / 2;

        if (use80Percent) {
            return {
                x: videoPictureXAspect + (videoPictureWidthAspect * 0.1),
                y: videoPictureYAspect + (videoPictureHeightAspect * 0.1),
                w: videoPictureWidthAspect * 0.8,
                h: videoPictureHeightAspect * 0.8
            }; /* Maximal picture size in videos aspect ratio */
        } else {
            return {
                x: videoPictureXAspect,
                y: videoPictureYAspect,
                w: videoPictureWidthAspect,
                h: videoPictureHeightAspect
            }; /* Maximal picture size in videos aspect ratio */
        }
    }

    function checkVideoSize(track, forceDrawing) {
        const clientWidth = videoModel.getClientWidth();
        const clientHeight = videoModel.getClientHeight();
        const videoWidth = videoModel.getVideoWidth();
        const videoHeight = videoModel.getVideoHeight();
        const videoOffsetTop = videoModel.getVideoRelativeOffsetTop();
        const videoOffsetLeft = videoModel.getVideoRelativeOffsetLeft();

        if (videoWidth !== 0 && videoHeight !== 0) {

            let aspectRatio = videoWidth / videoHeight;
            let use80Percent = false;
            if (track.isFromCEA608) {
                // If this is CEA608 then use predefined aspect ratio
                aspectRatio = 3.5 / 3.0;
                use80Percent = true;
            }

            const realVideoSize = getVideoVisibleVideoSize.call(this, clientWidth, clientHeight, videoWidth, videoHeight, aspectRatio, use80Percent);

            const newVideoWidth = realVideoSize.w;
            const newVideoHeight = realVideoSize.h;
            const newVideoLeft = realVideoSize.x;
            const newVideoTop = realVideoSize.y;

            if (newVideoWidth != actualVideoWidth || newVideoHeight != actualVideoHeight || newVideoLeft != actualVideoLeft || newVideoTop != actualVideoTop || forceDrawing) {
                actualVideoLeft = newVideoLeft + videoOffsetLeft;
                actualVideoTop = newVideoTop + videoOffsetTop;
                actualVideoWidth = newVideoWidth;
                actualVideoHeight = newVideoHeight;

                if (captionContainer) {
                    const containerStyle = captionContainer.style;
                    if (containerStyle) {
                        containerStyle.left = actualVideoLeft + 'px';
                        containerStyle.top = actualVideoTop + 'px';
                        containerStyle.width = actualVideoWidth + 'px';
                        containerStyle.height = actualVideoHeight + 'px';
                        containerStyle.zIndex = (fullscreenAttribute && document[fullscreenAttribute]) || displayCCOnTop ? topZIndex : null;
                        eventBus.trigger(MediaPlayerEvents.CAPTION_CONTAINER_RESIZE);
                    }
                }

                // Video view has changed size, so resize any active cues
                const activeCues = track.activeCues;
                if (activeCues) {
                    const len = activeCues.length;
                    for (let i = 0; i < len; ++i) {
                        const cue = activeCues[i];
                        cue.scaleCue(cue);
                    }
                }
            }
        }
    }

    function _scaleCue(activeCue) {
        const videoWidth = actualVideoWidth;
        const videoHeight = actualVideoHeight;
        let key,
            replaceValue,
            valueFontSize,
            valueLineHeight,
            elements;

        if (activeCue.cellResolution) {
            const cellUnit = [videoWidth / activeCue.cellResolution[0], videoHeight / activeCue.cellResolution[1]];
            if (activeCue.linePadding) {
                for (key in activeCue.linePadding) {
                    if (activeCue.linePadding.hasOwnProperty(key)) {
                        const valueLinePadding = activeCue.linePadding[key];
                        replaceValue = (valueLinePadding * cellUnit[0]).toString();
                        // Compute the CellResolution unit in order to process properties using sizing (fontSize, linePadding, etc).
                        const elementsSpan = document.getElementsByClassName('spanPadding');
                        for (let i = 0; i < elementsSpan.length; i++) {
                            elementsSpan[i].style.cssText = elementsSpan[i].style.cssText.replace(/(padding-left\s*:\s*)[\d.,]+(?=\s*px)/gi, '$1' + replaceValue);
                            elementsSpan[i].style.cssText = elementsSpan[i].style.cssText.replace(/(padding-right\s*:\s*)[\d.,]+(?=\s*px)/gi, '$1' + replaceValue);
                        }
                    }
                }
            }

            if (activeCue.fontSize) {
                for (key in activeCue.fontSize) {
                    if (activeCue.fontSize.hasOwnProperty(key)) {
                        if (activeCue.fontSize[key][0] === '%') {
                            valueFontSize = activeCue.fontSize[key][1] / 100;
                        } else if (activeCue.fontSize[key][0] === 'c') {
                            valueFontSize = activeCue.fontSize[key][1];
                        }

                        replaceValue = (valueFontSize * cellUnit[1]).toString();

                        if (key !== 'defaultFontSize') {
                            elements = document.getElementsByClassName(key);
                        } else {
                            elements = document.getElementsByClassName('paragraph');
                        }

                        for (let j = 0; j < elements.length; j++) {
                            elements[j].style.cssText = elements[j].style.cssText.replace(/(font-size\s*:\s*)[\d.,]+(?=\s*px)/gi, '$1' + replaceValue);
                        }
                    }
                }

                if (activeCue.lineHeight) {
                    for (key in activeCue.lineHeight) {
                        if (activeCue.lineHeight.hasOwnProperty(key)) {
                            if (activeCue.lineHeight[key][0] === '%') {
                                valueLineHeight = activeCue.lineHeight[key][1] / 100;
                            } else if (activeCue.fontSize[key][0] === 'c') {
                                valueLineHeight = activeCue.lineHeight[key][1];
                            }

                            replaceValue = (valueLineHeight * cellUnit[1]).toString();
                            elements = document.getElementsByClassName(key);
                            for (let k = 0; k < elements.length; k++) {
                                elements[k].style.cssText = elements[k].style.cssText.replace(/(line-height\s*:\s*)[\d.,]+(?=\s*px)/gi, '$1' + replaceValue);
                            }
                        }
                    }
                }
            }
        }

        if (activeCue.isd) {
            let htmlCaptionDiv = document.getElementById(activeCue.cueID);
            if (htmlCaptionDiv) {
                captionContainer.removeChild(htmlCaptionDiv);
            }
            _renderCaption(activeCue);
        }
    }

    function _resolveImageSrc(cue, src) {
        const imsc1ImgUrnTester = /^(urn:)(mpeg:[a-z0-9][a-z0-9-]{0,31}:)(subs:)([0-9]+)$/;
        const smpteImgUrnTester = /^#(.*)$/;
        if (imsc1ImgUrnTester.test(src)) {
            const match = imsc1ImgUrnTester.exec(src);
            const imageId = parseInt(match[4], 10) - 1;
            const imageData = btoa(cue.images[imageId]);
            const imageSrc = 'data:image/png;base64,' + imageData;
            return imageSrc;
        } else if (smpteImgUrnTester.test(src)) {
            const match = smpteImgUrnTester.exec(src);
            const imageId = match[1];
            const imageSrc = 'data:image/png;base64,' + cue.embeddedImages[imageId];
            return imageSrc;
        } else {
            return src;
        }
    }

    function _renderCaption(cue) {
        if (captionContainer) {
            clearCaptionContainer.call(this);

            const finalCue = document.createElement('div');
            captionContainer.appendChild(finalCue);

            previousISDState = renderHTML(
                cue.isd,
                finalCue,
                function (src) {
                    return _resolveImageSrc(cue, src)
                },
                captionContainer.clientHeight,
                captionContainer.clientWidth,
                settings.get().streaming.text.imsc.displayForcedOnlyMode,
                function (err) {
                    logger.info('renderCaption :', err) /*TODO: add ErrorHandler management*/
                },
                previousISDState,
                settings.get().streaming.text.imsc.enableRollUp
            );
            finalCue.id = cue.cueID;
            eventBus.trigger(MediaPlayerEvents.CAPTION_RENDERED, { captionDiv: finalCue, currentTrackIdx });
        }
    }

    // Check that a new cue immediately follows the previous cue
    function _areCuesAdjacent(cue, prevCue) {
        if (!prevCue) {
            return false;
        }
        // Check previous cue endTime with current cue startTime
        // (should we consider an epsilon margin? for example to get around rounding issues)
        return prevCue.endTime >= cue.startTime;
    }

    // Check if cue content is identical. If it is, extend the previous cue.
    function _extendLastCue(cue, prevCue) {
        if (!settings.get().streaming.text.extendSegmentedCues) {
            return false;
        }

        if (!_cuesContentAreEqual(prevCue, cue, CUE_PROPS_TO_COMPARE)) {
            return false;
        }

        prevCue.endTime = Math.max(prevCue.endTime, cue.endTime);
        return true;
    }

    function _cuesContentAreEqual(cue1, cue2, props) {
        for (let i = 0; i < props.length; i++) {
            const key = props[i];
            if (JSON.stringify(cue1[key]) !== JSON.stringify(cue2[key])) {
                return false;
            }
        }
        return true;
    }

    function _resolveImagesInContents(cue, contents) {
        if (!contents) {
            return;
        }
        contents.forEach(c => {
            if (c.kind && c.kind === 'image') {
                c.src = _resolveImageSrc(cue, c.src);
            }
            _resolveImagesInContents(cue, c.contents);
        });
    }

    /*
     * Add captions to track, store for later adding, or add captions added before
     */
    function addCaptions(trackIdx, timeOffset, captionData) {
        const track = getTrackByIdx(trackIdx);
        const dispatchForManualRendering = settings.get().streaming.text.dispatchForManualRendering;

        if (!track) {
            return;
        }

        if (!Array.isArray(captionData) || captionData.length === 0) {
            return;
        }

        const cueSet = new CueSet(track.cues);

        for (let item = 0; item < captionData.length; item++) {
            let cue = null;
            const currentItem = captionData[item];

            track.cellResolution = currentItem.cellResolution;
            track.isFromCEA608 = currentItem.isFromCEA608;

            if (!isNaN(currentItem.start) && !isNaN(currentItem.end)) {
                if (dispatchForManualRendering) {
                    cue = _handleCaptionEvents(currentItem, timeOffset);
                } else if (_isHTMLCue(currentItem) && captionContainer) {
                    cue = _handleHtmlCaption(currentItem, timeOffset, track)
                } else if (currentItem.data) {
                    cue = _handleNonHtmlCaption(currentItem, timeOffset, track)
                }
            }

            try {
                if (cue) {
                    if (!cueSet.hasCue(cue)) {
                        cueSet.addCue(cue);
                        if (settings.get().streaming.text.webvtt.customRenderingEnabled) {
                            if (!track.manualCueList) {
                                track.manualCueList = [];
                            }
                            track.manualCueList.push(cue);
                        } else {
                            // Handle adjacent cues
                            let prevCue;
                            if (track.cues && track.cues.length !== 0) {
                                prevCue = track.cues[track.cues.length - 1];
                            }

                            if (_areCuesAdjacent(cue, prevCue)) {
                                if (!_extendLastCue(cue, prevCue)) {
                                    /* If cues are adjacent but not identical (extended), let the render function of the next cue
                                     * clear up the captionsContainer so removal and appending are instantaneous.
                                     * Only do this for imsc subs (where isd is present).
                                     */
                                    if (prevCue.isd) {
                                        prevCue.onexit = function () {
                                        };
                                    }
                                    // If cues are added when the track is disabled they can still persist in memory
                                    if (track.mode !== Constants.TEXT_DISABLED) {
                                        track.addCue(cue);
                                    }
                                }
                            } else {
                                if (track.mode !== Constants.TEXT_DISABLED) {
                                    track.addCue(cue);
                                }
                            }
                        }
                    }

                    // Remove old cues
                    const bufferToKeep = settings.get().streaming.buffer.bufferToKeep;
                    const currentTime = videoModel.getTime();
                    _deleteOutdatedTrackCues(track, 0, currentTime - bufferToKeep);
                } else {
                    logger.error('Impossible to display subtitles. You might have missed setting a TTML rendering div via player.attachTTMLRenderingDiv(TTMLRenderingDiv)');
                }
            } catch (e) {
                // Edge crash, delete everything and start adding again
                // @see https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/11979877/
                _deleteTrackCues(track);
                track.addCue(cue);
                throw e;
            }
        }
    }

    function _handleCaptionEvents(currentItem, timeOffset) {
        let cue = _getCueInformation(currentItem, timeOffset)

        cue.onenter = function () {
            // HTML Tracks don't trigger the onexit event when a new cue is entered,
            // we need to manually trigger it
            if (_isHTMLCue(currentItem) && currentCaptionEventCue && currentCaptionEventCue.cueID !== cue.cueID) {
                _triggerCueExit(currentCaptionEventCue);
            }
            // We need to delete the type attribute to be able to dispatch via th event bus
            delete cue.type;

            currentCaptionEventCue = cue;
            _triggerCueEnter(cue);
        }

        cue.onexit = function () {
            _triggerCueExit(cue);
            currentCaptionEventCue = null;
        }

        return cue;
    }

    function _triggerCueEnter(cue) {
        eventBus.trigger(MediaPlayerEvents.CUE_ENTER, cue);
    }

    function _triggerCueExit(cue) {
        eventBus.trigger(MediaPlayerEvents.CUE_EXIT, {
            cueID: cue.cueID
        });
    }

    function _handleHtmlCaption(currentItem, timeOffset, track) {
        const self = this;
        let cue = _getCueInformation(currentItem, timeOffset)

        captionContainer.style.left = actualVideoLeft + 'px';
        captionContainer.style.top = actualVideoTop + 'px';
        captionContainer.style.width = actualVideoWidth + 'px';
        captionContainer.style.height = actualVideoHeight + 'px';

        cue.onenter = function () {
            if (track.mode === Constants.TEXT_SHOWING) {
                if (this.isd) {
                    if (hasRequestAnimationFrame) {
                        // Ensure everything in _renderCaption happens in the same frame
                        requestAnimationFrame(() => _renderCaption(this));
                    } else {
                        _renderCaption(this)
                    }
                    logger.debug('Cue enter id:' + this.cueID);
                } else {
                    captionContainer.appendChild(this.cueHTMLElement);
                    _scaleCue.call(self, this);
                    eventBus.trigger(MediaPlayerEvents.CAPTION_RENDERED, {
                        captionDiv: this.cueHTMLElement,
                        currentTrackIdx
                    });
                }
            }
        };

        // For imsc subs, this could be reassigned to not do anything if there is a cue that immediately follows this one
        cue.onexit = function () {
            if (captionContainer) {
                const divs = captionContainer.childNodes;
                for (let i = 0; i < divs.length; ++i) {
                    if (divs[i].id === this.cueID) {
                        logger.debug('Cue exit id:' + divs[i].id);
                        captionContainer.removeChild(divs[i]);
                        --i;
                    }
                }
            }
        };

        return cue;
    }

    function _handleNonHtmlCaption(currentItem, timeOffset, track) {
        let cue = _getCueInformation(currentItem, timeOffset)
        cue.isActive = false;

        if (currentItem.styles) {
            try {
                if (currentItem.styles.align !== undefined && 'align' in cue) {
                    cue.align = currentItem.styles.align;
                }
                if (currentItem.styles.line !== undefined && 'line' in cue) {
                    cue.line = currentItem.styles.line;
                }
                if (currentItem.styles.lineAlign !== undefined) {
                    cue.lineAlign = currentItem.styles.lineAlign;
                }
                if (currentItem.styles.snapToLines !== undefined && 'snapToLines' in cue) {
                    cue.snapToLines = currentItem.styles.snapToLines;
                }
                if (currentItem.styles.position !== undefined && 'position' in cue) {
                    cue.position = currentItem.styles.position;
                }
                if (currentItem.styles.positionAlign !== undefined) {
                    cue.positionAlign = currentItem.styles.positionAlign;
                }
                if (currentItem.styles.size !== undefined && 'size' in cue) {
                    cue.size = currentItem.styles.size;
                }
            } catch (e) {
                logger.error(e);
            }
        }

        cue.onenter = function () {
            if (track.mode === Constants.TEXT_SHOWING) {
                eventBus.trigger(MediaPlayerEvents.CAPTION_RENDERED, { currentTrackIdx });
            }
        };

        return cue;
    }

    function _isHTMLCue(cue) {
        return (cue.type === 'html')
    }

    function _getCueInformation(currentItem, timeOffset) {
        if (_isHTMLCue(currentItem)) {
            return _getCueInformationForHtml(currentItem, timeOffset);
        }

        return _getCueInformationForNonHtml(currentItem, timeOffset);
    }

    function _getCueInformationForHtml(currentItem, timeOffset) {
        let cue = new Cue(currentItem.start + timeOffset, currentItem.end + timeOffset, '');
        cue.cueHTMLElement = currentItem.cueHTMLElement;
        cue.isd = currentItem.isd;
        cue.images = currentItem.images;
        cue.embeddedImages = currentItem.embeddedImages;
        cue.cueID = currentItem.cueID;
        cue.scaleCue = _scaleCue.bind(self);
        //useful parameters for cea608 subtitles, not for TTML one.
        cue.cellResolution = currentItem.cellResolution;
        cue.lineHeight = currentItem.lineHeight;
        cue.linePadding = currentItem.linePadding;
        cue.fontSize = currentItem.fontSize;

        // Resolve images sources
        if (cue.isd) {
            _resolveImagesInContents(cue, cue.isd.contents);
        }

        return cue;
    }

    function _getCueInformationForNonHtml(currentItem, timeOffset) {
        let cue = new Cue(currentItem.start - timeOffset, currentItem.end - timeOffset, currentItem.data);
        cue.cueID = Utils.generateUuid();
        return cue;
    }

    function manualCueProcessing(time) {
        const activeTracks = _getManualActiveTracks();

        if (activeTracks && activeTracks.length > 0) {
            const targetTrack = activeTracks[0];
            const cues = targetTrack.manualCueList;

            if (cues && cues.length > 0) {
                cues.forEach((cue) => {
                    // Render cue if target time is reached and not in active state
                    if (cue.startTime <= time && cue.endTime >= time && !cue.isActive) {
                        cue.isActive = true;
                        if (settings.get().streaming.text.dispatchForManualRendering) {
                            _triggerCueEnter(cue);
                        } else {
                            // eslint-disable-next-line no-undef
                            WebVTT.processCues(window, [cue], vttCaptionContainer, cue.cueID);
                        }
                    } else if (cue.isActive && (cue.startTime > time || cue.endTime < time)) {
                        cue.isActive = false;
                        if (settings.get().streaming.text.dispatchForManualRendering) {
                            _triggerCueExit(cue);
                        } else {
                            _removeManualCue(cue);
                        }
                    }
                })
            }
        }
    }

    function _removeManualCue(cue) {
        if (vttCaptionContainer) {
            const divs = vttCaptionContainer.childNodes;
            for (let i = 0; i < divs.length; ++i) {
                if (divs[i].id === cue.cueID) {
                    vttCaptionContainer.removeChild(divs[i]);
                    --i;
                }
            }
        }
    }

    function disableManualTracks() {
        const activeTracks = _getManualActiveTracks();

        if (activeTracks && activeTracks.length > 0) {
            const targetTrack = activeTracks[0];
            const cues = targetTrack.manualCueList;


            if (cues && cues.length > 0) {
                cues.forEach((cue) => {
                    if (cue.isActive) {
                        cue.isActive = false;
                        if (settings.get().streaming.text.dispatchForManualRendering) {
                            _triggerCueExit(cue);
                        } else if (vttCaptionContainer) {
                            const divs = vttCaptionContainer.childNodes;
                            for (let i = 0; i < divs.length; ++i) {
                                if (divs[i].id === cue.cueID) {
                                    vttCaptionContainer.removeChild(divs[i]);
                                    --i;
                                }
                            }
                        }
                    }
                })
            }
        }
    }

    function _getManualActiveTracks() {
        const tracks = videoModel.getTextTracks();
        const activeTracks = []

        for (const track of tracks) {
            if (track.manualMode === Constants.TEXT_SHOWING) {
                activeTracks.push(track);
            }
        }
        return activeTracks;
    }

    function getTrackByIdx(idx) {
        return idx >= 0 && textTrackInfos[idx] ?
            videoModel.getTextTrack(textTrackInfos[idx].kind, textTrackInfos[idx].id, textTrackInfos[idx].lang, textTrackInfos[idx].isTTML, textTrackInfos[idx].isEmbedded) : null;
    }

    function getCurrentTrackIdx() {
        return currentTrackIdx;
    }

    function getTrackIdxForId(trackId) {
        let idx = -1;
        for (let i = 0; i < textTrackInfos.length; i++) {
            if (textTrackInfos[i].id === trackId) {
                idx = i;
                break;
            }
        }

        return idx;
    }

    function setCurrentTrackIdx(idx) {
        if (idx === currentTrackIdx) {
            return;
        }
        currentTrackIdx = idx;
        const track = getTrackByIdx(currentTrackIdx);
        setCueStyleOnTrack.call(this, track);

        if (videoSizeCheckInterval) {
            clearInterval(videoSizeCheckInterval);
            videoSizeCheckInterval = null;
        }

        if (track && track.renderingType === 'html') {
            checkVideoSize.call(this, track, true);
            if (window.ResizeObserver) {
                resizeObserver = new window.ResizeObserver(() => {
                    checkVideoSize.call(this, track, true);
                });
                resizeObserver.observe(videoModel.getElement());
            } else {
                videoSizeCheckInterval = setInterval(checkVideoSize.bind(this, track), 500);
            }
        }
    }

    function setCueStyleOnTrack(track) {
        clearCaptionContainer.call(this);
        if (track) {
            if (track.renderingType === 'html') {
                setNativeCueStyle.call(this);
            } else {
                removeNativeCueStyle.call(this);
            }
        } else {
            removeNativeCueStyle.call(this);
        }
    }

    function cueInRange(cue, start, end, strict = true) {
        if (!cue) {
            return false
        }
        return (isNaN(start) || (strict ? cue.startTime : cue.endTime) >= start) && (isNaN(end) || (strict ? cue.endTime : cue.startTime) <= end);
    }

    function _deleteOutdatedTrackCues(track, start, end) {

        if (end < start) {
            return;
        }

        if (track && (track.cues || track.manualCueList)) {
            const mode = track.cues && track.cues.length > 0 ? 'native' : 'custom';
            const cues = mode === 'native' ? track.cues : track.manualCueList;

            if (!cues || cues.length === 0) {
                return;
            }
            const lastIdx = cues.length - 1;

            for (let r = lastIdx; r >= 0; r--) {
                if (cueInRange(cues[r], start, end, true) && !_isCueActive(cues[r])) {
                    if (mode === 'native') {
                        track.removeCue(cues[r]);
                    } else {
                        _removeManualCue(cues[r]);
                        delete track.manualCueList[r]
                    }
                }
            }
        }
    }

    function _deleteTrackCues(track, start, end, strict = true) {
        if (track && (track.cues || track.manualCueList)) {
            const mode = track.cues && track.cues.length > 0 ? 'native' : 'custom';
            const cues = mode === 'native' ? track.cues : track.manualCueList;

            if (!cues || cues.length === 0) {
                return;
            }
            const lastIdx = cues.length - 1;

            for (let r = lastIdx; r >= 0; r--) {
                if (cueInRange(cues[r], start, end, strict)) {
                    if (mode === 'native') {
                        if (cues[r].onexit) {
                            cues[r].onexit();
                        }
                        track.removeCue(cues[r]);
                    } else {
                        _removeManualCue(cues[r]);
                        delete track.manualCueList[r]
                    }
                }
            }
        }
    }

    function _isCueActive(cue) {
        const currentTime = videoModel.getTime();

        return currentTime >= cue.startTime && currentTime <= cue.endTime
    }

    function deleteCuesFromTrackIdx(trackIdx, start, end) {
        const track = getTrackByIdx(trackIdx);
        if (track) {
            _deleteTrackCues(track, start, end);
        }
    }

    function deleteAllTextTracks() {
        const ln = nativeTexttracks ? nativeTexttracks.length : 0;
        for (let i = 0; i < ln; i++) {
            const track = getTrackByIdx(i);
            if (track) {
                _deleteTrackCues.call(this, track, streamInfo.start, streamInfo.start + streamInfo.duration, false);
            }
        }
        nativeTexttracks = [];
        textTrackInfos = [];
        if (videoSizeCheckInterval) {
            clearInterval(videoSizeCheckInterval);
            videoSizeCheckInterval = null;
        }
        if (resizeObserver && videoModel) {
            resizeObserver.unobserve(videoModel.getElement());
            resizeObserver = null;
        }
        currentTrackIdx = -1;
        clearCaptionContainer.call(this);
    }

    /* Set native cue style to transparent background to avoid it being displayed. */
    function setNativeCueStyle() {
        let styleElement = document.getElementById('native-cue-style');
        if (styleElement) {
            return; //Already set
        }

        styleElement = document.createElement('style');
        styleElement.id = 'native-cue-style';
        document.head.appendChild(styleElement);
        const stylesheet = styleElement.sheet;
        const video = videoModel.getElement();
        try {
            if (video) {
                if (video.id) {
                    stylesheet.insertRule('#' + video.id + '::cue {background: transparent}', 0);
                } else if (video.classList.length !== 0) {
                    stylesheet.insertRule('.' + video.className + '::cue {background: transparent}', 0);
                } else {
                    stylesheet.insertRule('video::cue {background: transparent}', 0);
                }
            }
        } catch (e) {
            logger.info('' + e.message);
        }
    }

    /* Remove the extra cue style with transparent background for native cues. */
    function removeNativeCueStyle() {
        const styleElement = document.getElementById('native-cue-style');
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

    function setModeForTrackIdx(idx, mode) {
        const track = getTrackByIdx(idx);
        if (track && track.mode !== mode) {
            track.mode = mode;
        }
        if (track && track.manualMode !== mode) {
            track.manualMode = mode;
        }
    }

    function getCurrentTextTrackInfo() {
        return textTrackInfos[currentTrackIdx];
    }

    function getTextTrackInfos() {
        return textTrackInfos
    }

    instance = {
        addCaptions,
        addTextTrackInfo,
        createTracks,
        deleteAllTextTracks,
        deleteCuesFromTrackIdx,
        disableManualTracks,
        getCurrentTrackIdx,
        getCurrentTextTrackInfo,
        getStreamId,
        getTextTrackInfos,
        getTrackIdxForId,
        initialize,
        manualCueProcessing,
        setCurrentTrackIdx,
        setModeForTrackIdx,
    };

    setup();

    return instance;
}

TextTracks.__dashjs_factory_name = 'TextTracks';
export default FactoryMaker.getClassFactory(TextTracks);
