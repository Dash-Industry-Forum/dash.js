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
import Constants from '../../streaming/constants/Constants';


function SegmentBaseGetter(config) {

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

        if (!representation || !representation.segments) {
            return mediaFinishedInformation
        }

        mediaFinishedInformation.numberOfSegments = representation.segments.length;

        return mediaFinishedInformation;
    }

    function getSegmentByIndex(representation, index) {
        checkConfig();

        if (!representation) {
            return null;
        }

        const len = representation.segments ? representation.segments.length : -1;
        let seg;
        if (index < len) {
            seg = representation.segments[index];
            if (seg && seg.index === index) {
                return seg;
            }
        }

        for (let i = 0; i < len; i++) {
            seg = representation.segments[i];

            if (seg && seg.index === index) {
                return seg;
            }
        }

        return null;
    }

    function getSegmentByTime(representation, requestedTime) {
        checkConfig();

        const index = getIndexByTime(representation, requestedTime);

        return getSegmentByIndex(representation, index);
    }

    function getIndexByTime(representation, time) {
        if (!representation) {
            return -1;
        }

        const segments = representation.segments;
        const ln = segments ? segments.length : null;

        let idx = -1;
        let epsilon,
            seg,
            ft,
            fd,
            i;

        if (segments && ln > 0) {
            for (i = 0; i < ln; i++) {
                seg = segments[i];
                ft = seg.presentationStartTime;
                fd = seg.duration;

                epsilon = fd / 2;
                if ((time + epsilon) >= ft &&
                    (time - epsilon) < (ft + fd)) {
                    idx = seg.index;
                    break;
                }
            }
        }

        return idx;
    }

    instance = {
        getSegmentByIndex,
        getSegmentByTime,
        getMediaFinishedInformation
    };

    return instance;
}

SegmentBaseGetter.__dashjs_factory_name = 'SegmentBaseGetter';
const factory = FactoryMaker.getClassFactory(SegmentBaseGetter);
export default factory;
