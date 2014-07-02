MediaPlayer.rules.BufferLevelRule = function () {
    "use strict";

    var isBufferLevelOutran = false,
        isCompleted = {},

        onStreamCompleted = function(sender, model , request) {
            isCompleted[request.streamType] = true;
        },

        onBufferLevelOutrun = function(/*sender*/) {
            isBufferLevelOutran = true;
        },

        onBufferLevelBalanced = function(/*sender*/) {
            isBufferLevelOutran = false;
        };

    return {
        metricsExt: undefined,
        manifestExt: undefined,
        bufferExt: undefined,

        setup: function() {
            this.bufferLevelOutrun = onBufferLevelOutrun;
            this.bufferLevelBalanced = onBufferLevelBalanced;
            this.streamCompleted = onStreamCompleted;
        },

        getSegmentNumberToSchedule: function(current, metrics, scheduleController) {
            if (isBufferLevelOutran) return new MediaPlayer.rules.SwitchRequest(0, MediaPlayer.rules.SwitchRequest.prototype.STRONG);

            var bufferLevel = this.metricsExt.getCurrentBufferLevel(metrics) ? this.metricsExt.getCurrentBufferLevel(metrics).level : 0,
                representation = scheduleController.streamProcessor.getCurrentRepresentation(),
                isDynamic = this.manifestExt.getIsDynamic(representation.adaptation.period.mpd.manifest),
                rate = this.metricsExt.getCurrentPlaybackRate(metrics),
                duration = representation.adaptation.period.duration,
                bufferedDuration = bufferLevel / Math.max(rate, 1),
                segmentDuration = representation.segments[0].duration,
                currentTime = scheduleController.playbackController.getTime(),
                timeToEnd = isDynamic ? Number.POSITIVE_INFINITY : duration - currentTime,
                requiredBufferLength = Math.min(this.bufferExt.getRequiredBufferLength(isDynamic, duration), timeToEnd),
                remainingDuration = Math.max(requiredBufferLength - bufferedDuration, 0),
                segmentCount;

            segmentCount = Math.ceil(remainingDuration/segmentDuration);

            if (bufferedDuration >= timeToEnd  && !isCompleted[scheduleController.streamProcessor.getType()]) {
                segmentCount = segmentCount || 1;
            }

            return new MediaPlayer.rules.SwitchRequest(segmentCount, MediaPlayer.rules.SwitchRequest.prototype.DEFAULT);
        }
    };
};

MediaPlayer.rules.BufferLevelRule.prototype = {
    constructor: MediaPlayer.rules.BufferLevelRule
};