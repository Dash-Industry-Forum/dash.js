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

/*global MediaPlayer*/

MediaPlayer.rules.LiveEdgeWithTimeSynchronizationRule = function () {
    "use strict";

    return {
        timelineConverter: undefined,

        // if the time has been synchronized correctly (which it must have been
        // to end up executing this rule), the last entry in the DVR window
        // should be the live edge. if that is incorrect for whatever reason,
        // playback will fail to start and some other action should be taken.
        execute: function (context, callback) {
            var representationInfo = context.getTrackInfo(),
                liveEdgeInitialSearchPosition = representationInfo.DVRWindow.end,
                p = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;

            if (representationInfo.useCalculatedLiveEdgeTime) {
                //By default an expected live edge is the end of the last segment.
                // A calculated live edge ('end' property of a range returned by TimelineConverter.calcSegmentAvailabilityRange)
                // is used as an initial point for finding the actual live edge.
                // But for SegmentTimeline mpds (w/o a negative @r) the end of the
                // last segment is the actual live edge. At the same time, calculated live edge is an expected live edge.
                // Thus, we need to switch an expected live edge and actual live edge for SegmentTimelne streams.
                var actualLiveEdge = this.timelineConverter.getExpectedLiveEdge();
                this.timelineConverter.setExpectedLiveEdge(liveEdgeInitialSearchPosition);
                callback(new MediaPlayer.rules.SwitchRequest(actualLiveEdge, p));
            } else {
                callback(new MediaPlayer.rules.SwitchRequest(liveEdgeInitialSearchPosition, p));
            }
        }
    };
};

MediaPlayer.rules.LiveEdgeWithTimeSynchronizationRule.prototype = {
    constructor: MediaPlayer.rules.LiveEdgeWithTimeSynchronizationRule
};
