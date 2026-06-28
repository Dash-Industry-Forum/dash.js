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
    // Per-representation index of the SegmentTimeline. Keyed on the representation so it is dropped
    // automatically when the representation is. Invalidated in _getCachedLookup when the parsed S
    // array changes; never stored for open-ended (negative-@r) timelines, see _computeLookup.
    const segmentLookupCache = new WeakMap();

    let instance;

    function checkConfig() {
        if (!timelineConverter) {
            throw new Error(Constants.MISSING_CONFIG_ERROR);
        }
    }

    function getSegmentByIndex(representation, lastSegment) {
        if (!representation) {
            return null;
        }
        const safetyOffset = 0.01;
        const requestedPresentationTime = lastSegment && !isNaN(lastSegment.presentationStartTime) ? lastSegment.presentationStartTime + lastSegment.duration + safetyOffset : 0;

        return getSegmentByTime(representation, requestedPresentationTime);
    }

    function getSegmentByTime(representation, requestedPresentationTime) {
        checkConfig();

        if (!representation) {
            return null;
        }

        if (requestedPresentationTime === undefined) {
            requestedPresentationTime = null;
        }

        const requiredMediaTime = timelineConverter.calcMediaTimeFromPresentationTime(requestedPresentationTime, representation);
        const fTimescale = representation.timescale;
        const requiredMediaTimeInTimescaleUnits = _precisionRound(requiredMediaTime * fTimescale);
        const segmentLookup = _getSegmentLookup(representation);
        const blockIndex = _findBlockIndexByMediaTime(segmentLookup, requiredMediaTimeInTimescaleUnits);

        if (blockIndex === -1) {
            return null;
        }

        const block = segmentLookup.blocks[blockIndex];
        const durationInTimescale = block.currentSElement.d;
        // The block spans repeat+1 segments of equal duration; pick the one whose half-open
        // [start, start + d) interval contains the requested time (matches the per-segment check of
        // the previous linear scan). Clamp to block.repeat to absorb floating point at the end edge.
        const repeatOffset = Math.min(
            Math.floor((requiredMediaTimeInTimescaleUnits - block.mediaTime) / durationInTimescale),
            block.repeat
        );
        const mediaTime = block.mediaTime + repeatOffset * durationInTimescale;
        const sElementCounterIncludingRepeats = block.sElementCounterIncludingRepeatsStart + repeatOffset;
        const totalNumberOfPartialSegments = getTotalNumberOfPartialSegments(block.currentSElement);
        const subNumberOfPartialSegmentToRequest = _getSubNumberOfPartialSegmentToRequestByTime({
            durationInTimescale,
            requiredMediaTimeInTimescaleUnits,
            mediaTime,
            totalNumberOfPartialSegments
        });

        representation.segmentDuration = durationInTimescale / fTimescale;

        return getTimeBasedSegment({
            timelineConverter,
            isDynamic,
            representation,
            mediaTime,
            durationInTimescale,
            fTimescale,
            // blockIndex equals the source <S> position (one block per <S>), so it indexes SegmentURL.
            mediaUrl: _getMediaUrl(segmentLookup.segmentBase, segmentLookup.segmentURL, blockIndex),
            mediaRange: _getMediaRange(block.currentSElement, segmentLookup.segmentURL, blockIndex),
            index: sElementCounterIncludingRepeats,
            tManifest: block.currentSElement.tManifest,
            totalNumberOfPartialSegments,
            subNumberOfPartialSegmentToRequest
        });
    }

    function getMediaFinishedInformation(representation) {
        if (!representation) {
            return 0;
        }
        // Only the counts are needed here. Reuse the cached index when present, otherwise count in a
        // light pass without materializing the per-block array. This avoids allocating the full block
        // list on every MPD update for representations that are never actively buffered.
        const lookup = _getCachedLookup(representation) || _computeLookup(representation, false);

        return {
            numberOfSegments: lookup.numberOfSegments,
            mediaTimeOfLastSignaledSegment: lookup.mediaTimeOfLastSignaledSegment
        };
    }

    function _getSegmentBase(representation) {
        return representation.adaptation.period.mpd.manifest.Period[representation.adaptation.period.index].AdaptationSet[representation.adaptation.index].Representation[representation.index].SegmentTemplate ||
            representation.adaptation.period.mpd.manifest.Period[representation.adaptation.period.index].AdaptationSet[representation.adaptation.index].Representation[representation.index].SegmentList;
    }

    function _getCachedLookup(representation) {
        const segmentBase = _getSegmentBase(representation);
        const parsedSElements = segmentBase.SegmentTimeline.S;
        const cached = segmentLookupCache.get(representation);
        const length = parsedSElements.length;

        // Validate the cache against the parsed timeline. The identity of the S array does not change
        // on in-place updates (MSS appends/splices the same array), so we also compare its length and
        // first/last element identity to catch a sliding window that keeps the same length.
        if (
            cached &&
            cached.segmentBase === segmentBase &&
            cached.parsedSElements === parsedSElements &&
            cached.numberOfSElements === length &&
            cached.firstSElement === parsedSElements[0] &&
            cached.lastSElement === parsedSElements[length - 1] &&
            cached.fTimescale === representation.timescale
        ) {
            return cached;
        }

        return null;
    }

    function _getSegmentLookup(representation) {
        const cached = _getCachedLookup(representation);
        if (cached) {
            return cached;
        }

        const lookup = _computeLookup(representation, true);

        // An open-ended negative-@r timeline depends on the live DVR window / period end, which
        // advances over time. Caching it would freeze the segment count and hide newly available
        // live-edge segments between MPD updates, so recompute it on every call instead.
        if (!lookup.timeDependent) {
            segmentLookupCache.set(representation, lookup);
        }

        return lookup;
    }

    /**
     * Walk the SegmentTimeline once. Always returns the total segment count and the media time of the
     * last signaled segment; only materializes the per-block index when withBlocks is true.
     */
    function _computeLookup(representation, withBlocks) {
        const segmentBase = _getSegmentBase(representation);
        const segmentURL = segmentBase.SegmentURL;
        const parsedSElements = segmentBase.SegmentTimeline.S;
        const fTimescale = representation.timescale;
        const numberOfSElements = parsedSElements.length;
        const blocks = withBlocks ? [] : null;

        let mediaTime = 0;
        let sElementCounterIncludingRepeats = -1;
        let mediaTimeOfLastSignaledSegment = 0;
        let numberOfSegments = 0;
        let timeDependent = false;
        let monotonic = true;
        let previousEndTime = -Infinity;

        for (let sElementCounter = 0; sElementCounter < numberOfSElements; sElementCounter++) {
            const currentSElement = parsedSElements[sElementCounter];
            let repeat = currentSElement.hasOwnProperty('r') ? currentSElement.r : 0;

            // For a repeated S element, @t belongs only to the first segment.
            if (currentSElement.hasOwnProperty('t')) {
                mediaTime = currentSElement.t;
            }

            // A negative @r repeats the duration until the start of the next S element, the end of the
            // Period, or the next MPD update. When there is no following @t the count is derived from
            // the (advancing) Period end / DVR window, so the result must not be cached.
            if (repeat < 0) {
                const nextFrag = parsedSElements[sElementCounter + 1];
                if (!(nextFrag && nextFrag.hasOwnProperty('t'))) {
                    timeDependent = true;
                }
                repeat = _calculateRepeatCountForNegativeR(representation, nextFrag, currentSElement, fTimescale, mediaTime / fTimescale);
            }

            const segmentCount = repeat + 1;
            const startTime = mediaTime;
            const endTime = mediaTime + segmentCount * currentSElement.d;

            // Ascending, non-overlapping blocks let getSegmentByTime use a binary search. A
            // non-conformant timeline whose @t goes backwards falls back to a linear scan.
            if (startTime < previousEndTime) {
                monotonic = false;
            }
            previousEndTime = endTime;

            if (withBlocks) {
                blocks.push({
                    currentSElement,
                    mediaTime: startTime,
                    endTime,
                    repeat,
                    sElementCounterIncludingRepeatsStart: sElementCounterIncludingRepeats + 1
                });
            }

            sElementCounterIncludingRepeats += segmentCount;
            numberOfSegments += segmentCount;
            mediaTime = endTime;
            mediaTimeOfLastSignaledSegment = mediaTime / fTimescale;
        }

        return {
            blocks,
            fTimescale,
            firstSElement: parsedSElements[0],
            lastSElement: parsedSElements[numberOfSElements - 1],
            mediaTimeOfLastSignaledSegment,
            monotonic,
            numberOfSElements,
            numberOfSegments,
            parsedSElements,
            segmentBase,
            segmentURL,
            timeDependent
        };
    }

    function _blockContainsMediaTime(block, requiredMediaTimeInTimescaleUnits) {
        return !!block && requiredMediaTimeInTimescaleUnits >= block.mediaTime && requiredMediaTimeInTimescaleUnits < block.endTime;
    }

    /**
     * Returns the index of the block whose [mediaTime, endTime) interval contains the requested time,
     * or -1. Sequential playback advances one block at a time, so the last matched block (and its
     * successor) are checked first; otherwise a binary search is used, falling back to a linear scan
     * for non-monotonic timelines.
     */
    function _findBlockIndexByMediaTime(segmentLookup, requiredMediaTimeInTimescaleUnits) {
        // A NaN time (e.g. an unknown last-segment duration) matches no segment, as before.
        if (isNaN(requiredMediaTimeInTimescaleUnits)) {
            return -1;
        }

        const blocks = segmentLookup.blocks;

        if (segmentLookup.monotonic) {
            const hint = segmentLookup.lastBlockIndex;
            if (hint !== undefined) {
                if (_blockContainsMediaTime(blocks[hint], requiredMediaTimeInTimescaleUnits)) {
                    return hint;
                }
                if (_blockContainsMediaTime(blocks[hint + 1], requiredMediaTimeInTimescaleUnits)) {
                    segmentLookup.lastBlockIndex = hint + 1;
                    return hint + 1;
                }
            }

            let low = 0;
            let high = blocks.length - 1;
            while (low <= high) {
                const mid = (low + high) >> 1;
                const block = blocks[mid];
                if (requiredMediaTimeInTimescaleUnits < block.mediaTime) {
                    high = mid - 1;
                } else if (requiredMediaTimeInTimescaleUnits >= block.endTime) {
                    low = mid + 1;
                } else {
                    segmentLookup.lastBlockIndex = mid;
                    return mid;
                }
            }
            return -1;
        }

        for (let i = 0; i < blocks.length; i++) {
            if (_blockContainsMediaTime(blocks[i], requiredMediaTimeInTimescaleUnits)) {
                return i;
            }
        }
        return -1;
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
