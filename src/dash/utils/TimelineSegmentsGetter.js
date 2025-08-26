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
import {getTimeBasedSegment} from './SegmentsUtils.js';

function TimelineSegmentsGetter(config, isDynamic) {

    config = config || {};
    const timelineConverter = config.timelineConverter;
    const dashMetrics = config.dashMetrics;

    let instance;

    function checkConfig() {
        if (!timelineConverter) {
            throw new Error(Constants.MISSING_CONFIG_ERROR);
        }
    }

    function getMediaFinishedInformation(representation) {
        if (!representation) {
            return 0;
        }

        const base = representation.adaptation.period.mpd.manifest.Period[representation.adaptation.period.index].AdaptationSet[representation.adaptation.index].Representation[representation.index].SegmentTemplate ||
            representation.adaptation.period.mpd.manifest.Period[representation.adaptation.period.index].AdaptationSet[representation.adaptation.index].Representation[representation.index].SegmentList;
        const timeline = base.SegmentTimeline;

        let time = 0;
        let scaledTime = 0;
        let availableSegments = 0;

        let fragments,
            frag,
            i,
            len,
            j,
            repeat,
            fTimescale;

        fTimescale = representation.timescale;
        fragments = timeline.S;

        len = fragments.length;

        for (i = 0; i < len; i++) {
            frag = fragments[i];
            repeat = 0;
            if (frag.hasOwnProperty('r')) {
                repeat = frag.r;
            }

            // For a repeated S element, t belongs only to the first segment
            if (frag.hasOwnProperty('t')) {
                time = frag.t;
                scaledTime = time / fTimescale;
            }

            // This is a special case: "A negative value of the @r attribute of the S element indicates that the duration indicated in @d attribute repeats until the start of the next S element, the end of the Period or until the
            // next MPD update."
            if (repeat < 0) {
                const nextFrag = fragments[i + 1];
                repeat = _calculateRepeatCountForNegativeR(representation, nextFrag, frag, fTimescale, scaledTime);
            }

            for (j = 0; j <= repeat; j++) {
                availableSegments++;

                time += frag.d;
                scaledTime = time / fTimescale;
            }
        }

        // We need to account for the index of the segments starting at 0. We subtract 1
        return { numberOfSegments: availableSegments, mediaTimeOfLastSignaledSegment: scaledTime };
    }

    function iterateSegments(representation, iterFunc) {
        const base = representation.adaptation.period.mpd.manifest.Period[representation.adaptation.period.index].AdaptationSet[representation.adaptation.index].Representation[representation.index].SegmentTemplate ||
            representation.adaptation.period.mpd.manifest.Period[representation.adaptation.period.index].AdaptationSet[representation.adaptation.index].Representation[representation.index].SegmentList;
        const timeline = base.SegmentTimeline;
        const list = base.SegmentURL;

        let time = 0;
        let relativeIdx = -1;

        let fragments,
            frag,
            i,
            len,
            j,
            repeat,
            fTimescale;

        fTimescale = representation.timescale;
        fragments = timeline.S;

        let breakIterator = false;

        for (i = 0, len = fragments.length; i < len && !breakIterator; i++) {
            frag = fragments[i];
            repeat = 0;
            if (frag.hasOwnProperty('r')) {
                repeat = frag.r;
            }

            // For a repeated S element, t belongs only to the first segment
            if (frag.hasOwnProperty('t')) {
                time = frag.t;
            }

            // This is a special case: "A negative value of the @r attribute of the S element indicates that the duration indicated in @d attribute repeats until the start of the next S element, the end of the Period or until the
            // next MPD update."
            if (repeat < 0) {
                const nextFrag = fragments[i + 1];
                repeat = _calculateRepeatCountForNegativeR(representation, nextFrag, frag, fTimescale, time / fTimescale);
            }

            for (j = 0; j <= repeat && !breakIterator; j++) {
                relativeIdx++;

                breakIterator = iterFunc(time, base, list, frag, fTimescale, relativeIdx, i);

                if (breakIterator) {
                    representation.segmentDuration = frag.d / fTimescale;
                }

                time += frag.d;
            }
        }
    }

    function _calculateRepeatCountForNegativeR(representation, nextFrag, frag, fTimescale, scaledTime) {
        let repeatEndTime;

        if (nextFrag && nextFrag.hasOwnProperty('t')) {
            repeatEndTime = nextFrag.t / fTimescale;
        } else {
            try {
                let availabilityEnd = 0;
                if (!isNaN(representation.adaptation.period.start) && !isNaN(representation.adaptation.period.duration) && isFinite(representation.adaptation.period.duration)) {
                    // use end of the Period
                    availabilityEnd = representation.adaptation.period.start + representation.adaptation.period.duration;
                } else {
                    // use DVR window
                    const dvrWindow = dashMetrics.getCurrentDVRInfo();
                    availabilityEnd = !isNaN(dvrWindow.end) ? dvrWindow.end : 0;
                }
                repeatEndTime = timelineConverter.calcMediaTimeFromPresentationTime(availabilityEnd, representation);
                representation.segmentDuration = frag.d / fTimescale;
            } catch (e) {
                repeatEndTime = 0;
            }
        }

        return Math.max(Math.ceil((repeatEndTime - scaledTime) / (frag.d / fTimescale)) - 1, 0);
    }


    function getSegmentByIndex(representation, index, lastSegmentTime) {
        checkConfig();

        if (!representation) {
            return null;
        }

        let segment = null;
        let segmentFound = false;

        // Helper to determine if the segment should be selected
        function shouldSelectSegment(time, frag, fTimescale) {
            if (lastSegmentTime < 0) {
                return true;
            }
            const threshold = (lastSegmentTime * fTimescale) - (frag.d * 0.5);
            return time >= threshold;
        }

        iterateSegments(representation, function (time, base, list, frag, fTimescale, relativeIdx, i) {
            if (segmentFound || lastSegmentTime < 0) {
                // Select segment when found or if lastSegmentTime is invalid
                let media = base.media;
                let mediaRange = frag.mediaRange;

                if (list) {
                    media = list[i].media || '';
                    mediaRange = list[i].mediaRange;
                }

                segment = getTimeBasedSegment(
                    timelineConverter,
                    isDynamic,
                    representation,
                    time,
                    frag.d,
                    fTimescale,
                    media,
                    mediaRange,
                    relativeIdx,
                    frag.tManifest);

                return true;
            } else if (shouldSelectSegment(time, frag, fTimescale)) {
                // Mark as found if the time matches the selection criteria
                segmentFound = true;
            }

            return false;
        });

        return segment;
    }

    function getSegmentByTime(representation, requestedPresentationTime) {
        checkConfig();

        if (!representation) {
            return null;
        }

        if (requestedPresentationTime === undefined) {
            requestedPresentationTime = null;
        }

        let segment = null;
        const requiredMediaTime = timelineConverter.calcMediaTimeFromPresentationTime(requestedPresentationTime, representation);

        iterateSegments(representation, function (time, base, list, frag, fTimescale, relativeIdx, i) {
            // In some cases when requiredMediaTime = actual end time of the last segment
            // it is possible that this time a bit exceeds the declared end time of the last segment.
            // in this case we still need to include the last segment in the segment list.
            const scaledMediaTime = precisionRound(requiredMediaTime * fTimescale);
            if (scaledMediaTime < (time + frag.d) && scaledMediaTime >= time) {
                let media = base.media;
                let mediaRange = frag.mediaRange;

                if (list) {
                    media = list[i].media || '';
                    mediaRange = list[i].mediaRange;
                }

                segment = getTimeBasedSegment(
                    timelineConverter,
                    isDynamic,
                    representation,
                    time,
                    frag.d,
                    fTimescale,
                    media,
                    mediaRange,
                    relativeIdx,
                    frag.tManifest);

                return true;
            }

            return false;
        });

        return segment;
    }

    function precisionRound(number) {
        return parseFloat(number.toPrecision(16));
    }

    instance = {
        getSegmentByIndex,
        getSegmentByTime,
        getMediaFinishedInformation
    };

    return instance;
}

TimelineSegmentsGetter.__dashjs_factory_name = 'TimelineSegmentsGetter';
const factory = FactoryMaker.getClassFactory(TimelineSegmentsGetter);
export default factory;
