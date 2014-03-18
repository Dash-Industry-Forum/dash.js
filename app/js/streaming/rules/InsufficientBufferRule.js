/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 * 
 * Copyright (c) 2013, Digital Primates
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
     *
     * TODO
     * An alternative would be to increase the size of the buffer.
     * Is there a good way to handle this?
     * Maybe the BufferExtensions should have some monitoring built into the
     * shouldBufferMore method to increase the buffer over time...
     */

    var dryBufferHits = 0,
        DRY_BUFFER_LIMIT = 3;

    return {
        debug: undefined,

        checkIndex: function (current, metrics /*, data*/) {
            var self = this,
                playlist,
                trace,
                shift = false,
                p = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;

            //self.debug.log("Checking insufficient buffer rule...");

            if (metrics.PlayList === null || metrics.PlayList === undefined || metrics.PlayList.length === 0) {
                //self.debug.log("Not enough information for rule.");
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }

            playlist = metrics.PlayList[metrics.PlayList.length - 1];

            if (playlist === null || playlist === undefined || playlist.trace.length === 0) {
                //self.debug.log("Not enough information for rule.");
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }

            // The last trace is the currently playing fragment.
            // So get the trace *before* that one.
            trace = playlist.trace[playlist.trace.length - 2];

            if (trace === null || trace === undefined || trace.stopreason === null || trace.stopreason === undefined) {
                //self.debug.log("Not enough information for rule.");
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }

            if (trace.stopreason === MediaPlayer.vo.metrics.PlayList.Trace.REBUFFERING_REASON) {
                shift = true;
                dryBufferHits += 1;
                self.debug.log("Number of times the buffer has run dry: " + dryBufferHits);
            }

            // if we've hit a dry buffer too many times, become strong to override whatever is
            // causing the stream to switch up
            if (dryBufferHits > DRY_BUFFER_LIMIT) {
                p = MediaPlayer.rules.SwitchRequest.prototype.STRONG;
                self.debug.log("Apply STRONG to buffer rule.");
            }

            if (shift) {
                self.debug.log("The buffer ran dry recently, switch down.");
                return Q.when(new MediaPlayer.rules.SwitchRequest(current - 1, p));
            } else if (dryBufferHits > DRY_BUFFER_LIMIT) {
                self.debug.log("Too many dry buffer hits, quit switching bitrates.");
                return Q.when(new MediaPlayer.rules.SwitchRequest(current, p));
            } else {
                return Q.when(new MediaPlayer.rules.SwitchRequest(MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, p));
            }
        }
    };
};

MediaPlayer.rules.InsufficientBufferRule.prototype = {
    constructor: MediaPlayer.rules.InsufficientBufferRule
};