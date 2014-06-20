MediaPlayer.rules.PlaybackTimeRule = function () {
    "use strict";

    var seekTarget,

        onPlaybackSeeking = function(sender, time) {
            seekTarget = time;
        };

    return {
        setup: function() {
            this.playbackSeeking = onPlaybackSeeking;
        },

        getNextRequest: function(metrics, scheduleController) {
            var representation = scheduleController.streamProcessor.getCurrentRepresentation(),
                p = seekTarget ? MediaPlayer.rules.SwitchRequest.prototype.STRONG  : MediaPlayer.rules.SwitchRequest.prototype.DEFAULT,
                rejected = scheduleController.getFragmentModel().getRejectedRequests().shift(),
                keepIdx = !!rejected && !seekTarget,
                currentTime = scheduleController.indexHandler.getCurrentTime(representation),
                playbackTime = scheduleController.playbackController.getTime(),
                rejectedEnd = rejected ? rejected.startTime + rejected.duration : null,
                useRejected = rejected && (rejectedEnd > playbackTime) && (rejected.startTime <= currentTime),
                range,
                time,
                request;

            time = seekTarget || (useRejected ? rejected.startTime : currentTime);

            seekTarget = null;

            range = scheduleController.sourceBufferExt.getBufferRange(scheduleController.bufferController.getBuffer(), time);

            if (range !== null) {
                time = range.end;
            }

            request = scheduleController.indexHandler.getSegmentRequestForTime(representation, time, keepIdx);

            while (request && scheduleController.fragmentController.isFragmentLoadedOrPending(scheduleController, request)) {
                if (request.action === "complete") {
                    request = null;
                    break;
                }

                request = scheduleController.indexHandler.getNextSegmentRequest(representation);
            }

            if (request && !useRejected) {
                scheduleController.indexHandler.setCurrentTime(request.startTime + request.duration);
            }

            return new MediaPlayer.rules.SwitchRequest(request, p);
        }
    };
};

MediaPlayer.rules.PlaybackTimeRule.prototype = {
    constructor: MediaPlayer.rules.PlaybackTimeRule
};