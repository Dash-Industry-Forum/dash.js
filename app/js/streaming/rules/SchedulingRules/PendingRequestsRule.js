MediaPlayer.rules.PendingRequestsRule = function () {
    "use strict";

    var LIMIT = 2,
        scheduleController = {};

    return {
        metricsExt: undefined,

        setScheduleController: function(scheduleControllerValue) {
            var streamId = scheduleControllerValue.streamProcessor.getStreamInfo().id;
            scheduleController[streamId] = scheduleController[streamId] || {};
            scheduleController[streamId][scheduleControllerValue.streamProcessor.getType()] = scheduleControllerValue;
        },

        execute: function(context, callback) {
            var mediaType = context.getMediaInfo().type,
                streamId = context.getStreamInfo().id,
                current = context.getCurrentValue(),
                sc = scheduleController[streamId][mediaType],
                model = sc.getFragmentModel(),
                pendingRequests = model.getPendingRequests(),
                loadingRequests = model.getLoadingRequests(),
                rejectedRequests = model.getRejectedRequests(),
                rLn = rejectedRequests.length,
                ln = pendingRequests.length + loadingRequests.length,
                count = Math.max(current - ln, 0);

            if (rLn > 0) {
                callback(new MediaPlayer.rules.SwitchRequest(rLn, MediaPlayer.rules.SwitchRequest.prototype.DEFAULT));
                return;
            }

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