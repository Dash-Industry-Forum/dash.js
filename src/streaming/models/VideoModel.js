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

import FactoryMaker from '../../core/FactoryMaker';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import Debug from '../../core/Debug';
import Constants from '../constants/Constants';


const READY_STATES_TO_EVENT_NAMES = new Map([
    [Constants.VIDEO_ELEMENT_READY_STATES.HAVE_METADATA, 'loadedmetadata'],
    [Constants.VIDEO_ELEMENT_READY_STATES.HAVE_CURRENT_DATA, 'loadeddata'],
    [Constants.VIDEO_ELEMENT_READY_STATES.HAVE_FUTURE_DATA, 'canplay'],
    [Constants.VIDEO_ELEMENT_READY_STATES.HAVE_ENOUGH_DATA, 'canplaythrough']
]);

function VideoModel() {

    let instance,
        logger,
        element,
        TTMLRenderingDiv,
        previousPlaybackRate;

    const VIDEO_MODEL_WRONG_ELEMENT_TYPE = 'element is not video or audio DOM type!';

    const context = this.context;
    const eventBus = EventBus(context).getInstance();
    const stalledStreams = [];

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
    }

    function initialize() {
        eventBus.on(Events.PLAYBACK_PLAYING, onPlaying, this);
    }

    function reset() {
        eventBus.off(Events.PLAYBACK_PLAYING, onPlaying, this);
    }

    function onPlaybackCanPlay() {
        if (element) {
            element.playbackRate = previousPlaybackRate || 1;
            element.removeEventListener('canplay', onPlaybackCanPlay);
        }
    }

    function setPlaybackRate(value) {
        if (!element) return;
        if (element.readyState <= 2 && value > 0) {
            // If media element hasn't loaded enough data to play yet, wait until it has
            element.addEventListener('canplay', onPlaybackCanPlay);
        } else {
            element.playbackRate = value;
        }
    }

    //TODO Move the DVR window calculations from MediaPlayer to Here.
    function setCurrentTime(currentTime, stickToBuffered) {
        waitForReadyState(Constants.VIDEO_ELEMENT_READY_STATES.HAVE_METADATA, () => {
            if (element) {
                //_currentTime = currentTime;

                // We don't set the same currentTime because it can cause firing unexpected Pause event in IE11
                // providing playbackRate property equals to zero.
                if (element.currentTime === currentTime) {
                    return;
                }

                // TODO Despite the fact that MediaSource 'open' event has been fired IE11 cannot set videoElement.currentTime
                // immediately (it throws InvalidStateError). It seems that this is related to videoElement.readyState property
                // Initially it is 0, but soon after 'open' event it goes to 1 and setting currentTime is allowed. Chrome allows to
                // set currentTime even if readyState = 0.
                // setTimeout is used to workaround InvalidStateError in IE11
                try {
                    currentTime = stickToBuffered ? stickTimeToBuffered(currentTime) : currentTime;
                    element.currentTime = currentTime;
                } catch (e) {
                    if (element.readyState === 0 && e.code === e.INVALID_STATE_ERR) {
                        setTimeout(function () {
                            element.currentTime = currentTime;
                        }, 400);
                    }
                }
            }
        });
    }

    function stickTimeToBuffered(time) {
        const buffered = getBufferRange();
        let closestTime = time;
        let closestDistance = 9999999999;
        if (buffered) {
            for (let i = 0; i < buffered.length; i++) {
                const start = buffered.start(i);
                const end = buffered.end(i);
                const distanceToStart = Math.abs(start - time);
                const distanceToEnd = Math.abs(end - time);

                if (time >= start && time <= end) {
                    return time;
                }

                if (distanceToStart < closestDistance) {
                    closestDistance = distanceToStart;
                    closestTime = start;
                }

                if (distanceToEnd < closestDistance) {
                    closestDistance = distanceToEnd;
                    closestTime = end;
                }
            }
        }
        return closestTime;
    }

    function getElement() {
        return element;
    }

    function setElement(value) {
        //add check of value type
        if (value === null || value === undefined || (value && (/^(VIDEO|AUDIO)$/i).test(value.nodeName))) {
            element = value;
            // Workaround to force Firefox to fire the canplay event.
            if (element) {
                element.preload = 'auto';
            }
        } else {
            throw VIDEO_MODEL_WRONG_ELEMENT_TYPE;
        }
    }

    function setSource(source) {
        if (element) {
            if (source) {
                element.src = source;
            } else {
                element.removeAttribute('src');
                element.load();
            }
        }
    }

    function getSource() {
        return element ? element.src : null;
    }

    function getTTMLRenderingDiv() {
        return TTMLRenderingDiv;
    }

    function setTTMLRenderingDiv(div) {
        TTMLRenderingDiv = div;
        // The styling will allow the captions to match the video window size and position.
        TTMLRenderingDiv.style.position = 'absolute';
        TTMLRenderingDiv.style.display = 'flex';
        TTMLRenderingDiv.style.overflow = 'hidden';
        TTMLRenderingDiv.style.pointerEvents = 'none';
        TTMLRenderingDiv.style.top = 0;
        TTMLRenderingDiv.style.left = 0;
    }

    function setStallState(type, state) {
        stallStream(type, state);
    }

    function isStalled() {
        return (stalledStreams.length > 0);
    }

    function addStalledStream(type) {

        if (type === null || !element || element.seeking || stalledStreams.indexOf(type) !== -1) {
            return;
        }

        stalledStreams.push(type);
    }

    function removeStalledStream(type) {
        let index = stalledStreams.indexOf(type);

        if (type === null) {
            return;
        }
        if (index !== -1) {
            stalledStreams.splice(index, 1);
        }

    }

    function stallStream(type, isStalled) {
        if (isStalled) {
            addStalledStream(type);
        } else {
            removeStalledStream(type);
        }
    }

    //Calling play on the element will emit playing - even if the stream is stalled. If the stream is stalled, emit a waiting event.
    function onPlaying() {
        if (element && isStalled() && element.playbackRate === 0) {
            const event = document.createEvent('Event');
            event.initEvent('waiting', true, false);
            element.dispatchEvent(event);
        }
    }

    function getPlaybackQuality() {
        if (!element) {
            return null;
        }
        let hasWebKit = ('webkitDroppedFrameCount' in element) && ('webkitDecodedFrameCount' in element);
        let hasQuality = ('getVideoPlaybackQuality' in element);
        let result = null;

        if (hasQuality) {
            result = element.getVideoPlaybackQuality();
        } else if (hasWebKit) {
            result = {
                droppedVideoFrames: element.webkitDroppedFrameCount,
                totalVideoFrames: element.webkitDroppedFrameCount + element.webkitDecodedFrameCount,
                creationTime: new Date()
            };
        }

        return result;
    }

    function play() {
        if (element) {
            element.autoplay = true;
            const p = element.play();
            if (p && p.catch && typeof Promise !== 'undefined') {
                p.catch((e) => {
                    if (e.name === 'NotAllowedError') {
                        eventBus.trigger(Events.PLAYBACK_NOT_ALLOWED);
                    }
                    logger.warn(`Caught pending play exception - continuing (${e})`);
                });
            }
        }
    }

    function isPaused() {
        return element ? element.paused : null;
    }

    function pause() {
        if (element) {
            element.pause();
            element.autoplay = false;
        }
    }

    function isSeeking() {
        return element ? element.seeking : null;
    }

    function getTime() {
        return element ? element.currentTime : null;
    }

    function getPlaybackRate() {
        return element ? element.playbackRate : null;
    }

    function getPlayedRanges() {
        return element ? element.played : null;
    }

    function getEnded() {
        return element ? element.ended : null;
    }

    function addEventListener(eventName, eventCallBack) {
        if (element) {
            element.addEventListener(eventName, eventCallBack);
        }
    }

    function removeEventListener(eventName, eventCallBack) {
        if (element) {
            element.removeEventListener(eventName, eventCallBack);
        }
    }

    function getReadyState() {
        return element ? element.readyState : NaN;
    }

    function getBufferRange() {
        return element ? element.buffered : null;
    }

    function getClientWidth() {
        return element ? element.clientWidth : NaN;
    }

    function getClientHeight() {
        return element ? element.clientHeight : NaN;
    }

    function getVideoWidth() {
        return element ? element.videoWidth : NaN;
    }

    function getVideoHeight() {
        return element ? element.videoHeight : NaN;
    }

    function getVideoRelativeOffsetTop() {
        const parentElement = element.parentNode.host || element.parentNode;
        return parentElement ? element.getBoundingClientRect().top - parentElement.getBoundingClientRect().top : NaN;
    }

    function getVideoRelativeOffsetLeft() {
        const parentElement = element.parentNode.host || element.parentNode;
        return parentElement ? element.getBoundingClientRect().left - parentElement.getBoundingClientRect().left : NaN;
    }

    function getTextTracks() {
        return element ? element.textTracks : [];
    }

    function getTextTrack(kind, label, lang, isTTML, isEmbedded) {
        if (element) {
            for (let i = 0; i < element.textTracks.length; i++) {
                //label parameter could be a number (due to adaptationSet), but label, the attribute of textTrack, is a string => to modify...
                //label could also be undefined (due to adaptationSet)
                if (element.textTracks[i].kind === kind && (label ? element.textTracks[i].label == label : true) &&
                    element.textTracks[i].language === lang && element.textTracks[i].isTTML === isTTML && element.textTracks[i].isEmbedded === isEmbedded) {
                    return element.textTracks[i];
                }
            }
        }

        return null;
    }

    function addTextTrack(kind, label, lang, isTTML, isEmbedded) {
        if (!element) {
            return null;
        }
        // check if track of same type has not been already created for previous stream
        // then use it (no way to remove existing text track from video element)
        let track = getTextTrack(kind, label, lang, isTTML, isEmbedded);
        if (!track) {
            track = element.addTextTrack(kind, label, lang);
            track.isEmbedded = isEmbedded;
            track.isTTML = isTTML;
        }
        return track;
    }

    function appendChild(childElement) {
        if (element) {
            element.appendChild(childElement);
            //in Chrome, we need to differenciate textTrack with same lang, kind and label but different format (vtt, ttml, etc...)
            if (childElement.isTTML !== undefined) {
                element.textTracks[element.textTracks.length - 1].isTTML = childElement.isTTML;
                element.textTracks[element.textTracks.length - 1].isEmbedded = childElement.isEmbedded;
            }
        }
    }

    function removeChild(childElement) {
        if (element) {
            element.removeChild(childElement);
        }
    }

    function waitForReadyState(targetReadyState, callback) {
        if (targetReadyState === Constants.VIDEO_ELEMENT_READY_STATES.HAVE_NOTHING ||
            getReadyState() >= targetReadyState) {
            callback();
        } else {
            // wait for the appropriate callback before checking again
            const event = READY_STATES_TO_EVENT_NAMES.get(targetReadyState);
            _listenOnce(event, callback);
        }
    }

    function _listenOnce(event, callback) {
        const func = () => {
            // Stop listening to this event.
            removeEventListener(event, func);
            // Call the original listener.
            callback(event);
        };
        addEventListener(event, func);
    }

    instance = {
        initialize: initialize,
        setCurrentTime: setCurrentTime,
        play: play,
        isPaused: isPaused,
        pause: pause,
        isStalled,
        isSeeking: isSeeking,
        getTime: getTime,
        getPlaybackRate: getPlaybackRate,
        setPlaybackRate: setPlaybackRate,
        getPlayedRanges: getPlayedRanges,
        getEnded: getEnded,
        setStallState: setStallState,
        getElement: getElement,
        setElement: setElement,
        setSource: setSource,
        getSource: getSource,
        getTTMLRenderingDiv: getTTMLRenderingDiv,
        setTTMLRenderingDiv: setTTMLRenderingDiv,
        getPlaybackQuality: getPlaybackQuality,
        addEventListener: addEventListener,
        removeEventListener: removeEventListener,
        getReadyState: getReadyState,
        getBufferRange: getBufferRange,
        getClientWidth: getClientWidth,
        getClientHeight: getClientHeight,
        getTextTracks: getTextTracks,
        getTextTrack: getTextTrack,
        addTextTrack: addTextTrack,
        appendChild: appendChild,
        removeChild: removeChild,
        getVideoWidth: getVideoWidth,
        getVideoHeight: getVideoHeight,
        getVideoRelativeOffsetTop: getVideoRelativeOffsetTop,
        getVideoRelativeOffsetLeft: getVideoRelativeOffsetLeft,
        reset: reset
    };

    setup();

    return instance;
}

VideoModel.__dashjs_factory_name = 'VideoModel';
export default FactoryMaker.getSingletonFactory(VideoModel);
