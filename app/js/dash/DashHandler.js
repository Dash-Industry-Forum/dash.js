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
Dash.dependencies.DashHandler = function () {
    "use strict";

    var index = -1,
        isDynamic,
        type,

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

        getNumberForSegment = function(segment, segmentIndex) {
            return segment.representation.startNumber + segmentIndex;
        },

        getRequestUrl = function (destination, representation) {
            var baseURL = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].
                    AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].BaseURL,
                url;

            if (destination === baseURL) {
                url = destination;
            } else if (destination.indexOf("http://") !== -1) {
                url = destination;
            } else {
                url = baseURL + destination;
            }

            return url;
        },

        generateInitRequest = function(representation, streamType) {
            var self = this,
                period,
                request = new MediaPlayer.vo.SegmentRequest(),
                presentationStartTime;

            period = representation.adaptation.period;

            request.streamType = streamType;
            request.type = "Initialization Segment";
            request.url = getRequestUrl(representation.initialization, representation);
            request.range = representation.range;
            presentationStartTime = period.start;
            request.availabilityStartTime = self.timelineConverter.calcAvailabilityStartTimeFromPresentationTime(presentationStartTime, representation.adaptation.period.mpd, isDynamic);
            request.availabilityEndTime = self.timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationStartTime + period.duration, period.mpd, isDynamic);
            request.quality = representation.index;

            return request;
        },

        getInit = function (representation) {
            var deferred = Q.defer(),
                request = null,
                url = null,
                self = this;

            if (!representation) {
                return Q.reject("no represenation");
            }

            self.debug.log("Getting the initialization request.");

            if (representation.initialization) {
                self.debug.log("Got an initialization.");
                request = generateInitRequest.call(self, representation, type);
                deferred.resolve(request);
            } else {
                // Go out and find the initialization.
                url = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].
                    AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].BaseURL;
                self.baseURLExt.loadInitialization(url).then(
                    function (theRange) {
                        self.debug.log("Got an initialization.");
                        representation.range = theRange;
                        representation.initialization = url;
                        request = generateInitRequest.call(self, representation, type);
                        deferred.resolve(request);
                    },
                    function (httprequest) {
                        deferred.reject(httprequest);
                    }
                );
            }

            return deferred.promise;
        },

        isMediaFinished = function (representation) { // TODO
            var sDuration,
                period = representation.adaptation.period,
                isFinished = false,
                seg,
                fTime;

            this.debug.log("Checking for stream end...");
            if (isDynamic) {
                this.debug.log("Live never ends! (TODO)");
                // TODO : Check the contents of the last box to signal end.
                isFinished = false;
            } else {
                if (index < representation.segments.length) {
                    seg = representation.segments[index];
                    fTime = seg.presentationStartTime - period.start;
                    sDuration = representation.adaptation.period.duration;
                    this.debug.log(representation.segmentInfoType + ": " + fTime + " / " + sDuration);
                    isFinished = (fTime >= sDuration);
                } else {
                    isFinished = true;
                }
            }

            return Q.when(isFinished);
        },

        getIndexBasedSegment = function (representation, index) {
            var self = this,
                seg,
                duration,
                presentationStartTime,
                presentationEndTime;

            duration = representation.segmentDuration;
            presentationStartTime = representation.adaptation.period.start + (index * duration);
            presentationEndTime = presentationStartTime + duration;

            seg = new Dash.vo.Segment();

            seg.representation = representation;
            seg.duration = duration;
            seg.presentationStartTime = presentationStartTime;

            seg.mediaStartTime = self.timelineConverter.calcMediaTimeFromPresentationTime(seg.presentationStartTime, representation);

            seg.availabilityStartTime = self.timelineConverter.calcAvailabilityStartTimeFromPresentationTime(seg.presentationStartTime, representation.adaptation.period.mpd, isDynamic);
            seg.availabilityEndTime = self.timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationEndTime, representation.adaptation.period.mpd, isDynamic);

            // at this wall clock time, the video element currentTime should be seg.presentationStartTime
            seg.wallStartTime = self.timelineConverter.calcWallTimeForSegment(seg, isDynamic);

            seg.replacementNumber = getNumberForSegment(seg, index);

            return seg;
        },

        getSegmentsFromTimeline = function (representation) {
            var self = this,
                template = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].
                    AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].SegmentTemplate,
                timeline = template.SegmentTimeline,
                segments = [],
                fragments,
                frag,
                i,
                len,
                j,
                repeat,
                seg,
                time = 0,
                count = 0,
                fTimescale;

            fTimescale = representation.timescale;

            fragments = timeline.S_asArray;
            for (i = 0, len = fragments.length; i < len; i += 1) {
                frag = fragments[i];
                repeat = 0;
                if (frag.hasOwnProperty("r")) {
                    repeat = frag.r;
                }

                //This is a special case: "A negative value of the @r attribute of the S element indicates that the duration indicated in @d attribute repeats until the start of the next S element, the end of the Period or until the 
                // next MPD update."
                if(repeat < 0)
                    repeat = (representation.adaptation.period.duration - time/fTimescale)/(frag.d/fTimescale) - 1;

                for (j = 0; j <= repeat; j += 1) {

                    //For a repeated S element, t belongs only to the first segment
                    if (j === 0 && frag.hasOwnProperty("t")) {
                        time = frag.t;
                    }

                    seg = getTimeBasedSegment.call(
                        self,
                        representation,
                        time,
                        frag.d,
                        fTimescale,
                        template.media,
                        frag.mediaRange,
                        count);

                    segments.push(seg);
                    seg = null;
                    time += frag.d;
                    count += 1;
                }
            }

            if (isDynamic && isNaN(representation.adaptation.period.liveEdge)) {
                //For SegmentTimeline the last segment in the timeline is always the live edge
                representation.adaptation.period.liveEdge = segments[count-1].presentationStartTime + segments[count-1].duration;
            }

            return Q.when(segments);
        },

        getSegmentsFromTemplate = function (representation) {
            var segments = [],
                template = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].
                    AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].SegmentTemplate,
                i,
                len,
                seg = null,
                start,
                url = null;

            start = representation.startNumber;

            len = representation.adaptation.period.duration / representation.segmentDuration;

            for (i = 0;i < len; i += 1) {

                seg = getIndexBasedSegment.call(
                    this,
                    representation,
                    i);

                seg.replacementTime = (start + i - 1) * representation.segmentDuration;
                url = template.media;
                url = replaceNumberForTemplate(url, seg.replacementNumber);
                url = replaceTimeForTemplate(url, seg.replacementTime);
                seg.media = url;

                segments.push(seg);
                seg = null;
            }

            return Q.when(segments);
        },

        getTimeBasedSegment = function(representation, time, duration, fTimescale, url, range, index) {
            var self = this,
                scaledTime = time / fTimescale,
                scaledDuration = duration / fTimescale,
                presentationStartTime,
                presentationEndTime,
                seg;

            presentationStartTime = self.timelineConverter.calcPresentationTimeFromMediaTime(scaledTime, representation);
            presentationEndTime = presentationStartTime + scaledDuration;

            seg = new Dash.vo.Segment();

            seg.representation = representation;
            seg.duration = scaledDuration;
            seg.mediaStartTime = scaledTime;

            seg.presentationStartTime = presentationStartTime;

            seg.availabilityStartTime = self.timelineConverter.calcAvailabilityStartTimeFromPresentationTime(seg.presentationStartTime, representation.adaptation.period.mpd, isDynamic);
            seg.availabilityEndTime = self.timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationEndTime, representation.adaptation.period.mpd, isDynamic);

            // at this wall clock time, the video element currentTime should be seg.presentationStartTime
            seg.wallStartTime = self.timelineConverter.calcWallTimeForSegment(seg, isDynamic);

            seg.replacementTime = time;

            seg.replacementNumber = getNumberForSegment(seg, index);

            url = replaceNumberForTemplate(url, seg.replacementNumber);
            url = replaceTimeForTemplate(url, seg.replacementTime);
            seg.media = url;
            seg.mediaRange = range;

            return seg;
        },

        getSegmentsFromList = function (representation) {
            var segments = [],
                list = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].
                    AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].SegmentList,
                i,
                len,
                seg,
                s,
                start;

            start = representation.startNumber;

            for (i = 0, len = list.SegmentURL_asArray.length; i < len; i += 1) {
                s = list.SegmentURL_asArray[i];

                seg = getIndexBasedSegment.call(
                    this,
                    representation,
                    i);

                seg.replacementTime = (start + i - 1) * representation.segmentDuration;
                seg.media = s.media;
                seg.mediaRange = s.mediaRange;
                seg.index = s.index;
                seg.indexRange = s.indexRange;

                segments.push(seg);
                seg = null;
            }

            return Q.when(segments);
        },

        getSegmentsFromSource = function (representation) {
            var self = this,
                baseURL = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].
                    AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].BaseURL,
                deferred = Q.defer(),
                segments = [],
                count = 0,
                range = null,
                s,
                i,
                len,
                seg;

            if (representation.indexRange) {
                range = representation.indexRange;
            }

            this.baseURLExt.loadSegments(baseURL, range).then(
                function(fragments) {
                    for (i = 0, len = fragments.length; i < len; i+=1) {
                        s = fragments[i];

                        seg = getTimeBasedSegment.call(
                            self,
                            representation,
                            s.startTime,
                            s.duration,
                            s.timescale,
                            s.media,
                            s.mediaRange,
                            count);

                        segments.push(seg);
                        seg = null;
                        count += 1;
                    }
                    deferred.resolve(segments);
                }
            );

            if (isDynamic && isNaN(representation.adaptation.period.liveEdge)) {
                //For SegmentTimeline the last segment in the timeline is always the live edge
                representation.adaptation.period.liveEdge = segments[count-1].presentationStartTime + segments[count-1].duration;
            }

            return deferred.promise;
        },

        getSegments = function (representation) {
            var segmentPromise,
                self = this;

                // Already figure out the segments.
            if (representation.segments) {
                segmentPromise = Q.when(representation.segments);
            } else {
                if (representation.segmentInfoType === "SegmentTimeline") {
                    segmentPromise = getSegmentsFromTimeline.call(self, representation);
                } else if (representation.segmentInfoType === "SegmentTemplate") {
                    segmentPromise = getSegmentsFromTemplate.call(self, representation);
                } else if (representation.segmentInfoType === "SegmentList") {
                    segmentPromise = getSegmentsFromList.call(self, representation);
                } else {
                    segmentPromise = getSegmentsFromSource.call(self, representation);
                }
            }

            return segmentPromise;
        },

        getIndexForSegments = function (time, segments) {
            var segmentLastIdx = segments.length - 1,
                idx = -1,
                frag,
                ft,
                fd,
                i;

            if (segments && segments.length > 0) {
                for (i = segmentLastIdx; i >= 0; i--) {
                    frag = segments[i];
                    ft = frag.presentationStartTime;
                    fd = frag.duration;
                    if ((time + Dash.dependencies.DashHandler.EPSILON) >= ft &&
                        (time - Dash.dependencies.DashHandler.EPSILON) <= (ft + fd)) {
                        idx = i;
                        break;
                    } else if (idx === -1 && (time - Dash.dependencies.DashHandler.EPSILON) > (ft + fd)) {
                        // time is past the end
                        idx  = i + 1;
                    }
                }
            }

            if (idx === -1) {
                console.log("Couldn't figure out a time!");
                console.log("Time: " + time);
                console.log(segments);
            }

            // TODO : This is horrible.
            // Temp fix for SegmentTimeline refreshes.
            //if (idx === -1) {
            //    idx = 0;
            //}

            /*
            if (segments && segments.length > 0) {
                idx = 0;
                ft = segments[0].startTime / segments[0].timescale;
                frag = null;

                while (ft <= time && (idx + 1) < segments.length) {
                    frag = segments[idx];
                    ft += frag.duration / frag.timescale;
                    idx += 1;
                }
                idx -= 1;
            }
            */

            return Q.when(idx);
        },

        getRequestForSegment = function (segment) {
            if (segment === null || segment === undefined) {
                return Q.when(null);
            }

            var request = new MediaPlayer.vo.SegmentRequest(),
                representation = segment.representation,
                bandwidth = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].
                    AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].bandwidth,
                url;

            url = getRequestUrl(segment.media, representation);
            url = replaceNumberForTemplate(url, segment.replacementNumber);
            url = replaceTimeForTemplate(url, segment.replacementTime);
            url = replaceBandwidthForTemplate(url, bandwidth);
            url = replaceIDForTemplate(url, representation.id);

            request.streamType = type;
            request.type = "Media Segment";
            request.url = url;
            request.range = segment.mediaRange;
            request.startTime = segment.presentationStartTime;
            request.duration = segment.duration;
            request.timescale = representation.timescale;
            request.availabilityStartTime = segment.availabilityStartTime;
            request.availabilityEndTime = segment.availabilityEndTime;
            request.wallStartTime = segment.wallStartTime;
            request.quality = representation.index;
            request.index = index;

            return Q.when(request);
        },

        getForTime = function (representation, time) {
            var deferred,
                request,
                segment,
                self = this;

            if (!representation) {
                return Q.reject("no represenation");
            }

            self.debug.log("Getting the request for time: " + time);

            deferred = Q.defer();

            getSegments.call(self, representation).then(
                function (segments) {
                    var segmentsPromise;

                    self.debug.log("Got segments.");
                    self.debug.log(segments);
                        self.debug.log("Got a list of segments, so dig deeper.");
                        representation.segments = segments;
                        segmentsPromise = getIndexForSegments.call(self, time, segments);
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
                        request.index = index;
                        self.debug.log("Signal complete.");
                        self.debug.log(request);
                        deferred.resolve(request);
                    } else {
                            segment = representation.segments[index];
                        requestPromise = getRequestForSegment.call(self, segment);
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

        getNext = function (representation) {
            var deferred,
                request,
                segment,
                self = this;

            if (!representation) {
                return Q.reject("no represenation");
            }

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
                        request.index = index;
                        self.debug.log("Signal complete.");
                        self.debug.log(request);
                        deferred.resolve(request);
                    } else {
                        getSegments.call(self, representation).then(
                            function (segments) {
                                var segmentsPromise;

                                self.debug.log("Got segments.");
                                self.debug.log(segments);
                                    representation.segments = segments;
                                    segment = representation.segments[index];
                                segmentsPromise = getRequestForSegment.call(self, segment);
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
        },

        getSegmentCountForDuration = function (representation, requiredDuration, bufferedDuration) {
            var self = this,
                remainingDuration = Math.max(requiredDuration - bufferedDuration, 0),
                deferred = Q.defer(),
                segmentDuration,
                segmentCount = 0;

            if (!representation) {
                return Q.reject("no represenation");
            }

            getSegments.call(self, representation).then(
                function (segments) {
                    segmentDuration = segments[0].duration;
                    segmentCount = Math.ceil(remainingDuration/segmentDuration);
                    deferred.resolve(segmentCount);
                },
                function () {
                    deferred.resolve(0);
                }
            );

            return deferred.promise;
        },

        getCurrentTime = function (representation) {
            var self = this,
                time,
                bufferedIndex,
                useLast,
                deferred = Q.defer();

            if (!representation) {
                return Q.reject("no represenation");
            }

            bufferedIndex = index;
            if (bufferedIndex < 0) {
                useLast = isDynamic;
                bufferedIndex = 0;
            }

            getSegments.call(self, representation).then(
                function (segments) {
                    if (useLast || bufferedIndex >= segments.length) {
                        bufferedIndex = segments.length - 1;
                    }

                    time = segments[bufferedIndex].presentationStartTime;

                    deferred.resolve(time);
                },
                function () {
                    deferred.reject();
                }
            );

            return deferred.promise;
        };

    return {
        debug: undefined,
        baseURLExt: undefined,
        manifestModel: undefined,
        manifestExt:undefined,
        errHandler: undefined,
        timelineConverter: undefined,

        getType: function () {
            return type;
        },

        setType : function (value) {
            type = value;
        },

        getIsDynamic: function () {
            return isDynamic;
        },
        setIsDynamic: function (value) {
            isDynamic = value;
        },

        getInitRequest: getInit,
        getSegmentRequestForTime: getForTime,
        getNextSegmentRequest: getNext,
        getCurrentTime: getCurrentTime,
        getSegmentCountForDuration: getSegmentCountForDuration
    };
};

Dash.dependencies.DashHandler.EPSILON = 0.003;

Dash.dependencies.DashHandler.prototype = {
    constructor: Dash.dependencies.DashHandler
};
