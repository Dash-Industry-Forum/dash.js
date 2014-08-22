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
        requestedTime,
        isDynamic,
        type,
        offset = null,

        zeroPadToLength = function (numStr, minStrLength) {
            while (numStr.length < minStrLength) {
                numStr = "0" + numStr;
            }

            return numStr;
        },

        replaceTokenForTemplate = function (url, token, value) {

            var startPos = 0,
                endPos = 0,
                tokenLen = token.length,
                formatTag = "%0",
                formatTagLen = formatTag.length,
                formatTagPos,
                specifier,
                width,
                paddedValue;

            // keep looping round until all instances of <token> have been
            // replaced. once that has happened, startPos below will be -1
            // and the completed url will be returned.
            while (true) {

                // check if there is a valid $<token>...$ identifier
                // if not, return the url as is.
                startPos = url.indexOf("$" + token);
                if (startPos < 0) {
                    return url;
                }

                // the next '$' must be the end of the identifer
                // if there isn't one, return the url as is.
                endPos = url.indexOf("$", startPos + tokenLen);
                if (endPos < 0) {
                    return url;
                }

                // now see if there is an additional format tag suffixed to
                // the identifier within the enclosing '$' characters
                formatTagPos = url.indexOf(formatTag, startPos + tokenLen);
                if (formatTagPos > startPos && formatTagPos < endPos) {

                    specifier = url.charAt(endPos - 1);
                    width = parseInt(url.substring(formatTagPos + formatTagLen, endPos - 1), 10);

                    // support the minimum specifiers required by IEEE 1003.1
                    // (d, i , o, u, x, and X) for completeness
                    switch (specifier) {
                    // treat all int types as uint,
                    // hence deliberate fallthrough
                    case 'd':
                    case 'i':
                    case 'u':
                        paddedValue = zeroPadToLength(value.toString(), width);
                        break;
                    case 'x':
                        paddedValue = zeroPadToLength(value.toString(16), width);
                        break;
                    case 'X':
                        paddedValue = zeroPadToLength(value.toString(16), width).toUpperCase();
                        break;
                    case 'o':
                        paddedValue = zeroPadToLength(value.toString(8), width);
                        break;
                    default:
                        this.debug.log("Unsupported/invalid IEEE 1003.1 format identifier string in URL");
                        return url;
                    }
                } else {
                    paddedValue = value;
                }

                url = url.substring(0, startPos) + paddedValue + url.substring(endPos + 1);
            }
        },

        unescapeDollarsInTemplate = function (url) {
            return url.split("$$").join("$");
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

            //self.debug.log("Getting the initialization request.");

            if (representation.initialization) {
                //self.debug.log("Got an initialization.");
                request = generateInitRequest.call(self, representation, type);
                deferred.resolve(request);
            } else {
                // Go out and find the initialization.
                url = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].
                    AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].BaseURL;
                self.baseURLExt.loadInitialization(url).then(
                    function (theRange) {
                        //self.debug.log("Got an initialization.");
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

            if(offset === null || offset > representation.segments[0].availabilityIdx) {
                offset = representation.segments[0].availabilityIdx;
            }

            //this.debug.log("Checking for stream end...");
            if (isDynamic) {
                //this.debug.log("Live never ends! (TODO)");
                // TODO : Check the contents of the last box to signal end.
                isFinished = false;
            } else {
                if (index < 0) {
                    isFinished = false;
                } else if (index < representation.availableSegmentsNumber + offset) {
                    seg = getSegmentByIndex(index, representation);

                    if (seg) {
                        fTime = seg.presentationStartTime - period.start;
                        sDuration = representation.adaptation.period.duration;
                        this.debug.log(representation.segmentInfoType + ": " + fTime + " / " + sDuration);
                        isFinished = (fTime >= sDuration);
                    }
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
                idx,
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

            idx = Math.max(Math.floor((presentationStartTime - representation.adaptation.period.start) / duration), 0);
            seg.replacementNumber = getNumberForSegment(seg, idx);
            seg.availabilityIdx = index;

            return seg;
        },

        getSegmentsFromTimeline = function (representation) {
            var self = this,
                template = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].
                    AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].SegmentTemplate,
                timeline = template.SegmentTimeline,
                isAvailableSegmentNumberCalculated = representation.availableSegmentsNumber > 0,
                maxSegmentsAhead = 10,
                segments = [],
                fragments,
                frag,
                i,
                len,
                j,
                repeat,
                repeatEndTime,
                nextFrag,
                time = 0,
                availabilityIdx = -1,
                calculatedRange,
                hasEnoughSegments,
                requiredMediaTime,
                startIdx,
                endIdx,
                fTimescale,
                createSegment = function(s) {
                    return getTimeBasedSegment.call(
                        self,
                        representation,
                        time,
                        s.d,
                        fTimescale,
                        template.media,
                        s.mediaRange,
                        availabilityIdx);
                };

            fTimescale = representation.timescale;

            fragments = timeline.S_asArray;

            calculatedRange = decideSegmentListRangeForTimeline.call(self, representation);

            // if calculatedRange exists we should generate segments that belong to this range.
            // Otherwise generate maxSegmentsAhead segments ahead of the requested time
            if (calculatedRange) {
                startIdx = calculatedRange.start;
                endIdx = calculatedRange.end;
            } else {
                requiredMediaTime = self.timelineConverter.calcMediaTimeFromPresentationTime(requestedTime || 0, representation);
            }

            for (i = 0, len = fragments.length; i < len; i += 1) {
                frag = fragments[i];
                repeat = 0;
                if (frag.hasOwnProperty("r")) {
                    repeat = frag.r;
                }

                //For a repeated S element, t belongs only to the first segment
                if (frag.hasOwnProperty("t")) {
                    time = frag.t;
                }

                //This is a special case: "A negative value of the @r attribute of the S element indicates that the duration indicated in @d attribute repeats until the start of the next S element, the end of the Period or until the 
                // next MPD update."
                if (repeat < 0) {
                    nextFrag = fragments[i+1];
                    repeatEndTime = (nextFrag && nextFrag.hasOwnProperty("t")) ? (nextFrag.t / fTimescale) : representation.adaptation.period.duration;
                    repeat = Math.ceil((repeatEndTime - time/fTimescale)/(frag.d/fTimescale)) - 1;
                }

                // if we have enough segments in the list, but we have not calculated the total number of the segments yet we
                // should continue the loop and calc the number. Once it is calculated, we can break the loop.
                if (hasEnoughSegments) {
                    if (isAvailableSegmentNumberCalculated) break;
                    availabilityIdx += repeat + 1;
                    continue;
                }

                for (j = 0; j <= repeat; j += 1) {
                    availabilityIdx += 1;

                    if (calculatedRange) {
                        if (availabilityIdx > endIdx) {
                            hasEnoughSegments = true;
                            if (isAvailableSegmentNumberCalculated) break;
                            continue;
                        }

                        if (availabilityIdx >= startIdx) {
                            segments.push(createSegment.call(self, frag));
                        }
                    } else {
                        if (segments.length > maxSegmentsAhead) {
                            hasEnoughSegments = true;
                            if (isAvailableSegmentNumberCalculated) break;
                            continue;
                        }

                        if (time/fTimescale >= (requiredMediaTime - (frag.d / fTimescale))) {
                            segments.push(createSegment.call(self, frag));
                        }
                    }

                    time += frag.d;
                }
            }

            if (!isAvailableSegmentNumberCalculated) {
                var availabilityStartTime,
                    availabilityEndTime,
                    f = fragments[0];

                availabilityStartTime = (f.t === undefined) ? 0 : self.timelineConverter.calcPresentationTimeFromMediaTime(f.t / fTimescale, representation);
                availabilityEndTime = self.timelineConverter.calcPresentationTimeFromMediaTime((time - frag.d) / fTimescale, representation);
                representation.segmentAvailabilityRange = {start: availabilityStartTime, end: availabilityEndTime};
                representation.availableSegmentsNumber = availabilityIdx + 1;
            }

            return Q.when(segments);
        },

        getSegmentsFromTemplate = function (representation) {
            var segments = [],
                self = this,
                deferred = Q.defer(),
                template = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].
                    AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].SegmentTemplate,
                duration = representation.segmentDuration,
                segmentRange = null,
                idx = Math.floor(representation.adaptation.period.start / duration),
                i,
                startIdx,
                endIdx,
                seg = null,
                start,
                url = null;

            start = representation.startNumber;

            waitForAvailabilityWindow.call(self, representation).then(
                function(availabilityWindow) {
                    representation.segmentAvailabilityRange = availabilityWindow;
                    segmentRange = decideSegmentListRangeForTemplate.call(self, representation);

                    startIdx = segmentRange.start;
                    endIdx = segmentRange.end;

                    for (i = startIdx;i <= endIdx; i += 1) {

                        seg = getIndexBasedSegment.call(
                            self,
                            representation,
                            i - idx);

                        seg.replacementTime = (start + i - 1) * representation.segmentDuration;
                        url = template.media;
                        url = replaceTokenForTemplate(url, "Number", seg.replacementNumber);
                        url = replaceTokenForTemplate(url, "Time", seg.replacementTime);
                        seg.media = url;

                        segments.push(seg);
                        seg = null;
                    }

                    representation.availableSegmentsNumber = Math.ceil((availabilityWindow.end - availabilityWindow.start) / duration);

                    deferred.resolve(segments);
                }
            );

            return deferred.promise;
        },

        decideSegmentListRangeForTemplate = function(representation) {
            var self = this,
                periodStart = representation.adaptation.period.start,
                duration = representation.segmentDuration,
                minBufferTime = representation.adaptation.period.mpd.manifest.minBufferTime,
                availabilityWindow = representation.segmentAvailabilityRange,
                originAvailabilityTime = NaN,
                originSegment = null,
                currentSegmentList = representation.segments,
                availabilityLowerLimit = 2 * duration,
                availabilityUpperLimit = Math.max(2 * minBufferTime, 10 * duration),
                start,
                end,
                range;

            if (!availabilityWindow) {
                availabilityWindow = self.timelineConverter.calcSegmentAvailabilityRange(representation, isDynamic);
            }

            if (isDynamic && !representation.adaptation.period.mpd.isClientServerTimeSyncCompleted) {
                start = Math.floor(availabilityWindow.start / duration);
                end = Math.floor(availabilityWindow.end / duration);
                range = {start: start, end: end};
                return range;
            }

            // if segments exist we should try to find the latest buffered time, which is the presentation time of the
            // segment for the current index
            if (currentSegmentList) {
                originSegment = getSegmentByIndex(index, representation);
                originAvailabilityTime = originSegment ? (originSegment.presentationStartTime - periodStart) : (index > 0 ? (index * duration) : (requestedTime - periodStart) || (currentSegmentList[0].presentationStartTime - periodStart));
            } else {
                // If no segments exist, but index > 0, it means that we switch to the other representation, so
                // we should proceed from this time.
                // Otherwise we should start from the beginning for static mpds or from the end (live edge) for dynamic mpds
                originAvailabilityTime = (index > 0) ? (index * duration) : (isDynamic ? availabilityWindow.end : availabilityWindow.start);
            }

            // segment list should not be out of the availability window range
            start = Math.floor(Math.max(originAvailabilityTime - availabilityLowerLimit, availabilityWindow.start) / duration);
            end = Math.floor(Math.min(start + availabilityUpperLimit / duration, availabilityWindow.end / duration));

            range = {start: start, end: end};

            return range;
        },

        decideSegmentListRangeForTimeline = function(representation) {
            var originAvailabilityIdx = NaN,
                currentSegmentList = representation.segments,
                availabilityLowerLimit = 2,
                availabilityUpperLimit = 10,
                firstIdx = 0,
                lastIdx = Number.POSITIVE_INFINITY,
                start,
                end,
                range;

            if (isDynamic && !representation.adaptation.period.mpd.isClientServerTimeSyncCompleted) {
                range = {start: firstIdx, end: lastIdx};
                return range;
            }

            if(!isDynamic && requestedTime) return null;

            // if segments exist use the current index as an origin index for a new range
            if (currentSegmentList) {
                // if the index is negative we can't calculate the range right now
                if (index < 0) return null;
                originAvailabilityIdx = index;
            } else {
                // If no segments exist, but index > 0, it means that we switch to the other representation, so
                // we should proceed from this index.
                // Otherwise we should start from the beginning for static mpds or from the end (live edge) for dynamic mpds
                originAvailabilityIdx = (index > 0) ? index : (isDynamic ? lastIdx : firstIdx);
            }

            // segment list should not be out of the availability window range
            start = Math.max(originAvailabilityIdx - availabilityLowerLimit, firstIdx);
            end = Math.min(originAvailabilityIdx + availabilityUpperLimit, lastIdx);

            range = {start: start, end: end};

            return range;
        },

        waitForAvailabilityWindow = function(representation) {
            var self = this,
                deferred = Q.defer(),
                range,
                waitingTime,
                getRange = function() {
                    range = self.timelineConverter.calcSegmentAvailabilityRange(representation, isDynamic);

                    if (range.end > 0) {
                        deferred.resolve(range);
                    } else {
                        // range.end represents a time gap between the current wall-clock time and the availability time of the first segment.
                        // A negative value means that no segments are available yet, we should wait until segments become available
                        waitingTime = Math.abs(range.end) * 1000;
                        setTimeout(getRange, waitingTime);
                    }
                };

            getRange();

            return deferred.promise;
        },

        getTimeBasedSegment = function(representation, time, duration, fTimescale, url, range, index) {
            var self = this,
                scaledTime = time / fTimescale,
                scaledDuration = Math.min(duration / fTimescale, representation.adaptation.period.mpd.maxSegmentDuration),
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

            // For SegmentTimeline every segment is available at mpdLoadedTime
            seg.availabilityStartTime = representation.adaptation.period.mpd.manifest.mpdLoadedTime;
            seg.availabilityEndTime = self.timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationEndTime, representation.adaptation.period.mpd, isDynamic);

            // at this wall clock time, the video element currentTime should be seg.presentationStartTime
            seg.wallStartTime = self.timelineConverter.calcWallTimeForSegment(seg, isDynamic);

            seg.replacementTime = time;

            seg.replacementNumber = getNumberForSegment(seg, index);

            url = replaceTokenForTemplate(url, "Number", seg.replacementNumber);
            url = replaceTokenForTemplate(url, "Time", seg.replacementTime);
            seg.media = url;
            seg.mediaRange = range;
            seg.availabilityIdx = index;

            return seg;
        },

        getSegmentsFromList = function (representation) {
            var self = this,
                segments = [],
                deferred = Q.defer(),
                list = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].
                    AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].SegmentList,
                len = list.SegmentURL_asArray.length,
                i,
                seg,
                s,
                range,
                startIdx = 0,
                endIdx = list.SegmentURL_asArray.length,
                start;

            start = representation.startNumber;

            waitForAvailabilityWindow.call(self, representation).then(
                function(availabilityWindow) {
                    if (!isDynamic) {
                        range = decideSegmentListRangeForTemplate.call(self, representation);
                        startIdx = range.start;
                        endIdx = range.end;
                    }

                    for (i = startIdx; i < endIdx; i += 1) {
                        s = list.SegmentURL_asArray[i];

                        seg = getIndexBasedSegment.call(
                            self,
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
                    representation.segmentAvailabilityRange = availabilityWindow;
                    representation.availableSegmentsNumber = len;
                    deferred.resolve(segments);
            });

            return deferred.promise;
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

                    representation.segmentAvailabilityRange = {start: segments[0].presentationStartTime, end: segments[len - 1].presentationStartTime};
                    representation.availableSegmentsNumber = len;
                    deferred.resolve(segments);
                }
            );

            return deferred.promise;
        },

        getSegments = function (representation) {
            var segmentPromise,
                deferred = Q.defer(),
                self = this,
                lastIdx;

                // Already figure out the segments.
            if (!isSegmentListUpdateRequired.call(self, representation)) {
                return Q.when(representation.segments);
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

                Q.when(segmentPromise).then(
                    function (segments) {
                        representation.segments = segments;
                        lastIdx = segments.length - 1;
                        if (isDynamic && isNaN(representation.adaptation.period.liveEdge)) {
                            var metrics = self.metricsModel.getMetricsFor("stream"),
                                liveEdge = segments[lastIdx].presentationStartTime;
                            // the last segment is supposed to be a live edge
                            representation.adaptation.period.liveEdge = liveEdge;
                            self.metricsModel.updateManifestUpdateInfo(self.metricsExt.getCurrentManifestUpdate(metrics), {presentationStartTime: liveEdge});
                        }

                        deferred.resolve(segments);
                    }
                );
            }

            return deferred.promise;
        },

        updateSegmentList = function(representation) {
            var self = this,
                deferred = Q.defer();

            representation.segments = null;

            getSegments.call(self, representation).then(
                function(segments) {
                    representation.segments = segments;
                    deferred.resolve();
                }
            );

            return deferred.promise;
        },

        getIndexForSegments = function (time, representation) {
            var segments = representation.segments,
                segmentLastIdx = segments.length - 1,
                idx = -1,
                frag,
                ft,
                fd,
                i,
                self = this;

            if (segments && segments.length > 0) {
                for (i = segmentLastIdx; i >= 0; i--) {
                    frag = segments[i];
                    ft = frag.presentationStartTime;
                    fd = frag.duration;
                    if ((time + Dash.dependencies.DashHandler.EPSILON) >= ft &&
                        (time - Dash.dependencies.DashHandler.EPSILON) <= (ft + fd)) {
                        idx = frag.availabilityIdx;
                        break;
                    } else if (idx === -1 && (time - Dash.dependencies.DashHandler.EPSILON) > (ft + fd)) {
                        // time is past the end
                        idx  = isNaN(representation.segmentDuration) ? (frag.availabilityIdx + 1) : Math.floor((time - representation.adaptation.period.start) / representation.segmentDuration);
                    }
                }
            }

            if (idx === -1) {
                if (!isNaN(representation.segmentDuration)) {
                    idx = Math.floor((time - representation.adaptation.period.start) / representation.segmentDuration);
                } else {
                    self.debug.log("Couldn't figure out a time!");
                    self.debug.log("Time: " + time);
                    self.debug.log(segments);
                }
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

        getSegmentByIndex = function(index, representation) {
            if (!representation || !representation.segments) return null;

            var ln = representation.segments.length,
                seg,
                i;

            for (i = 0; i < ln; i += 1) {
                seg = representation.segments[i];

                if (seg.availabilityIdx === index) {
                    return seg;
                }
            }

            return null;
        },

        isSegmentListUpdateRequired = function(representation) {
            var updateRequired = false,
                segments = representation.segments,
                upperIdx,
                lowerIdx;

            if (!segments) {
                updateRequired = true;
            } else {
                lowerIdx = segments[0].availabilityIdx;
                upperIdx = segments[segments.length -1].availabilityIdx;
                updateRequired = (index < lowerIdx) || (index > upperIdx);
            }

            return updateRequired;
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
            url = replaceTokenForTemplate(url, "Number", segment.replacementNumber);
            url = replaceTokenForTemplate(url, "Time", segment.replacementTime);
            url = replaceTokenForTemplate(url, "Bandwidth", bandwidth);
            url = replaceIDForTemplate(url, representation.id);
            url = unescapeDollarsInTemplate(url);

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
            request.index = segment.availabilityIdx;

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

            requestedTime = time;

            self.debug.log("Getting the request for time: " + time);

            deferred = Q.defer();

            getSegments.call(self, representation).then(
                function (/*segments*/) {
                    var segmentsPromise;

                    //self.debug.log("Got segments.");
                    //self.debug.log(segments);
                    //self.debug.log("Got a list of segments, so dig deeper.");
                    segmentsPromise = getIndexForSegments.call(self, time, representation);
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

                    //self.debug.log("Stream finished? " + finished);
                    if (finished) {
                        request = new MediaPlayer.vo.SegmentRequest();
                        request.action = request.ACTION_COMPLETE;
                        request.index = index;
                        self.debug.log("Signal complete.");
                        self.debug.log(request);
                        deferred.resolve(request);
                    } else {
                        segment = getSegmentByIndex(index, representation);
                        requestPromise = getRequestForSegment.call(self, segment);
                    }

                    return requestPromise;
                }
            ).then(
                function (request) {
                    //self.debug.log("Got a request.");
                    //self.debug.log(request);
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

            //self.debug.log("Getting the next request.");

            if (index === -1) {
                throw "You must call getSegmentRequestForTime first.";
            }

            requestedTime = null;
            index += 1;
            //self.debug.log("New index: " + index);

            deferred = Q.defer();

            isMediaFinished.call(self, representation).then(
                function (finished) {
                    //self.debug.log("Stream finished? " + finished);
                    if (finished) {
                        request = new MediaPlayer.vo.SegmentRequest();
                        request.action = request.ACTION_COMPLETE;
                        request.index = index;
                        self.debug.log("Signal complete.");
                        //self.debug.log(request);
                        deferred.resolve(request);
                    } else {
                        getSegments.call(self, representation).then(
                            function (/*segments*/) {
                                var segmentsPromise;

                                //self.debug.log("Got segments.");
                                //self.debug.log(segments);
                                segment = getSegmentByIndex(index, representation);
                                segmentsPromise = getRequestForSegment.call(self, segment);
                                return segmentsPromise;
                            }
                        ).then(
                            function (request) {
                                //self.debug.log("Got a request.");
                                //self.debug.log(request);
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
                deferred = Q.defer();

            if (!representation) {
                return Q.reject("no represenation");
            }

            bufferedIndex = index;

            getSegments.call(self, representation).then(
                function (segments) {
                    if (bufferedIndex < 0) {
                        time = self.timelineConverter.calcPresentationStartTime(representation.adaptation.period);
                    } else {
                        bufferedIndex = bufferedIndex < segments[0].availabilityIdx ? segments[0].availabilityIdx : Math.min(segments[segments.length - 1].availabilityIdx, bufferedIndex);
                        time = getSegmentByIndex(bufferedIndex, representation).presentationStartTime;
                    }

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
        metricsModel: undefined,
        metricsExt: undefined,
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
        getSegmentCountForDuration: getSegmentCountForDuration,
        updateSegmentList: updateSegmentList
    };
};

Dash.dependencies.DashHandler.EPSILON = 0.003;

Dash.dependencies.DashHandler.prototype = {
    constructor: Dash.dependencies.DashHandler
};
