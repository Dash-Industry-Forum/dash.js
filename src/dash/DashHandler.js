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
import DashConstants from './constants/DashConstants';


const DEFAULT_ADJUST_SEEK_TIME_THRESHOLD = 0.5;


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
        lastSegment,
        isDynamicManifest,
        mediaHasFinished;

    function setup() {
        logger = debug.getLogger(instance);
        resetInitialSettings();

        eventBus.on(MediaPlayerEvents.DYNAMIC_TO_STATIC, _onDynamicToStatic, instance);
    }

    function initialize(isDynamic) {
        isDynamicManifest = isDynamic;
        mediaHasFinished = false;
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

    function resetInitialSettings() {
        lastSegment = null;
    }

    function reset() {
        resetInitialSettings();
        eventBus.off(MediaPlayerEvents.DYNAMIC_TO_STATIC, _onDynamicToStatic, instance);
    }

    function _setRequestUrl(request, destination, representation) {
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

        if (_setRequestUrl(request, representation.initialization, representation)) {
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
        request.index = segment.index;
        request.mediaInfo = mediaInfo;
        request.adaptationIndex = representation.adaptation.index;
        request.representationId = representation.id;

        if (_setRequestUrl(request, url, representation)) {
            return request;
        }
    }

    function isLastSegmentRequested(representation, bufferingTime) {
        if (!representation || !lastSegment) {
            return false;
        }

        // Either transition from dynamic to static was done or no next static segment found
        if (mediaHasFinished) {
            return true;
        }

        // Period is endless
        if (!isFinite(representation.adaptation.period.duration)) {
            return false;
        }

        // we are replacing existing stuff in the buffer for instance after a track switch
        if (lastSegment.presentationStartTime + lastSegment.duration > bufferingTime) {
            return false;
        }

        // Additional segment references may be added to the last period.
        // Additional periods may be added to the end of the MPD.
        // Segment references SHALL NOT be added to any period other than the last period.
        // An MPD update MAY combine adding segment references to the last period with adding of new periods. An MPD update that adds content MAY be combined with an MPD update that removes content.
        // The index of the last requested segment is higher than the number of available segments.
        // For SegmentTimeline and SegmentTemplate the index does not include the startNumber.
        // For SegmentList the index includes the startnumber which is why the numberOfSegments includes this as well
        if (representation.mediaFinishedInformation && !isNaN(representation.mediaFinishedInformation.numberOfSegments) && !isNaN(lastSegment.index) && lastSegment.index >= (representation.mediaFinishedInformation.numberOfSegments - 1)) {
            // For static manifests and Template addressing we can compare the index against the number of available segments
            if (!isDynamicManifest || representation.segmentInfoType === DashConstants.SEGMENT_TEMPLATE) {
                return true;
            }
            // For SegmentList we need to check if the next period is signaled
            else if (isDynamicManifest && representation.segmentInfoType === DashConstants.SEGMENT_LIST && representation.adaptation.period.nextPeriodId) {
                return true
            }
        }

        // For dynamic SegmentTimeline manifests we need to check if the next period is already signaled and the segment we fetched before is the last one that is signaled.
        // We can not simply use the index, as numberOfSegments might have decreased after an MPD update
        return !!(isDynamicManifest && representation.adaptation.period.nextPeriodId && representation.segmentInfoType === DashConstants.SEGMENT_TIMELINE && representation.mediaFinishedInformation &&
            !isNaN(representation.mediaFinishedInformation.mediaTimeOfLastSignaledSegment) && lastSegment && !isNaN(lastSegment.mediaStartTime) && !isNaN(lastSegment.duration) && lastSegment.mediaStartTime + lastSegment.duration >= (representation.mediaFinishedInformation.mediaTimeOfLastSignaledSegment - 0.05));
    }


    function getSegmentRequestForTime(mediaInfo, representation, time) {
        let request = null;

        if (!representation || !representation.segmentInfoType) {
            return request;
        }

        const segment = segmentsController.getSegmentByTime(representation, time);
        if (segment) {
            lastSegment = segment;
            logger.debug('Index for time ' + time + ' is ' + segment.index);
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
        let indexToRequest = lastSegment ? lastSegment.index + 1 : 0;
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

        let indexToRequest = lastSegment ? lastSegment.index + 1 : 0;

        const segment = segmentsController.getSegmentByIndex(representation, indexToRequest, lastSegment ? lastSegment.mediaStartTime : -1);

        // No segment found
        if (!segment) {
            // Dynamic manifest there might be something available in the next iteration
            if (isDynamicManifest && !mediaHasFinished) {
                logger.debug(getType() + ' No segment found at index: ' + indexToRequest + '. Wait for next loop');
                return null;
            } else {
                mediaHasFinished = true;
            }
        } else {
            request = _getRequestForSegment(mediaInfo, segment);
            lastSegment = segment;
        }

        return request;
    }

    /**
     * This function returns a time for which we can generate a request. It is supposed to be as close as possible to the target time.
     * This is useful in scenarios in which the user seeks into a gap. We will not find a valid request then and need to adjust the seektime.
     * @param {number} time
     * @param {object} mediaInfo
     * @param {object} representation
     * @param {number} targetThreshold
     */
    function getValidSeekTimeCloseToTargetTime(time, mediaInfo, representation, targetThreshold) {
        try {

            if (isNaN(time) || !mediaInfo || !representation) {
                return NaN;
            }

            if (time < 0) {
                time = 0;
            }

            if (isNaN(targetThreshold)) {
                targetThreshold = DEFAULT_ADJUST_SEEK_TIME_THRESHOLD;
            }

            if (getSegmentRequestForTime(mediaInfo, representation, time)) {
                return time;
            }

            const start = representation.adaptation.period.start;
            const end = representation.adaptation.period.start + representation.adaptation.period.duration;
            let currentUpperTime = Math.min(time + targetThreshold, end);
            let currentLowerTime = Math.max(time - targetThreshold, start);
            let adjustedTime = NaN;
            let targetRequest = null;

            while (currentUpperTime <= end || currentLowerTime >= start) {
                let upperRequest = null;
                let lowerRequest = null;
                if (currentUpperTime <= end) {
                    upperRequest = getSegmentRequestForTime(mediaInfo, representation, currentUpperTime);
                }
                if (currentLowerTime >= start) {
                    lowerRequest = getSegmentRequestForTime(mediaInfo, representation, currentLowerTime);
                }

                if (lowerRequest) {
                    adjustedTime = currentLowerTime;
                    targetRequest = lowerRequest;
                    break;
                } else if (upperRequest) {
                    adjustedTime = currentUpperTime;
                    targetRequest = upperRequest;
                    break;
                }

                currentUpperTime += targetThreshold;
                currentLowerTime -= targetThreshold;
            }

            if (targetRequest) {
                const requestEndTime = targetRequest.startTime + targetRequest.duration;

                // Keep the original start time in case it is covered by a segment
                if (time >= targetRequest.startTime && requestEndTime - time > targetThreshold) {
                    return time;
                }

                // If target time is before the start of the request use request starttime
                if (time < targetRequest.startTime) {
                    return targetRequest.startTime;
                }

                return Math.min(requestEndTime - targetThreshold, adjustedTime);
            }

            return adjustedTime;


        } catch (e) {
            return NaN;
        }
    }

    function getCurrentIndex() {
        return lastSegment ? lastSegment.index : -1;
    }

    function _onDynamicToStatic() {
        logger.debug('Dynamic stream complete');
        mediaHasFinished = true;
    }

    instance = {
        initialize,
        getStreamId,
        getType,
        getStreamInfo,
        getInitRequest,
        getSegmentRequestForTime,
        getCurrentIndex,
        getNextSegmentRequest,
        isLastSegmentRequested,
        reset,
        getNextSegmentRequestIdempotent,
        getValidSeekTimeCloseToTargetTime
    };

    setup();

    return instance;
}

DashHandler.__dashjs_factory_name = 'DashHandler';
export default FactoryMaker.getClassFactory(DashHandler);
