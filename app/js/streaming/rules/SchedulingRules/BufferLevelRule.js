MediaPlayer.rules.BufferLevelRule = function () {
    "use strict";

    var getSegmentNumberToSchedule = function (metrics, segmentDuration, requiredBufferLength) {
            var bufferLevel = this.metricsExt.getCurrentBufferLevel(metrics).level,
                rate = this.metricsExt.getCurrentPlaybackRate(metrics),
                bufferedDuration = bufferLevel / Math.max(rate, 1),
                remainingDuration = Math.max(requiredBufferLength - bufferedDuration, 0),
                segmentCount;

            segmentCount = Math.ceil(remainingDuration/segmentDuration);

            return new MediaPlayer.rules.ScheduleRequest(segmentCount);
        };

    return {
        metricsExt: undefined,
        getSegmentNumberToSchedule: getSegmentNumberToSchedule
    };
};

MediaPlayer.rules.BufferLevelRule.prototype = {
    constructor: MediaPlayer.rules.BufferLevelRule
};