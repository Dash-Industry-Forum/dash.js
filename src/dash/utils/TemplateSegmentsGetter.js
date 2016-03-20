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

import FactoryMaker from '../../core/FactoryMaker.js';

import {replaceTokenForTemplate, getIndexBasedSegment, getSegmentByIndex} from './SegmentsUtils.js';

function TemplateSegmentsGetter(config, isDynamic) {

    let timelineConverter = config.timelineConverter;

    let instance;

    function getSegmentsFromTemplate(representation, requestedTime, index, availabilityUpperLimit) {
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
            segmentRange = decideSegmentListRangeForTemplate(representation, requestedTime, index, availabilityUpperLimit);
        }

        startIdx = segmentRange.start;
        endIdx = segmentRange.end;

        for (periodSegIdx = startIdx; periodSegIdx <= endIdx; periodSegIdx++) {

            seg = getIndexBasedSegment(timelineConverter, isDynamic, representation, periodSegIdx);
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

    function decideSegmentListRangeForTemplate(representation, requestedTime, index, givenAvailabilityUpperLimit) {
        var duration = representation.segmentDuration;
        var minBufferTime = representation.adaptation.period.mpd.manifest.minBufferTime;
        var availabilityWindow = representation.segmentAvailabilityRange;
        var periodRelativeRange = {
            start: timelineConverter.calcPeriodRelativeTimeFromMpdRelativeTime(representation, availabilityWindow.start),
            end: timelineConverter.calcPeriodRelativeTimeFromMpdRelativeTime(representation, availabilityWindow.end)
        };
        var currentSegmentList = representation.segments;
        var availabilityLowerLimit = 2 * duration;
        var availabilityUpperLimit = givenAvailabilityUpperLimit || Math.max(2 * minBufferTime, 10 * duration);

        var originAvailabilityTime = NaN;
        var originSegment = null;

        var start,
            end,
            range;

        if (!periodRelativeRange) { //TODO: no way it can be undefined here, useless statement!
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
            if (originSegment) {
                originAvailabilityTime = timelineConverter.calcPeriodRelativeTimeFromMpdRelativeTime(representation, originSegment.presentationStartTime);
            } else {
                originAvailabilityTime = index > 0 ? index * duration :
                    timelineConverter.calcPeriodRelativeTimeFromMpdRelativeTime(representation, requestedTime);
            }

        } else {
            // If no segments exist, but index > 0, it means that we switch to the other representation, so
            // we should proceed from this time.
            // Otherwise we should start from the beginning for static mpds or from the end (live edge) for dynamic mpds
            originAvailabilityTime = index > 0 ? index * duration : isDynamic ? periodRelativeRange.end : periodRelativeRange.start;
        }

        // segment list should not be out of the availability window range
        start = Math.floor(Math.max(originAvailabilityTime - availabilityLowerLimit, periodRelativeRange.start) / duration);
        end = Math.floor(Math.min(start + availabilityUpperLimit / duration, periodRelativeRange.end / duration));

        range = {start: start, end: end};

        return range;
    }

    instance = {
        getSegments: getSegmentsFromTemplate
    };

    return instance;
}

TemplateSegmentsGetter.__dashjs_factory_name = 'TemplateSegmentsGetter';
const factory = FactoryMaker.getClassFactory(TemplateSegmentsGetter);
export default factory;
