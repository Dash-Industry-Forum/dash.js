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
 * copyright Digital Primates 2012
 */
Dash.modules.SegmentIndexLoader = (function () {
    "use strict";

    var Constr;

    Constr = function () {
        this.url = null;
        this.quality = -1;
        this.range = null;
        this.searching = false;
        this.bytesLoaded = 0;
        this.bytesToLoad = 1500;
        this.onInitializationChanged = null;
        this.onSegmentsLoaded = null;

        this.xhr = new XMLHttpRequest();
        this.xhr.responseType = "arraybuffer";
        this.xhr.addEventListener("load", this.onSegmentDataLoaded.bind(this), false);
        this.xhr.addEventListener("error", this.onSegmentDataError.bind(this), false);
    };

    Constr.prototype = {
        constructor: Dash.modules.SegmentIndexLoader,
        
        // From YouTube player.  Reformatted for JSLint.
        parseSIDX: function (ab, ab_first_byte_offset) {
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

        parseSegments: function (data, media, offset) {
            var debug = Stream.modules.debug,
                parsed,
                segments,
                segment,
                i,
                max;

            parsed = this.parseSIDX(data, offset);
            segments = [];

            for (i = 0, max = parsed.length; i < max; i += 1) {
                segment = new Dash.vo.Segment();
                segment.duration = parsed[i].duration;
                segment.media = media;
                segment.startTime = parsed[i].time;
                segment.timescale = parsed[i].timescale;
                segment.mediaRange = new Dash.vo.IndexRange();
                segment.mediaRange.start = parsed[i].offset;
                segment.mediaRange.end = parsed[i].offset + parsed[i].size - 1;
                segments.push(segment);
            }

            debug.log("Parsed SIDX box.  " + segments.length + " segments.");
            return segments;
        },

        findSIDX: function (data) {
            var debug = Stream.modules.debug,
                initStart,
                initEnd,
                d = new DataView(data),
                pos = 0,
                type = "",
                size = 0,
                bytesAvailable,
                sidxBytes,
                i,
                c;

            debug.log("Searching for SIDX box.");
            debug.log(this.bytesLoaded + " bytes loaded.");

            while (type !== "sidx" && pos < d.byteLength) {
                size = d.getUint32(pos); // subtract 8 for including the size and type
                pos += 4;

                type = "";
                for (i = 0; i < 4; i += 1) {
                    c = d.getInt8(pos);
                    type += String.fromCharCode(c);
                    pos += 1;
                }

                // this is the initialization part
                if (type === "moov") {
                    initStart = pos - 8;
                    initEnd = initStart + size - 1;
                    this.onInitializationChanged(initStart, initEnd, this.quality);
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
                debug.log("Found SIDX but we don't have all of it.");

                this.range.start = 0;
                this.range.end = this.bytesLoaded + (size - bytesAvailable);

                this.xhr.open("GET", this.url);
                this.xhr.setRequestHeader("Range", "bytes=" + this.range.start + "-" + this.range.end);
                this.xhr.send(null);
            } else {
                // Case 3
                // We have the entire box, so parse it and continue.

                this.range.start = pos - 8;
                this.range.end = this.range.start + size;

                debug.log("Found the SIDX box.  Start: " + this.range.start + " | End: " + this.range.end);
                sidxBytes = data.slice(this.range.start, this.range.end);
                this.onSegmentsLoaded(this.parseSegments(sidxBytes, this.url, this.range.start), this.quality);
            }
        },

        onSegmentDataLoaded: function (e) {
            // If we didn't know where the SIDX box was, we have to look for it.
            // Iterate over the data checking out the boxes to find it.
            if (this.searching) {
                this.bytesLoaded = this.range.end;
                this.findSIDX(this.xhr.response);
            } else {
                // If we have the whole box just parse it.
                this.onSegmentsLoaded(this.parseSegments(this.xhr.response, this.url, this.range.start), this.quality);
            }
        },

        onSegmentDataError: function (e) {
            throw "Could not load segment data from: " + this.url;
        },

        loadSegments: function (mediaUrl, segmentRange, requestedQuality) {
            var debug = Stream.modules.debug;

            this.url = mediaUrl;
            this.range = segmentRange;
            this.quality = requestedQuality;

            // We might not know exactly where the sidx box is.
            // Load the first n bytes (say 1500) and look for it.
            if (this.range === null) {
                debug.log("No known range for SIDX request.");
                this.searching = true;
                this.range = new Dash.vo.IndexRange();
                this.range.start = 0;
                this.range.end = this.bytesToLoad;
            }

            this.xhr.open("GET", this.url);
            this.xhr.setRequestHeader("Range", "bytes=" + this.range.start + "-" + this.range.end);
            this.xhr.send(null);
            debug.log("Perform SIDX load: " + this.url);
        },

        setInitializationChangedCallback: function (callback) {
            this.onInitializationChanged = callback;
        },

        setSegmentsLoadedCallback: function (callback) {
            this.onSegmentsLoaded = callback;
        }
    };

    return Constr;
}());