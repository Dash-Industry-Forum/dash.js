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

/**
 * @class
 * @module Settings
 */
function Settings() {
    let log = Debug(this.context).getInstance().log;

    /**
     * @namespace Schema
     * @memberof module:Settings
     */
    const defaultSettings = {
        streaming: {
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
             * @default NaN
             * @memberof module:Settings.Schema
             */
            liveDelay: NaN,
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
             * @default 30
             * @memberof module:Settings.Schema
             */
            bufferPruningInterval: 30,
            /**
             * This value influences the buffer pruning logic.
             * Allows you to modify the buffer that is kept in source buffer in seconds.
             *  0|-----------bufferToPrune-----------|-----bufferToKeep-----|currentTime|
             *
             * @alias streaming.bufferToKeep
             * @default 30
             * @memberof module:Settings.Schema
             */
            bufferToKeep: 30,
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
             * A threshold, in seconds, of when dashjs abr becomes less conservative since we have a
             * larger "rich" buffer.
             * The BufferOccupancyRule.js rule will override the ThroughputRule's decision when the
             * buffer level surpasses this value and while it remains greater than this value.
             * @alias streaming.richBufferThreshold
             * @default 20
             * @memberof module:Settings.Schema
             */
            richBufferThreshold: 20,
            /**
             * How frequently the wallclockTimeUpdated internal event is triggered (in milliseconds).
             * @alias streaming.wallclockTimeUpdateInterval
             * @default 50
             * @memberof module:Settings.Schema
             */
            wallclockTimeUpdateInterval: 50,
            abr: {
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
                 * @default NaN
                 * @memberof module:Settings.Schema
                 */
                maxBitrate: { audio: NaN, video: NaN },
                /**
                 * The minimum bitrate that the ABR algorithms will choose. Use NaN for no limit.
                 * @property audio {number} Bitrate for audio
                 * @property video {number} Bitrate for video
                 * @alias streaming.abr.minBitrate
                 * @default NaN
                 * @memberof module:Settings.Schema
                 */
                minBitrate: { audio: NaN, video: NaN },
                /**
                 * When switching multi-bitrate content (auto or manual mode) this property specifies the maximum representation allowed,
                 * as a proportion of the size of the representation set.
                 *
                 * You can set or remove this cap at anytime before or during playback. To clear this setting you set the value to NaN.
                 *
                 * If both this and maxAllowedBitrate are defined, maxAllowedBitrate is evaluated first, then maxAllowedRepresentation,
                 * i.e. the lowest value from executing these rules is used.
                 *
                 * This feature is typically used to reserve higher representations for playback only when connected over a fast connection.
                 * @property audio {number} Max ratio for audio
                 * @property video {number} Max ratio for video
                 * @alias streaming.abr.maxRepresentationRatio
                 * @default NaN
                 * @memberof module:Settings.Schema
                 */
                maxRepresentationRatio: { audio: NaN, video: NaN },
                /**
                 * Explicitly set the starting bitrate for audio or video
                 * @property audio {number} Bitrate for audio
                 * @property video {number} Bitrate for video
                 * @alias streaming.abr.initialBitrate
                 * @default NaN
                 * @memberof module:Settings.Schema
                 */
                initialBitrate: { audio: NaN, video: NaN },
                /**
                 * Explicitly set the initial representation ratio. If initalBitrate is specified, this is ignored.
                 * @see{streaming.abr.maxRepresentationRatio}
                 * @property audio {number} Bitrate for audio
                 * @property video {number} Bitrate for video
                 * @alias streaming.abr.initialRepresentationRatio
                 * @default NaN
                 * @memberof module:Settings.Schema
                 */
                initialRepresentationRatio: { audio: NaN, video: NaN },
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
                } else {
                    log('Warning: the settings option \'' + path + n + '\' wasn\'t found and will be ignored.');
                    //If you're getting this warning, then the passed in partial object doesn't match whats expected.
                    //Check it against the defaultSettings object.
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

    const instance = {
        get: get,
        update: update,
        reset: reset
    };

    return instance;
}


Settings.__dashjs_factory_name = 'Settings';
let factory = FactoryMaker.getSingletonFactory(Settings);
export default factory;
