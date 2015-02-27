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
    var //DRY_BUFFER_LIMIT = 3,
        bufferStateDict = {},

        setBufferInfo = function (type, state) {
            bufferStateDict[type] = bufferStateDict[type] || {};
            bufferStateDict[type].state = state;
            if (state === MediaPlayer.dependencies.BufferController.BUFFER_LOADED) {
                bufferStateDict[type].stepDownFactor = 1;
                bufferStateDict[type].lastDryBufferHitRecorded = false;
            }
        };

    return {
        log: undefined,
        metricsModel: undefined,

        execute: function (context, callback) {
            var self = this,
                mediaType = context.getMediaInfo().type,
                current = context.getCurrentValue(),
                mediaInfo = context.getMediaInfo(),
                metrics = self.metricsModel.getReadOnlyMetricsFor(mediaType),
                playlist,
                streamInfo = context.getStreamInfo(),
                duration = streamInfo.duration,
                currentTime = context.getStreamProcessor().getPlaybackController().getTime(),
                trace,
                sp = context.getStreamProcessor(),
                isDynamic = sp.isDynamic(),
                switchRequest = new MediaPlayer.rules.SwitchRequest(MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, MediaPlayer.rules.SwitchRequest.prototype.WEAK),
                lastBufferLevelVO = (metrics.BufferLevel.length > 0) ? metrics.BufferLevel[metrics.BufferLevel.length - 1] : null,
                lastBufferStateVO = (metrics.BufferState.length > 0) ? metrics.BufferState[metrics.BufferState.length - 1] : null;

            if (mediaInfo.trackCount === 1 || metrics.PlayList === null ||
                metrics.PlayList === undefined || metrics.PlayList.length === 0 ||
                lastBufferStateVO === null) {
                //self.log("Not enough information for rule.");
                callback(switchRequest);
                return;
            }

            playlist = metrics.PlayList[metrics.PlayList.length - 1];

            if (playlist === null || playlist === undefined || playlist.trace.length === 0) {
                //self.log("Not enough information for rule.");
                callback(switchRequest);
                return;
            }

            //The last trace is the currently playing fragment. So get the trace *before* that one.
            //Some streams only have one index we need to account for that
            trace = playlist.trace[Math.max(playlist.trace.length - 2, 0)];
            if (trace === null || trace === undefined) {
                //self.log("Not enough information for rule.");
                callback(switchRequest);
                return;
            }

            setBufferInfo(mediaType, lastBufferStateVO.state);

            if (trace.stopreason !== null && trace.stopreason === MediaPlayer.vo.metrics.PlayList.Trace.REBUFFERING_REASON &&
                !bufferStateDict[mediaType].lastDryBufferHitRecorded) {

                //bufferStateDict[mediaType].dryBufferHits++; //Not using this for priority at this point but may in future.
                bufferStateDict[mediaType].lastDryBufferHitRecorded = true;
                switchRequest = new MediaPlayer.rules.SwitchRequest(0, MediaPlayer.rules.SwitchRequest.prototype.STRONG);
                //self.log("InsufficientBufferRule Number of times the buffer has run dry: " + bufferStateDict[mediaType].dryBufferHits);

            } else if ( !isDynamic &&
                        bufferStateDict[mediaType].state === MediaPlayer.dependencies.BufferController.BUFFER_LOADED &&
                        trace.stopreason !== MediaPlayer.vo.metrics.PlayList.Trace.REBUFFERING_REASON &&
                        lastBufferLevelVO !== null &&
                        lastBufferLevelVO.level < (MediaPlayer.dependencies.BufferController.LOW_BUFFER_THRESHOLD * 2) &&
                        lastBufferLevelVO.level > MediaPlayer.dependencies.BufferController.LOW_BUFFER_THRESHOLD &&
                        currentTime < (duration - MediaPlayer.dependencies.BufferController.LOW_BUFFER_THRESHOLD * 2)) {

                switchRequest = new MediaPlayer.rules.SwitchRequest(Math.max(current - bufferStateDict[mediaType].stepDownFactor, 0), MediaPlayer.rules.SwitchRequest.prototype.STRONG );
                bufferStateDict[mediaType].stepDownFactor++;
            }

            if (switchRequest.value !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                self.log("InsufficientBufferRule requesting switch to index: ", switchRequest.value, "type: ",mediaType, " Priority: ",
                    switchRequest.priority === MediaPlayer.rules.SwitchRequest.prototype.DEFAULT ? "Default" :
                        switchRequest.priority === MediaPlayer.rules.SwitchRequest.prototype.STRONG ? "Strong" : "Weak");
            }

            callback(switchRequest);
        },

        reset: function() {
            bufferStateDict = {};
        }
    };
};

MediaPlayer.rules.InsufficientBufferRule.prototype = {
    constructor: MediaPlayer.rules.InsufficientBufferRule
};