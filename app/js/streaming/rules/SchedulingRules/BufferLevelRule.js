MediaPlayer.rules.BufferLevelRule = function () {
    "use strict";

    var isBufferLevelOutran = {},
        isCompleted = {},
        scheduleController = {},

        isCompletedT = function(periodId, type) {
            return (isCompleted[periodId] && isCompleted[periodId][type]);
        },

        isBufferLevelOutranT = function(periodId, type) {
            return (isBufferLevelOutran[periodId] && isBufferLevelOutran[periodId][type]);
        },

        onStreamCompleted = function(sender, model , request) {
            var periodId = model.getContext().streamProcessor.getPeriodInfo().id;
            isCompleted[periodId] = isCompleted[periodId] || {};
            isCompleted[periodId][request.streamType] = true;
        },

        onBufferLevelOutrun = function(sender) {
            var periodId = sender.streamProcessor.getPeriodInfo().id;
            isBufferLevelOutran[periodId] = isBufferLevelOutran[periodId] || {};
            isBufferLevelOutran[periodId][sender.streamProcessor.getType()] = true;
        },

        onBufferLevelBalanced = function(sender) {
            var periodId = sender.streamProcessor.getPeriodInfo().id;
            isBufferLevelOutran[periodId] = isBufferLevelOutran[periodId] || {};
            isBufferLevelOutran[periodId][sender.streamProcessor.getType()] = false;
        };

    return {
        metricsExt: undefined,
        manifestExt: undefined,
        bufferExt: undefined,
        metricsModel: undefined,

        setup: function() {
            this.bufferLevelOutrun = onBufferLevelOutrun;
            this.bufferLevelBalanced = onBufferLevelBalanced;
            this.streamCompleted = onStreamCompleted;
        },

        setScheduleController: function(scheduleControllerValue) {
            var id = scheduleControllerValue.streamProcessor.getPeriodInfo().id;
            scheduleController[id] = scheduleController[id] || {};
            scheduleController[id][scheduleControllerValue.streamProcessor.getType()] = scheduleControllerValue;
        },

        execute: function(context, callback) {
            var periodId = context.getPeriodInfo().id,
                streamType = context.getStreamType();

            if (isBufferLevelOutranT(periodId, streamType)) {
                callback(new MediaPlayer.rules.SwitchRequest(0, MediaPlayer.rules.SwitchRequest.prototype.STRONG));
                return;
            }

            var metrics = this.metricsModel.getReadOnlyMetricsFor(streamType),
                bufferLevel = this.metricsExt.getCurrentBufferLevel(metrics) ? this.metricsExt.getCurrentBufferLevel(metrics).level : 0,
                representation = scheduleController[periodId][streamType].streamProcessor.getCurrentRepresentation(),
                isDynamic = this.manifestExt.getIsDynamic(representation.adaptation.period.mpd.manifest),
                rate = this.metricsExt.getCurrentPlaybackRate(metrics),
                duration = representation.adaptation.period.duration,
                bufferedDuration = bufferLevel / Math.max(rate, 1),
                segmentDuration = representation.segments[0].duration,
                currentTime = scheduleController[periodId][streamType].playbackController.getTime(),
                timeToEnd = isDynamic ? Number.POSITIVE_INFINITY : duration - currentTime,
                requiredBufferLength = Math.min(this.bufferExt.getRequiredBufferLength(isDynamic, duration), timeToEnd),
                remainingDuration = Math.max(requiredBufferLength - bufferedDuration, 0),
                segmentCount;

            segmentCount = Math.ceil(remainingDuration/segmentDuration);

            if (bufferedDuration >= timeToEnd  && !isCompletedT(periodId,streamType)) {
                segmentCount = segmentCount || 1;
            }

            callback(new MediaPlayer.rules.SwitchRequest(segmentCount, MediaPlayer.rules.SwitchRequest.prototype.DEFAULT));
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