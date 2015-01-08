/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Akamai Technologies
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Akamai Technologies nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.utils.TTMLParser = function () {
    "use strict";

    /*
    * This TTML parser follows "TTML Simple Delivery Profile for Closed Captions (US)" spec - http://www.w3.org/TR/ttml10-sdp-us/
    * */

    var SECONDS_IN_HOUR = 60 * 60,
        SECONDS_IN_MIN = 60,
        // R0028 - A document must not contain a <timeExpression> value that does not conform to the subset of clock-time that
        // matches either of the following patterns: hh:mm:ss.mss or hh:mm:ss:ff, where hh denotes hours (00-23),
        // mm denotes minutes (00-59), ss denotes seconds (00-59), mss denotes milliseconds (000-999), and ff denotes frames (00-frameRate - 1).
        // R0030 - For time expressions that use the hh:mm:ss.mss format, the following constraints apply:
        // - Exactly 2 digits must be used in each of the hours, minutes, and second components (include leading zeros).
        // - Exactly 3 decimal places must be used for the milliseconds component (include leading zeros).
        // R0031 -For time expressions that use the hh:mm:ss:ff format, the following constraints apply:
        // - Exactly 2 digits must be used in each of the hours, minutes, second, and frame components (include leading zeros).
        timingRegex = /^(0[0-9]|1[0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])((\.[0-9][0-9][0-9])|(:[0-9][0-9]))$/,
        ttml,

        parseTimings = function(timingStr) {
            var test = timingRegex.test(timingStr),
                timeParts,
                parsedTime,
                frameRate;

            if (!test) {
                return NaN;
            }

            timeParts = timingStr.split(":");

            parsedTime = (parseFloat(timeParts[0]) * SECONDS_IN_HOUR +
                parseFloat(timeParts[1]) * SECONDS_IN_MIN +
                parseFloat(timeParts[2]));

            // R0031 -For time expressions that use the hh:mm:ss:ff format, the following constraints apply:
            //  - A ttp:frameRate attribute must be present on the tt element.
            //  - A ttp:frameRateMultiplier attribute may be present on the tt element.
            if (timeParts[3]) {
                frameRate = ttml.tt.frameRate;

                if (frameRate && !isNaN(frameRate)) {
                    parsedTime += parseFloat(timeParts[3]) / frameRate;
                } else {
                    return NaN;
                }
            }

            return parsedTime;
        },

        passStructuralConstraints = function () {
            var passed = false,
                hasTt = ttml.hasOwnProperty("tt"),
                hasHead = hasTt ? ttml.tt.hasOwnProperty("head") : false,
                hasLayout = hasHead ? ttml.tt.head.hasOwnProperty("layout") : false,
                hasStyling = hasHead ? ttml.tt.head.hasOwnProperty("styling") : false,
                hasBody = hasTt ? ttml.tt.hasOwnProperty("body") : false,
                hasProfile = hasHead ? ttml.tt.head.hasOwnProperty("profile") : false;

            // R001 - A document must contain a tt element.
            // R002 - A document must contain both a head and body element.
            // R003 - A document must contain both a styling and a layout element.
            if (hasTt && hasHead && hasLayout && hasStyling && hasBody) {
                passed = true;
            }

            // R0008 - A document must contain a ttp:profile element where the use attribute of that element is specified as http://www.w3.org/ns/ttml/profile/sdp-us.
            if (passed) {
                passed = hasProfile && (ttml.tt.head.profile.use === "http://www.w3.org/ns/ttml/profile/sdp-us");
            }

            return passed;
        },

        getNamespacePrefix = function(json, ns) {
            var r = Object.keys(json)
                .filter(function(k){
                    return k.split(":")[0] === "xmlns" && json[k] === ns;
                }).map(function(k){
                    return k.split(":")[1];
                });
            if (r.length != 1) {
                return null;
            }
            return r[0];
        },

        internalParse = function(data) {
            var captionArray = [],
                converter = new X2JS([], "", false),
                errorMsg,
                cues,
                cue,
                startTime,
                endTime,
                nsttp,
                i;

            ttml = converter.xml_str2json(data);

            if (!passStructuralConstraints()) {
                errorMsg = "TTML document has incorrect structure";
                throw errorMsg;
            }

            nsttp = getNamespacePrefix(ttml.tt, "http://www.w3.org/ns/ttml#parameter");

            if (ttml.tt.hasOwnProperty(nsttp + ":frameRate")) {
                ttml.tt.frameRate = parseInt(ttml.tt[nsttp + ":frameRate"], 10);
            }

            cues = ttml.tt.body.div_asArray[0].p_asArray;

            if (!cues || cues.length === 0) {
                errorMsg = "TTML document does not contain any cues";
                throw errorMsg;
            }

            for (i = 0; i < cues.length; i += 1) {
                cue = cues[i];
                startTime = parseTimings(cue.begin);
                endTime = parseTimings(cue.end);

                if (isNaN(startTime) || isNaN(endTime)) {
                    errorMsg = "TTML document has incorrect timing value";
                    throw errorMsg;
                }

                captionArray.push({
                    start: startTime,
                    end: endTime,
                    data: cue.__text
                });
            }

            return captionArray;
    };

    return {
        parse: internalParse
    };
};
