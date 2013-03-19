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
MediaPlayer.vo.metrics.PlayList = function () {
    "use strict";

    this.start = null;      // Real-Time | Timestamp of the user action that starts the playback period...
    this.mstart = null;     // Media-Time | Presentation time at which playout was requested by the user...
    this.starttype = null;  // Type of user action which triggered playout
                            //      - New playout request (e.g. initial playout or seeking)
                            //      - Resume from pause
                            //        - Other user request (e.g. user-requested quality change)
                            //        - Start of a metrics collection period (hence earlier entries in the play list not collected)
    this.trace = [];        // List of periods of continuous rendering of decoded samples.
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
     *                    end of Period
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