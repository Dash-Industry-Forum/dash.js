/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 * 
 * Copyright (c) 2013, Digital Primates
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.models.VideoModel = function () {
    "use strict";

    var element,
        isLive = false,
        stalledStreams = [],
        //_currentTime = 0,

        isStalled = function () {
            return (stalledStreams.length > 0);
        },

        addStalledStream = function (type) {
            if (type === null || stalledStreams[type] === true) {
                return;
            }

            stalledStreams.push(type);
            stalledStreams[type] = true;

            // Halt playback until nothing is stalled.
            element.playbackRate = 0;
        },

        removeStalledStream = function (type) {
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
                element.playbackRate = 1;
            }
        },

        stallStream = function (type, isStalled) {
            if (isStalled) {
                addStalledStream(type);
            } else {
                removeStalledStream(type);
            }
        }/*,
        handleSetCurrentTimeNotification = function () {
            if (element.currentTime !== _currentTime) {
                element.currentTime = _currentTime;
            }
        }*/;

    return {
        system : undefined,

        setup : function () {
            //this.system.mapHandler("setCurrentTime", undefined, handleSetCurrentTimeNotification.bind(this));
        },

        play: function () {
            element.play();
        },

        pause: function () {
            element.pause();
        },

        isPaused: function () {
            return element.paused;
        },

        getPlaybackRate:  function () {
            return element.playbackRate;
        },

        setPlaybackRate: function (value) {
            element.playbackRate = value;
        },

        getCurrentTime: function () {
            return element.currentTime;
        },

        setCurrentTime: function (currentTime) {
            //_currentTime = currentTime;

            // We don't set the same currentTime because it can cause firing unexpected Pause event in IE11
            // providing playbackRate property equals to zero.
            if (element.currentTime == currentTime) return;

            element.currentTime = currentTime;
        },

        listen: function (type, callback) {
            element.addEventListener(type, callback, false);
        },

        unlisten: function (type, callback) {
            element.removeEventListener(type, callback, false);
        },

        getElement: function () {
            return element;
        },

        setElement: function (value) {
            element = value;
        },

        setSource: function (source) {
            element.src = source;
        },

        getIsLive: function () {
            return isLive;
        },

        setIsLive: function (value) {
            isLive = value;
        },

        stallStream: stallStream,
        isStalled: isStalled
    };
};

MediaPlayer.models.VideoModel.prototype = {
    constructor: MediaPlayer.models.VideoModel
};