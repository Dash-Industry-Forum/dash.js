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

import EventBus from "./utils/EventBus.js";
import DashAdapter from "../dash/DashAdapter.js";

class MediaPlayer{

    

    constructor(context) {

            this.VERSION = "1.5.1";
            this.numOfParallelRequestAllowed = 0;
            //this.system;
            this.abrController;
            this.mediaController;
            this.element;
            this.source;
            this.protectionController = null;
            this.protectionData = null;
            this.streamController;
            this.rulesController;
            this.playbackController;
            this.metricsExt;
            this.metricsModel;
            this.videoModel;
            this.textSourceBuffer;
            this.DOMStorage;
            this.initialized = false;
            this.resetting = false;
            this.playing = false;
            this.autoPlay = true;
            this.scheduleWhilePaused = false;
            //this.bufferMax = MediaPlayer.dependencies.BufferController.BUFFER_SIZE_REQUIRED;
            this.useManifestDateHeaderTimeSource = true;
            this.UTCTimingSources = [];
            this.liveDelayFragmentCount = 4;
            this.usePresentationDelay = false;





            // Overload dijon getObject function
            //var _getObject = dijon.System.prototype.getObject;
            //dijon.System.prototype.getObject = function(name) {
            //    var obj = _getObject.call(this, name);
            //    if (typeof obj === "object" && !obj.getName) {
            //        obj.getName = function () {return name;};
            //        obj.setMediaType = function (mediaType) {obj.mediaType = mediaType;};
            //        obj.getMediaType = function () {return obj.mediaType;};
            //    }
            //    return obj;
            //};

            // Set up DI.
            this.system = new dijon.System();
            this.system.mapValue("system", this.system);
            this.system.mapOutlet("system");

            //// Dash.di.Context makes calls to Debug in its setup() function, so we need to
            //// map it here and explicitly inject Debug before we do a global inject into context
            var debug = new MediaPlayer.utils.Debug();
            this.system.mapValue("debug", debug);
            this.system.mapOutlet("debug");
            this.system.injectInto(debug);
            debug.setup();
            this.system.injectInto(context);



            this.notifier = undefined;
            this.debug = undefined;
            this.capabilities = undefined;
            this.adapter = undefined;
            this.errHandler = undefined;
            this.uriQueryFragModel = undefined;
            this.videoElementExt = undefined;

    }



    isReady() {
        return (!!this.element && !!this.source && !this.resetting);
    }

    play() {
        if (!this.initialized) {
            throw "MediaPlayer not initialized!";
        }

        if (!this.capabilities.supportsMediaSource()) {
            this.errHandler.capabilityError("mediasource");
            return;
        }

        if (!this.element || !this.source) {
            throw "Missing view or source.";
        }

        this.playing = true;
        this.debug.log("Playback initiated!");
        this.streamController = this.system.getObject("streamController");
        this.playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, this.streamController);
        this.playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_TIME_UPDATED, this.streamController);
        this.playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_CAN_PLAY, this.streamController);
        this.playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_ERROR, this.streamController);
        this.playbackController.setLiveDelayAttributes(this.liveDelayFragmentCount, this.usePresentationDelay);

        this.system.mapValue("liveDelayFragmentCount", this.liveDelayFragmentCount);
        this.system.mapOutlet("liveDelayFragmentCount", "trackController");

        this.streamController.initialize(this.autoPlay, this.protectionController, this.protectionData);
        this.DOMStorage.checkInitialBitrate();
        if (typeof this.source === "string") {
            this.streamController.load(this.source);
        } else {
            this.streamController.loadWithManifest(this.source);
        }
        this.streamController.setUTCTimingSources(this.UTCTimingSources, this.useManifestDateHeaderTimeSource);
        this.system.mapValue("scheduleWhilePaused", this.scheduleWhilePaused);
        this.system.mapOutlet("scheduleWhilePaused", "stream");
        this.system.mapOutlet("scheduleWhilePaused", "scheduleController");
        this.system.mapValue("numOfParallelRequestAllowed", this.numOfParallelRequestAllowed);
        this.system.mapOutlet("numOfParallelRequestAllowed", "scheduleController");
        //system.mapValue("bufferMax", bufferMax);
        //system.mapOutlet("bufferMax", "bufferController");

        this.rulesController.initialize();
    }

    doAutoPlay() {
        if (this.isReady()) {
            this.play();
        }
    }

    getDVRInfoMetric() {
        var metric = this.metricsModel.getReadOnlyMetricsFor('video') || this.metricsModel.getReadOnlyMetricsFor('audio');
        return this.metricsExt.getCurrentDVRInfo(metric);
    }

    getDVRWindowSize() {
        return this.getDVRInfoMetric.call(this).manifestInfo.DVRWindowSize;
    }

    getDVRSeekOffset(value) {
        var metric = this.getDVRInfoMetric.call(this),
            val  = metric.range.start + value;

        if (val > metric.range.end) {
            val = metric.range.end;
        }

        return val;
    }

    seek(value) {
        var s = this.playbackController.getIsDynamic() ? this.getDVRSeekOffset(value) : value;
        this.getVideoModel().setCurrentTime(s);
    }

    time() {
        var t = this.videoModel.getCurrentTime();

        if (this.playbackController.getIsDynamic()) {
            var metric = this.getDVRInfoMetric.call(this);
            t = (metric === null) ? 0 : this.duration() - (metric.range.end - metric.time);
        }
        return t;
    }

    duration() {
        var d = this.videoModel.getElement().duration;

        if (this.playbackController.getIsDynamic()) {

            var metric = this.getDVRInfoMetric.call(this),
                range;

            if (metric === null) {
                return 0;
            }

            range = metric.range.end - metric.range.start;
            d = range < metric.manifestInfo.DVRWindowSize ? range : metric.manifestInfo.DVRWindowSize;
        }
        return d;
    }

    getAsUTC(valToConvert) {
        var metric = this.getDVRInfoMetric.call(this),
            availableFrom,
            utcValue;

        if (metric === null) {
            return 0;
        }

        availableFrom = metric.manifestInfo.availableFrom.getTime() / 1000;

        utcValue = valToConvert + (availableFrom + metric.range.start);

        return utcValue;
    }

    timeAsUTC() {
        return this.getAsUTC.call(this, this.time());
    }

    durationAsUTC() {
        return this.getAsUTC.call(this, this.duration());
    }

    formatUTC(time, locales, hour12) {
        var dt = new Date(time*1000);
        var d = dt.toLocaleDateString(locales);
        var t = dt.toLocaleTimeString(locales, {hour12:hour12});
        return t +' '+d;
    }

    convertToTimeCode(value) {
        value = Math.max(value, 0);

        var h = Math.floor(value/3600);
        var m = Math.floor((value%3600)/60);
        var s = Math.floor((value%3600)%60);
        return (h === 0 ? "":(h<10 ? "0"+h.toString()+":" : h.toString()+":"))+(m<10 ? "0"+m.toString() : m.toString())+":"+(s<10 ? "0"+s.toString() : s.toString());
    }

    updateRules(type, rules, override) {
        if (!rules || (type === undefined) || type === null) return;

        if (override) {
            rulesController.setRules(type, rules);
        } else {
            rulesController.addRules(type, rules);
        }
    }

    getActiveStream() {
        var streamInfo = streamController.getActiveStreamInfo();

        return streamInfo ? streamController.getStreamById(streamInfo.id) : null;
    }

    resetAndPlay () {
        this.adapter.reset();
        if (this.playing && this.streamController) {
            if (!this.resetting) {
                this.resetting = true;
                this.this.playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, streamController);
                this.this.playbthis.this.ackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_TIME_UPDATED, streamController);
                this.this.playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_CAN_PLAY, streamController);
                this.this.playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_ERROR, streamController);

                var teardownComplete = {},
                        self = this;
                teardownComplete[MediaPlayer.dependencies.StreamController.eventList.ENAME_TEARDOWN_COMPLETE] = function () {

                    // Finish rest of shutdown process
                    this.abrController.reset();
                    this.rulesController.reset();
                    this.playbackController.reset();
                    this.mediaController.reset();
                    this.streamController = null;
                    this.playing = false;
                    this.resetting = false;
                    if (this.isReady.call(self)) {
                        this.doAutoPlay.call(self);
                    }
                };
                this.streamController.subscribe(MediaPlayer.dependencies.StreamController.eventList.ENAME_TEARDOWN_COMPLETE, teardownComplete, undefined, true);
                this.streamController.reset();
            }
        } else {
            if (this.isReady.call(this)) {
                this.doAutoPlay.call(this);
            }
        }
    }


    setup() {
        this.metricsExt = this.system.getObject("metricsExt");
        this.abrController = this.system.getObject("abrController");
        this.rulesController = this.system.getObject("rulesController");
        this.metricsModel = this.system.getObject("metricsModel");
        this.DOMStorage = this.system.getObject("DOMStorage");
        this.playbackController = this.system.getObject("playbackController");
        this.mediaController = this.system.getObject("mediaController");
        this.restoreDefaultUTCTimingSources();
        this.debug.log("[dash.js "+ this.VERSION +"] " + "new MediaPlayer instance has been created");
    }

    /**
     *
     *
     * @param type
     * @param listener
     * @param useCapture
     * @memberof MediaPlayer#
     *
     */
    addEventListener(type, listener, useCapture) {
        type = type.toLowerCase();
        eventBus.addEventListener(type, listener, useCapture);
    }

    /**
     * @param type
     * @param listener
     * @param useCapture
     * @memberof MediaPlayer#
     */
    removeEventListener(type, listener, useCapture) {
        type = type.toLowerCase();
        eventBus.removeEventListener(type, listener, useCapture);
    }

    /**
     * @returns {string} the current dash.js version string.
     * @memberof MediaPlayer#
     */
    getVersion() {
        return VERSION;
    }

    /**
     * @returns {Object} An instance of system object based on the string name in Context.js or DashContext.js
     * @memberof MediaPlayer#
     */
    getObjectByContextName(name) {
        return system.getObject(name);
    }

    /**
     * @memberof MediaPlayer#
     */
    startup() {
        if (!this.initialized) {
            this.system.injectInto(this);
            this.initialized = true;
        }
    }

    /**
     * Use this method to access the dash.js logging class.
     *
     * @returns {@link MediaPlayer.utils.Debug Debug.js (Singleton)}
     * @memberof MediaPlayer#
     */
    getDebug () {
        return this.debug;
    }

    /**
     * @returns {@link VideoModel}
     * @memberof MediaPlayer#
     */
    getVideoModel () {
        return this.videoModel;
    }

    /**
     * @returns {@link object}
     * @memberof MediaPlayer#
     */
    getVideoContainer () {
        return this.videoModel ? this.videoModel.getVideoContainer() : null;
    }

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
    setLiveDelayFragmentCount (value) {
        this.liveDelayFragmentCount = value;
    }

    /**
     * <p>Set to true if you would like to override the default live delay and honor the SuggestedPresentationDelay attribute in by the manifest.</p>
     * @param value {boolean}
     * @default false
     * @memberof MediaPlayer#
     * @see {@link MediaPlayer#setLiveDelayFragmentCount setLiveDelayFragmentCount()}
     */
    useSuggestedPresentationDelay (value) {
        this.usePresentationDelay = value;
    }

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
    enableLastBitrateCaching (enable, ttl) {
        this.DOMStorage.enableLastBitrateCaching(enable, ttl);
    }

    /**
     * Set to false if you would like to disable the last known lang for audio (or camera angle for video) from being stored during playback and used
     * to set the initial settings for subsequent playback within the expiration window.
     *
     * The default expiration is one hour, defined in milliseconds. If expired, the default settings will be used
     * for that session and a new settings will be stored during that session.
     *
     * @param enable - Boolean - Will toggle if feature is enabled. True to enable, False to disable.
     * @param ttl Number - (Optional) A value defined in milliseconds representing how long to cache the settings for. Time to live.
     * @default enable = True, ttl = 360000 (1 hour)
     * @memberof MediaPlayer#
     *
     */
    enableLastMediaSettingsCaching (enable, ttl) {
        this.DOMStorage.enableLastMediaSettingsCaching(enable, ttl);
    }

    ///**
    // * Setting this value to something greater than 0 will result in that many parallel requests (per media type). Having concurrent request
    // * may help with latency but will alter client bandwidth detection. This may slow the responsiveness of the
    // * ABR heuristics.  It will also deactivate the AbandonRequestsRule, which at this time, only works accurately when parallel request are turned off.
    // *
    // * We do not suggest setting this value greater than 4.
    // *
    // * @value {int} Number of parallel request allowed at one time.
    // * @default 0
    // * @memberof MediaPlayer#
    // *
    // */
    //setNumOfParallelRequestAllowed (value){
    //    this.numOfParallelRequestAllowed = value;
    //}

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
    setMaxAllowedBitrateFor (type, value) {
        this.abrController.setMaxAllowedBitrateFor(type, value);
    }

    /**
     * @param type {string} 'video' or 'audio' are the type options.
     * @memberof MediaPlayer#
     * @see {@link MediaPlayer#setMaxAllowedBitrateFor setMaxAllowedBitrateFor()}
     */
    getMaxAllowedBitrateFor (type) {
        return this.abrController.getMaxAllowedBitrateFor(type);
    }

    /**
     * <p>Set to false to prevent stream from auto-playing when the view is attached.</p>
     *
     * @param value {boolean}
     * @default true
     * @memberof MediaPlayer#
     * @see {@link MediaPlayer#attachView attachView()}
     *
     */
    setAutoPlay (value) {
        this.autoPlay = value;
    }

    /**
     * @returns {boolean} The current autoPlay state.
     * @memberof MediaPlayer#
     */
    getAutoPlay () {
        return this.autoPlay;
    }

    /**
     * @param value
     * @memberof MediaPlayer#
     */
    setScheduleWhilePaused (value) {
        this.scheduleWhilePaused = value;
    }

    /**
     * @returns {boolean}
     * @memberof MediaPlayer#
     */
    getScheduleWhilePaused () {
        return this.scheduleWhilePaused;
    }

    ///**
    // * @param value
    // * @memberof MediaPlayer#
    // */
    //setBufferMax: function(value) {
    //    bufferMax = value;
    //}
    //
    ///**
    // * @returns {string}
    // * @memberof MediaPlayer#
    // */
    //getBufferMax: function() {
    //    return bufferMax;
    //}

    /**
     * @returns {object}
     * @memberof MediaPlayer#
     */
    getMetricsExt () {
        return this.metricsExt;
    }

    /**
     * @param type
     * @returns {object}
     * @memberof MediaPlayer#
     */
    getMetricsFor (type) {
        return this.metricsModel.getReadOnlyMetricsFor(type);
    }

    /**
     * @param type
     * @returns {object}
     * @memberof MediaPlayer#
     */
    getQualityFor (type) {
        return this.abrController.getQualityFor(type, streamController.getActiveStreamInfo());
    }

    /**
     * Sets the current quality for media type instead of letting the ABR Herstics automatically selecting it..
     *
     * @param type
     * @param value
     * @memberof MediaPlayer#
     */
    setQualityFor (type, value) {
        this.abrController.setPlaybackQuality(type, streamController.getActiveStreamInfo(), value);
    }


    /**
     * Use this method to change the current text track for both external time text files and fragmented text tracks. There is no need to
     * set the track mode on the video object to switch a track when using this method.
     *
     * @param idx - Index of track based on the order of the order the tracks are added Use -1 to disable all tracks. (turn captions off).  Use MediaPlayer#MediaPlayer.events.TEXT_TRACK_ADDED.
     * @see {@link MediaPlayer#MediaPlayer.events.TEXT_TRACK_ADDED}
     * @memberof MediaPlayer#
     */
    setTextTrack (idx) {
        //For external time text file,  the only action needed to change a track is marking the track mode to showing.
        // Fragmented text tracks need the additional step of calling textSourceBuffer.setTextTrack();
        if (this.textSourceBuffer === undefined){
            this.textSourceBuffer = this.system.getObject("textSourceBuffer");
        }

        var tracks = this.element.textTracks,
            ln = tracks.length;

        for(var i=0; i < ln; i++ ){
            var track = tracks[i],
                mode = idx === i ? "showing" : "hidden";

            if (track.mode !== mode){ //checking that mode is not already set by 3rd Party player frameworks that set mode to prevent event retrigger.
                track.mode = mode;
            }
        }

        this.textSourceBuffer.setTextTrack();
    }

    /**
     * @param type
     * @returns {Array}
     * @memberof MediaPlayer#
     */
    getBitrateInfoListFor (type) {
        var stream = this.getActiveStream.call(this);

        return stream ? stream.getBitrateListFor(type) : [];
    }

    /**
     * @param type
     * @param {number} value A value of the initial bitrate, kbps
     * @memberof MediaPlayer#
     */
    setInitialBitrateFor (type, value) {
        this.abrController.setInitialBitrateFor(type, value);
    }

    /**
     * @param type
     * @returns {number} A value of the initial bitrate, kbps
     * @memberof MediaPlayer#
     */
    getInitialBitrateFor (type) {
        return this.abrController.getInitialBitrateFor(type);
    }

    /**
     * This method returns the list of all available streams from a given manifest
     * @param manifest
     * @returns {Array} list of {@link MediaPlayer.vo.StreamInfo}
     * @memberof MediaPlayer#
     */
    getStreamsFromManifest (manifest) {
        return this.adapter.getStreamsInfo(manifest);
    }

    /**
     * This method returns the list of all available tracks for a given media type
     * @param type
     * @returns {Array} list of {@link MediaPlayer.vo.MediaInfo}
     * @memberof MediaPlayer#
     */
    getTracksFor (type) {
        var streamInfo = streamController ? streamController.getActiveStreamInfo() : null;

        if (!streamInfo) return [];

        return this.mediaController.getTracksFor(type, streamInfo);
    }

    /**
     * This method returns the list of all available tracks for a given media type and streamInfo from a given manifest
     * @param type
     * @param manifest
     * @param streamInfo
     * @returns {Array} list of {@link MediaPlayer.vo.MediaInfo}
     * @memberof MediaPlayer#
     */
    getTracksForTypeFromManifest (type, manifest, streamInfo) {
        streamInfo = streamInfo || this.adapter.getStreamsInfo(manifest)[0];

        return streamInfo ? this.adapter.getAllMediaInfoForType(manifest, streamInfo, type) : [];
    }

    /**
     * @param type
     * @returns {Object} {@link MediaPlayer.vo.MediaInfo}
     * @memberof MediaPlayer#
     */
    getCurrentTrackFor (type) {
        var streamInfo = streamController ? streamController.getActiveStreamInfo() : null;

        if (!streamInfo) return null;

        return this.mediaController.getCurrentTrackFor(type, streamInfo);
    }

    /**
     * This method allows to set media settings that will be used to pick the initial track. Format of the settings
     * is following:
     * {lang: langValue,
     *  viewpoint: viewpointValue,
     *  audioChannelConfiguration: audioChannelConfigurationValue,
     *  accessibility: accessibilityValue,
     *  role: roleValue}
     *
     *
     * @param type
     * @param value {Object}
     * @memberof MediaPlayer#
     */
    setInitialMediaSettingsFor (type, value) {
        this.mediaController.setInitialSettings(type, value);
    }

    /**
     * This method returns media settings that is used to pick the initial track. Format of the settings
     * is following:
     * {lang: langValue,
     *  viewpoint: viewpointValue,
     *  audioChannelConfiguration: audioChannelConfigurationValue,
     *  accessibility: accessibilityValue,
     *  role: roleValue}
     * @param type
     * @returns {Object}
     * @memberof MediaPlayer#
     */
    getInitialMediaSettingsFor (type) {
        return this.mediaController.getInitialSettings(type);
    }

    /**
     * @param track instance of {@link MediaPlayer.vo.MediaInfo}
     * @memberof MediaPlayer#
     */
    setCurrentTrack (track) {
        this.mediaController.setTrack(track);
    }

    /**
     * This method returns the current track switch mode.
     *
     * @param type
     * @returns mode
     * @memberof MediaPlayer#
     */
    getTrackSwitchModeFor (type) {
        return this.mediaController.getSwitchMode(type);
    }

    /**
     * This method sets the current track switch mode. Available options are:
     *
     * MediaPlayer.dependencies.MediaController.trackSwitchModes.NEVER_REPLACE
     * (used to forbid clearing the buffered data (prior to current playback position) after track switch. Default for video)
     *
     * MediaPlayer.dependencies.MediaController.trackSwitchModes.ALWAYS_REPLACE
     * (used to clear the buffered data (prior to current playback position) after track switch. Default for audio)
     *
     * @param type
     * @param mode
     * @memberof MediaPlayer#
     */
    setTrackSwitchModeFor (type, mode) {
        this.mediaController.setSwitchMode(type, mode);
    }

    /**
     * This method sets the selection mode for the initial track. This mode defines how the initial track will be selected
     * if no initial media settings are set. If initial media settings are set this parameter will be ignored. Available options are:
     *
     * MediaPlayer.dependencies.MediaController.trackSelectionModes.HIGHEST_BITRATE
     * this mode makes the player select the track with a highest bitrate. This mode is a default mode.
     *
     * MediaPlayer.dependencies.MediaController.trackSelectionModes.WIDEST_RANGE
     * this mode makes the player select the track with a widest range of bitrates
     *
     * @param mode
     * @memberof MediaPlayer#
     */
    setSelectionModeForInitialTrack (mode) {
        this.mediaController.setSelectionModeForInitialTrack(mode);
    }

    /**
     * This method returns the track selection mode.
     *
     * @returns mode
     * @memberof MediaPlayer#
     */
    getSelectionModeForInitialTrack () {
        return this.mediaController.getSelectionModeForInitialTrack();
    }

    /**
     * @returns {boolean} Current state of adaptive bitrate switching
     * @memberof MediaPlayer#
     *
     */
    getAutoSwitchQuality  () {
        return this.abrController.getAutoSwitchBitrate();
    }

    /**
     * Set to false to switch off adaptive bitrate switching.
     *
     * @param value {boolean}
     * @default {boolean} true
     * @memberof MediaPlayer#
     */
    setAutoSwitchQuality  (value) {
        this.abrController.setAutoSwitchBitrate(value);
    }

    /**
     * <p>Allows you to override the default Scheduling Rules with a custom collection.</p>
     *
     * <pre>
     * You need to use a custom context by extend DashContext.js and passing to MediaPlayer upon instantiation.
     *
     * //CustomRuleCollection code example.
     *
     *  MediaPlayer.rules.CustomRuleCollection  () {
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
    setSchedulingRules (newRulesCollection) {
        this.updateRules.call(this, rulesController.SCHEDULING_RULE, newRulesCollection, true);
    }

    /**
     * <p>Allows you to add a custom Scheduling rule to the existing stack of default rules.</p>
     *
     * <pre>
     * You need to use a custom context by extend DashContext.js and passing to MediaPlayer upon instantiation.
     *
     * //CustomRuleCollection code example.
     *
     *  MediaPlayer.rules.CustomRuleCollection  () {
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
    addSchedulingRules (newRulesCollection) {
        this.updateRules.call(this, rulesController.SCHEDULING_RULE, newRulesCollection, false);
    }

    /**
     * <p>Allows you to override the default ABR Rules with a custom collection.</p>
     *
     * <pre>
     * You need to use a custom context by extend DashContext.js and passing to MediaPlayer upon instantiation.
     *
     * //CustomRuleCollection code example.
     *
     *  MediaPlayer.rules.CustomRuleCollection  () {
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
    setABRRules (newRulesCollection) {
        this.updateRules.call(this, rulesController.ABR_RULE, newRulesCollection, true);
    }

    /**
     * <p>Allows you to add a custom ABR rule to the existing stack of default rules.</p>
     *
     * <pre>
     * You need to use a custom context by extend DashContext.js and passing to MediaPlayer upon instantiation.
     *
     * //CustomRuleCollection code example.
     *
     *  MediaPlayer.rules.CustomRuleCollection  () {
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
    addABRRules (newRulesCollection) {
        this.updateRules.call(this, rulesController.ABR_RULE, newRulesCollection, false);
    }

    /**
     * Create a ProtectionController and associated ProtectionModel for use with
     * a single piece of content.
     *
     * @return {MediaPlayer.dependencies.ProtectionController} protection controller
     * @memberof MediaPlayer#
     */
    createProtection () {
        return this.system.getObject("protectionController");
    }

    /**
     * A Callback function provided when retrieving manifests
     *
     * @callback MediaPlayer~retrieveManifestCallback
     * @param {Object} manifest JSON version of the manifest XML data or null if an
     * error was encountered
     * @param {String} error An error string or null if the operation was successful
     */

    /**
     * Allows application to retrieve a manifest.  Manifest loading is asynchronous and
     * requires the app-provided callback function
     *
     * @param {string} url the manifest url
     * @param {MediaPlayer~retrieveManifestCallback} callback manifest retrieval callback
     * @memberof MediaPlayer#
     */
    retrieveManifest (url, callback) {
        //(function(manifestUrl) {
        //    var manifestLoader = this.system.getObject("manifestLoader"),
        //        uriQueryFragModel = system.getObject("uriQueryFragModel"),
        //        cbObj = {};
        //    cbObj[MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED] = function(e) {
        //        if (!e.error) {
        //            callback(e.data.manifest);
        //        } else {
        //            callback(null, e.error);
        //        }
        //        manifestLoader.unsubscribe(MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED, this);
        //    };
        //
        //    manifestLoader.subscribe(MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED, cbObj);
        //    manifestLoader.load(uriQueryFragModel.parseURI(manifestUrl));
        //})(url);
    }

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
    addUTCTimingSource (schemeIdUri, value){
        this.removeUTCTimingSource(schemeIdUri, value);//check if it already exists and remove if so.
        var vo = new Dash.vo.UTCTiming();
        vo.schemeIdUri = schemeIdUri;
        vo.value = value;
        this.UTCTimingSources.push(vo);
    }


    /**
     * <p>Allows you to remove a UTC time source. Both schemeIdUri and value need to match the Dash.vo.UTCTiming properties in order for the
     * entry to be removed from the array</p>
     * @param {string} schemeIdUri - see {@link MediaPlayer#addUTCTimingSource addUTCTimingSource()}
     * @param {string} value - see {@link MediaPlayer#addUTCTimingSource addUTCTimingSource()}
     * @memberof MediaPlayer#
     * @see {@link MediaPlayer#clearDefaultUTCTimingSources clearDefaultUTCTimingSources()}
     */
    removeUTCTimingSource (schemeIdUri, value) {
        this.UTCTimingSources.forEach(function(obj, idx){
           if (obj.schemeIdUri === schemeIdUri && obj.value === value){
                this.UTCTimingSources.splice(idx, 1);
           }
        });
    }

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
    clearDefaultUTCTimingSources () {
        this.UTCTimingSources = [];
    }

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
    restoreDefaultUTCTimingSources () {
        this.addUTCTimingSource(MediaPlayer.UTCTimingSources.default.scheme, MediaPlayer.UTCTimingSources.default.value);
    }


    /**
     * <p>Allows you to enable the use of the Date Header, if exposed with CORS, as a timing source for live edge detection. The
     * use of the date header will happen only after the other timing source that take precedence fail or are omitted as described.
     * {@link MediaPlayer#clearDefaultUTCTimingSources clearDefaultUTCTimingSources()} </p>
     *
     * @default {boolean} True
     * @memberof MediaPlayer#
     * @see {@link MediaPlayer#addUTCTimingSource addUTCTimingSource()}
     */
    enableManifestDateHeaderTimeSource (value) {
        this.useManifestDateHeaderTimeSource = value;
    }

    /**
     * This method serves to control captions z-index value. If 'true' is passed, the captions will have the highest z-index and be
     * displayed on top of other html elements. Default value is 'false' (z-index is not set).
     * @param value {Boolean}
     */
    displayCaptionsOnTop (value) {
        var textTrackExt = system.getObject("textTrackExtensions");
        this.textTrackExt.displayCConTop(value);
    }

    /**
     * Use this method to attach an HTML5 element that wraps the video element.
     *
     * @param container The HTML5 element containing the video element.
     * @memberof MediaPlayer#
     */
    attachVideoContainer (container) {
        if (!this.videoModel) {
            throw "Must call attachView with video element before you attach container element";
        }

        this.videoModel.setVideoContainer(container);
    }

    /**
     * Use this method to attach an HTML5 VideoElement for dash.js to operate upon.
     *
     * @param view An HTML5 VideoElement that has already been defined in the DOM.
     * @memberof MediaPlayer#
     */
    attachView (view) {
        if (!this.initialized) {
            throw "MediaPlayer not initialized!";
        }

        this.element = view;

        this.videoModel = null;
        if (this.element) {
            this.videoModel = this.system.getObject("videoModel");
            this.videoModel.setElement(this.element);
            // Workaround to force Firefox to fire the canplay event.
            this.element.preload = "auto";
        }

        // TODO : update
        this.resetAndPlay.call(this);
    }

    /**
     * Use this method to attach an HTML5 div for dash.js to render rich TTML subtitles.
     *
     * @param div An unstyled div placed after the video element. It will be styled to match the video size and overlay z-order.
     * @memberof MediaPlayer#
     */
    attachTTMLRenderingDiv (div) {
        if (!this.videoModel) {
            throw "Must call attachView with video element before you attach TTML Rendering Div";
        }
        this.videoModel.setTTMLRenderingDiv(div);
    }

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
    attachSource (urlOrManifest, protectionCtrl, data) {
        if (!this.initialized) {
            throw "MediaPlayer not initialized!";
        }

        if (typeof urlOrManifest === "string") {
            this.uriQueryFragModel.reset();
            this.source = this.uriQueryFragModel.parseURI(urlOrManifest);
        } else {
            this.source = urlOrManifest;
        }

        this.protectionController = protectionCtrl;
        this.protectionData = data;

        // TODO : update
        this.resetAndPlay.call(this);
    }

    /**
     * Sets the MPD source and the video element to null.
     *
     * @memberof MediaPlayer#
     */
    reset () {
        this.attachSource(null);
        this.attachView(null);
        this.protectionController = null;
        this.protectionData = null;
    };
};



/**
 * Namespace for {@MediaPlayer} dependencies
 * @namespace
 */
MediaPlayer.dependencies = {}

/**
 * Namespace for {@MediaPlayer} protection-related objects
 * @namespace
 */
MediaPlayer.dependencies.protection = {};

/**
 * Namespace for {@MediaPlayer} license server implementations
 * @namespace
 */
MediaPlayer.dependencies.protection.servers = {};

/**
 * Namespace for {@MediaPlayer} utility classes
 * @namespace
 */
MediaPlayer.utils = {};

/**
 * Namespace for {@MediaPlayer} model classes
 * @namespace
 */
MediaPlayer.models = {};

/**
 * Namespace for {@MediaPlayer} data objects
 * @namespace
 */
MediaPlayer.vo = {};

/**
 * Namespace for {@MediaPlayer} metrics-related data objects
 * @@namespace
 */
MediaPlayer.vo.metrics = {};

/**
 * Namespace for {@MediaPlayer} protection-related data objects
 * @namespace
 */
MediaPlayer.vo.protection = {};

/**
 * Namespace for {@MediaPlayer} rules classes
 * @namespace
 */
MediaPlayer.rules = {};

/**
 * Namespace for {@MediaPlayer} dependency-injection helper classes
 * @namespace
 */
MediaPlayer.di = {};


/**
 * The default timing source used for live edge time sync.
 */
MediaPlayer.UTCTimingSources = {
    default:{scheme:"urn:mpeg:dash:utc:http-xsdate:2014", value:"http://time.akamai.com/?iso"}
};

/**
 * The list of events supported by MediaPlayer
 */
MediaPlayer.events = {
    RESET_COMPLETE: "resetComplete",
    METRICS_CHANGED: "metricschanged",
    METRIC_CHANGED: "metricchanged",
    METRIC_UPDATED: "metricupdated",
    METRIC_ADDED: "metricadded",
    MANIFEST_LOADED: "manifestloaded",
    PROTECTION_CREATED: "protectioncreated",
    PROTECTION_DESTROYED: "protectiondestroyed",
    STREAM_SWITCH_STARTED: "streamswitchstarted",
    STREAM_SWITCH_COMPLETED: "streamswitchcompleted",
    STREAM_INITIALIZED: "streaminitialized",
    TEXT_TRACK_ADDED: "texttrackadded",
    TEXT_TRACKS_ADDED: "alltexttracksadded",
    BUFFER_LOADED: "bufferloaded",
    BUFFER_EMPTY: "bufferstalled",
    ERROR: "error",
    LOG: "log"
};
