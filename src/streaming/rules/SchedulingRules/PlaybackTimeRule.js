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
        virtualBuffer: undefined,
        playbackController: undefined,
        textSourceBuffer:undefined,
        log:undefined,

        setup: function() {
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING] = onPlaybackSeeking;
        },

        execute: function(context, callback) {
            var mediaType = context.getMediaInfo().type,
                mediaInfo = context.getMediaInfo(),
                streamId = context.getStreamInfo().id,
                streamProcessor = context.getStreamProcessor(),
                sc = streamProcessor.getScheduleController(),
                representationInfo = streamProcessor.getCurrentRepresentationInfo(),
                st = seekTarget ? seekTarget[mediaType] : null,
                hasSeekTarget = (st !== undefined) && (st !== null),
                p = hasSeekTarget ? MediaPlayer.rules.SwitchRequest.prototype.STRONG  : MediaPlayer.rules.SwitchRequest.prototype.DEFAULT,
                keepIdx = !hasSeekTarget,
                currentTime = this.adapter.getIndexHandlerTime(streamProcessor),
                buffer = streamProcessor.bufferController.getBuffer(),
                appendedChunks,
                range = null,
                time,
                request;

            time = hasSeekTarget ? st : currentTime;

            if (isNaN(time) || (mediaType === "fragmentedText" && this.textSourceBuffer.getAllTracksAreDisabled())) {
                callback(new MediaPlayer.rules.SwitchRequest(null, p));
                return;
            }

            if (hasSeekTarget) {
                seekTarget[mediaType] = null;
            }

            if (buffer) {
                range = this.sourceBufferExt.getBufferRange(streamProcessor.bufferController.getBuffer(), time);
                if (range !== null) {
                    appendedChunks = this.virtualBuffer.getChunks({streamId: streamId, mediaType: mediaType, appended: true, mediaInfo: mediaInfo, forRange: range});
                    if (appendedChunks && appendedChunks.length > 0) {
                        time = appendedChunks[appendedChunks.length-1].bufferedRange.end;
                    }
                }
            }

            request = this.adapter.getFragmentRequestForTime(streamProcessor, representationInfo, time, {keepIdx: keepIdx});

            while (request && streamProcessor.getFragmentModel().isFragmentLoaded(request)) {
                if (request.action === "complete") {
                    request = null;
                    streamProcessor.setIndexHandlerTime(NaN);
                    break;
                }

                request = this.adapter.getNextFragmentRequest(streamProcessor, representationInfo);
            }

            if (request ) {
                streamProcessor.setIndexHandlerTime(request.startTime + request.duration);
                request.delayLoadingTime = new Date().getTime() + sc.getTimeToLoadDelay();

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