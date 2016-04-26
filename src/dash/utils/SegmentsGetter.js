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

import FactoryMaker from '../../core/FactoryMaker';
import TimelineSegmentsGetter from './TimelineSegmentsGetter';
import TemplateSegmentsGetter from './TemplateSegmentsGetter';
import ListSegmentsGetter from './ListSegmentsGetter';

function SegmentsGetter(config, isDynamic) {

    let context = this.context;

    let instance,
        timelineSegmentsGetter,
        templateSegmentsGetter,
        listSegmentsGetter;

    function setup() {
        timelineSegmentsGetter = TimelineSegmentsGetter(context).create(config, isDynamic);
        templateSegmentsGetter = TemplateSegmentsGetter(context).create(config, isDynamic);
        listSegmentsGetter = ListSegmentsGetter(context).create(config, isDynamic);
    }

    function getSegments(representation, requestedTime, index, onSegmentListUpdatedCallback, availabilityUpperLimit) {
        var segments;
        var type = representation.segmentInfoType;

        // Already figure out the segments.
        if (type === 'SegmentBase' || type === 'BaseURL' || !isSegmentListUpdateRequired(representation, index)) {
            segments = representation.segments;
        } else {
            if (type === 'SegmentTimeline') {
                segments = timelineSegmentsGetter.getSegments(representation, requestedTime, index, availabilityUpperLimit);
            } else if (type === 'SegmentTemplate') {
                segments = templateSegmentsGetter.getSegments(representation, requestedTime, index, availabilityUpperLimit);
            } else if (type === 'SegmentList') {
                segments = listSegmentsGetter.getSegments(representation, requestedTime, index, availabilityUpperLimit);
            }

            if (onSegmentListUpdatedCallback) {
                onSegmentListUpdatedCallback(representation, segments);
            }
        }

        return segments;
    }

    function isSegmentListUpdateRequired(representation, index) {
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

    instance = {
        getSegments: getSegments
    };

    setup();

    return instance;
}

SegmentsGetter.__dashjs_factory_name = 'SegmentsGetter';
const factory = FactoryMaker.getClassFactory(SegmentsGetter);
export default factory;
