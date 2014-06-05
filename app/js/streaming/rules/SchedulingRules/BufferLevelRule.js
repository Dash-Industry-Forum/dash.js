MediaPlayer.rules.BufferLevelRule = function () {
    "use strict";

    var isBufferLevelOutran = false,

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
        },

        getSegmentNumberToSchedule: function(current, metrics, scheduleController) {
            if (isBufferLevelOutran) return new MediaPlayer.rules.ScheduleRequest(0, MediaPlayer.rules.ScheduleRequest.prototype.STRONG);

            var bufferLevel = this.metricsExt.getCurrentBufferLevel(metrics) ? this.metricsExt.getCurrentBufferLevel(metrics).level : 0,
                representation = scheduleController.streamProcessor.getCurrentRepresentation(),
                isDynamic = this.manifestExt.getIsDynamic(representation.adaptation.period.mpd.manifest),
                rate = this.metricsExt.getCurrentPlaybackRate(metrics),
                duration = representation.adaptation.period.duration,
                bufferedDuration = bufferLevel / Math.max(rate, 1),
                segmentDuration = representation.segments[0].duration,
                requiredBufferLength = this.bufferExt.getRequiredBufferLength(isDynamic, duration),
                remainingDuration = Math.max(requiredBufferLength - bufferedDuration, 0),
                segmentCount;

            segmentCount = Math.ceil(remainingDuration/segmentDuration);

            return new MediaPlayer.rules.ScheduleRequest(segmentCount, MediaPlayer.rules.ScheduleRequest.prototype.DEFAULT);
        }
    };
};

MediaPlayer.rules.BufferLevelRule.prototype = {
    constructor: MediaPlayer.rules.BufferLevelRule
};