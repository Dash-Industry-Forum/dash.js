MediaPlayer.rules.PendingRequestsRule = function () {
    "use strict";

    var LIMIT = 3,
        scheduleController = {};

    return {
        metricsExt: undefined,
        manifestExt: undefined,
        bufferExt: undefined,

        setScheduleController: function(scheduleControllerValue) {
            scheduleController[scheduleControllerValue.streamProcessor.getType()] = scheduleControllerValue;
        },

        execute: function(streamType, callback, current) {
            var sc = scheduleController[streamType],
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