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
MediaPlayer.vo.metrics.RepresentationSwitch = function () {
    "use strict";

    this.t = null;      // Real-Time | Time of the switch event.
    this.mt = null;     // Media-Time | The media presentation time of the earliest access unit (out of all media content components) played out from the Representation.
    this.to = null;     // value of Representation@id identifying the switch-to Representation.
    this.lto = null;    // If not present, this metrics concerns the Representation as a whole. If present, lto indicates the value of SubRepresentation@level within Representation identifying the switch-to level of the Representation.
};

MediaPlayer.vo.metrics.RepresentationSwitch.prototype = {
    constructor: MediaPlayer.vo.metrics.RepresentationSwitch
};