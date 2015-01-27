/*
  * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
  * 
  * Copyright (c) 2014, Google
  * All rights reserved.
  * 
  * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
  * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
  * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
  * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
  * 
  * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
  */
/*global Dash, DataView, Webm, XMLHttpRequest*/
/*jslint bitwise: true */
var WebM = {
    EBML: {
        tag: 0x1A45DFA3,
        required: true
    },
    Segment: {
        tag: 0x18538067,
        required: true,
        SeekHead: {
            tag: 0x114D9B74,
            required: true
        },
        Info: {
            tag: 0x1549A966,
            required: true,
            TimecodeScale: {
                tag: 0x2AD7B1,
                required: true,
                parse: 'getMatroskaUint'
            },
            Duration: {
                tag: 0x4489,
                required: true,
                parse: 'getMatroskaFloat'
            }
        },
        Tracks: {
            tag: 0x1654AE6B,
            required: true
        },
        Cues: {
            tag: 0x1C53BB6B,
            required: true,
            CuePoint: {
                tag: 0xBB,
                required: true,
                CueTime: {
                    tag: 0xB3,
                    required: true,
                    parse: 'getMatroskaUint'
                },
                CueTrackPositions: {
                    tag: 0xB7,
                    required: true,
                    CueTrack: {
                        tag: 0xF7,
                        required: true,
                        parse: 'getMatroskaUint'
                    },
                    CueClusterPosition: {
                        tag: 0xF1,
                        required: true,
                        parse: 'getMatroskaUint'
                    },
                    CueBlockNumber: {
                        tag: 0x5378
                    }
                }
            }
        }
    },
    Void: {
        tag: 0xEC,
        required: true
    }
};

/**
 * Creates an instance of an EbmlParser class which implements a large subset
 * of the functionality required to parse Matroska EBML
 *
 * @constructor
 * @this {EbmlParser}
 * @param {buffer} data the buffer to pars
 */
function EbmlParser(data) {
    "use strict";
    this.d = new DataView(data);
    this.pos = 0;
}

/**
 * Consumes an EBML tag from the data stream.
 *
 * @this {EbmlParser}
 * @param tag to parse, A tag is an object with at least a {number} tag and
 * {boolean} required flag.
 * @param {boolean} test whether or not the function should throw if a required
 * tag is not found
 * @return {boolean} whether or not the tag was found
 * @throws will throw an exception if a required tag is not found and test
 * param is false or undefined, or if the stream is malformed.
 */
EbmlParser.prototype.consumeTag = function (tag, test) {
    "use strict";
    var found = true,
        bytesConsumed = 0,
        p1,
        p2;
    if (test === undefined) {
        test = false;
    }
    if (tag.tag > 0xFFFFFF) {
        if (this.d.getUint32(this.pos) !== tag.tag) {
            found = false;
        }
        bytesConsumed = 4;
    } else if (tag.tag > 0xFFFF) {
        // 3 bytes
        p1 = this.d.getUint16(this.pos);
        p2 = this.d.getUint8(this.pos + 2);

        // shift p1 over a byte and add p2
        if (p1 * 256 + p2 !== tag.tag) {
            found = false;
        }
        bytesConsumed = 3;
    } else if (tag.tag > 0xFF) {
        if (this.d.getUint16(this.pos) !== tag.tag) {
            found = false;
        }
        bytesConsumed = 2;
    } else {
        if (this.d.getUint8(this.pos) !== tag.tag) {
            found = false;
        }
        bytesConsumed = 1;
    }

    if (!found && tag.required && !test) {
        throw "required tag not found";
    }
    if (found) {
        this.pos += bytesConsumed;
    }
    return found;
};

/**
 * Consumes an EBML tag from the data stream.   If the tag is found then this
 * function will also remove the size field which follows the tag from the
 * data stream.
 *
 * @this {EbmlParser}
 * @param tag to parse, A tag is an object with at least a {number} tag and
 * {boolean} required flag.
 * @param {boolean} test whether or not the function should throw if a required
 * tag is not found
 * @return {boolean} whether or not the tag was found
 * @throws will throw an exception if a required tag is not found and test
 * param is false or undefined, or if the stream is malformed.
 */
EbmlParser.prototype.consumeTagAndSize = function (tag, test) {
    "use strict";
    var found = this.consumeTag(tag, test);
    if (found) {
        this.getMatroskaCodedNum();
    }
    return found;
};

/**
 * Consumes an EBML tag from the data stream.   If the tag is found then this
 * function will also remove the size field which follows the tag from the
 * data stream.  It will use the value of the size field to parse a binary
 * field, using a parser defined in the tag itself
 *
 * @this {EbmlParser}
 * @param tag to parse, A tag is an object with at least a {number} tag,
 * {boolean} required flag, and a parse function which takes a size parameter
 * @return {boolean} whether or not the tag was found
 * @throws will throw an exception if a required tag is not found,
 * or if the stream is malformed
 */
EbmlParser.prototype.parseTag = function (tag) {
    "use strict";
    var size;
    this.consumeTag(tag);
    size = this.getMatroskaCodedNum();
    return this[tag.parse](size);
};

/**
 * Consumes an EBML tag from the data stream.   If the tag is found then this
 * function will also remove the size field which follows the tag from the
 * data stream.  It will use the value of the size field to skip over the
 * entire section of EBML encapsulated by the tag.
 *
 * @this {EbmlParser}
 * @param tag to parse, A tag is an object with at least a {number} tag, and
 * {boolean} required flag
 * @param {boolean} test a flag to indicate if an exception should be thrown
 * if a required tag is not found
 * @return {boolean} whether or not the tag was found
 * @throws will throw an exception if a required tag is not found and test is
 * false or undefined or if the stream is malformed
 */
EbmlParser.prototype.skipOverElement = function (tag, test) {
    "use strict";
    var found = this.consumeTag(tag, test),
        headerSize;
    if (found) {
        headerSize = this.getMatroskaCodedNum();
        this.pos += headerSize;
    }
    return found;
};

/**
 * Returns and consumes a number encoded according to the Matroska EBML
 * specification from the bitstream.
 *
 * @this {EbmlParser}
 * @param {boolean} whether or not to retain the Most Significant Bit (the
 * first 1). this is usually true when reading Tag IDs.
 * @return {number} the decoded number
 * @throws will throw an exception if the bit stream is malformed or there is
 * not enough data
 */
EbmlParser.prototype.getMatroskaCodedNum = function (retainMSB) {
    "use strict";
    var bytesUsed = 1,
        mask = 0x80,
        maxBytes = 8,
        extraBytes = -1,
        num = 0,
        ch = this.d.getUint8(this.pos),
        i;

    for (i = 0; i < maxBytes; i += 1) {
        if ((ch & mask) === mask) {
            num = (retainMSB === undefined) ? ch & ~mask : ch;
            extraBytes = i;
            break;
        }
        mask >>= 1;
    }

    for (i = 0; i < extraBytes; i += 1, bytesUsed += 1) {
        num = (num << 8) | (0xff & this.d.getUint8(this.pos + bytesUsed));
    }
    this.pos += bytesUsed;
    return num;
};

/**
 * Returns and consumes a float from the bitstream.
 *
 * @this {EbmlParser}
 * @param {number} size 4 or 8 byte floats are supported
 * @return {number} the decoded number
 * @throws will throw an exception if the bit stream is malformed or there is
 * not enough data
 */
EbmlParser.prototype.getMatroskaFloat = function (size) {
    "use strict";
    var outFloat;
    switch (size) {
    case 4:
        outFloat = this.d.getFloat32(this.pos);
        this.pos += 4;
        break;
    case 8:
        outFloat = this.d.getFloat64(this.pos);
        this.pos += 8;
        break;
    }
    return outFloat;
};

/**
 * Consumes and returns an unsigned int from the bitstream.
 *
 * @this {EbmlParser}
 * @param {number} size 1 to 8 bytes
 * @return {number} the decoded number
 * @throws will throw an exception if the bit stream is malformed or there is
 * not enough data
 */
EbmlParser.prototype.getMatroskaUint = function (size) {
    "use strict";
    var val = 0,
        i;
    for (i = 0; i < size; i += 1) {
        val <<= 8;
        val |= this.d.getUint8(this.pos + i) & 0xff;
    }

    this.pos += size;
    return val;
};

/**
 * Tests whether there is more data in the bitstream for parsing
 *
 * @this {EbmlParser}
 * @return {boolean} whether there is more data to parse
 */
EbmlParser.prototype.moreData = function () {
    "use strict";
    return this.pos < this.d.byteLength;
};

Webm.dependencies.WebmURLExtensions = function () {
    "use strict";

    var parseCues = function (ab) {
        var cues = [],
            cue,
            cueSize,
            cueTrack,
            d = new EbmlParser(ab),
            numSize;
        d.consumeTag(WebM.Segment.Cues);
        cueSize = d.getMatroskaCodedNum();

        while (d.moreData() &&
                d.consumeTagAndSize(WebM.Segment.Cues.CuePoint, true)) {
            cue = {};

            cue.CueTime = d.parseTag(WebM.Segment.Cues.CuePoint.CueTime);

            cue.CueTracks = [];
            while (d.moreData() &&
                    d.consumeTagAndSize(WebM.Segment.Cues.CuePoint.CueTrackPositions, true)) {
                cueTrack = {};

                cueTrack.Track = d.parseTag(WebM.Segment.Cues.CuePoint.CueTrackPositions.CueTrack);
                if (cueTrack.Track === 0) {
                    throw "Cue track cannot be 0";
                }

                cueTrack.ClusterPosition =
                    d.parseTag(WebM.Segment.Cues.CuePoint.CueTrackPositions.CueClusterPosition);

                // block number is strictly optional.
                // we also have to make sure we don't go beyond the end
                // of the cues
                if (d.pos + 4 > cueSize ||
                        !d.consumeTag(WebM.Segment.Cues.CuePoint.CueTrackPositions.CueBlockNumber, true)) {
                    cue.CueTracks.push(cueTrack);
                } else {
                    // since we have already consumed the tag, get the size of
                    // the tag's payload, and manually parse an unsigned int
                    // from the bit stream
                    numSize = d.getMatroskaCodedNum();
                    cueTrack.BlockNumber = d.getMatroskaUint(numSize);

                    cue.CueTracks.push(cueTrack);
                }
            }

            if (cue.CueTracks.length === 0) {
                throw "Mandatory cuetrack not found";
            }
            cues.push(cue);
        }

        if (cues.length === 0) {
            throw "mandatory cuepoint not found";
        }
        return cues;
    },

        parseSegments = function (data, media, segmentStart, segmentEnd, segmentDuration) {
            var duration,
                parsed,
                segments,
                segment,
                i,
                len,
                start,
                end;

            parsed = parseCues.call(this, data);
            segments = [];

            // we are assuming one cue track per cue point
            // both duration and media range require the i + 1 segment
            // the final segment has to use global segment parameters
            for (i = 0, len = parsed.length; i < len; i += 1) {
                segment = new Dash.vo.Segment();
                duration = 0;
                if (i < parsed.length - 1) {
                    duration = parsed[i + 1].CueTime - parsed[i].CueTime;
                } else {
                    duration = segmentDuration - parsed[i].CueTime;
                }
                segment.duration = duration;
                segment.media = media;
                segment.startTime = parsed[i].CueTime;
                segment.timescale = 1000; // hardcoded for ms
                start = parsed[i].CueTracks[0].ClusterPosition + segmentStart;

                if (i < parsed.length - 1) {
                    end = parsed[i + 1].CueTracks[0].ClusterPosition + segmentStart - 1;
                } else {
                    end = segmentEnd - 1;
                }
                segment.mediaRange = start + "-" + end;

                segments.push(segment);
            }

            this.debug.log("Parsed cues: " + segments.length + " cues.");
            return segments;
        },

        parseEbmlHeader = function (data, media, theRange, callback) {
            var d = new EbmlParser(data),
                duration,
                segments,
                parts = theRange.split("-"),
                request = new XMLHttpRequest(),
                self = this,
                needFailureReport = true,
                info = {
                    url: media,
                    range: {
                        start: parseFloat(parts[0]),
                        end: parseFloat(parts[1])
                    },
                    request: request
                },
                segmentEnd,
                segmentStart;
            // skip over the header itself
            d.skipOverElement(WebM.EBML);
            d.consumeTag(WebM.Segment);

            // segments start here
            segmentEnd = d.getMatroskaCodedNum();
            segmentEnd += d.pos;
            segmentStart = d.pos;

            // skip over any top level elements to get to the segment info
            while (d.moreData() &&
                    !d.consumeTagAndSize(WebM.Segment.Info, true)) {
                if (!(d.skipOverElement(WebM.Segment.SeekHead, true) ||
                    d.skipOverElement(WebM.Segment.Tracks, true) ||
                    d.skipOverElement(WebM.Segment.Cues, true) ||
                    d.skipOverElement(WebM.Void, true))) {
                    throw "no valid top level element found";
                }
            }
            // we only need one thing in segment info, duration
            while (duration === undefined) {
              var infoTag = d.getMatroskaCodedNum(true);
              var infoElementSize = d.getMatroskaCodedNum();
              switch (infoTag) {
                case WebM.Segment.Info.Duration.tag:
                  duration = d[WebM.Segment.Info.Duration.parse](infoElementSize);
                  break;
                default:
                  d.pos += infoElementSize;
                  break;
              }
            }

            // once we have what we need from segment info, we jump right to the
            // cues
            request.onload = function () {
                if (request.status < 200 || request.status > 299) {
                    return;
                }
                needFailureReport = false;
                segments = parseSegments.call(self, request.response, info.url, segmentStart, segmentEnd, duration);
                callback.call(self, segments);
            };

            request.onloadend = request.onerror = function () {
                if (!needFailureReport) {
                    return;
                }
                needFailureReport = false;

                self.errHandler.downloadError("Cues ", info.url, request);
                callback.call(self, null);
            };


          request.open("GET", info.url);
            request.responseType = "arraybuffer";
            request.setRequestHeader("Range", "bytes=" + info.range.start + "-" + info.range.end);
            request.send(null);

            self.debug.log("Perform cues load: " + info.url + " bytes=" + info.range.start + "-" + info.range.end);
        },

        loadSegments = function (representation, type, theRange, callback) {
            var request = new XMLHttpRequest(),
                self = this,
                needFailureReport = true,
                media = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].
                    AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].BaseURL,
                bytesToLoad = 8192,
                info = {
                    bytesLoaded: 0,
                    bytesToLoad: bytesToLoad,
                    range: {
                        start: 0,
                        end: bytesToLoad
                    },
                    request: request,
                    url: media
                };

            // first load the header, but preserve the manifest range so we can
            // load the cues after parsing the header
            // NOTE: we expect segment info to appear in the first 8192 bytes
            self.debug.log("Parsing ebml header");
            request.onload = function () {
                if (request.status < 200 || request.status > 299) {
                    return;
                }
                needFailureReport = false;
                parseEbmlHeader.call(self, request.response, media, theRange, function (segments) {
                    callback.call(self, segments, representation, type);
                });
            };

            request.onloadend = request.onerror = function () {
                if (!needFailureReport) {
                    return;
                }
                needFailureReport = false;

                self.errHandler.downloadError("EBML Header", info.url, request);
                callback.call(self, null, representation, type);
            };

            request.open("GET", info.url);
            request.responseType = "arraybuffer";
            request.setRequestHeader("Range", "bytes=" + info.range.start + "-" + info.range.end);
            request.send(null);
            self.debug.log("Parse EBML header: " + info.url);
        },

        onLoaded = function(segments, representation, type) {
            var self = this;

            if(segments) {
                self.notify(Webm.dependencies.WebmURLExtensions.eventList.ENAME_SEGMENTS_LOADED, {segments: segments, representation: representation, mediaType: type});
            } else {
                self.notify(Webm.dependencies.WebmURLExtensions.eventList.ENAME_SEGMENTS_LOADED, {segments: null, representation: representation, mediaType: type}, new MediaPlayer.vo.Error(null, "error loading segments", null));
            }
        };

    return {
        debug: undefined,
        errHandler: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        loadSegments: function(representation, type, range) {
            loadSegments.call(this, representation, type, range, onLoaded.bind(this));
        },

        parseEbmlHeader: parseEbmlHeader,
        parseSegments: parseSegments,
        parseSIDX: parseCues
    };
};

Webm.dependencies.WebmURLExtensions.prototype = {
    constructor: Webm.dependencies.WebmURLExtensions
};

Webm.dependencies.WebmURLExtensions.eventList = {
    ENAME_INITIALIZATION_LOADED: "initializationLoaded",
    ENAME_SEGMENTS_LOADED: "segmentsLoaded"
};