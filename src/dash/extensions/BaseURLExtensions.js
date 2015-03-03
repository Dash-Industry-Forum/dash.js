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
Dash.dependencies.BaseURLExtensions = function () {
    "use strict";

        // From YouTube player.  Reformatted for JSLint.
    var parseSIDX = function (ab, ab_first_byte_offset) {
            var d = new DataView(ab),
                sidx = {},
                pos = 0,
                offset,
                time,
                sidxEnd,
                i,
                ref_type,
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

            sidxEnd = d.getUint32(pos, false) + pos;
            if (sidxEnd > ab.byteLength) {
                throw "sidx terminates after array buffer";
            }

            sidx.version = d.getUint8(pos + 8);
            pos += 12;

            // skipped reference_ID(32)
            sidx.timescale = d.getUint32(pos + 4, false);
            pos += 8;

            if (sidx.version === 0) {
                sidx.earliest_presentation_time = d.getUint32(pos, false);
                sidx.first_offset = d.getUint32(pos + 4, false);
                pos += 8;
            } else {
                // TODO(strobe): Overflow checks
                sidx.earliest_presentation_time = utils.Math.to64BitNumber(d.getUint32(pos + 4, false), d.getUint32(pos, false));
                //first_offset = utils.Math.to64BitNumber(d.getUint32(pos + 8, false), d.getUint32(pos + 12, false));
                sidx.first_offset = (d.getUint32(pos + 8, false) << 32) + d.getUint32(pos + 12, false);
                pos += 16;
            }

            sidx.first_offset += sidxEnd + (ab_first_byte_offset || 0);

            // skipped reserved(16)
            sidx.reference_count = d.getUint16(pos + 2, false);
            pos += 4;

            sidx.references = [];
            offset = sidx.first_offset;
            time = sidx.earliest_presentation_time;

            for (i = 0; i < sidx.reference_count; i += 1) {
                ref_size = d.getUint32(pos, false);
                ref_type = (ref_size >>> 31);
                ref_size = ref_size & 0x7fffffff;
                ref_dur = d.getUint32(pos + 4, false);
                pos += 12;
                sidx.references.push({
                    'size': ref_size,
                    'type': ref_type,
                    'offset': offset,
                    'duration': ref_dur,
                    'time': time,
                    'timescale': sidx.timescale
                });
                offset += ref_size;
                time += ref_dur;
            }

            if (pos !== sidxEnd) {
                throw "Error: final pos " + pos + " differs from SIDX end " + sidxEnd;
            }

            return sidx;
        },

        parseSegments = function (data, media, offset) {
            var parsed,
                ref,
                segments,
                segment,
                i,
                len,
                start,
                end;

            parsed = parseSIDX.call(this, data, offset);
            ref = parsed.references;
            segments = [];

            for (i = 0, len = ref.length; i < len; i += 1) {
                segment = new Dash.vo.Segment();
                segment.duration = ref[i].duration;
                segment.media = media;
                segment.startTime = ref[i].time;
                segment.timescale = ref[i].timescale;

                start = ref[i].offset;
                end = ref[i].offset + ref[i].size - 1;
                segment.mediaRange = start + "-" + end;

                segments.push(segment);
            }

            this.log("Parsed SIDX box: " + segments.length + " segments.");
            return segments;
        },

        findInit = function (data, info, callback) {
            var ftyp,
                moov,
                start,
                end,
                d = new DataView(data),
                pos = 0,
                type = "",
                size = 0,
                i,
                c,
                request,
                loaded = false,
                irange,
                self = this;

            self.log("Searching for initialization.");

            while (type !== "moov" && pos < d.byteLength) {
                size = d.getUint32(pos); // subtract 8 for including the size and type
                pos += 4;

                type = "";
                for (i = 0; i < 4; i += 1) {
                    c = d.getInt8(pos);
                    type += String.fromCharCode(c);
                    pos += 1;
                }

                if (type === "ftyp") {
                    ftyp = pos - 8;
                }
                if (type === "moov") {
                    moov = pos - 8;
                }
                if (type !== "moov") {
                    pos += size - 8;
                }
            }

            if (type !== "moov") {
                // Case 1
                // We didn't download enough bytes to find the moov.
                // TODO : Load more bytes.
                //        Be sure to detect EOF.
                //        Throw error is no moov is found in the entire file.
                //        Protection from loading the entire file?
                self.log("Loading more bytes to find initialization.");
                info.range.start = 0;
                info.range.end = info.bytesLoaded + info.bytesToLoad;

                request = new XMLHttpRequest();

                request.onloadend = function () {
                    if (!loaded) {
                        callback.call(self, null, new Error("Error loading initialization."));
                    }
                };

                request.onload = function () {
                    loaded = true;
                    info.bytesLoaded = info.range.end;
                    findInit.call(self, request.response, function (segments) {
                        callback.call(self, segments);
                    });
                };

                request.onerror = function () {
                    callback.call(self, null, new Error("Error loading initialization."));
                };

                sendRequest.call(self, request, info);
            } else {
                // Case 2
                // We have the entire range, so continue.
                start = ftyp === undefined ? moov : ftyp;
                end = moov + size - 1;
                irange = start + "-" + end;

                self.log("Found the initialization.  Range: " + irange);
                callback.call(self, irange);
            }
        },

        loadInit = function (representation) {
            var request = new XMLHttpRequest(),
                needFailureReport = true,
                self = this,
                media = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].
                    AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].BaseURL,
                info = {
                    url: media,
                    range: {},
                    searching: false,
                    bytesLoaded: 0,
                    bytesToLoad: 1500,
                    request: request
                };

            self.log("Start searching for initialization.");
            info.range.start = 0;
            info.range.end = info.bytesToLoad;

            request.onload = function () {
                if (request.status < 200 || request.status > 299)
                {
                  return;
                }
                needFailureReport = false;

                info.bytesLoaded = info.range.end;
                findInit.call(self, request.response, info, function (range) {
                    representation.range = range;
                    representation.initialization = media;
                    self.notify(Dash.dependencies.BaseURLExtensions.eventList.ENAME_INITIALIZATION_LOADED, {representation: representation});
                });
            };

            request.onloadend = request.onerror = function () {
                if (!needFailureReport)
                {
                  return;
                }
                needFailureReport = false;

                self.errHandler.downloadError("initialization", info.url, request);
                self.notify(Dash.dependencies.BaseURLExtensions.eventList.ENAME_INITIALIZATION_LOADED, {representation: representation});
            };

            sendRequest.call(self, request, info);
            self.log("Perform init search: " + info.url);
        },

        findSIDX = function (data, info, representation, callback) {
            var segments,
                d = new DataView(data),
                request = new XMLHttpRequest(),
                pos = 0,
                type = "",
                size = 0,
                bytesAvailable,
                sidxBytes,
                sidxSlice,
                sidxOut,
                i,
                c,
                needFailureReport = true,
                parsed,
                ref,
                loadMultiSidx = false,
                self = this;

            self.log("Searching for SIDX box.");
            self.log(info.bytesLoaded + " bytes loaded.");

            while (type !== "sidx" && pos < d.byteLength) {
                size = d.getUint32(pos); // subtract 8 for including the size and type
                pos += 4;

                type = "";
                for (i = 0; i < 4; i += 1) {
                    c = d.getInt8(pos);
                    type += String.fromCharCode(c);
                    pos += 1;
                }

                if (type !== "sidx") {
                    pos += size - 8;
                }
            }

            bytesAvailable = d.byteLength - pos;

            if (type !== "sidx") {
                // Case 1
                // We didn't download enough bytes to find the sidx.
                // TODO : Load more bytes.
                //        Be sure to detect EOF.
                //        Throw error is no sidx is found in the entire file.
                //        Protection from loading the entire file?
                callback.call(self);
            } else if (bytesAvailable < (size - 8)) {
                // Case 2
                // We don't have the entire box.
                // Increase the number of bytes to read and load again.
                self.log("Found SIDX but we don't have all of it.");

                info.range.start = 0;
                info.range.end = info.bytesLoaded + (size - bytesAvailable);

                request.onload = function () {
                    if (request.status < 200 || request.status > 299)
                    {
                      return;
                    }
                    needFailureReport = false;

                    info.bytesLoaded = info.range.end;
                    findSIDX.call(self, request.response, info, representation, callback);
                };

                request.onloadend = request.onerror = function () {
                    if (!needFailureReport)
                    {
                      return;
                    }
                    needFailureReport = false;

                    self.errHandler.downloadError("SIDX", info.url, request);
                    callback.call(self);
                };

                sendRequest.call(self, request, info);
            } else {
                // Case 3
                // We have the entire box, so parse it and continue.
                info.range.start = pos - 8;
                info.range.end = info.range.start + size;

                self.log("Found the SIDX box.  Start: " + info.range.start + " | End: " + info.range.end);
//                sidxBytes = data.slice(info.range.start, info.range.end);
                sidxBytes = new ArrayBuffer(info.range.end - info.range.start);
                sidxOut = new Uint8Array(sidxBytes);
                sidxSlice = new Uint8Array(data, info.range.start, info.range.end - info.range.start);
                sidxOut.set(sidxSlice);

                parsed = this.parseSIDX.call(this, sidxBytes, info.range.start);

                // We need to check to see if we are loading multiple sidx.
                // For now just check the first reference and assume they are all the same.
                // TODO : Can the referenceTypes be mixed?
                // TODO : Load them all now, or do it as needed?

                ref = parsed.references;
                if (ref !== null && ref !== undefined && ref.length > 0) {
                    loadMultiSidx = (ref[0].type === 1);
                }

                if (loadMultiSidx) {
                    self.log("Initiate multiple SIDX load.");

                    var j, len, ss, se, r, segs = [],
                        count = 0,
                        tmpCallback = function(segments) {
                            if (segments) {
                                segs = segs.concat(segments);
                                count += 1;

                                if (count >= len) {
                                    callback.call(self, segs);
                                }
                            } else {
                                callback.call(self);
                            }
                        };

                    for (j = 0, len = ref.length; j < len; j += 1) {
                        ss = ref[j].offset;
                        se = ref[j].offset + ref[j].size - 1;
                        r = ss + "-" + se;

                        loadSegments.call(self, representation, null, r, tmpCallback);
                    }

                } else {
                    self.log("Parsing segments from SIDX.");
                    segments = parseSegments.call(self, sidxBytes, info.url, info.range.start);
                    callback.call(self, segments);
                }
            }
        },

        loadSegments = function (representation, type, theRange, callback) {
            var request = new XMLHttpRequest(),
                segments,
                parts,
                media = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].
                    AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].BaseURL,
                needFailureReport = true,
                self = this,
                info = {
                    url: media,
                    range: {},
                    searching: false,
                    bytesLoaded: 0,
                    bytesToLoad: 1500,
                    request: request
                };

            // We might not know exactly where the sidx box is.
            // Load the first n bytes (say 1500) and look for it.
            if (theRange === null) {
                self.log("No known range for SIDX request.");
                info.searching = true;
                info.range.start = 0;
                info.range.end = info.bytesToLoad;
            } else {
                parts = theRange.split("-");
                info.range.start = parseFloat(parts[0]);
                info.range.end = parseFloat(parts[1]);
            }

            request.onload = function () {
                if (request.status < 200 || request.status > 299)
                {
                  return;
                }
                needFailureReport = false;

                // If we didn't know where the SIDX box was, we have to look for it.
                // Iterate over the data checking out the boxes to find it.
                if (info.searching) {
                    info.bytesLoaded = info.range.end;
                    findSIDX.call(self, request.response, info, representation, function (segments) {
                        if (segments) {
                            callback.call(self, segments, representation, type);
                        }
                    });
                } else {
                    segments = parseSegments.call(self, request.response, info.url, info.range.start);
                    callback.call(self, segments, representation, type);
                }
            };

            request.onloadend = request.onerror = function () {
                if (!needFailureReport)
                {
                  return;
                }
                needFailureReport = false;

                self.errHandler.downloadError("SIDX", info.url, request);
                callback.call(self, null, representation, type);
            };

            sendRequest.call(self, request, info);
            self.log("Perform SIDX load: " + info.url);
        },

        sendRequest = function(request, info) {
            request.open("GET", this.requestModifierExt.modifyRequestURL(info.url));
            request.responseType = "arraybuffer";
            request.setRequestHeader("Range", "bytes=" + info.range.start + "-" + info.range.end);
            request = this.requestModifierExt.modifyRequestHeader(request);
            request.send(null);
        },

        onLoaded = function(segments, representation, type) {
            var self = this;

            if( segments) {
                self.notify(Dash.dependencies.BaseURLExtensions.eventList.ENAME_SEGMENTS_LOADED, {segments: segments, representation: representation, mediaType: type});
            } else {
                self.notify(Dash.dependencies.BaseURLExtensions.eventList.ENAME_SEGMENTS_LOADED, {segments: null, representation: representation, mediaType: type}, new MediaPlayer.vo.Error(null, "error loading segments", null));
            }
        };

    return {
        log: undefined,
        errHandler: undefined,
        requestModifierExt:undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        loadSegments: function(representation, type, range) {
            loadSegments.call(this, representation, type, range, onLoaded.bind(this));
        },

        loadInitialization: loadInit,
        parseSegments: parseSegments,
        parseSIDX: parseSIDX,
        findSIDX: findSIDX
    };
};

Dash.dependencies.BaseURLExtensions.prototype = {
    constructor: Dash.dependencies.BaseURLExtensions
};

Dash.dependencies.BaseURLExtensions.eventList = {
    ENAME_INITIALIZATION_LOADED: "initializationLoaded",
    ENAME_SEGMENTS_LOADED: "segmentsLoaded"
};