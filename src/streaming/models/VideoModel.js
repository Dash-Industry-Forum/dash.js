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

import FactoryMaker from '../../core/FactoryMaker.js';

export default FactoryMaker.getSingletonFactory(VideoModel);

function VideoModel() {

    let instance = {
        initialize:initialize,
        play: play,
        pause: pause,
        isPaused: isPaused,
        getPlaybackRate: getPlaybackRate,
        setPlaybackRate: setPlaybackRate,
        getCurrentTime: getCurrentTime,
        setCurrentTime: setCurrentTime,
        setStallState: setStallState,
        listen: listen,
        unlisten: unlisten,
        getElement: getElement,
        setElement: setElement,
        getVideoContainer: getVideoContainer,
        setVideoContainer: setVideoContainer,
        getTTMLRenderingDiv: getTTMLRenderingDiv,
        setTTMLRenderingDiv: setTTMLRenderingDiv,
        setSource: setSource
    };

    return instance;

    let element;
    let TTMLRenderingDiv;
    let videoContainer;
    let stalledStreams;

    function initialize() {
        stalledStreams = [];
    }

    function play() {
        element.play();
    }

    function pause() {
        element.pause();
    }

    function isPaused() {
        return element.paused;
    }

    function getPlaybackRate() {
        return element.playbackRate;
    }

    function setPlaybackRate(value) {
        if (!element || element.readyState < 2) return;

        element.playbackRate = value;
    }

    function getCurrentTime() {
        return element.currentTime;
    }

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
        try{
            element.currentTime = currentTime;
        } catch (e) {
            if (element.readyState === 0 && e.code === e.INVALID_STATE_ERR) {
                setTimeout(function(){
                    element.currentTime = currentTime;
                }, 400);
            }
        }
    }

    function setStallState(type, state) {
        stallStream.call(this, type, state);
    }

    function listen(type, callback) {
        element.addEventListener(type, callback, false);
    }

    function unlisten(type, callback) {
        element.removeEventListener(type, callback, false);
    }

    function getElement() {
        return element;
    }

    function setElement(value) {
        element = value;
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

    function setSource(source) {
        element.src = source;
    }

    function isStalled() {
        return (stalledStreams.length > 0);
    }

    function addStalledStream(type) {
        if (type === null || element.seeking) {
            return;
        }

        // Halt playback until nothing is stalled.
        this.setPlaybackRate(0);

        if (stalledStreams[type] === true) {
            return;
        }

        stalledStreams.push(type);
        stalledStreams[type] = true;
    }

    function removeStalledStream(type) {
        if (type === null) {
            return;
        }

        stalledStreams[type] = false;
        var index = stalledStreams.indexOf(type);
        if (index !== -1) {
            stalledStreams.splice(index, 1);
        }

        // If nothing is stalled resume playback.
        if (isStalled() === false) {
            this.setPlaybackRate(1);
        }
    }

    function stallStream(type, isStalled) {
        if (isStalled) {
            addStalledStream.call(this, type);
        } else {
            removeStalledStream.call(this, type);
        }
    }
}