/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Digital Primates
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
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

    getBufferRange: function (buffer, time, tolerance) {
        "use strict";

        var ranges = null,
            startIndex = -1,
            finishIndex = -1,
            toler = (tolerance || .1),
            len,
            i;

        ranges = buffer.buffered;

        if (ranges !== null) {
            for (i = 0, len = ranges.length; i < len; i += 1) {
                if (finishIndex !== -1) {
                    if ((ranges.start(i) - ranges.end(finishIndex)) <= toler) {
                        // the discontinuity is smaller than the tolerance, combine the ranges
                        finishIndex = i;
                    } else {
                        break;
                    }
                } else if (time >= ranges.start(i) && time < ranges.end(i)) {
                    startIndex = i;
                    finishIndex = i;
                }
            }

            if (startIndex !== -1) {
                return Q.when({start: ranges.start(startIndex), end: ranges.end(finishIndex)});
            }
        }

        return Q.when(null);
    },

    getBufferLength: function (buffer, time, tolerance) {
        "use strict";

        var self = this,
            deferred = Q.defer();

        self.getBufferRange(buffer, time, tolerance).then(
            function (range) {
                if (range === null) {
                    deferred.resolve(0);
                } else {
                    deferred.resolve(range.end - time);
                }
            }
        );

        return deferred.promise;
    },

    append: function (buffer, bytes /*, videoModel*/) {
        "use strict";
        var defer = Q.defer(),
            updateEndHandler = function() {
                buffer.removeEventListener("updateend", updateEndHandler, false);
                defer.resolve(true);
            };
        try {
            buffer.addEventListener("updateend", updateEndHandler, false);
        } catch (err) {
            defer.resolve(true);
        }
        try {
            if ("append" in buffer) {
                buffer.append(bytes);
            } else if ("appendBuffer" in buffer) {
                buffer.appendBuffer(bytes);
            }
        } catch (err) {
            return Q.when(false);
        }
        return defer.promise;
    },

    abort: function (buffer) {
        "use strict";
        return Q.when(buffer.abort());
    }
};