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
import MediaPlayerEvents from '../streaming/MediaPlayerEvents';
import {
    replaceIDForTemplate,
    replaceTokenForTemplate,
    unescapeDollarsInTemplate
} from './utils/SegmentsUtils';


function DashHandler(config) {

    config = config || {};

    const eventBus = config.eventBus;
    const debug = config.debug;
    const urlUtils = config.urlUtils;
    const type = config.type;
    const streamInfo = config.streamInfo;
    const segmentsController = config.segmentsController;
    const timelineConverter = config.timelineConverter;
    const baseURLController = config.baseURLController;

    let instance,
        logger,
        segmentIndex,
        lastSegment,
        requestedTime,
        isDynamicManifest,
        dynamicStreamCompleted;

    function setup() {
        logger = debug.getLogger(instance);
        resetInitialSettings();

        eventBus.on(MediaPlayerEvents.DYNAMIC_TO_STATIC, onDynamicToStatic, instance);
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
    }

    function reset() {
        resetInitialSettings();
        eventBus.off(MediaPlayerEvents.DYNAMIC_TO_STATIC, onDynamicToStatic, instance);
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

    function getInitRequest(mediaInfo, representation) {
        if (!representation) return null;
        return _generateInitRequest(mediaInfo, representation, getType());
    }

    function _generateInitRequest(mediaInfo, representation, mediaType) {
        const request = new FragmentRequest();
        const period = representation.adaptation.period;
        const presentationStartTime = period.start;

        request.mediaType = mediaType;
        request.type = HTTPRequest.INIT_SEGMENT_TYPE;
        request.range = representation.range;
        request.availabilityStartTime = timelineConverter.calcAvailabilityStartTimeFromPresentationTime(presentationStartTime, representation, isDynamicManifest);
        request.availabilityEndTime = timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationStartTime + period.duration, representation, isDynamicManifest);
        request.quality = representation.index;
        request.mediaInfo = mediaInfo;
        request.representationId = representation.id;

        if (setRequestUrl(request, representation.initialization, representation)) {
            request.url = replaceTokenForTemplate(request.url, 'Bandwidth', representation.bandwidth);
            return request;
        }
    }

    function _getRequestForSegment(mediaInfo, segment) {
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
        request.mediaStartTime = segment.mediaStartTime;
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

    function isMediaFinished(representation, bufferingTime) {
        let isFinished = false;

        if (!representation || !lastSegment) return isFinished;

        // if the buffer is filled up we are done

        // we are replacing existing stuff.
        if (lastSegment.presentationStartTime + lastSegment.duration > bufferingTime) {
            return false;
        }


        if (isDynamicManifest && dynamicStreamCompleted) {
            isFinished = true;
        } else if (lastSegment) {
            const time = parseFloat((lastSegment.presentationStartTime - representation.adaptation.period.start).toFixed(5));
            const endTime = lastSegment.duration > 0 ? time + lastSegment.duration : time;
            const duration = representation.adaptation.period.duration;

            return isFinite(duration) && endTime >= duration - 0.05;
        }

        return isFinished;
    }

    function getSegmentRequestForTime(mediaInfo, representation, time) {
        let request = null;

        if (!representation || !representation.segmentInfoType) {
            return request;
        }

        if (requestedTime !== time) { // When playing at live edge with 0 delay we may loop back with same time and index until it is available. Reduces verboseness of logs.
            requestedTime = time;
            logger.debug('Getting the request for time : ' + time);
        }

        const segment = segmentsController.getSegmentByTime(representation, time);
        if (segment) {
            segmentIndex = segment.availabilityIdx;
            lastSegment = segment;
            logger.debug('Index for time ' + time + ' is ' + segmentIndex);
            request = _getRequestForSegment(mediaInfo, segment);
        }

        return request;
    }

    /**
     * This function returns the next segment request without modifying any internal variables. Any class (e.g CMCD Model) that needs information about the upcoming request should use this method.
     * @param {object} mediaInfo
     * @param {object} representation
     * @return {FragmentRequest|null}
     */
    function getNextSegmentRequestIdempotent(mediaInfo, representation) {
        let request = null;
        let indexToRequest = segmentIndex + 1;
        const segment = segmentsController.getSegmentByIndex(
            representation,
            indexToRequest,
            lastSegment ? lastSegment.mediaStartTime : -1
        );
        if (!segment) return null;
        request = _getRequestForSegment(mediaInfo, segment);
        return request;
    }

    /**
     * Main function to get the next segment request.
     * @param {object} mediaInfo
     * @param {object} representation
     * @return {FragmentRequest|null}
     */
    function getNextSegmentRequest(mediaInfo, representation) {
        let request = null;

        if (!representation || !representation.segmentInfoType) {
            return null;
        }

        requestedTime = null;

        let indexToRequest = segmentIndex + 1;

        // check that there is a segment in this index
        const segment = segmentsController.getSegmentByIndex(representation, indexToRequest, lastSegment ? lastSegment.mediaStartTime : -1);
        if (!segment && isEndlessMedia(representation) && !dynamicStreamCompleted) {
            logger.debug(getType() + ' No segment found at index: ' + indexToRequest + '. Wait for next loop');
            return null;
        } else {
            if (segment) {
                request = _getRequestForSegment(mediaInfo, segment);
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
        }

        return request;
    }

    function isEndlessMedia(representation) {
        return !isFinite(representation.adaptation.period.duration);
    }

    function onDynamicToStatic() {
        logger.debug('Dynamic stream complete');
        dynamicStreamCompleted = true;
    }

    instance = {
        initialize,
        getStreamId,
        getType,
        getStreamInfo,
        getInitRequest,
        getSegmentRequestForTime,
        getNextSegmentRequest,
        setCurrentIndex,
        getCurrentIndex,
        isMediaFinished,
        reset,
        resetIndex,
        getNextSegmentRequestIdempotent
    };

    setup();

    return instance;
}

DashHandler.__dashjs_factory_name = 'DashHandler';
export default FactoryMaker.getClassFactory(DashHandler);
