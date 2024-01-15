/**
 * Hardcoded order of the Setting Group we want to display
 */
export const settingGroups = {
  PLAYBACK: {
    gaps: 'testing',
    flushBufferAtTrackSwitch: 'When enabled, after a track switch and in case buffer is being replaced (see MEdiaPlayer.setTrackSwitchModeFor(Constants.TRACK_SWITCH_MODE_ALWAYS_REPLACE)), the video element is flushed (seek at current playback time) once a segment of the new track is appended in buffer in order to force video decoder to play new track. This can be required on some devices like GoogleCast devices to make track switching functional. Otherwise track switching will be effective only once after previous buffered track is fully consumed.',
    jumpGaps: 'Sets whether player should jump small gaps (discontinuities) in the buffer',
    jumpLargeGaps: 'Sets whether player should jump large gaps (discontinuities) in the buffer',
    smallGapLimit: 'Time in seconds for a gap to be considered small',
    lastBitrateCachingInfo: 'Set to false if you would like to disable the last known bit rate from being stored during playback and used to set the initial bit rate for subsequent playback within the expiration window.\n' +
      '\n' +
      'The default expiration is one hour, defined in milliseconds. If expired, the default initial bit rate (closest to 1000 kbps) will be used for that session and a new bit rate will be stored during that session.',
    lastMediaSettingsCachingInfo: 'Set to false if you would like to disable the last known lang for audio (or camera angle for video) from being stored during playback and used to set the initial settings for subsequent playback within the expiration window.\n' +
      '\n' +
      'The default expiration is one hour, defined in milliseconds. If expired, the default settings will be used for that session and a new settings will be stored during that session.',
    cacheLoadThresholds: 'For a given media type, the threshold which defines if the response to a fragment request is coming from browser cache or not.\n' +
      '\n',
    scheduleWhilePaused: 'Set to true if you would like dash.js to keep downloading fragments in the background when the video element is paused',
    defaultTimeout: 'Default timeout between two consecutive segment scheduling attempts',
    calcFromSegmentTimeline: 'Enable calculation of the DVR window for SegmentTimeline manifests based on the entries in \<SegmentTimeline\>',
    fallbackToSegmentTimeline: 'In case the MPD uses \<SegmentTimeline\ and no segment is found within the DVR window the DVR window is calculated based on the entries in \<SegmentTimeline\>',
    reuseExistingSourceBuffers: 'Enable reuse of existing MediaSource Sourcebuffers during period transition',
    sampleSettings: 'When deriving the throughput based on the arithmetic or harmonic mean these settings define:\n' +
    ' - live: Number of throughput samples to use (sample size) for live streams\n' +
    ' - vod: Number of throughput samples to use (sample size) for VoD streams\n' +
    ' - enableSampleSizeAdjustment: Adjust the sample sizes if throughput samples vary a lot\n' +
    ' - decreaseScale: Increase sample size by one if the ratio of current and previous sample is below or equal this value\n' +
    ' - increaseScale: Increase sample size by one if the ratio of current and previous sample is higher or equal this value\n' +
    ' - maxMeasurementsToKeep: Number of samples to keep before sliding samples out of the window\n' +
    ' - averageLatencySampleAmount: Number of latency samples to use (sample size)',
  },
  ABR: {
    fastSwitchEnabled: 'When enabled, after an ABR up-switch in quality, instead of requesting and appending the next fragment at the end of the current buffer range it is requested and appended closer to the current time When enabled, The maximum time to render a higher quality is current time + (1.5 * fragment duration).\n' +
      'Note, When ABR down-switch is detected, we appended the lower quality at the end of the buffer range to preserve the higher quality media for as long as possible.\n' +
      '\n' +
      'If enabled, it should be noted there are a few cases when the client will not replace inside buffer range but rather just append at the end. 1. When the buffer level is less than one fragment duration 2. The client is in an Abandonment State due to recent fragment abandonment event.\n' +
      '\n' +
      'Known issues:\n' +
      '\n' +
      'In IE11 with auto switching off, if a user switches to a quality they can not download in time the fragment may be appended in the same range as the playhead or even in the past, in IE11 it may cause a stutter or stall in playback.',  // Fast Switching ABR
      averageCalculationMode: 'Sets the moving average method used for smoothing throughput estimates. Valid methods are "slidingWindow" and "ewma". The call has no effect if an invalid method is passed.\n' +
      '\n' +
      'The sliding window moving average method computes the average throughput using the last four segments downloaded. If the stream is live (as opposed to VOD), then only the last three segments are used. If wide variations in throughput are detected, the number of segments can be dynamically increased to avoid oscillations.\n' +
      '\n' +
      'The exponentially weighted moving average (EWMA) method computes the average using exponential smoothing. Two separate estimates are maintained, a fast one with a three-second half life and a slow one with an eight-second half life. The throughput estimate at any time is the minimum of the fast and slow estimates. This allows a fast reaction to a bandwidth drop and prevents oscillations on bandwidth spikes.',
    useResourceTimingApi: 'If set to true the ResourceTimingApi is used to derive the download time and the number of downloaded bytes.\n' +
     'This option has no effect for low latency streaming as the download time equals the segment duration in most of the cases and therefor does not provide reliable values',
    useNetworkInformationApi: ' If set to true the NetworkInformationApi is used to derive the current throughput. Browser support is limited, only available in Chrome and Edge.' +
      'Applies to standard (XHR requests) and/or low latency streaming (Fetch API requests).', 
    ABRStrategy: 'Returns the current ABR strategy being used: "abrDynamic", "abrBola" or "abrThroughput"',
    activeRules: '* Enable/Disable individual ABR rules. Note that if the throughputRule and the bolaRule are activated at the same time we switch to a dynamic mode.\n'+
    'In the dynamic mode either ThroughputRule or BolaRule are active but not both at the same time.\n\n'+
    'l2ARule and loLPRule are ABR rules that are designed for low latency streams. They are tested as standalone rules meaning the other rules should be deactivated when choosing these rules.',
    throughputRule: 'This is a test!',
    bandwidthSafetyFactor: 'Standard ABR throughput rules multiply the throughput by this value. It should be between 0 and 1, with lower values giving less rebuffering (but also lower quality).',
    useDefaultABRRules: 'Should the default ABR rules be used, or the custom ones added.',
    useBufferOccupancyABR: 'no description available yet',
    useDeadTimeLatency: 'If true, only the download portion will be considered part of the download bitrate and latency will be regarded as static. If false, the reciprocal of the whole transfer time will be used.',
    limitBitrateByPortal: 'If true, the size of the video portal will limit the max chosen video resolution.',
    usePixelRatioInLimitBitrateByPortal: 'Sets whether to take into account the device\'s pixel ratio when defining the portal dimensions. Useful on, for example, retina displays.',
    maxRepresentationRatio: 'When switching multi-bitrate content (auto or manual mode) this property specifies the maximum representation allowed, as a proportion of the size of the representation set.\n' +
      '\n' +
      'You can set or remove this cap at anytime before or during playback. To clear this setting you set the value to 1.\n' +
      '\n' +
      'If both this and maxAllowedBitrate are defined, maxAllowedBitrate is evaluated first, then maxAllowedRepresentation, i.e. the lowest value from executing these rules is used.\n' +
      '\n' +
      'This feature is typically used to reserve higher representations for playback only when connected over a fast connection.',
    autoSwitchBitrate: 'Indicates whether the player should enable ABR algorithms to switch the bitrate.\n' +
      '\n',
    fetchThroughputCalculationMode: 'Algorithm to determine the throughput in case the Fetch API is used for low latency streaming. For details please check the samples section and FetchLoader.js',
    ewma: 'When deriving the throughput based on the exponential weighted moving average these settings define:\n' +
    ' - throughputSlowHalfLifeSeconds: Number by which the weight of the current throughput measurement is divided, see ThroughputModel._updateEwmaValues\n' +
    ' - throughputFastHalfLifeSeconds: Number by which the weight of the current throughput measurement is divided, see ThroughputModel._updateEwmaValues\n' +
    ' - latencySlowHalfLifeCount: Number by which the weight of the current latency is divided, see ThroughputModel._updateEwmaValues\n' +
    ' - latencyFastHalfLifeCount: Number by which the weight of the current latency is divided, see ThroughputModel._updateEwmaValues',

  },
  INITIAL: {
    initialBitrate: 'Explicitly set the starting bitrate for audio or video',
    initialRepresentationRatio: 'Explicitly set the initial representation ratio. If initalBitrate is specified, this is ignored',
    initialBufferLevel: 'Initial buffer level before playback starts',
    liveDelay: 'Equivalent in seconds of setLiveDelayFragmentCount Lowering this value will lower latency but may decrease the player\'s ability to build a stable buffer. This value should be less than the manifest duration by a couple of segment durations to avoid playback issues If set, this parameter will take precedence over setLiveDelayFragmentCount and manifest info',
    maxBitrate: 'The maximum bitrate that the ABR algorithms will choose. Use NaN for no limit.',
    minBitrate: 'The minimum bitrate that the ABR algorithms will choose. Use NaN for no limit.',
    selectionModeForInitialTrack: 'no description available yet',
    wallclockTimeUpdateInterval: 'How frequently the wallclockTimeUpdated internal event is triggered (in milliseconds).',
    keepProtectionMediaKeys: 'Set the value for the ProtectionController and MediaKeys life cycle. If true, the ProtectionController and then created MediaKeys and MediaKeySessions will be preserved during the MediaPlayer lifetime.',
    useManifestDateHeaderTimeSource: 'Allows you to enable the use of the Date Header, if exposed with CORS, as a timing source for live edge detection. The use of the date header will happen only after the other timing source that take precedence fail or are omitted as described.',
    useSuggestedPresentationDelay: 'Set to true if you would like to override the default live delay and honor the SuggestedPresentationDelay attribute in by the manifest.',
    defaultSchemeIdUri: 'Default schemeIdUri for descriptor type elements' +
    'These strings are used when not provided with setInitialMediaSettingsFor()',
  },
  LOWLATENCY: {
    lowLatencyEnabled: 'Enable or disable low latency mode',
    liveCatchUpMinDrift: 'no description available yet',
    liveCatchUpMaxDrift: 'no description available yet',
    liveCatchUpPlaybackRate: 'no description available yet',
    liveCatchupLatencyThreshold: 'no description available yet',
    lowLatencyMultiplyFactor: 'For low latency mode, values of type of request are multiplied by lowLatencyMultiplyFactor.\n' +
      '\n' +
      'Note: It\'s not type of request.',
    liveDelayFragmentCount: 'Changing this value will lower or increase live stream latency.\n' +
      '\n' +
      'The detected segment duration will be multiplied by this value to define a time in seconds to delay a live stream from the live edge.\n' +
      '\n' +
      'Lowering this value will lower latency but may decrease the player\'s ability to build a stable buffer.',
    liveCatchup: 'minDrift: Use this method to set the minimum latency deviation allowed before activating catch-up mechanism.\n' +
      '\n' + ' maxDrift: Use this method to set the maximum latency deviation allowed before dash.js to do a seeking to live position.\n' +
      '\n' + 'PlaybackRate: Use this parameter to set the maximum catch up rate, as a percentage, for low latency live streams.\n' +
      '\n' + 'LatencyThreshold: Use this parameter to set the maximum threshold for which live catch up is applied.',
      lowLatencyTimeout: 'Default timeout between two consecutive low-latency segment scheduling attempts',
      lowLatencyDownloadTimeCalculationMode: 'Defines the effective download time estimation method we use for low latency streams that utilize the Fetch API and chunked transfer coding.'
  },
  DEBUG: {
    logLevel: 'Sets up the log level. The levels are cumulative. For example, if you set the log level to dashjs.Debug.LOG_LEVEL_WARNING all warnings, errors and fatals will be logged. Possible values. Possible values.\n' +
      '\n' +
      'dashjs.Debug.LOG_LEVEL_NONE\n' +
      'No message is written in the browser console.\n' +
      '\n' +
      'dashjs.Debug.LOG_LEVEL_FATAL\n' +
      'Log fatal errors.\n' +
      'An error is considered fatal when it causes playback to fail completely.\n' +
      '\n' +
      'dashjs.Debug.LOG_LEVEL_ERROR\n' +
      'Log error messages.\n' +
      '\n' +
      'dashjs.Debug.LOG_LEVEL_WARNING\n' +
      'Log warning messages.\n' +
      '\n' +
      'dashjs.Debug.LOG_LEVEL_INFO\n' +
      'Log info messages.\n' +
      '\n' +
      'dashjs.Debug.LOG_LEVEL_DEBUG\n' +
      'Log debug messages.',
    dispatchEvent: 'Enable to trigger a Events.LOG event whenever log output is generated. Note this will be dispatched regardless of log level',
    metricsMaxListDepth: 'Maximum list depth of metrics.',
  },
  CMCD: {
    enabled: 'Enable or disable the CMCD reporting.',
    sid: 'GUID identifying the current playback session. Should be in UUID format.' +
      'If not specified a UUID will be automatically generated.',
    cid: 'A unique string to identify the current content. If not specified it will be a hash of the MPD url.',
    did: 'A unique string identifying the current device.',
    rtp: 'The requested maximum throughput that the client considers sufficient for delivery of the asset. If not specified this value will be dynamically calculated in the CMCDModel based on the current buffer level.',
    rtpSafetyFactor: 'This value is used as a factor for the rtp value calculation: rtp = minBandwidth * rtpSafetyFactor If not specified this value defaults to 5. Note that this value is only used when no static rtp value is defined.',
    mode: 'The method to use to attach cmcd metrics to the requests. "query" to use query parameters, "header" to use http headers.\n If not specified this value defaults to "query".',
    enabledKeys: 'This value is used to specify the desired CMCD parameters. Parameters not included in this list are not reported.'
  },
  BUFFER: {
    enableSeekDecorrelationFix: 'Enables a workaround for playback start on some devices, e.g. WebOS 4.9. It is necessary because some browsers do not support setting currentTime on video element to a value that is outside of current buffer.\n\n'+
    'If you experience unexpected seeking triggered by BufferController, you can try setting this value to false.',
    bufferTimeDefault: 'The time that the internal buffer target will be set to when not playing at the top quality.',
    bufferPruningInterval: 'The interval of pruning buffer in sconds.',
    bufferToKeep: 'This value influences the buffer pruning logic. Allows you to modify the buffer that is kept in source buffer in seconds. 0|-----------bufferToPrune-----------|-----bufferToKeep-----|currentTime|',
    stableBufferTime: 'The time that the internal buffer target will be set to post startup/seeks (NOT top quality). When the time is set higher than the default you will have to wait longer to see automatic bitrate switches but will have a larger buffer which will increase stability.',
    bufferTimeAtTopQuality: 'The time that the internal buffer target will be set to once playing the top quality. If there are multiple bitrates in your adaptation, and the media is playing at the highest bitrate, then we try to build a larger buffer at the top quality to increase stability and to maintain media quality.',
    bufferTimeAtTopQualityLongForm: 'The time that the internal buffer target will be set to once playing the top quality for long form content.',
    useAppendWindow: 'Specifies if the appendWindow attributes of the MSE SourceBuffers should be set according to content duration from manifest.',
    longFormContentDurationThreshold: 'The threshold which defines if the media is considered long form content. This will directly affect the buffer targets when playing back at the top quality.',
    stallThreshold: 'Stall threshold used in BufferController.js to determine whether a track should still be changed and which buffer range to prune.',
    setStallState: 'Specifies if we fire manual waiting events once the stall threshold is reached.',
    avoidCurrentTimeRangePruning: 'Avoids pruning of the buffered range that contains the current playback time.\n\n'+
    'That buffered range is likely to have been enqueued for playback. Pruning it causes a flush and reenqueue in WPE and WebKitGTK based browsers. This stresses the video decoder and can cause stuttering on embedded platforms.',
  },
  'TRACK SWITCH': {
    trackSwitchMode: 'Whether to clear the portion of the buffer that contains the old track or not',
    useChangeTypeForTrackSwitch: 'If this flag is set to true then dash.js will use the MSE v.2 API call "changeType()" before switching to a different track. Note that some platforms might not implement the changeType functio. dash.js is checking for the availability before trying to call it.'
  },
  RETRY: {
    manifestUpdateRetryInterval: 'For live streams, set the interval-frequency in milliseconds at which dash.js will check if the current manifest is still processed before downloading the next manifest once the minimumUpdatePeriod time has',
    abandonLoadTimeout: 'A timeout value in seconds, which during the ABRController will block switch-up events. This will only take effect after an abandoned fragment event occurs',
    retryIntervals: 'Time in milliseconds of which to reload a failed file load attempt. For low latency mode these values are divided by lowLatencyReductionFactor.',
    retryAttempts: 'Total number of retry attempts that will occur on a file load before it fails. For low latency mode these values are multiplied by lowLatencyMultiplyFactor.',
    fragmentRequestTimeout: 'Time in milliseconds before timing out on loading a media fragment. Fragments that timeout are retried as if they failed',
  },
  'UTC SYNCHRONIZATION': {
    utcSynchronization: 'backgroundAttempts: Number of synchronization attempts to perform in the background after an initial synchronization request has been done. This is used to verify that the derived client-server offset is correct. The background requests are async and done in parallel to the start of the playback. This value is also used to perform a resync after 404 errors on segments.\n' +
      'timeBetweenSyncAttempts: The time in seconds between two consecutive sync attempts. Note: This value is used as an initial starting value. The internal value of the TimeSyncController is adjusted during playback based on the drift between two consecutive synchronization attempts. Note: A sync is only performed after an MPD update. In case the @minimumUpdatePeriod is larger than this value the sync will be delayed until the next MPD update.\n' +
      'maximumTimeBetweenSyncAttempts: The maximum time in seconds between two consecutive sync attempts.\n' +
      'minimumTimeBetweenSyncAttempts: The minimum time in seconds between two consecutive sync attempts.\n' +
      'timeBetweenSyncAttemptsAdjustmentFactor: The factor used to multiply or divide the timeBetweenSyncAttempts parameter after a sync. The maximumAllowedDrift defines whether this value is used as a factor or a dividend.\n' +
      'maximumAllowedDrift: The maximum allowed drift specified in milliseconds between two consecutive synchronization attempts.\n' +
      'enableBackgroundSyncAfterSegmentDownloadError: Enables or disables the background sync after the player ran into a segment download error.',
    defaultTimingSource: 'The default timing source to be used. The timing sources in the MPD take precedence over this one.',
  },
  CMSD: {
    enabled: 'Enables CMSD',
    applyMb: 'Set to true if dash.js should apply CMSD maximum suggested bitrate in ABR logic.',
    etpWeightRatio: 'Sets the weight ratio (between 0 and 1) that shall be applied on CMSD estimated throuhgput compared to measured throughput when calculating throughput.'
  },
  TEXT: {
    defaultEnabled: 'Enable/disable subtitle rendering by default.',
    extendSegmentedCues: 'Enable/disable patching of segmented cues in order to merge as a single cue by extending cue end time.',
    customRenderingEnabled: 'Enables the custom rendering for WebVTT captions. For details refer to the "Subtitles and Captions" sample section of dash.js.\n' +
    'Custom WebVTT rendering requires the external library vtt.js that can be found in the contrib folder.'
  },
  MISC: {
    wallclockTimeUpdateInterval: 'How frequently the wallclockTimeUpdated internal event is triggered (in milliseconds).',
    useManifestDateHeaderTimeSource: 'Allows you to enable the use of the Date Header, if exposed with CORS, as a timing source for live edge detection. The use of the date header will happen only after the other timing source that take precedence fail or are omitted as described.',
    useSuggestedPresentationDelay: 'Set to true if you would like to override the default live delay and honor the SuggestedPresentationDelay attribute in by the manifest.',
    manifestUpdateRetryInterval: 'For live streams, set the interval-frequency in milliseconds at which dash.js will check if the current manifest is still processed before downloading the next manifest once the minimumUpdatePeriod time has',
    filterUnsupportedEssentialProperties: 'Enable to filter all the AdaptationSets and Representations which contain an unsupported <EssentialProperty> element.',
    useMediaCapabilitiesApi: 'Enable to use the MediaCapabilities API to check whether codecs are supported. If disabled MSE.isTypeSupported will be used instead.',
    recoverAttempts: 'Defines the maximum number of recover attempts for specific media errors.\n'+
    'For mediaErrorDecode the player will reset the MSE and skip the blacklisted segment that caused the decode error. The resulting gap will be handled by the GapController.',
    metrics: 'Maximum number of metrics that are persisted per type',
    ignoreEmeEncryptedEvent: 'If set to true the player will ignore "encrypted" and "needkey" events thrown by the EME.',
    detectPlayreadyMessageFormat: 'If set to true the player will use the raw unwrapped message from the Playready CDM',    
  }
};

