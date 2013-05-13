/*
 *
 * The copyright in this software is being made available under the BSD
 * License, included below. This software may be subject to other third party
 * and contributor rights, including patent rights, and no such rights are
 * granted under this license.
 * 
 * Copyright (c) 2013, Dash Industry Forum
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 * •  Neither the name of the Dash Industry Forum nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS”
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
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

    removeSourceBuffer: function (mediaSource, buffer) {
        "use strict";

        return Q.when(mediaSource.removeSourceBuffer(buffer));
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

        return Q.when(bufferLength);
    },

    append: function (buffer, bytes, videoModel) {
        "use strict";
        try {
            buffer.append(bytes);
            return Q.when(true);
        } catch (err) {
            return Q.when(false);
        }
    },

    abort: function (buffer) {
        "use strict";
        return Q.when(buffer.abort());
    }
};