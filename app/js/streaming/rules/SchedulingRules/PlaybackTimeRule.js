MediaPlayer.rules.PlaybackTimeRule = function () {
    "use strict";

    var seekTarget = {},
        scheduleController = {},

        onPlaybackSeeking = function(sender, time) {
            var streamId = sender.getStreamId();
            seekTarget[streamId] = seekTarget[streamId] || {};
            seekTarget[streamId].audio = time;
            seekTarget[streamId].video = time;
        };

    return {
        adapter: undefined,

        setup: function() {
            this.playbackSeeking = onPlaybackSeeking;
        },

        setScheduleController: function(scheduleControllerValue) {
            var streamId = scheduleControllerValue.streamProcessor.getStreamInfo().id;
            scheduleController[streamId] = scheduleController[streamId] || {};
            scheduleController[streamId][scheduleControllerValue.streamProcessor.getType()] = scheduleControllerValue;
        },

        execute: function(context, callback) {
            var mediaType = context.getMediaInfo().type,
                streamId = context.getStreamInfo().id,
                sc = scheduleController[streamId][mediaType],
                track = sc.streamProcessor.getCurrentTrack(),
                st = seekTarget[streamId] ? seekTarget[streamId][mediaType] : null,
                p = st ? MediaPlayer.rules.SwitchRequest.prototype.STRONG  : MediaPlayer.rules.SwitchRequest.prototype.DEFAULT,
                rejected = sc.getFragmentModel().getRejectedRequests().shift(),
                keepIdx = !!rejected && !st,
                currentTime = sc.indexHandler.getCurrentTime(track),
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

            if (seekTarget[streamId]) {
                seekTarget[streamId][mediaType] = null;
            }

            range = sc.sourceBufferExt.getBufferRange(sc.bufferController.getBuffer(), time);

            if (range !== null) {
                time = range.end;
            }

            request = this.adapter.getFragmentRequestForTime(sc.streamProcessor, track, time, keepIdx);

            while (request && sc.fragmentController.isFragmentLoadedOrPending(sc, request)) {
                if (request.action === "complete") {
                    request = null;
                    sc.indexHandler.setCurrentTime(NaN);
                    break;
                }

                request = this.adapter.getNextFragmentRequest(sc.streamProcessor, track);
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