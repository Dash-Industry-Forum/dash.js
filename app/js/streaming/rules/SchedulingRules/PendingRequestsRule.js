MediaPlayer.rules.PendingRequestsRule = function () {
    "use strict";

    var LIMIT = 3,
        scheduleController = {};

    return {
        metricsExt: undefined,
        manifestExt: undefined,
        bufferExt: undefined,

        setScheduleController: function(scheduleControllerValue) {
            var periodId = scheduleControllerValue.streamProcessor.getPeriodInfo().id;
            scheduleController[periodId] = scheduleController[periodId] || {};
            scheduleController[periodId][scheduleControllerValue.streamProcessor.getType()] = scheduleControllerValue;
        },

        execute: function(context, callback) {
            var streamType = context.getStreamType(),
                periodId = context.getPeriodInfo().id,
                current = context.getCurrentValue(),
                sc = scheduleController[periodId][streamType],
                pendingRequests = sc.fragmentController.getPendingRequests(sc),
                loadingRequests = sc.fragmentController.getLoadingRequests(sc),
                ln = pendingRequests.length + loadingRequests.length,
                count = Math.max(current - ln, 0);

            if (ln > LIMIT) {
                callback(new MediaPlayer.rules.SwitchRequest(0, MediaPlayer.rules.SwitchRequest.prototype.DEFAULT));
                return;
            }

            if (current === 0) {
                callback(new MediaPlayer.rules.SwitchRequest(count, MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE));
                return;
            }

            callback(new MediaPlayer.rules.SwitchRequest(count, MediaPlayer.rules.SwitchRequest.prototype.DEFAULT));
        },

        reset: function() {
            scheduleController = {};
        }
    };
};

MediaPlayer.rules.PendingRequestsRule.prototype = {
    constructor: MediaPlayer.rules.PendingRequestsRule
};