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
import Segment from './vo/Segment.js';
import FragmentRequest from '../streaming/vo/FragmentRequest.js';
import Error from '../streaming/vo/Error.js';
import HTTPRequest from '../streaming/vo/metrics/HTTPRequest.js';
import Events from '../core/events/Events.js';
import EventBus from '../core/EventBus.js';
import FactoryMaker from '../core/FactoryMaker.js';
import Debug from '../core/Debug.js';

const SEGMENTS_UNAVAILABLE_ERROR_CODE = 1;

function DashHandler(config) {

    let context = this.context;
    let log = Debug(context).getInstance().log;
    let eventBus = EventBus(context).getInstance();

    let baseURLExt = config.baseURLExt;
    let timelineConverter = config.timelineConverter;
    let metricsExt = config.metricsExt;
    let metricsModel = config.metricsModel;

    let instance,
        index,
        requestedTime,
        isDynamic,
        type,
        currentTime,
        absUrl,
        streamProcessor;

    function setup() {
        index = -1;
        currentTime = 0;
        absUrl = new RegExp('^(?:(?:[a-z]+:)?\/)?\/', 'i');

        eventBus.on(Events.INITIALIZATION_LOADED, onInitializationLoaded, instance);
        eventBus.on(Events.SEGMENTS_LOADED, onSegmentsLoaded, instance);
    }

    function initialize(StreamProcessor) {
        streamProcessor = StreamProcessor;
        type = streamProcessor.getType();
        isDynamic = streamProcessor.isDynamic();
    }

    function getStreamProcessor() {
        return streamProcessor;
    }

    function setCurrentTime(value) {
        currentTime = value;
    }

    function getCurrentTime() {
        return currentTime;
    }

    function getCurrentIndex() {
        return index;
    }

    function reset() {
        currentTime = 0;
        requestedTime = NaN;
        index = -1;
        isDynamic = null;
        type = null;
        streamProcessor = null;
        eventBus.off(Events.INITIALIZATION_LOADED, onInitializationLoaded, instance);
        eventBus.off(Events.SEGMENTS_LOADED, onSegmentsLoaded, instance);
    }

    function zeroPadToLength(numStr, minStrLength) {
        while (numStr.length < minStrLength) {
            numStr = '0' + numStr;
        }
        return numStr;
    }

    function replaceTokenForTemplate(url, token, value) {
        var formatTag = '%0';

        var startPos,
            endPos,
            formatTagPos,
            specifier,
            width,
            paddedValue;

        var tokenLen = token.length;
        var formatTagLen = formatTag.length;

        // keep looping round until all instances of <token> have been
        // replaced. once that has happened, startPos below will be -1
        // and the completed url will be returned.
        while (true) {

            // check if there is a valid $<token>...$ identifier
            // if not, return the url as is.
            startPos = url.indexOf('$' + token);
            if (startPos < 0) {
                return url;
            }

            // the next '$' must be the end of the identifier
            // if there isn't one, return the url as is.
            endPos = url.indexOf('$', startPos + tokenLen);
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
                        log('Unsupported/invalid IEEE 1003.1 format identifier string in URL');
                        return url;
                }
            } else {
                paddedValue = value;
            }

            url = url.substring(0, startPos) + paddedValue + url.substring(endPos + 1);
        }
    }

    function unescapeDollarsInTemplate(url) {
        return url.split('$$').join('$');
    }

    function replaceIDForTemplate(url, value) {
        if (value === null || url.indexOf('$RepresentationID$') === -1) { return url; }
        var v = value.toString();
        return url.split('$RepresentationID$').join(v);
    }

    function getNumberForSegment(segment, segmentIndex) {
        return segment.representation.startNumber + segmentIndex;
    }

    function getRequestUrl(destination, representation) {
        var baseURL = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].
            AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].BaseURL;
        var url;

        if (destination === baseURL) {
            url = destination;
        } else if (absUrl.test(destination)) {
            url = destination;
        } else {
            url = baseURL + destination;
        }

        return url;
    }

    function generateInitRequest(representation, mediaType) {
        var request = new FragmentRequest();
        var period,
            presentationStartTime;

        period = representation.adaptation.period;

        request.mediaType = mediaType;
        request.type = HTTPRequest.INIT_SEGMENT_TYPE;
        request.url = getRequestUrl(representation.initialization, representation);
        request.range = representation.range;
        presentationStartTime = period.start;
        request.availabilityStartTime = timelineConverter.calcAvailabilityStartTimeFromPresentationTime(presentationStartTime, representation.adaptation.period.mpd, isDynamic);
        request.availabilityEndTime = timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationStartTime + period.duration, period.mpd, isDynamic);
        request.quality = representation.index;
        request.mediaInfo = streamProcessor.getMediaInfo();

        return request;
    }

    function getInitRequest(representation) {
        var request;

        if (!representation) return null;

        request = generateInitRequest(representation, type);
        //log("Got an initialization.");

        return request;
    }

    function isMediaFinished(representation) { // TODO
        var period = representation.adaptation.period;
        var segmentInfoType = representation.segmentInfoType;

        var isFinished = false;

        var sDuration,
            seg,
            fTime;

        if (index < 0) {
            isFinished = false;
        } else if (isDynamic || index < representation.availableSegmentsNumber) {
            seg = getSegmentByIndex(index, representation);

            if (seg) {
                fTime = seg.presentationStartTime - period.start;
                sDuration = representation.adaptation.period.duration;
                log(representation.segmentInfoType + ': ' + fTime + ' / ' + sDuration);
                isFinished = segmentInfoType === 'SegmentTimeline' ? false : (fTime >= sDuration);
            }
        } else {
            isFinished = true;
        }

        return isFinished;
    }

    function getIndexBasedSegment(representation, index) {
        var seg,
            duration,
            presentationStartTime,
            presentationEndTime;

        duration = representation.segmentDuration;

        /*
         * From spec - If neither @duration attribute nor SegmentTimeline element is present, then the Representation
         * shall contain exactly one Media Segment. The MPD start time is 0 and the MPD duration is obtained
         * in the same way as for the last Media Segment in the Representation.
         */
        if (isNaN(duration)) {
            duration = representation.adaptation.period.duration;
        }

        presentationStartTime = representation.adaptation.period.start + (index * duration);
        presentationEndTime = presentationStartTime + duration;

        seg = new Segment();

        seg.representation = representation;
        seg.duration = duration;
        seg.presentationStartTime = presentationStartTime;

        seg.mediaStartTime = timelineConverter.calcMediaTimeFromPresentationTime(seg.presentationStartTime, representation);

        seg.availabilityStartTime = timelineConverter.calcAvailabilityStartTimeFromPresentationTime(seg.presentationStartTime, representation.adaptation.period.mpd, isDynamic);
        seg.availabilityEndTime = timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationEndTime, representation.adaptation.period.mpd, isDynamic);

        // at this wall clock time, the video element currentTime should be seg.presentationStartTime
        seg.wallStartTime = timelineConverter.calcWallTimeForSegment(seg, isDynamic);

        seg.replacementNumber = getNumberForSegment(seg, index);
        seg.availabilityIdx = index;

        return seg;
    }

    function getSegmentsFromTimeline(representation) {
        var template = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].
            AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].SegmentTemplate;
        var timeline = template.SegmentTimeline;
        var isAvailableSegmentNumberCalculated = representation.availableSegmentsNumber > 0;

        var maxSegmentsAhead = 10;
        var time = 0;
        var scaledTime = 0;
        var availabilityIdx = -1;
        var segments = [];
        var isStartSegmentForRequestedTimeFound = false;

        var fragments,
            frag,
            i,
            len,
            j,
            repeat,
            repeatEndTime,
            nextFrag,
            calculatedRange,
            hasEnoughSegments,
            requiredMediaTime,
            startIdx,
            endIdx,
            fTimescale;

        var createSegment = function (s) {
            return getTimeBasedSegment(
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

        calculatedRange = decideSegmentListRangeForTimeline(representation);

        // if calculatedRange exists we should generate segments that belong to this range.
        // Otherwise generate maxSegmentsAhead segments ahead of the requested time
        if (calculatedRange) {
            startIdx = calculatedRange.start;
            endIdx = calculatedRange.end;
        } else {
            requiredMediaTime = timelineConverter.calcMediaTimeFromPresentationTime(requestedTime || 0, representation);
        }

        for (i = 0, len = fragments.length; i < len; i++) {
            frag = fragments[i];
            repeat = 0;
            if (frag.hasOwnProperty('r')) {
                repeat = frag.r;
            }

            //For a repeated S element, t belongs only to the first segment
            if (frag.hasOwnProperty('t')) {
                time = frag.t;
                scaledTime = time / fTimescale;
            }

            //This is a special case: "A negative value of the @r attribute of the S element indicates that the duration indicated in @d attribute repeats until the start of the next S element, the end of the Period or until the
            // next MPD update."
            if (repeat < 0) {
                nextFrag = fragments[i + 1];

                if (nextFrag && nextFrag.hasOwnProperty('t')) {
                    repeatEndTime = nextFrag.t / fTimescale;
                } else {
                    var availabilityEnd = representation.segmentAvailabilityRange ? representation.segmentAvailabilityRange.end : (timelineConverter.calcSegmentAvailabilityRange(representation, isDynamic).end);
                    repeatEndTime = timelineConverter.calcMediaTimeFromPresentationTime(availabilityEnd, representation);
                    representation.segmentDuration = frag.d / fTimescale;
                }

                repeat = Math.ceil((repeatEndTime - scaledTime) / (frag.d / fTimescale)) - 1;
            }

            // if we have enough segments in the list, but we have not calculated the total number of the segments yet we
            // should continue the loop and calc the number. Once it is calculated, we can break the loop.
            if (hasEnoughSegments) {
                if (isAvailableSegmentNumberCalculated) break;
                availabilityIdx += repeat + 1;
                continue;
            }

            for (j = 0; j <= repeat; j++) {
                availabilityIdx++;

                if (calculatedRange) {
                    if (availabilityIdx > endIdx) {
                        hasEnoughSegments = true;
                        if (isAvailableSegmentNumberCalculated) break;
                        continue;
                    }

                    if (availabilityIdx >= startIdx) {
                        segments.push(createSegment(frag));
                    }
                } else {
                    if (segments.length > maxSegmentsAhead) {
                        hasEnoughSegments = true;
                        if (isAvailableSegmentNumberCalculated) break;
                        continue;
                    }

                    // In some cases when requiredMediaTime = actual end time of the last segment
                    // it is possible that this time a bit exceeds the declared end time of the last segment.
                    // in this case we still need to include the last segment in the segment list. to do this we
                    // use a correction factor = 1.5. This number is used because the largest possible deviation is
                    // is 50% of segment duration.
                    if (isStartSegmentForRequestedTimeFound) {
                        segments.push(createSegment(frag));
                    }  else if (scaledTime >= (requiredMediaTime - (frag.d / fTimescale) * 1.5)) {
                        isStartSegmentForRequestedTimeFound = true;
                        segments.push(createSegment(frag));
                    }
                }

                time += frag.d;
                scaledTime = time / fTimescale;
            }
        }

        if (!isAvailableSegmentNumberCalculated) {
            representation.availableSegmentsNumber = availabilityIdx + 1;
        }

        return segments;
    }

    function getSegmentsFromTemplate(representation) {
        var template = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].
            AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].SegmentTemplate;
        var duration = representation.segmentDuration;
        var availabilityWindow = representation.segmentAvailabilityRange;

        var segments = [];
        var url = null;
        var seg = null;

        var segmentRange,
            periodSegIdx,
            startIdx,
            endIdx,
            start;

        start = representation.startNumber;

        if (isNaN(duration) && !isDynamic) {
            segmentRange = {start: start, end: start};
        }
        else {
            segmentRange = decideSegmentListRangeForTemplate(representation);
        }

        startIdx = segmentRange.start;
        endIdx = segmentRange.end;

        for (periodSegIdx = startIdx; periodSegIdx <= endIdx; periodSegIdx++) {

            seg = getIndexBasedSegment(representation, periodSegIdx);
            seg.replacementTime = (start + periodSegIdx - 1) * representation.segmentDuration;
            url = template.media;
            url = replaceTokenForTemplate(url, 'Number', seg.replacementNumber);
            url = replaceTokenForTemplate(url, 'Time', seg.replacementTime);
            seg.media = url;

            segments.push(seg);
            seg = null;
        }

        if (isNaN(duration)) {
            representation.availableSegmentsNumber = 1;
        }
        else {
            representation.availableSegmentsNumber = Math.ceil((availabilityWindow.end - availabilityWindow.start) / duration);
        }

        return segments;
    }

    function decideSegmentListRangeForTemplate(representation) {
        var duration = representation.segmentDuration;
        var minBufferTime = representation.adaptation.period.mpd.manifest.minBufferTime;
        var availabilityWindow = representation.segmentAvailabilityRange;
        var periodRelativeRange = {
            start: timelineConverter.calcPeriodRelativeTimeFromMpdRelativeTime(representation, availabilityWindow.start),
            end: timelineConverter.calcPeriodRelativeTimeFromMpdRelativeTime(representation, availabilityWindow.end)
        };
        var currentSegmentList = representation.segments;
        var availabilityLowerLimit = 2 * duration;
        var availabilityUpperLimit = Math.max(2 * minBufferTime, 10 * duration);

        var originAvailabilityTime = NaN;
        var originSegment = null;

        var start,
            end,
            range;

        if (!periodRelativeRange) {
            periodRelativeRange = timelineConverter.calcSegmentAvailabilityRange(representation, isDynamic);
        }

        periodRelativeRange.start = Math.max(periodRelativeRange.start, 0);

        if (isDynamic && !timelineConverter.isTimeSyncCompleted()) {
            start = Math.floor(periodRelativeRange.start / duration);
            end = Math.floor(periodRelativeRange.end / duration);
            range = {start: start, end: end};
            return range;
        }

        // if segments exist we should try to find the latest buffered time, which is the presentation time of the
        // segment for the current index
        if (currentSegmentList && currentSegmentList.length > 0) {
            originSegment = getSegmentByIndex(index, representation);
            originAvailabilityTime = originSegment ? timelineConverter.calcPeriodRelativeTimeFromMpdRelativeTime(representation, originSegment.presentationStartTime) :
                (index > 0 ? (index * duration) : timelineConverter.calcPeriodRelativeTimeFromMpdRelativeTime(representation, requestedTime || currentSegmentList[0].presentationStartTime));
        } else {
            // If no segments exist, but index > 0, it means that we switch to the other representation, so
            // we should proceed from this time.
            // Otherwise we should start from the beginning for static mpds or from the end (live edge) for dynamic mpds
            originAvailabilityTime = (index > 0) ? (index * duration) : (isDynamic ? periodRelativeRange.end : periodRelativeRange.start);
        }

        // segment list should not be out of the availability window range
        start = Math.floor(Math.max(originAvailabilityTime - availabilityLowerLimit, periodRelativeRange.start) / duration);
        end = Math.floor(Math.min(start + availabilityUpperLimit / duration, periodRelativeRange.end / duration));

        range = {start: start, end: end};

        return range;
    }

    function decideSegmentListRangeForTimeline(/*representation*/) {
        var availabilityLowerLimit = 2;
        var availabilityUpperLimit = 10;
        var firstIdx = 0;
        var lastIdx = Number.POSITIVE_INFINITY;

        var start,
            end,
            range;

        if (isDynamic && !timelineConverter.isTimeSyncCompleted()) {
            range = {start: firstIdx, end: lastIdx};
            return range;
        }

        if ((!isDynamic && requestedTime) || index < 0) return null;

        // segment list should not be out of the availability window range
        start = Math.max(index - availabilityLowerLimit, firstIdx);
        end = Math.min(index + availabilityUpperLimit, lastIdx);

        range = {start: start, end: end};

        return range;
    }

    function getTimeBasedSegment(representation, time, duration, fTimescale, url, range, index) {
        var scaledTime = time / fTimescale;
        var scaledDuration = Math.min(duration / fTimescale, representation.adaptation.period.mpd.maxSegmentDuration);

        var presentationStartTime,
            presentationEndTime,
            seg;

        presentationStartTime = timelineConverter.calcPresentationTimeFromMediaTime(scaledTime, representation);
        presentationEndTime = presentationStartTime + scaledDuration;

        seg = new Segment();

        seg.representation = representation;
        seg.duration = scaledDuration;
        seg.mediaStartTime = scaledTime;

        seg.presentationStartTime = presentationStartTime;

        // For SegmentTimeline every segment is available at loadedTime
        seg.availabilityStartTime = representation.adaptation.period.mpd.manifest.loadedTime;
        seg.availabilityEndTime = timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationEndTime, representation.adaptation.period.mpd, isDynamic);

        // at this wall clock time, the video element currentTime should be seg.presentationStartTime
        seg.wallStartTime = timelineConverter.calcWallTimeForSegment(seg, isDynamic);

        seg.replacementTime = time;

        seg.replacementNumber = getNumberForSegment(seg, index);

        url = replaceTokenForTemplate(url, 'Number', seg.replacementNumber);
        url = replaceTokenForTemplate(url, 'Time', seg.replacementTime);
        seg.media = url;
        seg.mediaRange = range;
        seg.availabilityIdx = index;

        return seg;
    }

    function getSegmentsFromList(representation) {
        var list = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].
            AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].SegmentList;
        var baseURL = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].
            AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].BaseURL;
        var len = list.SegmentURL_asArray.length;

        var segments = [];

        var periodSegIdx,
            seg,
            s,
            range,
            startIdx,
            endIdx,
            start;

        start = representation.startNumber;

        range = decideSegmentListRangeForTemplate(representation);
        startIdx = Math.max(range.start, 0);
        endIdx = Math.min(range.end, list.SegmentURL_asArray.length - 1);

        for (periodSegIdx = startIdx; periodSegIdx <= endIdx; periodSegIdx++) {
            s = list.SegmentURL_asArray[periodSegIdx];

            seg = getIndexBasedSegment(representation, periodSegIdx);
            seg.replacementTime = (start + periodSegIdx - 1) * representation.segmentDuration;
            seg.media = s.media ? s.media : baseURL;
            seg.mediaRange = s.mediaRange;
            seg.index = s.index;
            seg.indexRange = s.indexRange;

            segments.push(seg);
            seg = null;
        }

        representation.availableSegmentsNumber = len;

        return segments;
    }

    function getSegments(representation) {
        var segments;
        var type = representation.segmentInfoType;

        // Already figure out the segments.
        if (type === 'SegmentBase' || type === 'BaseURL' || !isSegmentListUpdateRequired(representation)) {
            segments = representation.segments;
        } else {
            if (type === 'SegmentTimeline') {
                segments = getSegmentsFromTimeline(representation);
            } else if (type === 'SegmentTemplate') {
                segments = getSegmentsFromTemplate(representation);
            } else if (type === 'SegmentList') {
                segments = getSegmentsFromList(representation);
            }

            onSegmentListUpdated(representation, segments);
        }

        return segments;
    }

    function onSegmentListUpdated(representation, segments) {
        var lastIdx,
            liveEdge,
            metrics,
            lastSegment;

        representation.segments = segments;
        lastIdx = segments.length - 1;
        if (isDynamic && isNaN(timelineConverter.getExpectedLiveEdge())) {
            lastSegment = segments[lastIdx];
            liveEdge = lastSegment.presentationStartTime;
            metrics = metricsModel.getMetricsFor('stream');
            // the last segment is supposed to be a live edge
            timelineConverter.setExpectedLiveEdge(liveEdge);
            metricsModel.updateManifestUpdateInfo(metricsExt.getCurrentManifestUpdate(metrics), {presentationStartTime: liveEdge});
        }
    }

    function updateSegmentList(representation) {

        if (!representation) {
            throw new Error('no representation');
        }

        representation.segments = null;

        getSegments(representation);

        return representation;
    }

    function updateRepresentation(representation, keepIdx) {
        var hasInitialization = representation.initialization;
        var hasSegments = representation.segmentInfoType !== 'BaseURL' && representation.segmentInfoType !== 'SegmentBase';
        var error;

        if (!representation.segmentDuration && !representation.segments) {
            updateSegmentList(representation);
        }

        representation.segmentAvailabilityRange = null;
        representation.segmentAvailabilityRange = timelineConverter.calcSegmentAvailabilityRange(representation, isDynamic);

        if ((representation.segmentAvailabilityRange.end < representation.segmentAvailabilityRange.start) && !representation.useCalculatedLiveEdgeTime) {
            error = new Error(SEGMENTS_UNAVAILABLE_ERROR_CODE, 'no segments are available yet', {availabilityDelay: representation.segmentAvailabilityRange.start - representation.segmentAvailabilityRange.end});
            eventBus.trigger(Events.REPRESENTATION_UPDATED, {sender: this, representation: representation, error: error});
            return;
        }

        if (!keepIdx) index = -1;

        if (representation.segmentDuration) {
            updateSegmentList(representation);
        }

        if (!hasInitialization) {
            baseURLExt.loadInitialization(representation);
        }

        if (!hasSegments) {
            baseURLExt.loadSegments(representation, type, representation.indexRange);
        }

        if (hasInitialization && hasSegments) {
            eventBus.trigger(Events.REPRESENTATION_UPDATED, {sender: this, representation: representation});
        }
    }

    function getIndexForSegments(time, representation, timeThreshold) {
        var segments = representation.segments;
        var ln = segments ? segments.length : null;

        var idx = -1;
        var epsilon,
            frag,
            ft,
            fd,
            i;

        if (segments && ln > 0) {
            for (i = 0; i < ln; i++) {
                frag = segments[i];
                ft = frag.presentationStartTime;
                fd = frag.duration;
                epsilon = (timeThreshold === undefined || timeThreshold === null) ? fd / 2 : timeThreshold;
                if ((time + epsilon) >= ft &&
                    (time - epsilon) < (ft + fd)) {
                    idx = frag.availabilityIdx;
                    break;
                }
            }
        }

        return idx;
    }

    function getSegmentByIndex(index, representation) {
        if (!representation || !representation.segments) return null;

        var ln = representation.segments.length;
        var seg,
            i;

        if (index < ln) {
            seg = representation.segments[index];
            if (seg && seg.availabilityIdx === index) {
                return seg;
            }
        }

        for (i = 0; i < ln; i++) {
            seg = representation.segments[i];

            if (seg && seg.availabilityIdx === index) {
                return seg;
            }
        }

        return null;
    }

    function isSegmentListUpdateRequired(representation) {
        var segments = representation.segments;
        var updateRequired = false;

        var upperIdx,
            lowerIdx;

        if (!segments || segments.length === 0) {
            updateRequired = true;
        } else {
            lowerIdx = segments[0].availabilityIdx;
            upperIdx = segments[segments.length - 1].availabilityIdx;
            updateRequired = (index < lowerIdx) || (index > upperIdx);
        }

        return updateRequired;
    }

    function getRequestForSegment(segment) {
        if (segment === null || segment === undefined) {
            return null;
        }

        var request = new FragmentRequest();
        var representation = segment.representation;
        var bandwidth = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].
            AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].bandwidth;
        var url;

        url = getRequestUrl(segment.media, representation);
        url = replaceTokenForTemplate(url, 'Number', segment.replacementNumber);
        url = replaceTokenForTemplate(url, 'Time', segment.replacementTime);
        url = replaceTokenForTemplate(url, 'Bandwidth', bandwidth);
        url = replaceIDForTemplate(url, representation.id);
        url = unescapeDollarsInTemplate(url);

        request.mediaType = type;
        request.type = HTTPRequest.MEDIA_SEGMENT_TYPE;
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
        request.mediaInfo = streamProcessor.getMediaInfo();

        return request;
    }

    function getSegmentRequestForTime(representation, time, options) {
        var request,
            segment,
            finished;

        var idx = index;

        var keepIdx = options ? options.keepIdx : false;
        var timeThreshold = options ? options.timeThreshold : null;
        var ignoreIsFinished = (options && options.ignoreIsFinished) ? true : false;

        if (!representation) {
            return null;
        }

        if (requestedTime !== time) { // When playing at live edge with 0 delay we may loop back with same time and index until it is available. Reduces verbosness of logs.
            requestedTime = time;
            log('Getting the request for ' + type + ' time : ' + time);
        }

        index = getIndexForSegments(time, representation, timeThreshold);
        //Index may be -1 if getSegments needs to update.  So after getSegments is called and updated then try to get index again.
        getSegments(representation);
        if (index < 0) {
            index = getIndexForSegments(time, representation, timeThreshold);
        }

        if (requestedTime !== time) {
            log('Index for ' + type + ' time ' + time + ' is ' + index );
        }

        finished = !ignoreIsFinished ? isMediaFinished(representation) : false;
        if (finished) {
            request = new FragmentRequest();
            request.action = FragmentRequest.ACTION_COMPLETE;
            request.index = index;
            request.mediaType = type;
            request.mediaInfo = streamProcessor.getMediaInfo();
            log('Signal complete.', request);

        } else {
            segment = getSegmentByIndex(index, representation);
            request = getRequestForSegment(segment);
        }

        if (keepIdx && idx >= 0 && representation.segmentInfoType !== 'SegmentTimeline') {
            index = idx;
        }

        return request;
    }

    function generateSegmentRequestForTime(representation, time) {
        var step = (representation.segmentAvailabilityRange.end - representation.segmentAvailabilityRange.start) / 2;

        representation.segments = null;
        representation.segmentAvailabilityRange = {start: time - step, end: time + step};
        return getSegmentRequestForTime(representation, time, {keepIdx: false, ignoreIsFinished: true});
    }

    function getNextSegmentRequest(representation) {
        var request,
            segment,
            finished;

        if (!representation || index === -1) {
            return null;
        }

        requestedTime = null;
        index++;

        log('Getting the next request at index: ' + index);

        finished = isMediaFinished(representation);
        if (finished) {
            request = new FragmentRequest();
            request.action = FragmentRequest.ACTION_COMPLETE;
            request.index = index;
            request.mediaType = type;
            request.mediaInfo = streamProcessor.getMediaInfo();
            log('Signal complete.');
        } else {
            getSegments(representation);
            segment = getSegmentByIndex(index, representation);
            request = getRequestForSegment(segment);
            if (!segment && isDynamic) {
                /*
                 Sometimes when playing dynamic streams with 0 fragment delay at live edge we ask for
                 an index before it is available so we decrement index back and send null request
                 which triggers the validate loop to rerun and the next time the segment should be
                 available.
                 */
                index-- ;
            }
        }

        return request;
    }

    function onInitializationLoaded(e) {
        var representation = e.representation;
        //log("Got an initialization.");
        if (!representation.segments) return;

        eventBus.trigger(Events.REPRESENTATION_UPDATED, {sender: this, representation: representation});
    }

    function onSegmentsLoaded(e) {
        if (e.error || (type !== e.mediaType)) return;

        var fragments = e.segments;
        var representation = e.representation;
        var segments = [];
        var count = 0;

        var i,
            len,
            s,
            seg;

        for (i = 0, len = fragments.length; i < len; i++) {
            s = fragments[i];

            seg = getTimeBasedSegment(
                representation,
                s.startTime,
                s.duration,
                s.timescale,
                s.media,
                s.mediaRange,
                count);

            segments.push(seg);
            seg = null;
            count++;
        }

        representation.segmentAvailabilityRange = {start: segments[0].presentationStartTime, end: segments[len - 1].presentationStartTime};
        representation.availableSegmentsNumber = len;

        onSegmentListUpdated(representation, segments);

        if (!representation.initialization) return;

        eventBus.trigger(Events.REPRESENTATION_UPDATED, {sender: this, representation: representation});
    }

    instance = {
        initialize: initialize,
        getStreamProcessor: getStreamProcessor,
        getInitRequest: getInitRequest,
        getSegmentRequestForTime: getSegmentRequestForTime,
        getNextSegmentRequest: getNextSegmentRequest,
        generateSegmentRequestForTime: generateSegmentRequestForTime,
        updateRepresentation: updateRepresentation,
        setCurrentTime: setCurrentTime,
        getCurrentTime: getCurrentTime,
        getCurrentIndex: getCurrentIndex,
        reset: reset
    };

    setup();

    return instance;
}

DashHandler.__dashjs_factory_name = 'DashHandler';
let factory = FactoryMaker.getClassFactory(DashHandler);
factory.SEGMENTS_UNAVAILABLE_ERROR_CODE = SEGMENTS_UNAVAILABLE_ERROR_CODE;
export default factory;