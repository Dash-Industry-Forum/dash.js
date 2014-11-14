/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 * 
 * Copyright (c) 2013, Digital Primates, Akamai Technologies
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.rules.InsufficientBufferRule = function () {
    "use strict";

    /*
     * This rule is intended to be sure that our buffer doesn't run dry.
     * If the buffer runs dry playback halts until more data is downloaded.
     * The buffer will run dry when the fragments are taking too long to download.
     * The player may have sufficient bandwidth to download a fragment is a reasonable time,
     * but the play may not leave enough time in the buffer to allow for longer fragments.
     * A dry buffer is a good indication of this use case, so we want to switch down to
     * smaller fragments to decrease download time.
     */

    var dryBufferHits = 0,
        stepDownFactor = 1,
        DRY_BUFFER_LIMIT = 3,
        lastDryBufferHitRecorded = false,
        bufferState = MediaPlayer.dependencies.BufferController.BUFFER_EMPTY,

        onBufferChange = function (event) {
            bufferState = event.type;
            if (event.type === MediaPlayer.dependencies.BufferController.BUFFER_LOADED) {
                stepDownFactor = 1;
                if (lastDryBufferHitRecorded) {
                    lastDryBufferHitRecorded = false;
                }
            }
        };

    return {
        debug: undefined,
        metricsModel: undefined,
        eventBus:undefined,

        setup: function() {
            this.eventBus.addEventListener(MediaPlayer.dependencies.BufferController.BUFFER_EMPTY, onBufferChange);
            this.eventBus.addEventListener(MediaPlayer.dependencies.BufferController.BUFFER_LOADED, onBufferChange);
        },

        execute: function (context, callback) {
            var self = this,
                mediaType = context.getMediaInfo().type,
                current = context.getCurrentValue(),
                metrics = self.metricsModel.getReadOnlyMetricsFor(mediaType),
                playlist,
                streamInfo = context.getStreamInfo(),
                duration = streamInfo.duration,
                currentTime = context.getStreamProcessor().getPlaybackController().getTime(),
                trace,
                switchRequest = new MediaPlayer.rules.SwitchRequest(MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, MediaPlayer.rules.SwitchRequest.prototype.DEFAULT),
                lastBufferLevelVO = (metrics.BufferLevel.length > 0) ? metrics.BufferLevel[metrics.BufferLevel.length - 1] : null,
                //lowBufferMark = Math.max(Math.min(manifestInfo.minBufferTime, manifestInfo.maxFragmentDuration), 4);
                lowBufferMark = 4; // Not sure if we should dynamically figure this value out or just hardcode it for now. Re-eval.

            if (metrics.PlayList === null || metrics.PlayList === undefined || metrics.PlayList.length === 0) {
                //self.debug.log("Not enough information for rule.");
                callback(switchRequest);
                return;
            }

            playlist = metrics.PlayList[metrics.PlayList.length - 1];

            if (playlist === null || playlist === undefined || playlist.trace.length === 0) {
                //self.debug.log("Not enough information for rule.");
                callback(switchRequest);
                return;
            }

            // The last trace is the currently playing fragment. So get the trace *before* that one.
            trace = playlist.trace[playlist.trace.length - 2];

            if (trace === null || trace === undefined) {
                //self.debug.log("Not enough information for rule.");
                callback(switchRequest);
                return;
            }

            //We must only record a dry buffer hit once per buffer stall event.
            //if we hit a buffer stall scenario we must switch all the way down regardless.
            if (trace.stopreason !== null &&
                trace.stopreason === MediaPlayer.vo.metrics.PlayList.Trace.REBUFFERING_REASON &&
                !lastDryBufferHitRecorded) {

                dryBufferHits += 1;
                lastDryBufferHitRecorded = true;
                switchRequest = new MediaPlayer.rules.SwitchRequest(0, MediaPlayer.rules.SwitchRequest.prototype.STRONG);
                self.debug.log("InsufficientBufferRule Number of times the buffer has run dry: " + dryBufferHits);

            } else if ( bufferState === MediaPlayer.dependencies.BufferController.BUFFER_LOADED &&
                        trace.stopreason !== MediaPlayer.vo.metrics.PlayList.Trace.REBUFFERING_REASON &&
                        lastBufferLevelVO !== null &&
                        lastBufferLevelVO.level < (lowBufferMark * 2) &&
                        lastBufferLevelVO.level > lowBufferMark &&
                        currentTime < (duration - lowBufferMark * 2)) {

                switchRequest = new MediaPlayer.rules.SwitchRequest(Math.max(current - stepDownFactor, 0), MediaPlayer.rules.SwitchRequest.prototype.STRONG  );
                stepDownFactor++;
            }

            if (switchRequest.value !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                self.debug.log("xxx InsufficientBufferRule requesting switch to index: ", switchRequest.value, " priority: ",
                    switchRequest.priority === MediaPlayer.rules.SwitchRequest.prototype.DEFAULT ? "default" :
                        switchRequest.priority === MediaPlayer.rules.SwitchRequest.prototype.STRONG ? "strong" : "weak");
            }

            callback(switchRequest);
        },

        reset: function() {
            stepDownFactor = 1;
        }
    };
};

MediaPlayer.rules.InsufficientBufferRule.prototype = {
    constructor: MediaPlayer.rules.InsufficientBufferRule
};