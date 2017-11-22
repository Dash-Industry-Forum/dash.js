export = dashjs;
export as namespace dashjs;

declare namespace dashjs {
    class Debug {
        setLogToBrowserConsole(flag: boolean): void;
    }

    class VideoModel { }

    class ProtectionController {
        setRobustnessLevel(level: string): void;
    }

    export interface Bitrate {
        width?: number;
        height?: number;
        bandwidth?: number;
        scanType?: string;
    }

    export interface MediaInfo {
        id: number | null;
        index: number | null;
        type: string | null;
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

    export class MediaPlayerClass {
        initialize(view?: HTMLElement, source?: string, autoPlay?: boolean): void;
        on(type: string, listener: Function, scope?: Object): void
        off(type: string, listener: Function, scope?: Object): void
        extend(parentNameString: string, childInstance: Object, override: boolean): void;
        attachView(element: HTMLElement): void;
        attachSource(urlOrManifest: string | Object): void;
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
        getActiveStream(): Object | null;
        getDVRWindowSize(): number;
        getDVRSeekOffset(value: number): number;
        convertToTimeCode(value: number): string;
        formatUTC(time: number, locales: string, hour12: boolean, withDate?: boolean): string;
        getVersion(): string;
        getDebug(): Debug;
        getBufferLength(type: string): number;
        getVideoModel(): VideoModel;
        getVideoContainer(): Object | null;
        getTTMLRenderingDiv(): Object | null;
        getVideoElement: Object;
        getSource(): string | Object;
        setLiveDelayFragmentCount(value: number): void;
        setLiveDelay(value: number): void;
        getLiveDelay(): number | undefined;
        useSuggestedPresentationDelay(value: boolean): void;
        enableLastBitrateCaching(enable: boolean, ttl?: number): void;
        enableLastMediaSettingsCaching(enable: boolean, ttl?: number): void;
        setMaxAllowedBitrateFor(type: string, value: number): void;
        getMaxAllowedBitrateFor(type: string): number;
        setMaxAllowedRepresentationRatioFor(type: string, value: number): void;
        getMaxAllowedRepresentationRatioFor(type: string): number;
        setAutoPlay(value: boolean): void;
        getAutoPlay(): boolean;
        setScheduleWhilePaused(value: boolean): void;
        getScheduleWhilePaused(): boolean;
        getDashMetrics(): Object;
        getMetricsFor(type: string): Object;
        getQualityFor(type: string): number;
        setQualityFor(type: string, value: number): void;
        updatePortalSize(): void;
        getLimitBitrateByPortal(): any;
        setLimitBitrateByPortal(value: boolean): void;
        getUsePixelRatioInLimitBitrateByPortal(): any;
        setUsePixelRatioInLimitBitrateByPortal(value: boolean): void;
        setTextTrack(idx: number): void;
        getBitrateInfoListFor(type: string): Object[];
        setInitialBitrateFor(type: string, value: number): void;
        getInitialBitrateFor(type: string): number;
        setInitialRepresentationRatioFor(type: string, value: number): void;
        getInitialRepresentationRatioFor(type: string): number;
        getStreamsFromManifest(manifest: Object): Object[];
        getTracksFor(type: string): Object[];
        getTracksForTypeFromManifest(type: string, manifest: Object, streamInfo: Object): Object[];
        getCurrentTrackFor(type: string): MediaInfo | null;
        setInitialMediaSettingsFor(type: string, value: Object): void;
        getInitialMediaSettingsFor(type: string): Object;
        setCurrentTrack(track: Object): void;
        getTrackSwitchModeFor(type: string): string;
        setTrackSwitchModeFor(type: string, mode: string): void;
        setSelectionModeForInitialTrack(mode: string): void;
        getSelectionModeForInitialTrack(): string;
        getAutoSwitchQuality(): boolean;
        setAutoSwitchQuality(value: boolean): void;
        setFastSwitchEnabled(value: boolean): void;
        getFastSwitchEnabled(): boolean;
        getAutoSwitchQualityFor(type: 'video' | 'audio'): boolean;
        setAutoSwitchQualityFor(type: 'video' | 'audio', value?: boolean): void;
        enableBufferOccupancyABR(value: boolean): void;
        setBandwidthSafetyFactor(value: number): void;
        getBandwidthSafetyFactor(): number;
        setAbandonLoadTimeout(value: number): void;
        retrieveManifest(url: string, callback: Function): void;
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
        setProtectionData(value: Object): void;
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
}
