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

            this.debug.log("Parsed SIDX box: " + segments.length + " segments.");
            return Q.when(segments);
        },

        findInit = function (data, info) {
            var deferred = Q.defer(),
                ftyp,
                moov,
                start,
                end,
                d = new DataView(data),
                pos = 0,
                type = "",
                size = 0,
                bytesAvailable,
                i,
                c,
                request,
                loaded = false,
                irange,
                self = this;

            self.debug.log("Searching for initialization.");

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

            bytesAvailable = d.byteLength - pos;

            if (type !== "moov") {
                // Case 1
                // We didn't download enough bytes to find the moov.
                // TODO : Load more bytes.
                //        Be sure to detect EOF.
                //        Throw error is no moov is found in the entire file.
                //        Protection from loading the entire file?
                self.debug.log("Loading more bytes to find initialization.");
                info.range.start = 0;
                info.range.end = info.bytesLoaded + info.bytesToLoad;

                request = new XMLHttpRequest();

                request.onloadend = function () {
                    if (!loaded) {
                        deferred.reject("Error loading initialization.");
                    }
                };

                request.onload = function () {
                    loaded = true;
                    info.bytesLoaded = info.range.end;
                    findInit.call(self, request.response).then(
                        function (segments) {
                            deferred.resolve(segments);
                        }
                    );
                };

                request.onerror = function () {
                    deferred.reject("Error loading initialization.");
                };

                request.open("GET", self.tokenAuthentication.addTokenAsQueryArg(info.url));
                request.responseType = "arraybuffer";
                request.setRequestHeader("Range", "bytes=" + info.range.start + "-" + info.range.end);
                request = self.tokenAuthentication.setTokenInRequestHeader(request);
                request.send(null);
            } else {
                // Case 2
                // We have the entire range, so continue.
                start = ftyp === undefined ? moov : ftyp;
                end = moov + size - 1;
                irange = start + "-" + end;

                self.debug.log("Found the initialization.  Range: " + irange);
                deferred.resolve(irange);
            }

            return deferred.promise;
        },

        loadInit = function (media) {
            var deferred = Q.defer(),
                request = new XMLHttpRequest(),
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

            self.debug.log("Start searching for initialization.");
            info.range.start = 0;
            info.range.end = info.bytesToLoad;

            request.onload = function () {
                if (request.status < 200 || request.status > 299)
                {
                  return;
                }
                needFailureReport = false;

                info.bytesLoaded = info.range.end;
                findInit.call(self, request.response, info).then(
                    function (range) {
                        deferred.resolve(range);
                    }
                );
            };

            request.onloadend = request.onerror = function () {
                if (!needFailureReport)
                {
                  return;
                }
                needFailureReport = false;

                self.errHandler.downloadError("initialization", info.url, request);
                deferred.reject(request);
            };

            request.open("GET", self.tokenAuthentication.addTokenAsQueryArg(info.url));
            request.responseType = "arraybuffer";
            request.setRequestHeader("Range", "bytes=" + info.range.start + "-" + info.range.end);
            request = self.tokenAuthentication.setTokenInRequestHeader(request);
            request.send(null);
            self.debug.log("Perform init search: " + info.url);

            return deferred.promise;
        },

        findSIDX = function (data, info) {
            var deferred = Q.defer(),
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

            self.debug.log("Searching for SIDX box.");
            self.debug.log(info.bytesLoaded + " bytes loaded.");

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
                deferred.reject();
            } else if (bytesAvailable < (size - 8)) {
                // Case 2
                // We don't have the entire box.
                // Increase the number of bytes to read and load again.
                self.debug.log("Found SIDX but we don't have all of it.");

                info.range.start = 0;
                info.range.end = info.bytesLoaded + (size - bytesAvailable);

                request.onload = function () {
                    if (request.status < 200 || request.status > 299)
                    {
                      return;
                    }
                    needFailureReport = false;

                    info.bytesLoaded = info.range.end;
                    findSIDX.call(self, request.response, info).then(
                        function (segments) {
                            deferred.resolve(segments);
                        }
                    );
                };

                request.onloadend = request.onerror = function () {
                    if (!needFailureReport)
                    {
                      return;
                    }
                    needFailureReport = false;

                    self.errHandler.downloadError("SIDX", info.url, request);
                    deferred.reject(request);
                };

                request.open("GET", self.tokenAuthentication.addTokenAsQueryArg(info.url));
                request.responseType = "arraybuffer";
                request.setRequestHeader("Range", "bytes=" + info.range.start + "-" + info.range.end);
                request = self.tokenAuthentication.setTokenInRequestHeader(request);
                request.send(null);
            } else {
                // Case 3
                // We have the entire box, so parse it and continue.
                info.range.start = pos - 8;
                info.range.end = info.range.start + size;

                self.debug.log("Found the SIDX box.  Start: " + info.range.start + " | End: " + info.range.end);
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
                    self.debug.log("Initiate multiple SIDX load.");

                    var j, len, ss, se, r, funcs = [], segs;

                    for (j = 0, len = ref.length; j < len; j += 1) {
                        ss = ref[j].offset;
                        se = ref[j].offset + ref[j].size - 1;
                        r = ss + "-" + se;

                        funcs.push(this.loadSegments.call(self, info.url, r));
                    }

                    Q.all(funcs).then(
                        function (results) {
                            segs = [];
                            for (j = 0, len = results.length; j < len; j += 1) {
                                segs = segs.concat(results[j]);
                            }
                            deferred.resolve(segs);
                        },
                        function (httprequest) {
                            deferred.reject(httprequest);
                        }
                    );

                } else {
                    self.debug.log("Parsing segments from SIDX.");
                    parseSegments.call(self, sidxBytes, info.url, info.range.start).then(
                        function (segments) {
                            deferred.resolve(segments);
                        }
                    );
                }
            }

            return deferred.promise;
        },

        loadSegments = function (media, theRange) {
            var deferred = Q.defer(),
                request = new XMLHttpRequest(),
                parts,
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
                self.debug.log("No known range for SIDX request.");
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
                    findSIDX.call(self, request.response, info).then(
                        function (segments) {
                            deferred.resolve(segments);
                        }
                    );
                } else {
                    parseSegments.call(self, request.response, info.url, info.range.start).then(
                        function (segments) {
                            deferred.resolve(segments);
                        }
                    );
                }
            };

            request.onloadend = request.onerror = function () {
                if (!needFailureReport)
                {
                  return;
                }
                needFailureReport = false;

                self.errHandler.downloadError("SIDX", info.url, request);
                deferred.reject(request);
            };

            request.open("GET", self.tokenAuthentication.addTokenAsQueryArg(info.url));
            request.responseType = "arraybuffer";
            request.setRequestHeader("Range", "bytes=" + info.range.start + "-" + info.range.end);
            request = self.tokenAuthentication.setTokenInRequestHeader(request);
            request.send(null);
            self.debug.log("Perform SIDX load: " + info.url);

            return deferred.promise;
        };

    return {
        debug: undefined,
        errHandler: undefined,
        tokenAuthentication:undefined,
        loadSegments: loadSegments,
        loadInitialization: loadInit,
        parseSegments: parseSegments,
        parseSIDX: parseSIDX,
        findSIDX: findSIDX
    };
};

Dash.dependencies.BaseURLExtensions.prototype = {
    constructor: Dash.dependencies.BaseURLExtensions
};