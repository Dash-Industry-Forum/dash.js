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
        isLongFormContent,
        totalRepresentationCount,
        isLive,
        getCurrentIndex = function(metrics) {
            var repSwitch = this.metricsExt.getCurrentRepresentationSwitch(metrics);

            if (repSwitch != null) {
                return this.metricsExt.getIndexForRepresentation(repSwitch.to);
            }
            return null;
        };

    return {
        system:undefined,
        videoModel: undefined,
        manifestExt: undefined,
        metricsExt: undefined,
        init: function(duration, manifest) {
            isLive = this.videoModel.getIsLive();
            isLongFormContent = (duration >= MediaPlayer.dependencies.BufferExtensions.LONG_FORM_CONTENT_DURATION_THRESHOLD);
            this.manifestExt.getVideoData(manifest).then(
                function(data) {
                    totalRepresentationCount = data.Representation_asArray.length - 1;
                }
            );
        },
        decideBufferLength: function (minBufferTime, waitingForBuffer) {

            minBufferTarget = (waitingForBuffer || waitingForBuffer === undefined) ?
                MediaPlayer.dependencies.BufferExtensions.BUFFER_TIME_AT_STARTUP :
                Math.max(MediaPlayer.dependencies.BufferExtensions.DEFAULT_MIN_BUFFER_TIME, minBufferTime);

            return Q.when(minBufferTarget);
        },
        shouldBufferMore: function (bufferLength, waitingForBuffer, delay) {
            var metrics = player.getMetricsFor("video"),
                isPlayingAtTopQuality = (getCurrentIndex.call(this, metrics) === totalRepresentationCount),
                result;

            currentBufferTarget = minBufferTarget;

            if (!isLive) {
                if (!waitingForBuffer && isPlayingAtTopQuality) {
                    currentBufferTarget = isLongFormContent ?
                        MediaPlayer.dependencies.BufferExtensions.BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM :
                        MediaPlayer.dependencies.BufferExtensions.BUFFER_TIME_AT_TOP_QUALITY;
                }
            }

            result = (bufferLength - delay) < currentBufferTarget;
            return Q.when(result);
        },
        getBufferTarget: function() {
            return currentBufferTarget === undefined ? minBufferTarget : currentBufferTarget;
        }
    };
};

MediaPlayer.dependencies.BufferExtensions.BUFFER_TIME_AT_STARTUP = 1;
MediaPlayer.dependencies.BufferExtensions.DEFAULT_MIN_BUFFER_TIME = 8;
MediaPlayer.dependencies.BufferExtensions.BUFFER_TIME_AT_TOP_QUALITY = 30;
MediaPlayer.dependencies.BufferExtensions.BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM = 300;
MediaPlayer.dependencies.BufferExtensions.LONG_FORM_CONTENT_DURATION_THRESHOLD = 600;
MediaPlayer.dependencies.BufferExtensions.prototype.constructor = MediaPlayer.dependencies.BufferExtensions;



