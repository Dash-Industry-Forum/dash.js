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
        sourceBufferExt: undefined,

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
                streamProcessor = scheduleController[streamId][mediaType].streamProcessor,
                track = streamProcessor.getCurrentTrack(),
                st = seekTarget[streamId] ? seekTarget[streamId][mediaType] : null,
                p = st ? MediaPlayer.rules.SwitchRequest.prototype.STRONG  : MediaPlayer.rules.SwitchRequest.prototype.DEFAULT,
                rejected = sc.getFragmentModel().getRejectedRequests().shift(),
                keepIdx = !!rejected && !st,
                currentTime = this.adapter.getIndexHandlerTime(streamProcessor),
                playbackTime = streamProcessor.playbackController.getTime(),
                rejectedEnd = rejected ? rejected.startTime + rejected.duration : null,
                useRejected = rejected && ((rejectedEnd > playbackTime) && (rejected.startTime <= currentTime) || isNaN(currentTime)),
                range,
                time,
                request;

            time = st || (useRejected ? (rejected.startTime + rejected.duration / 2) : currentTime);

            if (isNaN(time)) {
                callback(new MediaPlayer.rules.SwitchRequest(null, p));
                return;
            }

            if (seekTarget[streamId]) {
                seekTarget[streamId][mediaType] = null;
            }

            range = this.sourceBufferExt.getBufferRange(streamProcessor.bufferController.getBuffer(), time);

            if (range !== null) {
                time = range.end;
            }

            request = this.adapter.getFragmentRequestForTime(streamProcessor, track, time, keepIdx);

            while (request && streamProcessor.fragmentController.isFragmentLoadedOrPending(sc, request)) {
                if (request.action === "complete") {
                    request = null;
                    this.adapter.setIndexHandlerTime(streamProcessor, NaN);
                    break;
                }

                request = this.adapter.getNextFragmentRequest(streamProcessor, track);
            }

            if (request && !useRejected) {
                this.adapter.setIndexHandlerTime(streamProcessor, request.startTime + request.duration);
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