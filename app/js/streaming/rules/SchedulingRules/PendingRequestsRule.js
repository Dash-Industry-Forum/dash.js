MediaPlayer.rules.PendingRequestsRule = function () {
    "use strict";

    return {
        metricsExt: undefined,
        manifestExt: undefined,
        bufferExt: undefined,

        getSegmentNumberToSchedule: function(current, metrics, scheduleController) {
            var pendingRequests = scheduleController.fragmentController.getPendingRequests(scheduleController),
                loadingRequests = scheduleController.fragmentController.getLoadingRequests(scheduleController),
                ln = pendingRequests.length + loadingRequests.length,
                count = current - ln;

            if (count > 0) return new MediaPlayer.rules.ScheduleRequest(count, MediaPlayer.rules.ScheduleRequest.prototype.DEFAULT);

            if (current === 0) return new MediaPlayer.rules.ScheduleRequest(count, MediaPlayer.rules.ScheduleRequest.prototype.NO_CHANGE);

            return new MediaPlayer.rules.ScheduleRequest(0, MediaPlayer.rules.ScheduleRequest.prototype.STRONG);
        }
    };
};

MediaPlayer.rules.PendingRequestsRule.prototype = {
    constructor: MediaPlayer.rules.PendingRequestsRule
};