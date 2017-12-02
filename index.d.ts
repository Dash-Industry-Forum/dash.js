export = dashjs;
export as namespace dashjs;

declare namespace dashjs {
    interface Debug {
        getLogToBrowserConsole(): boolean;
        setLogToBrowserConsole(flag: boolean): void;
    }

    interface VideoModel { }

    interface ProtectionController {
        setRobustnessLevel(level: string): void;
    }

    export interface Bitrate {
        width?: number;
        height?: number;
        bandwidth?: number;
        scanType?: string;
    }

    export interface MediaInfo {
        id: string | null;
        index: number | null;
        type: 'video' | 'audio' | 'text' | 'fragmentedText' | 'embeddedText' | null;
        streamInfo: any | null;
        representationCount: number;
        lang: string | null;
        viewpoint: any | undefined | null;
        accessibility: any[] | null;
        audioChannelConfiguration: any[] | null;
        roles: any[] | null;
        codec: string | null;
        mimeType: string | null;
        contentProtection: any | null;
        isText: boolean;
        KID: any | null;
        bitrateList: Bitrate[];
    }

    export interface MediaPlayerClass {
        initialize(view?: HTMLElement, source?: string, autoPlay?: boolean): void;
        on(type: string, listener: (e: any) => void, scope?: object): void
        off(type: string, listener: (e: any) => void, scope?: object): void
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
        time(streamId: string): number;
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
        setMaxAllowedRepresentationRatioFor(type: 'video' | 'audio', value: number): void;
        getMaxAllowedRepresentationRatioFor(type: 'video' | 'audio'): number;
        setAutoPlay(value: boolean): void;
        getAutoPlay(): boolean;
        setScheduleWhilePaused(value: boolean): void;
        getScheduleWhilePaused(): boolean;
        getDashMetrics(): DashMetrics;
        getMetricsFor(type: 'video' | 'audio' | 'text' | 'stream'): MetricsList | null;
        getQualityFor(type: 'video' | 'audio'): number;
        setQualityFor(type: 'video' | 'audio', value: number): void;
        updatePortalSize(): void;
        getLimitBitrateByPortal(): any;
        setLimitBitrateByPortal(value: boolean): void;
        getUsePixelRatioInLimitBitrateByPortal(): any;
        setUsePixelRatioInLimitBitrateByPortal(value: boolean): void;
        setTextTrack(idx: number): void;
        getBitrateInfoListFor(type: 'video' | 'audio'): BitrateInfo[];
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
        setXHRWithCredentials(value: boolean): void;
        setXHRWithCredentialsForType(type: string, value: boolean): void;
        getXHRWithCredentialsForType(type: string): boolean;
        setBufferTimeAtTopQualityLongForm(value: number): void;
        setLongFormContentDurationThreshold(value: number): void;
        setRichBufferThreshold(value: number): void;
        getProtectionController(): ProtectionController;
        attachProtectionController(value: ProtectionController): void;
        setProtectionData(value: ProtectionData): void;
        enableManifestDateHeaderTimeSource(value: boolean): void;
        displayCaptionsOnTop(value: boolean): void;
        attachVideoContainer(container: HTMLElement): void;
        attachTTMLRenderingDiv(div: HTMLDivElement): void;
        getCurrentTextTrackIndex(): number;
        reset(): void;
    }

    export interface MediaPlayerFactory {
        create(): MediaPlayerClass;
    }

    export function MediaPlayer(): MediaPlayerFactory;

    export namespace MediaPlayer {
        export const events: MediaPlayerEvents;
    }

    interface MediaPlayerEvents {
        AST_IN_FUTURE: string;
        BUFFER_EMPTY: string;
        BUFFER_LEVEL_STATE_CHANGED: string;
        BUFFER_LOADED: string;
        CAN_PLAY: string;
        ERROR: string;
        FRAGMENT_LOADING_ABANDONED: string;
        FRAGMENT_LOADING_COMPLETED: string;
        FRAGMENT_LOADING_STARTED: string;
        KEY_ADDED: string;
        KEY_ERROR: string;
        KEY_MESSAGE: string;
        KEY_SESSION_CLOSED: string;
        KEY_SESSION_CREATED: string;
        KEY_SESSION_REMOVED: string;
        KEY_STATUSES_CHANGED: string;
        KEY_SYSTEM_SELECTED: string;
        LICENSE_REQUEST_COMPLETE: string;
        LOG: string;
        MANIFEST_LOADED: string;
        METRICS_CHANGED: string;
        METRIC_ADDED: string;
        METRIC_CHANGED: string;
        METRIC_UPDATED: string;
        PERIOD_SWITCH_COMPLETED: string;
        PERIOD_SWITCH_STARTED: string;
        PLAYBACK_ENDED: string;
        PLAYBACK_ERROR: string;
        PLAYBACK_METADATA_LOADED: string;
        PLAYBACK_NOT_ALLOWED: string;
        PLAYBACK_PAUSED: string;
        PLAYBACK_PLAYING: string;
        PLAYBACK_PROGRESS: string;
        PLAYBACK_RATE_CHANGED: string;
        PLAYBACK_SEEKED: string;
        PLAYBACK_SEEKING: string;
        PLAYBACK_STARTED: string;
        PLAYBACK_TIME_UPDATED: string;
        PROTECTION_CREATED: string;
        PROTECTION_DESTROYED: string;
        QUALITY_CHANGE_RENDERED: string;
        QUALITY_CHANGE_REQUESTED: string;
        STREAM_INITIALIZED: string;
        TEXT_TRACKS_ADDED: string;
        TEXT_TRACK_ADDED: string;
    }

    export class BitrateInfo {
        mediaType: 'video' | 'audio';
        bitrate: number;
        width: number;
        height: number;
        scanType: string;
        qualityIndex: number;
    }

    export interface MediaSettings {
        lang?: string;
        viewpoint?: any;
        audioChannelConfiguration?: any[];
        accessibility?: any;
        role?: string;
    }

    export interface Stream {
        initialize(streamInfo: StreamInfo, protectionController: ProtectionController): void;
        activate(MediaSource: MediaSource): void;
        deactivate(): void;
        getDuration(): number;
        getStartTime(): number;
        getId(): string;
        getStreamInfo(): StreamInfo | null;
        getBitrateListFor(type: 'video' | 'audio'): BitrateInfo[];
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
        serverURL: string | { [P in MediaKeyMessageType]: string };

        /** headers to add to the http request */
        httpRequestHeaders: object;

        /**
         * Defines a set of clear keys that are available to the key system.
         * Object properties are base64-encoded keyIDs (with no padding).
         * Corresponding property values are keys, base64-encoded (no padding).
         */
        clearkeys: { [key: string]: string };
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

    type TrackSwitchMode = 'alwaysReplace' | 'neverReplace';
    type TrackSelectionMode = 'highestBitrate' | 'widestRange';
}
