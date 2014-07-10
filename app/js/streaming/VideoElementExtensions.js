/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2014, Akamai Technologies
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.dependencies.VideoElementExtensions = function () {
    "use strict";

    var getDVRInfoMetric = function() {
            return this.metricsExt.getCurrentDVRInfo(this.metricsModel.getReadOnlyMetricsFor('video'));
        },

        isDVR = function () {
            return !isNaN(getDVRInfoMetric.call(this).mpd.timeShiftBufferDepth);
        },

        dvrWindowTime = function() {
            return getDVRInfoMetric.call(this).mpd.timeShiftBufferDepth;
        },

        totalRunningTime = function () {
            return getDVRInfoMetric.call(this).time; // This may not work anymore since elemental encoder change.  Need to figure this one out or remove it.
        },

        getSeekValue = function (value) {
            // I will want to return value without modification if called from a VOD stream.
            var metric = getDVRInfoMetric.call(this),
                val = metric.range.start + parseInt(value);

            if (val > metric.range.end)
            {
                val = metric.range.end;
            }

            return val;
        },

        time = function () {
            // I will want to return currentTime from video element for VOD streams so player dev can just call this one spot to drive a custom video UI
            // This will produce a relative time withing the DVR range.
            var metric = getDVRInfoMetric.call(this);
            return Math.round(this.duration() - (metric.range.end - metric.time));
        },

        duration  = function() {
            // I will want to return duration from video element for VOD streams so player dev can just call this one spot to drive a custom video UI
            var metric = getDVRInfoMetric.call(this);
            return metric.range.end < metric.mpd.timeShiftBufferDepth ? metric.range.end : metric.mpd.timeShiftBufferDepth;
        },

        timeAsUTC = function () {
            var metric = getDVRInfoMetric.call(this);
            return (metric.mpd.availabilityStartTime.getTime() / 1000) + this.time();
        },

        durationAsUTC = function () {
            var metric = getDVRInfoMetric.call(this);
            return metric.mpd.availabilityEndTime !== Number.POSITIVE_INFINITY ? metric.mpd.availabilityEndTime.getTime() : (metric.mpd.availabilityStartTime.getTime() / 1000) + this.dvrWindowTime();
        },

        convertUTCToDate = function (t) {
            return new Date(t*1000);
        },

        timeCode = function (sec) {
            sec = Math.max(sec, 0);

            var h = Math.floor(sec/3600);
            var m = Math.floor((sec%3600)/60);
            var s = Math.floor((sec%3600)%60);
            return (h === 0 ? "":(h<10 ? "0"+h.toString()+":" : h.toString()+":"))+(m<10 ? "0"+m.toString() : m.toString())+":"+(s<10 ? "0"+s.toString() : s.toString());
        };

    return {
        metricsModel:undefined,
        metricsExt:undefined,
        isDVR : isDVR,
        dvrWindowTime : dvrWindowTime,
        totalRunningTime : totalRunningTime,
        getSeekValue : getSeekValue,
        time : time,
        duration : duration,
        timeAsUTC : timeAsUTC,
        durationAsUTC : durationAsUTC,
        convertUTCToDate : convertUTCToDate,
        timeCode : timeCode
    };
};

MediaPlayer.dependencies.VideoElementExtensions.prototype = {
    constructor: MediaPlayer.dependencies.VideoElementExtensions
};