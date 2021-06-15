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
import {HTTPRequest} from '../streaming/vo/metrics/HTTPRequest';

/** @module Settings
 * @description Define the configuration parameters of Dash.js MediaPlayer.
 * @see {@link module:Settings~PlayerSettings PlayerSettings} for further information about the supported configuration properties.
 */


/**
 * @typedef {Object} PlayerSettings
 * @property {module:Settings~DebugSettings} [debug]
 * Debug related settings.
 * @property {module:Settings~StreamingSettings} [streaming]
 * Streaming related settings.
 * @example
 *
 * // Full settings object
 * settings = {
 *  debug: {
 *            logLevel: Debug.LOG_LEVEL_WARNING,
 *            dispatchEvent: false
 *        },
 *        streaming: {
 *            abandonLoadTimeout: 10000,
 *            wallclockTimeUpdateInterval: 100,
 *            lowLatencyEnabled: false,
 *            manifestUpdateRetryInterval: 100,
 *            cacheInitSegments: true,
 *            eventControllerRefreshDelay: 100,
 *            capabilities: {
 *               filterUnsupportedEssentialProperties: true,
 *               useMediaCapabilitiesApi: false
 *            },
 *            timeShiftBuffer: {
 *                calcFromSegmentTimeline: false,
 *                fallbackToSegmentTimeline: true
 *            },
 *            metrics: {
 *              maxListDepth: 100
 *            },
 *            delay: {
 *                liveDelayFragmentCount: NaN,
 *                liveDelay: NaN,
 *                useSuggestedPresentationDelay: true,
 *                applyServiceDescription: true
 *            },
 *            protection: {
 *                keepProtectionMediaKeys: false
 *            },
 *            buffer: {
 *                fastSwitchEnabled: true,
 *                flushBufferAtTrackSwitch: false,
 *                reuseExistingSourceBuffers: true,
 *                bufferPruningInterval: 10,
 *                bufferToKeep: 20,
 *                bufferTimeAtTopQuality: 30,
 *                bufferTimeAtTopQualityLongForm: 60,
 *                initialBufferLevel: NaN,
 *                stableBufferTime: 12,
 *                longFormContentDurationThreshold: 600,
 *                stallThreshold: 0.5,
 *                useAppendWindow: true,
 *                setStallState: false
 *            },
 *            gaps: {
 *                jumpGaps: true,
 *                jumpLargeGaps: true,
 *                smallGapLimit: 1.5,
 *                threshold: 0.3
 *            },
 *            utcSynchronization: {
 *                useManifestDateHeaderTimeSource: true,
 *                backgroundAttempts: 2,
 *                timeBetweenSyncAttempts: 30,
 *                maximumTimeBetweenSyncAttempts: 600,
 *                minimumTimeBetweenSyncAttempts: 2,
 *                timeBetweenSyncAttemptsAdjustmentFactor: 2,
 *                maximumAllowedDrift: 100,
 *                enableBackgroundSyncAfterSegmentDownloadError: true,
 *                defaultTimingSource: {
 *                    scheme: 'urn:mpeg:dash:utc:http-xsdate:2014',
 *                    value: 'http://time.akamai.com/?iso&ms'
 *                }
 *            },
 *            scheduling: {
 *                defaultTimeout: 300,
 *                lowLatencyTimeout: 100,
 *                scheduleWhilePaused: true
 *            },
 *            text: {
 *                defaultEnabled: true
 *            },
 *            liveCatchup: {
 *                minDrift: 0.02,
 *                maxDrift: 0,
 *                playbackRate: 0.5,
 *                latencyThreshold: 60,
 *                playbackBufferMin: 0.5,
 *                enabled: false,
 *                mode: Constants.LIVE_CATCHUP_MODE_DEFAULT
 *            },
 *            lastBitrateCachingInfo: { enabled: true, ttl: 360000 },
 *            lastMediaSettingsCachingInfo: { enabled: true, ttl: 360000 },
 *            cacheLoadThresholds: { video: 50, audio: 5 },
 *            trackSwitchMode: {
 *                audio: Constants.TRACK_SWITCH_MODE_ALWAYS_REPLACE,
 *                video: Constants.TRACK_SWITCH_MODE_NEVER_REPLACE
 *            },
 *            selectionModeForInitialTrack: Constants.TRACK_SELECTION_MODE_HIGHEST_BITRATE,
 *            fragmentRequestTimeout: 0,
 *            retryIntervals: {
 *                [HTTPRequest.MPD_TYPE]: 500,
 *                [HTTPRequest.XLINK_EXPANSION_TYPE]: 500,
 *                [HTTPRequest.MEDIA_SEGMENT_TYPE]: 1000,
 *                [HTTPRequest.INIT_SEGMENT_TYPE]: 1000,
 *                [HTTPRequest.BITSTREAM_SWITCHING_SEGMENT_TYPE]: 1000,
 *                [HTTPRequest.INDEX_SEGMENT_TYPE]: 1000,
 *                [HTTPRequest.MSS_FRAGMENT_INFO_SEGMENT_TYPE]: 1000,
 *                [HTTPRequest.LICENSE]: 1000,
 *                [HTTPRequest.OTHER_TYPE]: 1000,
 *                lowLatencyReductionFactor: 10
 *            },
 *            retryAttempts: {
 *                [HTTPRequest.MPD_TYPE]: 3,
 *                [HTTPRequest.XLINK_EXPANSION_TYPE]: 1,
 *                [HTTPRequest.MEDIA_SEGMENT_TYPE]: 3,
 *                [HTTPRequest.INIT_SEGMENT_TYPE]: 3,
 *                [HTTPRequest.BITSTREAM_SWITCHING_SEGMENT_TYPE]: 3,
 *                [HTTPRequest.INDEX_SEGMENT_TYPE]: 3,
 *                [HTTPRequest.MSS_FRAGMENT_INFO_SEGMENT_TYPE]: 3,
 *                [HTTPRequest.LICENSE]: 3,
 *                [HTTPRequest.OTHER_TYPE]: 3,
 *                lowLatencyMultiplyFactor: 5
 *            },
 *            abr: {
 *                movingAverageMethod: Constants.MOVING_AVERAGE_SLIDING_WINDOW,
 *                ABRStrategy: Constants.ABR_STRATEGY_DYNAMIC,
 *                additionalAbrRules: {
 *                   insufficientBufferRule: false,
 *                   switchHistoryRule: true,
 *                   droppedFramesRule: true,
 *                   abandonRequestsRule: false
 *                },
 *                bandwidthSafetyFactor: 0.9,
 *                useDefaultABRRules: true,
 *                useDeadTimeLatency: true,
 *                limitBitrateByPortal: false,
 *                usePixelRatioInLimitBitrateByPortal: false,
 *                maxBitrate: { audio: -1, video: -1 },
 *                minBitrate: { audio: -1, video: -1 },
 *                maxRepresentationRatio: { audio: 1, video: 1 },
 *                initialBitrate: { audio: -1, video: -1 },
 *                initialRepresentationRatio: { audio: -1, video: -1 },
 *                autoSwitchBitrate: { audio: true, video: true },
 *                fetchThroughputCalculationMode: Constants.ABR_FETCH_THROUGHPUT_CALCULATION_DOWNLOADED_DATA
 *            },
 *            cmcd: {
 *                enabled: false,
 *                sid: null,
 *                cid: null,
 *                rtp: null,
 *                rtpSafetyFactor: 5,
 *                mode: Constants.CMCD_MODE_QUERY
 *            }
 *      }
 * }
 */

/**
 * @typedef {Object} TimeShiftBuffer
 * @property {boolean} [calcFromSegmentTimeline=false]
 * Enable calculation of the DVR window for SegmentTimeline manifests based on the entries in \<SegmentTimeline\>.
 *  * @property {boolean} [fallbackToSegmentTimeline=true]
 * In case the MPD uses \<SegmentTimeline\ and no segment is found within the DVR window the DVR window is calculated based on the entries in \<SegmentTimeline\>.
 */

/**
 * @typedef {Object} LiveDelay
 * @property {number} [liveDelayFragmentCount=NaN]
 * Changing this value will lower or increase live stream latency.
 *
 * The detected segment duration will be multiplied by this value to define a time in seconds to delay a live stream from the live edge.
 *
 * Lowering this value will lower latency but may decrease the player's ability to build a stable buffer.
 * @property {number} [liveDelay]
 * Equivalent in seconds of setLiveDelayFragmentCount.
 *
 * Lowering this value will lower latency but may decrease the player's ability to build a stable buffer.
 *
 * This value should be less than the manifest duration by a couple of segment durations to avoid playback issues.
 *
 * If set, this parameter will take precedence over setLiveDelayFragmentCount and manifest info.
 * @property {boolean} [useSuggestedPresentationDelay=true]
 * Set to true if you would like to overwrite the default live delay and honor the SuggestedPresentationDelay attribute in by the manifest.
 * @property {boolean} [applyServiceDescription=true]
 * Set to true if dash.js should use latency targets defined in ServiceDescription elements
 */

/**
 * @typedef {Object} Buffer
 * @property {boolean} [fastSwitchEnabled=false]
 * When enabled, after an ABR up-switch in quality, instead of requesting and appending the next fragment at the end of the current buffer range it is requested and appended closer to the current time.
 *
 * When enabled, The maximum time to render a higher quality is current time + (1.5 * fragment duration).
 *
 * Note, When ABR down-switch is detected, we appended the lower quality at the end of the buffer range to preserve the
 * higher quality media for as long as possible.
 *
 * If enabled, it should be noted there are a few cases when the client will not replace inside buffer range but rather just append at the end.
 * 1. When the buffer level is less than one fragment duration.
 * 2. The client is in an Abandonment State due to recent fragment abandonment event.
 *
 * Known issues:
 * 1. In IE11 with auto switching off, if a user switches to a quality they can not download in time the fragment may be appended in the same range as the playhead or even in the past, in IE11 it may cause a stutter or stall in playback.
 * @property {boolean} [flushBufferAtTrackSwitch=false]
 * When enabled, after a track switch and in case buffer is being replaced, the video element is flushed (seek at current playback time) once a segment of the new track is appended in buffer in order to force video decoder to play new track.
 *
 * This can be required on some devices like GoogleCast devices to make track switching functional.
 *
 * Otherwise track switching will be effective only once after previous buffered track is fully consumed.
 * @property {boolean} [reuseExistingSourceBuffers=true]
 * Enable reuse of existing MediaSource Sourcebuffers during period transition.
 * @property {number} [bufferPruningInterval=10]
 * The interval of pruning buffer in seconds.
 * @property {number} [bufferToKeep=20]
 * This value influences the buffer pruning logic.
 *
 * Allows you to modify the buffer that is kept in source buffer in seconds.
 * 0|-----------bufferToPrune-----------|-----bufferToKeep-----|currentTime|
 * @property {number} [bufferTimeAtTopQuality=30]
 * The time that the internal buffer target will be set to once playing the top quality.
 *
 * If there are multiple bitrates in your adaptation, and the media is playing at the highest bitrate, then we try to build a larger buffer at the top quality to increase stability and to maintain media quality.
 * @property {number} [bufferTimeAtTopQualityLongForm=60]
 * The time that the internal buffer target will be set to once playing the top quality for long form content.
 * @property {number} [longFormContentDurationThreshold=600]
 * The threshold which defines if the media is considered long form content.
 *
 * This will directly affect the buffer targets when playing back at the top quality.
 * @property {number} [initialBufferLevel=NaN]
 * Initial buffer level before playback starts
 * @property {number} [stableBufferTime=12]
 * The time that the internal buffer target will be set to post startup/seeks (NOT top quality).
 *
 * When the time is set higher than the default you will have to wait longer to see automatic bitrate switches but will have a larger buffer which will increase stability.
 * @property {number} [stallThreshold=0.3]
 * Stall threshold used in BufferController.js to determine whether a track should still be changed and which buffer range to prune.
 * @property {boolean} [useAppendWindow=true]
 * Specifies if the appendWindow attributes of the MSE SourceBuffers should be set according to content duration from manifest.
 * @property {boolean} [setStallState=false]
 * Specifies if we fire manual waiting events once the stall threshold is reached
 */

/**
 * @typedef {Object} module:Settings~AudioVideoSettings
 * @property {number|boolean|string} [audio]
 * Configuration for audio media type of tracks.
 * @property {number|boolean|string} [video]
 * Configuration for video media type of tracks.
 */

/**
 * @typedef {Object} DebugSettings
 * @property {number} [logLevel=dashjs.Debug.LOG_LEVEL_WARNING]
 * Sets up the log level. The levels are cumulative.
 *
 * For example, if you set the log level to dashjs.Debug.LOG_LEVEL_WARNING all warnings, errors and fatals will be logged.
 *
 * Possible values.
 *
 * - dashjs.Debug.LOG_LEVEL_NONE
 * No message is written in the browser console.
 *
 * - dashjs.Debug.LOG_LEVEL_FATAL
 * Log fatal errors.
 * An error is considered fatal when it causes playback to fail completely.
 *
 * - dashjs.Debug.LOG_LEVEL_ERROR
 * Log error messages.
 *
 * - dashjs.Debug.LOG_LEVEL_WARNING
 * Log warning messages.
 *
 * - dashjs.Debug.LOG_LEVEL_INFO
 * Log info messages.
 *
 * - dashjs.Debug.LOG_LEVEL_DEBUG
 * Log debug messages.
 * @property {boolean} [dispatchEvent=false]
 * Enable to trigger a Events.LOG event whenever log output is generated.
 *
 * Note this will be dispatched regardless of log level.
 */

/**
 * @typedef {Object} CachingInfoSettings
 * @property {boolean} [enable]
 * Enable or disable the caching feature.
 * @property {number} [ttl]
 * Time to live.
 *
 * A value defined in milliseconds representing how log to cache the settings for.
 */

/**
 * @typedef {Object} Gaps
 * @property {boolean} [jumpGaps=true]
 * Sets whether player should jump small gaps (discontinuities) in the buffer.
 * @property {boolean} [jumpLargeGaps=true]
 * Sets whether player should jump large gaps (discontinuities) in the buffer.
 * @property {number} [smallGapLimit=1.8]
 * Time in seconds for a gap to be considered small.
 * @property {number} [threshold=0.3]
 * Threshold at which the gap handling is executed. If currentRangeEnd - currentTime < threshold the gap jump will be triggered.
 * For live stream the jump might be delayed to keep a consistent live edge.
 * Note that the amount of buffer at which platforms automatically stall might differ.
 */

/**
 * @typedef {Object} UtcSynchronizationSettings
 *
 * @property {boolean} [useManifestDateHeaderTimeSource=true]
 * Allows you to enable the use of the Date Header, if exposed with CORS, as a timing source for live edge detection.
 *
 * @property {number} [backgroundAttempts=2]
 * Number of synchronization attempts to perform in the background after an initial synchronization request has been done. This is used to verify that the derived client-server offset is correct.
 *
 * The background requests are async and done in parallel to the start of the playback.
 *
 * This value is also used to perform a resync after 404 errors on segments.
 * @property {number} [timeBetweenSyncAttempts=30]
 * The time in seconds between two consecutive sync attempts.
 *
 * Note: This value is used as an initial starting value. The internal value of the TimeSyncController is adjusted during playback based on the drift between two consecutive synchronization attempts.
 *
 * Note: A sync is only performed after an MPD update. In case the @minimumUpdatePeriod is larger than this value the sync will be delayed until the next MPD update.
 * @property {number} [maximumTimeBetweenSyncAttempts=600]
 * The maximum time in seconds between two consecutive sync attempts.
 *
 * @property {number} [minimumTimeBetweenSyncAttempts=2]
 * The minimum time in seconds between two consecutive sync attempts.
 *
 * @property {number} [timeBetweenSyncAttemptsAdjustmentFactor=2]
 * The factor used to multiply or divide the timeBetweenSyncAttempts parameter after a sync. The maximumAllowedDrift defines whether this value is used as a factor or a dividend.
 *
 * @property {number} [maximumAllowedDrift=100]
 * The maximum allowed drift specified in milliseconds between two consecutive synchronization attempts.
 *
 * @property {boolean} [enableBackgroundSyncAfterSegmentDownloadError=true]
 * Enables or disables the background sync after the player ran into a segment download error.
 *
 * @property {object} [defaultTimingSource={scheme:'urn:mpeg:dash:utc:http-xsdate:2014',value: 'http://time.akamai.com/?iso&ms'}]
 * The default timing source to be used. The timing sources in the MPD take precedence over this one.
 */

/**
 * @typedef {Object} Scheduling
 * @property {number} [defaultTimeout=300]
 * Default timeout between two consecutive segment scheduling attempts
 * @property {number} [lowLatencyTimeout]
 * Default timeout between two consecutive low-latency segment scheduling attempts
 * @property {boolean} [scheduleWhilePaused=true]
 * Set to true if you would like dash.js to keep downloading fragments in the background when the video element is paused.
 */

/**
 * @typedef {Object} Text
 * @property {number} [defaultEnabled=true]
 * Enable/disable subtitle rendering by default.
 */

/**
 * @typedef {Object} LiveCatchupSettings
 * @property {number} [minDrift=0.02]
 * Use this method to set the minimum latency deviation allowed before activating catch-up mechanism.
 *
 * In low latency mode, when the difference between the measured latency and the target one, as an absolute number, is higher than the one sets with this method, then dash.js increases/decreases playback rate until target latency is reached.
 *
 * LowLatencyMinDrift should be provided in seconds, and it uses values between 0.0 and 0.5.
 *
 * Note: Catch-up mechanism is only applied when playing low latency live streams.
 * @property {number} [maxDrift=0]
 * Use this method to set the maximum latency deviation allowed before dash.js to do a seeking to live position.
 *
 * In low latency mode, when the difference between the measured latency and the target one, as an absolute number, is higher than the one sets with this method, then dash.js does a seek to live edge position minus the target live delay.
 *
 * LowLatencyMaxDriftBeforeSeeking should be provided in seconds.
 *
 * If 0, then seeking operations won't be used for fixing latency deviations.
 *
 * Note: Catch-up mechanism is only applied when playing low latency live streams.
 * @property {number} [playbackRate=0.5]
 * Use this parameter to set the maximum catch up rate, as a percentage, for low latency live streams.
 *
 * In low latency mode, when measured latency is higher/lower than the target one, dash.js increases/decreases playback rate respectively up to (+/-) the percentage defined with this method until target is reached.
 *
 * Valid values for catch up rate are in range 0-0.5 (0-50%).
 *
 * Set it to 0 to turn off live catch up feature.
 *
 * Note: Catch-up mechanism is only applied when playing low latency live streams.
 * @property {number} [latencyThreshold=NaN]
 * Use this parameter to set the maximum threshold for which live catch up is applied.
 *
 * For instance, if this value is set to 8 seconds, then live catchup is only applied if the current live latency is equal or below 8 seconds.
 *
 * The reason behind this parameter is to avoid an increase of the playback rate if the user seeks within the DVR window.
 *
 * If no value is specified this will be twice the maximum live delay.
 *
 * The maximum live delay is either specified in the manifest as part of a ServiceDescriptor or calculated the following:
 * maximumLiveDelay = targetDelay + liveCatchupMinDrift.
 *
 * @property {number} [playbackBufferMin=NaN]
 * Use this parameter to specify the minimum buffer which is used for LoL+ based playback rate reduction.
 *
 *
 * @property {boolean} [enabled=false]
 * Use this parameter to enable the catchup mode for non low-latency streams.
 *
 * @property {string} [mode="liveCatchupModeDefault"]
 * Use this parameter to switch between different catchup modes.
 *
 * Options: "liveCatchupModeDefault" or "liveCatchupModeLOLP".
 *
 * Note: Catch-up mechanism is automatically applied when playing low latency live streams.
 */

/**
 * @typedef {Object} RequestTypeSettings
 * @property {number} [MPD]
 * Manifest type of requests.
 * @property {number} [XLinkExpansion]
 * XLink expansion type of requests.
 * @property {number} [InitializationSegment]
 * Request to retrieve an initialization segment.
 * @property {number} [IndexSegment]
 * Request to retrieve an index segment (SegmentBase).
 * @property {number} [MediaSegment]
 * Request to retrieve a media segment (video/audio/image/text chunk).
 * @property {number} [BitstreamSwitchingSegment]
 * Bitrate stream switching type of request.
 * @property {number} [FragmentInfoSegment]
 * Request to retrieve a FragmentInfo segment (specific to Smooth Streaming live streams).
 * @property {number} [other]
 * Other type of request.
 * @property {number} [lowLatencyReductionFactor]
 * For low latency mode, values of type of request are divided by lowLatencyReductionFactor.
 *
 * Note: It's not type of request.
 * @property {number} [lowLatencyMultiplyFactor]
 * For low latency mode, values of type of request are multiplied by lowLatencyMultiplyFactor.
 *
 * Note: It's not type of request.
 */

/**
 * @typedef {Object} Protection
 * @property {boolean} [keepProtectionMediaKeys=false]
 * Set the value for the ProtectionController and MediaKeys life cycle.
 *
 * If true, the ProtectionController and then created MediaKeys and MediaKeySessions will be preserved during the MediaPlayer lifetime.
 */

/**
 * @typedef {Object} Capabilities
 * @property {boolean} [filterUnsupportedEssentialProperties=true]
 * Enable to filter all the AdaptationSets and Representations which contain an unsupported \<EssentialProperty\> element.
 * @property {boolean} [useMediaCapabilitiesApi=false]
 * Enable to use the MediaCapabilities API to check whether codecs are supported. If disabled MSE.isTypeSupported will be used instead.
 */

/**
 * @typedef {Object} AbrSettings
 * @property {string} [movingAverageMethod="slidingWindow"]
 * Sets the moving average method used for smoothing throughput estimates.
 *
 * Valid methods are "slidingWindow" and "ewma".
 *
 * The call has no effect if an invalid method is passed.
 *
 * The sliding window moving average method computes the average throughput using the last four segments downloaded.
 *
 * If the stream is live (as opposed to VOD), then only the last three segments are used.
 *
 * If wide variations in throughput are detected, the number of segments can be dynamically increased to avoid oscillations.
 *
 * The exponentially weighted moving average (EWMA) method computes the average using exponential smoothing.
 *
 * Two separate estimates are maintained, a fast one with a three-second half life and a slow one with an eight-second half life.
 *
 * The throughput estimate at any time is the minimum of the fast and slow estimates.
 *
 * This allows a fast reaction to a bandwidth drop and prevents oscillations on bandwidth spikes.
 * @property {string} [ABRStrategy="abrDynamic"]
 * Returns the current ABR strategy being used: "abrDynamic", "abrBola" or "abrThroughput".
 * @property {object} [trackSwitchMode={video: "neverReplace", audio: "alwaysReplace"}]
 * @property {object} [additionalAbrRules={insufficientBufferRule: false,switchHistoryRule: true,droppedFramesRule: true,abandonRequestsRule: false}]
 * Enable/Disable additional ABR rules in case ABRStrategy is set to "abrDynamic", "abrBola" or "abrThroughput".
 * @property {number} [bandwidthSafetyFactor=0.9]
 * Standard ABR throughput rules multiply the throughput by this value.
 *
 * It should be between 0 and 1, with lower values giving less rebuffering (but also lower quality).
 * @property {boolean} [useDefaultABRRules=true]
 * Should the default ABR rules be used, or the custom ones added.
 * @property {boolean} [useDeadTimeLatency=true]
 * If true, only the download portion will be considered part of the download bitrate and latency will be regarded as static.
 *
 * If false, the reciprocal of the whole transfer time will be used.
 * @property {boolean} [limitBitrateByPortal=false]
 * If true, the size of the video portal will limit the max chosen video resolution.
 * @property {boolean} [usePixelRatioInLimitBitrateByPortal=false]
 * Sets whether to take into account the device's pixel ratio when defining the portal dimensions.
 *
 * Useful on, for example, retina displays.
 * @property {module:Settings~AudioVideoSettings} [maxBitrate={audio: -1, video: -1}]
 * The maximum bitrate that the ABR algorithms will choose.
 *
 * Use NaN for no limit.
 * @property {module:Settings~AudioVideoSettings} [minBitrate={audio: -1, video: -1}]
 * The minimum bitrate that the ABR algorithms will choose.
 *
 * Use NaN for no limit.
 * @property {module:Settings~AudioVideoSettings} [maxRepresentationRatio={audio: 1, video: 1}]
 * When switching multi-bitrate content (auto or manual mode) this property specifies the maximum representation allowed, as a proportion of the size of the representation set.
 *
 * You can set or remove this cap at anytime before or during playback.
 *
 * To clear this setting you set the value to 1.
 *
 * If both this and maxAllowedBitrate are defined, maxAllowedBitrate is evaluated first, then maxAllowedRepresentation, i.e. the lowest value from executing these rules is used.
 *
 * This feature is typically used to reserve higher representations for playback only when connected over a fast connection.
 * @property {module:Settings~AudioVideoSettings} [initialBitrate={audio: -1, video: -1}]
 * Explicitly set the starting bitrate for audio or video.
 * @property {module:Settings~AudioVideoSettings} [initialRepresentationRatio={audio: -1, video: -1}]
 * Explicitly set the initial representation ratio.
 *
 * If initalBitrate is specified, this is ignored.
 * @property {module:Settings~AudioVideoSettings} [autoSwitchBitrate={audio: true, video: true}]
 * Indicates whether the player should enable ABR algorithms to switch the bitrate.
 *
 * @property {string} [fetchThroughputCalculationMode="abrFetchThroughputCalculationDownloadedData"]
 * Algorithm to determine the throughput in case the Fetch API is used for low latency streaming.
 *
 * For details please check the samples section and FetchLoader.js.
 */

/**
 * @typedef {Object} module:Settings~CmcdSettings
 * @property {boolean} [enable=false]
 * Enable or disable the CMCD reporting.
 * @property {string} [sid]
 * GUID identifying the current playback session.
 *
 * Should be in UUID format.
 *
 * If not specified a UUID will be automatically generated.
 * @property {string} [cid]
 * A unique string to identify the current content.
 *
 * If not specified it will be a hash of the MPD url.
 * @property {number} [rtp]
 * The requested maximum throughput that the client considers sufficient for delivery of the asset.
 *
 * If not specified this value will be dynamically calculated in the CMCDModel based on the current buffer level.
 * @property {number} [rtpSafetyFactor]
 * This value is used as a factor for the rtp value calculation: rtp = minBandwidth * rtpSafetyFactor
 *
 * If not specified this value defaults to 5. Note that this value is only used when no static rtp value is defined.
 * @property {number} [mode]
 * The method to use to attach cmcd metrics to the requests. 'query' to use query parameters, 'header' to use http headers.
 *
 * If not specified this value defaults to 'query'.
 */

/**
 * @typedef {Object} Metrics
 * @property {number} [metricsMaxListDepth=100]
 * Maximum number of metrics that are persisted per type.
 */

/**
 * @typedef {Object} StreamingSettings
 * @property {number} [abandonLoadTimeout=10000]
 * A timeout value in seconds, which during the ABRController will block switch-up events.
 *
 * This will only take effect after an abandoned fragment event occurs.
 * @property {number} [wallclockTimeUpdateInterval=50]
 * How frequently the wallclockTimeUpdated internal event is triggered (in milliseconds).
 * @property {boolean} [lowLatencyEnabled=false]
 * Enable or disable low latency mode.
 *
 * The use of the date header will happen only after the other timing source that take precedence fail or are omitted as described.
 * @property {number} [manifestUpdateRetryInterval=100]
 * For live streams, set the interval-frequency in milliseconds at which dash.js will check if the current manifest is still processed before downloading the next manifest once the minimumUpdatePeriod time has.
 * @property {boolean} [cacheInitSegments=true]
 * Enables the caching of init segments to avoid requesting the init segments before each representation switch.
 * @property {number} [eventControllerRefreshDelay=100]
 * Defines the delay in milliseconds between two consecutive checks for events to be fired.
 * @property {module:Settings~Metrics} metrics Metric settings
 * @property {module:Settings~LiveDelay} delay Live Delay settings
 * @property {module:Settings~TimeShiftBuffer} timeShiftBuffer TimeShiftBuffer settings
 * @property {module:Settings~Protection} protection DRM related settings
 * @property {module:Settings~Capabilities} capabilities Capability related settings
 * @property {module:Settings~Buffer}  buffer Buffer related settings
 * @property {module:Settings~Gaps}  gaps Gap related settings
 * @property {module:Settings~UtcSynchronizationSettings} utcSynchronization Settings related to UTC clock synchronization
 * @property {module:Settings~Scheduling} scheduling Settings related to segment scheduling
 * @property {module:Settings~Text} text Settings related to Subtitles and captions
 * @property {module:Settings~LiveCatchupSettings} liveCatchup  Settings related to live catchup.
 * @property {module:Settings~CachingInfoSettings} [lastBitrateCachingInfo={enabled: true, ttl: 360000}]
 * Set to false if you would like to disable the last known bit rate from being stored during playback and used to set the initial bit rate for subsequent playback within the expiration window.
 *
 * The default expiration is one hour, defined in milliseconds.
 *
 * If expired, the default initial bit rate (closest to 1000 kbps) will be used for that session and a new bit rate will be stored during that session.
 * @property {module:Settings~AudioVideoSettings} [cacheLoadThresholds={video: 50, audio: 5}]
 * For a given media type, the threshold which defines if the response to a fragment request is coming from browser cache or not.
 * @property {module:Settings~AudioVideoSettings} [trackSwitchMode={video: "neverReplace", audio: "alwaysReplace"}]
 * For a given media type defines if existing segments in the buffer should be overwritten once the track is switched. For instance if the user switches the audio language the existing segments in the audio buffer will be replaced when setting this value to "alwaysReplace".
 *
 * Possible values
 *
 * - Constants.TRACK_SWITCH_MODE_ALWAYS_REPLACE
 * Replace existing segments in the buffer
 *
 * - Constants.TRACK_SWITCH_MODE_NEVER_REPLACE
 * Do not replace existing segments in the buffer
 *
 * @property {string} [selectionModeForInitialTrack="highestBitrate"]
 * Sets the selection mode for the initial track. This mode defines how the initial track will be selected if no initial media settings are set. If initial media settings are set this parameter will be ignored. Available options are:
 *
 * Possible values
 *
 * - Constants.TRACK_SELECTION_MODE_HIGHEST_BITRATE
 * This mode makes the player select the track with a highest bitrate. This mode is a default mode.
 *
 * - Constants.TRACK_SELECTION_MODE_FIRST_TRACK
 * This mode makes the player select the first track found in the manifest.
 *
 * - Constants.TRACK_SELECTION_MODE_HIGHEST_EFFICIENCY
 * This mode makes the player select the track with the lowest bitrate per pixel average.
 *
 * - Constants.TRACK_SELECTION_MODE_WIDEST_RANGE
 * This mode makes the player select the track with a widest range of bitrates.
 *
 *
 * @property {number} [fragmentRequestTimeout=0]
 * Time in milliseconds before timing out on loading a media fragment.
 *
 * Fragments that timeout are retried as if they failed.
 * @property {module:Settings~RequestTypeSettings} [retryIntervals]
 * Time in milliseconds of which to reload a failed file load attempt.
 *
 * For low latency mode these values are divided by lowLatencyReductionFactor.
 * @property {module:Settings~RequestTypeSettings} [retryAttempts]
 * Total number of retry attempts that will occur on a file load before it fails.
 *
 * For low latency mode these values are multiplied by lowLatencyMultiplyFactor.
 * @property {module:Settings~AbrSettings} abr
 * Adaptive Bitrate algorithm related settings.
 * @property {module:Settings~CmcdSettings} cmcd
 * Settings related to Common Media Client Data reporting.
 */


/**
 * @class
 * @ignore
 */
function Settings() {
    let instance;

    /**
     * @const {PlayerSettings} defaultSettings
     * @ignore
     */
    const defaultSettings = {
        debug: {
            logLevel: Debug.LOG_LEVEL_WARNING,
            dispatchEvent: false
        },
        streaming: {
            abandonLoadTimeout: 10000,
            wallclockTimeUpdateInterval: 100,
            lowLatencyEnabled: false,
            manifestUpdateRetryInterval: 100,
            cacheInitSegments: false,
            eventControllerRefreshDelay: 150,
            capabilities: {
                filterUnsupportedEssentialProperties: true,
                useMediaCapabilitiesApi: false
            },
            timeShiftBuffer: {
                calcFromSegmentTimeline: false,
                fallbackToSegmentTimeline: true
            },
            metrics: {
                maxListDepth: 100
            },
            delay: {
                liveDelayFragmentCount: NaN,
                liveDelay: NaN,
                useSuggestedPresentationDelay: true,
                applyServiceDescription: true
            },
            protection: {
                keepProtectionMediaKeys: false
            },
            buffer: {
                fastSwitchEnabled: true,
                flushBufferAtTrackSwitch: false,
                reuseExistingSourceBuffers: true,
                bufferPruningInterval: 10,
                bufferToKeep: 20,
                bufferTimeAtTopQuality: 30,
                bufferTimeAtTopQualityLongForm: 60,
                initialBufferLevel: NaN,
                stableBufferTime: 12,
                longFormContentDurationThreshold: 600,
                stallThreshold: 0.3,
                useAppendWindow: true,
                setStallState: true
            },
            gaps: {
                jumpGaps: true,
                jumpLargeGaps: true,
                smallGapLimit: 1.5,
                threshold: 0.3
            },
            utcSynchronization: {
                useManifestDateHeaderTimeSource: true,
                backgroundAttempts: 2,
                timeBetweenSyncAttempts: 30,
                maximumTimeBetweenSyncAttempts: 600,
                minimumTimeBetweenSyncAttempts: 2,
                timeBetweenSyncAttemptsAdjustmentFactor: 2,
                maximumAllowedDrift: 100,
                enableBackgroundSyncAfterSegmentDownloadError: true,
                defaultTimingSource: {
                    scheme: 'urn:mpeg:dash:utc:http-xsdate:2014',
                    value: 'https://time.akamai.com/?iso&ms'
                }
            },
            scheduling: {
                defaultTimeout: 500,
                lowLatencyTimeout: 0,
                scheduleWhilePaused: true
            },
            text: {
                defaultEnabled: true
            },
            liveCatchup: {
                minDrift: 0.02,
                maxDrift: 0,
                playbackRate: 0.5,
                latencyThreshold: 60,
                playbackBufferMin: 0.5,
                enabled: false,
                mode: Constants.LIVE_CATCHUP_MODE_DEFAULT
            },
            lastBitrateCachingInfo: {
                enabled: true,
                ttl: 360000
            },
            lastMediaSettingsCachingInfo: {
                enabled: true,
                ttl: 360000
            },
            cacheLoadThresholds: {
                video: 50,
                audio: 5
            },
            trackSwitchMode: {
                audio: Constants.TRACK_SWITCH_MODE_ALWAYS_REPLACE,
                video: Constants.TRACK_SWITCH_MODE_NEVER_REPLACE
            },
            selectionModeForInitialTrack: Constants.TRACK_SELECTION_MODE_HIGHEST_BITRATE,
            fragmentRequestTimeout: 0,
            retryIntervals: {
                [HTTPRequest.MPD_TYPE]: 500,
                [HTTPRequest.XLINK_EXPANSION_TYPE]: 500,
                [HTTPRequest.MEDIA_SEGMENT_TYPE]: 1000,
                [HTTPRequest.INIT_SEGMENT_TYPE]: 1000,
                [HTTPRequest.BITSTREAM_SWITCHING_SEGMENT_TYPE]: 1000,
                [HTTPRequest.INDEX_SEGMENT_TYPE]: 1000,
                [HTTPRequest.MSS_FRAGMENT_INFO_SEGMENT_TYPE]: 1000,
                [HTTPRequest.LICENSE]: 1000,
                [HTTPRequest.OTHER_TYPE]: 1000,
                lowLatencyReductionFactor: 10
            },
            retryAttempts: {
                [HTTPRequest.MPD_TYPE]: 3,
                [HTTPRequest.XLINK_EXPANSION_TYPE]: 1,
                [HTTPRequest.MEDIA_SEGMENT_TYPE]: 3,
                [HTTPRequest.INIT_SEGMENT_TYPE]: 3,
                [HTTPRequest.BITSTREAM_SWITCHING_SEGMENT_TYPE]: 3,
                [HTTPRequest.INDEX_SEGMENT_TYPE]: 3,
                [HTTPRequest.MSS_FRAGMENT_INFO_SEGMENT_TYPE]: 3,
                [HTTPRequest.LICENSE]: 3,
                [HTTPRequest.OTHER_TYPE]: 3,
                lowLatencyMultiplyFactor: 5
            },
            abr: {
                movingAverageMethod: Constants.MOVING_AVERAGE_SLIDING_WINDOW,
                ABRStrategy: Constants.ABR_STRATEGY_DYNAMIC,
                additionalAbrRules: {
                    insufficientBufferRule: true,
                    switchHistoryRule: true,
                    droppedFramesRule: true,
                    abandonRequestsRule: false
                },
                bandwidthSafetyFactor: 0.9,
                useDefaultABRRules: true,
                useDeadTimeLatency: true,
                limitBitrateByPortal: false,
                usePixelRatioInLimitBitrateByPortal: false,
                maxBitrate: {
                    audio: -1,
                    video: -1
                },
                minBitrate: {
                    audio: -1,
                    video: -1
                },
                maxRepresentationRatio: {
                    audio: 1,
                    video: 1
                },
                initialBitrate: {
                    audio: -1,
                    video: -1
                },
                initialRepresentationRatio: {
                    audio: -1,
                    video: -1
                },
                autoSwitchBitrate: {
                    audio: true,
                    video: true
                },
                fetchThroughputCalculationMode: Constants.ABR_FETCH_THROUGHPUT_CALCULATION_MOOF_PARSING
            },
            cmcd: {
                enabled: false,
                sid: null,
                cid: null,
                rtp: null,
                rtpSafetyFactor: 5,
                mode: Constants.CMCD_MODE_QUERY
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
                    if (typeof source[n] === 'object' && source[n] !== null) {
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
