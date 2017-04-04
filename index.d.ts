export = dashjs;
export as namespace dashjs;

declare namespace dashjs {
    class Debug {
        setLogToBrowserConsole(flag: boolean): void;
    }

    class VideoModel {}

    class ProtectionController {
        setRobustnessLevel(levels: string | string[]);
    }

    export interface Bitrate {
        width?: number;
        height?: number;
        bandwidth?: number;
    }

    export interface MediaInfo {
        id: number | null;
        index: number | null;
        type: string | null;
        streamInfo: any | null;
        representationCount: number;
        lang: string | null;
        viewpoint: any | null | undefined;
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

    export function MediaPlayer(): {
        create(): MediaPlayerClass;
    };
}
