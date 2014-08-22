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
MediaPlayer.dependencies.BufferExtensions = function () {
    "use strict";

    var minBufferTarget,
        currentBufferTarget,
        topAudioQualityIndex = 0,
        topVideoQualityIndex = 0,
        audioData = null,
        videoData = null,

        getCurrentHttpRequestLatency = function(metrics) {
            var httpRequest = this.metricsExt.getCurrentHttpRequest(metrics);
            if (httpRequest !== null) {
                return (httpRequest.tresponse.getTime() - httpRequest.trequest.getTime()) / 1000;
            }
            return 0;
        },

        isPlayingAtTopQuality = function() {
            var self = this,
                audioQuality,
                videoQuality,
                isAtTop;

            audioQuality = audioData ? self.abrController.getQualityFor("audio") : topAudioQualityIndex;
            videoQuality = videoData ? self.abrController.getQualityFor("video") : topVideoQualityIndex;

            isAtTop = (audioQuality === topAudioQualityIndex) &&
                (videoQuality === topVideoQualityIndex);

            return isAtTop;
        };

    return {
        system:undefined,
        videoModel: undefined,
        manifestExt: undefined,
        metricsExt: undefined,
        metricsModel: undefined,
        abrController: undefined,
        bufferMax: undefined,

        updateData: function(data, type) {
            var topIndex = data.Representation_asArray.length - 1;

            if (type === "audio") {
                topAudioQualityIndex = topIndex;
                audioData = data;
            } else if (type === "video") {
                topVideoQualityIndex = topIndex;
                videoData = data;
            }
        },

        getTopQualityIndex: function(type) {
            var topQualityIndex = null;

            if (type === "audio") {
                topQualityIndex = topAudioQualityIndex;
            } else if (type === "video") {
                topQualityIndex = topVideoQualityIndex;
            }

            return topQualityIndex;
        },

        decideBufferLength: function (minBufferTime, duration/*, waitingForBuffer*/) {
            if (isNaN(duration) || MediaPlayer.dependencies.BufferExtensions.DEFAULT_MIN_BUFFER_TIME < duration && minBufferTime < duration) {
                minBufferTarget = Math.max(MediaPlayer.dependencies.BufferExtensions.DEFAULT_MIN_BUFFER_TIME, minBufferTime);
            } else if (minBufferTime >= duration) {
                minBufferTarget = Math.min(duration, MediaPlayer.dependencies.BufferExtensions.DEFAULT_MIN_BUFFER_TIME);
            } else {
                minBufferTarget = Math.min(duration, minBufferTime);
            }

            return Q.when(minBufferTarget);
        },

        getLeastBufferLevel: function() {
            var videoMetrics = this.metricsModel.getReadOnlyMetricsFor("video"),
                videoBufferLevel = this.metricsExt.getCurrentBufferLevel(videoMetrics),
                audioMetrics = this.metricsModel.getReadOnlyMetricsFor("audio"),
                audioBufferLevel = this.metricsExt.getCurrentBufferLevel(audioMetrics),
                leastLevel = null;

            if (videoBufferLevel === null || audioBufferLevel === null) {
                leastLevel = (audioBufferLevel !== null) ? audioBufferLevel.level : ((videoBufferLevel !== null) ? videoBufferLevel.level : null);
            } else {
                leastLevel = Math.min(audioBufferLevel.level, videoBufferLevel.level);
            }

            return leastLevel;
        },

        getRequiredBufferLength: function (waitingForBuffer, delay, isDynamic, duration) {
            var self = this,
                vmetrics = self.metricsModel.getReadOnlyMetricsFor("video"),
                ametrics = self.metricsModel.getReadOnlyMetricsFor("audio"),
                isLongFormContent = (duration >= MediaPlayer.dependencies.BufferExtensions.LONG_FORM_CONTENT_DURATION_THRESHOLD),
                deferred = Q.defer(),
                isAtTop = false,
                requiredBufferLength;

            if (self.bufferMax === MediaPlayer.dependencies.BufferExtensions.BUFFER_SIZE_MIN) {
                requiredBufferLength = minBufferTarget;
                deferred.resolve(requiredBufferLength);
            } else if (self.bufferMax === MediaPlayer.dependencies.BufferExtensions.BUFFER_SIZE_INFINITY) {
                requiredBufferLength = duration;
                deferred.resolve(requiredBufferLength);
            } else if (self.bufferMax === MediaPlayer.dependencies.BufferExtensions.BUFFER_SIZE_REQUIRED) {
                currentBufferTarget = minBufferTarget;

                if (!isDynamic) {
                    if (!waitingForBuffer) {
                        isAtTop = isPlayingAtTopQuality.call(self);
                    }
                }

                if (isAtTop) {
                    currentBufferTarget = isLongFormContent ?
                        MediaPlayer.dependencies.BufferExtensions.BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM :
                        MediaPlayer.dependencies.BufferExtensions.BUFFER_TIME_AT_TOP_QUALITY;
                }

                requiredBufferLength = currentBufferTarget + delay + Math.max(getCurrentHttpRequestLatency.call(self, vmetrics),
                    getCurrentHttpRequestLatency.call(self, ametrics));

                deferred.resolve(requiredBufferLength);
            } else {
                deferred.reject("invalid bufferMax value: " + self.bufferMax);
            }

            return deferred.promise;
        },

        //TODO: need to add this info to MediaPlayer.vo.metrics.BufferLevel or create new metric?
        getBufferTarget: function() {
            return currentBufferTarget === undefined ? minBufferTarget : currentBufferTarget;
        }
    };
};

MediaPlayer.dependencies.BufferExtensions.BUFFER_SIZE_REQUIRED = "required";
MediaPlayer.dependencies.BufferExtensions.BUFFER_SIZE_MIN = "min";
MediaPlayer.dependencies.BufferExtensions.BUFFER_SIZE_INFINITY = "infinity";
MediaPlayer.dependencies.BufferExtensions.BUFFER_TIME_AT_STARTUP = 1;
MediaPlayer.dependencies.BufferExtensions.DEFAULT_MIN_BUFFER_TIME = 8;
MediaPlayer.dependencies.BufferExtensions.BUFFER_TIME_AT_TOP_QUALITY = 30;
MediaPlayer.dependencies.BufferExtensions.BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM = 300;
MediaPlayer.dependencies.BufferExtensions.LONG_FORM_CONTENT_DURATION_THRESHOLD = 600;
MediaPlayer.dependencies.BufferExtensions.prototype.constructor = MediaPlayer.dependencies.BufferExtensions;


