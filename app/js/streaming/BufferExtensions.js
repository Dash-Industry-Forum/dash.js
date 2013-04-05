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
MediaPlayer.dependencies.BufferExtensions = function () {
    "use strict";

    var bufferTime;

    return {
        decideBufferLength: function (minBufferTime) {
            bufferTime = 4;
            /*
            if (isNaN(minBufferTime) || minBufferTime <= 0) {
                bufferTime = 4;
            } else {
                bufferTime = minBufferTime;
            }
            */
            return Q.when(bufferTime);
        },

        shouldBufferMore: function (bufferLength) {
            var result = (bufferLength < bufferTime);
            return Q.when(result);
        }
    };
};

MediaPlayer.dependencies.BufferExtensions.prototype = {
    constructor: MediaPlayer.dependencies.BufferExtensions
};