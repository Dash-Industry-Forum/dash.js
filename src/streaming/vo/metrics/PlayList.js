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

class PlayList {
    constructor() {
        this.start = null;      // Real-Time | Timestamp of the user action that starts the playback stream...
        this.mstart = null;     // Media-Time | Presentation time at which playout was requested by the user...
        this.starttype = null;  /* Enum | Type of user action which triggered playout
                                 *  - New playout request (e.g. initial playout or seeking)
                                 *  - Resume from pause
                                 *  - Other user request (e.g. user-requested quality change)
                                 *  - Start of a metrics collection stream (hence earlier entries in the play list not collected) */
        this.trace = [];        // List | List of streams of continuous rendering of decoded samples.
    }
}

PlayList.Trace = class {
    constructor() {
        /*
         * representationid - String | The value of the Representation@id of the Representation from which the samples were taken.
         * subreplevel      - Integer | If not present, this metrics concerns the Representation as a whole. If present, subreplevel indicates the greatest value of any Subrepresentation@level being rendered.
         * start            - Real-Time | The time at which the first sample was rendered.
         * mstart           - Media-Time | The presentation time of the first sample rendered.
         * duration         - Integer | The duration of the continuously presented samples (which is the same in real time and media time). "Continuously presented" means that the media clock continued to advance at the playout speed throughout the interval. NOTE: the spec does not call out the units, but all other durations etc are in ms, and we use ms too.
         * playbackspeed    - Real | The playback speed relative to normal playback speed (i.e.normal forward playback speed is 1.0).
         * stopreason       - Enum | The reason why continuous presentation of this Representation was stopped.
         *                    Either:
         *                    representation switch
         *                    rebuffering
         *                    user request
         *                    end of Period
         *                    end of Stream
         *                    end of content
         *                    end of a metrics collection period
         */
        this.representationid = null;
        this.subreplevel = null;
        this.start = null;
        this.mstart = null;
        this.duration = null;
        this.playbackspeed = null;
        this.stopreason = null;
    }
};


/* Public Static Constants */
PlayList.INITIAL_PLAYOUT_START_REASON = 'initial_playout';
PlayList.SEEK_START_REASON = 'seek';
PlayList.RESUME_FROM_PAUSE_START_REASON = 'resume';
PlayList.METRICS_COLLECTION_START_REASON = 'metrics_collection_start';

PlayList.Trace.REPRESENTATION_SWITCH_STOP_REASON = 'representation_switch';
PlayList.Trace.REBUFFERING_REASON = 'rebuffering';
PlayList.Trace.USER_REQUEST_STOP_REASON = 'user_request';
PlayList.Trace.END_OF_PERIOD_STOP_REASON = 'end_of_period';
PlayList.Trace.END_OF_CONTENT_STOP_REASON = 'end_of_content';
PlayList.Trace.METRICS_COLLECTION_STOP_REASON = 'metrics_collection_end';
PlayList.Trace.FAILURE_STOP_REASON = 'failure';

export default PlayList;
