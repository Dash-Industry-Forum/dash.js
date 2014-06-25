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
            if (isBufferLevelOutran) return new MediaPlayer.rules.SwitchRequest(0, MediaPlayer.rules.SwitchRequest.prototype.STRONG);

            var bufferLevel = this.metricsExt.getCurrentBufferLevel(metrics) ? this.metricsExt.getCurrentBufferLevel(metrics).level : 0,
                representation = scheduleController.streamProcessor.getCurrentRepresentation(),
                isDynamic = this.manifestExt.getIsDynamic(representation.adaptation.period.mpd.manifest),
                rate = this.metricsExt.getCurrentPlaybackRate(metrics),
                duration = representation.adaptation.period.duration,
                bufferedDuration = bufferLevel / Math.max(rate, 1),
                segmentDuration = representation.segments[0].duration,
                currentTime = scheduleController.playbackController.getTime(),
                requiredBufferLength = Math.min(this.bufferExt.getRequiredBufferLength(isDynamic, duration), isDynamic ? Number.POSITIVE_INFINITY : (duration - currentTime)),
                remainingDuration = Math.max(requiredBufferLength - bufferedDuration, 0),
                segmentCount;

            segmentCount = Math.ceil(remainingDuration/segmentDuration);

            return new MediaPlayer.rules.SwitchRequest(segmentCount, MediaPlayer.rules.SwitchRequest.prototype.DEFAULT);
        }
    };
};

MediaPlayer.rules.BufferLevelRule.prototype = {
    constructor: MediaPlayer.rules.BufferLevelRule
};