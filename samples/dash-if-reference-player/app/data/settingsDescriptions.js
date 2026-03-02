/**
 * Settings descriptions extracted from the JSDoc in src/core/Settings.js.
 *
 * Maps each reference-player HTML element ID to its corresponding dash.js
 * setting description.  Used by SettingsController to populate tooltip icons
 * next to each option label.
 */

const SETTINGS_DESCRIPTIONS = {

    // ---- Playback / General ----

    'opt-schedule-while-paused':
        'Set to true if you would like dash.js to keep downloading fragments in the background when the video element is paused.',

    'opt-calc-seg-avail':
        'Enable calculation of the DVR window for SegmentTimeline manifests based on the entries in <SegmentTimeline>.',

    'opt-reuse-sourcebuffers':
        'Enable reuse of existing MediaSource Sourcebuffers during period transition.',

    'opt-mediasource-duration-inf':
        'If this flag is set to true then dash.js will allow Infinity to be set as the MediaSource duration. Otherwise the duration will be set to Math.pow(2,32) instead of Infinity to allow appending segments indefinitely.\n\nSome platforms such as WebOS 4.x have issues with seeking when duration is set to Infinity. Setting this flag to false resolves this.',

    'opt-reset-sb-track-switch':
        'When switching to a track that is not compatible with the currently active MSE SourceBuffers, MSE will be reset. This happens when we switch codecs on a system that does not properly implement changeType(), such as webOS 4.0 and before.',

    'opt-save-last-media':
        'Set to true if dash.js should save media settings from the last selected track for incoming track selection during the current streaming session.',

    'opt-local-storage':
        'Set to false if you would like to disable the last known bit rate from being stored during playback and used to set the initial bit rate for subsequent playback within the expiration window.\n\nThe default expiration is one hour, defined in milliseconds. If expired, the default initial bit rate (closest to 1000 kbps) will be used for that session and a new bit rate will be stored during that session.',

    'opt-jump-gaps':
        'Sets whether the player should jump small gaps (discontinuities) in the buffer.',

    'opt-content-steering':
        'Set to true if dash.js should apply content steering during playback.',

    'opt-catchup-enabled':
        'Use this parameter to enable the catchup mode for non low-latency streams.',

    'opt-catchup-mode':
        'Use this parameter to switch between different catchup modes.\n\nOptions:\n- "liveCatchupModeDefault": Sigmoid-based continuous rate adjustment\n- "liveCatchupModeLoLP": LoL+ hybrid buffer/latency-based rate adjustment\n- "liveCatchupModeStep": Step-based discrete rate adjustment\n\nNote: Catch-up mechanism is automatically applied when playing low latency live streams.',

    'opt-catchup-max-drift':
        'Maximum latency deviation in seconds allowed before dash.js performs a seek back to the live position. When the absolute difference between measured latency and target latency exceeds this value, a seek to live edge occurs instead of playback rate adjustment.\n\nLeave empty to use the default value (12 seconds) or the value from the MPD ServiceDescription.',

    'opt-catchup-live-threshold':
        'When the absolute latency difference (currentLatency - targetLatency) exceeds this threshold, accelerated playback is reset to normal speed (1.0). This prevents catchup from applying rate changes when latency is too far off.\n\nLeave empty to disable this behavior.',

    'opt-catchup-step-start-min':
        'Step mode: Lower bound of the window within which catchup should begin. Defines how far below the target latency (as a ratio, where 1 = target latency) the player must be before the step algorithm starts adjusting the rate.\n\nLeave empty to use the default (0).',

    'opt-catchup-step-start-max':
        'Step mode: Upper bound of the window within which catchup should begin. Defines how far above the target latency (as a ratio, where 1 = target latency) the player must be before the step algorithm starts adjusting the rate.\n\nLeave empty to use the default (1).',

    'opt-catchup-step-stop-min':
        'Step mode: Lower bound of the stop window. When catching up by slowing down, if the delta latency falls within this range, playback returns to normal speed (1.0).\n\nLeave empty to use the default (0).',

    'opt-catchup-step-stop-max':
        'Step mode: Upper bound of the stop window. When catching up by speeding up, if the delta latency falls within this range, playback returns to normal speed (1.0).\n\nLeave empty to use the default (1).',

    // ---- ABR ----

    'opt-fast-switch':
        'When enabled, after an ABR up-switch in quality, instead of requesting and appending the next fragment at the end of the current buffer range it is requested and appended closer to the current time.\n\nWhen enabled, the maximum time to render a higher quality is current time + (1.5 * fragment duration).\n\nIf this value is set to null the player will automatically enable fast switches for non low-latency playback.\n\nNote: When ABR down-switch is detected, the lower quality is appended at the end of the buffer range to preserve the higher quality media for as long as possible.\n\nIf enabled, there are a few cases when the client will not replace inside the buffer range but rather just append at the end:\n1. When the buffer level is less than one fragment duration.\n2. The client is in an Abandonment State due to a recent fragment abandonment event.',

    'opt-auto-switch-video':
        'Indicates whether the player should enable ABR algorithms to switch the bitrate.',

    'opt-rule-throughput':
        'Enable or disable the ThroughputRule.',

    'opt-rule-bola':
        'Enable or disable the BolaRule.',

    'opt-rule-insufficient-buffer':
        'Enable or disable the InsufficientBufferRule.',

    'opt-rule-switch-history':
        'Enable or disable the SwitchHistoryRule.',

    'opt-rule-dropped-frames':
        'Enable or disable the DroppedFramesRule.',

    'opt-rule-abandon':
        'Enable or disable the AbandonRequestsRule.',

    'opt-rule-l2a':
        'Enable or disable the L2ARule.',

    'opt-rule-lolp':
        'Enable or disable the LoLPRule.',

    'opt-init-bitrate-video':
        'Explicitly set the starting bitrate for video. This value is specified in kbps.\n\nUse -1 to let the player decide.',

    'opt-min-bitrate-video':
        'The minimum bitrate that the ABR algorithms will choose. This value is specified in kbps.\n\nUse -1 for no limit.',

    'opt-max-bitrate-video':
        'The maximum bitrate that the ABR algorithms will choose. This value is specified in kbps.\n\nUse -1 for no limit.',

    // ---- Live Delay ----

    'opt-live-delay':
        'Equivalent in seconds of liveDelayFragmentCount.\n\nLowering this value will lower latency but may decrease the player\'s ability to build a stable buffer.\n\nThis value should be less than the manifest duration by a couple of segment durations to avoid playback issues.\n\nIf set, this parameter will take precedence over liveDelayFragmentCount and manifest info.',

    'opt-live-delay-frag-count':
        'Changing this value will lower or increase live stream latency.\n\nThe detected segment duration will be multiplied by this value to define a time in seconds to delay a live stream from the live edge.\n\nLowering this value will lower latency but may decrease the player\'s ability to build a stable buffer.',

    'opt-apply-service-desc':
        'Set to true if dash.js should use the parameters defined in ServiceDescription elements.',

    'opt-use-suggested-pd':
        'Set to true if you would like to overwrite the default live delay and honor the SuggestedPresentationDelay attribute in the manifest.',

    'opt-utc-offset':
        'Offset in milliseconds to apply to the UTC timing source for synchronization.',

    // ---- Text / IMSC ----

    'opt-text-default-enabled':
        'Enable or disable subtitle rendering by default.',

    'opt-imsc-rollup':
        'Enable or disable rollUp style display of IMSC captions.',

    'opt-imsc-forced-only':
        'Enable or disable forced only mode in IMSC captions.\n\nWhen true, only those captions where itts:forcedDisplay="true" will be displayed.',

    // ---- Buffer ----

    'opt-stall-threshold':
        'Stall threshold used in BufferController to determine whether a track should still be changed and which buffer range to prune.',

    'opt-ll-stall-threshold':
        'Low latency stall threshold used in BufferController to determine whether a track should still be changed and which buffer range to prune.',

    // ---- Track Switch Mode ----

    'opt-track-audio-replace':
        'For a given media type defines if existing segments in the buffer should be overwritten once the track is switched. For instance if the user switches the audio language the existing segments in the audio buffer will be replaced when setting this value to "alwaysReplace".\n\nPossible values:\n- alwaysReplace: Replace existing segments in the buffer\n- neverReplace: Do not replace existing segments in the buffer',

    'opt-track-video-replace':
        'For a given media type defines if existing segments in the buffer should be overwritten once the track is switched.\n\nPossible values:\n- alwaysReplace: Replace existing segments in the buffer\n- neverReplace: Do not replace existing segments in the buffer',

    // ---- Debug ----

    'opt-log-level':
        'Sets up the log level. The levels are cumulative. For example, if you set the log level to WARNING all warnings, errors and fatals will be logged.\n\nPossible values:\n- NONE: No message is written in the browser console\n- FATAL: Log fatal errors. An error is considered fatal when it causes playback to fail completely\n- ERROR: Log error messages\n- WARNING: Log warning messages\n- INFO: Log info messages\n- DEBUG: Log debug messages',

    // ---- CMCD ----

    'opt-cmcd-enabled':
        'Enable or disable the CMCD reporting.',

    'opt-cmcd-mode':
        'The method to use to attach CMCD metrics to the requests. "query" to use query parameters, "header" to use HTTP headers.\n\nIf not specified this value defaults to "query".',

    'opt-cmcd-session-id':
        'GUID identifying the current playback session.\n\nShould be in UUID format. If not specified a UUID will be automatically generated.',

    'opt-cmcd-content-id':
        'A unique string to identify the current content.\n\nIf not specified it will be a hash of the MPD URL.',

    'opt-cmcd-rtp':
        'The requested maximum throughput that the client considers sufficient for delivery of the asset.\n\nIf not specified this value will be dynamically calculated in the CMCDModel based on the current buffer level.',

    'opt-cmcd-rtp-safety':
        'This value is used as a factor for the rtp value calculation: rtp = minBandwidth * rtpSafetyFactor.\n\nIf not specified this value defaults to 5. Note that this value is only used when no static rtp value is defined.',

    'opt-cmcd-enabled-keys':
        'This value is used to specify the desired CMCD parameters. Parameters not included in this list are not reported.',

    // ---- CMSD ----

    'opt-cmsd-enabled':
        'Enable or disable the CMSD response headers parsing.',

    'opt-cmsd-apply-mb':
        'Set to true if dash.js should apply CMSD maximum suggested bitrate in ABR logic.',

    'opt-cmsd-etp-weight':
        'Sets the weight ratio (between 0 and 1) that shall be applied on CMSD estimated throughput compared to measured throughput when calculating throughput.',

    // ---- Enhancement ----

    'opt-enhancement-enabled':
        'Enable or disable the scalable enhancement playback (e.g. LCEVC).'
};

export default SETTINGS_DESCRIPTIONS;
