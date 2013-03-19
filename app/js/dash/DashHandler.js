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
Dash.dependencies.DashHandler = function () {
    "use strict";

    var index = -1,
        isLive,
        duration,
        type,

        getRepresentationForQuality = function (quality, data) {
            var representation = null;
            if (data && data.Representation_asArray && data.Representation_asArray.length > 0) {
                representation = data.Representation_asArray[quality];
            }
            return representation;
        },

        replaceNumberForTemplate = function (url, value) {
            var v = value.toString();
            return url.split("$Number$").join(v);
        },

        replaceTimeForTemplate = function (url, value) {
            var v = value.toString();
            return url.split("$Time$").join(v);
        },

        replaceBandwidthForTemplate = function (url, value) {
            var v = value.toString();
            return url.split("$Bandwidth$").join(v);
        },

        replaceIDForTemplate = function (url, value) {
            if (value === null || url.indexOf("$RepresentationID$") === -1) { return url; }
            var v = value.toString();
            return url.split("$RepresentationID$").join(v);
        },

        getRequestUrl = function (destination, baseURL) {
            var url;

            if (destination === baseURL) {
                url = destination;
            } else if (destination.indexOf("http://") !== -1) {
                url = destination;
            } else {
                url = baseURL + destination;
            }

            return url;
        },

        getInit = function (quality, data) {
            var deferred = Q.defer(),
                representation = getRepresentationForQuality(quality, data),
                request = null,
                initialization = null,
                url = null,
                range = null,
                self = this;

            self.debug.log("Getting the initialization request.");

            if (representation.hasOwnProperty("SegmentTemplate")) {
                if (representation.SegmentTemplate.hasOwnProperty("initialization")) {
                    initialization = representation.SegmentTemplate.initialization;
                    initialization = replaceBandwidthForTemplate(initialization, representation.bandwidth);
                    initialization = replaceIDForTemplate(initialization, representation.id);
                }
            } else if (representation.hasOwnProperty("SegmentList") &&
                       representation.SegmentList.hasOwnProperty("Initialization") &&
                       representation.SegmentList.Initialization.hasOwnProperty("sourceURL")) {
                initialization = representation.SegmentList.Initialization.sourceURL;
            } else if (representation.hasOwnProperty("SegmentBase") &&
                       representation.SegmentBase.hasOwnProperty("Initialization") &&
                       representation.SegmentBase.Initialization.hasOwnProperty("range")) {
                initialization = representation.BaseURL;
                range = representation.SegmentBase.Initialization.range;
            } else {
                // Go out and find the initialization.
                url = representation.BaseURL;
                self.baseURLExt.loadInitialization(url).then(
                    function (theRange) {
                        self.debug.log("Got an initialization.");
                        request = new MediaPlayer.vo.SegmentRequest();
                        request.streamType = type;
                        request.type = "Initialization Segment";
                        request.url = getRequestUrl(url, representation.BaseURL);
                        request.range = theRange;
                        deferred.resolve(request);
                    }
                );
            }

            if (initialization && initialization.length > 0) {
                self.debug.log("Got an initialization.");
                request = new MediaPlayer.vo.SegmentRequest();
                request.streamType = type;
                request.type = "Initialization Segment";
                request.url = getRequestUrl(initialization, representation.BaseURL);
                request.range = range;
                deferred.resolve(request);
            }

            return deferred.promise;
        },

        isMediaFinished = function (representation) { // TODO
            var fDuration,
                fTimescale,
                fLength,
                sDuration,
                isFinished = false;

            this.debug.log("Checking for stream end...");
            if (isLive) {
                this.debug.log("Live never ends! (TODO)");
                // TODO : Check the contents of the last box to signal end.
                isFinished = false;
            } else if (representation.hasOwnProperty("segments") && representation.segments !== null) {
                this.debug.log("Segments: " + index + " / " + representation.segments.length);
                isFinished = (index >= representation.segments.length);
            } else if (representation.hasOwnProperty("SegmentTemplate") && !representation.SegmentTemplate.hasOwnProperty("SegmentTimeline")) {
                fTimescale = 1;
                sDuration = Math.floor(duration); // Disregard fractional seconds.  TODO : Is this ok?  The logic breaks if we don't do this...

                if (representation.SegmentTemplate.hasOwnProperty("duration")) {
                    fDuration = representation.SegmentTemplate.duration;

                    if (representation.SegmentTemplate.hasOwnProperty("timescale")) {
                        fTimescale = representation.SegmentTemplate.timescale;
                    }

                    fLength = (fDuration / fTimescale);
                    this.debug.log("SegmentTemplate: " + fLength + " * " + index + " = " + (fLength * index) + " / " + sDuration);
                    isFinished = ((fLength * index) >= sDuration);
                }
            }

            return Q.when(isFinished);
        },

        getSegmentsFromTimeline = function (template, timeline) {
            var segments = [],
                fragments,
                frag,
                i,
                len,
                j,
                repeat,
                seg,
                time = 0,
                count = 0,
                url,
                tIdx;

            fragments = timeline.S_asArray;
            for (i = 0, len = fragments.length; i < len; i += 1) {
                frag = fragments[i];
                repeat = 0;
                if (frag.hasOwnProperty("r")) {
                    repeat = frag.r;
                }

                for (j = 0; j <= repeat; j += 1) {
                    seg = new Dash.vo.Segment();

                    seg.timescale = template.timescale;
                    if (frag.hasOwnProperty("t")) {
                        seg.startTime = frag.t;
                        time = frag.t;
                    } else {
                        seg.startTime = time;
                    }

                    seg.duration = frag.d;

                    if (template.hasOwnProperty("startNumber")) {
                        tIdx = template.startNumber + count;
                    } else {
                        tIdx = count;
                    }

                    url = template.media;
                    url = replaceNumberForTemplate(url, tIdx);
                    url = replaceTimeForTemplate(url, seg.startTime);
                    seg.media = url;

                    segments.push(seg);

                    time += seg.duration;
                    count += 1;
                }
            }

            return Q.when(segments);
        },

        getSegmentsFromList = function (list) {
            var segments = [],
                i,
                len,
                seg,
                s;

            for (i = 0, len = list.SegmentURL_asArray.length; i < len; i += 1) {
                s = list.SegmentURL_asArray[i];

                seg = new Dash.vo.Segment();
                seg.media = s.media;
                seg.mediaRange = s.mediaRange;
                seg.index = s.index;
                seg.indexRange = s.indexRange;

                seg.timescale = list.timescale;
                seg.duration = list.duration;
                seg.startTime = i * list.duration;

                segments.push(seg);
            }

            return Q.when(segments);
        },

        getSegmentsFromSource = function (representation) {
            var url = representation.BaseURL,
                range = null;

            if (representation.hasOwnProperty("SegmentBase")) {
                if (representation.SegmentBase.hasOwnProperty("indexRange")) {
                    range = representation.SegmentBase.indexRange;
                }
            }

            return this.baseURLExt.loadSegments(url, range);
        },

        getSegments = function (representation) {
            var segmentPromise;

            // We don't need a list of segments in this case.
            if (representation.hasOwnProperty("SegmentTemplate") && !representation.SegmentTemplate.hasOwnProperty("SegmentTimeline")) {
                segmentPromise = Q.when(null);
            } else {
                // Already figure out the segments.
                if (representation.hasOwnProperty("segments") && representation.segments !== null) {
                    segmentPromise = Q.when(representation.segments);
                } else {
                    if (representation.hasOwnProperty("SegmentTemplate") && representation.SegmentTemplate.hasOwnProperty("SegmentTimeline")) {
                        segmentPromise = getSegmentsFromTimeline.call(this, representation.SegmentTemplate, representation.SegmentTemplate.SegmentTimeline);
                    } else if (representation.hasOwnProperty("SegmentList")) {
                        segmentPromise = getSegmentsFromList.call(this, representation.SegmentList);
                    } else {
                        segmentPromise = getSegmentsFromSource.call(this, representation);
                    }
                }
            }

            return segmentPromise;
        },

        getIndexForSegments = function (time, segments) {
            var idx = -1,
                frag,
                ft;

            if (segments) {
                idx = 0;
                ft = 0;
                frag = null;

                while (ft <= time && (idx + 1) < segments.length) {
                    frag = segments[idx];
                    ft += frag.duration / frag.timescale;
                    idx += 1;
                }
                idx -= 1;
            }

            return (function () { return Q.when(idx); }());
        },

        getIndexForTemplate = function (time, template) {
            var idx = -1,
                fDuration,
                fTimescale = 1,
                dur;

            if (template.hasOwnProperty("duration")) {
                fDuration = template.duration;
            } else {
                throw "Expected 'duration' attribute on SegmentTemplate!";
            }

            // default to 1 if not present
            if (template.hasOwnProperty("timescale")) {
                fTimescale = template.timescale;
            }

            dur = (fDuration / fTimescale);
            idx = Math.floor(time / dur);

            return (function () { return Q.when(idx); }());
        },

        getRequestForTemplate = function (index, template, representation) {
            var request = new MediaPlayer.vo.SegmentRequest(),
                url,
                tIdx,
                time;

            if (template.hasOwnProperty("startNumber")) {
                tIdx = template.startNumber + index;
            } else {
                tIdx = index;
            }

            time = (template.duration * index);
            if (template.hasOwnProperty("timescale")) {
                time = time / template.timescale;
            }

            url = template.media;

            url = replaceNumberForTemplate(url, tIdx);
            url = replaceTimeForTemplate(url, time);
            url = replaceBandwidthForTemplate(url, representation.bandwidth);
            url = replaceIDForTemplate(url, representation.id);

            request.streamType = type;
            request.type = "Media Segment";
            request.url = getRequestUrl(url, representation.BaseURL);
            request.duration = template.duration / template.timescale;
            request.timescale = template.timescale;
            request.startTime = (tIdx * template.duration) / template.timescale;

            return (function () { return Q.when(request); }());
        },

        getRequestForSegment = function (index, segment, representation) {
            var request = new MediaPlayer.vo.SegmentRequest(),
                url;

            url = getRequestUrl(segment.media, representation.BaseURL);
            url = replaceNumberForTemplate(url, index);
            url = replaceTimeForTemplate(url, segment.startTime);
            url = replaceBandwidthForTemplate(url, representation.bandwidth);
            url = replaceIDForTemplate(url, representation.id);

            request.streamType = type;
            request.type = "Media Segment";
            request.url = url;
            request.range = segment.mediaRange;
            request.startTime = segment.startTime / segment.timescale;
            request.duration = segment.duration / segment.timescale;
            request.timescale = segment.timescale;

            return (function () { return Q.when(request); }());
        },

        getForTime = function (time, quality, data) {
            var deferred,
                representation = getRepresentationForQuality(quality, data),
                request,
                segment,
                usingTemplate = false,
                self = this;

            self.debug.log("Getting the request for time: " + time);

            deferred = Q.defer();

            getSegments.call(self, representation).then(
                function (segments) {
                    var segmentsPromise;

                    self.debug.log("Got segments.");
                    self.debug.log(segments);
                    // There's no segments so we *must* have a SegmentTemplate.
                    if (segments === null) {
                        if (!representation.hasOwnProperty("SegmentTemplate")) {
                            throw "Expected SegmentTemplate!";
                        }
                        usingTemplate = true;
                        self.debug.log("No segments found, so we must be using a SegmentTemplate.");
                        segmentsPromise = getIndexForTemplate.call(self, time, representation.SegmentTemplate);
                    } else {
                        self.debug.log("Got a list of segments, so dig deeper.");
                        representation.segments = segments;
                        usingTemplate = false;
                        segmentsPromise = getIndexForSegments.call(self, time, segments);
                    }
                    return segmentsPromise;
                }
            ).then(
                function (newIndex) {
                    self.debug.log("Index for time " + time + " is " + newIndex);
                    index = newIndex;

                    return isMediaFinished.call(self, representation);
                }
            ).then(
                function (finished) {
                    var requestPromise = null;

                    self.debug.log("Stream finished? " + finished);
                    if (finished) {
                        request = new MediaPlayer.vo.SegmentRequest();
                        request.action = request.ACTION_COMPLETE;
                        self.debug.log("Signal complete.");
                        self.debug.log(request);
                        deferred.resolve(request);
                    } else {
                        if (usingTemplate) {
                            requestPromise = getRequestForTemplate.call(self, index, representation.SegmentTemplate, representation);
                        } else {
                            segment = representation.segments[index];
                            requestPromise = getRequestForSegment.call(self, index, segment, representation);
                        }
                    }

                    return requestPromise;
                }
            ).then(
                function (request) {
                    self.debug.log("Got a request.");
                    self.debug.log(request);
                    deferred.resolve(request);
                }
            );

            return deferred.promise;
        },

        getNext = function (quality, data) {
            var deferred,
                representation = getRepresentationForQuality(quality, data),
                request,
                segment,
                self = this;

            self.debug.log("Getting the next request.");

            if (index === -1) {
                throw "You must call getSegmentRequestForTime first.";
            }

            index += 1;
            self.debug.log("New index: " + index);

            deferred = Q.defer();

            isMediaFinished.call(self, representation).then(
                function (finished) {
                    self.debug.log("Stream finished? " + finished);
                    if (finished) {
                        request = new MediaPlayer.vo.SegmentRequest();
                        request.action = request.ACTION_COMPLETE;
                        self.debug.log("Signal complete.");
                        self.debug.log(request);
                        deferred.resolve(request);
                    } else {
                        getSegments.call(self, representation).then(
                            function (segments) {
                                var segmentsPromise;

                                self.debug.log("Got segments.");
                                self.debug.log(segments);
                                // There's no segments so we *must* have a SegmentTemplate.
                                if (segments === null) {
                                    if (!representation.hasOwnProperty("SegmentTemplate")) {
                                        throw "Expected SegmentTemplate!";
                                    }
                                    self.debug.log("No segments found, so we must be using a SegmentTemplate.");
                                    segmentsPromise = getRequestForTemplate.call(self, index, representation.SegmentTemplate, representation);
                                } else {
                                    representation.segments = segments;
                                    segment = representation.segments[index];
                                    segmentsPromise = getRequestForSegment.call(self, index, segment, representation);
                                }
                                return segmentsPromise;
                            }
                        ).then(
                            function (request) {
                                self.debug.log("Got a request.");
                                self.debug.log(request);
                                deferred.resolve(request);
                            }
                        );
                    }
                }
            );

            return deferred.promise;
        };

    return {
        debug: undefined,
        baseURLExt: undefined,

        getType: function () {
            return type;
        },

        setType : function (value) {
            type = value;
        },

        getIsLive: function () {
            return isLive;
        },
        setIsLive: function (value) {
            isLive = value;
        },

        getDuration: function () {
            return duration;
        },
        setDuration: function (value) {
            duration = value;
        },

        getInitRequest: getInit,
        getSegmentRequestForTime: getForTime,
        getNextSegmentRequest: getNext
    };
};

Dash.dependencies.DashHandler.prototype = {
    constructor: Dash.dependencies.DashHandler
};