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
MediaPlayer.rules.SwitchRequest = function (q, p) {
    "use strict";
    this.quality = q;
    this.priority = p;

    if (this.quality === undefined) {
        this.quality = 999;
    }

    if (this.priority === undefined) {
        this.priority = 0.5;
    }
};

MediaPlayer.rules.SwitchRequest.prototype = {
    constructor: MediaPlayer.rules.SwitchRequest,
    NO_CHANGE: 999,
    DEFAULT: 0.5,
    STRONG: 1,
    WEAK: 0
};