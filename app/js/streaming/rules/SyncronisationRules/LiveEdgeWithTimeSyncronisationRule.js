/**
 * @copyright The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2014, British Broadcasting Corporation
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * - Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * - Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * - Neither the name of the British Broadcasting Corporation nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * @license THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/*global MediaPlayer*/

MediaPlayer.rules.LiveEdgeWithTimeSyncronisationRule = function () {
    "use strict";

    var finder;

    return {
        adapter: undefined,

        setFinder: function (liveEdgeFinder) {
            finder = liveEdgeFinder;
        },

        // if the time has been syncronised correctly (which it must have been
        // to end up executing this rule), we should simply check that the
        // last entry in the DVR window is available. assuming it is, we are
        // good to go. if it isn't, something has gone wrong so just fail
        execute: function (context, callback) {
            var self = this,
                request,
                trackInfo = finder.streamProcessor.getCurrentTrack(),
                liveEdgeInitialSearchPosition = trackInfo.DVRWindow.end,

                // this handler is called when the HEAD request has completed
                // the callback is called with success or failure
                handler = function (e) {
                    var searchTime = null;

                    finder.fragmentLoader.unsubscribe(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_CHECK_FOR_EXISTENCE_COMPLETED, self, handler);

                    if (e.data.exists) {
                        searchTime = liveEdgeInitialSearchPosition;
                    }

                    callback(
                        new MediaPlayer.rules.SwitchRequest(
                            searchTime,
                            MediaPlayer.rules.SwitchRequest.prototype.DEFAULT
                        )
                    );
                };

            // formulate the request for the last segment in the DVR window
            request = self.adapter.getFragmentRequestForTime(finder.streamProcessor, trackInfo, liveEdgeInitialSearchPosition);

            // listen for the event to say the fragment has been checked ...
            finder.fragmentLoader.subscribe(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_CHECK_FOR_EXISTENCE_COMPLETED, self, handler);

            // ... and make the HEAD request
            finder.fragmentLoader.checkForExistence(request);
        },

        reset: function () {
            finder = null;
        }
    };
};

MediaPlayer.rules.LiveEdgeWithTimeSyncronisationRule.prototype = {
    constructor: MediaPlayer.rules.LiveEdgeWithTimeSyncronisationRule
};
