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
import FragmentRequest from '../streaming/vo/FragmentRequest';
import Error from '../streaming/vo/Error';
import {HTTPRequest} from '../streaming/vo/metrics/HTTPRequest';
import Events from '../core/events/Events';
import EventBus from '../core/EventBus';
import FactoryMaker from '../core/FactoryMaker';
import Debug from '../core/Debug';
import URLUtils from '../streaming/utils/URLUtils';

import {replaceTokenForTemplate, getTimeBasedSegment, getSegmentByIndex} from './utils/SegmentsUtils';
import SegmentsGetter from './utils/SegmentsGetter';

const SEGMENTS_UNAVAILABLE_ERROR_CODE = 1;

function DashHandler(config) {

    let context = this.context;
    let log = Debug(context).getInstance().log;
    let eventBus = EventBus(context).getInstance();
    const urlUtils = URLUtils(context).getInstance();

    let segmentBaseLoader = config.segmentBaseLoader;
    let timelineConverter = config.timelineConverter;
    let dashMetrics = config.dashMetrics;
    let metricsModel = config.metricsModel;
    const baseURLController = config.baseURLController;

    let instance,
        index,
        requestedTime,
        isDynamic,
        type,
        currentTime,
        earliestTime,
        streamProcessor,
        segmentsGetter;

    function setup() {
        index = -1;
        currentTime = 0;
        earliestTime = NaN;
        eventBus.on(Events.INITIALIZATION_LOADED, onInitializationLoaded, instance);
        eventBus.on(Events.SEGMENTS_LOADED, onSegmentsLoaded, instance);
    }

    function initialize(StreamProcessor) {
        streamProcessor = StreamProcessor;
        type = streamProcessor.getType();
        isDynamic = streamProcessor.isDynamic();

        segmentsGetter = SegmentsGetter(context).create(config, isDynamic);
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

    function getEarliestTime() {
        return earliestTime;
    }

    function reset() {
        segmentsGetter = null;
        currentTime = 0;
        earliestTime = NaN;
        requestedTime = NaN;
        index = -1;
        isDynamic = null;
        type = null;
        streamProcessor = null;
        eventBus.off(Events.INITIALIZATION_LOADED, onInitializationLoaded, instance);
        eventBus.off(Events.SEGMENTS_LOADED, onSegmentsLoaded, instance);
    }

    function unescapeDollarsInTemplate(url) {
        return url.split('$$').join('$');
    }

    function replaceIDForTemplate(url, value) {
        if (value === null || url.indexOf('$RepresentationID$') === -1) { return url; }
        var v = value.toString();
        return url.split('$RepresentationID$').join(v);
    }

    function setRequestUrl(request, destination, representation) {
        var baseURL = baseURLController.resolve(representation.path);
        var url;
        var serviceLocation;

        if (!baseURL || (destination === baseURL.url) || (!urlUtils.isRelative(destination))) {
            url = destination;
        } else {
            url = baseURL.url;
            serviceLocation = baseURL.serviceLocation;

            if (destination) {
                url += destination;
            }
        }

        if (urlUtils.isRelative(url)) {
            return false;
        }

        request.url = url;
        request.serviceLocation = serviceLocation;

        return true;
    }

    function generateInitRequest(representation, mediaType) {
        var request = new FragmentRequest();
        var period,
            presentationStartTime;

        period = representation.adaptation.period;

        request.mediaType = mediaType;
        request.type = HTTPRequest.INIT_SEGMENT_TYPE;
        request.range = representation.range;
        presentationStartTime = period.start;
        request.availabilityStartTime = timelineConverter.calcAvailabilityStartTimeFromPresentationTime(presentationStartTime, representation.adaptation.period.mpd, isDynamic);
        request.availabilityEndTime = timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationStartTime + period.duration, period.mpd, isDynamic);
        request.quality = representation.index;
        request.mediaInfo = streamProcessor.getMediaInfo();

        if (setRequestUrl(request, representation.initialization, representation)) {
            return request;
        }
    }

    function getInitRequest(representation) {
        var request;

        if (!representation) return null;

        request = generateInitRequest(representation, type);

        //log("Got an initialization.");

        return request;
    }

    function isMediaFinished(representation) {
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
                isFinished = segmentInfoType === 'SegmentTimeline' && isDynamic ? false : (fTime >= sDuration);
            }
        } else {
            isFinished = true;
        }

        return isFinished;
    }

    function updateSegments(representation) {
        return segmentsGetter.getSegments(representation, requestedTime, index, onSegmentListUpdated);
    }

    function onSegmentListUpdated(representation, segments) {

        representation.segments = segments;

        if (segments && segments.length > 0) {
            earliestTime = isNaN(earliestTime) ? segments[0].presentationStartTime : Math.min(segments[0].presentationStartTime,  earliestTime);
        }

        if (isDynamic && isNaN(timelineConverter.getExpectedLiveEdge())) {
            let lastIdx = segments.length - 1;
            let lastSegment = segments[lastIdx];
            let liveEdge = lastSegment.presentationStartTime;
            let metrics = metricsModel.getMetricsFor('stream');
            // the last segment is supposed to be a live edge
            timelineConverter.setExpectedLiveEdge(liveEdge);
            metricsModel.updateManifestUpdateInfo(dashMetrics.getCurrentManifestUpdate(metrics), {presentationStartTime: liveEdge});
        }
    }

    function updateSegmentList(representation) {

        if (!representation) {
            throw new Error('no representation');
        }

        representation.segments = null;

        updateSegments(representation);

        return representation;
    }

    function updateRepresentation(representation, keepIdx) {
        var hasInitialization = representation.initialization;
        var hasSegments = representation.segmentInfoType !== 'BaseURL' && representation.segmentInfoType !== 'SegmentBase' && !representation.indexRange;
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
            segmentBaseLoader.loadInitialization(representation);
        }

        if (!hasSegments) {
            segmentBaseLoader.loadSegments(representation, type, representation.indexRange);
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

    function getRequestForSegment(segment) {
        if (segment === null || segment === undefined) {
            return null;
        }

        var request = new FragmentRequest();
        var representation = segment.representation;
        var bandwidth = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].
            AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].bandwidth;
        var url = segment.media;

        url = replaceTokenForTemplate(url, 'Number', segment.replacementNumber);
        url = replaceTokenForTemplate(url, 'Time', segment.replacementTime);
        url = replaceTokenForTemplate(url, 'Bandwidth', bandwidth);
        url = replaceIDForTemplate(url, representation.id);
        url = unescapeDollarsInTemplate(url);

        request.mediaType = type;
        request.type = HTTPRequest.MEDIA_SEGMENT_TYPE;
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
        request.adaptationIndex = representation.adaptation.index;

        if (setRequestUrl(request, url, representation)) {
            return request;
        }
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

        if (requestedTime !== time) { // When playing at live edge with 0 delay we may loop back with same time and index until it is available. Reduces verboseness of logs.
            requestedTime = time;
            log('Getting the request for ' + type + ' time : ' + time);
        }

        index = getIndexForSegments(time, representation, timeThreshold);
        //Index may be -1 if getSegments needs to update.  So after getSegments is called and updated then try to get index again.
        updateSegments(representation);
        if (index < 0) {
            index = getIndexForSegments(time, representation, timeThreshold);
        }

        if (index > 0) {
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

        if (keepIdx && idx >= 0) {
            index = representation.segmentInfoType === 'SegmentTimeline' && isDynamic ? index : idx;
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
            updateSegments(representation);
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
                timelineConverter,
                isDynamic,
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
        getEarliestTime: getEarliestTime,
        reset: reset
    };

    setup();

    return instance;
}

DashHandler.__dashjs_factory_name = 'DashHandler';
let factory = FactoryMaker.getClassFactory(DashHandler);
factory.SEGMENTS_UNAVAILABLE_ERROR_CODE = SEGMENTS_UNAVAILABLE_ERROR_CODE;
export default factory;
