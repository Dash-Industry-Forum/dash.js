/*
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * author Digital Primates
 * copyright dash-if 2012
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

        checkIndex: function (current, metrics, data) {
            var self = this,
                playlist,
                trace,
                shift = false,
                p = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;

            self.debug.log("Checking insufficient buffer rule...");

            if (metrics.PlayList === null || metrics.PlayList === undefined || metrics.PlayList.length === 0) {
                self.debug.log("Not enough information for rule.");
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }

            playlist = metrics.PlayList[metrics.PlayList.length - 1];

            if (playlist === null || playlist === undefined || playlist.trace.length === 0) {
                self.debug.log("Not enough information for rule.");
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }

            // The last trace is the currently playing fragment.
            // So get the trace *before* that one.
            trace = playlist.trace[playlist.trace.length - 2];

            if (trace === null || trace === undefined || trace.stopreason === null || trace.stopreason === undefined) {
                self.debug.log("Not enough information for rule.");
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