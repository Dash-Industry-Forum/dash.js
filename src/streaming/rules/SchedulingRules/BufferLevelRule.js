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

    var isBufferLevelOutran = {},
        isCompleted = {},
        scheduleController = {},

        getCurrentHttpRequestLatency = function(metrics) {
            var httpRequest = this.metricsExt.getCurrentHttpRequest(metrics);
            if (httpRequest !== null) {
                return (httpRequest.tresponse.getTime() - httpRequest.trequest.getTime()) / 1000;
            }
            return 0;
        },

        decideBufferLength = function (minBufferTime, duration, isDynamic) {
            var minBufferTarget;

            // For dynamic streams buffer length must not exceed a value of the live edge delay.
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
                requiredBufferLength = currentBufferTarget + Math.max(getCurrentHttpRequestLatency.call(self, vmetrics),
                    getCurrentHttpRequestLatency.call(self, ametrics));
            }

            requiredBufferLength = Math.min(requiredBufferLength, criticalBufferLevel) ;

            return requiredBufferLength;
        },

        isCompletedT = function(streamId, type) {
            return (isCompleted[streamId] && isCompleted[streamId][type]);
        },

        isBufferLevelOutranT = function(streamId, type) {
            return (isBufferLevelOutran[streamId] && isBufferLevelOutran[streamId][type]);
        },

        onStreamCompleted = function(e) {
            var streamId = e.data.fragmentModel.getContext().streamProcessor.getStreamInfo().id;
            isCompleted[streamId] = isCompleted[streamId] || {};
            isCompleted[streamId][e.data.request.mediaType] = true;
        },

        onBufferLevelOutrun = function(e) {
            var streamId = e.sender.streamProcessor.getStreamInfo().id;
            isBufferLevelOutran[streamId] = isBufferLevelOutran[streamId] || {};
            isBufferLevelOutran[streamId][e.sender.streamProcessor.getType()] = true;
        },

        onBufferLevelBalanced = function(e) {
            var streamId = e.sender.streamProcessor.getStreamInfo().id;
            isBufferLevelOutran[streamId] = isBufferLevelOutran[streamId] || {};
            isBufferLevelOutran[streamId][e.sender.streamProcessor.getType()] = false;
        };

    return {
        metricsExt: undefined,
        metricsModel: undefined,
        abrController: undefined,
        playbackController: undefined,

        setup: function() {
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN] = onBufferLevelOutrun;
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED] = onBufferLevelBalanced;
            this[MediaPlayer.dependencies.FragmentController.eventList.ENAME_STREAM_COMPLETED] = onStreamCompleted;
        },

        setScheduleController: function(scheduleControllerValue) {
            var id = scheduleControllerValue.streamProcessor.getStreamInfo().id;
            scheduleController[id] = scheduleController[id] || {};
            scheduleController[id][scheduleControllerValue.streamProcessor.getType()] = scheduleControllerValue;
        },

        execute: function(context, callback) {
            var streamInfo = context.getStreamInfo(),
                streamId = streamInfo.id,
                mediaType = context.getMediaInfo().type;

            if (isBufferLevelOutranT(streamId, mediaType)) {
                callback(new MediaPlayer.rules.SwitchRequest(0, MediaPlayer.rules.SwitchRequest.prototype.STRONG));
                return;
            }

            var metrics = this.metricsModel.getReadOnlyMetricsFor(mediaType),
                bufferLevel = this.metricsExt.getCurrentBufferLevel(metrics) ? this.metricsExt.getCurrentBufferLevel(metrics).level : 0,
                scheduleCtrl = scheduleController[streamId][mediaType],
                track = scheduleCtrl.streamProcessor.getCurrentTrack(),
                isDynamic = scheduleCtrl.streamProcessor.isDynamic(),
                rate = this.metricsExt.getCurrentPlaybackRate(metrics),
                duration = streamInfo.manifestInfo.duration,
                bufferedDuration = bufferLevel / Math.max(rate, 1),
                fragmentDuration = track.fragmentDuration,
                currentTime = this.playbackController.getTime(),
                timeToEnd = isDynamic ? Number.POSITIVE_INFINITY : duration - currentTime,
                requiredBufferLength = Math.min(getRequiredBufferLength.call(this, isDynamic, duration, scheduleCtrl), timeToEnd),
                remainingDuration = Math.max(requiredBufferLength - bufferedDuration, 0),
                fragmentCount;

            fragmentCount = Math.ceil(remainingDuration/fragmentDuration);

            if (bufferedDuration >= timeToEnd  && !isCompletedT(streamId,mediaType)) {
                fragmentCount = fragmentCount || 1;
            }

            callback(new MediaPlayer.rules.SwitchRequest(fragmentCount, MediaPlayer.rules.SwitchRequest.prototype.DEFAULT));
        },

        reset: function() {
            isBufferLevelOutran = {};
            isCompleted = {};
            scheduleController = {};
        }
    };
};

MediaPlayer.rules.BufferLevelRule.prototype = {
    constructor: MediaPlayer.rules.BufferLevelRule
};
