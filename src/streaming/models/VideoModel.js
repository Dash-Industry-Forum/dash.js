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

function VideoModel() {

    let instance,
        element,
        TTMLRenderingDiv,
        videoContainer,
        stalledStreams,
        previousPlaybackRate;

    function initialize() {
        stalledStreams = [];
    }

    function onPlaybackCanPlay() {
        element.playbackRate = previousPlaybackRate || 1;
        element.removeEventListener('canplay', onPlaybackCanPlay);
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
    function setCurrentTime(currentTime) {
        //_currentTime = currentTime;

        // We don't set the same currentTime because it can cause firing unexpected Pause event in IE11
        // providing playbackRate property equals to zero.
        if (element.currentTime == currentTime) return;

        // TODO Despite the fact that MediaSource 'open' event has been fired IE11 cannot set videoElement.currentTime
        // immediately (it throws InvalidStateError). It seems that this is related to videoElement.readyState property
        // Initially it is 0, but soon after 'open' event it goes to 1 and setting currentTime is allowed. Chrome allows to
        // set currentTime even if readyState = 0.
        // setTimeout is used to workaround InvalidStateError in IE11
        try {
            element.currentTime = currentTime;
        } catch (e) {
            if (element.readyState === 0 && e.code === e.INVALID_STATE_ERR) {
                setTimeout(function () {
                    element.currentTime = currentTime;
                }, 400);
            }
        }
    }

    function getElement() {
        return element;
    }

    function setElement(value) {
        element = value;
        // Workaround to force Firefox to fire the canplay event.
        element.preload = 'auto';
    }

    function setSource(source) {
        if (source) {
            element.src = source;
        } else {
            element.removeAttribute('src');
            element.load();
        }
    }

    function getSource() {
        return element.src;
    }

    function getVideoContainer() {
        return videoContainer;
    }

    function setVideoContainer(value) {
        videoContainer = value;
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

        let event;

        if (type === null || element.seeking || stalledStreams.indexOf(type) !== -1) {
            return;
        }

        stalledStreams.push(type);
        if (stalledStreams.length === 1) {
            // Halt playback until nothing is stalled.
            event = document.createEvent('Event');
            event.initEvent('waiting', true, false);
            previousPlaybackRate = element.playbackRate;
            setPlaybackRate(0);
            element.dispatchEvent(event);
        }
    }

    function removeStalledStream(type) {
        let index = stalledStreams.indexOf(type);
        let event;

        if (type === null) {
            return;
        }
        if (index !== -1) {
            stalledStreams.splice(index, 1);
        }
        // If nothing is stalled resume playback.
        if (isStalled() === false && element.playbackRate === 0) {
            setPlaybackRate(previousPlaybackRate || 1);
            if (!element.paused) {
                event = document.createEvent('Event');
                event.initEvent('playing', true, false);
                element.dispatchEvent(event);
            }
        }
    }

    function stallStream(type, isStalled) {
        if (isStalled) {
            addStalledStream(type);
        } else {
            removeStalledStream(type);
        }
    }

    function getPlaybackQuality() {
        let hasWebKit = ('webkitDroppedFrameCount' in element) && ('webkitDecodedFrameCount' in element);
        let hasQuality = ('getVideoPlaybackQuality' in element);
        let result = null;

        if (hasQuality) {
            result = element.getVideoPlaybackQuality();
        }
        else if (hasWebKit) {
            result = {
                droppedVideoFrames: element.webkitDroppedFrameCount,
                totalVideoFrames: element.webkitDroppedFrameCount + element.webkitDecodedFrameCount,
                creationTime: new Date()
            };
        }

        return result;
    }

    instance = {
        initialize: initialize,
        setCurrentTime: setCurrentTime,
        setStallState: setStallState,
        getElement: getElement,
        setElement: setElement,
        setSource: setSource,
        getSource: getSource,
        getVideoContainer: getVideoContainer,
        setVideoContainer: setVideoContainer,
        getTTMLRenderingDiv: getTTMLRenderingDiv,
        setTTMLRenderingDiv: setTTMLRenderingDiv,
        getPlaybackQuality: getPlaybackQuality
    };

    return instance;
}

VideoModel.__dashjs_factory_name = 'VideoModel';
export default FactoryMaker.getSingletonFactory(VideoModel);
