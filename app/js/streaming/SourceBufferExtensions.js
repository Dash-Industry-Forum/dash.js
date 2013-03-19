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
MediaPlayer.dependencies.SourceBufferExtensions = function () {
    "use strict";
};

MediaPlayer.dependencies.SourceBufferExtensions.prototype = {
    constructor: MediaPlayer.dependencies.SourceBufferExtensions,

    createSourceBuffer: function (mediaSource, codec) {
        "use strict";

        return Q.when(mediaSource.addSourceBuffer(codec));
    },

    getBufferLength: function (buffer, time) {
        "use strict";

        var ranges = null,
            rangeIndex = -1,
            bufferLength = 0,
            len,
            i;

        ranges = buffer.buffered;

        if (ranges !== null) {
            for (i = 0, len = ranges.length; i < len; i += 1) {
                if (time >= ranges.start(i) && time < ranges.end(i)) {
                    rangeIndex = i;
                }
            }
        }

        if (rangeIndex !== -1) {
            bufferLength = ranges.end(rangeIndex) - time;
        }

        return (function () { return Q.when(bufferLength); }());
    },

    append: function (buffer, bytes, videoModel) {
        "use strict";
        try {
            buffer.append(bytes);
            return Q.when(true);
        } catch (err) {
            return Q.when(false);
        }
    }
};