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
import FactoryMaker from './FactoryMaker';
import Utils from './Utils.js';
import Debug from '../core/Debug';
import Constants from '../streaming/constants/Constants';
import {
    HTTPRequest
}
from '../streaming/vo/metrics/HTTPRequest';

/**
 * @class
 * @module Settings
 */
function Settings() {
    let instance;

    /**
     * @namespace Schema
     * @memberof module:Settings
     */
    const defaultSettings = {
        debug: {
            /**
             * Sets up the log level. The levels are cumulative. For example, if you set the log level
             * to dashjs.Debug.LOG_LEVEL_WARNING all warnings, errors and fatals will be logged. Possible values
             *
             * <ul>
             * <li>dashjs.Debug.LOG_LEVEL_NONE<br/>
             * No message is written in the browser console.
             *
             * <li>dashjs.Debug.LOG_LEVEL_FATAL<br/>
             * Log fatal errors. An error is considered fatal when it causes playback to fail completely.
             *
             * <li>dashjs.Debug.LOG_LEVEL_ERROR<br/>
             * Log error messages.
             *
             * <li>dashjs.Debug.LOG_LEVEL_WARNING<br/>
             * Log warning messages.
             *
             * <li>dashjs.Debug.LOG_LEVEL_INFO<br/>
             * Log info messages.
             *
             * <li>dashjs.Debug.LOG_LEVEL_DEBUG<br/>
             * Log debug messages.
             * </ul>
             * @param {number} value Log level
             * @default LOG_LEVEL_WARNING
             * @memberof module:Settings.Schema
             * @instance
             */
            logLevel: Debug.LOG_LEVEL_WARNING
        },
        streaming: {
            /**
             * change the maximum list depth of metrics.
             * @alias streaming.metricsMaxListDepth
             * @default true
             * @memberof module:Settings.Schema
             */
            metricsMaxListDepth: 1000,
            /**
             * A timeout value in seconds, which during the ABRController will block switch-up events.
             * This will only take effect after an abandoned fragment event occurs.
             * @alias streaming.abandonLoadTimeout
             * @default 10000
             * @memberof module:Settings.Schema
             */
            abandonLoadTimeout: 10000,
            /**
             * Changing this value will lower or increase live stream latency.  The detected segment duration will be multiplied by this value
             * to define a time in seconds to delay a live stream from the live edge. Lowering this value will lower latency but may decrease
             * the player's ability to build a stable buffer.
             * @alias streaming.liveDelayFragmentCount
             * @default 4
             * @memberof module:Settings.Schema
             */
            liveDelayFragmentCount: 4,
            /**
             * <p>Equivalent in seconds of setLiveDelayFragmentCount</p>
             * <p>Lowering this value will lower latency but may decrease the player's ability to build a stable buffer.</p>
             * <p>This value should be less than the manifest duration by a couple of segment durations to avoid playback issues</p>
             * <p>If set, this parameter will take precedence over setLiveDelayFragmentCount and manifest info</p>
             * @alias streaming.liveDelay
             * @default undefined
             * @memberof module:Settings.Schema
             */
            liveDelay: null,
            /**
             * Set to true if you would like dash.js to keep downloading fragments in the background
             * when the video element is paused.
             * @alias streaming.scheduleWhilePaused
             * @default true
             * @memberof module:Settings.Schema
             */
            scheduleWhilePaused: true,
            /**
             * When enabled, after an ABR up-switch in quality, instead of requesting and appending the next fragment
             * at the end of the current buffer range it is requested and appended closer to the current time
             * When enabled, The maximum time to render a higher quality is current time + (1.5 * fragment duration).
             *
             * Note, When ABR down-switch is detected, we appended the lower quality at the end of the buffer range to preserve the
             * higher quality media for as long as possible.
             *
             * If enabled, it should be noted there are a few cases when the client will not replace inside buffer range but rather
             * just append at the end.  1. When the buffer level is less than one fragment duration 2.  The client
             * is in an Abandonment State due to recent fragment abandonment event.
             *
             * Known issues:
             * 1. In IE11 with auto switching off, if a user switches to a quality they can not download in time the
             * fragment may be appended in the same range as the playhead or even in the past, in IE11 it may cause a stutter
             * or stall in playback.
             *
             * @alias streaming.fastSwitchEnabled
             * @default false
             * @memberof module:Settings.Schema
             */
            fastSwitchEnabled: false,
            /**
             * The interval of pruning buffer in seconds.
             * @alias streaming.bufferPruningInterval
             * @default 10
             * @memberof module:Settings.Schema
             */
            bufferPruningInterval: 10,
            /**
             * This value influences the buffer pruning logic.
             * Allows you to modify the buffer that is kept in source buffer in seconds.
             *  0|-----------bufferToPrune-----------|-----bufferToKeep-----|currentTime|
             *
             * @alias streaming.bufferToKeep
             * @default 20
             * @memberof module:Settings.Schema
             */
            bufferToKeep: 20,
            /**
             * This value influences the buffer pruning logic.
             * Allows you to modify the buffer ahead of current time position that is kept in source buffer in seconds.
             * <pre>0|--------|currentTime|-----bufferAheadToKeep----|----bufferToPrune-----------|end|</pre>
             * @alias streaming.bufferToKeep
             * @default 80
             * @memberof module:Settings.Schema
             */
            bufferAheadToKeep: 80,
            /**
             * Sets whether player should jump small gaps (discontinuities) in the buffer.
             *
             * @param {boolean} value
             * @default false
             * @memberof module:Settings.Schema
             */
            jumpGaps: true,
            /**
             * Time in seconds for a gap to be considered small.
             *
             * @param {boolean} value
             * @default 1.5
             * @memberof module:Settings.Schema
             */
            smallGapLimit: 1.5,
            /**
             * The time that the internal buffer target will be set to post startup/seeks (NOT top quality).
             *
             * When the time is set higher than the default you will have to wait longer
             * to see automatic bitrate switches but will have a larger buffer which
             * will increase stability.
             * @alias streaming.stableBufferTime
             * @default 12
             * @memberof module:Settings.Schema
             */
            stableBufferTime: 12,
            /**
             * The time that the internal buffer target will be set to once playing the top quality.
             * If there are multiple bitrates in your adaptation, and the media is playing at the highest
             * bitrate, then we try to build a larger buffer at the top quality to increase stability
             * and to maintain media quality.
             * @alias streaming.bufferTimeAtTopQuality
             * @default 30
             * @memberof module:Settings.Schema
             */
            bufferTimeAtTopQuality: 30,
            /**
             * The time that the internal buffer target will be set to once playing the top quality for long form content.
             * @alias streaming.bufferTimeAtTopQualityLongForm
             * @default 60
             * @memberof module:Settings.Schema
             */
            bufferTimeAtTopQualityLongForm: 60,
            /**
             * The threshold which defines if the media is considered long form content.
             * This will directly affect the buffer targets when playing back at the top quality.
             * @alias streaming.longFormContentDurationThreshold
             * @default 600
             * @memberof module:Settings.Schema
             */
            longFormContentDurationThreshold: 600,
            /**
             * How frequently the wallclockTimeUpdated internal event is triggered (in milliseconds).
             * @alias streaming.wallclockTimeUpdateInterval
             * @default 50
             * @memberof module:Settings.Schema
             */
            wallclockTimeUpdateInterval: 50,
            /**
             * Enable or disable low latency mode
             * @alias streaming.lowLatencyEnabled
             * @default false
             * @memberof module:Settings.Schema
             */
            lowLatencyEnabled: false,
            /**
             * Set the value for the ProtectionController and MediaKeys life cycle. If true, the
             * ProtectionController and then created MediaKeys and MediaKeySessions will be preserved during
             * the MediaPlayer lifetime.
             *
             * @param {boolean=} value - True or false flag.
             * @default false
             * @memberof module:Settings.Schema
             */
            keepProtectionMediaKeys: false,
            /**
             * <p>Allows you to enable the use of the Date Header, if exposed with CORS, as a timing source for live edge detection. The
             * use of the date header will happen only after the other timing source that take precedence fail or are omitted as described.
             * @param {boolean} value - true to enable
             * @default {boolean} True
             * @memberof module:Settings.Schema
             */
            useManifestDateHeaderTimeSource: true,
            /**
             * The overlap tolerance time, at both the head and the tail of segments, considered when doing time to segment conversions.
             *
             * This is used when calculating which of the loaded segments of a representation corresponds with a given time position.
             * Its value is never used for calculating the segment index in seeking operations in which it assumes overlap time threshold is zero.
             *
             * <pre>
             * |-o-|--- segment X ----|-o-|
             *                        |-o-|---- segment X+1 -----|-o-|
             *                                                   |-o-|---- segment X+2 -----|-o-|
             * </pre>
             * @param {number} value
             * @default 0.2 seconds.
             * @memberof module:Settings.Schema
             */
            segmentOverlapToleranceTime: 0.2,
            /**
             * <p>Set to true if you would like to override the default live delay and honor the SuggestedPresentationDelay attribute in by the manifest.</p>
             * @param {boolean} value
             * @default false
             * @memberof module:Settings.Schema
             */
            useSuggestedPresentationDelay: false,
            /**
             * For live streams, set the interval-frequency in milliseconds at which
             * dash.js will check if the current manifest is still processed before
             * downloading the next manifest once the minimumUpdatePeriod time has
             * expired.
             * @param {int} value
             * @default 100
             * @memberof module:Settings.Schema
             */
            manifestUpdateRetryInterval: 100,
            /**
             * Use this method to set the minimum latency deviation allowed before activating catch-up mechanism. In low latency mode,
             * when the difference between the measured latency and the target one,
             * as an absolute number, is higher than the one sets with this method, then dash.js increases/decreases
             * playback rate until target latency is reached.
             *
             * LowLatencyMinDrift should be provided in seconds, and it uses values between 0.0 and 0.5.
             *
             * Note: Catch-up mechanism is only applied when playing low latency live streams.
             *
             * @param {number} value Maximum difference between measured latency and the target one before applying playback rate modifications.
             * @default {number} 0.02
             * @memberof module:Settings.Schema
             */
            liveCatchUpMinDrift: 0.02,
            /**
             * Use this method to set the maximum latency deviation allowed before dash.js to do a seeking to live position. In low latency mode,
             * when the difference between the measured latency and the target one,
             * as an absolute number, is higher than the one sets with this method, then dash.js does a seek to live edge position minus
             * the target live delay.
             *
             * LowLatencyMaxDriftBeforeSeeking should be provided in seconds. If 0, then seeking operations won't be used for
             * fixing latency deviations.
             *
             * Note: Catch-up mechanism is only applied when playing low latency live streams.
             *
             * @param {number} value Maximum difference between measured latency and the target one before using seek to
             * fix drastically live latency deviations.
             * @default {number} 0
             * @memberof module:Settings.Schema
             */
            liveCatchUpMaxDrift: 0,
            /**
             * Use this method to set the maximum catch up rate, as a percentage, for low latency live streams. In low latency mode,
             * when measured latency is higher/lower than the target one,
             * dash.js increases/decreases playback rate respectively up to (+/-) the percentage defined with this method until target is reached.
             *
             * Valid values for catch up rate are in range 0-0.5 (0-50%). Set it to 0 to turn off live catch up feature.
             *
             * Note: Catch-up mechanism is only applied when playing low latency live streams.
             *
             * @param {number} value Percentage in which playback rate is increased/decreased when live catch up mechanism is activated.
             * @default {number} 0.5
             * @memberof module:Settings.Schema
             */
            liveCatchUpPlaybackRate: 0.5,
            /**
             * Set to false if you would like to disable the last known bit rate from being stored during playback and used
             * to set the initial bit rate for subsequent playback within the expiration window.
             *
             * The default expiration is one hour, defined in milliseconds. If expired, the default initial bit rate (closest to 1000 kbps) will be used
             * for that session and a new bit rate will be stored during that session.
             *
             * @param {boolean} enable - Will toggle if feature is enabled. True to enable, False to disable.
             * @param {number=} ttl - (Optional) A value defined in milliseconds representing how long to cache the bit rate for. Time to live.
             * @default enable = True, ttl = 360000 (1 hour)
             * @memberof module:Settings.Schema
             */
            lastBitrateCachingInfo: { enabled: true, ttl: 360000},
            /**
             * Set to false if you would like to disable the last known lang for audio (or camera angle for video) from being stored during playback and used
             * to set the initial settings for subsequent playback within the expiration window.
             *
             * The default expiration is one hour, defined in milliseconds. If expired, the default settings will be used
             * for that session and a new settings will be stored during that session.
             *
             * @param {boolean} enable - Will toggle if feature is enabled. True to enable, False to disable.
             * @param {number=} [ttl] - (Optional) A value defined in milliseconds representing how long to cache the settings for. Time to live.
             * @default enable = True, ttl = 360000 (1 hour)
             * @memberof module:Settings.Schema
             */
            lastMediaSettingsCachingInfo: { enabled: true, ttl: 360000},
            /**
             * For a given media type, the threshold which defines if the response to a fragment
             * request is coming from browser cache or not.
             *
             * @param {number} value Threshold value in milliseconds.
             * @default 50 milliseconds for video fragment requests; 5 milliseconds for audio fragment requests.
             * @memberof module:Settings.Schema
             */
            cacheLoadThresholds: {video: 50, audio: 5},
            /**
             * Time in milliseconds of which to reload a failed file load attempt.
             *
             * @param {int} value
             * @default 500 milliseconds for manifest, 500 for xlink and 1000 for other file types
             * @memberof Settings.Schema
             */
            retryIntervals: {
                [HTTPRequest.MPD_TYPE]:                         500,
                [HTTPRequest.XLINK_EXPANSION_TYPE]:             500,
                [HTTPRequest.MEDIA_SEGMENT_TYPE]:               1000,
                [HTTPRequest.INIT_SEGMENT_TYPE]:                1000,
                [HTTPRequest.BITSTREAM_SWITCHING_SEGMENT_TYPE]: 1000,
                [HTTPRequest.INDEX_SEGMENT_TYPE]:               1000,
                [HTTPRequest.OTHER_TYPE]:                       1000
            },
            /**
             * Total number of retry attempts that will occur on a file load before it fails.
             *
             * @param {int} value
             * @default 1 for xlink and 3 for other file types
             * @memberof Settings.Schema
             */
            retryAttempts: {
                [HTTPRequest.MPD_TYPE]:                         3,
                [HTTPRequest.XLINK_EXPANSION_TYPE]:             1,
                [HTTPRequest.MEDIA_SEGMENT_TYPE]:               3,
                [HTTPRequest.INIT_SEGMENT_TYPE]:                3,
                [HTTPRequest.BITSTREAM_SWITCHING_SEGMENT_TYPE]: 3,
                [HTTPRequest.INDEX_SEGMENT_TYPE]:               3,
                [HTTPRequest.OTHER_TYPE]:                       3
            },
            abr: {
                /**
                 * Sets the moving average method used for smoothing throughput estimates. Valid methods are
                 * "slidingWindow" and "ewma". The call has no effect if an invalid method is passed.
                 *
                 * The sliding window moving average method computes the average throughput using the last four segments downloaded.
                 * If the stream is live (as opposed to VOD), then only the last three segments are used.
                 * If wide variations in throughput are detected, the number of segments can be dynamically increased to avoid oscillations.
                 *
                 * The exponentially weighted moving average (EWMA) method computes the average using exponential smoothing.
                 * Two separate estimates are maintained, a fast one with a three-second half life and a slow one with an eight-second half life.
                 * The throughput estimate at any time is the minimum of the fast and slow estimates.
                 * This allows a fast reaction to a bandwidth drop and prevents oscillations on bandwidth spikes.
                 *
                 * @param {string} value
                 * @default {string} 'slidingWindow'
                 * @memberof module:Settings.Schema
                 */
                movingAverageMethod: Constants.MOVING_AVERAGE_SLIDING_WINDOW,
                /**
                 * Returns the current ABR strategy being used.
                 * @return {string} "abrDynamic", "abrBola" or "abrThroughput"
                 * @default "abrDynamic"
                 * @memberof module:Settings.Schema
                 * @instance
                 */
                ABRStrategy: Constants.ABR_STRATEGY_DYNAMIC,
                /**
                 * Standard ABR throughput rules multiply the throughput by this value. It should be between 0 and 1,
                 * with lower values giving less rebuffering (but also lower quality).
                 * @alias streaming.abr.bandwidthSafetyFactor
                 * @default 0.9
                 * @memberof module:Settings.Schema
                 */
                bandwidthSafetyFactor: 0.9,
                /**
                 * Should the default ABR rules be used, or the custom ones added.
                 * @alias streaming.abr.useDefaultABRRules
                 * @default true
                 * @memberof module:Settings.Schema
                 */
                useDefaultABRRules: true,
                /**
                 * Whether to use the BOLA abr rule.
                 * @alias streaming.abr.useBufferOccupancyABR
                 * @default false
                 * @memberof module:Settings.Schema
                 */
                useBufferOccupancyABR: false,
                /**
                 * If true, only the download portion will be considered part of the download bitrate
                 * and latency will be regarded as static. If false, the reciprocal of the whole
                 * transfer time will be used.
                 *
                 * @alias streaming.abr.useDeadTimeLatency
                 * @default true
                 * @memberof module:Settings.Schema
                 */
                useDeadTimeLatency: true,
                /**
                 * If true, the size of the video portal will limit the max chosen video resolution.
                 * @alias streaming.abr.limitBitrateByPortal
                 * @default false
                 * @memberof module:Settings.Schema
                 */
                limitBitrateByPortal: false,
                /**
                 * Sets whether to take into account the device's pixel ratio when defining the portal dimensions.
                 * Useful on, for example, retina displays.
                 * @alias streaming.abr.usePixelRatioInLimitBitrateByPortal
                 * @default false
                 * @memberof module:Settings.Schema
                 */
                usePixelRatioInLimitBitrateByPortal: false,
                /**
                 * The maximum bitrate that the ABR algorithms will choose. Use NaN for no limit.
                 * @property audio {number} Max bitrate for audio
                 * @property video {number} Max Bitrate for video
                 * @alias streaming.abr.maxBitrate
                 * @default -1
                 * @memberof module:Settings.Schema
                 */
                maxBitrate: { audio: -1, video: -1 },
                /**
                 * The minimum bitrate that the ABR algorithms will choose. Use NaN for no limit.
                 * @property audio {number} Bitrate for audio
                 * @property video {number} Bitrate for video
                 * @alias streaming.abr.minBitrate
                 * @default -1
                 * @memberof module:Settings.Schema
                 */
                minBitrate: { audio: -1, video: -1 },
                /**
                 * When switching multi-bitrate content (auto or manual mode) this property specifies the maximum representation allowed,
                 * as a proportion of the size of the representation set.
                 *
                 * You can set or remove this cap at anytime before or during playback. To clear this setting you set the value to 1.
                 *
                 * If both this and maxAllowedBitrate are defined, maxAllowedBitrate is evaluated first, then maxAllowedRepresentation,
                 * i.e. the lowest value from executing these rules is used.
                 *
                 * This feature is typically used to reserve higher representations for playback only when connected over a fast connection.
                 * @property audio {number} Max ratio for audio
                 * @property video {number} Max ratio for video
                 * @alias streaming.abr.maxRepresentationRatio
                 * @default 1
                 * @memberof module:Settings.Schema
                 */
                maxRepresentationRatio: { audio: 1, video: 1 },
                /**
                 * Explicitly set the starting bitrate for audio or video
                 * @property audio {number} Bitrate for audio
                 * @property video {number} Bitrate for video
                 * @alias streaming.abr.initialBitrate
                 * @default -1
                 * @memberof module:Settings.Schema
                 */
                initialBitrate: { audio: -1, video: -1 },
                /**
                 * Explicitly set the initial representation ratio. If initalBitrate is specified, this is ignored.
                 * @see{streaming.abr.maxRepresentationRatio}
                 * @property audio {number} Bitrate for audio
                 * @property video {number} Bitrate for video
                 * @alias streaming.abr.initialRepresentationRatio
                 * @default -1
                 * @memberof module:Settings.Schema
                 */
                initialRepresentationRatio: { audio: -1, video: -1 },
                /**
                 * Indicates whether the player should enable ABR algorithms to switch the bitrate.
                 * @property audio {number} Flag for audio
                 * @property video {number} Flag for video
                 * @alias streaming.abr.initialRepresentationRatio
                 * @default true
                 * @memberof module:Settings.Schema
                 */
                autoSwitchBitrate: { audio: true, video: true }
            }
        }
    };

    let settings = Utils.clone(defaultSettings);

    //Merge in the settings. If something exists in the new config that doesn't match the schema of the default config,
    //regard it as an error and log it.
    function mixinSettings(source, dest, path) {
        for (let n in source) {
            if (source.hasOwnProperty(n)) {
                if (dest.hasOwnProperty(n)) {
                    if (typeof source[n] === 'object') {
                        mixinSettings(source[n], dest[n], path.slice() + n + '.');
                    } else {
                        dest[n] = Utils.clone(source[n]);
                    }
                }
            }
        }
    }

    /**
     * Return the settings object. Don't copy/store this object, you won't get updates.
     * @func
     * @instance
     * @memberof module:Settings
     */
    function get() {
        return settings;
    }

    /**
     * @func
     * @instance
     * @param {object} settingsObj - This should be a partial object of the Settings.Schema type. That is, fields defined should match the path (e.g.
     * settingsObj.streaming.abr.autoSwitchBitrate.audio -> defaultSettings.streaming.abr.autoSwitchBitrate.audio). Where an element's path does
     * not match it is ignored, and a warning is logged.
     *
     * Use to change the settings object. Any new values defined will overwrite the settings and anything undefined will not change.
     * Implementers of new settings should add it in an approriate namespace to the defaultSettings object and give it a default value (that is not undefined).
     *
     * @memberof module:Settings
     */
    function update(settingsObj) {
        if (typeof settingsObj === 'object') {
            mixinSettings(settingsObj, settings, '');
        }
    }

    /**
     * Resets the settings object. Everything is set to its default value.
     * @func
     * @instance
     *
     * @memberof module:Settings
     */
    function reset() {
        settings = Utils.clone(defaultSettings);
    }

    instance = {
        get: get,
        update: update,
        reset: reset
    };

    return instance;
}


Settings.__dashjs_factory_name = 'Settings';
let factory = FactoryMaker.getSingletonFactory(Settings);
export default factory;