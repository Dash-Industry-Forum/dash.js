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

/*jshint -W020 */
MediaPlayer = function (aContext) {
    "use strict";

/*
 * Initialization:
 *
 * 1) Check if MediaSource is available.
 * 2) Load manifest.
 * 3) Parse manifest.
 * 4) Check if Video Element can play codecs.
 * 5) Register MediaSource with Video Element.
 * 6) Create SourceBuffers.
 * 7) Do live stuff.
 *      a. Start manifest refresh.
 *      b. Calculate live point.
 *      c. Calculate offset between availabilityStartTime and initial video timestamp.
 * 8) Start buffer managers.
 *
 * Buffer Management:
 *
 * 1) Generate metrics.
 * 2) Check if fragments should be loaded.
 * 3) Check ABR for change in quality.
 * 4) Figure out which fragments to load.
 * 5) Load fragments.
 * 6) Transform fragments.
 * 7) Push fragmemt bytes into SourceBuffer.
 */
    var VERSION = "1.2.0",
        context = aContext,
        system,
        element,
        source,
        streamController,
        videoModel,
        initialized = false,
        playing = false,
        autoPlay = true,
        scheduleWhilePaused = false,
        bufferMax = MediaPlayer.dependencies.BufferExtensions.BUFFER_SIZE_REQUIRED,

        isReady = function () {
            return (!!element && !!source);
        },

        play = function () {
            if (!initialized) {
                throw "MediaPlayer not initialized!";
            }

            if (!this.capabilities.supportsMediaSource()) {
                this.errHandler.capabilityError("mediasource");
                return;
            }

            if (!element || !source) {
                throw "Missing view or source.";
            }

            playing = true;
            //this.debug.log("Playback initiated!");
            streamController = system.getObject("streamController");
            streamController.setVideoModel(videoModel);
            streamController.setAutoPlay(autoPlay);
            streamController.load(source);

            system.mapValue("scheduleWhilePaused", scheduleWhilePaused);
            system.mapOutlet("scheduleWhilePaused", "stream");
            system.mapOutlet("scheduleWhilePaused", "bufferController");
            system.mapValue("bufferMax", bufferMax);
            system.injectInto(this.bufferExt, "bufferMax");
        },

        doAutoPlay = function () {
            if (isReady()) {
                play.call(this);
            }
        },

        getDVRInfoMetric = function() {
            var metric = this.metricsModel.getReadOnlyMetricsFor('video') || this.metricsModel.getReadOnlyMetricsFor('audio');
            return this.metricsExt.getCurrentDVRInfo(metric);
        },

        getDVRWindowSize = function() {
            return getDVRInfoMetric.call(this).mpd.timeShiftBufferDepth;
        },

        getDVRSeekOffset = function (value) {
            var metric = getDVRInfoMetric.call(this),
                val = metric.range.start + parseInt(value);

            if (val > metric.range.end)
            {
                val = metric.range.end;
            }

            return val;
        },

        seek = function(value) {

            videoModel.getElement().currentTime = this.getDVRSeekOffset(value);
        },

        time = function () {
            var metric = getDVRInfoMetric.call(this);
            return (metric === null) ? 0 : Math.round(this.duration() - (metric.range.end - metric.time));
        },

        duration  = function() {
            var metric = getDVRInfoMetric.call(this),
                range;

            if (metric === null){
                return 0;
            }

            range = metric.range.end - metric.range.start;

            return Math.round(range < metric.mpd.timeShiftBufferDepth ? range : metric.mpd.timeShiftBufferDepth);
        },

        timeAsUTC = function () {
            var metric = getDVRInfoMetric.call(this),
                availabilityStartTime,
                currentUTCTime;

            if (metric === null){
                return 0;
            }

            availabilityStartTime = metric.mpd.availabilityStartTime.getTime() / 1000;
            currentUTCTime = this.time() + (availabilityStartTime + metric.range.start);

            return Math.round(currentUTCTime);
        },

        durationAsUTC = function () {
            var metric = getDVRInfoMetric.call(this),
                availabilityStartTime,
                currentUTCDuration;

            if (metric === null){
                return 0;
            }

            availabilityStartTime = metric.mpd.availabilityStartTime.getTime() / 1000;
            currentUTCDuration = (availabilityStartTime + metric.range.start) + this.duration();

            return Math.round(currentUTCDuration);
        },

        formatUTC = function (time, locales, hour12) {
            var dt = new Date(time*1000);
            var d = dt.toLocaleDateString(locales);
            var t = dt.toLocaleTimeString(locales, {hour12:hour12});
            return t +' '+d;
        },

        convertToTimeCode = function (value) {
            value = Math.max(value, 0);

            var h = Math.floor(value/3600);
            var m = Math.floor((value%3600)/60);
            var s = Math.floor((value%3600)%60);
            return (h === 0 ? "":(h<10 ? "0"+h.toString()+":" : h.toString()+":"))+(m<10 ? "0"+m.toString() : m.toString())+":"+(s<10 ? "0"+s.toString() : s.toString());
        };



    // Set up DI.
    system = new dijon.System();
    system.mapValue("system", system);
    system.mapOutlet("system");
    system.injectInto(context);

    return {
        debug: undefined,
        eventBus: undefined,
        capabilities: undefined,
        abrController: undefined,
        metricsModel: undefined,
        metricsExt: undefined,
        bufferExt: undefined,
        errHandler: undefined,
        tokenAuthentication:undefined,
        uriQueryFragModel:undefined,

        addEventListener: function (type, listener, useCapture) {
            this.eventBus.addEventListener(type, listener, useCapture);
        },

        removeEventListener: function (type, listener, useCapture) {
            this.eventBus.removeEventListener(type, listener, useCapture);
        },

        getVersion: function () {
            return VERSION;
        },

        startup: function () {
            if (!initialized) {
                system.injectInto(this);
                initialized = true;
            }
        },

        getDebug: function () {
            return this.debug;
        },

        getVideoModel: function () {
            return videoModel;
        },

        setAutoPlay: function (value) {
            autoPlay = value;
        },

        getAutoPlay: function () {
            return autoPlay;
        },

        setScheduleWhilePaused: function(value) {
            scheduleWhilePaused = value;
        },

        getScheduleWhilePaused: function() {
            return scheduleWhilePaused;
        },

        setTokenAuthentication:function(name, type) {
            this.tokenAuthentication.setTokenAuthentication({name:name, type:type});
        },
        setBufferMax: function(value) {
            bufferMax = value;
        },

        getBufferMax: function() {
            return bufferMax;
        },

        getMetricsExt: function () {
            return this.metricsExt;
        },

        getMetricsFor: function (type) {
            var metrics = this.metricsModel.getReadOnlyMetricsFor(type);
            return metrics;
        },

        getQualityFor: function (type) {
            return this.abrController.getQualityFor(type);
        },

        setQualityFor: function (type, value) {
            this.abrController.setPlaybackQuality(type, value);
        },

        getAutoSwitchQuality : function () {
            return this.abrController.getAutoSwitchBitrate();
        },

        setAutoSwitchQuality : function (value) {
            this.abrController.setAutoSwitchBitrate(value);
        },

        attachView: function (view) {
            if (!initialized) {
                throw "MediaPlayer not initialized!";
            }

            element = view;

            videoModel = null;
            if (element) {
                videoModel = system.getObject("videoModel");
                videoModel.setElement(element);
            }

            // TODO : update

            if (playing && streamController) {
                streamController.reset();
                streamController = null;
                playing = false;
            }

            if (isReady.call(this)) {
                doAutoPlay.call(this);
            }
        },

        attachSource: function (url) {
            if (!initialized) {
                throw "MediaPlayer not initialized!";
            }

            source = this.uriQueryFragModel.parseURI(url);
            this.setQualityFor('video', 0);
            this.setQualityFor('audio', 0);

            // TODO : update

            if (playing && streamController) {
                streamController.reset();
                streamController = null;
                playing = false;
            }

            if (isReady.call(this)) {
                doAutoPlay.call(this);
            }
        },

        reset: function() {
            this.attachSource(null);
            this.attachView(null);
        },

        play: play,
        isReady: isReady,
        seek : seek,
        time : time,
        duration : duration,
        timeAsUTC : timeAsUTC,
        durationAsUTC : durationAsUTC,
        getDVRWindowSize : getDVRWindowSize,
        getDVRSeekOffset : getDVRSeekOffset,
        formatUTC : formatUTC,
        convertToTimeCode : convertToTimeCode

    };
};

MediaPlayer.prototype = {
    constructor: MediaPlayer
};

MediaPlayer.dependencies = {};
MediaPlayer.utils = {};
MediaPlayer.models = {};
MediaPlayer.vo = {};
MediaPlayer.vo.metrics = {};
MediaPlayer.rules = {};
MediaPlayer.di = {};
