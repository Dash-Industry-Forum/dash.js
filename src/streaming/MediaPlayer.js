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
import UTCTiming from '../dash/vo/UTCTiming.js';
import PlaybackController from './controllers/PlaybackController.js';
import StreamController from './controllers/StreamController.js';
import MediaController from './controllers/MediaController.js';
import ManifestLoader from './ManifestLoader.js';
import LiveEdgeFinder from './LiveEdgeFinder.js';
import ErrorHandler from './ErrorHandler.js';
import Capabilities from './utils/Capabilities.js';
import DOMStorage from './utils/DOMStorage.js';
import TextTrackExtensions from './extensions/TextTrackExtensions.js';
import SourceBufferExtensions from './extensions/SourceBufferExtensions.js';
import VirtualBuffer from './utils/VirtualBuffer.js';
import RequestModifierExtensions from './extensions/RequestModifierExtensions.js';
import TextSourceBuffer from './TextSourceBuffer.js';
import URIQueryAndFragmentModel from './models/URIQueryAndFragmentModel.js';
import ManifestModel from './models/ManifestModel.js';
import MediaPlayerModel from './models/MediaPlayerModel.js';
import MetricsModel from './models/MetricsModel.js';
import AbrController from './controllers/AbrController.js';
import TimeSyncController from './TimeSyncController.js';
import ABRRulesCollection from './rules/ABRRules/ABRRulesCollection.js';
import VideoModel from './models/VideoModel.js';
import RulesController from './rules/RulesController.js';
import ScheduleRulesCollection from './rules/SchedulingRules/ScheduleRulesCollection.js';
import SynchronizationRulesCollection from './rules/SynchronizationRules/SynchronizationRulesCollection.js';
import MediaSourceExtensions from './extensions/MediaSourceExtensions.js';
import VideoModelExtensions from './extensions/VideoModelExtensions.js';
import Debug from "./../core/Debug.js";
import EventBus from "./../core/EventBus.js";
import Events from './../core/events/Events.js';
import MediaPlayerEvents from './MediaPlayerEvents.js';
import FactoryMaker from '../core/FactoryMaker.js';
//Dash
import DashAdapter from '../dash/DashAdapter.js';
import DashParser from '../dash/DashParser.js';
import DashManifestExtensions from "../dash/extensions/DashManifestExtensions.js";
import DashMetricsExtensions from '../dash/extensions/DashMetricsExtensions.js';
import TimelineConverter from '../dash/TimelineConverter.js';

const DEFAULT_UTC_TIMING_SOURCE = { scheme: "urn:mpeg:dash:utc:http-xsdate:2014", value: "http://time.akamai.com/?iso" };
let factory = FactoryMaker.getClassFactory(MediaPlayer);
factory.DEFAULT_UTC_TIMING_SOURCE = DEFAULT_UTC_TIMING_SOURCE;
factory.events = MediaPlayerEvents;
export default factory;

function MediaPlayer() {

    const VERSION = "2.0.0";

    let context = this.context;
    let eventBus = EventBus(context).getInstance();
    let debug = Debug(context).getInstance();
    let log = debug.log;


    let instance = {
        initialize:initialize,
        on: on,
        off: off,
        extend: extend,
        attachView: attachView,
        attachSource: attachSource,
        isReady: isReady,
        play: play,
        seek: seek,
        time: time,
        duration: duration,
        timeAsUTC: timeAsUTC,
        durationAsUTC: durationAsUTC,
        getDVRWindowSize: getDVRWindowSize,
        getDVRSeekOffset: getDVRSeekOffset,
        convertToTimeCode: convertToTimeCode,
        formatUTC: formatUTC,
        reset: reset,
        getVersion: getVersion,
        getDebug: getDebug,
        getVideoModel: getVideoModel,
        getVideoContainer: getVideoContainer,
        setLiveDelayFragmentCount: setLiveDelayFragmentCount,
        useSuggestedPresentationDelay: useSuggestedPresentationDelay,
        enableLastBitrateCaching: enableLastBitrateCaching,
        enableLastMediaSettingsCaching: enableLastMediaSettingsCaching,
        setMaxAllowedBitrateFor: setMaxAllowedBitrateFor,
        getMaxAllowedBitrateFor: getMaxAllowedBitrateFor,
        setAutoPlay: setAutoPlay,
        getAutoPlay: getAutoPlay,
        setScheduleWhilePaused: setScheduleWhilePaused,
        getScheduleWhilePaused: getScheduleWhilePaused,
        getMetricsExt: getMetricsExt,
        getMetricsFor: getMetricsFor,
        getQualityFor: getQualityFor,
        setQualityFor: setQualityFor,
        setTextTrack: setTextTrack,
        getBitrateInfoListFor: getBitrateInfoListFor,
        setInitialBitrateFor: setInitialBitrateFor,
        getInitialBitrateFor: getInitialBitrateFor,
        getStreamsFromManifest: getStreamsFromManifest,
        getTracksFor: getTracksFor,
        getTracksForTypeFromManifest: getTracksForTypeFromManifest,
        getCurrentTrackFor: getCurrentTrackFor,
        setInitialMediaSettingsFor: setInitialMediaSettingsFor,
        getInitialMediaSettingsFor: getInitialMediaSettingsFor,
        setCurrentTrack: setCurrentTrack,
        getTrackSwitchModeFor: getTrackSwitchModeFor,
        setTrackSwitchModeFor: setTrackSwitchModeFor,
        setSelectionModeForInitialTrack: setSelectionModeForInitialTrack,
        getSelectionModeForInitialTrack: getSelectionModeForInitialTrack,
        getAutoSwitchQuality: getAutoSwitchQuality,
        setAutoSwitchQuality: setAutoSwitchQuality,
        retrieveManifest: retrieveManifest,
        addUTCTimingSource: addUTCTimingSource,
        removeUTCTimingSource: removeUTCTimingSource,
        clearDefaultUTCTimingSources: clearDefaultUTCTimingSources,
        restoreDefaultUTCTimingSources: restoreDefaultUTCTimingSources,
        enableManifestDateHeaderTimeSource: enableManifestDateHeaderTimeSource,
        displayCaptionsOnTop: displayCaptionsOnTop,
        attachVideoContainer: attachVideoContainer,
        attachTTMLRenderingDiv: attachTTMLRenderingDiv
    };

    setup();

    return instance;

    let element,
        source,
        protectionData,
        initialized,
        resetting,
        playing,
        autoPlay,
        useManifestDateHeaderTimeSource,
        UTCTimingSources,
        abrController,
        mediaController,
        protectionController,
        adapter,
        domStorage,
        metricsModel,
        mediaPlayerModel,
        errHandler,
        capabilities,
        streamController,
        rulesController,
        playbackController,
        metricsExt,
        manifestExt,
        videoModel,
        textSourceBuffer;

    function setup() {
        initialized = false;
        resetting = false;
        playing = false;
        autoPlay = true;
        protectionController = null;
        protectionData = null;
        useManifestDateHeaderTimeSource = true;
        UTCTimingSources = [];
        adapter = null;
        Events.extend(MediaPlayerEvents);
    }

    function initialize(view, source, AutoPlay) {
        if (initialized) return;
        initialized = true;

        manifestExt = DashManifestExtensions(context).getInstance();
        metricsExt = DashMetricsExtensions(context).getInstance();
        domStorage = DOMStorage(context).getInstance();
        metricsModel = MetricsModel(context).getInstance();
        metricsModel.setConfig({adapter:createAdaptor()});
        mediaPlayerModel = MediaPlayerModel(context).getInstance();
        errHandler = ErrorHandler(context).getInstance();
        capabilities = Capabilities(context).getInstance();

        restoreDefaultUTCTimingSources();
        setAutoPlay(AutoPlay !== undefined ? AutoPlay : true);

        if (view){
            attachView(view);
        }

        if (source) {;
            attachSource(source);
        }

        log("[dash.js " + VERSION + "] " + "new MediaPlayer instance has been created");
    }

    /**
     * The ready state of the MediaPlayer based on both the video element and MPD source being defined.
     *
     * @returns {boolean} The current ready state of the MediaPlayer
     * @see {@link MediaPlayer#attachView attachView()}
     * @see {@link MediaPlayer#attachSource attachSource()}
     * @memberof MediaPlayer#
     * @method
     */
    function isReady() {
        return (!!element && !!source && !resetting);
    }

    /**
     * The play method initiates playback of the media defined by the {@link MediaPlayer#attachSource attachSource()} method.
     *
     * @see {@link MediaPlayer#attachSource attachSource()}
     * @memberof MediaPlayer#
     * @method
     */
    function play() {
        if (!isReady()) {
            play();
            return;
        }
        if (!initialized) {
            throw "MediaPlayer not initialized!";
        }

        if (!capabilities.supportsMediaSource()) {
            errHandler.capabilityError("mediasource");
            return;
        }

        if (!element || !source) {
            throw "Missing view or source.";
        }
        playing = true;
        log("Playback initiated!");


        createControllers();
        domStorage.checkInitialBitrate();
        if (typeof source === "string") {
            streamController.load(source);
        } else {
            streamController.loadWithManifest(source);
        }
        //TODO-refactor this to mediaPlayermodel and pull from there remove api to set.
        streamController.setUTCTimingSources(UTCTimingSources, useManifestDateHeaderTimeSource);
    }

    function getDVRInfoMetric() {
        var metric = metricsModel.getReadOnlyMetricsFor('video') || metricsModel.getReadOnlyMetricsFor('audio');
        return metricsExt.getCurrentDVRInfo(metric);
    }

    /**
     * The timeShiftBufferLength (DVR Window), in seconds.
     *
     * @returns {number} The window of allowable play time behind the live point of a live stream.
     * @memberof MediaPlayer#
     * @method
     */
    function getDVRWindowSize() {
        return getDVRInfoMetric().manifestInfo.DVRWindowSize;
    }

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
    function getDVRSeekOffset(value) {
        var metric = getDVRInfoMetric();
        var val = metric.range.start + value;

        if (val > metric.range.end) {
            val = metric.range.end;
        }

        return val;
    }

    /**
     * Sets the currentTime property of the attached video element.  If it is a live stream with a
     * timeShiftBufferLength, then the DVR window offset will be automatically calculated.
     *
     * @param value {number} A relative time, in seconds, based on the return value of the {@link MediaPlayer#duration duration()} method is expected
     * @see {@link MediaPlayer#getDVRSeekOffset getDVRSeekOffset()}
     * @memberof MediaPlayer#
     * @method
     */
    function seek(value) {
        var s = playbackController.getIsDynamic() ? getDVRSeekOffset(value) : value;
        getVideoModel().setCurrentTime(s);
    }


    /**
     * Current time of the playhead, in seconds.
     *
     * @returns {number} The current playhead time of the media.
     * @memberof MediaPlayer#
     * @method
     */
    function time() {
        var t = videoModel.getCurrentTime();

        if (playbackController.getIsDynamic()) {
            var metric = getDVRInfoMetric();
            t = (metric === null) ? 0 : duration() - (metric.range.end - metric.time);
        }
        return t;
    }

    /**
     * Duration of the media's playback, in seconds.
     *
     * @returns {number} The current duration of the media.
     * @memberof MediaPlayer#
     * @method
     */
    function duration() {
        var d = videoModel.getElement().duration;

        if (playbackController.getIsDynamic()) {

            var metric = getDVRInfoMetric();
            var range;

            if (metric === null) {
                return 0;
            }

            range = metric.range.end - metric.range.start;
            d = range < metric.manifestInfo.DVRWindowSize ? range : metric.manifestInfo.DVRWindowSize;
        }
        return d;
    }

    function getAsUTC(valToConvert) {
        var metric = getDVRInfoMetric();
        var availableFrom,
            utcValue;

        if (metric === null) {
            return 0;
        }
        availableFrom = metric.manifestInfo.availableFrom.getTime() / 1000;
        utcValue = valToConvert + (availableFrom + metric.range.start);
        return utcValue;
    }

    /**
     * Use this method to get the current playhead time as an absolute value, the time in seconds since midnight UTC, Jan 1 1970.
     * Note - this property only has meaning for live streams
     *
     * @returns {number} The current playhead time as UTC timestamp.
     * @memberof MediaPlayer#
     * @method
     */
    function timeAsUTC() {
        return getAsUTC(time());
    }

    /**
     * Use this method to get the current duration as an absolute value, the time in seconds since midnight UTC, Jan 1 1970.
     * Note - this property only has meaning for live streams.
     *
     * @returns {number} The current duration as UTC timestamp.
     * @memberof MediaPlayer#
     * @method
     */
    function durationAsUTC() {
        return getAsUTC(duration());
    }

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
    function formatUTC(time, locales, hour12) {
        var dt = new Date(time * 1000);
        var d = dt.toLocaleDateString(locales);
        var t = dt.toLocaleTimeString(locales, {hour12: hour12});
        return t + ' ' + d;
    }

    /**
     * A utility method which converts seconds into TimeCode (i.e. 300 --> 05:00).
     *
     * @param value {number} A number in seconds to be converted into a formatted time code.
     * @returns {string} A formatted time code string.
     * @memberof MediaPlayer#
     * @method
     */
    function convertToTimeCode(value) {
        value = Math.max(value, 0);

        var h = Math.floor(value / 3600);
        var m = Math.floor((value % 3600) / 60);
        var s = Math.floor((value % 3600) % 60);
        return (h === 0 ? "" : (h < 10 ? "0" + h.toString() + ":" : h.toString() + ":")) + (m < 10 ? "0" + m.toString() : m.toString()) + ":" + (s < 10 ? "0" + s.toString() : s.toString());
    }

    function getActiveStream() {
        var streamInfo = streamController.getActiveStreamInfo();
        return streamInfo ? streamController.getStreamById(streamInfo.id) : null;
    }

    function extend(parentNameString, childInstance) {
        FactoryMaker.extend(parentNameString, childInstance, context);
    }

    /**
     * @param type
     * @param listener
     * @param scope
     * @memberof MediaPlayer#
     */
    function on(type, listener, scope) {
        eventBus.on(type, listener, scope);
    }

    /**
     * @param type
     * @param listener
     * @param scope
     * @memberof MediaPlayer#
     */
    function off(type, listener, scope) {
        eventBus.off(type, listener, scope);
    }

    /**
     * @returns {string} the current dash.js version string.
     * @memberof MediaPlayer#
     */
    function getVersion() {
        return VERSION;
    }

    /**
     * Use this method to access the dash.js logging class.
     *
     * @returns {@link MediaPlayer.utils.Debug Debug.js (Singleton)}
     * @memberof MediaPlayer#
     */
    function getDebug() {
        return debug;
    }

    /**
     * @returns {@link VideoModel}
     * @memberof MediaPlayer#
     */
    function getVideoModel() {
        return videoModel;
    }

    /**
     * @returns {@link object}
     * @memberof MediaPlayer#
     */
    function getVideoContainer() {
        return videoModel ? videoModel.getVideoContainer() : null;
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
    function setLiveDelayFragmentCount(value) {
        mediaPlayerModel.setLiveDelayFragmentCount(value);
    }

    /**
     * <p>Set to true if you would like to override the default live delay and honor the SuggestedPresentationDelay attribute in by the manifest.</p>
     * @param value {boolean}
     * @default false
     * @memberof MediaPlayer#
     * @see {@link MediaPlayer#setLiveDelayFragmentCount setLiveDelayFragmentCount()}
     */
    function useSuggestedPresentationDelay(value) {
        mediaPlayerModel.setUseSuggestedPresentationDelay(value);
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
    function enableLastBitrateCaching(enable, ttl) {
        domStorage.enableLastBitrateCaching(enable, ttl);
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
    function enableLastMediaSettingsCaching(enable, ttl) {
        domStorage.enableLastMediaSettingsCaching(enable, ttl);
    }

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
    function setMaxAllowedBitrateFor(type, value) {
        abrController.setMaxAllowedBitrateFor(type, value);
    }

    /**
     * @param type {string} 'video' or 'audio' are the type options.
     * @memberof MediaPlayer#
     * @see {@link MediaPlayer#setMaxAllowedBitrateFor setMaxAllowedBitrateFor()}
     */
    function getMaxAllowedBitrateFor(type) {
        return abrController.getMaxAllowedBitrateFor(type);
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
    function setAutoPlay(value) {
        autoPlay = value;
    }

    /**
     * @returns {boolean} The current autoPlay state.
     * @memberof MediaPlayer#
     */
    function getAutoPlay() {
        return autoPlay;
    }

    /**
     * @param value
     * @memberof MediaPlayer#
     */
    function setScheduleWhilePaused(value) {
        mediaPlayerModel.setScheduleWhilePaused(value);
    }

    /**
     * @returns {boolean}
     * @memberof MediaPlayer#
     */
    function getScheduleWhilePaused() {
        return mediaPlayerModel.getScheduleWhilePaused();
    }


    /**
     * @returns {object}
     * @memberof MediaPlayer#
     */
    function getMetricsExt() {
        return metricsExt;
    }

    /**
     * @param type
     * @returns {object}
     * @memberof MediaPlayer#
     */
    function getMetricsFor(type) {
        return metricsModel.getReadOnlyMetricsFor(type);
    }

    /**
     * @param type
     * @returns {object}
     * @memberof MediaPlayer#
     */
    function getQualityFor(type) {
        return abrController.getQualityFor(type, streamController.getActiveStreamInfo());
    }

    /**
     * Sets the current quality for media type instead of letting the ABR Herstics automatically selecting it..
     *
     * @param type
     * @param value
     * @memberof MediaPlayer#
     */
    function setQualityFor(type, value) {
        abrController.setPlaybackQuality(type, streamController.getActiveStreamInfo(), value);
    }


    /**
     * Use this method to change the current text track for both external time text files and fragmented text tracks. There is no need to
     * set the track mode on the video object to switch a track when using this method.
     *
     * @param idx - Index of track based on the order of the order the tracks are added Use -1 to disable all tracks. (turn captions off).  Use MediaPlayer#MediaPlayer.events.TEXT_TRACK_ADDED.
     * @see {@link MediaPlayer#MediaPlayer.events.TEXT_TRACK_ADDED}
     * @memberof MediaPlayer#
     */
    function setTextTrack(idx) {
        //For external time text file,  the only action needed to change a track is marking the track mode to showing.
        // Fragmented text tracks need the additional step of calling textSourceBuffer.setTextTrack();
        if (textSourceBuffer === undefined) {
            textSourceBuffer = TextSourceBuffer(context).getInstance();
        }

        var tracks = element.textTracks;
        var ln = tracks.length;

        for (var i = 0; i < ln; i++) {
            var track = tracks[i];
            var mode = idx === i ? "showing" : "hidden";

            if (track.mode !== mode) { //checking that mode is not already set by 3rd Party player frameworks that set mode to prevent event retrigger.
                track.mode = mode;
            }
        }

        textSourceBuffer.setTextTrack();
    }

    /**
     * @param type
     * @returns {Array}
     * @memberof MediaPlayer#
     */
    function getBitrateInfoListFor(type) {
        var stream = getActiveStream();
        return stream ? stream.getBitrateListFor(type) : [];
    }

    /**
     * @param type
     * @param {number} value A value of the initial bitrate, kbps
     * @memberof MediaPlayer#
     */
    function setInitialBitrateFor(type, value) {
        abrController.setInitialBitrateFor(type, value);
    }

    /**
     * @param type
     * @returns {number} A value of the initial bitrate, kbps
     * @memberof MediaPlayer#
     */
    function getInitialBitrateFor(type) {
        return abrController.getInitialBitrateFor(type);
    }

    /**
     * This method returns the list of all available streams from a given manifest
     * @param manifest
     * @returns {Array} list of {@link MediaPlayer.vo.StreamInfo}
     * @memberof MediaPlayer#
     */
    function getStreamsFromManifest(manifest) {
        return adapter.getStreamsInfo(manifest);
    }

    /**
     * This method returns the list of all available tracks for a given media type
     * @param type
     * @returns {Array} list of {@link MediaPlayer.vo.MediaInfo}
     * @memberof MediaPlayer#
     */
    function getTracksFor(type) {
        var streamInfo = streamController ? streamController.getActiveStreamInfo() : null;

        if (!streamInfo) return [];

        return mediaController.getTracksFor(type, streamInfo);
    }

    /**
     * This method returns the list of all available tracks for a given media type and streamInfo from a given manifest
     * @param type
     * @param manifest
     * @param streamInfo
     * @returns {Array} list of {@link MediaPlayer.vo.MediaInfo}
     * @memberof MediaPlayer#
     */
    function getTracksForTypeFromManifest(type, manifest, streamInfo) {
        streamInfo = streamInfo || adapter.getStreamsInfo(manifest)[0];

        return streamInfo ? adapter.getAllMediaInfoForType(manifest, streamInfo, type) : [];
    }

    /**
     * @param type
     * @returns {Object} {@link MediaPlayer.vo.MediaInfo}
     * @memberof MediaPlayer#
     */
    function getCurrentTrackFor(type) {
        var streamInfo = streamController ? streamController.getActiveStreamInfo() : null;

        if (!streamInfo) return null;

        return mediaController.getCurrentTrackFor(type, streamInfo);
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
    function setInitialMediaSettingsFor(type, value) {
        mediaController.setInitialSettings(type, value);
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
    function getInitialMediaSettingsFor(type) {
        return mediaController.getInitialSettings(type);
    }

    /**
     * @param track instance of {@link MediaPlayer.vo.MediaInfo}
     * @memberof MediaPlayer#
     */
    function setCurrentTrack(track) {
        mediaController.setTrack(track);
    }

    /**
     * This method returns the current track switch mode.
     *
     * @param type
     * @returns mode
     * @memberof MediaPlayer#
     */
    function getTrackSwitchModeFor(type) {
        return mediaController.getSwitchMode(type);
    }

    /**
     * This method sets the current track switch mode. Available options are:
     *
     * MediaController.TRACK_SWITCH_MODE_NEVER_REPLACE
     * (used to forbid clearing the buffered data (prior to current playback position) after track switch. Default for video)
     *
     * MediaController.TRACK_SWITCH_MODE_ALWAYS_REPLACE
     * (used to clear the buffered data (prior to current playback position) after track switch. Default for audio)
     *
     * @param type
     * @param mode
     * @memberof MediaPlayer#
     */
    function setTrackSwitchModeFor(type, mode) {
        mediaController.setSwitchMode(type, mode);
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
    function setSelectionModeForInitialTrack(mode) {
        mediaController.setSelectionModeForInitialTrack(mode);
    }

    /**
     * This method returns the track selection mode.
     *
     * @returns mode
     * @memberof MediaPlayer#
     */
    function getSelectionModeForInitialTrack() {
        return mediaController.getSelectionModeForInitialTrack();
    }

    /**
     * @returns {boolean} Current state of adaptive bitrate switching
     * @memberof MediaPlayer#
     *
     */
    function getAutoSwitchQuality() {
        return abrController.getAutoSwitchBitrate();
    }

    /**
     * Set to false to switch off adaptive bitrate switching.
     *
     * @param value {boolean}
     * @default {boolean} true
     * @memberof MediaPlayer#
     */
    function setAutoSwitchQuality(value) {
        abrController.setAutoSwitchBitrate(value);
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
    function retrieveManifest(url, callback) {
        var manifestLoader = createManifestLoader();
        var self = this;

        var handler = function (e) {
            if (!e.error) {
                callback(e.manifest);
            } else {
                callback(null, e.error);
            }
            eventBus.off(Events.INTERNAL_MANIFEST_LOADED, handler, self);
            manifestLoader.reset();
        };

        eventBus.on(Events.INTERNAL_MANIFEST_LOADED, handler, self);

        let uriQueryFragModel = URIQueryAndFragmentModel(context).getInstance();
        uriQueryFragModel.initialize();
        manifestLoader.load(uriQueryFragModel.parseURI(url));
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
    function addUTCTimingSource(schemeIdUri, value) {
        removeUTCTimingSource(schemeIdUri, value);//check if it already exists and remove if so.
        var vo = new UTCTiming();
        vo.schemeIdUri = schemeIdUri;
        vo.value = value;
        UTCTimingSources.push(vo);
    }


    /**
     * <p>Allows you to remove a UTC time source. Both schemeIdUri and value need to match the Dash.vo.UTCTiming properties in order for the
     * entry to be removed from the array</p>
     * @param {string} schemeIdUri - see {@link MediaPlayer#addUTCTimingSource addUTCTimingSource()}
     * @param {string} value - see {@link MediaPlayer#addUTCTimingSource addUTCTimingSource()}
     * @memberof MediaPlayer#
     * @see {@link MediaPlayer#clearDefaultUTCTimingSources clearDefaultUTCTimingSources()}
     */
    function removeUTCTimingSource(schemeIdUri, value) {
        UTCTimingSources.forEach(function (obj, idx) {
            if (obj.schemeIdUri === schemeIdUri && obj.value === value) {
                UTCTimingSources.splice(idx, 1);
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
    function clearDefaultUTCTimingSources() {
        UTCTimingSources = [];
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
    function restoreDefaultUTCTimingSources() {
        addUTCTimingSource(DEFAULT_UTC_TIMING_SOURCE.scheme, DEFAULT_UTC_TIMING_SOURCE.value);
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
    function enableManifestDateHeaderTimeSource(value) {
        useManifestDateHeaderTimeSource = value;
    }

    /**
     * This method serves to control captions z-index value. If 'true' is passed, the captions will have the highest z-index and be
     * displayed on top of other html elements. Default value is 'false' (z-index is not set).
     * @param value {Boolean}
     */
    function displayCaptionsOnTop(value) {
        var textTrackExt = TextTrackExtensions(context).getInstance();
        textTrackExt.setConfig({videoModel:videoModel});
        textTrackExt.initialize();
        textTrackExt.displayCConTop(value);
    }

    /**
     * Use this method to attach an HTML5 element that wraps the video element.
     *
     * @param container The HTML5 element containing the video element.
     * @memberof MediaPlayer#
     */
    function attachVideoContainer(container) {
        if (!videoModel) {
            throw "Must call attachView with video element before you attach container element";
        }

        videoModel.setVideoContainer(container);
    }

    /**
     * Use this method to attach an HTML5 VideoElement for dash.js to operate upon.
     *
     * @param view An HTML5 VideoElement that has already been defined in the DOM.
     * @memberof MediaPlayer#
     */
    function attachView(view) {
        if (!initialized) {
            throw "MediaPlayer not initialized!";
        }

        element = view;

        videoModel = null;
        if (element) {
            videoModel = VideoModel(context).getInstance();
            videoModel.initialize();
            videoModel.setElement(element);
            // Workaround to force Firefox to fire the canplay event.
            element.preload = "auto";

            detectProtection();
        }
    }

    /**
     * Use this method to attach an HTML5 div for dash.js to render rich TTML subtitles.
     *
     * @param div An unstyled div placed after the video element. It will be styled to match the video size and overlay z-order.
     * @memberof MediaPlayer#
     */
    function attachTTMLRenderingDiv(div) {
        if (!videoModel) {
            throw "Must call attachView with video element before you attach TTML Rendering Div";
        }
        videoModel.setTTMLRenderingDiv(div);
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
    function attachSource(urlOrManifest, protectionCtrl, data) {
        if (!initialized) {
            throw "MediaPlayer not initialized!";
        }

        if (typeof urlOrManifest === "string") {
            var uriQueryFragModel = URIQueryAndFragmentModel(context).getInstance();
            uriQueryFragModel.initialize();
            source = uriQueryFragModel.parseURI(urlOrManifest);
        } else {
            source = urlOrManifest;
        }

        //protectionController = protectionCtrl;
        protectionData = data;
        resetAndPlay();
    }

    /**
     * Sets the MPD source and the video element to null.
     * @memberof MediaPlayer#
     */
    function reset() {
        //todo add all vars in reset that need to be in here
        attachSource(null);
        attachView(null);
        protectionController = null;
        protectionData = null;
    }


    function resetAndPlay() {
        adapter.reset();
        if (playing && streamController) {
            if (!resetting) {
                resetting = true;
                eventBus.on(Events.STREAM_TEARDOWN_COMPLETE, onStreamTeardownComplete, this);
                streamController.reset();
            }
        } else {
            play();
        }
    }

    function onStreamTeardownComplete(/* e */) {
        // Finish rest of shutdown process
        abrController.reset();
        rulesController.reset();
        playbackController.reset();
        mediaController.reset();
        streamController = null;
        playing = false;
        eventBus.off(Events.STREAM_TEARDOWN_COMPLETE, onStreamTeardownComplete, this);
        resetting = false;
        play();
    }

    function createControllers() {

        let synchronizationRulesCollection = SynchronizationRulesCollection(context).getInstance();
        synchronizationRulesCollection.initialize();

        let abrRulesCollection = ABRRulesCollection(context).getInstance();
        abrRulesCollection.initialize();

        let scheduleRulesCollection = ScheduleRulesCollection(context).getInstance();
        scheduleRulesCollection.initialize();

        let sourceBufferExt = SourceBufferExtensions(context).getInstance();
        sourceBufferExt.setConfig({manifestExt:manifestExt});


        let virtualBuffer = VirtualBuffer(context).getInstance();
        virtualBuffer.setConfig({
            sourceBufferExt:sourceBufferExt
        });

        mediaController = MediaController(context).getInstance();
        mediaController.initialize();
        mediaController.setConfig({
            DOMStorage :domStorage,
            errHandler :errHandler
        });

        playbackController = PlaybackController(context).getInstance();

        rulesController = RulesController(context).getInstance();
        rulesController.initialize();
        rulesController.setConfig({
            abrRulesCollection:abrRulesCollection,
            scheduleRulesCollection:scheduleRulesCollection,
            synchronizationRulesCollection: synchronizationRulesCollection
        });

        streamController = StreamController(context).getInstance();
        streamController.setConfig({
            capabilities: capabilities,
            manifestLoader: createManifestLoader(),
            manifestModel: ManifestModel(context).getInstance(),
            manifestExt: manifestExt,
            protectionController: protectionController,
            adapter: adapter,
            metricsModel: metricsModel,
            metricsExt: metricsExt,
            videoModelExt: VideoModelExtensions(context).getInstance(),
            liveEdgeFinder: LiveEdgeFinder(context).getInstance(),
            mediaSourceExt: MediaSourceExtensions(context).getInstance(),
            timeSyncController: TimeSyncController(context).getInstance(),
            virtualBuffer: virtualBuffer,
            errHandler: errHandler,
            timelineConverter:TimelineConverter(context).getInstance()
        });
        streamController.initialize(autoPlay, protectionData);

        abrController = AbrController(context).getInstance();
        abrController.setConfig({
            abrRulesCollection: abrRulesCollection,
            rulesController: rulesController,
            streamController: streamController
        });
    }

    function createManifestLoader() {
        return ManifestLoader(context).create({
            errHandler : errHandler,
            parser :createManifestParser(),
            metricsModel :metricsModel,
            requestModifierExt:RequestModifierExtensions(context).getInstance()
        });
    }

    function createManifestParser() {
        //TODO-Refactor Need to be able to switch this create out so will need API to set which parser to use?
        return DashParser(context).create();
    }

    function createAdaptor() {
        //TODO-Refactor Need to be able to switch this create out so will need API to set which adapter to use? Handler is created is inside streamProcessor so need to figure that out as well
        adapter = DashAdapter(context).getInstance();
        adapter.initialize();
        adapter.setConfig({manifestExt: manifestExt});
        return adapter;
    }

    function detectProtection() {
        if(typeof Protection == "function") {
            let protection = Protection(context).create();
            Events.extend(Protection.events);
            MediaPlayerEvents.extend(Protection.events, { publicOnly: true });
            protectionController = protection.createProtectionSystem({
                log:log,
                videoModel:videoModel,
                capabilities:capabilities,
                eventBus:eventBus,
                adapter:adapter
            });
        }
    }
}