/*
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use self file except in compliance with the License.
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
 * copyright Digital Primates 2012
 */
Dash.dependencies.BaseURLExtensions = function () {
    "use strict";
    
    var url,
        range,
        searching = false,
        bytesLoaded = 0,
        bytesToLoad = 1500,
        
        // From YouTube player.  Reformatted for JSLint.
        parseSIDX = function (ab, ab_first_byte_offset) {
            var d = new DataView(ab),
                pos = 0,
                sidxEnd,
                version,
                timescale,
                earliest_presentation_time,
                first_offset,
                reference_count,
                offset,
                time,
                references,
                i,
                ref_size,
                ref_type,
                ref_dur;

            while (d.getUint32(pos + 4, false) !== 0x73696478) {
                pos += d.getUint32(pos, false);
                if (pos >= ab.byteLength) {
                    throw "Could not find sidx";
                }
            }

            sidxEnd = d.getUint32(pos, false) + pos;
            if (sidxEnd > ab.byteLength) {
                throw "sidx terminates after array buffer";
            }

            version = d.getUint8(pos + 8);
            pos += 12;

            // skipped reference_ID(32)
            timescale = d.getUint32(pos + 4, false);
            pos += 8;

            if (version === 0) {
                earliest_presentation_time = d.getUint32(pos, false);
                first_offset = d.getUint32(pos + 4, false);
                pos += 8;
            } else {
                // TODO(strobe): Overflow checks
                earliest_presentation_time = (d.getUint32(pos, false) << 32) + d.getUint32(pos + 4, false);
                first_offset = (d.getUint32(pos + 8, false) << 32) + d.getUint32(pos + 12, false);
                pos += 16;
            }
            first_offset += sidxEnd + (ab_first_byte_offset || 0);

            // skipped reserved(16)
            reference_count = d.getUint16(pos + 2, false);
            pos += 4;

            offset = first_offset;
            time = earliest_presentation_time;
            references = [];

            for (i = 0; i < reference_count; i += 1) {
                ref_size = d.getUint32(pos, false);
                ref_type = ref_size & 0x80000000;
                //if (ref_type) throw "Unhandled indirect reference";
                ref_size = ref_size & 0x7fffffff;
                ref_dur = d.getUint32(pos + 4, false);
                pos += 12;
                references.push({
                    'size': ref_size,
                    'offset': offset,
                    'duration': ref_dur,
                    'time': time,
                    'timescale': timescale
                });
                offset += ref_size;
                time += ref_dur;
            }

            if (pos !== sidxEnd) {
                throw "Error: final pos " + pos + " differs from SIDX end " + sidxEnd;
            }

            return references;
        },
        
        parseSegments = function (data, media, offset) {
            var parsed,
                segments,
                segment,
                i,
                len,
                start,
                end;

            parsed = parseSIDX.call(this, data, offset);
            segments = [];

            for (i = 0, len = parsed.length; i < len; i += 1) {
                segment = new Dash.vo.Segment();
                segment.duration = parsed[i].duration;
                segment.media = media;
                segment.startTime = parsed[i].time;
                segment.timescale = parsed[i].timescale;
                
                start = parsed[i].offset;
                end = parsed[i].offset + parsed[i].size - 1;
                segment.mediaRange = start + "-" + end;
                
                segments.push(segment);
            }

            this.debug.log("Parsed SIDX box: " + segments.length + " segments.");
            return Q.when(segments);
        },
        
        findInit = function (data) {
            var deferred = Q.defer(),
                start,
                end,
                range,
                d = new DataView(data),
                pos = 0,
                type = "",
                size = 0,
                bytesAvailable,
                i,
                c,
                request,
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
                range.start = 0;
                range.end = bytesLoaded + bytesToLoad;

                request = new XMLHttpRequest();
                
                request.onload = function () {
                    bytesLoaded = range.end;
                    findInit.call(self, request.response).then(
                        function (segments) {
                            deferred.resolve(segments);
                        }
                    );
                };
                
                request.onerror = function () {
                    deferred.reject("Error loading initialization.");
                };
                
                request.responseType = "arraybuffer";
                request.open("GET", url);
                request.setRequestHeader("Range", "bytes=" + range.start + "-" + range.end);
                request.send(null);
            } else {
                // Case 2
                // We have the entire range, so continue.
                start = pos - 8;
                end = start + size - 1;
                range = start + "-" + end;

                self.debug.log("Found the initialization.  Range: " + range);
                deferred.resolve(range);
            }
            
            return deferred.promise;
        },
        
        loadInit = function(media) {
            var deferred = Q.defer(),
                request = new XMLHttpRequest(),
                self = this;
            
            url = media;
            range = {};
            
            self.debug.log("Start searching for initialization.");
            range.start = 0;
            range.end = bytesToLoad;
            
            request.onload = function () {
                bytesLoaded = range.end;
                findInit.call(self, request.response).then(
                    function (range) {
                        deferred.resolve(range);
                    }
                );
            };
            
            request.onerror = function () {
                deferred.reject("Error finding initialization.");
            };
            
            request.responseType = "arraybuffer";
            request.open("GET", url);
            request.setRequestHeader("Range", "bytes=" + range.start + "-" + range.end);
            request.send(null);
            self.debug.log("Perform init search: " + url);
            
            return deferred.promise;
        },
        
        findSIDX = function (data) {
            var deferred = Q.defer(),
                d = new DataView(data),
                pos = 0,
                type = "",
                size = 0,
                bytesAvailable,
                sidxBytes,
                i,
                c,
                self = this;

            self.debug.log("Searching for SIDX box.");
            self.debug.log(bytesLoaded + " bytes loaded.");

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
                throw ("Could not find SIDX box!");
            } else if (bytesAvailable < size) {
                // Case 2
                // We don't have the entire box.
                // Increase the number of bytes to read and load again.
                self.debug.log("Found SIDX but we don't have all of it.");

                range.start = 0;
                range.end = bytesLoaded + (size - bytesAvailable);

                var request = new XMLHttpRequest();
                
                request.onload = function () {
                    bytesLoaded = range.end;
                    findSIDX.call(self, request.response).then(
                        function (segments) {
                            deferred.resolve(segments);
                        }
                    );
                };
                
                request.onerror = function () {
                    deferred.reject("Error loading sidx.");
                };
                
                request.responseType = "arraybuffer";
                request.open("GET", url);
                request.setRequestHeader("Range", "bytes=" + range.start + "-" + range.end);
                request.send(null);
            } else {
                // Case 3
                // We have the entire box, so parse it and continue.
                range.start = pos - 8;
                range.end = range.start + size;

                self.debug.log("Found the SIDX box.  Start: " + range.start + " | End: " + range.end);
                sidxBytes = data.slice(range.start, range.end);
                
                parseSegments.call(self, sidxBytes, url, range.start).then(
                    function (segments) {
                        deferred.resolve(segments);
                    }
                );
            }
            
            return deferred.promise;
        },
        
        loadSegments = function(media, theRange) {
            var deferred = Q.defer(),
                request = new XMLHttpRequest(),
                parts,
                self = this;
            
            url = media;
            range = {};
            
            // We might not know exactly where the sidx box is.
            // Load the first n bytes (say 1500) and look for it.
            if (theRange === null) {
                self.debug.log("No known range for SIDX request.");
                searching = true;
                range.start = 0;
                range.end = bytesToLoad;
            } else {
                parts = theRange.split("-");
                range.start = parseFloat(parts[0]);
                range.end = parseFloat(parts[1]);
            }
            
            request.onload = function () {
                // If we didn't know where the SIDX box was, we have to look for it.
                // Iterate over the data checking out the boxes to find it.
                if (searching) {
                    bytesLoaded = range.end;
                    findSIDX.call(self, request.response).then(
                        function (segments) {
                            deferred.resolve(segments);
                        }
                    );
                } else {
                    parseSegments.call(self, request.response, url, range.start).then(
                        function (segments) {
                            deferred.resolve(segments);
                        }
                    );
                }
            };
            
            request.onerror = function () {
                deferred.reject("Error loading sidx.");
            };
            
            request.responseType = "arraybuffer";
            request.open("GET", url);
            request.setRequestHeader("Range", "bytes=" + range.start + "-" + range.end);
            request.send(null);
            self.debug.log("Perform SIDX load: " + url);
            
            return deferred.promise;
        };
    
    return {
        debug: undefined,
        
        loadSegments: loadSegments,
        loadInitialization: loadInit
    };
};

Dash.dependencies.BaseURLExtensions.prototype = {
    constructor: Dash.dependencies.BaseURLExtensions
};