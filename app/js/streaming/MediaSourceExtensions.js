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
MediaPlayer.dependencies.MediaSourceExtensions = function () {
    "use strict";
};

MediaPlayer.dependencies.MediaSourceExtensions.prototype = {
    constructor: MediaPlayer.dependencies.MediaSourceExtensions,

    createMediaSource: function () {
        "use strict";

        var hasWebKit = (window.WebKitMediaSource !== null),
            hasMediaSource = (window.MediaSource !== null);

        if (hasWebKit) {
            return Q.when(new WebKitMediaSource());
        }
        if (hasMediaSource) {
            return Q.when(new MediaSource());
        }

        return null;
    },

    attachMediaSource: function (source, videoModel) {
        "use strict";

        videoModel.setSource(window.URL.createObjectURL(source));
        return Q.when(true);
    },

    setDuration: function (source, value) {
        "use strict";

        source.duration = value;
        return Q.when(source.duration);
    }
};