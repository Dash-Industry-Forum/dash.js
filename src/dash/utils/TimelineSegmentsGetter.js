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
import {getTimeBasedSegment, getTotalNumberOfPartialSegments} from './SegmentsUtils.js';

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

    function getSegmentByIndex(representation, lastSegment) {
        const safetyOffset = 0.05
        return getSegmentByTime(representation, lastSegment.presentationStartTime + lastSegment.duration + safetyOffset);
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

        _iterateSegments(representation, function (data) {
            // In some cases when requiredMediaTime = actual end time of the last segment
            // it is possible that this time a bit exceeds the declared end time of the last segment.
            // in this case we still need to include the last segment in the segment list.
            const fTimescale = representation.timescale;
            const requiredMediaTimeInTimescaleUnits = _precisionRound(requiredMediaTime * fTimescale);

            return _handleIteration(requiredMediaTimeInTimescaleUnits, data)
        });

        return segment;

        function _handleIteration(requiredMediaTimeInTimescaleUnits, data) {
            const {
                mediaTime,
                segmentBase,
                segmentURL,
                currentSElement,
                sElementCounterIncludingRepeats,
                sElementCounter
            } = data
            const targetDurationInTimescale = currentSElement.d;
            const fTimescale = representation.timescale;
            const mediaStartTime = mediaTime;
            const mediaEndTime = mediaTime + targetDurationInTimescale;

            if (requiredMediaTimeInTimescaleUnits < mediaEndTime && requiredMediaTimeInTimescaleUnits >= mediaStartTime) {
                _onSegmentFound({
                    segmentBase,
                    segmentURL,
                    sElementCounter,
                    currentSElement,
                    mediaTime: mediaStartTime,
                    durationInTimescale: targetDurationInTimescale,
                    fTimescale,
                    requiredMediaTimeInTimescaleUnits,
                    sElementCounterIncludingRepeats,
                });
                return true;
            }

            return false;
        }

        function _onSegmentFound(data) {
            const {
                segmentBase,
                segmentURL,
                sElementCounter,
                currentSElement,
                mediaTime,
                durationInTimescale,
                fTimescale,
                requiredMediaTimeInTimescaleUnits,
                sElementCounterIncludingRepeats
            } = data
            let mediaUrl = _getMediaUrl(segmentBase, segmentURL, sElementCounter);
            let mediaRange = _getMediaRange(currentSElement, segmentURL, sElementCounter);
            const totalNumberOfPartialSegments = getTotalNumberOfPartialSegments(currentSElement);
            const subNumberOfPartialSegmentToRequest = _getSubNumberOfPartialSegmentToRequestByTime({
                durationInTimescale,
                requiredMediaTimeInTimescaleUnits,
                mediaTime,
                totalNumberOfPartialSegments
            })

            segment = getTimeBasedSegment({
                timelineConverter,
                isDynamic,
                representation,
                mediaTime,
                durationInTimescale,
                fTimescale,
                mediaUrl,
                mediaRange,
                index: sElementCounterIncludingRepeats,
                tManifest: currentSElement.tManifest,
                totalNumberOfPartialSegments,
                subNumberOfPartialSegmentToRequest
            });
        }
    }

    function getMediaFinishedInformation(representation) {
        if (!representation) {
            return 0;
        }

        const base = representation.adaptation.period.mpd.manifest.Period[representation.adaptation.period.index].AdaptationSet[representation.adaptation.index].Representation[representation.index].SegmentTemplate ||
            representation.adaptation.period.mpd.manifest.Period[representation.adaptation.period.index].AdaptationSet[representation.adaptation.index].Representation[representation.index].SegmentList;
        const timeline = base.SegmentTimeline;

        let mediaTime = 0;
        let mediaTimeInSeconds = 0;
        let availableSegments = 0;

        let fragments,
            frag,
            i,
            j,
            repeat,
            fTimescale;

        fTimescale = representation.timescale;
        fragments = timeline.S;

        const length = fragments.length;

        for (i = 0; i < length; i++) {
            frag = fragments[i];
            repeat = 0;
            if (frag.hasOwnProperty('r')) {
                repeat = frag.r;
            }

            // For a repeated S element, t belongs only to the first segment
            if (frag.hasOwnProperty('t')) {
                mediaTime = frag.t;
                mediaTimeInSeconds = mediaTime / fTimescale;
            }

            // This is a special case: "A negative value of the @r attribute of the S element indicates that the duration indicated in @d attribute repeats until the start of the next S element, the end of the Period or until the
            // next MPD update."
            if (repeat < 0) {
                const nextFrag = fragments[i + 1];
                repeat = _calculateRepeatCountForNegativeR(representation, nextFrag, frag, fTimescale, mediaTimeInSeconds);
            }

            for (j = 0; j <= repeat; j++) {
                availableSegments++;

                mediaTime += frag.d;
                mediaTimeInSeconds = mediaTime / fTimescale;
            }
        }

        // We need to account for the index of the segments starting at 0. We subtract 1
        return { numberOfSegments: availableSegments, mediaTimeOfLastSignaledSegment: mediaTimeInSeconds };
    }

    function _iterateSegments(representation, iterFunc) {
        const segmentBase = _getSegmentBase(representation);
        const segmentTimeline = segmentBase.SegmentTimeline;
        const segmentURL = segmentBase.SegmentURL;

        let mediaTime = 0;
        let sElementCounterIncludingRepeats = -1;
        let parsedSElements,
            currentSElement,
            sElementCounter,
            j,
            repeat,
            fTimescale;

        fTimescale = representation.timescale;
        parsedSElements = segmentTimeline.S;

        let breakIterator = false;
        const numberOfSElements = parsedSElements.length;

        for (sElementCounter = 0; sElementCounter < numberOfSElements && !breakIterator; sElementCounter++) {
            currentSElement = parsedSElements[sElementCounter];
            repeat = 0;
            if (currentSElement.hasOwnProperty('r')) {
                repeat = currentSElement.r;
            }

            // For a repeated S element, t belongs only to the first segment
            if (currentSElement.hasOwnProperty('t')) {
                mediaTime = currentSElement.t;
            }

            // This is a special case: "A negative value of the @r attribute of the S element indicates that the duration indicated in @d attribute repeats until the start of the next S element, the end of the Period or until the
            // next MPD update."
            if (repeat < 0) {
                const nextFrag = parsedSElements[sElementCounter + 1];
                repeat = _calculateRepeatCountForNegativeR(representation, nextFrag, currentSElement, fTimescale, mediaTime / fTimescale);
            }

            for (j = 0; j <= repeat && !breakIterator; j++) {
                sElementCounterIncludingRepeats++;

                breakIterator = iterFunc({
                    mediaTime,
                    segmentBase,
                    segmentURL,
                    currentSElement,
                    sElementCounterIncludingRepeats,
                    sElementCounter
                });

                if (breakIterator) {
                    representation.segmentDuration = currentSElement.d / fTimescale;
                }

                mediaTime += currentSElement.d;
            }
        }
    }

    function _getSegmentBase(representation) {
        return representation.adaptation.period.mpd.manifest.Period[representation.adaptation.period.index].AdaptationSet[representation.adaptation.index].Representation[representation.index].SegmentTemplate ||
            representation.adaptation.period.mpd.manifest.Period[representation.adaptation.period.index].AdaptationSet[representation.adaptation.index].Representation[representation.index].SegmentList;
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

    function _getMediaUrl(segmentBase, segmentURL, index) {
        let mediaUrl = segmentBase.media;

        if (segmentURL) {
            mediaUrl = segmentURL[index].media || '';
        }

        return mediaUrl;
    }

    function _getMediaRange(currentSElement, segmentURL, index) {
        let mediaRange = currentSElement.mediaRange;

        if (segmentURL) {
            mediaRange = segmentURL[index].mediaRange;
        }

        return mediaRange;
    }

    function _precisionRound(number) {
        return parseFloat(number.toPrecision(15));
    }

    function _getSubNumberOfPartialSegmentToRequestByTime(data) {
        if (!data || data.totalNumberOfPartialSegments === undefined || isNaN(data.totalNumberOfPartialSegments) || data.totalNumberOfPartialSegments < 1) {
            return undefined;
        }
        const {
            durationInTimescale,
            requiredMediaTimeInTimescaleUnits,
            mediaTime,
            totalNumberOfPartialSegments
        } = data;
        const partialSegmentDuration = durationInTimescale / totalNumberOfPartialSegments;

        for (let i = 0; i < totalNumberOfPartialSegments; i++) {
            const start = mediaTime + i * partialSegmentDuration;
            const end = start + partialSegmentDuration;
            if (requiredMediaTimeInTimescaleUnits >= start && requiredMediaTimeInTimescaleUnits < end) {
                return i;
            }
        }

        return NaN
    }

    instance = {
        getMediaFinishedInformation,
        getSegmentByIndex,
        getSegmentByTime
    };

    return instance;
}

TimelineSegmentsGetter.__dashjs_factory_name = 'TimelineSegmentsGetter';
const factory = FactoryMaker.getClassFactory(TimelineSegmentsGetter);
export default factory;
