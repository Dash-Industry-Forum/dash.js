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
 */
MediaPlayer.vo.metrics.PlayList = function () {
    "use strict";
    
    this.start = null;  // Real-Time | Measurement period start.
    this.mstart = null;  // Measurement period duration (ms).
    this.starttype = [];    // List of integers counting the bytes received in each trace interval within the measurement period.
    this.trace = [];
};

MediaPlayer.vo.metrics.PlayList.prototype = {
    constructor: MediaPlayer.vo.metrics.PlayList,
    
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
    addTrace: function (representationid,
                        subreplevel,
                        start,
                        mstart,
                        duration,
                        playbackspeed,
                        stopreason) {
        this.trace.push({
            representationid: representationid,
            subreplevel: subreplevel,
            start: start,
            mstart: mstart,
            duration: duration,
            playbackspeed: playbackspeed,
            stopreason: stopreason
        });
    }
};