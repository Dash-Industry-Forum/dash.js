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
/**
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
    var VERSION = "1.4.0",
        DEFAULT_TIME_SERVER = "http://time.akamai.com/?iso",
        DEFAULT_TIME_SOURCE_SCHEME = "urn:mpeg:dash:utc:http-xsdate:2014",
        numOfParallelRequestAllowed = 0,
        system,
        abrController,
        element,
        source,
        protectionController = null,
        protectionData = null,
        streamController,
        rulesController,
        playbackController,
        metricsExt,
        metricsModel,
        videoModel,
        DOMStorage,
        initialized = false,
        playing = false,
        autoPlay = true,
        scheduleWhilePaused = false,
        bufferMax = MediaPlayer.dependencies.BufferController.BUFFER_SIZE_REQUIRED,
        useManifestDateHeaderTimeSource = true,
        UTCTimingSources = [],
        liveDelayFragmentCount = 4,
        usePresentationDelay = false,

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
            this.debug.log("Playback initiated!");
            streamController = system.getObject("streamController");
            playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, streamController);
            playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_TIME_UPDATED, streamController);
            playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_CAN_PLAY, streamController);
            playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_ERROR, streamController);
            playbackController.setLiveDelayAttributes(liveDelayFragmentCount, usePresentationDelay);

            streamController.initialize(autoPlay, protectionController, protectionData);
            DOMStorage.checkInitialBitrate();
            if (typeof source === "string") {
                streamController.load(source);
            } else {
                streamController.loadWithManifest(source);
            }
            streamController.setUTCTimingSources(UTCTimingSources, useManifestDateHeaderTimeSource);
            system.mapValue("scheduleWhilePaused", scheduleWhilePaused);
            system.mapOutlet("scheduleWhilePaused", "stream");
            system.mapOutlet("scheduleWhilePaused", "scheduleController");
            system.mapValue("numOfParallelRequestAllowed", numOfParallelRequestAllowed);
            system.mapOutlet("numOfParallelRequestAllowed", "scheduleController");
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
                playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, streamController);
                playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_TIME_UPDATED, streamController);
                playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_CAN_PLAY, streamController);
                playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_ERROR, streamController);

                streamController.reset();
                abrController.reset();
                rulesController.reset();
                playbackController.reset();
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
            abrController = system.getObject("abrController");
            rulesController = system.getObject("rulesController");
            metricsModel = system.getObject("metricsModel");
            DOMStorage = system.getObject("DOMStorage");
            playbackController = system.getObject("playbackController");
            this.restoreDefaultUTCTimingSources();
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
            type = type.toLowerCase();
            this.eventBus.addEventListener(type, listener, useCapture);
        },

        /**
         * @param type
         * @param listener
         * @param useCapture
         * @memberof MediaPlayer#
         */
        removeEventListener: function (type, listener, useCapture) {
            type = type.toLowerCase();
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
         * Use this method to access the dash.js logging class.
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
            return videoModel;
        },



        /**
         * <p>Changing this value will lower or increase live stream latency.  The detected segment duration will be multiplied by this value
         * to define a time in seconds to delay a live stream from the live edge.</p>
         * <p>Lowering this value will lower latency but may decrease the player's ability to build a stable buffer.</p>
         *
         * @param value {int} Represents how many segment durations to delay the live stream.
         * @default 4
         * @memberof MediaPlayer#
         * @see {@link MediaPlayer#useSuggestedPresentationDelay useSuggestedPresentationDelay()}
         */
        setLiveDelayFragmentCount: function(value) {
            liveDelayFragmentCount = value;
        },

        /**
         * <p>Set to true if you would like to override the default live delay and honor the SuggestedPresentationDelay attribute in by the manifest.</p>
         * @param value {boolean}
         * @default false
         * @memberof MediaPlayer#
         * @see {@link MediaPlayer#setLiveDelayFragmentCount setLiveDelayFragmentCount()}
         */
        useSuggestedPresentationDelay: function(value) {
            usePresentationDelay = value;
        },

        /**
         * Set to false if you would like to disable the last known bit rate from being stored during playback and used
         * to set the initial bit rate for subsequent playback within the expiration window.
         *
         * The default expiration is one hour, defined in milliseconds. If expired, the default initial bit rate (closest to 1000 kpbs) will be used
         * for that session and a new bit rate will be stored during that session.
         *
         * @param enable - Boolean - Will toggle if feature is enabled. True to enable, False to disable.
         * @param ttl Number - (Optional) A value defined in milliseconds representing how long to cache the bit rate for. Time to live.
         * @default enable = True, ttl = 360000 (1 hour)
         * @memberof MediaPlayer#
         *
         */
        enableLastBitrateCaching: function (enable, ttl) {
            DOMStorage.enableLastBitrateCaching(enable, ttl);
        },

        /**
         * Setting this value to something greater than 0 will result in that many parallel requests (per media type). Having concurrent request
         * may help with latency but will alter client bandwidth detection. This may slow the responsiveness of the
         * ABR heuristics.  It will also deactivate the AbandonRequestsRule, which at this time, only works accurately when parallel request are turned off.
         *
         * We do not suggest setting this value greater than 4.
         *
         * @value {int} Number of parallel request allowed at one time.
         * @default 0
         * @memberof MediaPlayer#
         *
         */
        setNumOfParallelRequestAllowed: function (value){
            numOfParallelRequestAllowed = value;
        },

        /**
         * When switching multi-bitrate content (auto or manual mode) this property specifies the maximum bitrate allowed.
         * If you set this property to a value lower than that currently playing, the switching engine will switch down to
         * satisfy this requirement. If you set it to a value that is lower than the lowest bitrate, it will still play
         * that lowest bitrate.
         *
         * You can set or remove this bitrate cap at anytime before or during playback.  To clear this setting you must use the API
         * and set the value param to NaN.
         *
         * This feature is typically used to reserve higher bitrates for playback only when the player is in large or full-screen format.
         *
         * @param type {String} 'video' or 'audio' are the type options.
         * @param value {int} Value in kbps representing the maximum bitrate allowed.
         * @memberof MediaPlayer#
         */
        setMaxAllowedBitrateFor:function(type, value) {
            abrController.setMaxAllowedBitrateFor(type, value);
        },

        /**
         * @param type {string} 'video' or 'audio' are the type options.
         * @memberof MediaPlayer#
         * @see {@link MediaPlayer#setMaxAllowedBitrateFor setMaxAllowedBitrateFor()}
         */
        getMaxAllowedBitrateFor:function(type) {
            return abrController.getMaxAllowedBitrateFor(type);
        },

        /**
         * <p>Set to false to prevent stream from auto-playing when the view is attached.</p>
         *
         * @param value {boolean}
         * @default true
         * @memberof MediaPlayer#
         * @see {@link MediaPlayer#attachView attachView()}
         *
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
         * @param type
         * @param {number} value A value of the initial bitrate, kbps
         * @memberof MediaPlayer#
         */
        setInitialBitrateFor: function(type, value) {
            abrController.setInitialBitrateFor(type, value);
        },

        /**
         * @param type
         * @returns {number} A value of the initial bitrate, kbps
         * @memberof MediaPlayer#
         */
        getInitialBitrateFor: function(type) {
            return abrController.getInitialBitrateFor(type);
        },

        /**
         * @returns {boolean} Current state of adaptive bitrate switching
         * @memberof MediaPlayer#
         *
         */
        getAutoSwitchQuality : function () {
            return abrController.getAutoSwitchBitrate();
        },

        /**
         * Set to false to switch off adaptive bitrate switching.
         *
         * @param value {boolean}
         * @default {boolean} true
         * @memberof MediaPlayer#
         */
        setAutoSwitchQuality : function (value) {
            abrController.setAutoSwitchBitrate(value);
        },

        /**
         * <p>Allows you to override the default Scheduling Rules with a custom collection.</p>
         *
         * <pre>
         * You need to use a custom context by extend DashContext.js and passing to MediaPlayer upon instantiation.
         *
         * //CustomRuleCollection code example.
         *
         *  MediaPlayer.rules.CustomRuleCollection = function () {
         *      "use strict";
         *  }
         *
         *  MediaPlayer.rules.CustomRuleCollection.prototype = new MediaPlayer.rules.ABRRulesCollection();
         *  MediaPlayer.rules.CustomRuleCollection.prototype.constructor = MediaPlayer.rules.ABRRulesCollection;
         *  MediaPlayer.rules.CustomRuleCollection.prototype.QUALITY_SWITCH_RULES = [new MediaPlayer.rules.CustomRuleCollection()];
         *
         *  MediaPlayer.rules.CustomRuleCollection.prototype = {
         *      constructor: MediaPlayer.rules.CustomRuleCollection
         *  };
         * </pre>
         *
         * @param newRulesCollection
         * @memberof MediaPlayer#
         */
        setSchedulingRules: function(newRulesCollection) {
            updateRules.call(this, rulesController.SCHEDULING_RULE, newRulesCollection, true);
        },

        /**
         * <p>Allows you to add a custom Scheduling rule to the existing stack of default rules.</p>
         *
         * <pre>
         * You need to use a custom context by extend DashContext.js and passing to MediaPlayer upon instantiation.
         *
         * //CustomRuleCollection code example.
         *
         *  MediaPlayer.rules.CustomRuleCollection = function () {
         *      "use strict";
         *  }
         *
         *  MediaPlayer.rules.CustomRuleCollection.prototype = new MediaPlayer.rules.ABRRulesCollection();
         *  MediaPlayer.rules.CustomRuleCollection.prototype.constructor = MediaPlayer.rules.ABRRulesCollection;
         *  MediaPlayer.rules.CustomRuleCollection.prototype.QUALITY_SWITCH_RULES = [new MediaPlayer.rules.CustomRuleCollection()];
         *
         *  MediaPlayer.rules.CustomRuleCollection.prototype = {
         *      constructor: MediaPlayer.rules.CustomRuleCollection
         *  };
         * </pre>
         *
         * @param newRulesCollection
         * @memberof MediaPlayer#
         */
        addSchedulingRules: function(newRulesCollection) {
            updateRules.call(this, rulesController.SCHEDULING_RULE, newRulesCollection, false);
        },

        /**
         * <p>Allows you to override the default ABR Rules with a custom collection.</p>
         *
         * <pre>
         * You need to use a custom context by extend DashContext.js and passing to MediaPlayer upon instantiation.
         *
         * //CustomRuleCollection code example.
         *
         *  MediaPlayer.rules.CustomRuleCollection = function () {
         *      "use strict";
         *  }
         *
         *  MediaPlayer.rules.CustomRuleCollection.prototype = new MediaPlayer.rules.ABRRulesCollection();
         *  MediaPlayer.rules.CustomRuleCollection.prototype.constructor = MediaPlayer.rules.ABRRulesCollection;
         *  MediaPlayer.rules.CustomRuleCollection.prototype.QUALITY_SWITCH_RULES = [new MediaPlayer.rules.CustomRuleCollection()];
         *
         *  MediaPlayer.rules.CustomRuleCollection.prototype = {
         *      constructor: MediaPlayer.rules.CustomRuleCollection
         *  };
         * </pre>
         *
         * @param newRulesCollection
         * @memberof MediaPlayer#
         */
        setABRRules: function(newRulesCollection) {
            updateRules.call(this, rulesController.ABR_RULE, newRulesCollection, true);
        },

        /**
         * <p>Allows you to add a custom ABR rule to the existing stack of default rules.</p>
         *
         * <pre>
         * You need to use a custom context by extend DashContext.js and passing to MediaPlayer upon instantiation.
         *
         * //CustomRuleCollection code example.
         *
         *  MediaPlayer.rules.CustomRuleCollection = function () {
         *      "use strict";
         *  }
         *
         *  MediaPlayer.rules.CustomRuleCollection.prototype = new MediaPlayer.rules.ABRRulesCollection();
         *  MediaPlayer.rules.CustomRuleCollection.prototype.constructor = MediaPlayer.rules.ABRRulesCollection;
         *  MediaPlayer.rules.CustomRuleCollection.prototype.QUALITY_SWITCH_RULES = [new MediaPlayer.rules.CustomRuleCollection()];
         *
         *  MediaPlayer.rules.CustomRuleCollection.prototype = {
         *      constructor: MediaPlayer.rules.CustomRuleCollection
         *  };
         * </pre>
         *
         * @param newRulesCollection
         * @memberof MediaPlayer#
         */
        addABRRules: function(newRulesCollection) {
            updateRules.call(this, rulesController.ABR_RULE, newRulesCollection, false);
        },

        /**
         * Create a ProtectionController and associated ProtectionModel for use with
         * a single piece of content.
         *
         * @return {MediaPlayer.dependencies.ProtectionController} protection controller
         */
        createProtection: function() {
            return system.getObject("protectionController");
        },

        /**
         * Allows application to retrieve a manifest
         *
         * @param {string} url the manifest url
         * @param {function} callback function that accepts two parameters.  The first is
         * a successfully parsed manifest or null, the second is a string that contains error
         * information in the case that the first parameter is null
         */
        retrieveManifest: function(url, callback) {
            (function(manifestUrl) {
                var manifestLoader = system.getObject("manifestLoader"),
                    uriQueryFragModel = system.getObject("uriQueryFragModel"),
                    cbObj = {};
                cbObj[MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED] = function(e) {
                    if (!e.error) {
                        callback(e.data.manifest);
                    } else {
                        callback(null, e.error);
                    }
                    manifestLoader.unsubscribe(MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED, this);
                };

                manifestLoader.subscribe(MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED, cbObj);
                manifestLoader.load(uriQueryFragModel.parseURI(manifestUrl));
            })(url);
        },

        /**
         * <p>Allows you to set a scheme and server source for UTC live edge detection for dynamic streams.
         * If UTCTiming is defined in the manifest, it will take precedence over any time source manually added.</p>
         * <p>If you have exposed the Date header, use the method {@link MediaPlayer#clearDefaultUTCTimingSources clearDefaultUTCTimingSources()}.
         * This will allow the date header on the manifest to be used instead of a time server</p>
         * @param {string} schemeIdUri -
         * <ul>
         * <li>urn:mpeg:dash:utc:http-head:2014</li>
         * <li>urn:mpeg:dash:utc:http-xsdate:2014</li>
         * <li>urn:mpeg:dash:utc:http-iso:2014</li>
         * <li>urn:mpeg:dash:utc:direct:2014</li>
         * </ul>
         * <p>Some specs referencing early ISO23009-1 drafts incorrectly use
         * 2012 in the URI, rather than 2014. support these for now.</p>
         * <ul>
         * <li>urn:mpeg:dash:utc:http-head:2012</li>
         * <li>urn:mpeg:dash:utc:http-xsdate:2012</li>
         * <li>urn:mpeg:dash:utc:http-iso:2012</li>
         * <li>urn:mpeg:dash:utc:direct:2012</li>
         * </ul>
         * @param {string} value - Path to a time source.
         * @default
         * <ul>
         *     <li>schemeIdUri:urn:mpeg:dash:utc:http-xsdate:2014</li>
         *     <li>value:http://time.akamai.com</li>
         * </ul>
         * @memberof MediaPlayer#
         * @see {@link MediaPlayer#removeUTCTimingSource removeUTCTimingSource()}
         */
        addUTCTimingSource: function (schemeIdUri, value){
            this.removeUTCTimingSource(schemeIdUri, value);//check if it already exists and remove if so.
            var vo = new Dash.vo.UTCTiming();
            vo.schemeIdUri = schemeIdUri;
            vo.value = value;
            UTCTimingSources.push(vo);
        },


        /**
         * <p>Allows you to remove a UTC time source. Both schemeIdUri and value need to match the Dash.vo.UTCTiming properties in order for the
         * entry to be removed from the array</p>
         * @param {string} schemeIdUri - see {@link MediaPlayer#addUTCTimingSource addUTCTimingSource()}
         * @param {string} value - see {@link MediaPlayer#addUTCTimingSource addUTCTimingSource()}
         * @memberof MediaPlayer#
         * @see {@link MediaPlayer#clearDefaultUTCTimingSources clearDefaultUTCTimingSources()}
         */
        removeUTCTimingSource: function(schemeIdUri, value) {
            UTCTimingSources.forEach(function(obj, idx){
               if (obj.schemeIdUri === schemeIdUri && obj.value === value){
                    UTCTimingSources.splice(idx, 1);
               }
            });
        },

        /**
         * <p>Allows you to clear the stored array of time sources.</p>
         * <p>Example use: If you have exposed the Date header, calling this method
         * will allow the date header on the manifest to be used instead of the time server.</p>
         * <p>Example use: Calling this method, assuming there is not an exposed date header on the manifest,  will default back
         * to using a binary search to discover the live edge</p>
         *
         * @memberof MediaPlayer#
         * @see {@link MediaPlayer#restoreDefaultUTCTimingSources restoreDefaultUTCTimingSources()}
         */
        clearDefaultUTCTimingSources: function() {
            UTCTimingSources = [];
        },

        /**
         * <p>Allows you to restore the default time sources after calling {@link MediaPlayer#clearDefaultUTCTimingSources clearDefaultUTCTimingSources()}</p>
         *
         * @default
         * <ul>
         *     <li>schemeIdUri:urn:mpeg:dash:utc:http-xsdate:2014</li>
         *     <li>value:http://time.akamai.com</li>
         * </ul>
         *
         * @memberof MediaPlayer#
         * @see {@link MediaPlayer#addUTCTimingSource addUTCTimingSource()}
         */
        restoreDefaultUTCTimingSources: function() {
            this.addUTCTimingSource(DEFAULT_TIME_SOURCE_SCHEME, DEFAULT_TIME_SERVER);
        },


        /**
         * <p>Allows you to enable the use of the Date Header, if exposed with CORS, as a timing source for live edge detection. The
         * use of the date header will happen only after the other timing source that take precedence fail or are omitted as described.
         * {@link MediaPlayer#clearDefaultUTCTimingSources clearDefaultUTCTimingSources()} </p>
         *
         * @default {boolean} True
         * @memberof MediaPlayer#
         * @see {@link MediaPlayer#addUTCTimingSource addUTCTimingSource()}
         */
        enableManifestDateHeaderTimeSource: function(value) {
            useManifestDateHeaderTimeSource = value;
        },

        /**
         * Use this method to attach an HTML5 VideoElement for dash.js to operate upon.
         *
         * @param view An HTML5 VideoElement that has already been defined in the DOM.
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
         * Use this method to set a source URL to a valid MPD manifest file OR
         * a previously downloaded and parsed manifest object.  Optionally, can
         * also provide protection information
         *
         * @param {string | object} urlOrManifest A URL to a valid MPD manifest file, or a
         * parsed manifest object.
         * @param {MediaPlayer.dependencies.ProtectionController} [protectionCtrl] optional
         * protection controller
         * @param {MediaPlayer.vo.protection.ProtectionData} [data] object containing
         * property names corresponding to key system name strings and associated
         * values being instances of
         * @throw "MediaPlayer not initialized!"
         *
         * @memberof MediaPlayer#
         */
        attachSource: function (urlOrManifest, protectionCtrl, data) {
            if (!initialized) {
                throw "MediaPlayer not initialized!";
            }

            if (typeof urlOrManifest === "string") {
                this.uriQueryFragModel.reset();
                source = this.uriQueryFragModel.parseURI(urlOrManifest);
            } else {
                source = urlOrManifest;
            }

            protectionController = protectionCtrl;
            protectionData = data;

            // TODO : update

            doReset.call(this);

            if (isReady.call(this)) {
                doAutoPlay.call(this);
            }
        },

        /**
         * Sets the MPD source and the video element to null.
         *
         * @memberof MediaPlayer#
         */
        reset: function() {
            this.attachSource(null);
            this.attachView(null);
            protectionController = null;
            protectionData = null;
        },

        /**
         * The play method initiates playback of the media defined by the {@link MediaPlayer#attachSource attachSource()} method.
         *
         * @see {@link MediaPlayer#attachSource attachSource()}
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
         * @memberof MediaPlayer#
         * @method
         */
        isReady: isReady,

        /**
         * Sets the currentTime property of the attached video element.  If it is a live stream with a
         * timeShiftBufferLength, then the DVR window offset will be automatically calculated.
         *
         * @param value {number} A relative time, in seconds, based on the return value of the {@link MediaPlayer#duration duration()} method is expected
         * @see {@link MediaPlayer#getDVRSeekOffset getDVRSeekOffset()}
         * @memberof MediaPlayer#
         * @method
         */
        seek : seek,

        /**
         * Current time of the playhead, in seconds.
         *
         * @returns {number} The current playhead time of the media.
         * @memberof MediaPlayer#
         * @method
         */
        time : time,

        /**
         * Duration of the media's playback, in seconds.
         *
         * @returns {number} The current duration of the media.
         * @memberof MediaPlayer#
         * @method
         */
        duration : duration,

        /**
         * Use this method to get the current playhead time as an absolute value, the time in seconds since midnight UTC, Jan 1 1970.
         * Note - this property only has meaning for live streams
         *
         * @returns {number} The current playhead time as UTC timestamp.
         * @memberof MediaPlayer#
         * @method
         */
        timeAsUTC : timeAsUTC,

        /**
         * Use this method to get the current duration as an absolute value, the time in seconds since midnight UTC, Jan 1 1970.
         * Note - this property only has meaning for live streams.
         *
         * @returns {number} The current duration as UTC timestamp.
         * @memberof MediaPlayer#
         * @method
         */
        durationAsUTC : durationAsUTC,

        /**
         * The timeShiftBufferLength (DVR Window), in seconds.
         *
         * @returns {number} The window of allowable play time behind the live point of a live stream.
         * @memberof MediaPlayer#
         * @method
         */
        getDVRWindowSize : getDVRWindowSize,

        /**
         * This method should only be used with a live stream that has a valid timeShiftBufferLength (DVR Window).
         * NOTE - If you do not need the raw offset value (i.e. media analytics, tracking, etc) consider using the {@link MediaPlayer#seek seek()} method
         * which will calculate this value for you and set the video element's currentTime property all in one simple call.
         *
         * @param value {number} A relative time, in seconds, based on the return value of the {@link MediaPlayer#duration duration()} method is expected.
         * @returns {number} A value that is relative the available range within the timeShiftBufferLength (DVR Window).
         * @see {@link MediaPlayer#seek seek()}
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
         * @returns {string} A formatted time and date string.
         * @memberof MediaPlayer#
         * @method
         */
        formatUTC : formatUTC,

        /**
         * A utility method which converts seconds into TimeCode (i.e. 300 --> 05:00).
         *
         * @param value {number} A number in seconds to be converted into a formatted time code.
         * @returns {string} A formatted time code string.
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
MediaPlayer.dependencies.protection.servers = {};
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
    STREAM_SWITCH_STARTED: "streamswitchstarted",
    STREAM_SWITCH_COMPLETED: "streamswitchcompleted",
    STREAM_INITIALIZED: "streaminitialized",
    TEXT_TRACK_ADDED: "texttrackadded",
    BUFFER_LOADED: "bufferloaded",
    BUFFER_EMPTY: "bufferstalled",
    ERROR: "error",
    LOG: "log"
};
