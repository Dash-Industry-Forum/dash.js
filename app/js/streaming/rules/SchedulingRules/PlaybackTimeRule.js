MediaPlayer.rules.PlaybackTimeRule = function () {
    "use strict";

    var seekTarget = {},
        scheduleController = {},

        onPlaybackSeeking = function(sender, time) {
            var periodId = sender.getPeriodId();
            seekTarget[periodId] = seekTarget[periodId] || {};
            seekTarget[periodId].audio = time;
            seekTarget[periodId].video = time;
        };

    return {
        setup: function() {
            this.playbackSeeking = onPlaybackSeeking;
        },

        setScheduleController: function(scheduleControllerValue) {
            var periodId = scheduleControllerValue.streamProcessor.getPeriodInfo().id;
            scheduleController[periodId] = scheduleController[periodId] || {};
            scheduleController[periodId][scheduleControllerValue.streamProcessor.getType()] = scheduleControllerValue;
        },

        execute: function(context, callback) {
            var streamType = context.getStreamType(),
                periodId = context.getPeriodInfo().id,
                sc = scheduleController[periodId][streamType],
                representation = sc.streamProcessor.getCurrentRepresentation(),
                st = seekTarget[periodId] ? seekTarget[periodId][streamType] : null,
                p = st ? MediaPlayer.rules.SwitchRequest.prototype.STRONG  : MediaPlayer.rules.SwitchRequest.prototype.DEFAULT,
                rejected = sc.getFragmentModel().getRejectedRequests().shift(),
                keepIdx = !!rejected && !st,
                currentTime = sc.indexHandler.getCurrentTime(representation),
                playbackTime = sc.playbackController.getTime(),
                rejectedEnd = rejected ? rejected.startTime + rejected.duration : null,
                useRejected = rejected && ((rejectedEnd > playbackTime) && (rejected.startTime <= currentTime) || isNaN(currentTime)),
                range,
                time,
                request;

            time = st || (useRejected ? rejected.startTime : currentTime);

            if (isNaN(time)) {
                callback(new MediaPlayer.rules.SwitchRequest(null, p));
                return;
            }

            if (seekTarget[periodId]) {
                seekTarget[periodId][streamType] = null;
            }

            range = sc.sourceBufferExt.getBufferRange(sc.bufferController.getBuffer(), time);

            if (range !== null) {
                time = range.end;
            }

            request = sc.indexHandler.getSegmentRequestForTime(representation, time, keepIdx);

            while (request && sc.fragmentController.isFragmentLoadedOrPending(sc, request)) {
                if (request.action === "complete") {
                    request = null;
                    sc.indexHandler.setCurrentTime(NaN);
                    break;
                }

                request = sc.indexHandler.getNextSegmentRequest(representation);
            }

            if (request && !useRejected) {
                sc.indexHandler.setCurrentTime(request.startTime + request.duration);
            }

            callback(new MediaPlayer.rules.SwitchRequest(request, p));
        },

        reset: function() {
            seekTarget = {};
            scheduleController = {};
        }
    };
};

MediaPlayer.rules.PlaybackTimeRule.prototype = {
    constructor: MediaPlayer.rules.PlaybackTimeRule
};