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
import Segment from './../vo/Segment.js';

function getNumberForSegment(segment, segmentIndex) {
    return segment.representation.startNumber + segmentIndex;
}

function getSegment(representation, duration, presentationStartTime, mediaStartTime, timelineConverter, presentationEndTime, isDynamic, index) {
    let seg = new Segment();

    seg.representation = representation;
    seg.duration = duration;
    seg.presentationStartTime = presentationStartTime;
    seg.mediaStartTime = mediaStartTime;
    seg.availabilityStartTime = timelineConverter.calcAvailabilityStartTimeFromPresentationTime(presentationEndTime, representation, isDynamic);
    seg.availabilityEndTime = timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationEndTime + duration, representation, isDynamic);
    seg.wallStartTime = timelineConverter.calcWallTimeForSegment(seg, isDynamic);
    seg.replacementNumber = getNumberForSegment(seg, index);
    seg.index = index;

    return seg;
}

function isSegmentAvailable(timelineConverter, representation, segment, isDynamic) {
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
        return segment.availabilityStartTime.getTime() <= refTime && (!isFinite(segment.availabilityEndTime) || segment.availabilityEndTime.getTime() >= refTime);
    }

    return true;
}

export function processUriTemplate(url, representationId, number, subNumber, bandwidth, time) {
    if (!url) {
        return url;
    }

    return cmlProcessUriTemplate(url, representationId, number, subNumber, bandwidth, time);
}

export function getIndexBasedSegment(timelineConverter, isDynamic, representation, index) {
    let duration,
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

    presentationStartTime = parseFloat((representation.adaptation.period.start + (index * duration)).toFixed(5));
    presentationEndTime = parseFloat((presentationStartTime + duration).toFixed(5));

    const mediaTime = timelineConverter.calcMediaTimeFromPresentationTime(presentationStartTime, representation);

    const segment = getSegment(representation, duration, presentationStartTime, mediaTime,
        timelineConverter, presentationEndTime, isDynamic, index);

    if (!isSegmentAvailable(timelineConverter, representation, segment, isDynamic)) {
        return null;
    }

    return segment;
}

export function getTimeBasedSegment(timelineConverter, isDynamic, representation, time, duration, fTimescale, url, range, index, tManifest) {
    const scaledTime = time / fTimescale;
    const scaledDuration = duration / fTimescale;

    let presentationStartTime,
        presentationEndTime,
        seg;

    presentationStartTime = timelineConverter.calcPresentationTimeFromMediaTime(scaledTime, representation);
    presentationEndTime = presentationStartTime + scaledDuration;

    seg = getSegment(representation, scaledDuration, presentationStartTime,
        scaledTime,
        timelineConverter, presentationEndTime, isDynamic, index);

    if (!isSegmentAvailable(timelineConverter, representation, seg, isDynamic)) {
        return null;
    }

    seg.replacementTime = tManifest ? tManifest : time;
    seg.media = processUriTemplate(
        url,
        undefined,
        seg.replacementNumber,
        seg.subNumber,
        undefined,
        seg.replacementTime,
    );
    seg.mediaRange = range;

    return seg;
}
