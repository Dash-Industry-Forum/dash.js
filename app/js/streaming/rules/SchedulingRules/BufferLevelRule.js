MediaPlayer.rules.BufferLevelRule = function () {
    "use strict";

    var isBufferLevelOutran = {},
        isCompleted = {},
        scheduleController = {},

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
        bufferExt: undefined,
        metricsModel: undefined,

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
                track = scheduleController[streamId][mediaType].streamProcessor.getCurrentTrack(),
                isDynamic = scheduleController[streamId][mediaType].streamProcessor.isDynamic(),
                rate = this.metricsExt.getCurrentPlaybackRate(metrics),
                duration = streamInfo.duration,
                bufferedDuration = bufferLevel / Math.max(rate, 1),
                fragmentDuration = track.fragmentDuration,
                currentTime = scheduleController[streamId][mediaType].playbackController.getTime(),
                timeToEnd = isDynamic ? Number.POSITIVE_INFINITY : duration - currentTime,
                requiredBufferLength = Math.min(this.bufferExt.getRequiredBufferLength(isDynamic, duration), timeToEnd),
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