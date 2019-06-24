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
import DashConstants from './constants/DashConstants';
import FragmentRequest from '../streaming/vo/FragmentRequest';
import DashJSError from '../streaming/vo/DashJSError';
import { HTTPRequest } from '../streaming/vo/metrics/HTTPRequest';
import Events from '../core/events/Events';
import EventBus from '../core/EventBus';
import Errors from '../core/errors/Errors';
import FactoryMaker from '../core/FactoryMaker';
import Debug from '../core/Debug';
import URLUtils from '../streaming/utils/URLUtils';
import Representation from './vo/Representation';
import {
    replaceIDForTemplate,
    unescapeDollarsInTemplate,
    replaceTokenForTemplate,
    getTimeBasedSegment
} from './utils/SegmentsUtils';

import SegmentsController from './controllers/SegmentsController';

function DashHandler(config) {

    config = config || {};
    const context = this.context;
    const eventBus = EventBus(context).getInstance();
    const urlUtils = URLUtils(context).getInstance();

    const timelineConverter = config.timelineConverter;
    const dashMetrics = config.dashMetrics;
    const baseURLController = config.baseURLController;

    let instance,
        logger,
        segmentIndex,
        lastSegment,
        requestedTime,
        currentTime,
        streamProcessor,
        segmentsController;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        resetInitialSettings();

        segmentsController = SegmentsController(context).create(config);

        eventBus.on(Events.INITIALIZATION_LOADED, onInitializationLoaded, instance);
        eventBus.on(Events.SEGMENTS_LOADED, onSegmentsLoaded, instance);
    }

    function initialize(StreamProcessor) {
        streamProcessor = StreamProcessor;

        segmentsController.initialize(isDynamic());
    }

    function getType() {
        return streamProcessor ? streamProcessor.getType() : null;
    }

    function isDynamic() {
        const streamInfo = streamProcessor ? streamProcessor.getStreamInfo() : null;
        return streamInfo ? streamInfo.manifestInfo.isDynamic : null;
    }

    function getMediaInfo() {
        return streamProcessor ? streamProcessor.getMediaInfo() : null;
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

    function resetIndex() {
        segmentIndex = -1;
        lastSegment = null;
    }

    function resetInitialSettings() {
        resetIndex();
        currentTime = 0;
        requestedTime = null;
        streamProcessor = null;
        segmentsController = null;
    }

    function reset() {
        resetInitialSettings();

        eventBus.off(Events.INITIALIZATION_LOADED, onInitializationLoaded, instance);
        eventBus.off(Events.SEGMENTS_LOADED, onSegmentsLoaded, instance);
    }

    function setRequestUrl(request, destination, representation) {
        const baseURL = baseURLController.resolve(representation.path);
        let url,
            serviceLocation;

        if (!baseURL || (destination === baseURL.url) || (!urlUtils.isRelative(destination))) {
            url = destination;
        } else {
            url = baseURL.url;
            serviceLocation = baseURL.serviceLocation;

            if (destination) {
                url = urlUtils.resolve(destination, url);
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
        const request = new FragmentRequest();
        const period = representation.adaptation.period;
        const presentationStartTime = period.start;
        const isDynamicStream = isDynamic();

        request.mediaType = mediaType;
        request.type = HTTPRequest.INIT_SEGMENT_TYPE;
        request.range = representation.range;
        request.availabilityStartTime = timelineConverter.calcAvailabilityStartTimeFromPresentationTime(presentationStartTime, period.mpd, isDynamicStream);
        request.availabilityEndTime = timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationStartTime + period.duration, period.mpd, isDynamicStream);
        request.quality = representation.index;
        request.mediaInfo = getMediaInfo();
        request.representationId = representation.id;

        if (setRequestUrl(request, representation.initialization, representation)) {
            request.url = replaceTokenForTemplate(request.url, 'Bandwidth', representation.bandwidth);
            return request;
        }
    }

    function getInitRequest(representation) {
        if (!representation) return null;
        const request = generateInitRequest(representation, getType());
        return request;
    }

    function setExpectedLiveEdge(liveEdge) {
        timelineConverter.setExpectedLiveEdge(liveEdge);
        dashMetrics.updateManifestUpdateInfo({presentationStartTime: liveEdge});
    }

    function updateRepresentation(voRepresentation, keepIdx) {
        const hasInitialization = Representation.hasInitialization(voRepresentation);
        const hasSegments = Representation.hasSegments(voRepresentation);
        let error;

        voRepresentation.segmentAvailabilityRange = timelineConverter.calcSegmentAvailabilityRange(voRepresentation, isDynamic());

        if ((voRepresentation.segmentAvailabilityRange.end < voRepresentation.segmentAvailabilityRange.start) && !voRepresentation.useCalculatedLiveEdgeTime) {
            error = new DashJSError(Errors.SEGMENTS_UNAVAILABLE_ERROR_CODE, Errors.SEGMENTS_UNAVAILABLE_ERROR_MESSAGE, {availabilityDelay: voRepresentation.segmentAvailabilityRange.start - voRepresentation.segmentAvailabilityRange.end});
            eventBus.trigger(Events.REPRESENTATION_UPDATED, {sender: this, representation: voRepresentation, error: error});
            return;
        }

        if (isDynamic()) {
            setExpectedLiveEdge(voRepresentation.segmentAvailabilityRange.end);
        }

        if (!keepIdx) {
            resetIndex();
        }

        segmentsController.update(voRepresentation, getType(), hasInitialization, hasSegments);

        if (hasInitialization && hasSegments) {
            eventBus.trigger(Events.REPRESENTATION_UPDATED, {sender: this, representation: voRepresentation});
        }
    }

    function getRequestForSegment(segment) {
        if (segment === null || segment === undefined) {
            return null;
        }

        const request = new FragmentRequest();
        const representation = segment.representation;
        const bandwidth = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].
            AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].bandwidth;
        let url = segment.media;

        url = replaceTokenForTemplate(url, 'Number', segment.replacementNumber);
        url = replaceTokenForTemplate(url, 'Time', segment.replacementTime);
        url = replaceTokenForTemplate(url, 'Bandwidth', bandwidth);
        url = replaceIDForTemplate(url, representation.id);
        url = unescapeDollarsInTemplate(url);

        request.mediaType = getType();
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
        request.mediaInfo = getMediaInfo();
        request.adaptationIndex = representation.adaptation.index;
        request.representationId = representation.id;

        if (setRequestUrl(request, url, representation)) {
            return request;
        }
    }

    function isMediaFinished(representation) {
        let isFinished = false;
        const isDynamicMedia = isDynamic();

        if (!isDynamicMedia) {
            if (segmentIndex >= representation.availableSegmentsNumber) {
                isFinished = true;
            }
        } else {
            if (lastSegment) {
                const time = parseFloat((lastSegment.presentationStartTime - representation.adaptation.period.start).toFixed(5));
                const endTime = lastSegment.duration > 0 ? time + 1.5 * lastSegment.duration : time;
                const duration = representation.adaptation.period.duration;

                isFinished = endTime >= duration;
            }
        }

        return isFinished;
    }

    function getSegmentRequestForTime(representation, time, options) {
        let request;

        if (!representation || !representation.segmentInfoType) {
            return null;
        }

        const type = getType();
        const idx = segmentIndex;
        const keepIdx = options ? options.keepIdx : false;
        const ignoreIsFinished = (options && options.ignoreIsFinished) ? true : false;

        if (requestedTime !== time) { // When playing at live edge with 0 delay we may loop back with same time and index until it is available. Reduces verboseness of logs.
            requestedTime = time;
            logger.debug('Getting the request for ' + type + ' time : ' + time);
        }

        const segment = segmentsController.getSegmentByTime(representation, time);
        if (segment) {
            segmentIndex = segment.availabilityIdx;
            lastSegment = segment;
            logger.debug('Index for ' + type + ' time ' + time + ' is ' + segmentIndex);
            request = getRequestForSegment(segment);
        } else {
            const finished = !ignoreIsFinished ? isMediaFinished(representation) : false;
            if (finished) {
                request = new FragmentRequest();
                request.action = FragmentRequest.ACTION_COMPLETE;
                request.index = segmentIndex - 1;
                request.mediaType = type;
                request.mediaInfo = getMediaInfo();
                logger.debug('Signal complete in getSegmentRequestForTime -', type);
            }
        }

        if (keepIdx && idx >= 0) {
            segmentIndex = representation.segmentInfoType === DashConstants.SEGMENT_TIMELINE && isDynamic() ? segmentIndex : idx;
        }

        return request;
    }

    function getNextSegmentRequest(representation) {
        let request;

        if (!representation || !representation.segmentInfoType) {
            return null;
        }

        const mediaStartTime = lastSegment ? lastSegment.mediaStartTime : -1;
        const type = getType();

        requestedTime = null;

        const indexToRequest = segmentIndex + 1;
        logger.debug('Getting the next request at index: ' + indexToRequest + ', type: ' + type);

        // check that there is a segment in this index
        const segment = segmentsController.getSegmentByIndex(representation, indexToRequest, mediaStartTime);
        if (!segment && !isEndlessMedia(representation)) {
            logger.debug('No segment found at index: ' + indexToRequest + '. Wait for next loop');
            return null;
        } else {
            if (segment) {
                request = getRequestForSegment(segment);
                segmentIndex = segment.availabilityIdx;
            } else {
                segmentIndex = indexToRequest;
            }
        }

        if (segment) {
            lastSegment = segment;
            request = getRequestForSegment(segment);
        } else {
            const finished = isMediaFinished(representation, segment);
            if (finished) {
                request = new FragmentRequest();
                request.action = FragmentRequest.ACTION_COMPLETE;
                request.index = segmentIndex - 1;
                request.mediaType = type;
                request.mediaInfo = getMediaInfo();
                logger.debug('Signal complete -', type);
            }
        }

        return request;
    }

    function isEndlessMedia(representation) {
        return !isDynamic() || (isDynamic() && isFinite(representation.adaptation.period.duration));
    }

    function onInitializationLoaded(e) {
        const representation = e.representation;
        if (!representation.segments) return;

        eventBus.trigger(Events.REPRESENTATION_UPDATED, {sender: this, representation: representation});
    }

    function onSegmentsLoaded(e) {
        if (e.error || (getType() !== e.mediaType)) return;

        const fragments = e.segments;
        const representation = e.representation;
        const segments = [];
        let count = 0;

        let i,
            len,
            s,
            seg;

        for (i = 0, len = fragments.length; i < len; i++) {
            s = fragments[i];

            seg = getTimeBasedSegment(
                timelineConverter,
                isDynamic(),
                representation,
                s.startTime,
                s.duration,
                s.timescale,
                s.media,
                s.mediaRange,
                count);

            if (seg) {
                segments.push(seg);
                seg = null;
                count++;
            }
        }

        len = segments.length;
        representation.segmentAvailabilityRange = {start: segments[0].presentationStartTime, end: segments[len - 1].presentationStartTime};
        representation.availableSegmentsNumber = len;

        representation.segments = segments;
        if (segments && segments.length > 0) {
            if (isDynamic()) {
                const lastSegment = segments[segments.length - 1];
                const liveEdge = lastSegment.presentationStartTime - 8;
                // the last segment is the Expected, not calculated, live edge.
                setExpectedLiveEdge(liveEdge);
            }
        }

        if (!Representation.hasInitialization(representation)) {
            return;
        }

        eventBus.trigger(Events.REPRESENTATION_UPDATED, {sender: this, representation: representation});
    }

    instance = {
        initialize: initialize,
        getStreamProcessor: getStreamProcessor,
        getInitRequest: getInitRequest,
        getSegmentRequestForTime: getSegmentRequestForTime,
        getNextSegmentRequest: getNextSegmentRequest,
        updateRepresentation: updateRepresentation,
        setCurrentTime: setCurrentTime,
        getCurrentTime: getCurrentTime,
        reset: reset,
        resetIndex: resetIndex
    };

    setup();

    return instance;
}

DashHandler.__dashjs_factory_name = 'DashHandler';
export default FactoryMaker.getClassFactory(DashHandler);
