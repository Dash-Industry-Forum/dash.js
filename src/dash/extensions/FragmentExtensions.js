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
Dash.dependencies.FragmentExtensions = function () {
    "use strict";

    var parseTFDT = function (ab) {
            var d = new DataView(ab),
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

            this.log("position: " + pos);

            if (version === 0) {
                pos += 4;
                base_media_decode_time = d.getUint32(pos, false);
            } else {
                pos += size - 16;
                base_media_decode_time = utils.Math.to64BitNumber(d.getUint32(pos + 4, false), d.getUint32(pos, false));
            }

            return {
                'version' : version,
                'base_media_decode_time' : base_media_decode_time
            };
        },

        parseSIDX = function (ab) {
            var d = new DataView(ab),
                pos = 0,
                version,
                timescale,
                earliest_presentation_time,
                i,
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

            return {
                'earliestPresentationTime' : earliest_presentation_time,
                'timescale' : timescale
            };
        },

        loadFragment = function (media) {
            var self = this,
                request = new XMLHttpRequest(),
                url = media,
                loaded = false,
                errorStr = "Error loading fragment: " + url,
                error = new MediaPlayer.vo.Error(null, errorStr, null),
                parsed;

            request.onloadend = function () {
                if (!loaded) {
                    errorStr = "Error loading fragment: " + url;
                    self.notify(Dash.dependencies.FragmentExtensions.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, {fragment: null}, error);
                }
            };

            request.onload = function () {
                loaded = true;
                parsed = parseTFDT(request.response);
                self.notify(Dash.dependencies.FragmentExtensions.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, {fragment: parsed});
            };

            request.onerror = function () {
                errorStr = "Error loading fragment: " + url;
                self.notify(Dash.dependencies.FragmentExtensions.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, {fragment: null}, error);
            };

            request.responseType = "arraybuffer";
            request.open("GET", url);
            request.send(null);
        };

    return {
        log : undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        loadFragment : loadFragment,
        parseTFDT : parseTFDT,
        parseSIDX : parseSIDX
    };
};

Dash.dependencies.FragmentExtensions.prototype = {
    constructor: Dash.dependencies.FragmentExtensions
};

Dash.dependencies.FragmentExtensions.eventList = {
    ENAME_FRAGMENT_LOADING_COMPLETED: "fragmentLoadingCompleted"
};