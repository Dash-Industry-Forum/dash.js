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
import DashConstants from '../constants/DashConstants';
import DashManifestModel from '../models/DashManifestModel';
import Settings from '../../core/Settings';

function TimelineConverter() {

    const context = this.context;
    const eventBus = EventBus(context).getInstance();
    const settings = Settings(context).getInstance();

    let instance,
        dashManifestModel,
        clientServerTimeShift,
        isClientServerTimeSyncCompleted,
        expectedLiveEdge;

    function setup() {
        dashManifestModel = DashManifestModel(context).getInstance();
        reset();
    }

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

        // Specific use case of SegmentTimeline without timeShiftBufferDepth
        if (voRepresentation.segmentInfoType === DashConstants.SEGMENT_TIMELINE && settings.get().streaming.calcSegmentAvailabilityRangeFromTimeline) {
            return calcSegmentAvailabilityRangeFromTimeline(voRepresentation);
        }

        const now = calcPresentationTimeFromWallTime(new Date(), voPeriod);
        const periodEnd = voPeriod.start + voPeriod.duration;
        range.start = Math.max((now - voPeriod.mpd.timeShiftBufferDepth), voPeriod.start);

        const endOffset = voRepresentation.availabilityTimeOffset !== undefined &&
        voRepresentation.availabilityTimeOffset < d ? d - voRepresentation.availabilityTimeOffset : d;

        range.end = now >= periodEnd && now - endOffset < periodEnd ? periodEnd : now - endOffset;

        return range;
    }

    function calcSegmentAvailabilityRangeForAllPeriods(streams, voRepresentation, isDynamic) {

        // Static manifests
        if (!isDynamic) {
            return _calcAvailabilityRangeForStaticManifest(streams);
        }

        // Dynamic manifests with SegmentTimeline
        if (voRepresentation.segmentInfoType === DashConstants.SEGMENT_TIMELINE && settings.get().streaming.calcSegmentAvailabilityRangeFromTimeline) {
            _calcAvailabilityRangeForDynamicTimelineManifest(streams, voRepresentation);
        }

        // Other dynamic manifests
        return _calcAvailabilityRangeForDynamicManifest(streams, voRepresentation);
    }

    function _calcAvailabilityRangeForStaticManifest(streams) {
        // Static Range Finder. We iterate over all periods and return the total duration
        const range = {start: NaN, end: NaN};
        let duration = 0;
        let start = NaN;
        streams.forEach((stream) => {
            const streamInfo = stream.getStreamInfo();
            duration += streamInfo.duration;

            if (isNaN(start) || streamInfo.start < start) {
                start = streamInfo.start;
            }
        });

        range.start = start;
        range.end = start + duration;

        return range;
    }

    function _calcAvailabilityRangeForDynamicManifest(streams, voRepresentation) {
        const range = {start: NaN, end: NaN};
        const voPeriod = voRepresentation.adaptation.period;
        const now = calcPresentationTimeFromWallTime(new Date(), voPeriod);
        const start = now - voPeriod.mpd.timeShiftBufferDepth;

        // check if we find a suitable period for that starttime. Otherwise we use the time closest to that
        const adjustedStartTime = _findPeriodTimeForTargetTime(streams, start);
        range.start = adjustedStartTime;

        const d = voRepresentation.segmentDuration || (voRepresentation.segments && voRepresentation.segments.length ? voRepresentation.segments[voRepresentation.segments.length - 1].duration : 0);
        const endOffset = voRepresentation.availabilityTimeOffset !== undefined &&
        voRepresentation.availabilityTimeOffset < d ? d - voRepresentation.availabilityTimeOffset : d;

        const periodEnd = voPeriod.start + voPeriod.duration;
        range.end = now >= periodEnd && now - endOffset < periodEnd ? periodEnd : now - endOffset;

        return range;
    }

    function _calcAvailabilityRangeForDynamicTimelineManifest(streams, voRepresentation) {
        const range = calcSegmentAvailabilityRangeFromTimeline(voRepresentation);
        const voPeriod = voRepresentation.adaptation.period;
        const tsbd = voPeriod && voPeriod.mpd && voPeriod.mpd.timeShiftBufferDepth && !isNaN(voPeriod.mpd.timeShiftBufferDepth) ? voPeriod.mpd.timeShiftBufferDepth : NaN;

        if (isNaN(tsbd) || range.end - range.start >= tsbd) {
            return range;
        }

        // Instead of "now" we use range.end as an anchor
        range.start = _findPeriodTimeForTargetTime(streams, range.end - range.start);

        return range;
    }

    function _findPeriodTimeForTargetTime(streams, time) {
        try {
            let i = 0;
            let found = false;
            let adjustedStartTime = NaN;

            while (!found && i < streams.length) {
                const streamInfo = streams[i].getStreamInfo();

                // We found a period which contains the target time.
                if (streamInfo.start <= time && (!isFinite(streamInfo.duration) || (streamInfo.start + streamInfo.duration >= time))) {
                    adjustedStartTime = time;
                    found = true;
                }

                // The current period starts after the target time. We use the starttime of this period as adjustedtime
                if (streamInfo.start > time && (isNaN(adjustedStartTime) || streamInfo.start < adjustedStartTime)) {
                    adjustedStartTime = streamInfo.start;
                }

                i += 1;
            }

            return adjustedStartTime;
        } catch (e) {
            return time;
        }
    }

    function calcSegmentAvailabilityRangeFromTimeline(voRepresentation) {
        const adaptation = voRepresentation.adaptation.period.mpd.manifest.Period_asArray[voRepresentation.adaptation.period.index].AdaptationSet_asArray[voRepresentation.adaptation.index];
        const representation = dashManifestModel.getRepresentationFor(voRepresentation.index, adaptation);
        const timeline = representation.SegmentTemplate.SegmentTimeline;
        const timescale = representation.SegmentTemplate.timescale;
        const segments = timeline.S_asArray;
        const range = {start: 0, end: 0};
        let d = 0;
        let segment,
            repeat,
            i,
            len;

        range.start = calcPresentationTimeFromMediaTime(segments[0].t / timescale, voRepresentation);

        for (i = 0, len = segments.length; i < len; i++) {
            segment = segments[i];
            repeat = 0;
            if (segment.hasOwnProperty('r')) {
                repeat = segment.r;
            }
            d += (segment.d / timescale) * (1 + repeat);
        }

        range.end = range.start + d;

        const voPeriod = voRepresentation.adaptation.period;
        const now = calcPresentationTimeFromWallTime(new Date(), voPeriod);

        range.end = range.end > now ? now : range.end;
        range.start = voPeriod && voPeriod.mpd && voPeriod.mpd.timeShiftBufferDepth && !isNaN(voPeriod.mpd.timeShiftBufferDepth) ? Math.max(range.start, range.end - voPeriod.mpd.timeShiftBufferDepth) : range.start;

        return range;
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
        initialize,
        isTimeSyncCompleted,
        setTimeSyncCompleted,
        getClientTimeOffset,
        setClientTimeOffset,
        getExpectedLiveEdge,
        setExpectedLiveEdge,
        calcAvailabilityStartTimeFromPresentationTime,
        calcAvailabilityEndTimeFromPresentationTime,
        calcPresentationTimeFromWallTime,
        calcPresentationTimeFromMediaTime,
        calcPeriodRelativeTimeFromMpdRelativeTime,
        calcMediaTimeFromPresentationTime,
        calcSegmentAvailabilityRange,
        getPeriodEnd,
        calcWallTimeForSegment,
        calcSegmentAvailabilityRangeForAllPeriods,
        reset
    };

    setup();
    return instance;
}

TimelineConverter.__dashjs_factory_name = 'TimelineConverter';
export default FactoryMaker.getSingletonFactory(TimelineConverter);
