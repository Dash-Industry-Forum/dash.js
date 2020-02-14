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
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import FactoryMaker from '../../core/FactoryMaker';

function TimelineConverter() {

    let context = this.context;
    let eventBus = EventBus(context).getInstance();

    let instance,
        clientServerTimeShift,
        isClientServerTimeSyncCompleted,
        expectedLiveEdge;

    function initialize() {
        resetInitialSettings();
        eventBus.on(Events.TIME_SYNCHRONIZATION_COMPLETED, onTimeSyncComplete, this);
    }

    function isTimeSyncCompleted() {
        return isClientServerTimeSyncCompleted;
    }

    function setTimeSyncCompleted(value) {
        isClientServerTimeSyncCompleted = value;
    }

    function getClientTimeOffset() {
        return clientServerTimeShift;
    }

    function setClientTimeOffset(value) {
        clientServerTimeShift = value;
    }

    function getExpectedLiveEdge() {
        return expectedLiveEdge;
    }

    function setExpectedLiveEdge(value) {
        expectedLiveEdge = value;
    }

    function calcAvailabilityTimeFromPresentationTime(presentationTime, mpd, isDynamic, calculateEnd) {
        let availabilityTime = NaN;

        if (calculateEnd) {
            //@timeShiftBufferDepth specifies the duration of the time shifting buffer that is guaranteed
            // to be available for a Media Presentation with type 'dynamic'.
            // When not present, the value is infinite.
            if (isDynamic && (mpd.timeShiftBufferDepth != Number.POSITIVE_INFINITY)) {
                availabilityTime = new Date(mpd.availabilityStartTime.getTime() + ((presentationTime + mpd.timeShiftBufferDepth) * 1000));
            } else {
                availabilityTime = mpd.availabilityEndTime;
            }
        } else {
            if (isDynamic) {
                availabilityTime = new Date(mpd.availabilityStartTime.getTime() + (presentationTime - clientServerTimeShift) * 1000);
            } else {
                // in static mpd, all segments are available at the same time
                availabilityTime = mpd.availabilityStartTime;
            }
        }

        return availabilityTime;
    }

    function calcAvailabilityStartTimeFromPresentationTime(presentationTime, mpd, isDynamic) {
        return calcAvailabilityTimeFromPresentationTime.call(this, presentationTime, mpd, isDynamic);
    }

    function calcAvailabilityEndTimeFromPresentationTime(presentationTime, mpd, isDynamic) {
        return calcAvailabilityTimeFromPresentationTime.call(this, presentationTime, mpd, isDynamic, true);
    }

    function calcPresentationTimeFromWallTime(wallTime, period) {
        return ((wallTime.getTime() - period.mpd.availabilityStartTime.getTime() + clientServerTimeShift * 1000) / 1000);
    }

    function calcPresentationTimeFromMediaTime(mediaTime, representation) {
        const periodStart = representation.adaptation.period.start;
        const presentationOffset = representation.presentationTimeOffset;

        return mediaTime + (periodStart - presentationOffset);
    }

    function calcMediaTimeFromPresentationTime(presentationTime, representation) {
        const periodStart = representation.adaptation.period.start;
        const presentationOffset = representation.presentationTimeOffset;

        return presentationTime - periodStart + presentationOffset;
    }

    function calcWallTimeForSegment(segment, isDynamic) {
        let suggestedPresentationDelay,
            displayStartTime,
            wallTime;

        if (isDynamic) {
            suggestedPresentationDelay = segment.representation.adaptation.period.mpd.suggestedPresentationDelay;
            displayStartTime = segment.presentationStartTime + suggestedPresentationDelay;
            wallTime = new Date(segment.availabilityStartTime.getTime() + (displayStartTime * 1000));
        }

        return wallTime;
    }

    function calcSegmentAvailabilityRange(voRepresentation, isDynamic) {
        // Static Range Finder
        const voPeriod = voRepresentation.adaptation.period;
        const range = {start: voPeriod.start, end: voPeriod.start + voPeriod.duration};
        if (!isDynamic) return range;

        if (!isClientServerTimeSyncCompleted && voRepresentation.segmentAvailabilityRange) {
            return voRepresentation.segmentAvailabilityRange;
        }

        // Dynamic Range Finder
        const d = voRepresentation.segmentDuration || (voRepresentation.segments && voRepresentation.segments.length ? voRepresentation.segments[voRepresentation.segments.length - 1].duration : 0);
        const now = calcPresentationTimeFromWallTime(new Date(), voPeriod);
        const periodEnd = voPeriod.start + voPeriod.duration;
        range.start = Math.max((now - voPeriod.mpd.timeShiftBufferDepth), voPeriod.start);

        const endOffset = voRepresentation.availabilityTimeOffset !== undefined &&
        voRepresentation.availabilityTimeOffset < d ? d - voRepresentation.availabilityTimeOffset : d;

        range.end = now >= periodEnd && now - endOffset < periodEnd ? periodEnd : now - endOffset;

        return range;
    }

    /**
     * Returns the available segment range for a dynamic manifest with SegmentTimeline
     * @param {object} voRepresentation
     * @returns {object} The start and end time of the segment range
     */
    function calcSegmentAvailabilityRangeForSegTimeline(voRepresentation) {
        const base = voRepresentation.adaptation.period.mpd.manifest.Period_asArray[voRepresentation.adaptation.period.index].AdaptationSet_asArray[voRepresentation.adaptation.index].Representation_asArray[voRepresentation.index].SegmentTemplate ||
            voRepresentation.adaptation.period.mpd.manifest.Period_asArray[voRepresentation.adaptation.period.index].AdaptationSet_asArray[voRepresentation.adaptation.index].Representation_asArray[voRepresentation.index].SegmentList;
        const timeline = base.SegmentTimeline;

        let time = 0;
        let scaledTime = 0;
        let availabilityIdx = -1;
        const timelineSegmentRange = {};

        let fragments,
            frag,
            i,
            len,
            j,
            repeat,
            repeatEndTime,
            nextFrag,
            fTimescale;

        fTimescale = voRepresentation.timescale;

        fragments = timeline.S_asArray;

        for (i = 0, len = fragments.length; i < len; i++) {
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
                nextFrag = fragments[i + 1];

                if (nextFrag && nextFrag.hasOwnProperty('t')) {
                    repeatEndTime = nextFrag.t / fTimescale;
                } else {
                    const availabilityEnd = voRepresentation.segmentAvailabilityRange ? voRepresentation.segmentAvailabilityRange.end : (calcSegmentAvailabilityRange(voRepresentation, true).end);
                    repeatEndTime = voRepresentation.calcMediaTimeFromPresentationTime(availabilityEnd, voRepresentation);
                    voRepresentation.segmentDuration = frag.d / fTimescale;
                }

                repeat = Math.ceil((repeatEndTime - scaledTime) / (frag.d / fTimescale)) - 1;
            }

            for (j = 0; j <= repeat; j++) {
                availabilityIdx++;

                if (availabilityIdx === 0) {
                    timelineSegmentRange.start = calcPresentationTimeFromMediaTime(scaledTime, voRepresentation);
                }

                time += frag.d;
                scaledTime = time / fTimescale;
            }
        }
        const scaledDuration = Math.min(frag.d / fTimescale, voRepresentation.adaptation.period.mpd.maxSegmentDuration);
        timelineSegmentRange.end = calcPresentationTimeFromMediaTime(scaledTime, voRepresentation) + scaledDuration;

        // We need to ensure that the derived segment range is within the timeShiftBufferDepth and not outside the live edge
        const commonSegmentRange = calcSegmentAvailabilityRange(voRepresentation, true);

        // This is an edge case. If the last signaled segment is out of the timeShiftBufferDepth window we just use the timelineSegmentRange
        if (timelineSegmentRange.end < commonSegmentRange.start) {
            return timelineSegmentRange;
        }

        return {
            start: Math.max(commonSegmentRange.start, timelineSegmentRange.start),
            end: Math.min(commonSegmentRange.end, timelineSegmentRange.end)
        };
    }

    function getPeriodEnd(voRepresentation, isDynamic) {
        // Static Range Finder
        const voPeriod = voRepresentation.adaptation.period;
        if (!isDynamic) {
            return voPeriod.start + voPeriod.duration;
        }

        if (!isClientServerTimeSyncCompleted && voRepresentation.segmentAvailabilityRange) {
            return voRepresentation.segmentAvailabilityRange;
        }

        // Dynamic Range Finder
        const d = voRepresentation.segmentDuration || (voRepresentation.segments && voRepresentation.segments.length ? voRepresentation.segments[voRepresentation.segments.length - 1].duration : 0);
        const now = calcPresentationTimeFromWallTime(new Date(), voPeriod);
        const periodEnd = voPeriod.start + voPeriod.duration;

        const endOffset = voRepresentation.availabilityTimeOffset !== undefined &&
        voRepresentation.availabilityTimeOffset < d ? d - voRepresentation.availabilityTimeOffset : d;

        return Math.min(now - endOffset, periodEnd);
    }

    function calcPeriodRelativeTimeFromMpdRelativeTime(representation, mpdRelativeTime) {
        const periodStartTime = representation.adaptation.period.start;
        return mpdRelativeTime - periodStartTime;
    }

    /*
    * We need to figure out if we want to timesync for segmentTimeine where useCalculatedLiveEdge = true
    * seems we figure out client offset based on logic in liveEdgeFinder getLiveEdge timelineConverter.setClientTimeOffset(liveEdge - representationInfo.DVRWindow.end);
    * FYI StreamController's onManifestUpdated entry point to timeSync
    * */
    function onTimeSyncComplete(e) {

        if (isClientServerTimeSyncCompleted) return;

        if (e.offset !== undefined) {
            setClientTimeOffset(e.offset / 1000);
            isClientServerTimeSyncCompleted = true;
        }
    }

    function resetInitialSettings() {
        clientServerTimeShift = 0;
        isClientServerTimeSyncCompleted = false;
        expectedLiveEdge = NaN;
    }

    function reset() {
        eventBus.off(Events.TIME_SYNCHRONIZATION_COMPLETED, onTimeSyncComplete, this);
        resetInitialSettings();
    }

    instance = {
        initialize: initialize,
        isTimeSyncCompleted: isTimeSyncCompleted,
        setTimeSyncCompleted: setTimeSyncCompleted,
        getClientTimeOffset: getClientTimeOffset,
        setClientTimeOffset: setClientTimeOffset,
        getExpectedLiveEdge: getExpectedLiveEdge,
        setExpectedLiveEdge: setExpectedLiveEdge,
        calcAvailabilityStartTimeFromPresentationTime: calcAvailabilityStartTimeFromPresentationTime,
        calcAvailabilityEndTimeFromPresentationTime: calcAvailabilityEndTimeFromPresentationTime,
        calcPresentationTimeFromWallTime: calcPresentationTimeFromWallTime,
        calcPresentationTimeFromMediaTime: calcPresentationTimeFromMediaTime,
        calcPeriodRelativeTimeFromMpdRelativeTime: calcPeriodRelativeTimeFromMpdRelativeTime,
        calcMediaTimeFromPresentationTime: calcMediaTimeFromPresentationTime,
        calcSegmentAvailabilityRange: calcSegmentAvailabilityRange,
        calcSegmentAvailabilityRangeForSegTimeline: calcSegmentAvailabilityRangeForSegTimeline,
        getPeriodEnd: getPeriodEnd,
        calcWallTimeForSegment: calcWallTimeForSegment,
        reset: reset
    };

    return instance;
}

TimelineConverter.__dashjs_factory_name = 'TimelineConverter';
export default FactoryMaker.getSingletonFactory(TimelineConverter);
