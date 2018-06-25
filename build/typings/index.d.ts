export = dashjs;
export as namespace dashjs;

declare namespace dashjs {
    interface Logger {
        debug(...params): void;
        info(...params): void;
        warn(...params): void;
        error(...params): void;
        fatal(...params): void;
    }

    enum LogLevel {
        LOG_LEVEL_NONE = 0,
        LOG_LEVEL_FATAL = 1,
        LOG_LEVEL_ERROR = 2,
        LOG_LEVEL_WARNING = 3,
        LOG_LEVEL_INFO = 4,
        LOG_LEVEL_DEBUG = 5
    }

    interface Debug {
        getLogger(): Logger;
        setLogTimestampVisible(flag: boolean): void;
        setCalleeNameVisible(flag: boolean): void;
        getLogToBrowserConsole(): boolean;
        setLogToBrowserConsole(flag: boolean): void;
        setLogLevel(level: LogLevel): void;
        getLogLevel(): LogLevel;
    }

    interface VideoModel { }

    interface ProtectionController {
        initialize(manifest: object | null, audioInfo: ProtectionMediaInfo, videoInfo: ProtectionMediaInfo): void;
        setProtectionData(protData: object): void;
        setRobustnessLevel(level: string): void;
        setSessionType(type: string): void;
        loadKeySession(id: string): void;
        closeKeySession(session: SessionToken): void;
        removeKeySession(session: SessionToken): void;
    }

    export interface Bitrate {
        width?: number;
        height?: number;
        bandwidth?: number;
        scanType?: string;
    }

    export class MediaInfo {
        id: string | null;
        index: number | null;
        type: 'video' | 'audio' | 'text' | 'fragmentedText' | 'embeddedText' | null;
        streamInfo: StreamInfo | null;
        representationCount: number;
        lang: string | null;
        viewpoint: any | undefined | null;
        accessibility: any[] | null;
        audioChannelConfiguration: any[] | null;
        roles: string[] | null;
        codec: string | null;
        mimeType: string | null;
        contentProtection: any | null;
        isText: boolean;
        KID: any | null;
        bitrateList: Bitrate[];
    }

    export class ProtectionMediaInfo {
        codec: string | null;
        contentProtection: any | null;
    }

    export interface MediaPlayerClass {
        initialize(view?: HTMLElement, source?: string, autoPlay?: boolean): void;
        on(type: AstInFutureEvent['type'], listener: (e: AstInFutureEvent) => void, scope?: object): void;
        on(type: BufferEvent['type'], listener: (e: BufferEvent) => void, scope?: object): void;
        on(type: ErrorEvent['type'], listener: (e: ErrorEvent) => void, scope?: object): void;
        on(type: FragmentLoadingCompletedEvent['type'], listener: (e: FragmentLoadingCompletedEvent) => void, scope?: object): void;
        on(type: FragmentLoadingAbandonedEvent['type'], listener: (e: FragmentLoadingAbandonedEvent) => void, scope?: object): void;
        on(type: KeyErrorEvent['type'], listener: (e: KeyErrorEvent) => void, scope?: object): void;
        on(type: KeyMessageEvent['type'], listener: (e: KeyMessageEvent) => void, scope?: object): void;
        on(type: KeySessionClosedEvent['type'], listener: (e: KeySessionClosedEvent) => void, scope?: object): void;
        on(type: KeySessionEvent['type'], listener: (e: KeySessionEvent) => void, scope?: object): void;
        on(type: KeyStatusesChangedEvent['type'], listener: (e: KeyStatusesChangedEvent) => void, scope?: object): void;
        on(type: KeySystemSelectedEvent['type'], listener: (e: KeySystemSelectedEvent) => void, scope?: object): void;
        on(type: LicenseRequestCompleteEvent['type'], listener: (e: LicenseRequestCompleteEvent) => void, scope?: object): void;
        on(type: LogEvent['type'], listener: (e: LogEvent) => void, scope?: object): void;
        on(type: ManifestLoadedEvent['type'], listener: (e: ManifestLoadedEvent) => void, scope?: object): void;
        on(type: MetricEvent['type'], listener: (e: MetricEvent) => void, scope?: object): void;
        on(type: MetricChangedEvent['type'], listener: (e: MetricChangedEvent) => void, scope?: object): void;
        on(type: PeriodSwitchEvent['type'], listener: (e: PeriodSwitchEvent) => void, scope?: object): void;
        on(type: PlaybackErrorEvent['type'], listener: (e: PlaybackErrorEvent) => void, scope?: object): void;
        on(type: PlaybackPausedEvent['type'], listener: (e: PlaybackPausedEvent) => void, scope?: object): void;
        on(type: PlaybackPlayingEvent['type'], listener: (e: PlaybackPlayingEvent) => void, scope?: object): void;
        on(type: PlaybackRateChangedEvent['type'], listener: (e: PlaybackRateChangedEvent) => void, scope?: object): void;
        on(type: PlaybackSeekingEvent['type'], listener: (e: PlaybackSeekingEvent) => void, scope?: object): void;
        on(type: PlaybackStartedEvent['type'], listener: (e: PlaybackStartedEvent) => void, scope?: object): void;
        on(type: PlaybackTimeUpdatedEvent['type'], listener: (e: PlaybackTimeUpdatedEvent) => void, scope?: object): void;
        on(type: ProtectionCreatedEvent['type'], listener: (e: ProtectionCreatedEvent) => void, scope?: object): void;
        on(type: ProtectionDestroyedEvent['type'], listener: (e: ProtectionDestroyedEvent) => void, scope?: object): void;
        on(type: QualityChangeRenderedEvent['type'], listener: (e: QualityChangeRenderedEvent) => void, scope?: object): void;
        on(type: QualityChangeRequestedEvent['type'], listener: (e: QualityChangeRequestedEvent) => void, scope?: object): void;
        on(type: StreamInitializedEvent['type'], listener: (e: StreamInitializedEvent) => void, scope?: object): void;
        on(type: TextTracksAddedEvent['type'], listener: (e: TextTracksAddedEvent) => void, scope?: object): void;
        on(type: TtmlParsedEvent['type'], listener: (e: TtmlParsedEvent) => void, scope?: object): void;
        on(type: string, listener: (e: Event) => void, scope?: object): void;
        off(type: string, listener: (e: any) => void, scope?: object): void;
        extend(parentNameString: string, childInstance: object, override: boolean): void;
        attachView(element: HTMLElement): void;
        attachSource(urlOrManifest: string | object): void;
        isReady(): boolean;
        play(): void;
        isPaused(): boolean;
        pause(): void;
        isSeeking(): boolean;
        isDynamic(): boolean;
        seek(value: number): void;
        setPlaybackRate(value:number): void;
        getPlaybackRate(): number;
        setMute(value: boolean): void;
        isMuted(): boolean;
        setVolume(value: number): void;
        getVolume(): number;
        time(streamId?: string): number;
        duration(): number;
        timeAsUTC(): number;
        durationAsUTC(): number;
        getActiveStream(): Stream | null;
        getDVRWindowSize(): number;
        getDVRSeekOffset(value: number): number;
        convertToTimeCode(value: number): string;
        formatUTC(time: number, locales: string, hour12: boolean, withDate?: boolean): string;
        getVersion(): string;
        getDebug(): Debug;
        getBufferLength(type: 'video' | 'audio' | 'fragmentedText'): number;
        getVideoModel(): VideoModel;
        getVideoContainer(): HTMLElement | null;
        getTTMLRenderingDiv(): HTMLDivElement | null;
        getVideoElement(): HTMLVideoElement;
        getSource(): string | object;
        setLiveDelayFragmentCount(value: number): void;
        setLiveDelay(value: number): void;
        getLiveDelay(): number | undefined;
        useSuggestedPresentationDelay(value: boolean): void;
        enableLastBitrateCaching(enable: boolean, ttl?: number): void;
        enableLastMediaSettingsCaching(enable: boolean, ttl?: number): void;
        setMaxAllowedBitrateFor(type: 'video' | 'audio', value: number): void;
        getMaxAllowedBitrateFor(type: 'video' | 'audio'): number;
        getTopBitrateInfoFor(type: 'video' | 'audio'): BitrateInfo;
        setMaxAllowedRepresentationRatioFor(type: 'video' | 'audio', value: number): void;
        getMaxAllowedRepresentationRatioFor(type: 'video' | 'audio'): number;
        setAutoPlay(value: boolean): void;
        getAutoPlay(): boolean;
        setScheduleWhilePaused(value: boolean): void;
        getScheduleWhilePaused(): boolean;
        getDashMetrics(): DashMetrics;
        getMetricsFor(type: 'video' | 'audio' | 'text' | 'stream'): MetricsList | null;
        getQualityFor(type: 'video' | 'audio' | 'image'): number;
        setQualityFor(type: 'video' | 'audio' | 'image', value: number): void;
        updatePortalSize(): void;
        getLimitBitrateByPortal(): any;
        setLimitBitrateByPortal(value: boolean): void;
        getUsePixelRatioInLimitBitrateByPortal(): any;
        setUsePixelRatioInLimitBitrateByPortal(value: boolean): void;
        enableText(enable: boolean): void;
        setTextTrack(idx: number): void;
        getTextDefaultLanguage(): string | undefined;
        setTextDefaultLanguage(lang: string): void;
        getTextDefaultEnabled(): boolean | undefined;
        setTextDefaultEnabled(enable: boolean): void;
        getThumbnail(time: number): Thumbnail;
        getBitrateInfoListFor(type: 'video' | 'audio' | 'image'): BitrateInfo[];
        setInitialBitrateFor(type: 'video' | 'audio', value: number): void;
        getInitialBitrateFor(type: 'video' | 'audio'): number;
        setInitialRepresentationRatioFor(type: 'video' | 'audio', value: number): void;
        getInitialRepresentationRatioFor(type: 'video' | 'audio'): number;
        getStreamsFromManifest(manifest: object): StreamInfo[];
        getTracksFor(type: 'video' | 'audio' | 'text' | 'fragmentedText'): MediaInfo[];
        getTracksForTypeFromManifest(type: 'video' | 'audio' | 'text' | 'fragmentedText', manifest: object, streamInfo: StreamInfo): MediaInfo[];
        getCurrentTrackFor(type: 'video' | 'audio' | 'text' | 'fragmentedText'): MediaInfo | null;
        setInitialMediaSettingsFor(type: 'video' | 'audio', value: MediaSettings): void;
        getInitialMediaSettingsFor(type: 'video' | 'audio'): MediaSettings;
        setCurrentTrack(track: MediaInfo): void;
        getTrackSwitchModeFor(type: 'video' | 'audio'): TrackSwitchMode;
        setTrackSwitchModeFor(type: 'video' | 'audio', mode: TrackSwitchMode): void;
        setSelectionModeForInitialTrack(mode: TrackSelectionMode): void;
        getSelectionModeForInitialTrack(): TrackSelectionMode;
        getAutoSwitchQuality(): boolean;
        setAutoSwitchQuality(value: boolean): void;
        setFastSwitchEnabled(value: boolean): void;
        getFastSwitchEnabled(): boolean;
        getAutoSwitchQualityFor(type: 'video' | 'audio'): boolean;
        setAutoSwitchQualityFor(type: 'video' | 'audio', value: boolean): void;
        enableBufferOccupancyABR(value: boolean): void;
        setBandwidthSafetyFactor(value: number): void;
        getBandwidthSafetyFactor(): number;
        setAbandonLoadTimeout(value: number): void;
        retrieveManifest(url: string, callback: (manifest: object | null, error: any) => void): void;
        addUTCTimingSource(schemeIdUri: string, value: string): void;
        removeUTCTimingSource(schemeIdUri: string, value: string): void;
        clearDefaultUTCTimingSources(): void;
        restoreDefaultUTCTimingSources(): void;
        setBufferToKeep(value: number): void;
        setBufferPruningInterval(value: number): void;
        setStableBufferTime(value: number): void;
        setBufferTimeAtTopQuality(value: number): void;
        setFragmentLoaderRetryAttempts(value: number): void;
        setFragmentLoaderRetryInterval(value: number): void;
        setXHRWithCredentialsForType(type: string, value: boolean): void;
        getXHRWithCredentialsForType(type: string): boolean;
        setBufferTimeAtTopQualityLongForm(value: number): void;
        setLongFormContentDurationThreshold(value: number): void;
        setCacheLoadThresholdForType(type: 'video' | 'audio', value: number): void;
        getProtectionController(): ProtectionController;
        attachProtectionController(value: ProtectionController): void;
        setProtectionData(value: ProtectionData): void;
        enableManifestDateHeaderTimeSource(value: boolean): void;
        displayCaptionsOnTop(value: boolean): void;
        attachVideoContainer(container: HTMLElement): void;
        attachTTMLRenderingDiv(div: HTMLDivElement): void;
        getCurrentTextTrackIndex(): number;
        setJumpGaps(value: boolean): void;
        getJumpGaps(): boolean;
        setSmallGapLimit(value: number): void;
        getSmallGapLimit(): number;
        preload(): void;
        reset(): void;
        addABRCustomRule(type: string, rulename: string, rule: object): void;
        removeABRCustomRule(rulename: string): void;
        removeAllABRCustomRule(): void;
    }

    export interface MediaPlayerFactory {
        create(): MediaPlayerClass;
    }

    export function MediaPlayer(): MediaPlayerFactory;

    export namespace MediaPlayer {
        export const events: MediaPlayerEvents;
    }

    interface MediaPlayerEvents {
        AST_IN_FUTURE: 'astInFuture';
        BUFFER_EMPTY: 'bufferStalled';
        BUFFER_LEVEL_STATE_CHANGED: 'bufferStateChanged';
        BUFFER_LOADED: 'bufferLoaded';
        CAN_PLAY: 'canPlay';
        ERROR: 'error';
        FRAGMENT_LOADING_ABANDONED: 'fragmentLoadingAbandoned';
        FRAGMENT_LOADING_COMPLETED: 'fragmentLoadingCompleted';
        FRAGMENT_LOADING_STARTED: 'fragmentLoadingStarted';
        KEY_ADDED: 'public_keyAdded';
        KEY_ERROR: 'public_keyError';
        KEY_MESSAGE: 'public_keyMessage';
        KEY_SESSION_CLOSED: 'public_keySessionClosed';
        KEY_SESSION_CREATED: 'public_keySessionCreated';
        KEY_SESSION_REMOVED: 'public_keySessionRemoved';
        KEY_STATUSES_CHANGED: 'public_keyStatusesChanged';
        KEY_SYSTEM_SELECTED: 'public_keySystemSelected';
        LICENSE_REQUEST_COMPLETE: 'public_licenseRequestComplete';
        LOG: 'log';
        MANIFEST_LOADED: 'manifestLoaded';
        METRICS_CHANGED: 'metricsChanged';
        METRIC_ADDED: 'metricAdded';
        METRIC_CHANGED: 'metricChanged';
        METRIC_UPDATED: 'metricUpdated';
        PERIOD_SWITCH_COMPLETED: 'periodSwitchCompleted';
        PERIOD_SWITCH_STARTED: 'periodSwitchStarted';
        PLAYBACK_CATCHUP_END: 'playbackCatchupEnd';
        PLAYBACK_CATCHUP_START: 'playbackCatchupStart';
        PLAYBACK_ENDED: 'playbackEnded';
        PLAYBACK_ERROR: 'playbackError';
        PLAYBACK_METADATA_LOADED: 'playbackMetaDataLoaded';
        PLAYBACK_NOT_ALLOWED: 'playbackNotAllowed';
        PLAYBACK_PAUSED: 'playbackPaused';
        PLAYBACK_PLAYING: 'playbackPlaying';
        PLAYBACK_PROGRESS: 'playbackProgress';
        PLAYBACK_RATE_CHANGED: 'playbackRateChanged';
        PLAYBACK_SEEKED: 'playbackSeeked';
        PLAYBACK_SEEKING: 'playbackSeeking';
        PLAYBACK_STALLED: 'playbackStalled';
        PLAYBACK_STARTED: 'playbackStarted';
        PLAYBACK_TIME_UPDATED: 'playbackTimeUpdated';
        PLAYBACK_WAITING: 'playbackWaiting';
        PROTECTION_CREATED: 'public_protectioncreated';
        PROTECTION_DESTROYED: 'public_protectiondestroyed';
        TRACK_CHANGE_RENDERED: 'trackChangeRendered';
        QUALITY_CHANGE_RENDERED: 'qualityChangeRendered';
        QUALITY_CHANGE_REQUESTED: 'qualityChangeRequested';
        STREAM_INITIALIZED: 'streamInitialized';
        TEXT_TRACKS_ADDED: 'allTextTracksAdded';
        TEXT_TRACK_ADDED: 'textTrackAdded';
        TTML_PARSED: 'ttmlParsed';
    }

    export interface Event {
        type: string;
    }

    export interface AstInFutureEvent extends Event {
        type: MediaPlayerEvents['AST_IN_FUTURE'];
        delay: number;
    }

    export interface BufferEvent extends Event {
        type: MediaPlayerEvents['BUFFER_EMPTY' | 'BUFFER_LOADED'];
        mediaType: 'video' | 'audio' | 'fragmentedText';
    }

    export interface BufferStateChangedEvent extends Event {
        type: MediaPlayerEvents['BUFFER_LEVEL_STATE_CHANGED'];
        mediaType: 'video' | 'audio' | 'fragmentedText';
        sender: object;
        state: 'bufferStalled' | 'bufferLoaded';
        streamInfo: StreamInfo;
    }

    export interface GenericErrorEvent extends Event {
        type: MediaPlayerEvents['ERROR'];
        error: 'capability' | 'mediasource' | 'key_session' | 'key_message';
        event: string;
    }

    export interface DownloadErrorEvent extends Event {
        type: MediaPlayerEvents['ERROR'];
        error: 'download';
        event: {
            id: string;
            url: string;
            request: XMLHttpRequest;
        };
    }

    export interface ManifestErrorEvent extends Event {
        type: MediaPlayerEvents['ERROR'];
        error: 'manifestError';
        event: {
            id: string;
            message: string;
            manifest?: object;
            event?: string;
        };
    }

    export interface TimedTextErrorEvent extends Event {
        type: MediaPlayerEvents['ERROR'];
        error: 'cc';
        event: {
            id: string;
            message: string;
            cc: string;
        };
    }

    export type ErrorEvent = GenericErrorEvent | DownloadErrorEvent | ManifestErrorEvent | TimedTextErrorEvent;

    export interface FragmentLoadingCompletedEvent extends Event {
        type: MediaPlayerEvents['FRAGMENT_LOADING_COMPLETED'];
        request: FragmentRequest;
        response: ArrayBuffer;
        sender: object;
    }

    export interface FragmentLoadingAbandonedEvent extends Event {
        type: MediaPlayerEvents['FRAGMENT_LOADING_ABANDONED'];
        streamProcessor: object;
        request: object;
        mediaType: 'video' | 'audio' | 'fragmentedText';
    }

    export class KeyError {
        constructor(sessionToken: SessionToken, errorString: string);
        sessionToken: SessionToken;
        error: string;
    }

    export interface KeyErrorEvent extends Event {
        type: MediaPlayerEvents['KEY_ERROR'];
        data: KeyError;
    }

    export class KeyMessage {
        constructor(sessionToken: SessionToken, message: ArrayBuffer, defaultURL: string, messageType?: string);
        sessionToken: SessionToken;
        message: ArrayBuffer;
        defaultURL: string;
        messageType: string;
    }

    export interface KeyMessageEvent extends Event {
        type: MediaPlayerEvents['KEY_MESSAGE'];
        data: KeyMessage;
    }

    export interface KeySessionClosedEvent extends Event {
        type: MediaPlayerEvents['KEY_SESSION_CLOSED' | 'KEY_SESSION_REMOVED'];
        data: string | null;
        error?: string;
    }

    export interface KeySessionEvent extends Event {
        type: MediaPlayerEvents['KEY_SESSION_CREATED'];
        data: SessionToken | null;
        error?: string;
    }

    export interface KeyStatusesChangedEvent extends Event {
        type: MediaPlayerEvents['KEY_STATUSES_CHANGED'];
        data: SessionToken;
    }

    export interface KeySystemSelectedEvent extends Event {
        type: MediaPlayerEvents['KEY_SYSTEM_SELECTED'];
        data: object | null;
        error?: string;
    }

    export interface LicenseRequestCompleteEvent extends Event {
        type: MediaPlayerEvents['LICENSE_REQUEST_COMPLETE'];
        data: {
            sessionToken: SessionToken;
            messageType: string;
        };
        error?: string;
    }

    export interface LogEvent extends Event {
        type: MediaPlayerEvents['LOG'];
        message: string;
    }

    export interface ManifestLoadedEvent extends Event {
        type: MediaPlayerEvents['MANIFEST_LOADED'];
        data: object;
    }

    export interface MetricEvent extends Event {
        type: MediaPlayerEvents['METRIC_ADDED' | 'METRIC_UPDATED'];
        mediaType: 'video' | 'audio' | 'fragmentedText';
        metric: MetricType;
        value: object;
    }

    export interface MetricChangedEvent extends Event {
        type: MediaPlayerEvents['METRIC_CHANGED'];
        mediaType: 'video' | 'audio' | 'fragmentedText';
    }

    export interface PeriodSwitchEvent extends Event {
        type: MediaPlayerEvents['PERIOD_SWITCH_COMPLETED' | 'PERIOD_SWITCH_STARTED'];
        toStreamInfo: StreamInfo | null;
        fromStreamInfo?: StreamInfo | null;
    }

    export interface PlaybackErrorEvent extends Event {
        type: MediaPlayerEvents['PLAYBACK_ERROR'];
        error: string;
    }

    export interface PlaybackPausedEvent extends Event {
        type: MediaPlayerEvents['PLAYBACK_PAUSED'];
        ended: boolean | null;
    }

    export interface PlaybackPlayingEvent extends Event {
        type: MediaPlayerEvents['PLAYBACK_PLAYING'];
        playingTime: number | null;
    }

    export interface PlaybackRateChangedEvent extends Event {
        type: MediaPlayerEvents['PLAYBACK_RATE_CHANGED'];
        playbackRate: number | null;
    }

    export interface PlaybackSeekingEvent extends Event {
        type: MediaPlayerEvents['PLAYBACK_SEEKING'];
        seekTime: number | null;
    }

    export interface PlaybackStartedEvent extends Event {
        type: MediaPlayerEvents['PLAYBACK_STARTED'];
        startTime: number | null;
    }

    export interface PlaybackTimeUpdatedEvent extends Event {
        type: MediaPlayerEvents['PLAYBACK_TIME_UPDATED'];
        time: number | null;
        timeToEnd: number;
    }

    export interface PlaybackWaitingEvent extends Event {
        type: MediaPlayerEvents['PLAYBACK_WAITING'];
        playingTime: number | null;
    }

    export interface ProtectionCreatedEvent extends Event {
        type: MediaPlayerEvents['PROTECTION_CREATED'];
        controller: object;
        manifest: object;
    }

    export interface ProtectionDestroyedEvent extends Event {
        type: MediaPlayerEvents['PROTECTION_DESTROYED'];
        data: string;
    }

    export interface TrackChangeRenderedEvent extends Event {
        type: MediaPlayerEvents['TRACK_CHANGE_RENDERED'];
        mediaType: 'video' | 'audio' | 'fragmentedText';
        oldMediaInfo: MediaInfo;
        newMediaInfo: MediaInfo;
    }

    export interface QualityChangeRenderedEvent extends Event {
        type: MediaPlayerEvents['QUALITY_CHANGE_RENDERED'];
        mediaType: 'video' | 'audio' | 'fragmentedText';
        oldQuality: number;
        newQuality: number;
    }

    export interface QualityChangeRequestedEvent extends Event {
        type: MediaPlayerEvents['QUALITY_CHANGE_REQUESTED'];
        mediaType: 'video' | 'audio' | 'fragmentedText';
        oldQuality: number;
        newQuality: number;
        streamInfo: StreamInfo | null;
        reason: {
            name?: string;
            droppedFrames?: number;
        } | null;
    }

    export interface StreamInitializedEvent extends Event {
        type: MediaPlayerEvents['STREAM_INITIALIZED'];
        streamInfo: StreamInfo;
        error: Error | null;
    }

    export interface TextTracksAddedEvent extends Event {
        type: MediaPlayerEvents['TEXT_TRACKS_ADDED'];
        enabled: boolean;
        index: number;
        tracks: TextTrackInfo[];
    }

    export interface TtmlParsedEvent extends Event {
        type: MediaPlayerEvents['TTML_PARSED'];
        ttmlString: string;
        ttmlDoc: object;
    }

    export class BitrateInfo {
        mediaType: 'video' | 'audio';
        bitrate: number;
        width: number;
        height: number;
        scanType: string;
        qualityIndex: number;
    }

    export interface FragmentRequest {
        action: string;
        availabilityEndTime: number;
        availabilityStartTime: Date;
        bytesLoaded: number;
        bytesTotal: number;
        delayLoadingTime: number;
        duration: number;
        firstByteDate: Date;
        index: number;
        mediaInfo: MediaInfo;
        mediaType: 'video' | 'audio' | 'text' | 'fragmentedText' | 'embeddedText';
        quality: number;
        representationId: string;
        requestStartDate: Date;
        requestEndDate: Date | null;
        responseType: string;
        serviceLocation: string;
        startTime: number;
        timescale: number;
        type: 'InitializationSegment' | 'MediaSegment';
        url: string;
    }

    export interface MediaSettings {
        lang?: string;
        viewpoint?: any;
        audioChannelConfiguration?: any[];
        accessibility?: any;
        role?: string;
    }

    export interface SessionToken {
        session: MediaKeySession;
        initData: any;
        getSessionID(): string;
        getExpirationTime(): number;
        getKeyStatuses(): MediaKeyStatusMap;
        getSessionType(): string;
    }

    export interface Stream {
        initialize(streamInfo: StreamInfo, protectionController: ProtectionController): void;
        activate(MediaSource: MediaSource): void;
        deactivate(): void;
        getDuration(): number;
        getStartTime(): number;
        getId(): string;
        getStreamInfo(): StreamInfo | null;
        getBitrateListFor(type: 'video' | 'audio' | 'image'): BitrateInfo[];
        updateData(updatedStreamInfo: StreamInfo): void;
        reset(): void;
    }

    export class StreamInfo {
        id: string;
        index: number;
        start: number;
        duration: number;
        manifestInfo: object;
        isLast: boolean;
    }

    export interface DashMetrics {
        getIndexForRepresentation(representationId: string, periodIdx: number): number;
        /**
         * This method returns the current max index based on what is defined in the MPD.
         *
         * @param bufferType String 'audio' or 'video',
         * @param periodIdx Make sure this is the period index not id
         */
        getMaxIndexForBufferType(bufferType: 'video' | 'audio', periodIdx: number): number;
        getCurrentRepresentationSwitch(metrics: MetricsList): any[];
        getLatestBufferLevelVO(metrics: MetricsList): any[];
        getCurrentBufferLevel(metrics: MetricsList): number;
        getCurrentHttpRequest(metrics: MetricsList): any;
        getHttpRequests(metrics: MetricsList): any[];
        getCurrentDroppedFrames(metrics: MetricsList): any[];
        getCurrentSchedulingInfo(metrics: MetricsList): any[];
        getCurrentDVRInfo(metrics: MetricsList): any[];
        getCurrentManifestUpdate(metrics: MetricsList): any[];
        getLatestFragmentRequestHeaderValueByID(metrics: MetricsList, id: string): string;
        getLatestMPDRequestHeaderValueByID(metrics: MetricsList, id: string): string;
        getRequestsQueue(metrics: MetricsList): RequestsQueue | null;
    }

    export class ProtectionData {
        /**
         * A license server URL to use with this key system.
         * When specified as a string, a single URL will be used regardless of message type.
         * When specified as an object, the object will have property names for each message
         * type with the corresponding property value being the URL to use for
         * messages of that type
         */
        serverURL?: string | { [P in MediaKeyMessageType]: string };

        /** headers to add to the http request */
        httpRequestHeaders?: object;

        /**
         * Defines a set of clear keys that are available to the key system.
         * Object properties are base64-encoded keyIDs (with no padding).
         * Corresponding property values are keys, base64-encoded (no padding).
         */
        clearkeys?: { [key: string]: string };
    }

    export class MetricsList {
        TcpList: any[];
        HttpList: any[];
        RepSwitchList: any[];
        BufferLevel: any[];
        BufferState: any[];
        PlayList: any[];
        DroppedFrames: any[];
        SchedulingInfo: any[];
        DVRInfo: any[];
        ManifestUpdate: any[];
        RequestsQueue: RequestsQueue | null;
        DVBErrors: any[];
    }

    export class RequestsQueue {
        /**
         * Array of all of the requests that have begun to load.
         * This request may not make it into the executed queue if it is abandon due to ABR rules for example.
         */
        loadingRequests: any[];
        /**
         * Array of the the requests that have completed
         */
        executedRequests: any[];
    }

    export class TextTrackInfo {
        captionData: CaptionData[] | null;
        label: string | null;
        lang: string | null;
        index: number;
        isTTML: boolean;
        defaultTrack: boolean;
        kind: string;
        roles: string[] | null;
        isFragmented: boolean;
        isEmbedded: boolean;
    }

    export interface CaptionData {
        start: number;
        end: number;
        data?: string;
        styles?: {
            align?: string;
            line?: string;
            position?: string;
            size?: string;
        };
        type?: string;
        cueID?: string;
        isd?: object;
        images?: string[];
        embeddedImages?: { [id: string]: string };
    }

    export interface Thumbnail {
        url: string;
        width: number;
        height: number;
        x: number;
        y: number;
    }

    export type MetricType = 'ManifestUpdate' | 'RequestsQueue';
    export type TrackSwitchMode = 'alwaysReplace' | 'neverReplace';
    export type TrackSelectionMode = 'highestBitrate' | 'widestRange';
}
