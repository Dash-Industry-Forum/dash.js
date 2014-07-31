MediaPlayer.rules.BufferLevelRule = function () {
    "use strict";

    var isBufferLevelOutran = {},
        isCompleted = {},
        scheduleController = {},

        onStreamCompleted = function(sender, model , request) {
            isCompleted[request.streamType] = true;
        },

        onBufferLevelOutrun = function(sender) {
            isBufferLevelOutran[sender.streamProcessor.getType()] = true;
        },

        onBufferLevelBalanced = function(sender) {
            isBufferLevelOutran[sender.streamProcessor.getType()] = false;
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
            scheduleController[scheduleControllerValue.streamProcessor.getType()] = scheduleControllerValue;
        },

        execute: function(streamType, callback/*, current*/) {
            if (isBufferLevelOutran[streamType]) {
                callback(new MediaPlayer.rules.SwitchRequest(0, MediaPlayer.rules.SwitchRequest.prototype.STRONG));
                return;
            }

            var metrics = this.metricsModel.getReadOnlyMetricsFor(streamType),
                bufferLevel = this.metricsExt.getCurrentBufferLevel(metrics) ? this.metricsExt.getCurrentBufferLevel(metrics).level : 0,
                representation = scheduleController[streamType].streamProcessor.getCurrentRepresentation(),
                isDynamic = this.manifestExt.getIsDynamic(representation.adaptation.period.mpd.manifest),
                rate = this.metricsExt.getCurrentPlaybackRate(metrics),
                duration = representation.adaptation.period.duration,
                bufferedDuration = bufferLevel / Math.max(rate, 1),
                segmentDuration = representation.segments[0].duration,
                currentTime = scheduleController[streamType].playbackController.getTime(),
                timeToEnd = isDynamic ? Number.POSITIVE_INFINITY : duration - currentTime,
                requiredBufferLength = Math.min(this.bufferExt.getRequiredBufferLength(isDynamic, duration), timeToEnd),
                remainingDuration = Math.max(requiredBufferLength - bufferedDuration, 0),
                segmentCount;

            segmentCount = Math.ceil(remainingDuration/segmentDuration);

            if (bufferedDuration >= timeToEnd  && !isCompleted[streamType]) {
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