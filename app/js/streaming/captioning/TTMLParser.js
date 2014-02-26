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

    var timeRegex = /(([\d.]*)s)?/,
        matchers = [{
            type: "time",
            test: function (str) {
                return timeRegex.test(str);
            },
            converter: function (str) {
                var match = timeRegex.exec(str);
                return (parseFloat(match[2] || 0));
            }
        }],

        internalParse = function(data) {
            var self = this,
                captionArray = [],
                converter = new X2JS(matchers, '', true),
                ttml,
                cues,
                cue,
                i;

            try {
                ttml = converter.xml_str2json(data);
            } catch (err) {
                self.errHandler.manifestError("parsing the ttml failed", "parse", data);
                return Q.when(captionArray);
            }

            if (!ttml.hasOwnProperty("body") || !ttml.body.div_asArray || ttml.body.div_asArray.length === 0) {
                return Q.when(captionArray);
            }

            cues = ttml.body.div_asArray[0].p_asArray;

            if (!cues || cues.length === 0) {
                return Q.when(captionArray);
            }

            for (i = 0; i < cues.length; i += 1) {
                cue = cues[i];

                captionArray.push({
                    start: cue.begin,
                    end: cue.end,
                    data: cue.__text
                });
            }

            return Q.when(captionArray);
    };

    return {
        parse: internalParse,
        errHandler: undefined
    };
};
