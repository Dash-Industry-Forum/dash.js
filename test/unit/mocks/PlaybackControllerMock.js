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
import FactoryMaker from '../../../src/core/FactoryMaker';

function PlaybackControllerMock() {

    let instance,
        playing,
        paused,
        seeking,
        isDynamic,
        liveStartTime;

    function setup() {
        paused = false;
        playing = false;
        seeking = false;
        isDynamic = false;
    }

    function initialize() {}

    function getTimeToStreamEnd() {
        return 0;
    }

    function isPlaybackStarted() {
        return getTime() > 0;
    }

    function getStreamId() {
        return 0;
    }

    function play() {
        playing = true;
        paused = false;
        seeking = false;
    }

    function isPlaying() {
        return playing;
    }

    function isPaused() {
        return paused;
    }

    function pause() {
        paused = true;
    }

    function isSeeking() {
        return seeking;
    }

    function seek() {
        seeking = true;
    }

    function getTime() {
        return null;
    }

    function getPlaybackRate() {
        return null;
    }

    function getPlayedRanges() {
        return null;
    }

    function getEnded() {
        return null;
    }

    function setIsDynamic(value) {
        isDynamic = value;
    }

    function getIsDynamic() {
        return isDynamic;
    }

    function setLiveStartTime(value) {
        liveStartTime = value;
    }

    function getLiveStartTime() {
        return liveStartTime;
    }

    function computeLiveDelay() {
        return 16;
    }

    function reset() {
        setup();
    }

    function setConfig(config) {
        if (!config) return;
    }

    function getStreamStartTime() {
        return 0;
    }

    instance = {
        initialize: initialize,
        setConfig: setConfig,
        getStreamStartTime: getStreamStartTime,
        getTimeToStreamEnd: getTimeToStreamEnd,
        isPlaybackStarted: isPlaybackStarted,
        getStreamId: getStreamId,
        getTime: getTime,
        getPlaybackRate: getPlaybackRate,
        getPlayedRanges: getPlayedRanges,
        getEnded: getEnded,
        setisDynamic: setIsDynamic,
        getIsDynamic: getIsDynamic,
        setLiveStartTime: setLiveStartTime,
        getLiveStartTime: getLiveStartTime,
        computeLiveDelay: computeLiveDelay,
        play: play,
        isPlaying: isPlaying,
        isPaused: isPaused,
        pause: pause,
        isSeeking: isSeeking,
        seek: seek,
        reset: reset
    };

    setup();
    return instance;
}

PlaybackControllerMock.__dashjs_factory_name = 'PlaybackControllerMock';
export default FactoryMaker.getSingletonFactory(PlaybackControllerMock);
