/**
 * @copyright The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Digital Primates
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * @license THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * @class MediaPlayer
 * @param context - New instance of a dijon.js context (i.e. new Dash.di.DashContext()).  You can pass a custom context that extends Dash.di.DashContext to override item(s) in the DashContext.
 */
/*jshint -W020 */
MediaPlayer = function (context) {

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
    var VERSION = "1.3.0",
        system,
        manifestLoader,
        abrController,
        element,
        source,
        protectionData = null,
        streamController,
        rulesController,
        manifestUpdater,
        metricsExt,
        metricsModel,
        videoModel,
        initialized = false,
        playing = false,
        autoPlay = true,
        scheduleWhilePaused = false,
        bufferMax = MediaPlayer.dependencies.BufferController.BUFFER_SIZE_REQUIRED,

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
            streamController.subscribe(MediaPlayer.dependencies.StreamController.eventList.ENAME_STREAMS_COMPOSED, manifestUpdater);
            manifestLoader.subscribe(MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED, streamController);
            manifestLoader.subscribe(MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED, manifestUpdater);
            streamController.initialize();
            streamController.setVideoModel(videoModel);
            streamController.setAutoPlay(autoPlay);
            streamController.setProtectionData(protectionData);
            streamController.load(source);

            system.mapValue("scheduleWhilePaused", scheduleWhilePaused);
            system.mapOutlet("scheduleWhilePaused", "stream");
            system.mapOutlet("scheduleWhilePaused", "scheduleController");
            system.mapValue("bufferMax", bufferMax);
            system.mapOutlet("bufferMax", "bufferController");

            rulesController.initialize();
        },

        doAutoPlay = function () {
            if (isReady()) {
                play.call(this);
            }
        },

        getDVRInfoMetric = function() {
            var metric = metricsModel.getReadOnlyMetricsFor('video') || metricsModel.getReadOnlyMetricsFor('audio');
            return metricsExt.getCurrentDVRInfo(metric);
        },

        getDVRWindowSize = function() {
            return getDVRInfoMetric.call(this).manifestInfo.DVRWindowSize;
        },

        getDVRSeekOffset = function (value) {
            var metric = getDVRInfoMetric.call(this),
                val  = metric.range.start + value;

            if (val > metric.range.end) {
                val = metric.range.end;
            }

            return val;
        },

        seek = function(value) {
            this.getVideoModel().getElement().currentTime = this.getDVRSeekOffset(value);
        },

        time = function () {
            var metric = getDVRInfoMetric.call(this);
            return (metric === null) ? 0 : this.duration() - (metric.range.end - metric.time);
        },

        duration  = function () {
            var metric = getDVRInfoMetric.call(this),
                range;

            if (metric === null) {
                return 0;
            }

            range = metric.range.end - metric.range.start;

            return range < metric.manifestInfo.DVRWindowSize ? range : metric.manifestInfo.DVRWindowSize;
        },

        getAsUTC = function(valToConvert) {
            var metric = getDVRInfoMetric.call(this),
                availableFrom,
                utcValue;

            if (metric === null) {
                return 0;
            }

            availableFrom = metric.manifestInfo.availableFrom.getTime() / 1000;

            utcValue = valToConvert + (availableFrom + metric.range.start);

            return utcValue;
        },

        timeAsUTC = function () {
            return getAsUTC.call(this, this.time());
        },

        durationAsUTC = function () {
            return getAsUTC.call(this, this.duration());
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
        },

        updateRules = function(type, rules, override) {
            if (!rules || (type === undefined) || type === null) return;

            if (override) {
                rulesController.setRules(type, rules);
            } else {
                rulesController.addRules(type, rules);
            }
        },

        doReset = function() {
            if (playing && streamController) {
                streamController.unsubscribe(MediaPlayer.dependencies.StreamController.eventList.ENAME_STREAMS_COMPOSED, manifestUpdater);
                manifestLoader.unsubscribe(MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED, streamController);
                manifestLoader.unsubscribe(MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED, manifestUpdater);
                streamController.reset();
                abrController.reset();
                rulesController.reset();
                streamController = null;
                playing = false;
            }
        };

    // Overload dijon getObject function
    var _getObject = dijon.System.prototype.getObject;
    dijon.System.prototype.getObject = function(name) {
        var obj = _getObject.call(this, name);
        if (typeof obj === "object" && !obj.getName) {
            obj.getName = function () {return name;};
            obj.setMediaType = function (mediaType) {obj.mediaType = mediaType;};
            obj.getMediaType = function () {return obj.mediaType;};
        }
        return obj;
    };

    // Set up DI.
    system = new dijon.System();
    system.mapValue("system", system);
    system.mapOutlet("system");
    system.injectInto(context);

    return {
        notifier: undefined,
        debug: undefined,
        eventBus: undefined,
        capabilities: undefined,
        adapter: undefined,
        errHandler: undefined,
        uriQueryFragModel:undefined,
        videoElementExt:undefined,

        setup: function() {
            metricsExt = system.getObject("metricsExt");
            manifestLoader = system.getObject("manifestLoader");
            manifestUpdater = system.getObject("manifestUpdater");
            abrController = system.getObject("abrController");
            rulesController = system.getObject("rulesController");
            metricsModel = system.getObject("metricsModel");
        },

        /**
         *
         *
         * @param type
         * @param listener
         * @param useCapture
         * @memberof MediaPlayer#
         *
         */
        addEventListener: function (type, listener, useCapture) {
            this.eventBus.addEventListener(type, listener, useCapture);
        },

        /**
         * @param type
         * @param listener
         * @param useCapture
         * @memberof MediaPlayer#
         */
        removeEventListener: function (type, listener, useCapture) {
            this.eventBus.removeEventListener(type, listener, useCapture);
        },

        /**
         * @returns {string} the current dash.js version string.
         * @memberof MediaPlayer#
         */
        getVersion: function () {
            return VERSION;
        },

        /**
         * @memberof MediaPlayer#
         */
        startup: function () {
            if (!initialized) {
                system.injectInto(this);
                initialized = true;
            }
        },

        /**
         * Use this method to access the dash.js debugger.
         *
         * @returns {@link MediaPlayer.utils.Debug Debug.js (Singleton)}
         * @memberof MediaPlayer#
         */
        getDebug: function () {
            return this.debug;
        },

        /**
         * @returns {@link VideoModel}
         * @memberof MediaPlayer#
         */
        getVideoModel: function () {
            var streamInfo = streamController ? streamController.getActiveStreamInfo() : null,
                stream = streamInfo ? streamController.getStreamById(streamInfo.id) : null;

            return (stream ? stream.getVideoModel() : videoModel);
        },

        /**
         * @param value
         * @memberof MediaPlayer#
         */
        setAutoPlay: function (value) {
            autoPlay = value;
        },

        /**
         * @returns {boolean} The current autoPlay state.
         * @memberof MediaPlayer#
         */
        getAutoPlay: function () {
            return autoPlay;
        },

        /**
         * @param value
         * @memberof MediaPlayer#
         */
        setScheduleWhilePaused: function(value) {
            scheduleWhilePaused = value;
        },

        /**
         * @returns {boolean}
         * @memberof MediaPlayer#
         */
        getScheduleWhilePaused: function() {
            return scheduleWhilePaused;
        },

        /**
         * @param value
         * @memberof MediaPlayer#
         */
        setBufferMax: function(value) {
            bufferMax = value;
        },

        /**
         * @returns {string}
         * @memberof MediaPlayer#
         */
        getBufferMax: function() {
            return bufferMax;
        },

        /**
         * @returns {object}
         * @memberof MediaPlayer#
         */
        getMetricsExt: function () {
            return metricsExt;
        },

        /**
         * @param type
         * @returns {object}
         * @memberof MediaPlayer#
         */
        getMetricsFor: function (type) {
            return metricsModel.getReadOnlyMetricsFor(type);
        },

        /**
         * @param type
         * @returns {object}
         * @memberof MediaPlayer#
         */
        getQualityFor: function (type) {
            return abrController.getQualityFor(type, streamController.getActiveStreamInfo());
        },

        /**
         * @param type
         * @param value
         * @memberof MediaPlayer#
         */
        setQualityFor: function (type, value) {
            abrController.setPlaybackQuality(type, streamController.getActiveStreamInfo(), value);
        },

        /**
         * @param type
         * @returns {Array}
         * @memberof MediaPlayer#
         */
        getBitrateInfoListFor: function(type) {
            var streamInfo = streamController.getActiveStreamInfo(),
                stream = streamController.getStreamById(streamInfo.id);

            return stream.getBitrateListFor(type);
        },

        /**
         * @returns {object}
         * @memberof MediaPlayer#
         */
        getAutoSwitchQuality : function () {
            return abrController.getAutoSwitchBitrate();
        },

        /**
         * @param value
         * @memberof MediaPlayer#
         */
        setAutoSwitchQuality : function (value) {
            abrController.setAutoSwitchBitrate(value);
        },

        /**
         * @param newRulesCollection
         * @memberof MediaPlayer#
         */
        setSchedulingRules: function(newRulesCollection) {
            updateRules.call(this, rulesController.SCHEDULING_RULE, newRulesCollection, true);
        },

        /**
         * @param newRulesCollection
         * @memberof MediaPlayer#
         */
        addSchedulingRules: function(newRulesCollection) {
            updateRules.call(this, rulesController.SCHEDULING_RULE, newRulesCollection, false);
        },

        /**
         * @param newRulesCollection
         * @memberof MediaPlayer#
         */
        setABRRules: function(newRulesCollection) {
            updateRules.call(this, rulesController.ABR_RULE, newRulesCollection, true);
        },

        /**
         * @param newRulesCollection
         * @memberof MediaPlayer#
         */
        addABRRules: function(newRulesCollection) {
            updateRules.call(this, rulesController.ABR_RULE, newRulesCollection, false);
        },

        /**
         * Use this method to attach an HTML5 VideoElement for dash.js to operate upon.
         *
         * @param view An HTML5 VideoElement that has already defined in the DOM.
         *
         * @memberof MediaPlayer#
         */
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

            doReset.call(this);

            if (isReady.call(this)) {
                doAutoPlay.call(this);
            }
        },

        /**
         * Use this method to set a source URL to a valid MPD manifest file.
         *
         * @param {string} url A URL to a valid MPD manifest file.
         * @throw "MediaPlayer not initialized!"
         *
         * @memberof MediaPlayer#
         */
        attachSource: function (url) {
            if (!initialized) {
                throw "MediaPlayer not initialized!";
            }

            this.uriQueryFragModel.reset();
            source = this.uriQueryFragModel.parseURI(url);

            // TODO : update

            doReset.call(this);

            if (isReady.call(this)) {
                doAutoPlay.call(this);
            }
        },

        /**
         * Attach KeySystem-specific data to use for License Acquisition with EME
         * @param data and object containing property names corresponding to key
         * system name strings and associated values being instances of
         * MediaPlayer.vo.protection.ProtectionData
         */
        attachProtectionData: function(data) {
            protectionData = data;
        },

        /**
         * Sets the MPD source and the video element to null.
         *
         * @memberof MediaPlayer#
         */
        reset: function() {
            this.attachSource(null);
            this.attachView(null);
        },

        /**
         * The play method initiates playback of the media defined by the {@link MediaPlayer#attachSource attachSource()} method.
         *
         * @see {@link MediaPlayer#attachSource attachSource()}
         *
         * @memberof MediaPlayer#
         * @method
         */
        play: play,

        /**
         * The ready state of the MediaPlayer based on both the video element and MPD source being defined.
         *
         * @returns {boolean} The current ready state of the MediaPlayer
         * @see {@link MediaPlayer#attachView attachView()}
         * @see {@link MediaPlayer#attachSource attachSource()}
         *
         * @memberof MediaPlayer#
         * @method
         */
        isReady: isReady,

        /**
         * Sets the currentTime property of the attached video element.  If it is a live stream with a
         * timeShiftBufferLength, then the DVR window offset will be automatically calculated.
         *
         * @param {number} value A relative time, in seconds, based on the return value of the {@link MediaPlayer#duration duration()} method is expected
         * @see {@link MediaPlayer#getDVRSeekOffset getDVRSeekOffset()}
         *
         * @memberof MediaPlayer#
         * @method
         */
        seek : seek,

        /**
         * Current time of the playhead, in seconds.
         *
         * @returns {number} Returns the current playhead time of the media.
         *
         * @memberof MediaPlayer#
         * @method
         */
        time : time,

        /**
         * Duration of the media's playback, in seconds.
         *
         * @returns {number} Returns the current duration of the media.
         *
         * @memberof MediaPlayer#
         * @method
         */
        duration : duration,

        /**
         * Use this method to get the current playhead time as an absolute value, the time in seconds since midnight UTC, Jan 1 1970.
         * Note - this property only has meaning for live streams
         *
         * @returns {number} Returns the current playhead time as UTC timestamp.
         *
         * @memberof MediaPlayer#
         * @method
         */
        timeAsUTC : timeAsUTC,

        /**
         * Use this method to get the current duration as an absolute value, the time in seconds since midnight UTC, Jan 1 1970.
         * Note - this property only has meaning for live streams.
         *
         * @returns {number} Returns the current duration as UTC timestamp.
         *
         * @memberof MediaPlayer#
         * @method
         */
        durationAsUTC : durationAsUTC,

        /**
         * The timeShiftBufferLength (DVR Window), in seconds.
         *
         * @returns {number} The window of allowable play time behind the live point of a live stream.
         *
         * @memberof MediaPlayer#
         * @method
         */
        getDVRWindowSize : getDVRWindowSize,

        /**
         * This method should only be used with a live stream that has a valid timeShiftBufferLength (DVR Window).
         * NOTE - If you do not need the raw offset value (i.e. media analytics, tracking, etc) consider using the {@link MediaPlayer#seek seek()} method
         * which will calculate this value for you and set the video element's currentTime property all in one simple call.
         *
         * @param {number} value A relative time, in seconds, based on the return value of the {@link MediaPlayer#duration duration()} method is expected.
         * @returns A value that is relative the available range within the timeShiftBufferLength (DVR Window).
         *
         * @see {@link MediaPlayer#seek seek()}
         *
         * @memberof MediaPlayer#
         * @method
         */
        getDVRSeekOffset : getDVRSeekOffset,

        /**
         * A utility methods which converts UTC timestamp value into a valid time and date string.
         *
         * @param {number} time - UTC timestamp to be converted into date and time.
         * @param {string} locales - a region identifier (i.e. en_US).
         * @param {boolean} hour12 - 12 vs 24 hour. Set to true for 12 hour time formatting.
         * @returns {string} a formatted time and date string.
         *
         * @memberof MediaPlayer#
         * @method
         */
        formatUTC : formatUTC,

        /**
         * A utility method which converts seconds into TimeCode (i.e. 300 --> 05:00).
         *
         * @param value - A number in seconds to be converted into a time code format.
         * @returns {string} A formatted time code string.
         *
         * @memberof MediaPlayer#
         * @method
         */
        convertToTimeCode : convertToTimeCode

    };
};

MediaPlayer.prototype = {
    constructor: MediaPlayer
};

MediaPlayer.dependencies = {};
MediaPlayer.dependencies.protection = {};
MediaPlayer.utils = {};
MediaPlayer.models = {};
MediaPlayer.vo = {};
MediaPlayer.vo.metrics = {};
MediaPlayer.vo.protection = {};
MediaPlayer.rules = {};
MediaPlayer.di = {};

/**
 * The list of events supported by MediaPlayer
 */
MediaPlayer.events = {
    METRICS_CHANGED: "metricschanged",
    METRIC_CHANGED: "metricchanged",
    METRIC_UPDATED: "metricupdated",
    METRIC_ADDED: "metricadded",
    MANIFEST_LOADED: "manifestloaded",
    SWITCH_STREAM: "streamswitched",
    STREAM_INITIALIZED: "streaminitialized",
    TEXT_TRACK_ADDED: "texttrackadded",
    BUFFER_LOADED: "bufferloaded",
    BUFFER_EMPTY: "bufferstalled",
    ERROR: "error",
    LOG: "log"
};