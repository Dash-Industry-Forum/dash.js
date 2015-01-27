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
MediaPlayer.vo.metrics.PlayList = function () {
    "use strict";

    this.stream = null;     // type of stream ("audio" | "video" etc..)
    this.start = null;      // Real-Time | Timestamp of the user action that starts the playback stream...
    this.mstart = null;     // Media-Time | Presentation time at which playout was requested by the user...
    this.starttype = null;  // Type of user action which triggered playout
                            //      - New playout request (e.g. initial playout or seeking)
                            //      - Resume from pause
                            //        - Other user request (e.g. user-requested quality change)
                            //        - Start of a metrics collection stream (hence earlier entries in the play list not collected)
    this.trace = [];        // List of streams of continuous rendering of decoded samples.
};

MediaPlayer.vo.metrics.PlayList.Trace = function () {
    "use strict";

    /*
     * representationid - The value of the Representation@id of the Representation from which the samples were taken.
     * subreplevel      - If not present, this metrics concerns the Representation as a whole. If present, subreplevel indicates the greatest value of any Subrepresentation@level being rendered.
     * start            - Real-Time | The time at which the first sample was rendered.
     * mstart           - Media-Time | The presentation time of the first sample rendered.
     * duration         - The duration of the continuously presented samples (which is the same in real time and media time). ―Continuously presented‖ means that the media clock continued to advance at the playout speed throughout the interval.
     * playbackspeed    - The playback speed relative to normal playback speed (i.e.normal forward playback speed is 1.0).
     * stopreason       - The reason why continuous presentation of this Representation was stopped.
     *                    Either:
     *                    representation switch
     *                    rebuffering
     *                    user request
     *                    end of Stream
     *                    end of content
     *                    end of a metrics collection stream
     */
    this.representationid = null;
    this.subreplevel = null;
    this.start = null;
    this.mstart = null;
    this.duration = null;
    this.playbackspeed = null;
    this.stopreason = null;
};

MediaPlayer.vo.metrics.PlayList.prototype = {
    constructor: MediaPlayer.vo.metrics.PlayList
};

/* Public Static Constants */
MediaPlayer.vo.metrics.PlayList.INITIAL_PLAY_START_REASON = "initial_start";
MediaPlayer.vo.metrics.PlayList.SEEK_START_REASON = "seek";

MediaPlayer.vo.metrics.PlayList.Trace.prototype = {
    constructor: MediaPlayer.vo.metrics.PlayList.Trace()
};

/* Public Static Constants */
MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON = "user_request";
MediaPlayer.vo.metrics.PlayList.Trace.REPRESENTATION_SWITCH_STOP_REASON = "representation_switch";
MediaPlayer.vo.metrics.PlayList.Trace.END_OF_CONTENT_STOP_REASON = "end_of_content";
MediaPlayer.vo.metrics.PlayList.Trace.REBUFFERING_REASON = "rebuffering";