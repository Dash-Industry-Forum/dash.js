/*
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * author Digital Primates
 * copyright dash-if 2012
 */
MediaPlayer.models.VideoModel = function () {
    "use strict";

    var element,
        isLive = false,
        stalledStreams = [],
        _currentTime = 0,

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
        },
        handleSetCurrentTimeNotification = function (e) {
            if (element.currentTime !== _currentTime) {
                element.currentTime = _currentTime;
            }
        };

    return {
        system : undefined,

        setup : function () {
            this.system.mapHandler("setCurrentTime", undefined, handleSetCurrentTimeNotification.bind(this));
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
            _currentTime = currentTime;
        },

        listen: function (type, callback) {
            element.addEventListener(type, callback, false);
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