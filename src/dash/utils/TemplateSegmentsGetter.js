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
import Constants from '../../streaming/constants/Constants.js';
import {getIndexBasedSegment, processUriTemplate} from './SegmentsUtils.js';

function TemplateSegmentsGetter(config, isDynamic) {
    config = config || {};
    const timelineConverter = config.timelineConverter;

    let instance;

    function checkConfig() {
        if (!timelineConverter || !timelineConverter.hasOwnProperty('calcPeriodRelativeTimeFromMpdRelativeTime')) {
            throw new Error(Constants.MISSING_CONFIG_ERROR);
        }
    }

    function getMediaFinishedInformation(representation) {
        const mediaFinishedInformation = { numberOfSegments: 0, mediaTimeOfLastSignaledSegment: NaN }
        if (!representation) {
            return mediaFinishedInformation
        }

        const duration = representation.segmentDuration;
        if (isNaN(duration)) {
            mediaFinishedInformation.numberOfSegments = 1;
        } else {
            mediaFinishedInformation.numberOfSegments = Math.ceil(representation.adaptation.period.duration / duration);
        }

        return mediaFinishedInformation;
    }

    function getSegmentByIndex(representation, index) {
        checkConfig();

        if (!representation) {
            return null;
        }

        const template = representation.adaptation.period.mpd.manifest.Period[representation.adaptation.period.index].
            AdaptationSet[representation.adaptation.index].Representation[representation.index].SegmentTemplate;

        // This is the index without @startNumber
        index = Math.max(index, 0);

        const seg = getIndexBasedSegment(timelineConverter, isDynamic, representation, index);

        if (seg) {
            if (representation.endNumber && seg.replacementNumber > representation.endNumber) {
                return null;
            }

            seg.replacementTime = Math.round(index * representation.segmentDuration * representation.timescale, 10);
            seg.media = processUriTemplate(
                template.media,
                undefined,
                seg.replacementNumber,
                undefined,
                undefined,
                seg.replacementTime,
            );
        }

        return seg;
    }

    function getSegmentByTime(representation, requestedTime) {
        checkConfig();

        if (!representation) {
            return null;
        }

        const duration = representation.segmentDuration;

        if (isNaN(duration)) {
            return null;
        }

        // Calculate the relative time for the requested time in this period
        let periodTime = timelineConverter.calcPeriodRelativeTimeFromMpdRelativeTime(representation, requestedTime);
        const index = Math.floor(periodTime / duration);

        return getSegmentByIndex(representation, index);
    }

    instance = {
        getSegmentByIndex,
        getSegmentByTime,
        getMediaFinishedInformation
    };

    return instance;
}

TemplateSegmentsGetter.__dashjs_factory_name = 'TemplateSegmentsGetter';
const factory = FactoryMaker.getClassFactory(TemplateSegmentsGetter);
export default factory;
