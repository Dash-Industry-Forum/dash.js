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
/**
 * @classdesc a PlayList from ISO23009-1 Annex D, this Object holds reference to the playback session information
 * @ignore
 */
class PlayList {
    /**
     * @class
     */
    constructor() {

        /**
         * Timestamp of the user action that starts the playback stream...
         * @public
         */
        this.start = null;
        /**
         * Presentation time at which playout was requested by the user...
         * @public
         */
        this.mstart = null;
        /**
         * Type of user action which triggered playout
         * - New playout request (e.g. initial playout or seeking)
         * - Resume from pause
         * - Other user request (e.g. user-requested quality change)
         * - Start of a metrics collection stream (hence earlier entries in the play list not collected)
         * @public
         */
        this.starttype = null;

        /**
         * List of streams of continuous rendering of decoded samples.
         * @public
         */
        this.trace = [];
    }
}

/* Public Static Constants */
PlayList.INITIAL_PLAYOUT_START_REASON = 'initial_playout';
PlayList.SEEK_START_REASON = 'seek';
PlayList.RESUME_FROM_PAUSE_START_REASON = 'resume';
PlayList.METRICS_COLLECTION_START_REASON = 'metrics_collection_start';

/**
 * @classdesc a PlayList.Trace from ISO23009-1 Annex D
 * @ignore
 */
class PlayListTrace {
    /**
     * @class
     */
    constructor() {
        /**
         * The value of the Representation@id of the Representation from which the samples were taken.
         * @type {string}
         * @public
         */
        this.representationid = null;
        /**
         * If not present, this metrics concerns the Representation as a whole.
         * If present, subreplevel indicates the greatest value of any
         * Subrepresentation@level being rendered.
         * @type {number}
         * @public
         */
        this.subreplevel = null;
        /**
         * The time at which the first sample was rendered
         * @type {number}
         * @public
         */
        this.start = null;
        /**
         * The presentation time of the first sample rendered.
         * @type {number}
         * @public
         */
        this.mstart = null;
        /**
         * The duration of the continuously presented samples (which is the same in real time and media time). "Continuously presented" means that the media clock continued to advance at the playout speed throughout the interval. NOTE: the spec does not call out the units, but all other durations etc are in ms, and we use ms too.
         * @type {number}
         * @public
         */
        this.duration = null;
        /**
         * The playback speed relative to normal playback speed (i.e.normal forward playback speed is 1.0).
         * @type {number}
         * @public
         */
        this.playbackspeed = null;
        /**
         * The reason why continuous presentation of this Representation was stopped.
         * representation switch
         * rebuffering
         * user request
         * end of Period
         * end of Stream
         * end of content
         * end of a metrics collection period
         *
         * @type {string}
         * @public
         */
        this.stopreason = null;
    }
}

PlayListTrace.REPRESENTATION_SWITCH_STOP_REASON = 'representation_switch';
PlayListTrace.REBUFFERING_REASON = 'rebuffering';
PlayListTrace.USER_REQUEST_STOP_REASON = 'user_request';
PlayListTrace.END_OF_PERIOD_STOP_REASON = 'end_of_period';
PlayListTrace.END_OF_CONTENT_STOP_REASON = 'end_of_content';
PlayListTrace.METRICS_COLLECTION_STOP_REASON = 'metrics_collection_end';
PlayListTrace.FAILURE_STOP_REASON = 'failure';

export { PlayList, PlayListTrace };
