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
        var deferred = Q.defer();
        try {
            deferred.resolve(mediaSource.addSourceBuffer(codec));
        } catch(ex){
            deferred.reject(ex.description);
        }
        return deferred.promise;
    },

    removeSourceBuffer: function (mediaSource, buffer) {
        "use strict";
        var deferred = Q.defer();
        try {
            deferred.resolve(mediaSource.removeSourceBuffer(buffer));
        } catch(ex){
            deferred.reject(ex.description);
        }
        return deferred.promise;
    },

    getBufferRange: function (buffer, time, tolerance) {
        "use strict";

        var ranges = null,
            start = 0,
            end = 0,
            firstStart = null,
            lastEnd = null,
            gap = 0,
            toler = (tolerance || 0.15),
            len,
            i;

        ranges = buffer.buffered;

        if (ranges !== null) {
            for (i = 0, len = ranges.length; i < len; i += 1) {
                start = ranges.start(i);
                end = ranges.end(i);
                if (firstStart === null) {
                    gap = Math.abs(start - time);
                    if (time >= start && time < end) {
                        // start the range
                        firstStart = start;
                        lastEnd = end;
                        continue;
                    } else if (gap <= toler) {
                        // start the range even though the buffer does not contain time 0
                        firstStart = start;
                        lastEnd = end;
                        continue;
                    }
                } else {
                    gap = start - lastEnd;
                    if (gap <= toler) {
                        // the discontinuity is smaller than the tolerance, combine the ranges
                        lastEnd = end;
                    } else {
                        break;
                    }
                }
            }

            if (firstStart !== null) {
                return Q.when({start: firstStart, end: lastEnd});
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
        var deferred = Q.defer();
        try {
            deferred.resolve(buffer.abort());
        } catch(ex){
            deferred.reject(ex.description);
        }
        return deferred.promise;
    }
};
