/**
 * Setting descriptions, keyed by setting path.
 *
 * GENERATED FILE - do not edit. It is extracted from the JSDoc in src/core/Settings.js by
 * tools/generate-settings-descriptions.mjs. Change the JSDoc and run the script again.
 */

const SETTINGS_DESCRIPTIONS = {

    "debug":
        "Debug related settings.",

    "debug.logLevel":
        "Sets up the log level. The levels are cumulative.\n\nFor example, if you set the log level to dashjs.Debug.LOG_LEVEL_WARNING all warnings, errors and fatals will be logged.\n\nPossible values.\n\n- dashjs.Debug.LOG_LEVEL_NONE\nNo message is written in the browser console.\n\n- dashjs.Debug.LOG_LEVEL_FATAL\nLog fatal errors.\nAn error is considered fatal when it causes playback to fail completely.\n\n- dashjs.Debug.LOG_LEVEL_ERROR\nLog error messages.\n\n- dashjs.Debug.LOG_LEVEL_WARNING\nLog warning messages.\n\n- dashjs.Debug.LOG_LEVEL_INFO\nLog info messages.\n\n- dashjs.Debug.LOG_LEVEL_DEBUG\nLog debug messages.",

    "debug.dispatchEvent":
        "Enable to trigger a Events.LOG event whenever log output is generated.\n\nNote this will be dispatched regardless of log level.",

    "errors":
        "Error related settings",

    "errors.recoverAttempts":
        "Defines the maximum number of recover attempts for specific media errors.\n\nFor mediaErrorDecode the player will reset the MSE and skip the blacklisted segment that caused the decode error. The resulting gap will be handled by the GapController.",

    "streaming":
        "Streaming related settings.",

    "streaming.abandonLoadTimeout":
        "A timeout value in seconds, which during the ABRController will block switch-up events.\n\nThis will only take effect after an abandoned fragment event occurs.",

    "streaming.seekDurationBackoff":
        "Offset in seconds that is applied when a seek targets a time at or beyond the end of the content. The seek is redirected to (end of last period - seekDurationBackoff).\n\nSeeking to, or starting at, exactly the duration of the presentation does not work consistently across browsers: the playhead can end up pending forever or in the \"ended\" state in which a subsequent play() restarts from the beginning.\nKeeping the playhead slightly before the end lets playback finish organically. Set to 0 to disable the backoff and seek to the exact end of the content.",

    "streaming.wallclockTimeUpdateInterval":
        "How frequently the wallclockTimeUpdated internal event is triggered (in milliseconds).",

    "streaming.manifestUpdateRetryInterval":
        "For live streams, set the interval-frequency in milliseconds at which dash.js will check if the current manifest is still processed before downloading the next manifest once the minimumUpdatePeriod time has.",

    "streaming.liveUpdateTimeThresholdInMilliseconds":
        "For live streams, postpone syncing time updates until the threshold is passed. Increase if problems occurs during live streams on low end devices.",

    "streaming.cacheInitSegments":
        "Enables the caching of init segments to avoid requesting the init segments before each representation switch.",

    "streaming.cacheInitSegmentsLimit":
        "Maximum number of entries to keep in the init segment cache. When the cache exceeds this limit, the least recently used entries are evicted.",

    "streaming.applyServiceDescription":
        "Set to true if dash.js should use the parameters defined in ServiceDescription elements",

    "streaming.applyProducerReferenceTime":
        "Set to true if dash.js should use the parameters defined in ProducerReferenceTime elements in combination with ServiceDescription elements.",

    "streaming.applyContentSteering":
        "Set to true if dash.js should apply content steering during playback.",

    "streaming.ignoreFinalStaticManifestOnDynamicToStaticTransition":
        "Set to true if dash.js should ignore the final static manifest when a stream transitions from dynamic to static (legacy behavior up to v5.2.0). When set to false the duration, the seekable range and the segment information are derived from the final static manifest.",

    "streaming.enableManifestDurationMismatchFix":
        "For multi-period streams, overwrite the manifest mediaPresentationDuration attribute with the sum of period durations if the manifest mediaPresentationDuration is greater than the sum of period durations",

    "streaming.enableManifestTimescaleMismatchFix":
        "Overwrite the manifest segments base information timescale attributes with the timescale set in initialization segments",

    "streaming.parseInbandPrft":
        "Set to true if dash.js should parse inband prft boxes (ProducerReferenceTime) and trigger events.",

    "streaming.metrics":
        "Metric settings",

    "streaming.metrics.maxListDepth":
        "Maximum number of metrics that are persisted per type.",

    "streaming.delay":
        "Live Delay settings",

    "streaming.delay.liveDelayFragmentCount":
        "Changing this value will lower or increase live stream latency.\n\nThe detected segment duration will be multiplied by this value to define a time in seconds to delay a live stream from the live edge.\n\nFor SSR/L3D content using partial segments (SegmentTemplate@k > 1) the maximum effective segment duration across all audio, video and fragmented text adaptation sets is used instead.\nThe effective segment duration is the partial segment duration (segment duration / k) for adaptation sets using partial segments, and the full segment duration otherwise.\nConsequently, the partial segment duration is only applied if all these adaptation sets use partial segments.\n\nLowering this value will lower latency but may decrease the player's ability to build a stable buffer.",

    "streaming.delay.liveDelay":
        "Equivalent in seconds of setLiveDelayFragmentCount.\n\nLowering this value will lower latency but may decrease the player's ability to build a stable buffer.\n\nThis value should be less than the manifest duration by a couple of segment durations to avoid playback issues.\n\nIf set, this parameter will take precedence over setLiveDelayFragmentCount and manifest info.",

    "streaming.delay.useSuggestedPresentationDelay":
        "Set to true if you would like to overwrite the default live delay and honor the SuggestedPresentationDelay attribute in by the manifest.",

    "streaming.events":
        "Event settings",

    "streaming.events.eventControllerRefreshDelay":
        "Interval timer used by the EventController to check if events need to be triggered or removed.",

    "streaming.events.deleteEventMessageDataTimeout":
        "If this value is larger than -1 the EventController will delete the message data attributes of events after they have been started and dispatched to the application.\nThis is to save memory in case events have a long duration and need to be persisted in the EventController.\nThis parameter defines the time in milliseconds between the start of an event and when the message data is deleted.\nIf an event is dispatched for the second time (e.g. when the user seeks back) the message data will not be included in the dispatched event if it has been deleted already.\nSet this value to -1 to not delete any message data.",

    "streaming.timeShiftBuffer":
        "TimeShiftBuffer settings",

    "streaming.timeShiftBuffer.calcFromSegmentTimeline":
        "Enable calculation of the DVR window for SegmentTimeline manifests based on the entries in <SegmentTimeline>.",

    "streaming.timeShiftBuffer.fallbackToSegmentTimeline":
        "In case the MPD uses <SegmentTimeline> and no segment is found within the DVR window the DVR window is calculated based on the entries in <SegmentTimeline>.",

    "streaming.protection":
        "DRM related settings",

    "streaming.protection.keepProtectionMediaKeys":
        "Set the value for the ProtectionController and MediaKeys life cycle.\nIf true, the ProtectionController and then created MediaKeys and MediaKeySessions will be preserved during the MediaPlayer lifetime.",

    "streaming.protection.keepProtectionMediaKeysMaximumOpenSessions":
        "Maximum number of open MediaKeySessions, when keepProtectionMediaKeys is enabled. If set, dash.js will close the oldest sessions when the limit is exceeded. -1 means unlimited.",

    "streaming.protection.ignoreEmeEncryptedEvent":
        "If set to true the player will ignore \"encrypted\" and \"needkey\" events thrown by the EME.",

    "streaming.protection.detectPlayreadyMessageFormat":
        "If set to true the player will use the raw unwrapped message from the Playready CDM",

    "streaming.protection.ignoreKeyStatuses":
        "If set to true the player will ignore the status of a key and try to play the corresponding track regardless whether the key is usable or not.",

    "streaming.capabilities":
        "Capability related settings",

    "streaming.capabilities.filterUnsupportedEssentialProperties":
        "Enable to filter all the AdaptationSets and Representations which contain an unsupported <EssentialProperty> element.",

    "streaming.capabilities.supportedEssentialProperties":
        "List of supported <EssentialProperty> elements",

    "streaming.capabilities.useMediaCapabilitiesApi":
        "Enable to use the MediaCapabilities API to check whether codecs are supported. If disabled MSE.isTypeSupported will be used instead.",

    "streaming.capabilities.filterVideoColorimetryEssentialProperties":
        "Enable dash.js to query MediaCapabilities API for signalled Colorimetry EssentialProperties (per schemeIdUris: 'urn:mpeg:mpegB:cicp:ColourPrimaries', 'urn:mpeg:mpegB:cicp:TransferCharacteristics').\nIf disabled, registered properties per supportedEssentialProperties will be allowed without any further checking (including 'urn:mpeg:mpegB:cicp:MatrixCoefficients').",

    "streaming.capabilities.filterHDRMetadataFormatEssentialProperties":
        "Enable dash.js to query MediaCapabilities API for signalled HDR-MetadataFormat EssentialProperty (per schemeIdUri:'urn:dvb:dash:hdr-dmi').",

    "streaming.capabilities.filterAudioChannelConfiguration":
        "Enable dash.js to query MediaCapabilities API for signalled AudioChannelConfiguration.",

    "streaming.buffer":
        "Buffer related settings",

    "streaming.buffer.enableSeekDecorrelationFix":
        "Enables a workaround for playback start on some devices, e.g. WebOS 4.9.\nIt is necessary because some browsers do not support setting currentTime on video element to a value that is outside of current buffer.\n\nIf you experience unexpected seeking triggered by BufferController, you can try setting this value to false.",

    "streaming.buffer.fastSwitchEnabled":
        "When enabled, after an ABR up-switch in quality, instead of requesting and appending the next fragment at the end of the current buffer range it is requested and appended closer to the current time.\n\nWhen enabled, The maximum time to render a higher quality is current time + (1.5 * fragment duration).\n\nIf this value is set to null we will automatically enable fast switches for non low-latency playback\n\nNote, When ABR down-switch is detected, we appended the lower quality at the end of the buffer range to preserve the higher quality media for as long as possible.\n\nIf enabled, it should be noted there are a few cases when the client will not replace inside buffer range but rather just append at the end.\n1. When the buffer level is less than one fragment duration.\n2. The client is in an Abandonment State due to recent fragment abandonment event.\n\nKnown issues:\n1. In IE11 with auto switching off, if a user switches to a quality they can not download in time the fragment may be appended in the same range as the playhead or even in the past, in IE11 it may cause a stutter or stall in playback.",

    "streaming.buffer.flushBufferAtTrackSwitch":
        "When enabled, after a track switch and in case buffer is being replaced, the video element is flushed (seek at current playback time) once a segment of the new track is appended in buffer in order to force video decoder to play new track.\n\nThis can be required on some devices like GoogleCast devices to make track switching functional.\n\nOtherwise, track switching will be effective only once after previous buffered track is fully consumed.",

    "streaming.buffer.reuseExistingSourceBuffers":
        "Enable reuse of existing MediaSource Sourcebuffers during period transition.",

    "streaming.buffer.bufferPruningInterval":
        "The interval of pruning buffer in seconds.",

    "streaming.buffer.bufferToKeep":
        "This value influences the buffer pruning logic.\n\nAllows you to modify the buffer that is kept in source buffer in seconds.\n0|-----------bufferToPrune-----------|-----bufferToKeep-----|currentTime|",

    "streaming.buffer.bufferTimeDefault":
        "The time that the internal buffer target will be set to when not playing at the top quality.",

    "streaming.buffer.bufferTimeAtTopQuality":
        "The time that the internal buffer target will be set to once playing the top quality.\n\nIf there are multiple bitrates in your adaptation, and the media is playing at the highest bitrate, then we try to build a larger buffer at the top quality to increase stability and to maintain media quality.",

    "streaming.buffer.bufferTimeAtTopQualityLongForm":
        "The time that the internal buffer target will be set to once playing the top quality for long form content.",

    "streaming.buffer.longFormContentDurationThreshold":
        "The threshold which defines if the media is considered long form content.\n\nThis will directly affect the buffer targets when playing back at the top quality.",

    "streaming.buffer.initialBufferLevel":
        "Initial buffer level before playback starts",

    "streaming.buffer.stallThreshold":
        "Stall threshold used in BufferController.js to determine whether a track should still be changed and which buffer range to prune.",

    "streaming.buffer.lowLatencyStallThreshold":
        "Low Latency stall threshold used in BufferController.js to determine whether a track should still be changed and which buffer range to prune.",

    "streaming.buffer.useAppendWindow":
        "Specifies if the appendWindow attributes of the MSE SourceBuffers should be set according to content duration from manifest.",

    "streaming.buffer.setStallState":
        "Specifies if we fire manual waiting events once the stall threshold is reached.",

    "streaming.buffer.syntheticStallEvents":
        "Specifies if manual stall events are to be fired once the stall threshold is reached.",

    "streaming.buffer.syntheticStallEvents.enabled":
        "Enables manual stall events and sets the playback rate to 0 once the stall threshold is reached.",

    "streaming.buffer.syntheticStallEvents.ignoreReadyState":
        "Ignore the media element's ready state when entering or exiting a stall.\nEnable this when either of these scenarios still occur with synthetic stalls enabled:\n- If the buffer is empty, but playback is not stalled.\n- If playback resumes, but a playing event isn't reported.",

    "streaming.buffer.avoidCurrentTimeRangePruning":
        "Avoids pruning of the buffered range that contains the current playback time.\n\nThat buffered range is likely to have been enqueued for playback. Pruning it causes a flush and reenqueue in WPE and WebKitGTK based browsers. This stresses the video decoder and can cause stuttering on embedded platforms.",

    "streaming.buffer.useChangeType":
        "If this flag is set to true then dash.js will use the MSE v.2 API call \"changeType()\" before switching to a different codec family.\nNote that some platforms might not implement the changeType function. dash.js is checking for the availability before trying to call it.",

    "streaming.buffer.mediaSourceDurationInfinity":
        "If this flag is set to true then dash.js will allow `Infinity` to be set as the MediaSource duration otherwise the duration will be set to `Math.pow(2,32)` instead of `Infinity` to allow appending segments indefinitely.\nSome platforms such as WebOS 4.x have issues with seeking when duration is set to `Infinity`, setting this flag to false resolve this.",

    "streaming.buffer.resetSourceBuffersForTrackSwitch":
        "When switching to a track that is not compatible with the currently active MSE SourceBuffers, MSE will be reset. This happens when we switch codecs on a system that does not properly implement \"changeType()\", such as webOS 4.0 and before.",

    "streaming.gaps":
        "Gap related settings",

    "streaming.gaps.jumpGaps":
        "Sets whether player should jump small gaps (discontinuities) in the buffer.",

    "streaming.gaps.jumpLargeGaps":
        "Sets whether player should jump large gaps (discontinuities) in the buffer.",

    "streaming.gaps.smallGapLimit":
        "Time in seconds for a gap to be considered small.",

    "streaming.gaps.threshold":
        "Threshold at which the gap handling is executed. If currentRangeEnd - currentTime < threshold the gap jump will be triggered.\nFor live stream the jump might be delayed to keep a consistent live edge.\nNote that the amount of buffer at which platforms automatically stall might differ.",

    "streaming.gaps.enableSeekFix":
        "Enables the adjustment of the seek target once no valid segment request could be generated for a specific seek time. This can happen if the user seeks to a position for which there is a gap in the timeline.",

    "streaming.gaps.enableStallFix":
        "If playback stalled in a buffered range this fix will perform a seek by the value defined in stallSeek to trigger playback again.",

    "streaming.gaps.stallSeek":
        "Value to be used in case enableStallFix is set to true",

    "streaming.gaps.seekOffset":
        "An additional offset in seconds that is applied when performing a seek to jump a gap.",

    "streaming.gaps.checkInterval":
        "The interval in milliseconds at which the gap handler checks for gaps in the buffer. Lower values detect gaps faster but increase CPU usage. Default is 250ms.",

    "streaming.utcSynchronization":
        "Settings related to UTC clock synchronization",

    "streaming.utcSynchronization.enabled":
        "Enables or disables the UTC clock synchronization",

    "streaming.utcSynchronization.useManifestDateHeaderTimeSource":
        "Allows you to enable the use of the Date Header, if exposed with CORS, as a timing source for live edge detection.\n\nThe use of the date header will happen only after the other timing source that take precedence fail or are omitted as described.",

    "streaming.utcSynchronization.backgroundAttempts":
        "Number of synchronization attempts to perform in the background after an initial synchronization request has been done. This is used to verify that the derived client-server offset is correct.\n\nThe background requests are async and done in parallel to the start of the playback.\n\nThis value is also used to perform a resync after 404 errors on segments.",

    "streaming.utcSynchronization.timeBetweenSyncAttempts":
        "The time in seconds between two consecutive sync attempts.\n\nNote: This value is used as an initial starting value. The internal value of the TimeSyncController is adjusted during playback based on the drift between two consecutive synchronization attempts.\n\nNote: A sync is only performed after an MPD update. In case the @minimumUpdatePeriod is larger than this value the sync will be delayed until the next MPD update.",

    "streaming.utcSynchronization.maximumTimeBetweenSyncAttempts":
        "The maximum time in seconds between two consecutive sync attempts.",

    "streaming.utcSynchronization.minimumTimeBetweenSyncAttempts":
        "The minimum time in seconds between two consecutive sync attempts.",

    "streaming.utcSynchronization.timeBetweenSyncAttemptsAdjustmentFactor":
        "The factor used to multiply or divide the timeBetweenSyncAttempts parameter after a sync. The maximumAllowedDrift defines whether this value is used as a factor or a dividend.",

    "streaming.utcSynchronization.maximumAllowedDrift":
        "The maximum allowed drift specified in milliseconds between two consecutive synchronization attempts.",

    "streaming.utcSynchronization.enableBackgroundSyncAfterSegmentDownloadError":
        "Enables or disables the background sync after the player ran into a segment download error.",

    "streaming.utcSynchronization.defaultTimingSource":
        "The default timing source to be used. The timing sources in the MPD take precedence over this one.",

    "streaming.utcSynchronization.artificialTimeOffsetToApply":
        "The offset defined in milliseconds that is applied on top of the offset that was derived after the time synchronization.",

    "streaming.scheduling":
        "Settings related to segment scheduling",

    "streaming.scheduling.defaultTimeout":
        "Default timeout between two consecutive segment scheduling attempts",

    "streaming.scheduling.lowLatencyTimeout":
        "Default timeout between two consecutive low-latency segment scheduling attempts",

    "streaming.scheduling.scheduleWhilePaused":
        "Set to true if you would like dash.js to keep downloading fragments in the background when the video element is paused.",

    "streaming.scheduling.segmentListRetryDelay":
        "SegmentBase: Time in milliseconds after which the segment list (sidx) of a Representation is requested again once loading it failed.\nIn the meantime the Representation is excluded from ABR decisions. The delay doubles with every failure in a row, up to eight times this value.",

    "streaming.text":
        "Settings related to Subtitles and captions",

    "streaming.text.defaultEnabled":
        "Enable/disable subtitle rendering by default.",

    "streaming.text.dispatchForManualRendering":
        "Enable/disable firing of CueEnter/CueExt events. This will disable the display of subtitles and should be used when you want to have full control about rendering them.",

    "streaming.text.extendSegmentedCues":
        "Enable/disable patching of segmented cues in order to merge as a single cue by extending cue end time.",

    "streaming.text.imsc.displayForcedOnlyMode":
        "Enable/disable forced only mode in IMSC captions.\nWhen true, only those captions where itts:forcedDisplay=\"true\" will be displayed.",

    "streaming.text.imsc.enableRollUp":
        "Enable/disable rollUp style display of IMSC captions.",

    "streaming.text.webvtt.customRenderingEnabled":
        "Enables the custom rendering for WebVTT captions. For details refer to the \"Subtitles and Captions\" sample section of dash.js.\nCustom WebVTT rendering requires the external library vtt.js that can be found in the contrib folder.",

    "streaming.liveCatchup":
        "Settings related to live catchup.",

    "streaming.liveCatchup.maxDrift":
        "Use this method to set the maximum latency deviation allowed before dash.js to do a seeking to live position.\n\nIn low latency mode, when the difference between the measured latency and the target one, as an absolute number, is higher than the one sets with this method, then dash.js does a seek to live edge position minus the target live delay.\n\nLowLatencyMaxDriftBeforeSeeking should be provided in seconds.\n\nIf a value less than zero is set (-1), then seeking operations won't be used for fixing latency deviations.\n\nNote: Catch-up mechanism is only applied when playing low latency live streams.",

    "streaming.liveCatchup.step":
        "This object is used for setting the window parameters for \"step\" mode.\n\nIt is only applicable if the Catchup mechanism used is of mode \"step\".\n\nThe parameters are all percentages of the target latency. Where 1 is on target.\n\nThe start object sets the window within which catchup should begin. In the range of (0-2) (0% to 200% of the target latency).\n\nThe stop window is only applicable if a non-unity playback speed is in use. Again in the range of (0-2) (0% to 200% of the target latency). It sets the point at which playback should return to unity (or stop catching up). This parameter prevents instability when using higher min and max playback rates and should be tuned to prevent overshooting the target.\n\nNote: Catch-up mechanism is only applied when playing low latency live streams.",

    "streaming.liveCatchup.playbackRate":
        "Use this parameter to set the minimum and maximum catch up rates, as percentages, for low latency live streams.\n\nIn low latency mode, when measured latency is higher/lower than the target one, dash.js increases/decreases playback rate respectively up to (+/-) the percentage defined with this method until target is reached.\n\nValid values for min catch up rate are in the range -0.5 to 0 (-50% to 0% playback rate decrease)\n\nValid values for max catch up rate are in the range 0 to 1 (0% to 100% playback rate increase).\n\nSet min and max to NaN to turn off live catch up feature.\n\nThese playback rate limits take precedence over any PlaybackRate values in ServiceDescription elements in an MPD. If only one of the min/max properties is given a value, the property without a value will not fall back to a ServiceDescription value. Its default value of NaN will be used.\n\nNote: Catch-up mechanism is only applied when playing low latency live streams.",

    "streaming.liveCatchup.playbackBufferMin":
        "Use this parameter to specify the minimum buffer which is used for LoL+ based playback rate reduction.",

    "streaming.liveCatchup.liveThreshold":
        "Accelerated playback is reset to 1.0 (no speed-up) once the latency difference (currentLatency - initiallyDefinedTargetLatency) is above the configured liveThreshold value. liveThreshold is disabled by setting the value to -1",

    "streaming.liveCatchup.enabled":
        "Use this parameter to enable the catchup mode for non low-latency streams.",

    "streaming.liveCatchup.mode":
        "Use this parameter to switch between different catchup modes.\n\nOptions: One of \"liveCatchupModeDefault\", \"liveCatchupModeLOLP\" or \"liveCatchupModeStep\".\n\nNote: Catch-up mechanism is automatically applied when playing low latency live streams.",

    "streaming.lastBitrateCachingInfo":
        "Set to false if you would like to disable the last known bit rate from being stored during playback and used to set the initial bit rate for subsequent playback within the expiration window.\n\nThe default expiration is one hour, defined in milliseconds.\n\nIf expired, the default initial bit rate (closest to 1000 kbps) will be used for that session and a new bit rate will be stored during that session.",

    "streaming.lastBitrateCachingInfo.enabled":
        "Set to false if you would like to disable the last known bit rate from being stored during playback and used to set the initial bit rate for subsequent playback within the expiration window.\n\nThe default expiration is one hour, defined in milliseconds.\n\nIf expired, the default initial bit rate (closest to 1000 kbps) will be used for that session and a new bit rate will be stored during that session.\n\nenabled: Enable or disable the caching feature.",

    "streaming.lastBitrateCachingInfo.ttl":
        "Set to false if you would like to disable the last known bit rate from being stored during playback and used to set the initial bit rate for subsequent playback within the expiration window.\n\nThe default expiration is one hour, defined in milliseconds.\n\nIf expired, the default initial bit rate (closest to 1000 kbps) will be used for that session and a new bit rate will be stored during that session.\n\nttl: Time to live.\n\nA value defined in milliseconds representing how log to cache the settings for.",

    "streaming.lastMediaSettingsCachingInfo":
        "Set to false if you would like to disable the last media settings from being stored to localStorage during playback and used to set the initial track for subsequent playback within the expiration window.\n\nThe default expiration is one hour, defined in milliseconds.",

    "streaming.lastMediaSettingsCachingInfo.enabled":
        "Set to false if you would like to disable the last media settings from being stored to localStorage during playback and used to set the initial track for subsequent playback within the expiration window.\n\nThe default expiration is one hour, defined in milliseconds.\n\nenabled: Enable or disable the caching feature.",

    "streaming.lastMediaSettingsCachingInfo.ttl":
        "Set to false if you would like to disable the last media settings from being stored to localStorage during playback and used to set the initial track for subsequent playback within the expiration window.\n\nThe default expiration is one hour, defined in milliseconds.\n\nttl: Time to live.\n\nA value defined in milliseconds representing how log to cache the settings for.",

    "streaming.saveLastMediaSettingsForCurrentStreamingSession":
        "Set to true if dash.js should save media settings from last selected track for incoming track selection during current streaming session.",

    "streaming.cacheLoadThresholds":
        "For a given media type, the threshold which defines if the response to a fragment request is coming from browser cache or not.",

    "streaming.cacheLoadThresholds.audio":
        "For a given media type, the threshold which defines if the response to a fragment request is coming from browser cache or not.\n\naudio: Configuration for audio media type of tracks.",

    "streaming.cacheLoadThresholds.video":
        "For a given media type, the threshold which defines if the response to a fragment request is coming from browser cache or not.\n\nvideo: Configuration for video media type of tracks.",

    "streaming.trackSwitchMode":
        "For a given media type defines if existing segments in the buffer should be overwritten once the track is switched. For instance if the user switches the audio language the existing segments in the audio buffer will be replaced when setting this value to \"alwaysReplace\".\n\nPossible values\n\n- Constants.TRACK_SWITCH_MODE_ALWAYS_REPLACE\nReplace existing segments in the buffer\n\n- Constants.TRACK_SWITCH_MODE_NEVER_REPLACE\nDo not replace existing segments in the buffer",

    "streaming.trackSwitchMode.audio":
        "For a given media type defines if existing segments in the buffer should be overwritten once the track is switched. For instance if the user switches the audio language the existing segments in the audio buffer will be replaced when setting this value to \"alwaysReplace\".\n\nPossible values\n\n- Constants.TRACK_SWITCH_MODE_ALWAYS_REPLACE\nReplace existing segments in the buffer\n\n- Constants.TRACK_SWITCH_MODE_NEVER_REPLACE\nDo not replace existing segments in the buffer\n\naudio: Configuration for audio media type of tracks.",

    "streaming.trackSwitchMode.video":
        "For a given media type defines if existing segments in the buffer should be overwritten once the track is switched. For instance if the user switches the audio language the existing segments in the audio buffer will be replaced when setting this value to \"alwaysReplace\".\n\nPossible values\n\n- Constants.TRACK_SWITCH_MODE_ALWAYS_REPLACE\nReplace existing segments in the buffer\n\n- Constants.TRACK_SWITCH_MODE_NEVER_REPLACE\nDo not replace existing segments in the buffer\n\nvideo: Configuration for video media type of tracks.",

    "streaming.includePreselectionsInMediainfoArray":
        "provides the option to include Preselections in the MediaInfo object",

    "streaming.includePreselectionsForInitialTrackSelection":
        "provides the option to include Preselections for initial track selection",

    "streaming.ignoreSelectionPriority":
        "provides the option to disregard any signalled selectionPriority attribute. If disabled and if no initial media settings are set, track selection is accomplished as defined by selectionModeForInitialTrack.",

    "streaming.prioritizeRoleMain":
        "provides the option to disable prioritization of AdaptationSets with their Role set to Main",

    "streaming.assumeDefaultRoleAsMain":
        "when no Role descriptor is present, assume main per default",

    "streaming.selectionModeForInitialTrack":
        "Sets the selection mode for the initial track. This mode defines how the initial track will be selected if no initial media settings are set. If initial media settings are set this parameter will be ignored. Available options are:\n\nPossible values\n\n- Constants.TRACK_SELECTION_MODE_HIGHEST_BITRATE\nThis mode makes the player select the track with a highest bitrate.\n\n- Constants.TRACK_SELECTION_MODE_FIRST_TRACK\nThis mode makes the player select the first track found in the manifest.\n\n- Constants.TRACK_SELECTION_MODE_HIGHEST_EFFICIENCY\nThis mode makes the player select the track with the lowest bitrate per pixel average.\n\n- Constants.TRACK_SELECTION_MODE_WIDEST_RANGE\nThis mode makes the player select the track with a widest range of bitrates.",

    "streaming.blacklistExpiryTime":
        "The time in seconds that a Service Location remains on the blacklist.\nAfter this period expires, the Service Location becomes eligible for selection again during a subsequent failover. However, the system will not proactively switch back to it on its own.\nWhen Content Steering is enabled, this setting is ignored: the blacklist duration is automatically set to the steering response’s TTL, and the steering algorithm may actively switch back to that Service Location as needed.",

    "streaming.fragmentRequestTimeout":
        "Time in milliseconds before timing out on loading a media fragment.",

    "streaming.fragmentRequestProgressTimeout":
        "Time in milliseconds before timing out on loading progress of a media fragment.",

    "streaming.manifestRequestTimeout":
        "Time in milliseconds before timing out on loading a manifest.\n\nFragments that timeout are retried as if they failed.",

    "streaming.retryIntervals":
        "Time in milliseconds of which to reload a failed file load attempt.\n\nFor low latency mode these values are divided by lowLatencyReductionFactor.",

    "streaming.retryIntervals.MPD":
        "Time in milliseconds of which to reload a failed file load attempt.\n\nFor low latency mode these values are divided by lowLatencyReductionFactor.\n\nMPD: Manifest type of requests.",

    "streaming.retryIntervals.XLinkExpansion":
        "Time in milliseconds of which to reload a failed file load attempt.\n\nFor low latency mode these values are divided by lowLatencyReductionFactor.\n\nXLinkExpansion: XLink expansion type of requests.",

    "streaming.retryIntervals.InitializationSegment":
        "Time in milliseconds of which to reload a failed file load attempt.\n\nFor low latency mode these values are divided by lowLatencyReductionFactor.\n\nInitializationSegment: Request to retrieve an initialization segment.",

    "streaming.retryIntervals.IndexSegment":
        "Time in milliseconds of which to reload a failed file load attempt.\n\nFor low latency mode these values are divided by lowLatencyReductionFactor.\n\nIndexSegment: Request to retrieve an index segment (SegmentBase).",

    "streaming.retryIntervals.MediaSegment":
        "Time in milliseconds of which to reload a failed file load attempt.\n\nFor low latency mode these values are divided by lowLatencyReductionFactor.\n\nMediaSegment: Request to retrieve a media segment (video/audio/image/text chunk).",

    "streaming.retryIntervals.BitstreamSwitchingSegment":
        "Time in milliseconds of which to reload a failed file load attempt.\n\nFor low latency mode these values are divided by lowLatencyReductionFactor.\n\nBitstreamSwitchingSegment: Bitrate stream switching type of request.",

    "streaming.retryIntervals.FragmentInfoSegment":
        "Time in milliseconds of which to reload a failed file load attempt.\n\nFor low latency mode these values are divided by lowLatencyReductionFactor.\n\nFragmentInfoSegment: Request to retrieve a FragmentInfo segment (specific to Smooth Streaming live streams).",

    "streaming.retryIntervals.other":
        "Time in milliseconds of which to reload a failed file load attempt.\n\nFor low latency mode these values are divided by lowLatencyReductionFactor.\n\nother: Other type of request.",

    "streaming.retryIntervals.lowLatencyReductionFactor":
        "Time in milliseconds of which to reload a failed file load attempt.\n\nFor low latency mode these values are divided by lowLatencyReductionFactor.\n\nlowLatencyReductionFactor: For low latency mode, values of type of request are divided by lowLatencyReductionFactor.\n\nNote: It's not type of request.",

    "streaming.retryAttempts":
        "Total number of retry attempts that will occur on a file load before it fails.\n\nFor low latency mode these values are multiplied by lowLatencyMultiplyFactor.",

    "streaming.retryAttempts.MPD":
        "Total number of retry attempts that will occur on a file load before it fails.\n\nFor low latency mode these values are multiplied by lowLatencyMultiplyFactor.\n\nMPD: Manifest type of requests.",

    "streaming.retryAttempts.XLinkExpansion":
        "Total number of retry attempts that will occur on a file load before it fails.\n\nFor low latency mode these values are multiplied by lowLatencyMultiplyFactor.\n\nXLinkExpansion: XLink expansion type of requests.",

    "streaming.retryAttempts.InitializationSegment":
        "Total number of retry attempts that will occur on a file load before it fails.\n\nFor low latency mode these values are multiplied by lowLatencyMultiplyFactor.\n\nInitializationSegment: Request to retrieve an initialization segment.",

    "streaming.retryAttempts.IndexSegment":
        "Total number of retry attempts that will occur on a file load before it fails.\n\nFor low latency mode these values are multiplied by lowLatencyMultiplyFactor.\n\nIndexSegment: Request to retrieve an index segment (SegmentBase).",

    "streaming.retryAttempts.MediaSegment":
        "Total number of retry attempts that will occur on a file load before it fails.\n\nFor low latency mode these values are multiplied by lowLatencyMultiplyFactor.\n\nMediaSegment: Request to retrieve a media segment (video/audio/image/text chunk).",

    "streaming.retryAttempts.BitstreamSwitchingSegment":
        "Total number of retry attempts that will occur on a file load before it fails.\n\nFor low latency mode these values are multiplied by lowLatencyMultiplyFactor.\n\nBitstreamSwitchingSegment: Bitrate stream switching type of request.",

    "streaming.retryAttempts.FragmentInfoSegment":
        "Total number of retry attempts that will occur on a file load before it fails.\n\nFor low latency mode these values are multiplied by lowLatencyMultiplyFactor.\n\nFragmentInfoSegment: Request to retrieve a FragmentInfo segment (specific to Smooth Streaming live streams).",

    "streaming.retryAttempts.other":
        "Total number of retry attempts that will occur on a file load before it fails.\n\nFor low latency mode these values are multiplied by lowLatencyMultiplyFactor.\n\nother: Other type of request.",

    "streaming.retryAttempts.lowLatencyMultiplyFactor":
        "Total number of retry attempts that will occur on a file load before it fails.\n\nFor low latency mode these values are multiplied by lowLatencyMultiplyFactor.\n\nlowLatencyMultiplyFactor: For low latency mode, values of type of request are multiplied by lowLatencyMultiplyFactor.\n\nNote: It's not type of request.",

    "streaming.abr":
        "Adaptive Bitrate algorithm related settings.",

    "streaming.abr.limitBitrateByPortal":
        "If true, the size of the video portal will limit the max chosen video resolution.",

    "streaming.abr.usePixelRatioInLimitBitrateByPortal":
        "Sets whether to take into account the device's pixel ratio when defining the portal dimensions.",

    "streaming.abr.limitBitrateByPortalMinimum":
        "Sets a minimum bitrate in kbps for limitBitrateByPortal. Representations at this bitrate or below it will not be limited by the portal size. Useful if the player can be resized.\n\nUseful on, for example, retina displays.",

    "streaming.abr.hybridSwitchBufferTime":
        "When the throughput rule and the Bola rule are both active, this value defines the buffer level in seconds when the player will switch from throughput to Bola.",

    "streaming.abr.rules":
        "Enable/Disable individual ABR rules. Note that if the throughputRule and the bolaRule are activated at the same time we switch to a dynamic mode.\nIn the dynamic mode either ThroughputRule or BolaRule are active but not both at the same time.\n\nl2ARule and loLPRule are ABR rules that are designed for low latency streams. They are tested as standalone rules meaning the other rules should be deactivated when choosing these rules.",

    "streaming.abr.rules.throughputRule":
        "Configuration of the Throughput rule",

    "streaming.abr.rules.throughputRule.active":
        "Enable or disable the rule",

    "streaming.abr.rules.bolaRule":
        "Configuration of the BOLA rule",

    "streaming.abr.rules.bolaRule.active":
        "Enable or disable the rule",

    "streaming.abr.rules.insufficientBufferRule":
        "Configuration of the Insufficient Buffer rule",

    "streaming.abr.rules.insufficientBufferRule.active":
        "Enable or disable the rule",

    "streaming.abr.rules.insufficientBufferRule.parameters":
        "Configures the rule specific parameters.\n\n- `throughputSafetyFactor`: The safety factor that is applied to the derived throughput, see example in the Description.\n- `segmentIgnoreCount`: This rule is not taken into account until the first segmentIgnoreCount media segments have been appended to the buffer.",

    "streaming.abr.rules.switchHistoryRule":
        "Configuration of the Switch History rule",

    "streaming.abr.rules.switchHistoryRule.active":
        "Enable or disable the rule",

    "streaming.abr.rules.switchHistoryRule.parameters":
        "Configures the rule specific parameters.\n\n- `sampleSize`: Number of switch requests (\"no switch\", because of the selected Representation is already playing or \"actual switches\") required before the rule is applied\n- `switchPercentageThreshold`: Ratio of actual quality drops compared to no drops before a quality down-switch is triggered",

    "streaming.abr.rules.droppedFramesRule":
        "Configuration of the Dropped Frames rule",

    "streaming.abr.rules.droppedFramesRule.active":
        "Enable or disable the rule",

    "streaming.abr.rules.droppedFramesRule.parameters":
        "Configures the rule specific parameters.\n\n- `minimumSampleSize`: Sum of rendered and dropped frames required for each Representation before the rule kicks in.\n- `droppedFramesPercentageThreshold`: Minimum percentage of dropped frames to trigger a quality down switch. Values are defined in the range of 0 - 1.",

    "streaming.abr.rules.abandonRequestsRule":
        "Configuration of the Abandon Requests rule",

    "streaming.abr.rules.abandonRequestsRule.active":
        "Enable or disable the rule",

    "streaming.abr.rules.abandonRequestsRule.parameters":
        "Configures the rule specific parameters.\n\n- `abandonDurationMultiplier`: Factor to multiply with the segment duration to compare against the estimated remaining download time of the current segment. See code example above.\n- `minSegmentDownloadTimeThresholdInMs`: The AbandonRequestRule only kicks if the download time of the current segment exceeds this value.\n- `minThroughputSamplesThreshold`: Minimum throughput samples (equivalent to number of progress events) required before the AbandonRequestRule kicks in.",

    "streaming.abr.rules.l2ARule":
        "Configuration of the L2A rule",

    "streaming.abr.rules.l2ARule.active":
        "Enable or disable the rule",

    "streaming.abr.rules.loLPRule":
        "Configuration of the LoLP rule",

    "streaming.abr.rules.loLPRule.active":
        "Enable or disable the rule",

    "streaming.abr.throughput":
        "Settings related to throughput calculation",

    "streaming.abr.throughput.averageCalculationMode":
        "Defines the default mode for calculating the throughput based on the samples collected during playback.\n\nFor arithmetic and harmonic mean calculations we use a sliding window with the values defined in \"sampleSettings\"\n\nFor exponential weighted moving average calculation the default values can be changed in \"ewma\"",

    "streaming.abr.throughput.lowLatencyDownloadTimeCalculationMode":
        "Defines the effective download time estimation method we use for low latency streams that utilize the Fetch API and chunked transfer coding",

    "streaming.abr.throughput.useResourceTimingApi":
        "If set to true the ResourceTimingApi is used to derive the download time and the number of downloaded bytes.\nThis option has no effect for low latency streaming as the download time equals the segment duration in most of the cases and therefor does not provide reliable values",

    "streaming.abr.throughput.useNetworkInformationApi":
        "If set to true the NetworkInformationApi is used to derive the current throughput. Browser support is limited, only available in Chrome and Edge.\nApplies to standard (XHR requests) and/or low latency streaming (Fetch API requests).",

    "streaming.abr.throughput.useDeadTimeLatency":
        "If true, only the download portion will be considered part of the download bitrate and latency will be regarded as static.\n\nIf false, the reciprocal of the whole transfer time will be used.",

    "streaming.abr.throughput.bandwidthSafetyFactor":
        "Standard ABR throughput rules multiply the throughput by this value.\n\nIt should be between 0 and 1, with lower values giving less rebuffering (but also lower quality)",

    "streaming.abr.throughput.sampleSettings":
        "When deriving the throughput based on the arithmetic or harmonic mean these settings define:\n- `live`: Number of throughput samples to use (sample size) for live streams\n- `vod`: Number of throughput samples to use (sample size) for VoD streams\n- `enableSampleSizeAdjustment`: Adjust the sample sizes if throughput samples vary a lot\n- `decreaseScale`: Increase sample size by one if the ratio of current and previous sample is below or equal this value\n- `increaseScale`: Increase sample size by one if the ratio of current and previous sample is higher or equal this value\n- `maxMeasurementsToKeep`: Number of samples to keep before sliding samples out of the window\n- `averageLatencySampleAmount`: Number of latency samples to use (sample size)",

    "streaming.abr.throughput.ewma":
        "When deriving the throughput based on the exponential weighted moving average these settings define:\n- `throughputSlowHalfLifeSeconds`: Number by which the weight of the current throughput measurement is divided, see ThroughputModel._updateEwmaValues\n- `throughputFastHalfLifeSeconds`: Number by which the weight of the current throughput measurement is divided, see ThroughputModel._updateEwmaValues\n- `latencySlowHalfLifeCount`: Number by which the weight of the current latency is divided, see ThroughputModel._updateEwmaValues\n- `latencyFastHalfLifeCount`: Number by which the weight of the current latency is divided, see ThroughputModel._updateEwmaValues\n- `weightDownloadTimeMultiplicationFactor`: This value is multiplied with the download time in milliseconds to derive the weight for the EWMA calculation.",

    "streaming.abr.maxBitrate":
        "The maximum bitrate that the ABR algorithms will choose. This value is specified in kbps.\n\nUse -1 for no limit.",

    "streaming.abr.maxBitrate.audio":
        "The maximum bitrate that the ABR algorithms will choose. This value is specified in kbps.\n\nUse -1 for no limit.\n\naudio: Configuration for audio media type of tracks.",

    "streaming.abr.maxBitrate.video":
        "The maximum bitrate that the ABR algorithms will choose. This value is specified in kbps.\n\nUse -1 for no limit.\n\nvideo: Configuration for video media type of tracks.",

    "streaming.abr.minBitrate":
        "The minimum bitrate that the ABR algorithms will choose. This value is specified in kbps.\n\nUse -1 for no limit.",

    "streaming.abr.minBitrate.audio":
        "The minimum bitrate that the ABR algorithms will choose. This value is specified in kbps.\n\nUse -1 for no limit.\n\naudio: Configuration for audio media type of tracks.",

    "streaming.abr.minBitrate.video":
        "The minimum bitrate that the ABR algorithms will choose. This value is specified in kbps.\n\nUse -1 for no limit.\n\nvideo: Configuration for video media type of tracks.",

    "streaming.abr.initialBitrate":
        "Explicitly set the starting bitrate for audio or video. This value is specified in kbps.\n\nUse -1 to let the player decide.",

    "streaming.abr.initialBitrate.audio":
        "Explicitly set the starting bitrate for audio or video. This value is specified in kbps.\n\nUse -1 to let the player decide.\n\naudio: Configuration for audio media type of tracks.",

    "streaming.abr.initialBitrate.video":
        "Explicitly set the starting bitrate for audio or video. This value is specified in kbps.\n\nUse -1 to let the player decide.\n\nvideo: Configuration for video media type of tracks.",

    "streaming.abr.autoSwitchBitrate":
        "Indicates whether the player should enable ABR algorithms to switch the bitrate.",

    "streaming.abr.autoSwitchBitrate.audio":
        "Indicates whether the player should enable ABR algorithms to switch the bitrate.\n\naudio: Configuration for audio media type of tracks.",

    "streaming.abr.autoSwitchBitrate.video":
        "Indicates whether the player should enable ABR algorithms to switch the bitrate.\n\nvideo: Configuration for video media type of tracks.",

    "streaming.cmcd":
        "Settings related to Common Media Client Data reporting.",

    "streaming.cmcd.applyParametersFromMpd":
        "Set to true if dash.js should use the CMCD parameters defined in the MPD.",

    "streaming.cmcd.enabled":
        "Enable or disable the CMCD reporting.",

    "streaming.cmcd.sid":
        "GUID identifying the current playback session.\n\nShould be in UUID format.\n\nIf not specified a UUID will be automatically generated.",

    "streaming.cmcd.cid":
        "A unique string to identify the current content.\n\nIf not specified it will be a hash of the MPD url.",

    "streaming.cmcd.rtp":
        "The requested maximum throughput that the client considers sufficient for delivery of the asset.\n\nIf not specified this value will be dynamically calculated in the CMCDModel based on the current buffer level.",

    "streaming.cmcd.rtpSafetyFactor":
        "This value is used as a factor for the rtp value calculation: rtp = minBandwidth * rtpSafetyFactor\n\nIf not specified this value defaults to 5. Note that this value is only used when no static rtp value is defined.",

    "streaming.cmcd.maxBufferedErrorCodes":
        "The maximum number of error codes (ec) buffered per CMCD v2 report destination until its next report.\nWhen the limit is reached, the oldest code is dropped. This bounds the buffer of a destination that does not report again.\n\nIf not specified this value defaults to 10.",

    "streaming.cmcd.mode":
        "The method to use to attach cmcd metrics to the requests. 'query' to use query parameters, 'header' to use http headers.\n\nIf not specified this value defaults to 'query'.",

    "streaming.cmcd.enabledKeys":
        "This value is used to specify the desired CMCD parameters. Parameters not included in this list are not reported.",

    "streaming.cmcd.includeInRequests":
        "Specifies which HTTP GET requests shall carry parameters.\n\nPossible values are 'segment', 'mpd', 'xlink', 'steering', 'other' and 'license'.\n\nIf not specified this value defaults to ['segment', 'mpd', 'license'].",

    "streaming.cmcd.version":
        "The version of the CMCD to use.\n\nIf not specified this value defaults to 1.",

    "streaming.cmcd.eventTargets":
        "List of CMCD reporting targets.",

    "streaming.cmcd.customKeys":
        "Custom CMCD keys to include in reports as persistent session data, e.g. [{ key: 'org.svta-p-n', value: 'dash.js' }].\n\nPer the CMCD specification, custom keys must carry a hyphenated prefix (reverse-DNS syntax recommended) to avoid namespace collisions, e.g. 'com.example-mykey'. Keys without a valid prefix are ignored.\nSee the SVTA CMCD custom keys registry for registered keys.\n\nNote: event/response targets filter keys by their own enabledKeys; add custom keys there to include them in target reports.",

    "streaming.cmsd":
        "Settings related to Common Media Server Data parsing.",

    "streaming.cmsd.enabled":
        "Enable or disable the CMSD response headers parsing.",

    "streaming.cmsd.abr":
        "Sets additional ABR rules based on CMSD response headers.",

    "streaming.cmsd.abr.applyMb":
        "Set to true if dash.js should apply CMSD maximum suggested bitrate in ABR logic.",

    "streaming.cmsd.abr.etpWeightRatio":
        "Sets the weight ratio (between 0 and 1) that shall be applied on CMSD estimated throuhgput compared to measured throughput when calculating throughput.",

    "streaming.enhancement":
        "Settings related to scalable enhancement playback (e.g. LCEVC).",

    "streaming.enhancement.enabled":
        "Enable or disable the scalable enhancement playback (e.g. LCEVC).",

    "streaming.enhancement.codecs":
        "Specifies which scalable enhancement codecs are supported by the player.\n\nIf not specified this value defaults to ['lvc1'].",

    "streaming.defaultSchemeIdUri":
        "Default schemeIdUri for descriptor type elements\nThese strings are used when not provided with setInitialMediaSettingsFor()",

    "streaming.dvbReporting":
        "Settings related to DVB metrics reporting.",

    "streaming.dvbReporting.reportingUrl":
        "Override DVB reporting url in manifest with a custom one"
};

export default SETTINGS_DESCRIPTIONS;
