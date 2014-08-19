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
        currentTime = 0,

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
            var self = this,
                request;

            if (!representation) return null;

            request = generateInitRequest.call(self, representation, type);
            //self.debug.log("Got an initialization.");

            return request;
        },

        isMediaFinished = function (representation) { // TODO
            var sDuration,
                period = representation.adaptation.period,
                isFinished = false,
                seg,
                fTime;

            //this.debug.log("Checking for stream end...");
            if (isDynamic) {
                //this.debug.log("Live never ends! (TODO)");
                // TODO : Check the contents of the last box to signal end.
                isFinished = false;
            } else {
                if (index < 0) {
                    isFinished = false;
                } else if (index < representation.availableSegmentsNumber) {
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

            return isFinished;
        },

        getIndexBasedSegment = function (representation, index) {
            var self = this,
                seg,
                duration,
                presentationStartTime,
                presentationEndTime;

            duration = representation.segmentDuration;
            presentationStartTime = index * duration;
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
                scaledTime = 0,
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
                    scaledTime = time / fTimescale;
                }

                //This is a special case: "A negative value of the @r attribute of the S element indicates that the duration indicated in @d attribute repeats until the start of the next S element, the end of the Period or until the 
                // next MPD update."
                if (repeat < 0) {
                    nextFrag = fragments[i+1];

                    if (nextFrag && nextFrag.hasOwnProperty("t")) {
                        repeatEndTime = nextFrag.t / fTimescale;
                    } else {
                        if (isDynamic) {
                            repeatEndTime = representation.segmentAvailabilityRange.end;
                            representation.segmentDuration = frag.d / fTimescale;
                        } else {
                            repeatEndTime = representation.adaptation.period.duration;
                        }
                    }

                    repeat = Math.ceil((repeatEndTime - self.timelineConverter.calcPresentationTimeFromMediaTime(scaledTime, representation))/(frag.d/fTimescale)) - 1;
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

                        if (scaledTime >= (requiredMediaTime - (frag.d / fTimescale))) {
                            segments.push(createSegment.call(self, frag));
                        }
                    }

                    time += frag.d;
                    scaledTime = time / fTimescale;
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

            return segments;
        },

        getSegmentsFromTemplate = function (representation) {
            var segments = [],
                self = this,
                template = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].
                    AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].SegmentTemplate,
                duration = representation.segmentDuration,
                availabilityWindow = representation.segmentAvailabilityRange,
                segmentRange,
                i,
                startIdx,
                endIdx,
                seg = null,
                start,
                url = null;

            start = representation.startNumber;

            segmentRange = decideSegmentListRangeForTemplate.call(self, representation);

            startIdx = segmentRange.start;
            endIdx = segmentRange.end;

            for (i = startIdx;i <= endIdx; i += 1) {

                seg = getIndexBasedSegment.call(
                    self,
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

            representation.availableSegmentsNumber = Math.ceil((availabilityWindow.end - availabilityWindow.start) / duration);

            return segments;
        },

        decideSegmentListRangeForTemplate = function(representation) {
            var duration = representation.segmentDuration,
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

            if (isDynamic && !representation.adaptation.period.isClientServerTimeSyncCompleted) {
                start = Math.floor(availabilityWindow.start / duration);
                end = Math.floor(availabilityWindow.end / duration);
                range = {start: start, end: end};
                return range;
            }

            // if segments exist we should try to find the latest buffered time, which is the presentation time of the
            // segment for the current index
            if (currentSegmentList) {
                originSegment = getSegmentByIndex(index, representation);
                originAvailabilityTime = originSegment ? (originSegment.presentationStartTime) : (index > 0 ? (index * duration) : requestedTime || currentSegmentList[0].presentationStartTime);
            } else {
                // If no segments exist, but index > 0, it means that we switch to the other representation, so
                // we should proceed from this time.
                // Otherwise we should start from the beginning for static mpds or from the end (live edge) for dynamic mpds
                originAvailabilityTime = (index > 0) ? (index * duration) : (isDynamic ? availabilityWindow.end : availabilityWindow.start);
            }

            // segment list should not be out of the availability window range
            start = Math.floor(Math.max(originAvailabilityTime - availabilityLowerLimit, availabilityWindow.start) / duration);
            end = Math.floor(Math.min(originAvailabilityTime + availabilityUpperLimit, availabilityWindow.end) / duration);

            range = {start: start, end: end};

            return range;
        },

        decideSegmentListRangeForTimeline = function(representation) {
            var availabilityLowerLimit = 2,
                availabilityUpperLimit = 10,
                firstIdx = 0,
                lastIdx = Number.POSITIVE_INFINITY,
                start,
                end,
                range;

            if (isDynamic && !representation.adaptation.period.isClientServerTimeSyncCompleted) {
                range = {start: firstIdx, end: lastIdx};
                return range;
            }

            if((!isDynamic && requestedTime) || index < 0) return null;

            // segment list should not be out of the availability window range
            start = Math.max(index - availabilityLowerLimit, firstIdx);
            end = Math.min(index + availabilityUpperLimit, lastIdx);

            range = {start: start, end: end};

            return range;
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

            url = replaceNumberForTemplate(url, seg.replacementNumber);
            url = replaceTimeForTemplate(url, seg.replacementTime);
            seg.media = url;
            seg.mediaRange = range;
            seg.availabilityIdx = index;

            return seg;
        },

        getSegmentsFromList = function (representation) {
            var self = this,
                segments = [],
                list = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].
                    AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].SegmentList,
                len = list.SegmentURL_asArray.length,
                i,
                seg,
                s,
                range,
                startIdx,
                endIdx,
                start;

            start = representation.startNumber;

            range = decideSegmentListRangeForTemplate.call(self, representation);
            startIdx = range.start;
            endIdx = range.end;

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

            representation.availableSegmentsNumber = len;

            return segments;
        },

        getSegments = function (representation) {
            var segments,
                self = this,
                type = representation.segmentInfoType;

                // Already figure out the segments.
            if (type === "SegmentBase" || type === "BaseURL" || !isSegmentListUpdateRequired.call(self, representation)) {
                segments = representation.segments;
            } else {
                if (type === "SegmentTimeline") {
                    segments = getSegmentsFromTimeline.call(self, representation);
                } else if (type === "SegmentTemplate") {
                    segments = getSegmentsFromTemplate.call(self, representation);
                } else if (type === "SegmentList") {
                    segments = getSegmentsFromList.call(self, representation);
                }

                onSegmentListUpdated.call(self, representation, segments);
            }

            return segments;
        },

        onSegmentListUpdated = function(representation, segments) {
            var lastIdx;

            representation.segments = segments;
            lastIdx = segments.length - 1;
            if (isDynamic && isNaN(representation.adaptation.period.liveEdge)) {
                var liveEdge = segments[lastIdx].presentationStartTime,
                    metrics = this.metricsModel.getMetricsFor("stream");
                // the last segment is supposed to be a live edge
                representation.adaptation.period.liveEdge = liveEdge;
                this.metricsModel.updateManifestUpdateInfo(this.metricsExt.getCurrentManifestUpdate(metrics), {presentationStartTime: liveEdge});
            }
        },

        updateSegmentList = function(representation) {
            var self = this;

            if (!representation) {
                throw new Error("no representation");
            }

            representation.segments = null;

            getSegments.call(self, representation);

            return representation;
        },

        updateRepresentation = function(representation, keepIdx) {
            var self = this,
                hasInitialization = representation.initialization,
                hasSegments = representation.segmentInfoType !== "BaseURL" && representation.segmentInfoType !== "SegmentBase";

            representation.segmentAvailabilityRange = self.timelineConverter.calcSegmentAvailabilityRange(representation, isDynamic);

            if (!keepIdx) index = -1;

            updateSegmentList.call(self, representation);
            if (!hasInitialization) {
                self.baseURLExt.loadInitialization(representation);
            }

            if (!hasSegments) {
                self.baseURLExt.loadSegments(representation, type, representation.indexRange);
            }

            if (hasInitialization && hasSegments) {
                self.notify(self.eventList.ENAME_REPRESENTATION_UPDATED, representation);
            }
        },

        getIndexForSegments = function (time, representation) {
            var segments = representation.segments,
                segmentLastIdx = segments ? (segments.length - 1) : null,
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
                        idx = frag.availabilityIdx;
                        break;
                    }
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

            return idx;
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
                return null;
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
            request.index = segment.availabilityIdx;

            return request;
        },

        getForTime = function(representation, time, keepIdx) {
            var request,
                segment,
                finished,
                idx = index,
                self = this;

            if (!representation) {
                return null;
            }

            requestedTime = time;

            self.debug.log("Getting the request for time: " + time);

            index = getIndexForSegments.call(self, time, representation);
            getSegments.call(self, representation);

            if (index < 0) {
                index = getIndexForSegments.call(self, time, representation);
            }

            //self.debug.log("Got segments.");
            //self.debug.log(segments);
            //self.debug.log("Got a list of segments, so dig deeper.");
            self.debug.log("Index for time " + time + " is " + index);

            finished = isMediaFinished.call(self, representation);

            //self.debug.log("Stream finished? " + finished);
            if (finished) {
                request = new MediaPlayer.vo.SegmentRequest();
                request.action = request.ACTION_COMPLETE;
                request.index = index;
                request.streamType = type;
                self.debug.log("Signal complete.");
                self.debug.log(request);
            } else {
                //self.debug.log("Got a request.");
                //self.debug.log(request);
                segment = getSegmentByIndex(index, representation);
                request = getRequestForSegment.call(self, segment);
            }

            if (keepIdx) {
                index = idx;
            }

            return request;
        },

        getNext = function (representation) {
            var request,
                segment,
                finished,
                idx,
                self = this;

            if (!representation) {
                return null;
            }

            //self.debug.log("Getting the next request.");

            if (index === -1) {
                throw "You must call getSegmentRequestForTime first.";
            }

            requestedTime = null;
            index += 1;
            idx = index;

            //self.debug.log("New index: " + index);

            finished = isMediaFinished.call(self, representation);

            //self.debug.log("Stream finished? " + finished);
            if (finished) {
                request = new MediaPlayer.vo.SegmentRequest();
                request.action = request.ACTION_COMPLETE;
                request.index = idx;
                request.streamType = type;
                self.debug.log("Signal complete.");
                //self.debug.log(request);
            } else {
                getSegments.call(self, representation);
                //self.debug.log("Got segments.");
                //self.debug.log(segments);
                segment = getSegmentByIndex(idx, representation);
                request = getRequestForSegment.call(self, segment);
            }

            return request;
        },

        getSegmentCountForDuration = function (representation, requiredDuration, bufferedDuration) {
            var self = this,
                remainingDuration = Math.max(requiredDuration - bufferedDuration, 0),
                segmentDuration,
                segments,
                segmentCount;

            if (!representation) {
                throw new Error("no represenation");
            }

            segments = getSegments.call(self, representation);
            segmentDuration = segments[0].duration;
            segmentCount = Math.ceil(remainingDuration/segmentDuration);

            return segmentCount;
        },

        onInitializationLoaded = function(sender, representation) {
            //self.debug.log("Got an initialization.");
            if (!representation.segments) return;

            this.notify(this.eventList.ENAME_REPRESENTATION_UPDATED, representation);
        },

        onSegmentsLoaded = function(sender, fragments, representation, typeValue, error) {
            if (error || (type !== typeValue)) return;

            var self = this,
                i,
                len,
                s,
                segments = [],
                count = 0,
                seg;

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

            onSegmentListUpdated.call(self, representation, segments);

            if (!representation.initialization) return;

            this.notify(this.eventList.ENAME_REPRESENTATION_UPDATED, representation);
        };

    return {
        debug: undefined,
        baseURLExt: undefined,
        timelineConverter: undefined,
        metricsModel: undefined,
        metricsExt: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,
        eventList: {
            ENAME_REPRESENTATION_UPDATED: "representationUpdated"
        },

        setup: function() {
            this.initializationLoaded = onInitializationLoaded;
            this.segmentsLoaded = onSegmentsLoaded;
        },

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

        setCurrentTime: function(value) {
            currentTime = value;
        },

        getCurrentTime: function() {
            return currentTime;
        },

        getInitRequest: getInit,
        getSegmentRequestForTime: getForTime,
        getNextSegmentRequest: getNext,
        getSegmentCountForDuration: getSegmentCountForDuration,
        updateRepresentation: updateRepresentation
    };
};

Dash.dependencies.DashHandler.EPSILON = 0.003;

Dash.dependencies.DashHandler.prototype = {
    constructor: Dash.dependencies.DashHandler
};
