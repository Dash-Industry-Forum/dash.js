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

import {processUriTemplate as cmlProcessUriTemplate} from '@svta/common-media-library/dash/processUriTemplate.js';
import FullSegment from './../vo/FullSegment.js';
import PartialSegment from '../vo/PartialSegment.js';

function _getSegment(data) {
    if (!data) {
        return null;
    }

    if (data.totalNumberOfPartialSegments && !isNaN(data.totalNumberOfPartialSegments) && data.totalNumberOfPartialSegments > 0 && !isNaN(data.subNumberOfPartialSegmentToRequest)) {
        return _getPartialSegment(data);
    } else {
        return _getFullSegment(data);
    }
}

function _getPartialSegment(data) {
    const subNumberOfPartialSegmentToRequest = data.subNumberOfPartialSegmentToRequest;
    const partialSegment = _createSinglePartialSegment(data, subNumberOfPartialSegmentToRequest)

    _addTimeBasedInformation(partialSegment, data);

    return partialSegment;
}

function _createSinglePartialSegment(data, subNumberOfPartialSegmentToRequest) {
    const partialSegment = new PartialSegment();
    const partialSegmentDurationInSeconds = data.segmentDurationInSeconds / data.totalNumberOfPartialSegments;
    const { representation, timelineConverter, isDynamic, index, totalNumberOfPartialSegments } = data;
    const inputData = {
        representation,
        segmentDurationInSeconds: partialSegmentDurationInSeconds,
        presentationStartTime: data.presentationStartTime + subNumberOfPartialSegmentToRequest * partialSegmentDurationInSeconds,
        presentationEndTime: data.presentationStartTime + ((subNumberOfPartialSegmentToRequest + 1) * partialSegmentDurationInSeconds),
        timelineConverter,
        isDynamic,
        mediaTimeInSeconds: data.mediaTimeInSeconds + subNumberOfPartialSegmentToRequest * partialSegmentDurationInSeconds,
        index
    }
    const segmentData = _getCommonSegmentData(inputData);
    partialSegment.assignAttributes(segmentData);
    partialSegment.replacementSubNumber = subNumberOfPartialSegmentToRequest;
    partialSegment.totalNumberOfPartialSegments = totalNumberOfPartialSegments;

    return partialSegment;
}

function _getFullSegment(data) {
    const fullSegment = new FullSegment();
    const segmentData = _getCommonSegmentData(data);

    fullSegment.assignAttributes(segmentData);

    _addTimeBasedInformation(fullSegment, data);

    return fullSegment;
}

function _getCommonSegmentData(data) {
    const {
        representation,
        segmentDurationInSeconds,
        presentationStartTime,
        presentationEndTime,
        mediaTimeInSeconds,
        timelineConverter,
        isDynamic,
        index,
    } = data;

    const segmentData = {
        availabilityEndTime: timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationEndTime + segmentDurationInSeconds, representation, isDynamic),
        availabilityStartTime: timelineConverter.calcAvailabilityStartTimeFromPresentationTime(presentationEndTime, representation, isDynamic),
        duration: segmentDurationInSeconds,
        index: index,
        mediaStartTime: mediaTimeInSeconds,
        presentationStartTime: presentationStartTime,
        replacementNumber: representation.startNumber + index,
        representation: representation,
    }
    segmentData.wallStartTime = timelineConverter.calcWallTimeForSegment(segmentData, isDynamic);

    return segmentData
}

function _addTimeBasedInformation(segment, data) {
    const { tManifest, mediaTime, mediaUrl, mediaRange } = data;
    segment.replacementTime = tManifest ? tManifest : mediaTime;
    segment.media = processUriTemplate(
        mediaUrl,
        segment.representation.id,
        segment.replacementNumber,
        segment.replacementSubNumber,
        segment.representation.bandwidth,
        segment.replacementTime,
    );
    segment.mediaRange = mediaRange;
    segment.mediaUrl = mediaUrl;
}

function _isSegmentAvailable(timelineConverter, representation, segment, isDynamic) {
    const voPeriod = representation.adaptation.period;

    // Avoid requesting segments for which the start time overlaps the period boundary
    if (isFinite(voPeriod.duration) && voPeriod.start + voPeriod.duration <= segment.presentationStartTime) {
        return false
    }

    if (isDynamic) {
        if (representation.availabilityTimeOffset === 'INF') {
            return true;
        }

        // For dynamic manifests we check if the presentation start time + duration is included in the availability window
        // SAST = Period@start + seg@presentationStartTime + seg@duration
        // ASAST = SAST - ATO
        // SAET = SAST + TSBD + seg@duration
        // refTime serves as an anchor time to compare the availability time of the segments against.
        const refTime = timelineConverter.getClientReferenceTime();
        const isAvailable = segment.availabilityStartTime.getTime() <= refTime && (!isFinite(segment.availabilityEndTime) || segment.availabilityEndTime.getTime() >= refTime);

        return isAvailable
    }

    return true;
}

function processUriTemplate(url, representationId, number, subNumber, bandwidth, time) {
    if (!url) {
        return url;
    }

    return cmlProcessUriTemplate(url, representationId, number, subNumber, bandwidth, time);
}

function getIndexBasedSegment(data) {
    const {
        index,
        subNumberOfPartialSegmentToRequest,
        isDynamic,
        mediaTime,
        mediaUrl,
        totalNumberOfPartialSegments,
        representation,
        timelineConverter,
    } = data;
    let segmentDurationInSeconds,
        presentationStartTime,
        presentationEndTime;


    segmentDurationInSeconds = representation.segmentDuration;

    /*
     * From spec - If neither @duration attribute nor SegmentTimeline element is present, then the Representation
     * shall contain exactly one Media Segment. The MPD start time is 0 and the MPD duration is obtained
     * in the same way as for the last Media Segment in the Representation.
     */
    if (isNaN(segmentDurationInSeconds)) {
        segmentDurationInSeconds = representation.adaptation.period.duration;
    }

    presentationStartTime = parseFloat((representation.adaptation.period.start + (index * segmentDurationInSeconds)).toFixed(5));
    presentationEndTime = parseFloat((presentationStartTime + segmentDurationInSeconds).toFixed(5));

    const mediaTimeInSeconds = timelineConverter.calcMediaTimeFromPresentationTime(presentationStartTime, representation);

    const segment = _getSegment(
        {
            representation,
            segmentDurationInSeconds,
            presentationStartTime,
            presentationEndTime,
            mediaTimeInSeconds,
            timelineConverter,
            isDynamic,
            index,
            totalNumberOfPartialSegments,
            subNumberOfPartialSegmentToRequest,
            mediaUrl,
            mediaTime
        });

    if (!_isSegmentAvailable(timelineConverter, representation, segment, isDynamic)) {
        return null;
    }

    return segment;
}

function getTimeBasedSegment(data) {
    const {
        durationInTimescale,
        fTimescale,
        index,
        subNumberOfPartialSegmentToRequest,
        isDynamic,
        mediaRange,
        mediaTime,
        mediaUrl,
        totalNumberOfPartialSegments,
        representation,
        tManifest,
        timelineConverter,
    } = data;
    const mediaTimeInSeconds = mediaTime / fTimescale;
    const segmentDurationInSeconds = durationInTimescale / fTimescale;
    let presentationStartTime = timelineConverter.calcPresentationTimeFromMediaTime(mediaTimeInSeconds, representation);
    let presentationEndTime = presentationStartTime + segmentDurationInSeconds;

    let segment = _getSegment({
        representation,
        segmentDurationInSeconds,
        presentationStartTime,
        presentationEndTime,
        mediaTimeInSeconds,
        timelineConverter,
        isDynamic,
        index,
        totalNumberOfPartialSegments,
        subNumberOfPartialSegmentToRequest,
        mediaUrl,
        mediaRange,
        tManifest,
        mediaTime
    });

    if (!_isSegmentAvailable(timelineConverter, representation, segment, isDynamic)) {
        return null;
    }

    return segment;
}

function getTotalNumberOfPartialSegments(element) {
    return element.k;
}

export {
    getIndexBasedSegment,
    getTotalNumberOfPartialSegments,
    getTimeBasedSegment,
    processUriTemplate,
};
