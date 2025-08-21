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
import FactoryMaker from './FactoryMaker.js';
import Utils from './Utils.js';
import Debug from '../core/Debug.js';
import Constants from '../streaming/constants/Constants.js';
import {HTTPRequest} from '../streaming/vo/metrics/HTTPRequest.js';
import EventBus from './EventBus.js';
import Events from './events/Events.js';

/** @module Settings
 * @description Define the configuration parameters of Dash.js MediaPlayer.
 * @see {@link module:Settings~PlayerSettings PlayerSettings} for further information about the supported configuration properties.
 */


/**
 * @typedef {Object} PlayerSettings
 * @property {module:Settings~DebugSettings} [debug]
 * Debug related settings.
 * @property {module:Settings~ErrorSettings} [errors]
 * Error related settings
 * @property {module:Settings~StreamingSettings} [streaming]
 * Streaming related settings.
 * @example
 *
 * // Full settings object
 * settings = {
 *        debug: {
 *            logLevel: Debug.LOG_LEVEL_WARNING,
 *            dispatchEvent: false
 *        },
 *        streaming: {
 *            abandonLoadTimeout: 10000,
 *            wallclockTimeUpdateInterval: 100,
 *            manifestUpdateRetryInterval: 100,
 *            liveUpdateTimeThresholdInMilliseconds: 0,
 *            cacheInitSegments: false,
 *            applyServiceDescription: true,
 *            applyProducerReferenceTime: true,
 *            applyContentSteering: true,
 *            enableManifestDurationMismatchFix: true,
 *            parseInbandPrft: false,
 *            enableManifestTimescaleMismatchFix: false,
 *            capabilities: {
 *               filterUnsupportedEssentialProperties: true,
 *               supportedEssentialProperties: [
 *                   { schemeIdUri: Constants.FONT_DOWNLOAD_DVB_SCHEME },
 *                   { schemeIdUri: Constants.COLOUR_PRIMARIES_SCHEME_ID_URI, value: /1|5|6|7/ },
 *                   { schemeIdUri: Constants.URL_QUERY_INFO_SCHEME },
 *                   { schemeIdUri: Constants.EXT_URL_QUERY_INFO_SCHEME },
 *                   { schemeIdUri: Constants.MATRIX_COEFFICIENTS_SCHEME_ID_URI, value: /0|1|5|6/ },
 *                   { schemeIdUri: Constants.TRANSFER_CHARACTERISTICS_SCHEME_ID_URI, value: /1|6|13|14|15/ },
 *                   ...Constants.THUMBNAILS_SCHEME_ID_URIS.map(ep => { return { 'schemeIdUri': ep }; })
 *               ],
 *               useMediaCapabilitiesApi: true,
 *               filterVideoColorimetryEssentialProperties: false,
 *               filterHDRMetadataFormatEssentialProperties: false
 *            },
 *            events: {
 *              eventControllerRefreshDelay: 100,
 *              deleteEventMessageDataTimeout: 10000
 *            }
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
 *                useSuggestedPresentationDelay: true
 *            },
 *            protection: {
 *                keepProtectionMediaKeys: false,
 *                keepProtectionMediaKeysMaximumOpenSessions: -1,
 *                ignoreEmeEncryptedEvent: false,
 *                detectPlayreadyMessageFormat: true,
 *                ignoreKeyStatuses: false
 *            },
 *            buffer: {
 *                enableSeekDecorrelationFix: false,
 *                fastSwitchEnabled: true,
 *                flushBufferAtTrackSwitch: false,
 *                reuseExistingSourceBuffers: true,
 *                bufferPruningInterval: 10,
 *                bufferToKeep: 20,
 *                bufferTimeAtTopQuality: 30,
 *                bufferTimeAtTopQualityLongForm: 60,
 *                initialBufferLevel: NaN,
 *                bufferTimeDefault: 18,
 *                longFormContentDurationThreshold: 600,
 *                stallThreshold: 0.3,
 *                lowLatencyStallThreshold: 0.3,
 *                useAppendWindow: true,
 *                setStallState: true,
 *                avoidCurrentTimeRangePruning: false,
 *                useChangeType: true,
 *                mediaSourceDurationInfinity: true,
 *                resetSourceBuffersForTrackSwitch: false,
 *                syntheticStallEvents: {
 *                    enabled: false,
 *                    ignoreReadyState: false
 *                }
 *            },
 *            gaps: {
 *                jumpGaps: true,
 *                jumpLargeGaps: true,
 *                smallGapLimit: 1.5,
 *                threshold: 0.3,
 *                enableSeekFix: true,
 *                enableStallFix: false,
 *                stallSeek: 0.1
 *            },
 *            utcSynchronization: {
 *                enabled: true,
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
 *                defaultTimeout: 500,
 *                lowLatencyTimeout: 0,
 *                scheduleWhilePaused: true
 *            },
 *            text: {
 *                defaultEnabled: true,
 *                dispatchForManualRendering: false,
 *                extendSegmentedCues: true,
 *                imsc: {
 *                    displayForcedOnlyMode: false,
 *                    enableRollUp: true
 *                },
 *                webvtt: {
 *                    customRenderingEnabled: false
 *                }
 *            },
 *            liveCatchup: {
 *                maxDrift: NaN,
 *                playbackRate: {min: NaN, max: NaN},
 *                playbackBufferMin: 0.5,
 *                enabled: null,
 *                mode: Constants.LIVE_CATCHUP_MODE_DEFAULT
 *            },
 *            lastBitrateCachingInfo: { enabled: true, ttl: 360000 },
 *            lastMediaSettingsCachingInfo: { enabled: true, ttl: 360000 },
 *            saveLastMediaSettingsForCurrentStreamingSession: true,
 *            cacheLoadThresholds: { video: 10, audio: 5 },
 *            trackSwitchMode: {
 *                audio: Constants.TRACK_SWITCH_MODE_ALWAYS_REPLACE,
 *                video: Constants.TRACK_SWITCH_MODE_NEVER_REPLACE
 *            },
 *            ignoreSelectionPriority: false,
 *            prioritizeRoleMain: true,
 *            assumeDefaultRoleAsMain: true,
 *            selectionModeForInitialTrack: Constants.TRACK_SELECTION_MODE_HIGHEST_EFFICIENCY,
 *            fragmentRequestTimeout: 20000,
 *            fragmentRequestProgressTimeout: -1,
 *            manifestRequestTimeout: 10000,
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
 *             abr: {
 *                 limitBitrateByPortal: false,
 *                 usePixelRatioInLimitBitrateByPortal: false,
 *                rules: {
 *                     throughputRule: {
 *                         active: true
 *                     },
 *                     bolaRule: {
 *                         active: true
 *                     },
 *                     insufficientBufferRule: {
 *                         active: true,
 *                         parameters: {
 *                             throughputSafetyFactor: 0.7,
 *                             segmentIgnoreCount: 2
 *                         }
 *                     },
 *                     switchHistoryRule: {
 *                         active: true,
 *                         parameters: {
 *                             sampleSize: 8,
 *                             switchPercentageThreshold: 0.075
 *                         }
 *                     },
 *                     droppedFramesRule: {
 *                         active: true,
 *                         parameters: {
 *                             minimumSampleSize: 375,
 *                             droppedFramesPercentageThreshold: 0.15
 *                         }
 *                     },
 *                     abandonRequestsRule: {
 *                         active: true,
 *                         parameters: {
 *                             abandonDurationMultiplier: 1.8,
 *                             minSegmentDownloadTimeThresholdInMs: 500,
 *                             minThroughputSamplesThreshold: 6
 *                         }
 *                     },
 *                     l2ARule: {
 *                         active: false
 *                     },
 *                     loLPRule: {
 *                         active: false
 *                     }
 *                 },
 *                 throughput: {
 *                     averageCalculationMode: Constants.THROUGHPUT_CALCULATION_MODES.EWMA,
 *                     lowLatencyDownloadTimeCalculationMode: Constants.LOW_LATENCY_DOWNLOAD_TIME_CALCULATION_MODE.MOOF_PARSING,
 *                     useResourceTimingApi: true,
 *                     useNetworkInformationApi: {
 *                         xhr: false,
 *                         fetch: false
 *                     },
 *                     useDeadTimeLatency: true,
 *                     bandwidthSafetyFactor: 0.9,
 *                     sampleSettings: {
 *                         live: 3,
 *                         vod: 4,
 *                         enableSampleSizeAdjustment: true,
 *                         decreaseScale: 0.7,
 *                         increaseScale: 1.3,
 *                         maxMeasurementsToKeep: 20,
 *                         averageLatencySampleAmount: 4,
 *                     },
 *                     ewma: {
 *                         throughputSlowHalfLifeSeconds: 8,
 *                         throughputFastHalfLifeSeconds: 3,
 *                         latencySlowHalfLifeCount: 2,
 *                         latencyFastHalfLifeCount: 1,
 *                         weightDownloadTimeMultiplicationFactor: 0.0015
 *                     }
 *                 },
 *                 maxBitrate: {
 *                     audio: -1,
 *                     video: -1
 *                 },
 *                 minBitrate: {
 *                     audio: -1,
 *                     video: -1
 *                 },
 *                 initialBitrate: {
 *                     audio: -1,
 *                     video: -1
 *                 },
 *                 autoSwitchBitrate: {
 *                     audio: true,
 *                     video: true
 *                 }
 *             },
 *            cmcd: {
 *                enabled: false,
 *                sid: null,
 *                cid: null,
 *                rtp: null,
 *                rtpSafetyFactor: 5,
 *                mode: Constants.CMCD_MODE_QUERY,
 *                enabledKeys: ['br', 'd', 'ot', 'tb' , 'bl', 'dl', 'mtp', 'nor', 'nrr', 'su' , 'bs', 'rtp' , 'cid', 'pr', 'sf', 'sid', 'st', 'v']
 *                includeInRequests: ['segment', 'mpd'],
 *                version: 1
 *            },
 *            cmsd: {
 *                enabled: false,
 *                abr: {
 *                    applyMb: false,
 *                    etpWeightRatio: 0
 *                }
 *            },
 *            defaultSchemeIdUri: {
 *                viewpoint: '',
 *                audioChannelConfiguration: 'urn:mpeg:mpegB:cicp:ChannelConfiguration',
 *                role: 'urn:mpeg:dash:role:2011',
 *                accessibility: 'urn:mpeg:dash:role:2011'
 *            }
 *          },
 *          errors: {
 *            recoverAttempts: {
 *                mediaErrorDecode: 5
 *             }
 *          }
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
 * @typedef {Object} EventSettings
 * @property {number} [eventControllerRefreshDelay=100]
 * Interval timer used by the EventController to check if events need to be triggered or removed.
 * @property {number} [deleteEventMessageDataTimeout=10000]
 * If this value is larger than -1 the EventController will delete the message data attributes of events after they have been started and dispatched to the application.
 * This is to save memory in case events have a long duration and need to be persisted in the EventController.
 * This parameter defines the time in milliseconds between the start of an event and when the message data is deleted.
 * If an event is dispatched for the second time (e.g. when the user seeks back) the message data will not be included in the dispatched event if it has been deleted already.
 * Set this value to -1 to not delete any message data.
 */

/**
 * @typedef {Object} LiveDelay
 * @property {number} [liveDelayFragmentCount=NaN]
 * Changing this value will lower or increase live stream latency.
 *
 * The detected segment duration will be multiplied by this value to define a time in seconds to delay a live stream from the live edge.
 *
 * Lowering this value will lower latency but may decrease the player's ability to build a stable buffer.
 * @property {number} [liveDelay=NaN]
 * Equivalent in seconds of setLiveDelayFragmentCount.
 *
 * Lowering this value will lower latency but may decrease the player's ability to build a stable buffer.
 *
 * This value should be less than the manifest duration by a couple of segment durations to avoid playback issues.
 *
 * If set, this parameter will take precedence over setLiveDelayFragmentCount and manifest info.
 * @property {boolean} [useSuggestedPresentationDelay=true]
 * Set to true if you would like to overwrite the default live delay and honor the SuggestedPresentationDelay attribute in by the manifest.
 */

/**
 * @typedef {Object} Buffer
 * @property {boolean} [enableSeekDecorrelationFix=false]
 * Enables a workaround for playback start on some devices, e.g. WebOS 4.9.
 * It is necessary because some browsers do not support setting currentTime on video element to a value that is outside of current buffer.
 *
 * If you experience unexpected seeking triggered by BufferController, you can try setting this value to false.

 * @property {boolean} [fastSwitchEnabled=true]
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
 * Otherwise, track switching will be effective only once after previous buffered track is fully consumed.
 * @property {boolean} [reuseExistingSourceBuffers=true]
 * Enable reuse of existing MediaSource Sourcebuffers during period transition.
 * @property {number} [bufferPruningInterval=10]
 * The interval of pruning buffer in seconds.
 * @property {number} [bufferToKeep=20]
 * This value influences the buffer pruning logic.
 *
 * Allows you to modify the buffer that is kept in source buffer in seconds.
 * 0|-----------bufferToPrune-----------|-----bufferToKeep-----|currentTime|
 * @property {number} [bufferTimeDefault=18]
 * The time that the internal buffer target will be set to when not playing at the top quality.
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
 * @property {number} [stallThreshold=0.3]
 * Stall threshold used in BufferController.js to determine whether a track should still be changed and which buffer range to prune.
 * @property {number} [lowLatencyStallThreshold=0.3]
 * Low Latency stall threshold used in BufferController.js to determine whether a track should still be changed and which buffer range to prune.
 * @property {boolean} [useAppendWindow=true]
 * Specifies if the appendWindow attributes of the MSE SourceBuffers should be set according to content duration from manifest.
 * @property {boolean} [setStallState=true]
 * Specifies if we fire manual waiting events once the stall threshold is reached.
 * @property {module:Settings~SyntheticStallSettings} [syntheticStallEvents]
 * Specifies if manual stall events are to be fired once the stall threshold is reached.
 * @property {boolean} [avoidCurrentTimeRangePruning=false]
 * Avoids pruning of the buffered range that contains the current playback time.
 *
 * That buffered range is likely to have been enqueued for playback. Pruning it causes a flush and reenqueue in WPE and WebKitGTK based browsers. This stresses the video decoder and can cause stuttering on embedded platforms.
 * @property {boolean} [useChangeType=true]
 * If this flag is set to true then dash.js will use the MSE v.2 API call "changeType()" before switching to a different codec family.
 * Note that some platforms might not implement the changeType function. dash.js is checking for the availability before trying to call it.
 * @property {boolean} [mediaSourceDurationInfinity=true]
 * If this flag is set to true then dash.js will allow `Infinity` to be set as the MediaSource duration otherwise the duration will be set to `Math.pow(2,32)` instead of `Infinity` to allow appending segments indefinitely.
 * Some platforms such as WebOS 4.x have issues with seeking when duration is set to `Infinity`, setting this flag to false resolve this.
 * @property {boolean} [resetSourceBuffersForTrackSwitch=false]
 * When switching to a track that is not compatible with the currently active MSE SourceBuffers, MSE will be reset. This happens when we switch codecs on a system
 * that does not properly implement "changeType()", such as webOS 4.0 and before.
 */

/**
 * @typedef {Object} module:Settings~AudioVideoSettings
 * @property {number|boolean|string} [audio]
 * Configuration for audio media type of tracks.
 * @property {number|boolean|string} [video]
 * Configuration for video media type of tracks.
 */

/**
 * @typedef {Object} module:Settings~SyntheticStallSettings
 * @property {boolean} [enabled]
 * Enables manual stall events and sets the playback rate to 0 once the stall threshold is reached.
 * @property {boolean} [ignoreReadyState]
 * Ignore the media element's ready state when entering or exiting a stall.
 * Enable this when either of these scenarios still occur with synthetic stalls enabled:
 * - If the buffer is empty, but playback is not stalled.
 * - If playback resumes, but a playing event isn't reported.
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
 * @typedef {Object} module:Settings~ErrorSettings
 * @property {object} [recoverAttempts={mediaErrorDecode: 5}]
 * Defines the maximum number of recover attempts for specific media errors.
 *
 * For mediaErrorDecode the player will reset the MSE and skip the blacklisted segment that caused the decode error. The resulting gap will be handled by the GapController.
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
 * @property {number} [smallGapLimit=1.5]
 * Time in seconds for a gap to be considered small.
 * @property {number} [threshold=0.3]
 * Threshold at which the gap handling is executed. If currentRangeEnd - currentTime < threshold the gap jump will be triggered.
 * For live stream the jump might be delayed to keep a consistent live edge.
 * Note that the amount of buffer at which platforms automatically stall might differ.
 * @property {boolean} [enableSeekFix=true]
 * Enables the adjustment of the seek target once no valid segment request could be generated for a specific seek time. This can happen if the user seeks to a position for which there is a gap in the timeline.
 * @property {boolean} [enableStallFix=false]
 * If playback stalled in a buffered range this fix will perform a seek by the value defined in stallSeek to trigger playback again.
 * @property {number} [stallSeek=0.1]
 * Value to be used in case enableStallFix is set to true
 */

/**
 * @typedef {Object} UtcSynchronizationSettings
 * @property {boolean} [enabled=true]
 * Enables or disables the UTC clock synchronization
 * @property {boolean} [useManifestDateHeaderTimeSource=true]
 * Allows you to enable the use of the Date Header, if exposed with CORS, as a timing source for live edge detection.
 *
 * The use of the date header will happen only after the other timing source that take precedence fail or are omitted as described.
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
 * @property {number} [defaultTimeout=500]
 * Default timeout between two consecutive segment scheduling attempts
 * @property {number} [lowLatencyTimeout=0]
 * Default timeout between two consecutive low-latency segment scheduling attempts
 * @property {boolean} [scheduleWhilePaused=true]
 * Set to true if you would like dash.js to keep downloading fragments in the background when the video element is paused.
 */

/**
 * @typedef {Object} Text
 * @property {boolean} [defaultEnabled=true]
 * Enable/disable subtitle rendering by default.
 * @property {boolean} [dispatchForManualRendering=false]
 * Enable/disable firing of CueEnter/CueExt events. This will disable the display of subtitles and should be used when you want to have full control about rendering them.
 * @property {boolean} [extendSegmentedCues=true]
 * Enable/disable patching of segmented cues in order to merge as a single cue by extending cue end time.
 * @property {boolean} [imsc.displayForcedOnlyMode=false]
 * Enable/disable forced only mode in IMSC captions.
 * When true, only those captions where itts:forcedDisplay="true" will be displayed.
 * @property {boolean} [imsc.enableRollUp=true]
 * Enable/disable rollUp style display of IMSC captions.
 * @property {object} [webvtt.customRenderingEnabled=false]
 * Enables the custom rendering for WebVTT captions. For details refer to the "Subtitles and Captions" sample section of dash.js.
 * Custom WebVTT rendering requires the external library vtt.js that can be found in the contrib folder.
 */

/**
 * @typedef {Object} LiveCatchupSettings
 * @property {number} [maxDrift=NaN]
 * Use this method to set the maximum latency deviation allowed before dash.js to do a seeking to live position.
 *
 * In low latency mode, when the difference between the measured latency and the target one, as an absolute number, is higher than the one sets with this method, then dash.js does a seek to live edge position minus the target live delay.
 *
 * LowLatencyMaxDriftBeforeSeeking should be provided in seconds.
 *
 * If 0, then seeking operations won't be used for fixing latency deviations.
 *
 * Note: Catch-up mechanism is only applied when playing low latency live streams.
 * @property {number} [playbackRate={min: NaN, max: NaN}]
 * Use this parameter to set the minimum and maximum catch up rates, as percentages, for low latency live streams.
 *
 * In low latency mode, when measured latency is higher/lower than the target one, dash.js increases/decreases playback rate respectively up to (+/-) the percentage defined with this method until target is reached.
 *
 * Valid values for min catch up rate are in the range -0.5 to 0 (-50% to 0% playback rate decrease)
 *
 * Valid values for max catch up rate are in the range 0 to 1 (0% to 100% playback rate increase).
 *
 * Set min and max to NaN to turn off live catch up feature.
 *
 * These playback rate limits take precedence over any PlaybackRate values in ServiceDescription elements in an MPD. If only one of the min/max properties is given a value, the property without a value will not fall back to a ServiceDescription value. Its default value of NaN will be used.
 *
 * Note: Catch-up mechanism is only applied when playing low latency live streams.
 * @property {number} [playbackBufferMin=0.5]
 * Use this parameter to specify the minimum buffer which is used for LoL+ based playback rate reduction.
 *
 *
 * @property {boolean} [enabled=null]
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
 * If true, the ProtectionController and then created MediaKeys and MediaKeySessions will be preserved during the MediaPlayer lifetime.
 *
 * @property {number} [keepProtectionMediaKeysMaximumOpenSessions=-1]
 * Maximum number of open MediaKeySessions, when keepProtectionMediaKeys is enabled. If set, dash.js will close the oldest sessions when the limit is exceeded. -1 means unlimited.
 * 
 * @property {boolean} [ignoreEmeEncryptedEvent=false]
 * If set to true the player will ignore "encrypted" and "needkey" events thrown by the EME.
 *
 * @property {boolean} [detectPlayreadyMessageFormat=true]
 * If set to true the player will use the raw unwrapped message from the Playready CDM
 *
 * @property {boolean} [ignoreKeyStatuses=false]
 * If set to true the player will ignore the status of a key and try to play the corresponding track regardless whether the key is usable or not.
 */

/**
 * @typedef {Object} Capabilities
 * @property {boolean} [filterUnsupportedEssentialProperties=true]
 * Enable to filter all the AdaptationSets and Representations which contain an unsupported \<EssentialProperty\> element.
 * @property {Array.<string>} [supportedEssentialProperties]
 * List of supported \<EssentialProperty\> elements
 * @property {boolean} [useMediaCapabilitiesApi=true]
 * Enable to use the MediaCapabilities API to check whether codecs are supported. If disabled MSE.isTypeSupported will be used instead.
 * @property {boolean} [filterVideoColorimetryEssentialProperties=false]
 * Enable dash.js to query MediaCapabilities API for signalled Colorimetry EssentialProperties (per schemeIdUris: 'urn:mpeg:mpegB:cicp:ColourPrimaries', 'urn:mpeg:mpegB:cicp:TransferCharacteristics').
 * If disabled, registered properties per supportedEssentialProperties will be allowed without any further checking (including 'urn:mpeg:mpegB:cicp:MatrixCoefficients').
 * @property {boolean} [filterHDRMetadataFormatEssentialProperties=false]
 * Enable dash.js to query MediaCapabilities API for signalled HDR-MetadataFormat EssentialProperty (per schemeIdUri:'urn:dvb:dash:hdr-dmi').
 */

/**
 * @typedef {Object} AbrSettings
 * @property {boolean} [limitBitrateByPortal=false]
 * If true, the size of the video portal will limit the max chosen video resolution.
 * @property {boolean} [usePixelRatioInLimitBitrateByPortal=false]
 * Sets whether to take into account the device's pixel ratio when defining the portal dimensions.
 *
 * Useful on, for example, retina displays.
 * @property {module:Settings~AbrRules} [rules]
 * Enable/Disable individual ABR rules. Note that if the throughputRule and the bolaRule are activated at the same time we switch to a dynamic mode.
 * In the dynamic mode either ThroughputRule or BolaRule are active but not both at the same time.
 *
 * l2ARule and loLPRule are ABR rules that are designed for low latency streams. They are tested as standalone rules meaning the other rules should be deactivated when choosing these rules.
 * @property {module:Settings~ThroughputSettings} [throughput]
 * Settings related to throughput calculation
 * @property {module:Settings~AudioVideoSettings} [maxBitrate={audio: -1, video: -1}]
 * The maximum bitrate that the ABR algorithms will choose. This value is specified in kbps.
 *
 * Use -1 for no limit.
 * @property {module:Settings~AudioVideoSettings} [minBitrate={audio: -1, video: -1}]
 * The minimum bitrate that the ABR algorithms will choose. This value is specified in kbps.
 *
 * Use -1 for no limit.
 * @property {module:Settings~AudioVideoSettings} [initialBitrate={audio: -1, video: -1}]
 * Explicitly set the starting bitrate for audio or video. This value is specified in kbps.
 *
 * Use -1 to let the player decide.
 * @property {module:Settings~AudioVideoSettings} [autoSwitchBitrate={audio: true, video: true}]
 * Indicates whether the player should enable ABR algorithms to switch the bitrate.
 */

/**
 * @typedef {Object} AbrRules
 * @property {module:Settings~ThroughputRule} [throughputRule]
 * Configuration of the Throughput rule
 * @property {module:Settings~BolaRule} [bolaRule]
 * Configuration of the BOLA rule
 * @property {module:Settings~InsufficientBufferRule} [insufficientBufferRule]
 * Configuration of the Insufficient Buffer rule
 * @property {module:Settings~SwitchHistoryRule} [switchHistoryRule]
 * Configuration of the Switch History rule
 * @property {module:Settings~DroppedFramesRule} [droppedFramesRule]
 * Configuration of the Dropped Frames rule
 * @property {module:Settings~AbandonRequestsRule} [abandonRequestsRule]
 * Configuration of the Abandon Requests rule
 * @property {module:Settings~L2ARule} [l2ARule]
 * Configuration of the L2A rule
 * @property {module:Settings~LoLPRule} [loLPRule]
 * Configuration of the LoLP rule
 */

/**
 * @typedef {Object} ThroughputRule
 * @property {boolean} [active=true]
 * Enable or disable the rule
 */

/**
 * @typedef {Object} BolaRule
 * @property {boolean} [active=true]
 * Enable or disable the rule
 */

/**
 * @typedef {Object} InsufficientBufferRule
 * @property {boolean} [active=true]
 * Enable or disable the rule
 * @property {object} [parameters={throughputSafetyFactor=0.7, segmentIgnoreCount=2}]
 * Configures the rule specific parameters.
 *
 * - `throughputSafetyFactor`: The safety factor that is applied to the derived throughput, see example in the Description.
 * - `segmentIgnoreCount`: This rule is not taken into account until the first segmentIgnoreCount media segments have been appended to the buffer.
 */

/**
 * @typedef {Object} SwitchHistoryRule
 * @property {boolean} [active=true]
 * Enable or disable the rule
 * @property {object} [parameters={sampleSize=8, switchPercentageThreshold=0.075}]
 * Configures the rule specific parameters.
 *
 * - `sampleSize`: Number of switch requests ("no switch", because of the selected Representation is already playing or "actual switches") required before the rule is applied
 * - `switchPercentageThreshold`: Ratio of actual quality drops compared to no drops before a quality down-switch is triggered
 */

/**
 * @typedef {Object} DroppedFramesRule
 * @property {boolean} [active=true]
 * Enable or disable the rule
 * @property {object} [parameters={minimumSampleSize=375, droppedFramesPercentageThreshold=0.15}]
 * Configures the rule specific parameters.
 *
 * - `minimumSampleSize`: Sum of rendered and dropped frames required for each Representation before the rule kicks in.
 * - `droppedFramesPercentageThreshold`: Minimum percentage of dropped frames to trigger a quality down switch. Values are defined in the range of 0 - 1.
 */

/**
 * @typedef {Object} AbandonRequestsRule
 * @property {boolean} [active=true]
 * Enable or disable the rule
 * @property {object} [parameters={abandonDurationMultiplier=1.8, minSegmentDownloadTimeThresholdInMs=500, minThroughputSamplesThreshold=6}]
 * Configures the rule specific parameters.
 *
 * - `abandonDurationMultiplier`: Factor to multiply with the segment duration to compare against the estimated remaining download time of the current segment. See code example above.
 * - `minSegmentDownloadTimeThresholdInMs`: The AbandonRequestRule only kicks if the download time of the current segment exceeds this value.
 * - `minThroughputSamplesThreshold`: Minimum throughput samples (equivalent to number of progress events) required before the AbandonRequestRule kicks in.
 */

/**
 * @typedef {Object} L2ARule
 * @property {boolean} [active=true]
 * Enable or disable the rule
 */

/**
 * @typedef {Object} LoLPRule
 * @property {boolean} [active=true]
 * Enable or disable the rule
 */

/**
 * @typedef {Object} ThroughputSettings
 * @property {string} [averageCalculationMode=Constants.THROUGHPUT_CALCULATION_MODES.EWMA]
 * Defines the default mode for calculating the throughput based on the samples collected during playback.
 *
 * For arithmetic and harmonic mean calculations we use a sliding window with the values defined in "sampleSettings"
 *
 * For exponential weighted moving average calculation the default values can be changed in "ewma"
 * @property {string} [lowLatencyDownloadTimeCalculationMode=Constants.LOW_LATENCY_DOWNLOAD_TIME_CALCULATION_MODE.MOOF_PARSING]
 * Defines the effective download time estimation method we use for low latency streams that utilize the Fetch API and chunked transfer coding
 * @property {boolean} [useResourceTimingApi=true]
 * If set to true the ResourceTimingApi is used to derive the download time and the number of downloaded bytes.
 * This option has no effect for low latency streaming as the download time equals the segment duration in most of the cases and therefor does not provide reliable values
 * @property {object} [useNetworkInformationApi = { xhr=false, fetch=false}]
 * If set to true the NetworkInformationApi is used to derive the current throughput. Browser support is limited, only available in Chrome and Edge.
 * Applies to standard (XHR requests) and/or low latency streaming (Fetch API requests).
 * @property {boolean} [useDeadTimeLatency=true]
 * If true, only the download portion will be considered part of the download bitrate and latency will be regarded as static.
 *
 * If false, the reciprocal of the whole transfer time will be used.
 * @property {number} [bandwidthSafetyFactor=0.9]
 * Standard ABR throughput rules multiply the throughput by this value.
 *
 * It should be between 0 and 1, with lower values giving less rebuffering (but also lower quality)
 * @property {object} [sampleSettings = {live=3,vod=4,enableSampleSizeAdjustment=true,decreaseScale=0.7,increaseScale=1.3,maxMeasurementsToKeep=20,averageLatencySampleAmount=4}]
 * When deriving the throughput based on the arithmetic or harmonic mean these settings define:
 * - `live`: Number of throughput samples to use (sample size) for live streams
 * - `vod`: Number of throughput samples to use (sample size) for VoD streams
 * - `enableSampleSizeAdjustment`: Adjust the sample sizes if throughput samples vary a lot
 * - `decreaseScale`: Increase sample size by one if the ratio of current and previous sample is below or equal this value
 * - `increaseScale`: Increase sample size by one if the ratio of current and previous sample is higher or equal this value
 * - `maxMeasurementsToKeep`: Number of samples to keep before sliding samples out of the window
 * - `averageLatencySampleAmount`: Number of latency samples to use (sample size)
 * @property {object} [ewma={throughputSlowHalfLifeSeconds=8,throughputFastHalfLifeSeconds=3,latencySlowHalfLifeCount=2,latencyFastHalfLifeCount=1, weightDownloadTimeMultiplicationFactor=0.0015}]
 * When deriving the throughput based on the exponential weighted moving average these settings define:
 * - `throughputSlowHalfLifeSeconds`: Number by which the weight of the current throughput measurement is divided, see ThroughputModel._updateEwmaValues
 * - `throughputFastHalfLifeSeconds`: Number by which the weight of the current throughput measurement is divided, see ThroughputModel._updateEwmaValues
 * - `latencySlowHalfLifeCount`: Number by which the weight of the current latency is divided, see ThroughputModel._updateEwmaValues
 * - `latencyFastHalfLifeCount`: Number by which the weight of the current latency is divided, see ThroughputModel._updateEwmaValues
 * - `weightDownloadTimeMultiplicationFactor`: This value is multiplied with the download time in milliseconds to derive the weight for the EWMA calculation.
 */

/**
 * @typedef {Object} CmcdSettings
 * @property {boolean} [applyParametersFromMpd=true]
 * Set to true if dash.js should use the CMCD parameters defined in the MPD.
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
 * @property {number} [rtpSafetyFactor=5]
 * This value is used as a factor for the rtp value calculation: rtp = minBandwidth * rtpSafetyFactor
 *
 * If not specified this value defaults to 5. Note that this value is only used when no static rtp value is defined.
 * @property {number} [mode="query"]
 * The method to use to attach cmcd metrics to the requests. 'query' to use query parameters, 'header' to use http headers.
 *
 * If not specified this value defaults to 'query'.
 * @property {Array.<string>} [enabledKeys]
 * This value is used to specify the desired CMCD parameters. Parameters not included in this list are not reported.
 * @property {Array.<string>} [includeInRequests]
 * Specifies which HTTP GET requests shall carry parameters.
 *
 * If not specified this value defaults to ['segment', 'mpd].
 * @property {number} [version=1]
 * The version of the CMCD to use.
 *
 * If not specified this value defaults to 1.
 */

/**
 * @typedef {Object} module:Settings~CmsdSettings
 * @property {boolean} [enabled=false]
 * Enable or disable the CMSD response headers parsing.
 * @property {module:Settings~CmsdAbrSettings} [abr]
 * Sets additional ABR rules based on CMSD response headers.
 */

/**
 * @typedef {Object} CmsdAbrSettings
 * @property {boolean} [applyMb=false]
 * Set to true if dash.js should apply CMSD maximum suggested bitrate in ABR logic.
 * @property {number} [etpWeightRatio=0]
 * Sets the weight ratio (between 0 and 1) that shall be applied on CMSD estimated throuhgput compared to measured throughput when calculating throughput.
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
 * @property {number} [wallclockTimeUpdateInterval=100]
 * How frequently the wallclockTimeUpdated internal event is triggered (in milliseconds).
 * @property {number} [manifestUpdateRetryInterval=100]
 * For live streams, set the interval-frequency in milliseconds at which dash.js will check if the current manifest is still processed before downloading the next manifest once the minimumUpdatePeriod time has.
 * @property {number} [liveUpdateTimeThresholdInMilliseconds=0]
 * For live streams, postpone syncing time updates until the threshold is passed. Increase if problems occurs during live streams on low end devices.
 * @property {boolean} [cacheInitSegments=false]
 * Enables the caching of init segments to avoid requesting the init segments before each representation switch.
 * @property {boolean} [applyServiceDescription=true]
 * Set to true if dash.js should use the parameters defined in ServiceDescription elements
 * @property {boolean} [applyProducerReferenceTime=true]
 * Set to true if dash.js should use the parameters defined in ProducerReferenceTime elements in combination with ServiceDescription elements.
 * @property {boolean} [applyContentSteering=true]
 * Set to true if dash.js should apply content steering during playback.
 * @property {boolean} [enableManifestDurationMismatchFix=true]
 * For multi-period streams, overwrite the manifest mediaPresentationDuration attribute with the sum of period durations if the manifest mediaPresentationDuration is greater than the sum of period durations
 * @property {boolean} [enableManifestTimescaleMismatchFix=false]
 * Overwrite the manifest segments base information timescale attributes with the timescale set in initialization segments
 * @property {boolean} [parseInbandPrft=false]
 * Set to true if dash.js should parse inband prft boxes (ProducerReferenceTime) and trigger events.
 * @property {module:Settings~Metrics} metrics Metric settings
 * @property {module:Settings~LiveDelay} delay Live Delay settings
 * @property {module:Settings~EventSettings} events Event settings
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
 * @property {module:Settings~CachingInfoSettings} [lastMediaSettingsCachingInfo={enabled: true, ttl: 360000}]
 * Set to false if you would like to disable the last media settings from being stored to localStorage during playback and used to set the initial track for subsequent playback within the expiration window.
 *
 * The default expiration is one hour, defined in milliseconds.
 * @property {boolean} [saveLastMediaSettingsForCurrentStreamingSession=true]
 * Set to true if dash.js should save media settings from last selected track for incoming track selection during current streaming session.
 * @property {module:Settings~AudioVideoSettings} [cacheLoadThresholds={video: 10, audio: 5}]
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
 * @property {} [ignoreSelectionPriority: false]
 * provides the option to disregard any signalled selectionPriority attribute. If disabled and if no initial media settings are set, track selection is accomplished as defined by selectionModeForInitialTrack.
 *
 * @property {} [prioritizeRoleMain: true]
 * provides the option to disable prioritization of AdaptationSets with their Role set to Main
 *
 * @property {} [assumeDefaultRoleAsMain: true]
 * when no Role descriptor is present, assume main per default
 * 
 * @property {string} [selectionModeForInitialTrack="highestEfficiency"]
 * Sets the selection mode for the initial track. This mode defines how the initial track will be selected if no initial media settings are set. If initial media settings are set this parameter will be ignored. Available options are:
 *
 * Possible values
 *
 * - Constants.TRACK_SELECTION_MODE_HIGHEST_BITRATE
 * This mode makes the player select the track with a highest bitrate.
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
 * @property {number} [fragmentRequestTimeout=20000]
 * Time in milliseconds before timing out on loading a media fragment.
 *
 * @property {number} [fragmentRequestProgressTimeout=-1]
 * Time in milliseconds before timing out on loading progress of a media fragment.
 *
 * @property {number} [manifestRequestTimeout=10000]
 * Time in milliseconds before timing out on loading a manifest.
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
 * @property {module:Settings~CmsdSettings} cmsd
 * Settings related to Common Media Server Data parsing.
 * @property {module:Settings~defaultSchemeIdUri} defaultSchemeIdUri
 * Default schemeIdUri for descriptor type elements
 * These strings are used when not provided with setInitialMediaSettingsFor()
 */


/**
 * @class
 * @ignore
 */
function Settings() {
    let instance;
    const context = this.context;
    const eventBus = EventBus(context).getInstance();
    const DISPATCH_KEY_MAP = {
        'streaming.delay.liveDelay': Events.SETTING_UPDATED_LIVE_DELAY,
        'streaming.delay.liveDelayFragmentCount': Events.SETTING_UPDATED_LIVE_DELAY_FRAGMENT_COUNT,
        'streaming.liveCatchup.enabled': Events.SETTING_UPDATED_CATCHUP_ENABLED,
        'streaming.liveCatchup.playbackRate.min': Events.SETTING_UPDATED_PLAYBACK_RATE_MIN,
        'streaming.liveCatchup.playbackRate.max': Events.SETTING_UPDATED_PLAYBACK_RATE_MAX,
        'streaming.abr.rules.throughputRule.active': Events.SETTING_UPDATED_ABR_ACTIVE_RULES,
        'streaming.abr.rules.bolaRule.active': Events.SETTING_UPDATED_ABR_ACTIVE_RULES,
        'streaming.abr.rules.insufficientBufferRule.active': Events.SETTING_UPDATED_ABR_ACTIVE_RULES,
        'streaming.abr.rules.switchHistoryRule.active': Events.SETTING_UPDATED_ABR_ACTIVE_RULES,
        'streaming.abr.rules.droppedFramesRule.active': Events.SETTING_UPDATED_ABR_ACTIVE_RULES,
        'streaming.abr.rules.abandonRequestsRule.active': Events.SETTING_UPDATED_ABR_ACTIVE_RULES,
        'streaming.abr.rules.l2ARule.active': Events.SETTING_UPDATED_ABR_ACTIVE_RULES,
        'streaming.abr.rules.loLPRule.active': Events.SETTING_UPDATED_ABR_ACTIVE_RULES,
        'streaming.abr.maxBitrate.video': Events.SETTING_UPDATED_MAX_BITRATE,
        'streaming.abr.maxBitrate.audio': Events.SETTING_UPDATED_MAX_BITRATE,
        'streaming.abr.minBitrate.video': Events.SETTING_UPDATED_MIN_BITRATE,
        'streaming.abr.minBitrate.audio': Events.SETTING_UPDATED_MIN_BITRATE,
    };

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
            manifestUpdateRetryInterval: 100,
            liveUpdateTimeThresholdInMilliseconds: 0,
            cacheInitSegments: false,
            applyServiceDescription: true,
            applyProducerReferenceTime: true,
            applyContentSteering: true,
            enableManifestDurationMismatchFix: true,
            parseInbandPrft: false,
            enableManifestTimescaleMismatchFix: false,
            capabilities: {
                filterUnsupportedEssentialProperties: true,
                supportedEssentialProperties: [
                    { schemeIdUri: Constants.FONT_DOWNLOAD_DVB_SCHEME },
                    { schemeIdUri: Constants.COLOUR_PRIMARIES_SCHEME_ID_URI, value: /1|5|6|7/ },
                    { schemeIdUri: Constants.URL_QUERY_INFO_SCHEME },
                    { schemeIdUri: Constants.EXT_URL_QUERY_INFO_SCHEME },
                    { schemeIdUri: Constants.MATRIX_COEFFICIENTS_SCHEME_ID_URI, value: /0|1|5|6/ },
                    { schemeIdUri: Constants.TRANSFER_CHARACTERISTICS_SCHEME_ID_URI, value: /1|6|13|14|15/ },
                    ...Constants.THUMBNAILS_SCHEME_ID_URIS.map(ep => {
                        return { 'schemeIdUri': ep };
                    })
                ],
                useMediaCapabilitiesApi: true,
                filterVideoColorimetryEssentialProperties: false,
                filterHDRMetadataFormatEssentialProperties: false
            },
            events: {
                eventControllerRefreshDelay: 100,
                deleteEventMessageDataTimeout: 10000
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
                useSuggestedPresentationDelay: true
            },
            protection: {
                keepProtectionMediaKeys: false,
                keepProtectionMediaKeysMaximumOpenSessions: -1,
                ignoreEmeEncryptedEvent: false,
                detectPlayreadyMessageFormat: true,
                ignoreKeyStatuses: false
            },
            buffer: {
                enableSeekDecorrelationFix: false,
                fastSwitchEnabled: null,
                flushBufferAtTrackSwitch: false,
                reuseExistingSourceBuffers: true,
                bufferPruningInterval: 10,
                bufferToKeep: 20,
                bufferTimeAtTopQuality: 30,
                bufferTimeAtTopQualityLongForm: 60,
                initialBufferLevel: NaN,
                bufferTimeDefault: 18,
                longFormContentDurationThreshold: 600,
                stallThreshold: 0.3,
                lowLatencyStallThreshold: 0.3,
                useAppendWindow: true,
                setStallState: true,
                avoidCurrentTimeRangePruning: false,
                useChangeType: true,
                mediaSourceDurationInfinity: true,
                resetSourceBuffersForTrackSwitch: false,
                syntheticStallEvents: {
                    enabled: false,
                    ignoreReadyState: false
                }
            },
            gaps: {
                jumpGaps: true,
                jumpLargeGaps: true,
                smallGapLimit: 1.5,
                threshold: 0.3,
                enableSeekFix: true,
                enableStallFix: false,
                stallSeek: 0.1
            },
            utcSynchronization: {
                enabled: true,
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
                defaultEnabled: true,
                dispatchForManualRendering: false,
                extendSegmentedCues: true,
                imsc: {
                    displayForcedOnlyMode: false,
                    enableRollUp: true
                },
                webvtt: {
                    customRenderingEnabled: false
                }
            },
            liveCatchup: {
                maxDrift: NaN,
                playbackRate: {
                    min: NaN,
                    max: NaN
                },
                playbackBufferMin: 0.5,
                enabled: null,
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
            saveLastMediaSettingsForCurrentStreamingSession: true,
            cacheLoadThresholds: {
                video: 10,
                audio: 5
            },
            trackSwitchMode: {
                audio: Constants.TRACK_SWITCH_MODE_ALWAYS_REPLACE,
                video: Constants.TRACK_SWITCH_MODE_NEVER_REPLACE
            },
            ignoreSelectionPriority: false,
            prioritizeRoleMain: true,
            assumeDefaultRoleAsMain: true,
            selectionModeForInitialTrack: Constants.TRACK_SELECTION_MODE_HIGHEST_EFFICIENCY,
            fragmentRequestTimeout: 20000,
            fragmentRequestProgressTimeout: -1,
            manifestRequestTimeout: 10000,
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
                limitBitrateByPortal: false,
                usePixelRatioInLimitBitrateByPortal: false,
                enableSupplementalPropertyAdaptationSetSwitching: true,
                rules: {
                    throughputRule: {
                        active: true
                    },
                    bolaRule: {
                        active: true
                    },
                    insufficientBufferRule: {
                        active: true,
                        parameters: {
                            throughputSafetyFactor: 0.7,
                            segmentIgnoreCount: 2
                        }
                    },
                    switchHistoryRule: {
                        active: true,
                        parameters: {
                            sampleSize: 8,
                            switchPercentageThreshold: 0.075
                        }
                    },
                    droppedFramesRule: {
                        active: false,
                        parameters: {
                            minimumSampleSize: 375,
                            droppedFramesPercentageThreshold: 0.15
                        }
                    },
                    abandonRequestsRule: {
                        active: true,
                        parameters: {
                            abandonDurationMultiplier: 1.8,
                            minSegmentDownloadTimeThresholdInMs: 500,
                            minThroughputSamplesThreshold: 6
                        }
                    },
                    l2ARule: {
                        active: false
                    },
                    loLPRule: {
                        active: false
                    }
                },
                throughput: {
                    averageCalculationMode: Constants.THROUGHPUT_CALCULATION_MODES.EWMA,
                    lowLatencyDownloadTimeCalculationMode: Constants.LOW_LATENCY_DOWNLOAD_TIME_CALCULATION_MODE.MOOF_PARSING,
                    useResourceTimingApi: true,
                    useNetworkInformationApi: {
                        xhr: false,
                        fetch: false
                    },
                    useDeadTimeLatency: true,
                    bandwidthSafetyFactor: 0.9,
                    sampleSettings: {
                        live: 3,
                        vod: 4,
                        enableSampleSizeAdjustment: true,
                        decreaseScale: 0.7,
                        increaseScale: 1.3,
                        maxMeasurementsToKeep: 20,
                        averageLatencySampleAmount: 4,
                    },
                    ewma: {
                        throughputSlowHalfLifeSeconds: 8,
                        throughputFastHalfLifeSeconds: 3,
                        latencySlowHalfLifeCount: 2,
                        latencyFastHalfLifeCount: 1,
                        weightDownloadTimeMultiplicationFactor: 0.0015
                    }
                },
                maxBitrate: {
                    audio: -1,
                    video: -1
                },
                minBitrate: {
                    audio: -1,
                    video: -1
                },
                initialBitrate: {
                    audio: -1,
                    video: -1
                },
                autoSwitchBitrate: {
                    audio: true,
                    video: true
                }
            },
            cmcd: {
                applyParametersFromMpd: true,
                enabled: false,
                sid: null,
                cid: null,
                rtp: null,
                rtpSafetyFactor: 5,
                mode: Constants.CMCD_MODE_QUERY,
                enabledKeys: Constants.CMCD_AVAILABLE_KEYS,
                includeInRequests: ['segment', 'mpd'],
                version: 1
            },
            cmsd: {
                enabled: false,
                abr: {
                    applyMb: false,
                    etpWeightRatio: 0
                }
            },
            defaultSchemeIdUri: {
                viewpoint: '',
                audioChannelConfiguration: 'urn:mpeg:mpegB:cicp:ChannelConfiguration',
                role: 'urn:mpeg:dash:role:2011',
                accessibility: 'urn:mpeg:dash:role:2011'
            }
        },
        errors: {
            recoverAttempts: {
                mediaErrorDecode: 5
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
                    if (typeof source[n] === 'object' && !(source[n] instanceof RegExp) && !(source[n] instanceof Array) && source[n] !== null) {
                        mixinSettings(source[n], dest[n], path.slice() + n + '.');
                    } else {
                        dest[n] = Utils.clone(source[n]);
                        if (DISPATCH_KEY_MAP[path + n]) {
                            eventBus.trigger(DISPATCH_KEY_MAP[path + n]);
                        }
                    }
                } else {
                    console.error('Settings parameter ' + path + n + ' is not supported');
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
        get,
        update,
        reset
    };

    return instance;
}


Settings.__dashjs_factory_name = 'Settings';
let factory = FactoryMaker.getSingletonFactory(Settings);
export default factory;
