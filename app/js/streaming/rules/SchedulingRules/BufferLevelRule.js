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

        decideBufferLength = function (minBufferTime, duration) {
            var minBufferTarget;

            if (isNaN(duration) || MediaPlayer.dependencies.BufferController.DEFAULT_MIN_BUFFER_TIME < duration && minBufferTime < duration) {
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
                minBufferTarget = decideBufferLength.call(this, scheduleController.bufferController.getMinBufferTime(), duration),
                currentBufferTarget = minBufferTarget,
                bufferMax = scheduleController.bufferController.bufferMax,
                vmetrics = self.metricsModel.getReadOnlyMetricsFor("video"),
                ametrics = self.metricsModel.getReadOnlyMetricsFor("audio"),
                isLongFormContent = (duration >= MediaPlayer.dependencies.BufferController.LONG_FORM_CONTENT_DURATION_THRESHOLD),
                requiredBufferLength = 0;

            if (bufferMax === MediaPlayer.dependencies.BufferController.BUFFER_SIZE_MIN) {
                requiredBufferLength = minBufferTarget;
            } else if (bufferMax === MediaPlayer.dependencies.BufferController.BUFFER_SIZE_INFINITY) {
                requiredBufferLength = duration;
            } else if (bufferMax === MediaPlayer.dependencies.BufferController.BUFFER_SIZE_REQUIRED) {
                if (!isDynamic && self.abrController.isPlayingAtTopQuality(scheduleController.streamProcessor.getStreamInfo())) {
                    currentBufferTarget = isLongFormContent ?
                        MediaPlayer.dependencies.BufferController.BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM :
                        MediaPlayer.dependencies.BufferController.BUFFER_TIME_AT_TOP_QUALITY;
                }

                requiredBufferLength = currentBufferTarget + Math.max(getCurrentHttpRequestLatency.call(self, vmetrics),
                    getCurrentHttpRequestLatency.call(self, ametrics));
            }

            requiredBufferLength = Math.min(requiredBufferLength, criticalBufferLevel);

            return requiredBufferLength;
        },

        isCompletedT = function(streamId, type) {
            return (isCompleted[streamId] && isCompleted[streamId][type]);
        },

        isBufferLevelOutranT = function(streamId, type) {
            return (isBufferLevelOutran[streamId] && isBufferLevelOutran[streamId][type]);
        },

        onStreamCompleted = function(sender, model , request) {
            var streamId = model.getContext().streamProcessor.getStreamInfo().id;
            isCompleted[streamId] = isCompleted[streamId] || {};
            isCompleted[streamId][request.mediaType] = true;
        },

        onBufferLevelOutrun = function(sender) {
            var streamId = sender.streamProcessor.getStreamInfo().id;
            isBufferLevelOutran[streamId] = isBufferLevelOutran[streamId] || {};
            isBufferLevelOutran[streamId][sender.streamProcessor.getType()] = true;
        },

        onBufferLevelBalanced = function(sender) {
            var streamId = sender.streamProcessor.getStreamInfo().id;
            isBufferLevelOutran[streamId] = isBufferLevelOutran[streamId] || {};
            isBufferLevelOutran[streamId][sender.streamProcessor.getType()] = false;
        };

    return {
        metricsExt: undefined,
        metricsModel: undefined,
        abrController: undefined,

        setup: function() {
            this.bufferLevelOutrun = onBufferLevelOutrun;
            this.bufferLevelBalanced = onBufferLevelBalanced;
            this.streamCompleted = onStreamCompleted;
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
                duration = streamInfo.duration,
                bufferedDuration = bufferLevel / Math.max(rate, 1),
                fragmentDuration = track.fragmentDuration,
                currentTime = scheduleCtrl.playbackController.getTime(),
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