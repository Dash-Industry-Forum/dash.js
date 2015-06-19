/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
Dash.dependencies.BaseURLExtensions = function () {
    "use strict";

    var getSegmentsForSidx = function (sidx, info) {
            var refs = sidx.references,
                len = refs.length,
                timescale = sidx.timescale,
                time = sidx.earliest_presentation_time,
                start = info.range.start + sidx.first_offset + sidx.size,
                segments = [],
                segment,
                end,
                duration,
                size;

            for (var i = 0; i < len; i += 1) {
                duration = refs[i].subsegment_duration;
                size = refs[i].referenced_size;

                segment = new Dash.vo.Segment();
                segment.duration = duration;
                segment.media = info.url;
                segment.startTime = time;
                segment.timescale = timescale;
                end = start + size - 1;
                segment.mediaRange = start + "-" + end;
                segments.push(segment);
                time += duration;
                start += size;
            }

            return segments;
        },

        findInitRange = function (isoFile) {
            var ftyp = isoFile.getBox("ftyp"),
                moov = isoFile.getBox("moov"),
                start,
                end,
                initRange = null;

            this.log("Searching for initialization.");

            if (moov && moov.isComplete) {
                start = ftyp ? ftyp.offset : moov.offset;
                end = moov.offset + moov.size - 1;
                initRange = start + "-" + end;

                this.log("Found the initialization.  Range: " + initRange);
            }

            return initRange;
        },

        loadInit = function (representation, loadingInfo) {
            var request = new XMLHttpRequest(),
                needFailureReport = true,
                self = this,
                initRange = null,
                isoFile = null,
                media = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].
                    AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].BaseURL,
                info = loadingInfo || {
                    url: media,
                    range: {start: 0,
                            end: 1500},
                    searching: false,
                    bytesLoaded: 0,
                    bytesToLoad: 1500,
                    request: request
                };

            self.log("Start searching for initialization.");

            request.onload = function () {
                if (request.status < 200 || request.status > 299) return;

                needFailureReport = false;

                info.bytesLoaded = info.range.end;
                isoFile = self.boxParser.parse(request.response);
                initRange = findInitRange.call(self, isoFile);

                if (initRange) {
                    representation.range = initRange;
                    representation.initialization = media;
                    self.notify(Dash.dependencies.BaseURLExtensions.eventList.ENAME_INITIALIZATION_LOADED, {representation: representation});
                } else {
                    info.range.end = info.bytesLoaded + info.bytesToLoad;
                    loadInit.call(self, representation, info);
                }

            };

            request.onloadend = request.onerror = function () {
                if (!needFailureReport) return;
                needFailureReport = false;

                self.errHandler.downloadError("initialization", info.url, request);
                self.notify(Dash.dependencies.BaseURLExtensions.eventList.ENAME_INITIALIZATION_LOADED, {representation: representation});
            };

            sendRequest.call(self, request, info);
            self.log("Perform init search: " + info.url);
        },

        loadSegments = function (representation, type, theRange, loadingInfo, callback) {
            var self = this,
                hasRange = theRange !== null,
                request = new XMLHttpRequest(),
                media = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].
                    AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].BaseURL,
                needFailureReport = true,
                isoFile = null,
                sidx = null,
                info = {
                    url: media,
                    range: hasRange ? theRange : {start: 0, end: 1500},
                    searching: !hasRange,
                    bytesLoaded: loadingInfo ? loadingInfo.bytesLoaded : 0,
                    bytesToLoad: 1500,
                    request: request
                };

            request.onload = function () {
                if (request.status < 200 || request.status > 299) return;

                var extraBytes = info.bytesToLoad,
                    loadedLength = request.response.byteLength;

                needFailureReport = false;
                info.bytesLoaded = info.range.end - info.range.start;
                isoFile = self.boxParser.parse(request.response);
                sidx = isoFile.getBox("sidx");

                if (!sidx || !sidx.isComplete) {
                    if (sidx) {
                        info.range.start = sidx.offset || info.range.start;
                        info.range.end = info.range.start + (sidx.size || extraBytes);
                    } else if (loadedLength < info.bytesLoaded) {
                        // if we have reached a search limit or if we have reached the end of the file we have to stop trying to find sidx
                        callback.call(self, null, representation, type);
                        return;
                    } else {
                        var lastBox = isoFile.getLastBox();

                        if (lastBox && lastBox.size) {
                            info.range.start = lastBox.offset + lastBox.size;
                            info.range.end = info.range.start + extraBytes;
                        } else {
                            info.range.end += extraBytes;
                        }
                    }
                    loadSegments.call(self, representation, type, info.range, info, callback);
                } else {
                    var ref = sidx.references,
                        loadMultiSidx,
                        segments;

                    if (ref !== null && ref !== undefined && ref.length > 0) {
                        loadMultiSidx = (ref[0].reference_type === 1);
                    }

                    if (loadMultiSidx) {
                        self.log("Initiate multiple SIDX load.");
                        info.range.end = info.range.start + sidx.size;

                        var j, len, ss, se, r, segs = [],
                            count = 0,
                            offset = (sidx.offset || info.range.start) + sidx.size,
                            tmpCallback = function(result) {
                                if (result) {
                                    segs = segs.concat(result);
                                    count += 1;

                                    if (count >= len) {
                                        callback.call(self, segs, representation, type);
                                    }
                                } else {
                                    callback.call(self, null, representation, type);
                                }
                            };

                        for (j = 0, len = ref.length; j < len; j += 1) {
                            ss = offset;
                            se = offset + ref[j].referenced_size - 1;
                            offset = offset + ref[j].referenced_size;
                            r = {start: ss, end: se};
                            loadSegments.call(self, representation, null, r, info, tmpCallback);
                        }

                    } else {
                        self.log("Parsing segments from SIDX.");
                        segments = getSegmentsForSidx.call(self, sidx, info);
                        callback.call(self, segments, representation, type);
                    }
                }
            };

            request.onloadend = request.onerror = function () {
                if (!needFailureReport) return;

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
        boxParser: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        loadSegments: function(representation, type, range) {
            var parts = range ? range.split("-") : null;
            range = parts ? {start: parseFloat(parts[0]), end: parseFloat(parts[1])} : null;

            loadSegments.call(this, representation, type, range, null, onLoaded.bind(this));
        },

        loadInitialization: loadInit
    };
};

Dash.dependencies.BaseURLExtensions.prototype = {
    constructor: Dash.dependencies.BaseURLExtensions
};

Dash.dependencies.BaseURLExtensions.eventList = {
    ENAME_INITIALIZATION_LOADED: "initializationLoaded",
    ENAME_SEGMENTS_LOADED: "segmentsLoaded"
};