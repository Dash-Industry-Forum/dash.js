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
import Constants from '../../streaming/constants/Constants';
import MediaPlayerEvents from '../../streaming/MediaPlayerEvents';
import ConformanceViolationConstants from '../../streaming/constants/ConformanceViolationConstants';

function TimelineConverter() {

    const context = this.context;
    const eventBus = EventBus(context).getInstance();
    const settings = Settings(context).getInstance();

    let instance,
        dashManifestModel,
        timelineAnchorAvailabilityOffset, // In case we calculate the TSBD using _calcTimeShiftBufferWindowForDynamicTimelineManifest we use the segments as anchor times. We apply this offset when calculating if a segment is available or not.
        clientServerTimeShift;

    function setup() {
        dashManifestModel = DashManifestModel(context).getInstance();
        reset();
    }

    function initialize() {
        resetInitialSettings();
        eventBus.on(Events.UPDATE_TIME_SYNC_OFFSET, _onUpdateTimeSyncOffset, this);
    }

    function getClientTimeOffset() {
        return clientServerTimeShift;
    }

    function setClientTimeOffset(value) {
        clientServerTimeShift = value;
    }

    /**
     * Returns a "now" reference time for the client to compare the availability time of a segment against.
     * Takes the client/server drift into account
     */
    function getClientReferenceTime() {
        return Date.now() - (timelineAnchorAvailabilityOffset * 1000) + (clientServerTimeShift * 1000);
    }

    function _calcAvailabilityTimeFromPresentationTime(presentationEndTime, representation, isDynamic, calculateAvailabilityEndTime) {
        let availabilityTime;
        let mpd = representation.adaptation.period.mpd;
        const availabilityStartTime = mpd.availabilityStartTime;

        if (calculateAvailabilityEndTime) {
            //@timeShiftBufferDepth specifies the duration of the time shifting buffer that is guaranteed
            // to be available for a Media Presentation with type 'dynamic'.
            // When not present, the value is infinite.
            if (isDynamic && mpd.timeShiftBufferDepth !== Number.POSITIVE_INFINITY) {
                // SAET = SAST + TSBD + seg@duration
                availabilityTime = new Date(availabilityStartTime.getTime() + ((presentationEndTime + mpd.timeShiftBufferDepth) * 1000));
            } else {
                availabilityTime = mpd.availabilityEndTime;
            }
        } else {
            if (isDynamic) {
                // SAST = Period@start + seg@presentationStartTime + seg@duration
                // ASAST = SAST - ATO
                const availabilityTimeOffset = representation.availabilityTimeOffset;
                // presentationEndTime = Period@start + seg@presentationStartTime + Segment@duration
                availabilityTime = new Date(availabilityStartTime.getTime() + (presentationEndTime - availabilityTimeOffset) * 1000);
            } else {
                // in static mpd, all segments are available at the same time
                availabilityTime = availabilityStartTime;
            }
        }

        return availabilityTime;
    }

    function calcAvailabilityStartTimeFromPresentationTime(presentationEndTime, representation, isDynamic) {
        return _calcAvailabilityTimeFromPresentationTime(presentationEndTime, representation, isDynamic);
    }

    function calcAvailabilityEndTimeFromPresentationTime(presentationEndTime, representation, isDynamic) {
        return _calcAvailabilityTimeFromPresentationTime(presentationEndTime, representation, isDynamic, true);
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

    /**
     * Calculates the timeshiftbuffer range. This range might overlap multiple periods and is not limited to period boundaries. However, we make sure that the range is potentially covered by period.
     * @param {Array} streams
     * @param {boolean} isDynamic
     * @return {}
     */
    function calcTimeShiftBufferWindow(streams, isDynamic) {
        // Static manifests. The availability window is equal to the DVR window
        if (!isDynamic) {
            return _calcTimeshiftBufferForStaticManifest(streams);
        }

        // Specific use case of SegmentTimeline
        if (settings.get().streaming.timeShiftBuffer.calcFromSegmentTimeline) {
            const data = _calcTimeShiftBufferWindowForDynamicTimelineManifest(streams);
            _adjustTimelineAnchorAvailabilityOffset(data.now, data.range);

            return data.range;
        }

        return _calcTimeShiftBufferWindowForDynamicManifest(streams);
    }

    function _calcTimeshiftBufferForStaticManifest(streams) {
        // Static Range Finder. We iterate over all periods and return the total duration
        const range = { start: NaN, end: NaN };
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

    function _calcTimeShiftBufferWindowForDynamicManifest(streams) {
        const range = { start: NaN, end: NaN };

        if (!streams || streams.length === 0) {
            return range;
        }

        const voPeriod = streams[0].getAdapter().getRegularPeriods()[0];
        const now = calcPresentationTimeFromWallTime(new Date(), voPeriod);
        const timeShiftBufferDepth = voPeriod.mpd.timeShiftBufferDepth;
        const start = !isNaN(timeShiftBufferDepth) ? now - timeShiftBufferDepth : 0;
        // check if we find a suitable period for that starttime. Otherwise we use the time closest to that
        range.start = _adjustTimeBasedOnPeriodRanges(streams, start);
        range.end = !isNaN(range.start) && now < range.start ? now : _adjustTimeBasedOnPeriodRanges(streams, now, true);

        if (!isNaN(timeShiftBufferDepth) && range.end < now - timeShiftBufferDepth) {
            range.end = NaN;
        }

        // If we have SegmentTimeline as a reference we can verify that the calculated DVR window is at least partially included in the DVR window exposed by the timeline.
        // If that is not the case we stick to the DVR window defined by SegmentTimeline
        if (settings.get().streaming.timeShiftBuffer.fallbackToSegmentTimeline) {
            const timelineRefData = _calcTimeShiftBufferWindowForDynamicTimelineManifest(streams);
            if (timelineRefData.range.end < range.start) {
                eventBus.trigger(MediaPlayerEvents.CONFORMANCE_VIOLATION, {
                    level: ConformanceViolationConstants.LEVELS.WARNING,
                    event: ConformanceViolationConstants.EVENTS.INVALID_DVR_WINDOW
                });
                _adjustTimelineAnchorAvailabilityOffset(timelineRefData.now, timelineRefData.range);
                return timelineRefData.range;
            }
        }

        return range;
    }

    function _calcTimeShiftBufferWindowForDynamicTimelineManifest(streams) {
        const range = { start: NaN, end: NaN };
        const voPeriod = streams[0].getAdapter().getRegularPeriods()[0];
        const now = calcPresentationTimeFromWallTime(new Date(), voPeriod);

        if (!streams || streams.length === 0) {
            return { range, now };
        }

        streams.forEach((stream) => {
            const adapter = stream.getAdapter();
            const mediaInfo = adapter.getMediaInfoForType(stream.getStreamInfo(), Constants.VIDEO) || adapter.getMediaInfoForType(stream.getStreamInfo(), Constants.AUDIO);
            const voRepresentations = adapter.getVoRepresentations(mediaInfo);
            const voRepresentation = voRepresentations[0];
            let periodRange = { start: NaN, end: NaN };

            if (voRepresentation) {
                if (voRepresentation.segmentInfoType === DashConstants.SEGMENT_TIMELINE) {
                    periodRange = _calcRangeForTimeline(voRepresentation);
                } else {
                    const currentVoPeriod = voRepresentation.adaptation.period;
                    periodRange.start = currentVoPeriod.start;
                    periodRange.end = Math.max(now, currentVoPeriod.start + currentVoPeriod.duration);
                }
            }

            if (!isNaN(periodRange.start) && (isNaN(range.start) || range.start > periodRange.start)) {
                range.start = periodRange.start;
            }
            if (!isNaN(periodRange.end) && (isNaN(range.end) || range.end < periodRange.end)) {
                range.end = periodRange.end;
            }
        });


        range.end = Math.min(now, range.end);
        const adjustedEndTime = _adjustTimeBasedOnPeriodRanges(streams, range.end, true);

        // if range is NaN all periods are in the future. we should return range.start > range.end in this case
        range.end = isNaN(adjustedEndTime) ? range.end : adjustedEndTime;

        range.start = voPeriod && voPeriod.mpd && voPeriod.mpd.timeShiftBufferDepth && !isNaN(voPeriod.mpd.timeShiftBufferDepth) && !isNaN(range.end) ? Math.max(range.end - voPeriod.mpd.timeShiftBufferDepth, range.start) : range.start;
        range.start = _adjustTimeBasedOnPeriodRanges(streams, range.start);

        return { range, now };
    }

    function _adjustTimelineAnchorAvailabilityOffset(now, range) {
        timelineAnchorAvailabilityOffset = now - range.end;
    }

    function _adjustTimeBasedOnPeriodRanges(streams, time, isEndOfDvrWindow = false) {
        try {
            let i = 0;
            let found = false;
            let adjustedTime = NaN;

            while (!found && i < streams.length) {
                const streamInfo = streams[i].getStreamInfo();

                // We found a period which contains the target time.
                if (streamInfo.start <= time && (!isFinite(streamInfo.duration) || (streamInfo.start + streamInfo.duration >= time))) {
                    adjustedTime = time;
                    found = true;
                }

                // Adjust the time for the start of the DVR window. The current period starts after the target time. We use the starttime of this period as adjusted time
                else if (!isEndOfDvrWindow && (streamInfo.start > time && (isNaN(adjustedTime) || streamInfo.start < adjustedTime))) {
                    adjustedTime = streamInfo.start;
                }

                // Adjust the time for the end of the DVR window. The current period ends before the targettime. We use the end time of this period as the adjusted time
                else if (isEndOfDvrWindow && ((streamInfo.start + streamInfo.duration) < time && (isNaN(adjustedTime) || (streamInfo.start + streamInfo.duration > adjustedTime)))) {
                    adjustedTime = streamInfo.start + streamInfo.duration;
                }

                i += 1;
            }

            return adjustedTime;
        } catch (e) {
            return time;
        }
    }

    function _calcRangeForTimeline(voRepresentation) {
        const adaptation = voRepresentation.adaptation.period.mpd.manifest.Period_asArray[voRepresentation.adaptation.period.index].AdaptationSet_asArray[voRepresentation.adaptation.index];
        const representation = dashManifestModel.getRepresentationFor(voRepresentation.index, adaptation);
        const timeline = representation.SegmentTemplate.SegmentTimeline;
        const timescale = representation.SegmentTemplate.timescale;
        const segments = timeline.S_asArray;
        const range = { start: 0, end: 0 };
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

        return range;
    }

    function calcPeriodRelativeTimeFromMpdRelativeTime(representation, mpdRelativeTime) {
        const periodStartTime = representation.adaptation.period.start;
        return mpdRelativeTime - periodStartTime;
    }

    function _onUpdateTimeSyncOffset(e) {
        if (e.offset !== undefined && !isNaN(e.offset)) {
            setClientTimeOffset(e.offset / 1000);
        }
    }

    function resetInitialSettings() {
        clientServerTimeShift = 0;
        timelineAnchorAvailabilityOffset = 0;
    }

    function reset() {
        eventBus.off(Events.UPDATE_TIME_SYNC_OFFSET, _onUpdateTimeSyncOffset, this);
        resetInitialSettings();
    }

    instance = {
        initialize,
        getClientTimeOffset,
        setClientTimeOffset,
        getClientReferenceTime,
        calcAvailabilityStartTimeFromPresentationTime,
        calcAvailabilityEndTimeFromPresentationTime,
        calcPresentationTimeFromWallTime,
        calcPresentationTimeFromMediaTime,
        calcPeriodRelativeTimeFromMpdRelativeTime,
        calcMediaTimeFromPresentationTime,
        calcWallTimeForSegment,
        calcTimeShiftBufferWindow,
        reset
    };

    setup();
    return instance;
}

TimelineConverter.__dashjs_factory_name = 'TimelineConverter';
export default FactoryMaker.getSingletonFactory(TimelineConverter);
