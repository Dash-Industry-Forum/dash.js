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
Dash.dependencies.FragmentExtensions = function () {
    "use strict";

    var parseTFDT = function (ab) {
            var deferred = Q.defer(),
                d = new DataView(ab),
                pos = 0,
                base_media_decode_time,
                version,
                size,
                type,
                i,
                c;

            while (type !== "tfdt" && pos < d.byteLength) {
                size = d.getUint32(pos); // subtract 8 for including the size and type
                pos += 4;

                type = "";
                for (i = 0; i < 4; i += 1) {
                    c = d.getInt8(pos);
                    type += String.fromCharCode(c);
                    pos += 1;
                }

                if (type !== "moof" && type !== "traf" && type !== "tfdt") {
                    pos += size - 8;
                }
            }

            if (pos === d.byteLength) {
                throw "Error finding live offset.";
            }

            version = d.getUint8(pos);

            this.debug.log("position: " + pos);

            if (version === 0) {
                pos += 4;
                base_media_decode_time = d.getUint32(pos, false);
            } else {
                pos += size - 16;
                base_media_decode_time = utils.Math.to64BitNumber(d.getUint32(pos + 4, false), d.getUint32(pos, false));
            }

            deferred.resolve({
                'version' : version,
                'base_media_decode_time' : base_media_decode_time
            });

            return deferred.promise;
        },

        parseSIDX = function (ab) {
            var d = new DataView(ab),
                pos = 0,
                sidxEnd,
                version,
                timescale,
                earliest_presentation_time,
                first_offset,
                reference_count,
                references = [],
                i,
                ref_size,
                ref_dur,
                type,
                size,
                charCode;

            while (type !== "sidx" && pos < d.byteLength) {
                size = d.getUint32(pos); // subtract 8 for including the size and type
                pos += 4;

                type = "";
                for (i = 0; i < 4; i += 1) {
                    charCode = d.getInt8(pos);
                    type += String.fromCharCode(charCode);
                    pos += 1;
                }

                if (type !== "moof" && type !== "traf" && type !== "sidx") {
                    pos += size - 8;
                } else if (type === "sidx") {
                    // reset the position to the beginning of the box...
                    // if we do not reset the position, the evaluation
                    // of sidxEnd to ab.byteLength will fail.
                    pos -= 8;
                }
            }

            version = d.getUint8(pos + 8);
            pos += 12;

            // skipped reference_ID(32)
            timescale = d.getUint32(pos + 4, false);
            pos += 8;

            if (version === 0) {
                earliest_presentation_time = d.getUint32(pos, false);
            } else {
                earliest_presentation_time = utils.Math.to64BitNumber(d.getUint32(pos + 4, false), d.getUint32(pos, false));
            }

            return Q.when({
                'earliestPresentationTime' : earliest_presentation_time,
                'timescale' : timescale
            });
        },

        loadFragment = function (media) {
            var deferred = Q.defer(),
                request = new XMLHttpRequest(),
                url;

            url = media;

            request.onload = function () {
                var parsed = parseTFDT(request.response);
                deferred.resolve(parsed);
            };

            request.onerror = function () {
                var errorStr = "Error loading fragment: " + url;
                deferred.reject(errorStr);
            };

            request.responseType = "arraybuffer";
            request.open("GET", url);
            request.send(null);

            return deferred.promise;
        };

    return {
        debug : undefined,
        loadFragment : loadFragment,
        parseTFDT : parseTFDT,
        parseSIDX : parseSIDX
    };
};

Dash.dependencies.FragmentExtensions.prototype = {
    constructor: Dash.dependencies.FragmentExtensions
};