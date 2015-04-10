/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.rules.PlaybackTimeRule = function () {
    "use strict";

    var seekTarget = {},
        scheduleController = {},

        onPlaybackSeeking = function(e) {
            // TODO this a dirty workaround to call this handler after a handelr from ScheduleController class. That
            // handler calls FragmentModel.cancelPendingRequests(). We should cancel pending requests before we start
            // creating requests for a seeking time.
            setTimeout(function() {
                var time = e.data.seekTime;
                seekTarget.audio = time;
                seekTarget.video = time;
                seekTarget.fragmentedText=time;
            },0);
        };

    return {
        adapter: undefined,
        sourceBufferExt: undefined,
        playbackController: undefined,

        setup: function() {
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING] = onPlaybackSeeking;
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
                // EPSILON is used to avoid javascript floating point issue, e.g. if request.startTime = 19.2,
                // request.duration = 3.83, than request.startTime + request.startTime = 19.2 + 1.92 = 21.119999999999997
                EPSILON = 0.1,
                streamProcessor = scheduleController[streamId][mediaType].streamProcessor,
                track = streamProcessor.getCurrentTrack(),
                st = seekTarget ? seekTarget[mediaType] : null,
                hasSeekTarget = (st !== undefined) && (st !== null),
                p = hasSeekTarget ? MediaPlayer.rules.SwitchRequest.prototype.STRONG  : MediaPlayer.rules.SwitchRequest.prototype.DEFAULT,
                rejected = sc.getFragmentModel().getRequests({state: MediaPlayer.dependencies.FragmentModel.states.REJECTED})[0],
                keepIdx = !!rejected && !hasSeekTarget,
                currentTime = this.adapter.getIndexHandlerTime(streamProcessor),
                playbackTime = this.playbackController.getTime(),
                rejectedEnd = rejected ? rejected.startTime + rejected.duration : null,
                useRejected = !hasSeekTarget && rejected && ((rejectedEnd > playbackTime) && (rejected.startTime <= currentTime) || isNaN(currentTime)),
                buffer = streamProcessor.bufferController.getBuffer(),
                range = null,
                time,
                request;

            time = hasSeekTarget ? st : ((useRejected ? (rejected.startTime) : currentTime));

            if (rejected) {
                sc.getFragmentModel().removeRejectedRequest(rejected);
            }

            if (isNaN(time)) {
                callback(new MediaPlayer.rules.SwitchRequest(null, p));
                return;
            }

            if (hasSeekTarget) {
                seekTarget[mediaType] = null;
            }

            if (buffer) {
                range = this.sourceBufferExt.getBufferRange(streamProcessor.bufferController.getBuffer(), time);

                if (range !== null) {
                    time = range.end;
                }
            }

            request = this.adapter.getFragmentRequestForTime(streamProcessor, track, time, {keepIdx: keepIdx});

            if (useRejected && request && request.index !== rejected.index) {
                request = this.adapter.getFragmentRequestForTime(streamProcessor, track, rejected.startTime + (rejected.duration / 2) + EPSILON, {keepIdx: keepIdx, timeThreshold: 0});
            }

            while (request && streamProcessor.getFragmentModel().isFragmentLoadedOrPending(request)) {
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