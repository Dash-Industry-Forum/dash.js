/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Digital Primates
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
Dash.dependencies.TimelineConverter = function () {
    "use strict";

    var clientServerTimeShift = 0,
        isClientServerTimeSyncCompleted = false,
        expectedLiveEdge = NaN,

        calcAvailabilityTimeFromPresentationTime = function (presentationTime, mpd, isDynamic, calculateEnd) {
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
        },

        calcAvailabilityStartTimeFromPresentationTime = function(presentationTime, mpd, isDynamic) {
            return calcAvailabilityTimeFromPresentationTime.call(this, presentationTime, mpd, isDynamic);
        },

        calcAvailabilityEndTimeFromPresentationTime = function (presentationTime, mpd, isDynamic) {
            return calcAvailabilityTimeFromPresentationTime.call(this, presentationTime, mpd, isDynamic, true);
        },

        calcPresentationTimeFromWallTime = function (wallTime, period) {
            return ((wallTime.getTime() - period.mpd.availabilityStartTime.getTime() + clientServerTimeShift * 1000) / 1000);
        },

        calcPresentationTimeFromMediaTime = function (mediaTime, representation) {
            var periodStart = representation.adaptation.period.start,
                presentationOffset = representation.presentationTimeOffset;

            return mediaTime + (periodStart - presentationOffset);
        },

        calcMediaTimeFromPresentationTime = function (presentationTime, representation) {
            var periodStart = representation.adaptation.period.start,
                presentationOffset = representation.presentationTimeOffset;

            return presentationTime - periodStart + presentationOffset;
        },

        calcWallTimeForSegment = function (segment, isDynamic) {
            var suggestedPresentationDelay,
                displayStartTime,
                wallTime;

            if (isDynamic) {
                suggestedPresentationDelay = segment.representation.adaptation.period.mpd.suggestedPresentationDelay;
                displayStartTime = segment.presentationStartTime + suggestedPresentationDelay;
                wallTime = new Date(segment.availabilityStartTime.getTime() + (displayStartTime * 1000));
            }

            return wallTime;
        },

        calcSegmentAvailabilityRange = function(representation, isDynamic) {
            var start = representation.adaptation.period.start,
                end = start + representation.adaptation.period.duration,
                range = {start: start, end: end},
                checkTime,
                now;

            if (!isDynamic) return range;

            if (!isClientServerTimeSyncCompleted && representation.segmentAvailabilityRange) {
                return representation.segmentAvailabilityRange;
            }

            checkTime = representation.adaptation.period.mpd.checkTime;
            now = calcPresentationTimeFromWallTime(new Date((new Date().getTime())), representation.adaptation.period);
            //the Media Segment list is further restricted by the CheckTime together with the MPD attribute
            // MPD@timeShiftBufferDepth such that only Media Segments for which the sum of the start time of the
            // Media Segment and the Period start time falls in the interval [NOW- MPD@timeShiftBufferDepth - @duration, min(CheckTime, NOW)] are included.
            start = Math.max((now - representation.adaptation.period.mpd.timeShiftBufferDepth), 0);
            end = isNaN(checkTime) ? now : Math.min(checkTime, now);
            range = {start: start, end: end};

            return range;
        },

        calcPeriodRelativeTimeFromMpdRelativeTime = function(representation, mpdRelativeTime) {
            var periodStartTime = representation.adaptation.period.start;

            return mpdRelativeTime - periodStartTime;
        },

        calcMpdRelativeTimeFromPeriodRelativeTime = function(representation, periodRelativeTime) {
            var periodStartTime = representation.adaptation.period.start;

            return periodRelativeTime + periodStartTime;
        },

        onLiveEdgeSearchCompleted = function(e) {
            if (isClientServerTimeSyncCompleted || e.error) return;

            // the difference between expected and actual live edge time is supposed to be a difference between client
            // and server time as well
            clientServerTimeShift = e.data.liveEdge - (expectedLiveEdge + e.data.searchTime);
            isClientServerTimeSyncCompleted = true;
        },

        onTimeSyncComplete = function (e) {
            if (isClientServerTimeSyncCompleted || e.error) {
                return;
            }

            clientServerTimeShift = e.data.offset / 1000;

            isClientServerTimeSyncCompleted = true;
        },

        calcMSETimeOffset = function (representation) {
            // The MSEOffset is offset from AST for media. It is Period@start - presentationTimeOffset
            var presentationOffset = representation.presentationTimeOffset;
            var periodStart = representation.adaptation.period.start;
            return (periodStart - presentationOffset);
        },

        reset = function() {
            clientServerTimeShift = 0;
            isClientServerTimeSyncCompleted = false;
            expectedLiveEdge = NaN;
        };

    return {

        setup: function() {
            this[MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED] = onLiveEdgeSearchCompleted;
            this[MediaPlayer.dependencies.TimeSyncController.eventList.ENAME_TIME_SYNCHRONIZATION_COMPLETED] = onTimeSyncComplete;
        },

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
        reset: reset,

        isTimeSyncCompleted: function() {
            return isClientServerTimeSyncCompleted;
        },

        getClientTimeOffset: function() {
            return clientServerTimeShift;
        },

        getExpectedLiveEdge: function() {
            return expectedLiveEdge;
        },

        setExpectedLiveEdge: function(value) {
            expectedLiveEdge = value;
        }
    };
};

Dash.dependencies.TimelineConverter.prototype = {
    constructor: Dash.dependencies.TimelineConverter
};
