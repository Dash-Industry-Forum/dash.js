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
                    availabilityTime = new Date(mpd.availabilityStartTime.getTime() + (presentationTime * 1000));
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

        calcPresentationStartTime = function (period) {
            var presentationStartTime,
                isDynamic;

            isDynamic = period.mpd.manifest.type === "dynamic";

            if (isDynamic) {
                presentationStartTime = period.liveEdge;
            } else {
                presentationStartTime = period.start;
            }

            return presentationStartTime;
        },

        calcPresentationTimeFromWallTime = function (wallTime, period) {
            return ((wallTime.getTime() - period.mpd.availabilityStartTime.getTime()) / 1000) + period.start;
        },

        calcPresentationTimeFromMediaTime = function (mediaTime, representation) {
            var periodStart = representation.adaptation.period.start,
                presentationOffset = representation.presentationTimeOffset;

            return (periodStart - presentationOffset) + mediaTime;
        },

        calcMediaTimeFromPresentationTime = function (presentationTime, representation) {
            var periodStart = representation.adaptation.period.start,
                presentationOffset = representation.presentationTimeOffset;

            return (periodStart + presentationOffset + presentationTime);
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

        calcActualPresentationTime = function(representation, currentTime, isDynamic) {
            var self = this,
                availabilityWindow = self.calcSegmentAvailabilityRange(representation, isDynamic),
                actualTime;

            if ((currentTime >= availabilityWindow.start) && (currentTime <= availabilityWindow.end)) {
                return currentTime;
            }

            actualTime = Math.max(availabilityWindow.end - representation.adaptation.period.mpd.manifest.minBufferTime * 2, availabilityWindow.start);

            return actualTime;
        },

        calcSegmentAvailabilityRange = function(representation, isDynamic) {
            var duration = representation.segmentDuration,
                start = representation.adaptation.period.start,
                end = start + representation.adaptation.period.duration,
                range = {start: start, end: end},
                checkTime,
                now;

            if (!isDynamic) return range;

            if ((!isClientServerTimeSyncCompleted || isNaN(duration)) && representation.segmentAvailabilityRange) {
                return representation.segmentAvailabilityRange;
            }

            checkTime = representation.adaptation.period.mpd.checkTime;
            now = calcPresentationTimeFromWallTime(new Date((new Date().getTime()) + clientServerTimeShift), representation.adaptation.period);
            //the Media Segment list is further restricted by the CheckTime together with the MPD attribute
            // MPD@timeShiftBufferDepth such that only Media Segments for which the sum of the start time of the
            // Media Segment and the Period start time falls in the interval [NOW- MPD@timeShiftBufferDepth - @duration, min(CheckTime, NOW)] are included.
            start = Math.max((now - representation.adaptation.period.mpd.timeShiftBufferDepth - duration), 0);
            checkTime -= duration - (clientServerTimeShift / 1000);
            now -= duration;
            end = isNaN(checkTime) ? now : Math.min(checkTime, now);
            range = {start: start, end: end};

            return range;
        },

        liveEdgeFound = function(expectedLiveEdge, actualLiveEdge, period) {
            if (period.isClientServerTimeSyncCompleted) return;

            // the difference between expected and actual live edge time is supposed to be a difference between client
            // and server time as well
            period.clientServerTimeShift = actualLiveEdge - expectedLiveEdge;
            period.isClientServerTimeSyncCompleted = true;
            clientServerTimeShift = period.clientServerTimeShift * 1000;
            isClientServerTimeSyncCompleted = true;
        },

        calcMSETimeOffset = function (representation) {
            var periodStart = representation.adaptation.period.start,
                presentationOffset = representation.presentationTimeOffset;

            return (periodStart - presentationOffset);
        };

    return {
        system: undefined,
        debug: undefined,

        setup: function() {
            this.system.mapHandler("liveEdgeFound", undefined, liveEdgeFound.bind(this));
        },

        calcAvailabilityStartTimeFromPresentationTime: calcAvailabilityStartTimeFromPresentationTime,
        calcAvailabilityEndTimeFromPresentationTime: calcAvailabilityEndTimeFromPresentationTime,
        calcPresentationTimeFromWallTime: calcPresentationTimeFromWallTime,
        calcPresentationTimeFromMediaTime: calcPresentationTimeFromMediaTime,
        calcPresentationStartTime: calcPresentationStartTime,
        calcActualPresentationTime: calcActualPresentationTime,
        calcMediaTimeFromPresentationTime: calcMediaTimeFromPresentationTime,
        calcSegmentAvailabilityRange: calcSegmentAvailabilityRange,
        calcWallTimeForSegment: calcWallTimeForSegment,
        calcMSETimeOffset: calcMSETimeOffset
    };
};

Dash.dependencies.TimelineConverter.prototype = {
    constructor: Dash.dependencies.TimelineConverter
};