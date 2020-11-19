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
import {HTTPRequest} from '../streaming/vo/metrics/HTTPRequest';
import FactoryMaker from '../core/FactoryMaker';
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

    const eventBus = config.eventBus;
    const events = config.events;
    const debug = config.debug;
    const dashConstants = config.dashConstants;
    const urlUtils = config.urlUtils;
    const type = config.type;
    const streamInfo = config.streamInfo;

    const timelineConverter = config.timelineConverter;
    const dashMetrics = config.dashMetrics;
    const baseURLController = config.baseURLController;

    let instance,
        logger,
        segmentIndex,
        lastSegment,
        requestedTime,
        isDynamicManifest,
        dynamicStreamCompleted,
        selectedMimeType,
        segmentsController;

    function setup() {
        logger = debug.getLogger(instance);
        resetInitialSettings();

        segmentsController = SegmentsController(context).create(config);

        eventBus.on(events.INITIALIZATION_LOADED, onInitializationLoaded, instance);
        eventBus.on(events.SEGMENTS_LOADED, onSegmentsLoaded, instance);
        eventBus.on(events.REPRESENTATION_UPDATE_STARTED, onRepresentationUpdateStarted, instance);
        eventBus.on(events.DYNAMIC_TO_STATIC, onDynamicToStatic, instance);
    }

    function initialize(isDynamic) {
        isDynamicManifest = isDynamic;
        dynamicStreamCompleted = false;
        segmentsController.initialize(isDynamic);
    }

    function getStreamId() {
        return streamInfo.id;
    }

    function getType() {
        return type;
    }

    function getStreamInfo() {
        return streamInfo;
    }

    function setCurrentIndex(value) {
        segmentIndex = value;
    }

    function getCurrentIndex() {
        return segmentIndex;
    }

    function resetIndex() {
        segmentIndex = -1;
        lastSegment = null;
    }

    function resetInitialSettings() {
        resetIndex();
        requestedTime = null;
        segmentsController = null;
        selectedMimeType = null;
    }

    function reset() {
        resetInitialSettings();

        eventBus.off(events.INITIALIZATION_LOADED, onInitializationLoaded, instance);
        eventBus.off(events.SEGMENTS_LOADED, onSegmentsLoaded, instance);
        eventBus.off(events.REPRESENTATION_UPDATE_STARTED, onRepresentationUpdateStarted, instance);
        eventBus.off(events.DYNAMIC_TO_STATIC, onDynamicToStatic, instance);
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

    function generateInitRequest(mediaInfo, representation, mediaType) {
        const request = new FragmentRequest();
        const period = representation.adaptation.period;
        const presentationStartTime = period.start;

        request.mediaType = mediaType;
        request.type = HTTPRequest.INIT_SEGMENT_TYPE;
        request.range = representation.range;
        request.availabilityStartTime = timelineConverter.calcAvailabilityStartTimeFromPresentationTime(presentationStartTime, period.mpd, isDynamicManifest);
        request.availabilityEndTime = timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationStartTime + period.duration, period.mpd, isDynamicManifest);
        request.quality = representation.index;
        request.mediaInfo = mediaInfo;
        request.representationId = representation.id;

        if (setRequestUrl(request, representation.initialization, representation)) {
            request.url = replaceTokenForTemplate(request.url, 'Bandwidth', representation.bandwidth);
            return request;
        }
    }

    function getInitRequest(mediaInfo, representation) {
        if (!representation) return null;
        const request = generateInitRequest(mediaInfo, representation, getType());
        return request;
    }

    function setMimeType(newMimeType) {
        selectedMimeType = newMimeType;
    }

    function setExpectedLiveEdge(liveEdge) {
        timelineConverter.setExpectedLiveEdge(liveEdge);
        dashMetrics.updateManifestUpdateInfo({presentationStartTime: liveEdge});
    }

    function onRepresentationUpdateStarted(e) {
        processRepresentation(e.representation);
    }

    function processRepresentation(voRepresentation) {
        const hasInitialization = voRepresentation.hasInitialization();
        const hasSegments = voRepresentation.hasSegments();

        // If representation has initialization and segments information, REPRESENTATION_UPDATE_COMPLETED can be triggered immediately
        // otherwise, it means that a request has to be made to get initialization and/or segments informations
        if (hasInitialization && hasSegments) {
            eventBus.trigger(events.REPRESENTATION_UPDATE_COMPLETED,
                { representation: voRepresentation },
                { streamId: streamInfo.id, mediaType: type }
            );
        } else {
            segmentsController.update(voRepresentation, selectedMimeType, hasInitialization, hasSegments);
        }
    }

    function getRequestForSegment(mediaInfo, segment) {
        if (segment === null || segment === undefined) {
            return null;
        }

        const request = new FragmentRequest();
        const representation = segment.representation;
        const bandwidth = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].bandwidth;
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
        request.mediaInfo = mediaInfo;
        request.adaptationIndex = representation.adaptation.index;
        request.representationId = representation.id;

        if (setRequestUrl(request, url, representation)) {
            return request;
        }
    }

    function isMediaFinished(representation) {
        let isFinished = false;

        if (!representation) return isFinished;

        if (!isDynamicManifest) {
            if (segmentIndex >= representation.availableSegmentsNumber) {
                isFinished = true;
            }
        } else {
            if (dynamicStreamCompleted) {
                isFinished = true;
            } else if (lastSegment) {
                const time = parseFloat((lastSegment.presentationStartTime - representation.adaptation.period.start).toFixed(5));
                const endTime = lastSegment.duration > 0 ? time + 1.5 * lastSegment.duration : time;
                const duration = representation.adaptation.period.duration;

                isFinished = endTime >= duration;
            }
        }
        return isFinished;
    }

    function getSegmentRequestForTime(mediaInfo, representation, time, options) {
        let request = null;

        if (!representation || !representation.segmentInfoType) {
            return request;
        }

        const idx = segmentIndex;
        const keepIdx = options ? options.keepIdx : false;
        const ignoreIsFinished = (options && options.ignoreIsFinished) ? true : false;

        if (requestedTime !== time) { // When playing at live edge with 0 delay we may loop back with same time and index until it is available. Reduces verboseness of logs.
            requestedTime = time;
            logger.debug('Getting the request for time : ' + time);
        }

        const segment = segmentsController.getSegmentByTime(representation, time);
        if (segment) {
            segmentIndex = segment.availabilityIdx;
            lastSegment = segment;
            logger.debug('Index for time ' + time + ' is ' + segmentIndex);
            request = getRequestForSegment(mediaInfo, segment);
        } else {
            const finished = !ignoreIsFinished ? isMediaFinished(representation) : false;
            if (finished) {
                request = new FragmentRequest();
                request.action = FragmentRequest.ACTION_COMPLETE;
                request.index = segmentIndex - 1;
                request.mediaType = type;
                request.mediaInfo = mediaInfo;
                logger.debug('Signal complete in getSegmentRequestForTime');
            }
        }

        if (keepIdx && idx >= 0) {
            segmentIndex = representation.segmentInfoType === dashConstants.SEGMENT_TIMELINE && isDynamicManifest ? segmentIndex : idx;
        }

        return request;
    }

    function getNextSegmentRequest(mediaInfo, representation) {
        let request = null;

        if (!representation || !representation.segmentInfoType) {
            return null;
        }

        requestedTime = null;

        let indexToRequest = segmentIndex + 1;

        logger.debug('Getting the next request at index: ' + indexToRequest);
        // check that there is a segment in this index
        const segment = segmentsController.getSegmentByIndex(representation, indexToRequest, lastSegment ? lastSegment.mediaStartTime : -1);
        if (!segment && isEndlessMedia(representation) && !dynamicStreamCompleted) {
            logger.debug(getType() + ' No segment found at index: ' + indexToRequest + '. Wait for next loop');
            return null;
        } else {
            if (segment) {
                request = getRequestForSegment(mediaInfo, segment);
                segmentIndex = segment.availabilityIdx;
            } else {
                if (isDynamicManifest) {
                    segmentIndex = indexToRequest - 1;
                } else {
                    segmentIndex = indexToRequest;
                }
            }
        }

        if (segment) {
            lastSegment = segment;
        } else {
            const finished = isMediaFinished(representation, segment);
            if (finished) {
                request = new FragmentRequest();
                request.action = FragmentRequest.ACTION_COMPLETE;
                request.index = segmentIndex - 1;
                request.mediaType = getType();
                request.mediaInfo = mediaInfo;
                logger.debug('Signal complete');
            }
        }

        return request;
    }

    function isEndlessMedia(representation) {
        return !isFinite(representation.adaptation.period.duration);
    }

    function onInitializationLoaded(e) {
        const representation = e.representation;
        if (!representation.segments) return;

        eventBus.trigger(events.REPRESENTATION_UPDATE_COMPLETED,
            { representation: representation },
            { streamId: streamInfo.id, mediaType: type }
        );
    }

    function onSegmentsLoaded(e) {
        if (e.error) return;

        const fragments = e.segments;
        const representation = e.representation;
        const segments = [];
        let count = 0;

        let i,
            len,
            s,
            seg;

        for (i = 0, len = fragments ? fragments.length : 0; i < len; i++) {
            s = fragments[i];

            seg = getTimeBasedSegment(
                timelineConverter,
                isDynamicManifest,
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

        if (segments.length > 0) {
            representation.segmentAvailabilityRange = {
                start: segments[0].presentationStartTime,
                end: segments[segments.length - 1].presentationStartTime
            };
            representation.availableSegmentsNumber = segments.length;
            representation.segments = segments;

            if (isDynamicManifest) {
                const lastSegment = segments[segments.length - 1];
                const liveEdge = lastSegment.presentationStartTime - 8;
                // the last segment is the Expected, not calculated, live edge.
                setExpectedLiveEdge(liveEdge);
            }
        }

        if (!representation.hasInitialization()) {
            return;
        }

        eventBus.trigger(events.REPRESENTATION_UPDATE_COMPLETED,
            { representation: representation },
            { streamId: streamInfo.id, mediaType: type }
        );
    }

    function onDynamicToStatic() {
        logger.debug('Dynamic stream complete');
        dynamicStreamCompleted = true;
    }

    instance = {
        initialize: initialize,
        getStreamId: getStreamId,
        getType: getType,
        getStreamInfo: getStreamInfo,
        getInitRequest: getInitRequest,
        getRequestForSegment: getRequestForSegment,
        getSegmentRequestForTime: getSegmentRequestForTime,
        getNextSegmentRequest: getNextSegmentRequest,
        setCurrentIndex: setCurrentIndex,
        getCurrentIndex: getCurrentIndex,
        isMediaFinished: isMediaFinished,
        reset: reset,
        resetIndex: resetIndex,
        setMimeType: setMimeType
    };

    setup();

    return instance;
}

DashHandler.__dashjs_factory_name = 'DashHandler';
export default FactoryMaker.getClassFactory(DashHandler);
