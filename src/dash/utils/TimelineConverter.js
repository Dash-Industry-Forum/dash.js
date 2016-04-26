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

        clientServerTimeShift = 0;
        isClientServerTimeSyncCompleted = false;
        expectedLiveEdge = NaN;

        eventBus.on(Events.LIVE_EDGE_SEARCH_COMPLETED, onLiveEdgeSearchCompleted, this);
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

    function getExpectedLiveEdge() {
        return expectedLiveEdge;
    }

    function setExpectedLiveEdge(value) {
        expectedLiveEdge = value;
    }

    function calcAvailabilityTimeFromPresentationTime(presentationTime, mpd, isDynamic, calculateEnd) {
        var availabilityTime = NaN;

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
        var periodStart = representation.adaptation.period.start;
        var presentationOffset = representation.presentationTimeOffset;

        return mediaTime + (periodStart - presentationOffset);
    }

    function calcMediaTimeFromPresentationTime(presentationTime, representation) {
        var periodStart = representation.adaptation.period.start;
        var presentationOffset = representation.presentationTimeOffset;

        return presentationTime - periodStart + presentationOffset;
    }

    function calcWallTimeForSegment(segment, isDynamic) {
        var suggestedPresentationDelay,
            displayStartTime,
            wallTime;

        if (isDynamic) {
            suggestedPresentationDelay = segment.representation.adaptation.period.mpd.suggestedPresentationDelay;
            displayStartTime = segment.presentationStartTime + suggestedPresentationDelay;
            wallTime = new Date(segment.availabilityStartTime.getTime() + (displayStartTime * 1000));
        }

        return wallTime;
    }

    function calcSegmentAvailabilityRange(representation, isDynamic) {
        var start = representation.adaptation.period.start;
        var end = start + representation.adaptation.period.duration;
        var range = { start: start, end: end };
        var d = representation.segmentDuration || ((representation.segments && representation.segments.length) ? representation.segments[representation.segments.length - 1].duration : 0);

        var checkTime,
            now;

        if (!isDynamic) return range;

        if (!isClientServerTimeSyncCompleted && representation.segmentAvailabilityRange) {
            return representation.segmentAvailabilityRange;
        }

        checkTime = representation.adaptation.period.mpd.checkTime;
        now = calcPresentationTimeFromWallTime(new Date(), representation.adaptation.period);
        //the Media Segment list is further restricted by the CheckTime together with the MPD attribute
        // MPD@timeShiftBufferDepth such that only Media Segments for which the sum of the start time of the
        // Media Segment and the Period start time falls in the interval [NOW- MPD@timeShiftBufferDepth - @duration, min(CheckTime, NOW)] are included.
        start = Math.max((now - representation.adaptation.period.mpd.timeShiftBufferDepth), representation.adaptation.period.start);
        var timeAnchor = (isNaN(checkTime) ? now : Math.min(checkTime, now));
        var periodEnd = representation.adaptation.period.start + representation.adaptation.period.duration;
        end = (timeAnchor >= periodEnd  && (timeAnchor - d) < periodEnd ? periodEnd : timeAnchor) - d;
        //end = (isNaN(checkTime) ? now : Math.min(checkTime, now)) - d;
        range = {start: start, end: end};

        return range;
    }

    function calcPeriodRelativeTimeFromMpdRelativeTime(representation, mpdRelativeTime) {
        var periodStartTime = representation.adaptation.period.start;
        return mpdRelativeTime - periodStartTime;
    }

    function calcMpdRelativeTimeFromPeriodRelativeTime(representation, periodRelativeTime) {
        var periodStartTime = representation.adaptation.period.start;

        return periodRelativeTime + periodStartTime;
    }

    function onLiveEdgeSearchCompleted(e) {
        if (isClientServerTimeSyncCompleted || e.error) return;

        // the difference between expected and actual live edge time is supposed to be a difference between client
        // and server time as well
        clientServerTimeShift += e.liveEdge - (expectedLiveEdge + e.searchTime);
        isClientServerTimeSyncCompleted = true;
    }

    function onTimeSyncComplete(e) {
        if (isClientServerTimeSyncCompleted || e.error) {
            return;
        }

        clientServerTimeShift = e.offset / 1000;

        isClientServerTimeSyncCompleted = true;
    }

    function calcMSETimeOffset(representation) {
        // The MSEOffset is offset from AST for media. It is Period@start - presentationTimeOffset
        var presentationOffset = representation.presentationTimeOffset;
        var periodStart = representation.adaptation.period.start;
        return (periodStart - presentationOffset);
    }

    function reset() {
        eventBus.off(Events.LIVE_EDGE_SEARCH_COMPLETED, onLiveEdgeSearchCompleted, this);
        eventBus.off(Events.TIME_SYNCHRONIZATION_COMPLETED, onTimeSyncComplete, this);
        clientServerTimeShift = 0;
        isClientServerTimeSyncCompleted = false;
        expectedLiveEdge = NaN;
    }

    instance = {
        initialize: initialize,
        isTimeSyncCompleted: isTimeSyncCompleted,
        setTimeSyncCompleted: setTimeSyncCompleted,
        getClientTimeOffset: getClientTimeOffset,
        getExpectedLiveEdge: getExpectedLiveEdge,
        setExpectedLiveEdge: setExpectedLiveEdge,
        calcAvailabilityStartTimeFromPresentationTime: calcAvailabilityStartTimeFromPresentationTime,
        calcAvailabilityEndTimeFromPresentationTime: calcAvailabilityEndTimeFromPresentationTime,
        calcPresentationTimeFromWallTime: calcPresentationTimeFromWallTime,
        calcPresentationTimeFromMediaTime: calcPresentationTimeFromMediaTime,
        calcPeriodRelativeTimeFromMpdRelativeTime: calcPeriodRelativeTimeFromMpdRelativeTime,
        calcMpdRelativeTimeFromPeriodRelativeTime: calcMpdRelativeTimeFromPeriodRelativeTime,
        calcMediaTimeFromPresentationTime: calcMediaTimeFromPresentationTime,
        calcSegmentAvailabilityRange: calcSegmentAvailabilityRange,
        calcWallTimeForSegment: calcWallTimeForSegment,
        calcMSETimeOffset: calcMSETimeOffset,
        reset: reset
    };

    return instance;
}

TimelineConverter.__dashjs_factory_name = 'TimelineConverter';
export default FactoryMaker.getSingletonFactory(TimelineConverter);