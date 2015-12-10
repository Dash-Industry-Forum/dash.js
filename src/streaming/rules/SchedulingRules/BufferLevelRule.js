
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
MediaPlayer.rules.BufferLevelRule = function () {
    "use strict";

    var scheduleController = {},
        MINIMUM_LATENCY_BUFFER = 500,

        decideBufferLength = function (minBufferTime, duration, isDynamic) {
            var minBufferTarget;

            // For dynamic streams buffer length must not exceed a
            // value of the live edge delay.
            if (isDynamic) {
                minBufferTarget = this.playbackController.getLiveDelay();
            } else if (isNaN(duration) || MediaPlayer.dependencies.BufferController.DEFAULT_MIN_BUFFER_TIME < duration && minBufferTime < duration) {
                minBufferTarget = Math.max(MediaPlayer.dependencies.BufferController.DEFAULT_MIN_BUFFER_TIME, minBufferTime);
            } else if (minBufferTime >= duration) {
                minBufferTarget = Math.min(duration, MediaPlayer.dependencies.BufferController.DEFAULT_MIN_BUFFER_TIME);
            } else {
                minBufferTarget = Math.min(duration, minBufferTime);
            }

            return minBufferTarget;
        },

        getRequiredBufferLength = function (isDynamic, duration, scheduleController) {
            var self = this,
                criticalBufferLevel = scheduleController.bufferController.getCriticalBufferLevel(),
                vmetrics = self.metricsModel.getReadOnlyMetricsFor("video"),
                ametrics = self.metricsModel.getReadOnlyMetricsFor("audio"),
                minBufferTarget = decideBufferLength.call(this, scheduleController.bufferController.getMinBufferTime(), duration, isDynamic),
                currentBufferTarget = minBufferTarget,
                bufferMax = scheduleController.bufferController.bufferMax,
                //isLongFormContent = (duration >= MediaPlayer.dependencies.BufferController.LONG_FORM_CONTENT_DURATION_THRESHOLD),
                requiredBufferLength = 0;


            if (bufferMax === MediaPlayer.dependencies.BufferController.BUFFER_SIZE_MIN) {
                requiredBufferLength = minBufferTarget;
            } else if (bufferMax === MediaPlayer.dependencies.BufferController.BUFFER_SIZE_INFINITY) {
                requiredBufferLength = duration;
            } else if (bufferMax === MediaPlayer.dependencies.BufferController.BUFFER_SIZE_REQUIRED) {
                if (!isDynamic && self.abrController.isPlayingAtTopQuality(scheduleController.streamProcessor.getStreamInfo())) {
                    currentBufferTarget = /*isLongFormContent ?
                        MediaPlayer.dependencies.BufferController.BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM :*/
                        MediaPlayer.dependencies.BufferController.BUFFER_TIME_AT_TOP_QUALITY;
                }
                var vLatency = vmetrics ? self.metricsExt.getRecentLatency(vmetrics, 4) : 0;
                var aLatency = ametrics ? self.metricsExt.getRecentLatency(ametrics, 4) : 0;

                var recentLatency = Math.max( Math.max(vLatency,aLatency),MINIMUM_LATENCY_BUFFER);

                requiredBufferLength = currentBufferTarget + recentLatency;
            }

            return Math.min(requiredBufferLength, criticalBufferLevel);
        };

    return {
        log: undefined,

        metricsExt: undefined,
        metricsModel: undefined,
        abrController: undefined,
        playbackController: undefined,
        mediaController: undefined,
        virtualBuffer: undefined,
        videoModel: undefined,

        setScheduleController: function(scheduleControllerValue) {
            var id = scheduleControllerValue.streamProcessor.getStreamInfo().id;
            scheduleController[id] = scheduleController[id] || {};
            scheduleController[id][scheduleControllerValue.streamProcessor.getType()] = scheduleControllerValue;
        },

        execute: function(context, callback) {
            var streamInfo = context.getStreamInfo(),
                streamId = streamInfo.id,
                mediaInfo = context.getMediaInfo(),
                mediaType = mediaInfo.type;

            var metrics = this.metricsModel.getReadOnlyMetricsFor(mediaType),
                switchMode = this.mediaController.getSwitchMode(),
                bufferLevel = this.metricsExt.getCurrentBufferLevel(metrics),
                currentTime = this.playbackController.getTime(),
                appendedChunks = this.virtualBuffer.getChunks({streamId: streamId, mediaType: mediaType, appended: true, mediaInfo: mediaInfo, forRange: {start: currentTime, end: (currentTime + bufferLevel)}}),
                appendedLevel = (appendedChunks && appendedChunks.length > 0) ? (appendedChunks[appendedChunks.length-1].bufferedRange.end - currentTime) : null,
                actualBufferLevel = switchMode === MediaPlayer.dependencies.MediaController.trackSwitchModes.NEVER_REPLACE ? bufferLevel : (appendedLevel || 0),
                scheduleCtrl = scheduleController[streamId][mediaType],
                representationInfo = scheduleCtrl.streamProcessor.getCurrentRepresentationInfo(),
                isDynamic = scheduleCtrl.streamProcessor.isDynamic(),
                rate = this.videoModel.getPlaybackRate(),
                duration = streamInfo.manifestInfo.duration,
                bufferedDuration = actualBufferLevel / Math.max(Math.abs(rate), 1),
                fragmentDuration = representationInfo.fragmentDuration,
                timeToEnd = isDynamic ? Number.POSITIVE_INFINITY : duration - currentTime,
                requiredBufferLength = Math.min(getRequiredBufferLength.call(this, isDynamic, duration, scheduleCtrl), timeToEnd),
                remainingDuration = Math.max(requiredBufferLength - bufferedDuration, 0),
                fragmentCount;

            fragmentCount = Math.ceil(remainingDuration/fragmentDuration);

            callback(new MediaPlayer.rules.SwitchRequest(fragmentCount, MediaPlayer.rules.SwitchRequest.prototype.DEFAULT));
        },

        reset: function() {
            scheduleController = {};
        }
    };
};

MediaPlayer.rules.BufferLevelRule.prototype = {
    constructor: MediaPlayer.rules.BufferLevelRule
};
