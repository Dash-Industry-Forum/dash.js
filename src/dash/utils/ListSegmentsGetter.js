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

import {getIndexBasedSegment, decideSegmentListRangeForTemplate} from './SegmentsUtils';

function ListSegmentsGetter(config, isDynamic) {

    let timelineConverter = config.timelineConverter;

    let instance;

    function getSegmentsFromList(representation, requestedTime, index, availabilityUpperLimit) {
        var list = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].
            AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].SegmentList;
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

        range = decideSegmentListRangeForTemplate(timelineConverter, isDynamic, representation, requestedTime, index, availabilityUpperLimit);
        startIdx = Math.max(range.start, 0);
        endIdx = Math.min(range.end, list.SegmentURL_asArray.length - 1);

        for (periodSegIdx = startIdx; periodSegIdx <= endIdx; periodSegIdx++) {
            s = list.SegmentURL_asArray[periodSegIdx];

            seg = getIndexBasedSegment(timelineConverter, isDynamic, representation, periodSegIdx);
            seg.replacementTime = (start + periodSegIdx - 1) * representation.segmentDuration;
            seg.media = s.media ? s.media : '';
            seg.mediaRange = s.mediaRange;
            seg.index = s.index;
            seg.indexRange = s.indexRange;

            segments.push(seg);
            seg = null;
        }

        representation.availableSegmentsNumber = len;

        return segments;
    }

    instance = {
        getSegments: getSegmentsFromList
    };

    return instance;
}

ListSegmentsGetter.__dashjs_factory_name = 'ListSegmentsGetter';
const factory = FactoryMaker.getClassFactory(ListSegmentsGetter);
export default factory;
