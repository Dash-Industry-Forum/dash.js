MediaPlayer.rules.PlaybackTimeRule = function () {
    "use strict";

    return {

        getNextRequest: function(seekTarget, metrics, scheduleController) {
            var representation = scheduleController.streamProcessor.getCurrentRepresentation(),
                p = seekTarget ? MediaPlayer.rules.SwitchRequest.prototype.STRONG  : MediaPlayer.rules.SwitchRequest.prototype.DEFAULT,
                range,
                time,
                request;

            time = seekTarget || scheduleController.indexHandler.getCurrentTime(representation);

            range = scheduleController.sourceBufferExt.getBufferRange(scheduleController.bufferController.getBuffer(), time);

            if (range !== null) {
                time = range.end;
            }

            request = scheduleController.indexHandler.getSegmentRequestForTime(representation, time);

            while (request && scheduleController.fragmentController.isFragmentLoadedOrPending(scheduleController, request)) {
                if (request.action === "complete") {
                    request = null;
                    break;
                }

                request = scheduleController.indexHandler.getNextSegmentRequest(representation);
            }

            return new MediaPlayer.rules.SwitchRequest(request, p);
        }
    };
};

MediaPlayer.rules.PlaybackTimeRule.prototype = {
    constructor: MediaPlayer.rules.PlaybackTimeRule
};