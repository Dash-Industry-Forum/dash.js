import {
    CommonMediaRequest,
    CommonMediaResponse,
    RequestInterceptor,
    ResponseInterceptor
} from '@svta/common-media-library/request'

export = dashjs;
export as namespace dashjs;

declare namespace dashjs {

    /**
     * Core - Errors
     */

    class Errors extends ErrorsBase {
        /**
         * Error code returned when a manifest parsing error occurs
         */
        MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE: 10;

        /**
         * Error code returned when a manifest loading error occurs
         */
        MANIFEST_LOADER_LOADING_FAILURE_ERROR_CODE: 11;

        /**
         * Error code returned when a xlink loading error occurs
         */
        XLINK_LOADER_LOADING_FAILURE_ERROR_CODE: 12;

        /**
         * Error code returned when no segment ranges could be determined from the sidx box
         */
        SEGMENT_BASE_LOADER_ERROR_CODE: 15;

        /**
         * Error code returned when the time synchronization failed
         */
        TIME_SYNC_FAILED_ERROR_CODE: 16;

        /**
         * Error code returned when loading a fragment failed
         */
        FRAGMENT_LOADER_LOADING_FAILURE_ERROR_CODE: 17;

        /**
         * Error code returned when the FragmentLoader did not receive a request object
         */
        FRAGMENT_LOADER_NULL_REQUEST_ERROR_CODE: 18;

        /**
         * Error code returned when the BaseUrl resolution failed
         */
        URL_RESOLUTION_FAILED_GENERIC_ERROR_CODE: 19;

        /**
         * Error code returned when the append operation in the SourceBuffer failed
         */
        APPEND_ERROR_CODE: 20;

        /**
         * Error code returned when the remove operation in the SourceBuffer failed
         */
        REMOVE_ERROR_CODE: 21;

        /**
         * Error code returned when updating the internal objects after loading an MPD failed
         */
        DATA_UPDATE_FAILED_ERROR_CODE: 22;

        /**
         * Error code returned when MediaSource is not supported by the browser
         */
        CAPABILITY_MEDIASOURCE_ERROR_CODE: 23;

        /**
         * Error code returned when Protected contents are not supported
         */
        CAPABILITY_MEDIAKEYS_ERROR_CODE: 24;

        /**
         * Error code returned when loading the manifest failed
         */
        DOWNLOAD_ERROR_ID_MANIFEST_CODE: 25;

        /**
         * Error code returned when loading the sidx failed
         */
        DOWNLOAD_ERROR_ID_SIDX_CODE: 26;

        /**
         * Error code returned when loading the media content failed
         */
        DOWNLOAD_ERROR_ID_CONTENT_CODE: 27;

        /**
         * Error code returned when loading the init segment failed
         */
        DOWNLOAD_ERROR_ID_INITIALIZATION_CODE: 28;

        /**
         * Error code returned when loading the XLink content failed
         */
        DOWNLOAD_ERROR_ID_XLINK_CODE: 29;

        /**
         * Error code returned when parsing the MPD resulted in a logical error
         */
        MANIFEST_ERROR_ID_PARSE_CODE: 31;

        /**
         * Error code returned when no stream (period) has been detected in the manifest
         */
        MANIFEST_ERROR_ID_NOSTREAMS_CODE: 32;

        /**
         * Error code returned when something wrong has happened during parsing and appending subtitles (TTML or VTT)
         */
        TIMED_TEXT_ERROR_ID_PARSE_CODE: 33;

        /**
         * Error code returned when a 'muxed' media type has been detected in the manifest. This type is not supported
         */

        MANIFEST_ERROR_ID_MULTIPLEXED_CODE: 34;

        /**
         * Error code returned when a media source type is not supported
         */
        MEDIASOURCE_TYPE_UNSUPPORTED_CODE: 35;

        /**
         * Error code returned when the available Adaptation Sets can not be selected because the corresponding key ids have an invalid key status
         * @type {number}
         */
        NO_SUPPORTED_KEY_IDS: 36;

        MANIFEST_LOADER_PARSING_FAILURE_ERROR_MESSAGE: 'parsing failed for ';
        MANIFEST_LOADER_LOADING_FAILURE_ERROR_MESSAGE: 'Failed loading manifest: ';
        XLINK_LOADER_LOADING_FAILURE_ERROR_MESSAGE: 'Failed loading Xlink element: ';
        SEGMENTS_UPDATE_FAILED_ERROR_MESSAGE: 'Segments update failed';
        SEGMENTS_UNAVAILABLE_ERROR_MESSAGE: 'no segments are available yet';
        SEGMENT_BASE_LOADER_ERROR_MESSAGE: 'error loading segment ranges from sidx';
        TIME_SYNC_FAILED_ERROR_MESSAGE: 'Failed to synchronize client and server time';
        FRAGMENT_LOADER_NULL_REQUEST_ERROR_MESSAGE: 'request is null';
        URL_RESOLUTION_FAILED_GENERIC_ERROR_MESSAGE: 'Failed to resolve a valid URL';
        APPEND_ERROR_MESSAGE: 'chunk is not defined';
        REMOVE_ERROR_MESSAGE: 'Removing data from the SourceBuffer';
        DATA_UPDATE_FAILED_ERROR_MESSAGE: 'Data update failed';
        CAPABILITY_MEDIASOURCE_ERROR_MESSAGE: 'mediasource is not supported';
        CAPABILITY_MEDIAKEYS_ERROR_MESSAGE: 'mediakeys is not supported';
        TIMED_TEXT_ERROR_MESSAGE_PARSE: 'parsing error :';
        MEDIASOURCE_TYPE_UNSUPPORTED_MESSAGE: 'Error creating source buffer of type : ';
        NO_SUPPORTED_KEY_IDS_MESSAGE: 'All possible Adaptation Sets have an invalid key status';
    }

    class ErrorsBase {
        extend(errors: any, config: any): void;
    }

    /**
     * Core - Events
     */

    class CoreEvents extends EventsBase {
        ATTEMPT_BACKGROUND_SYNC: 'attemptBackgroundSync';
        BUFFERING_COMPLETED: 'bufferingCompleted';
        BUFFER_CLEARED: 'bufferCleared';
        BYTES_APPENDED_END_FRAGMENT: 'bytesAppendedEndFragment';
        BUFFER_REPLACEMENT_STARTED: 'bufferReplacementStarted';
        CHECK_FOR_EXISTENCE_COMPLETED: 'checkForExistenceCompleted';
        CMSD_STATIC_HEADER: 'cmsdStaticHeader';
        CURRENT_TRACK_CHANGED: 'currentTrackChanged';
        DATA_UPDATE_COMPLETED: 'dataUpdateCompleted';
        INBAND_EVENTS: 'inbandEvents';
        INITIAL_STREAM_SWITCH: 'initialStreamSwitch';
        INIT_FRAGMENT_LOADED: 'initFragmentLoaded';
        INIT_FRAGMENT_NEEDED: 'initFragmentNeeded';
        INTERNAL_MANIFEST_LOADED: 'internalManifestLoaded';
        ORIGINAL_MANIFEST_LOADED: 'originalManifestLoaded';
        LOADING_COMPLETED: 'loadingCompleted';
        LOADING_PROGRESS: 'loadingProgress';
        LOADING_DATA_PROGRESS: 'loadingDataProgress';
        LOADING_ABANDONED: 'loadingAborted';
        MANIFEST_UPDATED: 'manifestUpdated';
        MEDIA_FRAGMENT_LOADED: 'mediaFragmentLoaded';
        MEDIA_FRAGMENT_NEEDED: 'mediaFragmentNeeded';
        MEDIAINFO_UPDATED: 'mediaInfoUpdated';
        QUOTA_EXCEEDED: 'quotaExceeded';
        SEGMENT_LOCATION_BLACKLIST_ADD: 'segmentLocationBlacklistAdd';
        SEGMENT_LOCATION_BLACKLIST_CHANGED: 'segmentLocationBlacklistChanged';
        SERVICE_LOCATION_BASE_URL_BLACKLIST_ADD: 'serviceLocationBlacklistAdd';
        SERVICE_LOCATION_BASE_URL_BLACKLIST_CHANGED: 'serviceLocationBlacklistChanged';
        SERVICE_LOCATION_LOCATION_BLACKLIST_ADD: 'serviceLocationLocationBlacklistAdd';
        SERVICE_LOCATION_LOCATION_BLACKLIST_CHANGED: 'serviceLocationLocationBlacklistChanged';
        SET_FRAGMENTED_TEXT_AFTER_DISABLED: 'setFragmentedTextAfterDisabled';
        SET_NON_FRAGMENTED_TEXT: 'setNonFragmentedText';
        SOURCE_BUFFER_ERROR: 'sourceBufferError';
        STREAMS_COMPOSED: 'streamsComposed';
        STREAM_BUFFERING_COMPLETED: 'streamBufferingCompleted';
        STREAM_REQUESTING_COMPLETED: 'streamRequestingCompleted';
        TEXT_TRACKS_QUEUE_INITIALIZED: 'textTracksQueueInitialized';
        TIME_SYNCHRONIZATION_COMPLETED: 'timeSynchronizationComplete';
        UPDATE_TIME_SYNC_OFFSET: 'updateTimeSyncOffset';
        URL_RESOLUTION_FAILED: 'urlResolutionFailed';
        VIDEO_CHUNK_RECEIVED: 'videoChunkReceived';
        WALLCLOCK_TIME_UPDATED: 'wallclockTimeUpdated';
        XLINK_ELEMENT_LOADED: 'xlinkElementLoaded';
        XLINK_READY: 'xlinkReady';
        SEEK_TARGET: 'seekTarget';
        SETTING_UPDATED_LIVE_DELAY: 'settingUpdatedLiveDelay';
        SETTING_UPDATED_LIVE_DELAY_FRAGMENT_COUNT: 'settingUpdatedLiveDelayFragmentCount';
        SETTING_UPDATED_CATCHUP_ENABLED: 'settingUpdatedCatchupEnabled';
        SETTING_UPDATED_PLAYBACK_RATE_MIN: 'settingUpdatedPlaybackRateMin';
        SETTING_UPDATED_PLAYBACK_RATE_MAX: 'settingUpdatedPlaybackRateMax';
        SETTING_UPDATED_ABR_ACTIVE_RULES: 'settingUpdatedAbrActiveRules';
        SETTING_UPDATED_MAX_BITRATE: 'settingUpdatedMaxBitrate';
        SETTING_UPDATED_MIN_BITRATE: 'settingUpdatedMinBitrate';
    }

    class Events extends CoreEvents {

    }

    class EventsBase {
        extend(events: any, config: any): void;
    }

    /**
     * Core
     */

    interface Debug {
        getLogger(): Logger;

        setLogTimestampVisible(flag: boolean): void;

        setCalleeNameVisible(flag: boolean): void;
    }

    namespace Debug {
        const LOG_LEVEL_NONE = 0;
        const LOG_LEVEL_FATAL = 1;
        const LOG_LEVEL_ERROR = 2;
        const LOG_LEVEL_WARNING = 3;
        const LOG_LEVEL_INFO = 4;
        const LOG_LEVEL_DEBUG = 5;
    }

    interface EventBus {
        on(type: string, listener: any, scope: any, options?: object): void;

        off(type: string, listener: any, scope: any): void;

        trigger(type: string, payload?: object, filters?: object): void;

        reset(): void;
    }

    export interface FactoryMaker {
        extend(name: string, childInstance: object, override: boolean, context: object): void;

        getSingletonInstance(context: object, className: string): any,

        setSingletonInstance(context: object, className: string, instance: object): void;

        deleteSingletonInstances(context: object): void;

        getFactoryByName(name: string, factoriesArray: Factory[]): Factory;

        updateFactory(name: string, factoriesArray: Factory[]): void;

        getSingletonFactory(classConstructor: ClassConstructor): SingletonFactory,

        getSingletonFactoryByName(name: string): SingletonFactory;

        updateSingletonFactory(name: string, factory: SingletonFactory): void;

        getClassFactory(classConstructor: ClassConstructor): Factory;

        getClassFactoryByName(name: string): Factory;

        updateClassFactory(name: string, factory: Factory): void;
    }

    interface Logger {
        debug(...params: any[]): void;

        info(...params: any[]): void;

        warn(...params: any[]): void;

        error(...params: any[]): void;

        fatal(...params: any[]): void;
    }

    export function Version(): string;

    const enum LogLevel {
        LOG_LEVEL_NONE = 0,
        LOG_LEVEL_FATAL = 1,
        LOG_LEVEL_ERROR = 2,
        LOG_LEVEL_WARNING = 3,
        LOG_LEVEL_INFO = 4,
        LOG_LEVEL_DEBUG = 5
    }

    /**
     * Dash - Controllers
     **/

    export interface ContentSteeringController {
        reset(): void;

        setConfig(config: object): void;

        loadSteeringData(): Promise<any>;

        getCurrentSteeringResponseData(): ContentSteeringResponse;

        shouldQueryBeforeStart(): boolean;

        getSteeringDataFromManifest(): ContentSteering[];

        stopSteeringRequestTimer(): void;

        getSynthesizedBaseUrlElements(referenceElements: BaseURL[]): BaseURL[];

        getSynthesizedLocationElements(referenceElements: MpdLocation[]): MpdLocation;

        initialize(): void
    }

    export interface RepresentationController {
        getStreamId(): string;

        getType(): string;

        getDate(): AdaptationSet;

        isUpdating(): boolean;

        updateData(newRealAdaptation: object, availableRepresentations: object[], type: string, isFragmented: boolean, quality: number): any;

        //Promise.all(iterable) can be solved promise, asynchronous promise, pending promise

        getCurrentRepresentation(): object;

        getCurrentRepresentation(): Representation;

        getRepresentationForQuality(quality: number): object | null;

        prepareQualityChange(newQuality: number): void;

        reset(): void;
    }

    export interface SegmentBaseController {
        initialize(): void;

        getSegmentBaseInitSegment(data: any): Promise<any>;

        getSegmentList(e: object): Promise<any>;

        reset(): void;
    }

    export interface SegmentsController {
        initialize(isDynamic: boolean): void;

        updateInitData(voRepresentation: Representation, hasInitialization: boolean): Promise<any>;

        updateSegmentData(voRepresentation: Representation, hasSegments: boolean): Promise<any>;

        getSegmentByIndex(representation: Representation, index: number, lastSegmentTime: number): any;

        getSegmentByTime(representation: Representation, time: number): any;

        getMediaFinishedInformation(representation: Representation): any;
    }

    /**
     * Dash - Models
     **/

    export interface DashManifestModel {
        getAccessibilityForAdaptation(adaptation: object): DescriptorType[];

        getAdaptationForId(id: string, manifest: object, periodIndex: number): any;

        getAdaptationForIndex(index: number, manifest: object, periodIndex: number): any;

        getAdaptationsForPeriod(voPeriod: Period): AdaptationSet[];

        getAdaptationsForType(manifest: object, periodIndex: number, type: string): any[];

        getAudioChannelConfigurationForAdaptation(adaptation: object): DescriptorType[];

        getAudioChannelConfigurationForRepresentation(adaptation: object): DescriptorType[];

        getAvailabilityStartTime(mpd: Mpd): any;

        getBandwidth(representation: object): number;

        getBaseURLsFromElement(node: object): BaseURL[];

        getBitrateListForAdaptation(realAdaptation: object): {
            bandwidth: number,
            width: number,
            height: number,
            scanType: string | null,
            id: string | null
        };

        getCodec(adaptation: object, representationIndex: number, addResolutionInfo: boolean): string;

        getContentProtectionByAdaptation(adaptation: object): any;

        getContentProtectionByManifest(manifest: object): any[];

        getContentProtectionByPeriod(period: Period): any;

        getContentSteering(manifest: object): ContentSteering | undefined;

        getDuration(manifest: object): number;

        getEndTimeForLastPeriod(voPeriod: Period): number;

        getEssentialPropertiesForRepresentation(realRepresentation: object): { schemeIdUri: string, value: string }

        getEventStreamForAdaptationSet(manifest: object, adaptation: object): EventStream[];

        getEventStreamForRepresentation(manifest: object, representation: Representation): EventStream[];

        getEventStreams(inbandStreams: EventStream[], representation: Representation): EventStream[];

        getEventsForPeriod(period: Period): any[];

        getId(manifest: object): string;

        getIndexForAdaptation(realAdaptation: object, manifest: object, periodIndex: number): number;

        getIsAudio(adaptation: object): boolean;

        getIsDynamic(manifest: object): boolean;

        getIsFragmented(adaptation: object): boolean;

        getIsImage(adaptation: object): boolean;

        getIsMuxed(adaptation: object): boolean;

        getIsText(adaptation: object): boolean;

        getIsTypeOf(adaptation: object, type: string): boolean;

        getIsVideo(adaptation: object): boolean;

        getKID(adaptation: object): any;

        getLabelsForAdaptation(adaptation: object): any[];

        getLanguageForAdaptation(adaptation: object): string;

        getLoction(manifest: object): MpdLocation | [];

        getManifestUpdatePeriod(manifest: object, latencyOfLastUpdate?: number): number;

        getMimeType(adaptation: object): object;

        getMpd(manifest: object): Mpd;

        getPeriodId(realPeriod: Period, i: number): string;

        getProducerReferenceTimesForAdaptation(adaptation: object): any[];

        getPublishTime(manifest: object): Date | null;

        getRealAdaptationFor(voAdaptation: object): object;

        getRealAdaptations(manifest: object, periodIndex: number): any[];

        getRealPeriodForIndex(index: number, manifest: object): any;

        getRealPeriods(manifest: object): any[];

        getRegularPeriods(mpd: Mpd): Period[];

        getRepresentationCount(adaptation: object): number;

        getRepresentationFor(index: number, adaptation: object): object;

        getRepresentationSortFunction(): (a: object, b: object) => number;

        getRepresentationsForAdaptation(voAdaptation: object): object[];

        getRolesForAdaptation(adaptation: object): DescriptorType[];

        getSegmentAlignment(adaptation: object): boolean;

        getSelectionPriority(realAdaptation: object): number;

        getServiceDescriptions(manifest: object): serviceDescriptions;

        getSubSegmentAlignment(adaptation: object): boolean;

        getSuggestedPresentationDelay(mpd: Mpd): any;

        getSupplementalPropertiesForAdaptation(adaptation: object): DescriptorType | [];

        getSupplementalPropertiesForRepresentation(representation: Representation): DescriptorType | [];

        getUTCTimingSources(manifest: object): any[];

        getViewpointForAdaptation(adaptation: object): DescriptorType[];

        hasProfile(manifest: object, profile: object): boolean;

        isPeriodEncrypted(period: any): boolean;

        processAdaptation(realAdaptation: object): object;

        setConfig(config: any): void;
    }

    export interface PatchManifestModel {
        getIsPatch(patch: object): boolean;

        getPublishTime(patch: object): number | null;

        getOriginalPublishTime(patch: object): number | null;

        getMpdId(patch: object): string | null;

        getPatchOperations(patch: object): PatchOperation | [];
    }

    /**
     * Dash - Parser - Maps
     **/

    export class CommonProperty {
        constructor(name: string);
    }

    export class MapNode {
        constructor(name: string, properties: object, children: object);
    }

    export class RepresentationBaseValuesMap extends MapNode {

    }

    export class SegmentsValuesMap extends MapNode {

    }

    /**
     * Dash - Parser - Matchers
     **/

    export class BaseMatcher {
        constructor(test: any, covnerter: any);
    }

    export class DateTimeMatcher extends BaseMatcher {

    }

    export class DurationMatcher extends BaseMatcher {

    }

    export class LangMatcher extends BaseMatcher {

    }

    export class NumericMatcher extends BaseMatcher {

    }

    /**
     * Dash - Parser
     **/

    export interface DashParser {
        getIron(): any;

        parse(data: any): any;

        parseXml(data: any): any;
    }

    export interface objectiron {
        run(source: string): void;
    }

    /**
     * Dash - Utils
     **/

    export interface ListSegmentsGetter {
        getMediaFinishedInformation(representation: Representation): MediaFinishedInformation;

        getSegmentByIndex(representation: Representation, index: number): any;

        getSegmentByTime(representation: Representation, requestedTime: number): any;
    }

    export interface Round10 {
        round10(value: number, exp: number): number;
    }

    export interface SegmentBaseGetter {
        getMediaFinishedInformation(representation: Representation): MediaFinishedInformation;

        getSegmentByIndex(representation: Representation, index: number): any;

        getSegmentByTime(representation: Representation, requestedTime: number): any;
    }

    export interface TemplateSegmentsGetter {
        getMediaFinishedInformation(representation: Representation): MediaFinishedInformation;

        getSegmentByIndex(representation: Representation, index: number): any;

        getSegmentByTime(representation: Representation, requestedTime: number): any;
    }

    export interface TimelineConverter {
        initialize(): void;

        getClientTimeOffset(): number;

        setClientTimeOffset(): number;

        getClientReferenceTime(): number;

        calcAvailabilityStartTimeFromPresentationTime(presentationEndTime: number, representation: Representation, isDynamic: boolean): number;

        calcAvailabilityEndTimeFromPresentationTime(presentationEndTime: number, representation: Representation, isDynamic: boolean, trueBool?: boolean): number;

        calcPresentationTimeFromWallTime(wallTime: number, period: Period): number;

        calcPresentationTimeFromMediaTime(mediaTime: number, representation: Representation): number;

        calcMediaTimeFromPresentationTime(presentationTime: number, representation: Representation): number;

        calcWallTimeForSegment(segment: any, isDynamic: boolean): number;

        calcTimeShiftBufferWindow(streams: any[], isDynamic: boolean): object;

        calcPeriodRelativeTimeFromMpdRelativeTime(representation: Representation, mpdRelativeTime: number): number;

        reset(): void;
    }

    export interface TimelineSegmentsGetter {
        getSegmentByIndex(representation: Representation, index: number, lastSegmentTime: number): Segment | null;

        getSegmentByTime(representation: Representation, requestedTime: number): Segment | null;

        getMediaFinishedInformation(representation: Representation): number | object;
    }

    /**
     * Dash - Vo
     **/

    export class AdaptationSet {
        period: Period | null;
        index: number;
        type: string | null;
    }

    export interface ThroughputDictEntry {

        downloadTimeInMs: number;

        downloadedBytes: number;

        latencyInMs: number;

        serviceLocation: string;

        value: number;
    }

    export interface ThroughputEwmaDictEntry {

        fastEstimate: number;

        slowEstimate: number;

        totalWeight: number;
    }

    export interface BaseURL {
        url: string;
        serviceLocation: string;
        dvbPriority: number;
        dvbWeight: number;
        availabilityTimeOffset: number;
        availabilityTimeComplete: boolean;
        queryParams: object;
    }

    export interface ClientDataReporting {
        cmcdParameters: CMCDParameters;
        serviceLocations: any;
        serviceLocationsArray: Array<any>;
        adaptationSets: AdaptationSet;
        adaptationSetsArray: Array<AdaptationSet>;
    }

    export class CMCDParameters extends DescriptorType {
        version: number;
        sessionID: string;
        contentID: string;
        mode: string;
        keys: Array<string>;
        schemeIdUri: string;
    }

    export class ContentProtection extends DescriptorType {
        ref: any;
        refId: any;
        robustness: any;
        keyId: any;
        cencDefaultKid: any;
        pssh: any;
        pro: any;
        laUrl: string;

        init(data: any): void;

        mergeAttributesFromReference(reference: any): any;
    }

    export class ContentSteering {
        defaultServiceLocation: string;
        defaultServiceLocationArray: string[];
        queryBeforeStart: boolean;
        serverUrl: string;
        clientRequirement: boolean;
    }

    export class ContentSteeringRequest {
        constructor(url: any);

        url: string;
    }

    export class ContentSteeringResponse {
        version: number;
        ttl: number;
        reloadUri: string;
        pathwayPriority: string[];
        pathwayClones: object[];
    }

    export class DescriptorType {
        schemeIdUri: string;
        value: string;
        id: string;
        dvbUrl?: string;
        dvbMimeType?: string;
        dvbFontFamily?: string;
    }

    export interface Event {
        type: string;
        duration: number;
        presentationTime: number;
        id: number;
        messageData: string;
        eventStream: EventStream;
        presentationTimeDelta: number;
        parsedMessageData: any;
    }

    export interface EventStream {
        adaptationSet: AdaptationSet | null;
        representation: Representation | null;
        period: Period | null;
        timescale: number;
        value: string;
        schemeIdUri: string;
        presentationTimeOffset: number;
    }

    export interface IManifestInfo {
        dvrWindowSize: number;
        availableFrom: Date;
        duration: number;
        isDynamic: boolean;
        loadedTime: Date;
        maxFragmentDuration: number;
        minBufferTime: number;
        serviceDescriptions: serviceDescriptions[]
        protocol?: string;
    }

    export class MediaInfo {
        id: string | null;
        index: number | null;
        type: MediaType | null;
        streamInfo: StreamInfo | null;
        representationCount: number;
        labels: { text: string, lang?: string }[];
        lang: string | null;
        viewpoint: DescriptorType[] | null;
        accessibility: DescriptorType[] | null;
        audioChannelConfiguration: DescriptorType[] | null;
        roles: DescriptorType[] | null;
        codec: string | null;
        mimeType: string | null;
        contentProtection: any | null;
        isText: boolean;
        KID: any | null;
        bitrateList: Bitrate[];
        isFragmented: any | null;
        isEmbedded: any | null;
        selectionPriority: number;
        supplementalProperties: object;
        essentialProperties: object;
        segmentAlignment: boolean;
        subSegmentAlignment: boolean;
    }

    export interface Mpd {
        manifest: object;
        suggestedPresentationDelay: number;
        availabiliyStartTime: number | null;
        availabilityEndTime: number;
        timeShiftBufferDepth: number;
        maxSegmentDuration: number;
        publishTime: number | null;
        minimumUpdatePeriod: number;
        mediaPresentationDuration: number;
    }

    export class MpdLocation {
        constructor(url: string, serviceLocation: string | null);

        url: string;
        serviceLocation: string | null;
        queryParams: object;
    }

    export class PatchLocation {
        constructor(url: string, serviceLocation: string, ttl: number);

        url: string;
        serviceLocation: string;
        ttl: number;
        queryParams: object;
    }

    export class PatchOperation {
        constructor(action: any, xpath: any, value: string);

        action: any;
        xpath: any;
        value: string;
        position: any | null;

        getMpdTarget(root: any): any;
    }

    export interface Period {
        id: string | null;
        index: number;
        duration: number;
        start: number;
        mpd: Mpd;
        nextPeriodId: string | null;
        isEncrypted: boolean;
    }

    export interface ProducerReferenceTime {
        id: any;
        inband: boolean;
        type: 'encoder';
        applicationSchme: any;
        wallClockTime: any;
        presentationTime: number;
        UTCTiming: any;

    }

    export interface Representation {
        absoluteIndex: number;
        adaptation: AdaptationSet | null;
        availabilityTimeComplete: boolean;
        availabilityTimeOffset: number;
        availableSegmentsNumber: number;
        bandwidth: number;
        bitrateInKbit: number;
        bitsPerPixel: number;
        codecPrivateData: string | null;
        codecs: string | null;
        fragmentDuration: number | null;
        frameRate: number;
        height: number;
        id: string;
        index: number;
        indexRange: string | null;
        initialization: object | null;
        maxPlayoutRate: number;
        mediaFinishedInformation: MediaFinishedInformation;
        mediaInfo: MediaInfo | null;
        mimeType: string | null;
        mseTimeOffset: number;
        pixelsPerSecond: number;
        presentationTimeOffset: number;
        qualityRanking: number;
        range: Range | null;
        scanType: string;
        segments: any[];
        segmentDuration: number;
        segmentInfoType: string | null;
        supplementalProperties: Array<any>;
        startNumber: number;
        timescale: number;
        width: number;
    }

    export interface Segment {
        indexRange: any;
        index: number | null;
        mediaRange: any;
        media: any;
        duration: number;
        replacementTime: number;
        replacementNumber: number;
        mediaStartTime: number;
        presentationStartTime: number;
        availabilityStartTime: number;
        availabilityEndTime: number;
        wallStartTime: number;
        representation: Representation | null;
    }

    export class SimpleXPath {
        constructor(selector: any);
    }

    export class StreamInfo {
        id: string;
        index: number;
        start: number;
        duration: number;
        manifestInfo: IManifestInfo;
        isLast: boolean;
        isEncrypted: boolean;
    }

    export class UTCTiming {
        schemeIdUri: string;
        value: string;
    }

    /**
     * Dash
     **/

    export interface DashAdapter {
        getMediaInfoForType(streamInfo: object, type: MediaType): MediaInfo | null;

        getIsMain(adaptation: object): boolean;

        getAdaptationForType(periodIndex: number, type: MediaType, streamInfo: object): object | null;

        areMediaInfosEqual(mInfoOne: MediaInfo, mInfoTwo: MediaInfo): boolean;

        getAllMediaInfoForType(streamInfo: object, type: MediaType, externalManifest?: object | null): any[];

        getStreamsInfo(externalManifest: object, maxStreamsInfo: number): Array<any>;

        getRealAdaptation(streamInfo: StreamInfo, mediaInfo: MediaInfo): object;

        getProducerReferenceTime(streamInfo: StreamInfo, mediaInfo: MediaInfo): object | [];

        getEssentialPropertiesAdaptationSet(adaptationSet: AdaptationSet): object | [];

        getEssentialPropertiesForRepresentation(representation: Representation): any[];

        getSupplementalCodex(representation: Representation): Array<any>;

        getRealPeriodByIndex(index: number): object;

        getVoRepresentation(mediaInfo: MediaInfo): Representation[];

        getEvent(eventBox: object, eventStreams: object, mediaStartTime: number, voRepresentation: object): null | Event;

        getEventsFor(info: object, voRepresentation: object): Array<Event>;

        getIsTextTrack(adaptation: object): boolean;

        getUTCTimingSources(): any[];

        getSuggestedPresentationDelay(): string;

        getAvailabilityStartTime(externalManifest?: object): number;

        getIsDynamic(externalManifest?: object): boolean;

        getDuration(externalManifest?: object): number;

        getRegularPeriods(externalManifest?: object): any[];

        getMpd(externalManifest?: object): Mpd;

        getContentSteering(manifest: object): object;

        getLocation(manifest: object): MpdLocation[];

        getManifestUpdatePeriod(manifest: object, latencyOfLastUpdate?: number): number;

        getPublishTime(manifest: object): number | null;

        getPatchLocation(manifest: object): PatchLocation[];

        getIsDVB(manifest: object): boolean;

        getIsPatch(manifest: object): boolean;

        getBaseURLsFromElement(node: object): BaseURL[];

        getRepresentationSortFunction(): (a: object, b: object) => number;

        getCodec(adaptation: object, representationIndex: number, addResolutionInfo: boolean): string;

        getBandwidthForRepresentation(representationId: string, periodIdx: number): number;

        getIndexForRepresentation(representationId: string, periodIdx: number): number;

        getPeriodbyId(id: string): object | null;

        getIsTypeOf(adaptation: object, type: string): boolean;

        reset(): void;

        isPatchValid(manifest: object, patch: object): boolean;

        applyPatchToManifest(manifest: object, patch: object): void;
    }

    export interface DashHandler {
        getCurrentIndex(): number;

        getInitRequest(mediaInfo: MediaInfo, representation: Representation): FragmentRequest | null;

        getNextSegmentRequest(mediaInfo: MediaInfo, representation: Representation): FragmentRequest | null;

        getNextSegmentRequestIdempotent(mediaInfo: MediaInfo, representation: Representation): FragmentRequest | null;

        getSegmentRequestForTime(mediaInfo: MediaInfo, representation: Representation, time: number): FragmentRequest | null;

        getStreamId(): string;

        getStreamInfo(): StreamInfo;

        getType(): string;

        getValidTimeAheadOfTargetTime(time: number, mediaInfo: MediaInfo, representation: Representation, targetThreshold: number): number;

        initialize(isDynamic: boolean): void;

        isLastSegmentRequested(representation: Representation, bufferingTime: number): boolean;

        repeatSegmentRequest(mediaInfo: MediaInfo, representation: Representation): FragmentRequest | null;

        reset(): void;
    }

    export interface DashMetrics {
        getCurrentRepresentationSwitch(type: MediaType): ICurrentRepresentationSwitch;

        addRepresentationSwitch(mediaType: MediaType, t: Date, mt: Date, to: string, lto: string): void;

        getCurrentBufferState(type: MediaType): IBufferState;

        getCurrentBufferLevel(type: MediaType): number;

        addBufferLevel(mediaType: MediaType, t: number, level: number): void;

        addBufferState(mediaType: MediaType, state: string, target: number): void;

        clearAllCurrentMetrics(): void;

        getCurrentHttpRequest(type: MediaType): object;

        getHttpRequests(type: MediaType): object[];

        addRequestsQueue(mediaType: MediaType, loadingRequests: any[], executedRequests: any[]): void;

        getCurrent(metrics: MetricsList, metricName: string): DroppedFrames;

        getCurrentDroppedFrames(): DroppedFrames;

        addDroppedFrames(quality: number): void;

        getCurrentSchedulingInfo(type: MediaType): object;

        addSchedulingInfo(request: SchedulingInfo, state: string): void;

        getCurrentManifestUpdate(): any;

        updateManifestUpdateInfo(updateFields: any[]): void;

        addManifestUpdateStreamInfo(streamInfo: StreamInfo): void;

        addManifestUpdate(request: ManifestUpdate): void;

        addHttpRequest(request: HTTPRequest, responseURL: string, responseStatus: number, responseHeaders: object, traces: object): void;

        addManifestUpdateRepresentationInfo(representation: Representation, mediaType: MediaType): void;

        getCurrentDVRInfo(type?: MediaType): DVRInfo;

        addDVRInfo(mediaType: MediaType, currentTime: Date, mpd: Mpd, range: Range): void;

        getLatestMPDRequestHeaderValueByID(type: MediaType, id: string): string;

        getLatestFragmentRequestHeaderValueByID(id: string): string;

        addPlayList(): void;

        createPlaylistMetrics(mediaStartTime: number, startReason: string): void;

        createPlaylistTraceMetrics(representationId: number, mediaStartTime: number, speed: number): void;

        updatePlayListTraceMetrics(traceToUpdate: object): void;

        pushPlaylistTraceMetrics(endTime: number, reason: string): void;

        addDVBErrors(errors: object): void;
    }

    export interface SegmentBaseLoader {
        initialize(): void;

        setConfig(config: object): void;

        loadInitialization(representation: Representation, mediaType: MediaType): Promise<any>;

        loadSegments(representation: Representation, mediaType: MediaType, range: Range): Promise<any>;

        reset(): any;
    }

    export interface WebSegmentBaseLoader {
        initialize(): void;

        setConfig(config: object): void;

        loadInitialization(representation: Representation, mediaType: MediaType): Promise<any>;

        loadSegments(representation: Representation, mediaType: MediaType, range: Range): Promise<any>;

        reset(): any;
    }

    /**
     * MSS - Errors
     **/

    export interface MssError extends ErrorsBase {
        /**
         * Error code returned when no tfrf box is detected in MSS live stream
         */
        MSS_NO_TFRF_CODE: 200;

        /**
         * Error code returned when one of the codecs defined in the manifest is not supported
         */
        MSS_UNSUPPORTED_CODEC_CODE: 201;

        MSS_NO_TFRF_MESSAGE: 'Missing tfrf in live media segment';
        MSS_UNSUPPORTED_CODEC_MESSAGE: 'Unsupported codec';
    }

    /**
     * MSS - Parser
     **/

    export interface MssParser {
        setup(): void;

        getAttributeAsBoolean(node: object, attrName: string): boolean;

        // mapPeriod(smoothStreamingMedia: HTMLElement, timescale: number): Period;

        // mapAdaptationSet(streamIndex: HTMLElement, timescale: number): AdaptationSet;

        // mapRepresentation(qualityLevel: HTMLElement, streamIndex: HTMLElement): Representation;

        parse(data: any): object;

        getMatchers(): null; //Entire function consists of "return null"

        getIron(): null;

        reset(): void;
    }

    /**
     * MSS
     **/

    export interface MssFragmentInfoController {
        initialize(): void;

        controllerType: 'MssFragmentInfoController';

        start(): void;

        reset(): void; //Calls stop()

        fragmentInfoLoaded(e: object): void;

        getType(): string;
    }

    export interface MssFragmentMoofProcessor {
        convertFragment(e: object, streamProcessor: any): void;

        updateSegmentList(e: object, streamProcessor: any): void;

        getType(): string;
    }

    export interface MssFragmentMoovProcessor {
        generateMoov(rep: Representation): ArrayBuffer;
    }

    export interface MssFragmentProcessor {
        generateMoov(rep: Representation): ArrayBuffer;

        processFragment(e: object, streamProcessor: any): void;
    }

    export interface MssHandler {
        reset(): void;

        createMssParser(): void;

        createMssFragmentProcessor(): void;

        registerEvents(): void;
    }

    /**
     * Offline - Constants
     **/

    class OfflineConstants {
        OFFLINE_SCHEME: 'offline_indexeddb';
        OFFLINE_URL_REGEX: RegExp;
        OFFLINE_STATUS_CREATED: 'created';
        OFFLINE_STATUS_STARTED: 'started';
        OFFLINE_STATUS_STOPPED: 'stopped';
        OFFLINE_STATUS_FINISHED: 'finished';
        OFFLINE_STATUS_ERROR: 'error';
    }

    /**
     * Offline - Controllers
     */

    export interface OfflineRecord {
        id: string;
        progress: number;
        url: string;
        originalUrl: string;
        status: string;
    }

    interface OfflineController {
        // // Download List Functions
        // getDownloadFromId(id: string): object;

        // createDownloadFromId(id: string): object;

        // createDownloadFromStorage(offline: any): object;

        // removeDownloadFromId(id: string): void;

        // generateManifestId(): number;

        // OfflineControllerAPI

        loadRecordsFromStorage(): Promise<void>;

        getAllRecords(): OfflineRecord[];

        createRecord(manifestURL: string): Promise<string>;

        startRecord(id: string, mediaInfos: MediaInfo[]): void;

        stopRecord(id: string): void;

        resumeRecord(id: string): void;

        deleteRecord(id: string): void;

        getRecordProgression(id: string): number;

        resetRecords(): void;

        reset(): void;
    }

    interface OfflineStoreController {
        createFramentStore(manifestId: number | string, storeName: string): void;

        storeFrament(manifestId: number | string, framentId: number | string, fragmentData: any): object;

        createOfflineManifest(manifest: object): object;

        updateOfflineManifest(manifest: object): object;

        getManifestById(manifestId: number | string): object;

        saveSelectedRepresentations(manifestId: number | string, selected: Representation): object;

        getCurrentHigherManifestId(): object;

        getAllManifests(): object;

        deleteDownloadById(manifestId: number | string): object;

        setDownloadingStatus(manifestId: number | string, status: any): object;

        setRepresentationCurrentState(manifestId: number | string, representationId: number | string, state: any): object;

        getRepresentationCurrentState(manifestId: number | string, representationId: number | string): object;
    }

    /**
     * Offline - Errors
     */

    export class OfflineErrors extends ErrorsBase {
        /**
         * Error code returned when an error occurs in offline module
         */
        OFFLINE_ERROR: 11000;

        // Based upon https://developer.mozilla.org/fr/docs/Web/API/DOMException
        INDEXEDDB_QUOTA_EXCEED_ERROR: 11001;
        INDEXEDDB_INVALID_STATE_ERROR: 11002;
        INDEXEDDB_NOT_READABLE_ERROR: 11003;
        INDEXEDDB_NOT_FOUND_ERROR: 11004;
        INDEXEDDB_NETWORK_ERROR: 11005;
        INDEXEDDB_DATA_ERROR: 11006;
        INDEXEDDB_TRANSACTION_INACTIVE_ERROR: 11007;
        INDEXEDDB_NOT_ALLOWED_ERROR: 11008;
        INDEXEDDB_NOT_SUPPORTED_ERROR: 11009;
        INDEXEDDB_VERSION_ERROR: 11010;
        INDEXEDDB_TIMEOUT_ERROR: 11011;
        INDEXEDDB_ABORT_ERROR: 11012;
        INDEXEDDB_UNKNOWN_ERROR: 11013;
    }

    export class OfflineEvents extends EventsBase {
        /**
         * Triggered when all mediaInfo has been loaded
         * @event OfflineEvents#OFFLINE_RECORD_LOADEDMETADATA
         */
        OFFLINE_RECORD_LOADEDMETADATA: 'public_offlineRecordLoadedmetadata';

        /**
         * Triggered when a record is initialized and download is started
         * @event OfflineEvents#OFFLINE_RECORD_STARTED
         */
        OFFLINE_RECORD_STARTED: 'public_offlineRecordStarted';

        /**
         * Triggered when the user stop downloading a record
         * @event OfflineEvents#OFFLINE_RECORD_STOPPED
         */
        OFFLINE_RECORD_STOPPED: 'public_offlineRecordStopped';

        /**
         * Triggered when all record has been downloaded
         * @event OfflineEvents#OFFLINE_RECORD_FINISHED
         */
        OFFLINE_RECORD_FINISHED: 'public_offlineRecordFinished';
    }

    /**
     * Offline - Net
     */

    export class IndexDBOfflineLoader {
        config: object | {};

        load(config: object | {}): void;

        abort(): void;
    }

    /**
     * Offline - Storage
     */

    export class IndexDBStore {
        createFragmentStore(storeName: string): void;

        setDownloadingStatus(manifestId: number, newStatus: number): Promise<string | Error>;

        setRepresentationCurrentState(manifestId: number, representationId: string, state: number): Promise<string | Error>;

        getRepresentationCurrentState(manifestId: number, state: number): Promise<number | Error>;

        getFragmentByKey(manifestId: number, key: number): Promise<any>;

        getManifestById(id: number): Promise<Object[] | String | Error>;

        getAllManifests(): Promise<Object[] | String | Error>;

        getCurrentHigherManifestId(): Promise<number>;

        updateManifest(manifest: object): Promise<Object[] | Error>;

        saveSelectedRepresentation(manifest: object, selected: object): Promise<string | Error>;

        storeManifest(manifest: object): Object[];

        storeFragment(manifestI: number, fragmentId: string, fragmentData: object): Promise<string | Error>;

        dropAll(): Promise<any>;

        dropFragmentStore(storeName: string): void;

        deleteDownloadById(manifestId: number): Promise<string | any>;

        // deleteFragmentStore(storename: string): Promise<any>;
    }

    /**
     * Offline - Parser
     */

    export class OfflineIndexDBManifestParser {
        config: object;

        parse(XMLDoc: string, representation: object): Promise<any>;
    }

    export class OfflineUrlUtils {
        getRegex(): RegExp | undefined;

        removeHostName(url: string): string;

        isRelative(): boolean;

        resolve(url: string, baseUrl: string): string;
    }

    /**
     * Offline - Vo
     */

    export class OfflineDownload {
        id: object;
        url: object;
        originalUrl: object;
        status: object;
        progress: object;
    }

    /**
     * Offline
     */

    export interface OfflineDownload {
        config: object | {};

        getId(): number;

        getManifestUrl(): string;

        getStatus(): number;

        setInitialState(state: object): void;

        downloadFromUrl(url: string): object;

        initDownload(): void;

        isDownloading(): boolean;

        getMediaInfos(): void;

        startDownload(mediaInfos: MediaInfo[]): any;

        stopDownload(): void;

        resumeDownload(): void;

        deleteDownload(): void;

        getDownloadProgression(): number;

        resetDownload(): void;

        reset(): void;
    }

    export class OfflineStream {
        initialize(initStreamInfo: StreamInfo): void;

        getStreamId(): string;

        getMediaInfos(): MediaInfo[];

        initializeAllMediaInfoList(mediaInfoList: object): void;

        getStreamInfo(): StreamInfo;

        stopOfflineStreamProcessors(): void;

        startOfflineStreamProcessors(): void;

        reset(): void;
    }

    export class OfflineStreamProcessor {
        config: object | void;

        initialize(_mediaInfo: MediaInfo): void;

        getRepresentationController(): RepresentationController;

        getRepresentationId(): number | string;

        stop(): void;

        removeExecutedRequestsBeforeTime(time: any): void;

        start(): void;

        isUpdating(): boolean;

        getType(): any;

        getMediaInfo(): MediaInfo;

        getAvailableSegmentsNumber(): number;

        reset(): void;
    }

    export interface Bitrate {
        id?: string;
        width?: number;
        height?: number;
        bandwidth?: number;
        scanType?: string;
    }

    export type MediaType = 'video' | 'audio' | 'text' | 'image';
    export type ThroughputCalculationModes =
        'throughputCalculationModeEwma'
        | 'throughputCalculationModeZlema'
        | 'throughputCalculationModeArithmeticMean'
        | 'throughputCalculationModeByteSizeWeightedArithmeticMean'
        | 'throughputCalculationModeDateWeightedArithmeticMean'
        | 'throughputCalculationModeHarmonicMean'
        | 'throughputCalculationModeByteSizeWeightedHarmonicMean'
        | 'throughputCalculationModeDateWeightedHarmonicMean'
        ;
    export type LowLatencyDownloadTimeCalculationModes =
        'lowLatencyDownloadTimeCalculationModeMoofParsing'
        | 'lowLatencyDownloadTimeCalculationModeDownloadedData'
        | 'lowLatencyDownloadTimeCalculationModeAast';

    export class ProtectionMediaInfo {
        codec: string | null;
        contentProtection: any | null;
    }

    export class MediaPlayerSettingClass {
        debug?: {
            logLevel?: LogLevel;
            dispatchEvent?: boolean;
        };
        streaming?: {
            abandonLoadTimeout?: number,
            wallclockTimeUpdateInterval?: number,
            manifestUpdateRetryInterval?: number,
            liveUpdateTimeThresholdInMilliseconds?: number,
            cacheInitSegments?: boolean,
            applyServiceDescription?: boolean,
            applyProducerReferenceTime?: boolean,
            applyContentSteering?: boolean,
            eventControllerRefreshDelay?: number,
            enableManifestDurationMismatchFix?: boolean,
            parseInbandPrft?: boolean,
            enableManifestTimescaleMismatchFix?: boolean,
            capabilities?: {
                filterUnsupportedEssentialProperties?: boolean,
                supportedEssentialProperties?: [
                    { schemeIdUri?: string, value?: RegExp }
                ],
                useMediaCapabilitiesApi?: boolean,
                filterHDRMetadataFormatEssentialProperties?: boolean,
                filterVideoColometryEssentialProperties?: boolean
            },
            timeShiftBuffer?: {
                calcFromSegmentTimeline?: boolean
                fallbackToSegmentTimeline?: boolean
            },
            metrics?: {
                maxListDepth?: number
            },
            delay?: {
                liveDelayFragmentCount?: number,
                liveDelay?: number,
                useSuggestedPresentationDelay?: boolean
            },
            protection?: {
                keepProtectionMediaKeys?: boolean,
                ignoreEmeEncryptedEvent?: boolean,
                detectPlayreadyMessageFormat?: boolean,
                ignoreKeyStatuses?: boolean,
            },
            buffer?: {
                enableSeekDecorrelationFix?: boolean,
                fastSwitchEnabled?: boolean,
                flushBufferAtTrackSwitch?: boolean,
                reuseExistingSourceBuffers?: boolean,
                bufferPruningInterval?: number,
                bufferToKeep?: number,
                bufferTimeAtTopQuality?: number,
                bufferTimeAtTopQualityLongForm?: number,
                initialBufferLevel?: number,
                bufferTimeDefault?: number,
                longFormContentDurationThreshold?: number,
                stallThreshold?: number,
                useAppendWindow?: boolean,
                setStallState?: boolean
                avoidCurrentTimeRangePruning?: boolean
                useChangeType?: boolean
                mediaSourceDurationInfinity?: boolean
                resetSourceBuffersForTrackSwitch?: boolean
                syntheticStallEvents?: {
                    enabled?: boolean
                    ignoreReadyState?: boolean
                }
            },
            gaps?: {
                jumpGaps?: boolean,
                jumpLargeGaps?: boolean,
                smallGapLimit?: number,
                threshold?: number,
                enableSeekFix?: boolean,
                enableStallFix?: boolean,
                stallSeek?: number
            },
            utcSynchronization?: {
                enabled?: boolean,
                useManifestDateHeaderTimeSource?: boolean,
                backgroundAttempts?: number,
                timeBetweenSyncAttempts?: number,
                maximumTimeBetweenSyncAttempts?: number,
                minimumTimeBetweenSyncAttempts?: number,
                timeBetweenSyncAttemptsAdjustmentFactor?: number,
                maximumAllowedDrift?: number,
                enableBackgroundSyncAfterSegmentDownloadError?: boolean,
                defaultTimingSource?: {
                    scheme?: string,
                    value?: string
                }
            },
            scheduling?: {
                defaultTimeout?: number,
                lowLatencyTimeout?: number,
                scheduleWhilePaused?: boolean
            },
            text?: {
                defaultEnabled?: boolean,
                dispatchForManualRendering?: boolean,
                extendSegmentedCues?: boolean,
                imsc?: {
                    displayForcedOnlyMode?: boolean,
                    enableRollUp?: boolean
                },
                webvtt?: {
                    customRenderingEnabled?: number
                }
            },
            liveCatchup?: {
                maxDrift?: number;
                playbackRate?: {
                    min?: number,
                    max?: number
                },
                playbackBufferMin?: number,
                enabled?: boolean
                mode?: string
            }
            lastBitrateCachingInfo?: {
                enabled?: boolean;
                ttl?: number;
            };
            lastMediaSettingsCachingInfo?: {
                enabled?: boolean;
                ttl?: number;
            };
            saveLastMediaSettingsForCurrentStreamingSession?: boolean;
            cacheLoadThresholds?: {
                video?: number;
                audio?: number;
            };
            trackSwitchMode?: {
                video?: TrackSwitchMode;
                audio?: TrackSwitchMode;
            }
            selectionModeForInitialTrack?: TrackSelectionMode
            fragmentRequestTimeout?: number;
            fragmentRequestProgressTimeout?: number;
            manifestRequestTimeout?: number;
            retryIntervals?: {
                'MPD'?: number;
                'XLinkExpansion'?: number;
                'MediaSegment'?: number;
                'InitializationSegment'?: number;
                'BitstreamSwitchingSegment'?: number;
                'IndexSegment'?: number;
                'FragmentInfoSegment'?: number;
                'license'?: number;
                'other'?: number;
                'lowLatencyReductionFactor'?: number;
            };
            retryAttempts?: {
                'MPD'?: number;
                'XLinkExpansion'?: number;
                'MediaSegment'?: number;
                'InitializationSegment'?: number;
                'BitstreamSwitchingSegment'?: number;
                'IndexSegment'?: number;
                'FragmentInfoSegment'?: number;
                'license'?: number;
                'other'?: number;
                'lowLatencyMultiplyFactor'?: number;
            };
            abr?: {
                limitBitrateByPortal?: boolean;
                usePixelRatioInLimitBitrateByPortal?: boolean;
                enableSupplementalPropertyAdaptationSetSwitching?: boolean,
                rules?: {
                    throughputRule?: {
                        active?: boolean
                    },
                    bolaRule?: {
                        active?: boolean
                    },
                    insufficientBufferRule?: {
                        active?: boolean,
                        parameters?: {
                            throughputSafetyFactor?: number,
                            segmentIgnoreCount?: number
                        }
                    },
                    switchHistoryRule?: {
                        active?: boolean,
                        parameters?: {
                            sampleSize?: number,
                            switchPercentageThreshold?: number
                        }
                    },
                    droppedFramesRule?: {
                        active?: boolean,
                        parameters?: {
                            minimumSampleSize?: number,
                            droppedFramesPercentageThreshold?: number
                        }
                    },
                    abandonRequestsRule?: {
                        active?: boolean,
                        parameters?: {
                            abandonDurationMultiplier?: number,
                            minSegmentDownloadTimeThresholdInMs?: number,
                            minThroughputSamplesThreshold?: number
                        }
                    }
                    l2ARule?: {
                        active?: boolean
                    }
                    loLPRule?: {
                        active?: boolean
                    }
                },
                throughput?: {
                    averageCalculationMode?: ThroughputCalculationModes,
                    lowLatencyDownloadTimeCalculationMode?: LowLatencyDownloadTimeCalculationModes,
                    useResourceTimingApi?: boolean,
                    useNetworkInformationApi?: {
                        xhr?: boolean,
                        fetch?: boolean
                    },
                    useDeadTimeLatency?: boolean,
                    bandwidthSafetyFactor?: number,
                    sampleSettings: {
                        live?: number,
                        vod?: number,
                        enableSampleSizeAdjustment?: boolean,
                        decreaseScale?: number,
                        increaseScale?: number,
                        maxMeasurementsToKeep?: number,
                        averageLatencySampleAmount?: number,
                    },
                    ewma: {
                        throughputSlowHalfLifeSeconds?: number,
                        throughputFastHalfLifeSeconds?: number,
                        latencySlowHalfLifeCount?: number,
                        latencyFastHalfLifeCount?: number,
                        weightDownloadTmeMultiplicationFactor?: number
                    }
                }
                maxBitrate?: {
                    audio?: number;
                    video?: number;
                };
                minBitrate?: {
                    audio?: number;
                    video?: number;
                };
                initialBitrate?: {
                    audio?: number;
                    video?: number;
                };
                autoSwitchBitrate?: {
                    audio?: boolean;
                    video?: boolean;
                }
            },
            cmcd?: {
                applyParametersFromMpd?: boolean,
                enabled?: boolean,
                sid?: string | null,
                cid?: string | null,
                rtp?: number | null,
                rtpSafetyFactor?: number,
                mode?: 'query' | 'header',
                enabledKeys?: Array<string>,
                includeInRequests?: Array<string>,
                version?: number
            },
            cmsd?: {
                enabled?: boolean,
                abr?: {
                    applyMb: boolean,
                    etpWeightRatio?: number
                }
            },
            defaultSchemeIdUri?: {
                viewpoint?: string,
                audioChannelConfiguration?: string,
                role?: string,
                accessibility?: string
            }
        };
        errors?: {
            recoverAttempts?: {
                mediaErrorDecode?: number
            }
        }
    }

    export interface MediaFinishedInformation {
        numberOfSegments: number,
        mediaTimeOfLastSignaledSegment: number
    }

    export type TrackSelectionFunction = (tracks: MediaInfo[]) => MediaInfo[];

    export interface DvrWindow {
        start: number;
        end: number;
        startAsUtc: number;
        endAsUtc: number;
        size: number;
    }

    export interface MediaPlayerClass {
        setConfig(config: object): void;

        initialize(view?: HTMLMediaElement, source?: string, AutoPlay?: boolean, startTime?: number | string): void;

        on(type: AstInFutureEvent['type'], listener: (e: AstInFutureEvent) => void, scope?: object): void;

        on(type: BufferEvent['type'], listener: (e: BufferEvent) => void, scope?: object): void;

        on(type: CaptionRenderedEvent['type'], listener: (e: CaptionRenderedEvent) => void, scope?: object): void;

        on(type: CaptionContainerResizeEvent['type'], listener: (e: CaptionContainerResizeEvent) => void, scope?: object): void;

        on(type: DynamicToStaticEvent['type'], listener: (e: DynamicToStaticEvent) => void, scope?: object): void;

        on(type: ErrorEvent['type'], listener: (e: ErrorEvent) => void, scope?: object): void;

        on(type: FragmentLoadingCompletedEvent['type'], listener: (e: FragmentLoadingCompletedEvent) => void, scope?: object): void;

        on(type: FragmentLoadingAbandonedEvent['type'], listener: (e: FragmentLoadingAbandonedEvent) => void, scope?: object): void;

        on(type: InbandPrftReceivedEvent['type'], listener: (e: InbandPrftReceivedEvent) => void, scope?: object): void;

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

        on(type: OfflineRecordEvent['type'], listener: (e: OfflineRecordEvent) => void, scope?: object): void;

        on(type: OfflineRecordLoademetadataEvent['type'], listener: (e: OfflineRecordLoademetadataEvent) => void, scope?: object): void;

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

        on(type: TtmlToParseEvent['type'], listener: (e: TtmlToParseEvent) => void, scope?: object): void;

        on(type: AdaptationSetRemovedNoCapabilitiesEvent['type'], listener: (e: AdaptationSetRemovedNoCapabilitiesEvent) => void, scope?: object): void;

        on(type: string, listener: (e: MediaPlayerEvent) => void, scope?: object, options?: object): void;

        off(type: string, listener: (e: any) => void, scope?: object): void;

        extend(parentNameString: string, childInstance: object, override: boolean): void;

        attachView(element: HTMLMediaElement): void;

        attachSource(urlOrManifest: string | object, startTime?: number | string): void;

        refreshManifest(callback: (manifest: object | null, error: unknown) => void): void;

        isReady(): boolean;

        preload(): void;

        play(): void;

        isPaused(): boolean;

        pause(): void;

        isSeeking(): boolean;

        isDynamic(): boolean;

        seek(value: number): void;

        seekToPresentationTime(value: number): void;

        seekToOriginalLive(): void;

        setPlaybackRate(value: number): void;

        getPlaybackRate(): number;

        setMute(value: boolean): void;

        isMuted(): boolean;

        setVolume(value: number): void;

        getVolume(): number;

        time(periodId?: string): number;

        timeInDvrWindow(): number;

        getDvrWindow(): DvrWindow;

        duration(): number;

        timeAsUTC(): number;

        getActiveStream(): Stream | null;

        getDvrSeekOffset(value: number): number;

        getTargetLiveDelay(): number;

        convertToTimeCode(value: number): string;

        formatUTC(time: number, locales: string, hour12: boolean, withDate?: boolean): string;

        getVersion(): string;

        getDebug(): Debug;

        getBufferLength(type: MediaType): number;

        getTTMLRenderingDiv(): HTMLDivElement | null;

        getVideoElement(): HTMLVideoElement;

        getSource(): string | object;

        updateSource(urlOrManifest: string | object): void;

        getCurrentLiveLatency(): number;

        getRepresentationsByType(type: MediaType, streamId?: string | null): Representation[];

        setAutoPlay(value: boolean): void;

        getAutoPlay(): boolean;

        getDashMetrics(): DashMetrics;

        getCurrentRepresentationForType(type: MediaType): Representation | null;

        setRepresentationForTypeById(type: MediaType, id: number, forceReplace?: boolean): void;

        setRepresentationForTypeByIndex(type: MediaType, index: number, forceReplace?: boolean): void;

        enableText(enable: boolean): boolean;

        enableForcedTextStreaming(enable: boolean): boolean;

        isTextEnabled(): boolean;

        setTextTrack(idx: number): void;

        getStreamsFromManifest(manifest: object): StreamInfo[];

        getTracksFor(type: MediaType): MediaInfo[];

        getTracksForTypeFromManifest(type: MediaType, manifest: object, streamInfo: StreamInfo): MediaInfo[];

        getCurrentTrackFor(type: MediaType): MediaInfo | null;

        setInitialMediaSettingsFor(type: MediaType, value: MediaSettings): void;

        getInitialMediaSettingsFor(type: MediaType): MediaSettings;

        setCurrentTrack(track: MediaInfo, noSettingsSave?: boolean): void;

        addABRCustomRule(type: string, rulename: string, rule: object): void;

        removeABRCustomRule(rulename: string): void;

        removeAllABRCustomRule(): void;

        getAverageThroughput(type: MediaType, calculationMode?: string | null, sampleSize?: number): number;

        retrieveManifest(url: string, callback: (manifest: object | null, error: any) => void): void;

        addUTCTimingSource(schemeIdUri: string, value: string): void;

        removeUTCTimingSource(schemeIdUri: string, value: string): void;

        clearDefaultUTCTimingSources(): void;

        restoreDefaultUTCTimingSources(): void;

        setXHRWithCredentialsForType(type: string, value: boolean): void;

        getXHRWithCredentialsForType(type: string): boolean;

        getProtectionController(): ProtectionController;

        attachProtectionController(value: ProtectionController): void;

        setProtectionData(value: ProtectionDataSet): void;

        addRequestInterceptor(interceptor: RequestInterceptor): void;

        removeRequestInterceptor(interceptor: RequestInterceptor): void;

        addResponseInterceptor(interceptor: ResponseInterceptor): void;

        removeResponseInterceptor(interceptor: ResponseInterceptor): void;

        registerLicenseRequestFilter(filter: RequestFilter): void;

        registerLicenseResponseFilter(filter: ResponseFilter): void;

        unregisterLicenseRequestFilter(filter: RequestFilter): void;

        unregisterLicenseResponseFilter(filter: ResponseFilter): void;

        registerCustomCapabilitiesFilter(filter: CapabilitiesFilter): void;

        unregisterCustomCapabilitiesFilter(filter: CapabilitiesFilter): void;

        setCustomInitialTrackSelectionFunction(fn: TrackSelectionFunction): void;

        resetCustomInitialTrackSelectionFunction(fn: TrackSelectionFunction): void;

        attachTTMLRenderingDiv(div: HTMLDivElement): void;

        getCurrentTextTrackIndex(): number;

        provideThumbnail(time: number, callback: (thumbnail: Thumbnail | null) => void): void;

        getDashAdapter(): DashAdapter;

        getOfflineController(): OfflineController;

        triggerSteeringRequest(): Promise<any>;

        getCurrentSteeringResponseData(): object;

        getAvailableBaseUrls(): BaseURL[];

        getAvailableLocations(): MpdLocation[];

        getSettings(): MediaPlayerSettingClass;

        updateSettings(settings: MediaPlayerSettingClass): void;

        resetSettings(): void;

        reset(): void;

        destroy(): void;

        getManifest(): object;

    }

    interface MediaPlayerErrors {
        MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE: 10;
        MANIFEST_LOADER_LOADING_FAILURE_ERROR_CODE: 11;
        XLINK_LOADER_LOADING_FAILURE_ERROR_CODE: 12;
        SEGMENT_BASE_LOADER_ERROR_CODE: 15;
        TIME_SYNC_FAILED_ERROR_CODE: 16;
        FRAGMENT_LOADER_LOADING_FAILURE_ERROR_CODE: 17;
        FRAGMENT_LOADER_NULL_REQUEST_ERROR_CODE: 18;
        URL_RESOLUTION_FAILED_GENERIC_ERROR_CODE: 19;
        APPEND_ERROR_CODE: 20;
        REMOVE_ERROR_CODE: 21;
        DATA_UPDATE_FAILED_ERROR_CODE: 22;
        CAPABILITY_MEDIASOURCE_ERROR_CODE: 23;
        CAPABILITY_MEDIAKEYS_ERROR_CODE: 24;
        DOWNLOAD_ERROR_ID_MANIFEST_CODE: 25;
        DOWNLOAD_ERROR_ID_SIDX_CODE: 26;
        DOWNLOAD_ERROR_ID_CONTENT_CODE: 27;
        DOWNLOAD_ERROR_ID_INITIALIZATION_CODE: 28;
        DOWNLOAD_ERROR_ID_XLINK_CODE: 29;
        MANIFEST_ERROR_ID_PARSE_CODE: 31;
        MANIFEST_ERROR_ID_NOSTREAMS_CODE: 32;
        TIMED_TEXT_ERROR_ID_PARSE_CODE: 33;
        MANIFEST_ERROR_ID_MULTIPLEXED_CODE: 34;
        MEDIASOURCE_TYPE_UNSUPPORTED_CODE: 35;
        MEDIA_KEYERR_CODE: 100;
        MEDIA_KEYERR_UNKNOWN_CODE: 101;
        MEDIA_KEYERR_CLIENT_CODE: 102;
        MEDIA_KEYERR_SERVICE_CODE: 103;
        MEDIA_KEYERR_OUTPUT_CODE: 104;
        MEDIA_KEYERR_HARDWARECHANGE_CODE: 105;
        MEDIA_KEYERR_DOMAIN_CODE: 106;
        MEDIA_KEY_MESSAGE_ERROR_CODE: 107;
        MEDIA_KEY_MESSAGE_NO_CHALLENGE_ERROR_CODE: 108;
        SERVER_CERTIFICATE_UPDATED_ERROR_CODE: 109;
        KEY_STATUS_CHANGED_EXPIRED_ERROR_CODE: 110;
        MEDIA_KEY_MESSAGE_NO_LICENSE_SERVER_URL_ERROR_CODE: 111;
        KEY_SYSTEM_ACCESS_DENIED_ERROR_CODE: 112;
        KEY_SESSION_CREATED_ERROR_CODE: 113;
        MEDIA_KEY_MESSAGE_LICENSER_ERROR_CODE: 114;
        // MSS errors
        MSS_NO_TFRF_CODE: 200;
        MSS_UNSUPPORTED_CODEC_CODE: 201;
        // Offline errors
        OFFLINE_ERROR: 11000;
        INDEXEDDB_QUOTA_EXCEED_ERROR: 11001;
        INDEXEDDB_INVALID_STATE_ERROR: 11002;
        INDEXEDDB_NOT_READABLE_ERROR: 11003;
        INDEXEDDB_NOT_FOUND_ERROR: 11004;
        INDEXEDDB_NETWORK_ERROR: 11005;
        INDEXEDDB_DATA_ERROR: 11006;
        INDEXEDDB_TRANSACTION_INACTIVE_ERROR: 11007;
        INDEXEDDB_NOT_ALLOWED_ERROR: 11008;
        INDEXEDDB_NOT_SUPPORTED_ERROR: 11009;
        INDEXEDDB_VERSION_ERROR: 11010;
        INDEXEDDB_TIMEOUT_ERROR: 11011;
        INDEXEDDB_ABORT_ERROR: 11012;
        INDEXEDDB_UNKNOWN_ERROR: 11013;
    }

    interface MediaPlayerEvents {
        AST_IN_FUTURE: 'astInFuture';
        BASE_URLS_UPDATED: 'baseUrlsUpdated';
        BUFFER_EMPTY: 'bufferStalled';
        BUFFER_LOADED: 'bufferLoaded';
        BUFFER_LEVEL_STATE_CHANGED: 'bufferStateChanged';
        BUFFER_LEVEL_UPDATED: 'bufferLevelUpdated';
        CAN_PLAY: 'canPlay';
        CAN_PLAY_THROUGH: 'canPlayThrough';
        CAPTION_RENDERED: 'captionRendered';
        CAPTION_CONTAINER_RESIZE: 'captionContainerResize';
        CONFORMANCE_VIOLATION: 'conformanceViolation';
        CUE_ENTER: 'cueEnter';
        CUE_EXIT: 'cueExit';
        DVB_FONT_DOWNLOAD_ADDED: 'dvbFontDownloadAdded';
        DVB_FONT_DOWNLOAD_COMPLETE: 'dvbFontDownloadComplete';
        DVB_FONT_DOWNLOAD_FAILED: 'dvbFontDownloadFailed';
        DYNAMIC_TO_STATIC: 'dynamicToStatic';
        ERROR: 'error';
        EVENT_MODE_ON_RECEIVE: 'eventModeOnReceive';
        EVENT_MODE_ON_START: 'eventModeOnStart';
        FRAGMENT_LOADING_COMPLETED: 'fragmentLoadingCompleted';
        FRAGMENT_LOADING_PROGRESS: 'fragmentLoadingProgress';
        FRAGMENT_LOADING_STARTED: 'fragmentLoadingStarted';
        FRAGMENT_LOADING_ABANDONED: 'fragmentLoadingAbandoned';
        INBAND_PRFT_RECEIVED: 'inbandPrft';
        KEY_ADDED: 'public_keyAdded';
        KEY_ERROR: 'public_keyError';
        KEY_MESSAGE: 'public_keyMessage';
        KEY_SESSION_CLOSED: 'public_keySessionClosed';
        KEY_SESSION_CREATED: 'public_keySessionCreated';
        KEY_SESSION_REMOVED: 'public_keySessionRemoved';
        KEY_STATUSES_CHANGED: 'public_keyStatusesChanged';
        KEY_SYSTEM_SELECTED: 'public_keySystemSelected';
        KEY_SYSTEM_ACCESS_COMPLETE: 'public_keySystemAccessComplete';
        KEY_SESSION_UPDATED: 'public_keySessionUpdated';
        LICENSE_REQUEST_COMPLETE: 'public_licenseRequestComplete';
        LICENSE_REQUEST_SENDING: 'public_licenseRequestSending';
        LOG: 'log';
        MANIFEST_LOADED: 'manifestLoaded';
        MANIFEST_LOADING_STARTED: 'manifestLoadingStarted';
        MANIFEST_LOADING_FINISHED: 'manifestLoadingFinished';
        MANIFEST_VALIDITY_CHANGED: 'manifestValidityChanged';
        METRICS_CHANGED: 'metricsChanged';
        METRIC_ADDED: 'metricAdded';
        METRIC_CHANGED: 'metricChanged';
        METRIC_UPDATED: 'metricUpdated';
        OFFLINE_RECORD_FINISHED: 'public_offlineRecordFinished';
        OFFLINE_RECORD_LOADEDMETADATA: 'public_offlineRecordLoadedmetadata';
        OFFLINE_RECORD_STARTED: 'public_offlineRecordStarted';
        OFFLINE_RECORD_STOPPED: 'public_offlineRecordStopped';
        PERIOD_SWITCH_STARTED: 'periodSwitchStarted';
        PERIOD_SWITCH_COMPLETED: 'periodSwitchCompleted';
        ADAPTATION_SET_REMOVED_NO_CAPABILITIES: 'adaptationSetRemovedNoCapabilities';
        PLAYBACK_ENDED: 'playbackEnded';
        PLAYBACK_ERROR: 'playbackError';
        PLAYBACK_LOADED_DATA: 'playbackLoadedData';
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
        PLAYBACK_VOLUME_CHANGED: 'playbackVolumeChanged';
        PLAYBACK_WAITING: 'playbackWaiting';
        PROTECTION_CREATED: 'public_protectioncreated';
        PROTECTION_DESTROYED: 'public_protectiondestroyed';
        REPRESENTATION_SWITCH: 'representationSwitch';
        TRACK_CHANGE_RENDERED: 'trackChangeRendered';
        QUALITY_CHANGE_RENDERED: 'qualityChangeRendered';
        QUALITY_CHANGE_REQUESTED: 'qualityChangeRequested';
        STREAM_ACTIVATED: 'streamActivated'
        STREAM_DEACTIVATED: 'streamDeactivated';
        STREAM_INITIALIZED: 'streamInitialized';
        STREAM_INITIALIZING: 'streamInitializing';
        STREAM_TEARDOWN_COMPLETE: 'streamTeardownComplete';
        STREAM_UPDATED: 'streamUpdated';
        TEXT_TRACKS_ADDED: 'allTextTracksAdded';
        TEXT_TRACK_ADDED: 'textTrackAdded';
        THROUGHPUT_MEASUREMENT_STORED: 'throughputMeasurementStored';
        TTML_PARSED: 'ttmlParsed';
        TTML_TO_PARSE: 'ttmlToParse';
    }

    export interface MediaPlayerEvent {
        type: string

    }

    export interface AstInFutureEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['AST_IN_FUTURE'];
        delay: number;
    }

    export interface BufferEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['BUFFER_EMPTY' | 'BUFFER_LOADED'];
        mediaType: MediaType;
    }

    export interface BufferStateChangedEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['BUFFER_LEVEL_STATE_CHANGED'];
        mediaType: MediaType;
        sender: object;
        state: 'bufferStalled' | 'bufferLoaded';
        streamInfo: StreamInfo;
    }

    export interface GenericErrorEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['ERROR'];
        error: 'capability' | 'mediasource' | 'key_session' | 'key_message';
        event: string;
    }

    export interface DownloadErrorEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['ERROR'];
        error: 'download';
        event: {
            id: string;
            url: string;
            request: XMLHttpRequest;
        };
    }

    export interface ManifestErrorEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['ERROR'];
        error: 'manifestError';
        event: {
            id: string;
            message: string;
            manifest?: object;
            event?: string;
        };
    }

    export interface TimedTextErrorEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['ERROR'];
        error: 'cc';
        event: {
            id: string;
            message: string;
            cc: string;
        };
    }

    export interface MediaPlayerErrorEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['ERROR'];
        error: {
            code: MediaPlayerErrors['MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE'] |
                MediaPlayerErrors['MANIFEST_LOADER_LOADING_FAILURE_ERROR_CODE'] |
                MediaPlayerErrors['XLINK_LOADER_LOADING_FAILURE_ERROR_CODE'] |
                MediaPlayerErrors['SEGMENT_BASE_LOADER_ERROR_CODE'] |
                MediaPlayerErrors['TIME_SYNC_FAILED_ERROR_CODE'] |
                MediaPlayerErrors['FRAGMENT_LOADER_LOADING_FAILURE_ERROR_CODE'] |
                MediaPlayerErrors['FRAGMENT_LOADER_NULL_REQUEST_ERROR_CODE'] |
                MediaPlayerErrors['URL_RESOLUTION_FAILED_GENERIC_ERROR_CODE'] |
                MediaPlayerErrors['APPEND_ERROR_CODE'] |
                MediaPlayerErrors['REMOVE_ERROR_CODE'] |
                MediaPlayerErrors['DATA_UPDATE_FAILED_ERROR_CODE'] |
                MediaPlayerErrors['CAPABILITY_MEDIASOURCE_ERROR_CODE'] |
                MediaPlayerErrors['CAPABILITY_MEDIAKEYS_ERROR_CODE'] |
                MediaPlayerErrors['DOWNLOAD_ERROR_ID_MANIFEST_CODE'] |
                MediaPlayerErrors['DOWNLOAD_ERROR_ID_CONTENT_CODE'] |
                MediaPlayerErrors['DOWNLOAD_ERROR_ID_INITIALIZATION_CODE'] |
                MediaPlayerErrors['DOWNLOAD_ERROR_ID_XLINK_CODE'] |
                MediaPlayerErrors['MANIFEST_ERROR_ID_PARSE_CODE'] |
                MediaPlayerErrors['MANIFEST_ERROR_ID_NOSTREAMS_CODE'] |
                MediaPlayerErrors['TIMED_TEXT_ERROR_ID_PARSE_CODE'] |
                MediaPlayerErrors['MANIFEST_ERROR_ID_MULTIPLEXED_CODE'] |
                MediaPlayerErrors['MEDIASOURCE_TYPE_UNSUPPORTED_CODE'] |
                // Protection errors
                MediaPlayerErrors['MEDIA_KEYERR_CODE'] |
                MediaPlayerErrors['MEDIA_KEYERR_UNKNOWN_CODE'] |
                MediaPlayerErrors['MEDIA_KEYERR_CLIENT_CODE'] |
                MediaPlayerErrors['MEDIA_KEYERR_SERVICE_CODE'] |
                MediaPlayerErrors['MEDIA_KEYERR_OUTPUT_CODE'] |
                MediaPlayerErrors['MEDIA_KEYERR_HARDWARECHANGE_CODE'] |
                MediaPlayerErrors['MEDIA_KEYERR_DOMAIN_CODE'] |
                MediaPlayerErrors['MEDIA_KEY_MESSAGE_ERROR_CODE'] |
                MediaPlayerErrors['MEDIA_KEY_MESSAGE_NO_CHALLENGE_ERROR_CODE'] |
                MediaPlayerErrors['SERVER_CERTIFICATE_UPDATED_ERROR_CODE'] |
                MediaPlayerErrors['KEY_STATUS_CHANGED_EXPIRED_ERROR_CODE'] |
                MediaPlayerErrors['MEDIA_KEY_MESSAGE_NO_LICENSE_SERVER_URL_ERROR_CODE'] |
                MediaPlayerErrors['KEY_SYSTEM_ACCESS_DENIED_ERROR_CODE'] |
                MediaPlayerErrors['KEY_SESSION_CREATED_ERROR_CODE'] |
                MediaPlayerErrors['MEDIA_KEY_MESSAGE_LICENSER_ERROR_CODE'] |
                // Offline errors
                MediaPlayerErrors['OFFLINE_ERROR'] |
                MediaPlayerErrors['INDEXEDDB_QUOTA_EXCEED_ERROR'] |
                MediaPlayerErrors['INDEXEDDB_INVALID_STATE_ERROR'] |
                MediaPlayerErrors['INDEXEDDB_NOT_READABLE_ERROR'] |
                MediaPlayerErrors['INDEXEDDB_NOT_FOUND_ERROR'] |
                MediaPlayerErrors['INDEXEDDB_NETWORK_ERROR'] |
                MediaPlayerErrors['INDEXEDDB_DATA_ERROR'] |
                MediaPlayerErrors['INDEXEDDB_TRANSACTION_INACTIVE_ERROR'] |
                MediaPlayerErrors['INDEXEDDB_NOT_ALLOWED_ERROR'] |
                MediaPlayerErrors['INDEXEDDB_NOT_SUPPORTED_ERROR'] |
                MediaPlayerErrors['INDEXEDDB_VERSION_ERROR'] |
                MediaPlayerErrors['INDEXEDDB_TIMEOUT_ERROR'] |
                MediaPlayerErrors['INDEXEDDB_ABORT_ERROR'] |
                MediaPlayerErrors['INDEXEDDB_UNKNOWN_ERROR'] |
                // MSS errors
                MediaPlayerErrors['MSS_NO_TFRF_CODE'] |
                MediaPlayerErrors['MSS_UNSUPPORTED_CODEC_CODE'],
            message: string,
            data: object,
        }
    }

    export type ErrorEvent =
        GenericErrorEvent
        | DownloadErrorEvent
        | ManifestErrorEvent
        | TimedTextErrorEvent
        | MediaPlayerErrorEvent;

    export interface CaptionRenderedEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['CAPTION_RENDERED'];
        captionDiv: HTMLDivElement;
        currentTrackIdx: number;
    }

    export interface CaptionContainerResizeEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['CAPTION_CONTAINER_RESIZE'];
    }

    export interface dvbFontDownloadAdded extends MediaPlayerEvent {
        type: MediaPlayerEvents['DVB_FONT_DOWNLOAD_ADDED'];
        font: FontInfo;
    }

    export interface dvbFontDownloadComplete extends MediaPlayerEvent {
        type: MediaPlayerEvents['DVB_FONT_DOWNLOAD_COMPLETE'];
        font: FontInfo;
    }

    export interface dvbFontDownloadFailed extends MediaPlayerEvent {
        type: MediaPlayerEvents['DVB_FONT_DOWNLOAD_FAILED'];
        font: FontInfo;
    }

    export interface DynamicToStaticEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['DYNAMIC_TO_STATIC'];
    }

    export interface FragmentLoadingCompletedEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['FRAGMENT_LOADING_COMPLETED'];
        request: FragmentRequest;
        response: ArrayBuffer;
        sender: object;
    }

    export interface FragmentLoadingAbandonedEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['FRAGMENT_LOADING_ABANDONED'];
        streamProcessor: object;
        request: object;
        mediaType: MediaType;
    }

    export interface InbandPrftReceivedEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['INBAND_PRFT_RECEIVED'];
        streamInfo: StreamInfo;
        mediaType: MediaType;
        data: object
    }

    export interface KeyErrorEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['KEY_ERROR'];
        error: DashJSError;
    }

    export interface KeyMessageEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['KEY_MESSAGE'];
        data: KeyMessage;
    }

    export interface KeySessionClosedEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['KEY_SESSION_CLOSED' | 'KEY_SESSION_REMOVED'];
        data: string | null;
        error?: string;
    }

    export interface KeySessionEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['KEY_SESSION_CREATED'];
        data: SessionToken | null;
        error?: DashJSError;
    }

    export interface KeyStatusesChangedEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['KEY_STATUSES_CHANGED'];
        data: SessionToken;
        error?: DashJSError;
    }

    export interface KeySystemSelectedEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['KEY_SYSTEM_SELECTED'];
        data: object | null;
        error?: DashJSError;
    }

    export interface LicenseRequestCompleteEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['LICENSE_REQUEST_COMPLETE'];
        data: {
            sessionToken: SessionToken;
            messageType: string;
        };
        error?: DashJSError;
    }

    export interface LogEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['LOG'];
        message: string;
    }

    export interface ManifestLoadedEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['MANIFEST_LOADED'];
        data: object;
    }

    export interface MetricEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['METRIC_ADDED' | 'METRIC_UPDATED'];
        mediaType: MediaType;
        metric: MetricType;
        value: object;
    }

    export interface MetricChangedEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['METRIC_CHANGED'];
        mediaType: MediaType;
    }

    export interface OfflineRecordEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['OFFLINE_RECORD_FINISHED' | 'OFFLINE_RECORD_STARTED' | 'OFFLINE_RECORD_STOPPED'];
        id: string;
    }

    export interface OfflineRecordLoademetadataEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['OFFLINE_RECORD_LOADEDMETADATA'];
        madiaInfos: MediaInfo[];
    }

    export interface PeriodSwitchEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['PERIOD_SWITCH_COMPLETED' | 'PERIOD_SWITCH_STARTED'];
        toStreamInfo: StreamInfo | null;
        fromStreamInfo?: StreamInfo | null;
    }

    export interface PlaybackErrorEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['PLAYBACK_ERROR'];
        error: MediaError;
    }

    export interface PlaybackPausedEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['PLAYBACK_PAUSED'];
        ended: boolean | null;
    }

    export interface PlaybackPlayingEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['PLAYBACK_PLAYING'];
        playingTime: number | null;
    }

    export interface PlaybackRateChangedEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['PLAYBACK_RATE_CHANGED'];
        playbackRate: number | null;
    }

    export interface PlaybackSeekingEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['PLAYBACK_SEEKING'];
        seekTime: number | null;
    }

    export interface PlaybackStartedEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['PLAYBACK_STARTED'];
        startTime: number | null;
    }

    export interface PlaybackTimeUpdatedEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['PLAYBACK_TIME_UPDATED'];
        time: number | null;
        timeToEnd: number;
    }

    export interface PlaybackWaitingEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['PLAYBACK_WAITING'];
        playingTime: number | null;
    }

    export interface ProtectionCreatedEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['PROTECTION_CREATED'];
        controller: object;
    }

    export interface ProtectionDestroyedEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['PROTECTION_DESTROYED'];
        data: string;
    }

    export interface TrackChangeRenderedEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['TRACK_CHANGE_RENDERED'];
        mediaType: MediaType;
        oldMediaInfo: MediaInfo;
        newMediaInfo: MediaInfo;
    }

    export interface QualityChangeRenderedEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['QUALITY_CHANGE_RENDERED'];
        mediaType: MediaType;
        oldQuality: number;
        newQuality: number;
    }

    export interface QualityChangeRequestedEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['QUALITY_CHANGE_REQUESTED'];
        mediaType: MediaType;
        oldQuality: number;
        newQuality: number;
        streamInfo: StreamInfo | null;
        reason: {
            name?: string;
            droppedFrames?: number;
        } | null;
    }

    export interface StreamInitializedEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['STREAM_INITIALIZED'];
        streamInfo: StreamInfo;
        error: Error | null;
    }

    export interface TextTracksAddedEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['TEXT_TRACKS_ADDED'];
        enabled: boolean;
        index: number;
        tracks: TextTrackInfo[];
    }

    export interface TtmlParsedEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['TTML_PARSED'];
        ttmlString: string;
        ttmlDoc: object;
    }

    export interface TtmlToParseEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['TTML_TO_PARSE'];
        content: object;
    }

    export interface CueEnterEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['CUE_ENTER'];
        id: string,
        text: string,
        start: number,
        end: number
    }

    export interface CueExitEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['CUE_EXIT'];
        id: string,
    }

    export interface AdaptationSetRemovedNoCapabilitiesEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['ADAPTATION_SET_REMOVED_NO_CAPABILITIES'];
        adaptationSet: object;
    }

    export interface MediaSettings {
        lang?: string;
        viewpoint?: any;
        audioChannelConfiguration?: any[];
        accessibility?: any;
        role?: string;
    }

    export class serviceDescriptions {
        id: number;
        schemeIdUri: string;
        latency: number | null;
        playbackrate: number;
        contentSteering: ContentSteering | null;
    }

    export interface ICurrentRepresentationSwitch {
        mt: Date;
        t: Date;
    }

    export interface IBufferState {
        target: number;
        state: string;
    }

    /**
     * Streaming - Constants
     **/

    export interface conformanceViolationConstants {
        LEVELS: {
            SUGGESTION: 'Suggestion',
            WARNING: 'Warning',
            ERROR: 'Error'
        },
        EVENTS: {
            NO_UTC_TIMING_ELEMENT: {
                key: 'NO_UTC_TIMING_ELEMENT',
                message: 'No UTCTiming element is present in the manifest. You may experience playback failures. For a detailed validation use https://conformance.dashif.org/'
            },
            NON_COMPLIANT_SMPTE_IMAGE_ATTRIBUTE: {
                key: 'NON_COMPLIANT_SMPTE_IMAGE_ATTRIBUTE',
                message: 'SMPTE 2052-1:2013 defines the attribute name as "imageType" and does not define "imagetype"'
            },
            INVALID_DVR_WINDOW: {
                key: 'INVALID_DVR_WINDOW',
                message: 'No valid segment found when applying a specification compliant DVR window calculation. Using SegmentTimeline entries as a fallback.'
            }
        }
    }

    export interface Constants {
        STREAM: 'stream',
        VIDEO: 'video',
        AUDIO: 'audio',
        TEXT: 'text',
        MUXED: 'muxed',
        IMAGE: 'image',
        STPP: 'stpp',
        TTML: 'ttml',
        VTT: 'vtt',
        WVTT: 'wvtt',
        CONTENT_STEERING: 'contentSteering',
        LIVE_CATCHUP_MODE_DEFAULT: 'liveCatchupModeDefault',
        LIVE_CATCHUP_MODE_LOLP: 'liveCatchupModeLoLP',
        MOVING_AVERAGE_SLIDING_WINDOW: 'slidingWindow',
        MOVING_AVERAGE_EWMA: 'ewma',
        BAD_ARGUMENT_ERROR: 'Invalid Arguments',
        MISSING_CONFIG_ERROR: 'Missing config parameter(s)',
        TRACK_SWITCH_MODE_ALWAYS_REPLACE: 'alwaysReplace',
        TRACK_SWITCH_MODE_NEVER_REPLACE: 'neverReplace',
        TRACK_SELECTION_MODE_FIRST_TRACK: 'firstTrack',
        TRACK_SELECTION_MODE_HIGHEST_BITRATE: 'highestBitrate',
        TRACK_SELECTION_MODE_HIGHEST_EFFICIENCY: 'highestEfficiency',
        TRACK_SELECTION_MODE_WIDEST_RANGE: 'widestRange',
        TRACK_SELECTION_MODE_HIGHEST_SELECTION_PRIORITY: 'highestSelectionPriority',
        CMCD_MODE_QUERY: 'query',
        CMCD_MODE_HEADER: 'header',
        CMCD_AVAILABLE_KEYS: ['br', 'd', 'ot', 'tb', 'bl', 'dl', 'mtp', 'nor', 'nrr', 'su', 'bs', 'rtp', 'cid', 'pr', 'sf', 'sid', 'st', 'v'],
        CMCD_V2_AVAILABLE_KEYS: ['msd', 'ltc'],
        CMCD_AVAILABLE_REQUESTS: ['segment', 'mpd', 'xlink', 'steering', 'other'],

        INITIALIZE: 'initialize',
        TEXT_SHOWING: 'showing',
        TEXT_HIDDEN: 'hidden',
        TEXT_DISABLED: 'disabled',
        ACCESSIBILITY_CEA608_SCHEME: 'urn:scte:dash:cc:cea-608:2015',
        CC1: 'CC1',
        CC3: 'CC3',
        UTF8: 'utf-8',
        SCHEME_ID_URI: 'schemeIdUri',
        START_TIME: 'starttime',
        SERVICE_DESCRIPTION_DVB_LL_SCHEME: 'urn:dvb:dash:lowlatency:scope:2019',
        SUPPLEMENTAL_PROPERTY_DVB_LL_SCHEME: 'urn:dvb:dash:lowlatency:critical:2019',
        CTA_5004_2023_SCHEME: 'urn:mpeg:dash:cta-5004:2023',
        THUMBNAILS_SCHEME_ID_URIS: ['http://dashif.org/thumbnail_tile', 'http://dashif.org/guidelines/thumbnail_tile'],
        FONT_DOWNLOAD_DVB_SCHEME: 'urn:dvb:dash:fontdownload:2014',
        COLOUR_PRIMARIES_SCHEME_ID_URI: 'urn:mpeg:mpegB:cicp:ColourPrimaries',
        URL_QUERY_INFO_SCHEME: 'urn:mpeg:dash:urlparam:2014',
        EXT_URL_QUERY_INFO_SCHEME: 'urn:mpeg:dash:urlparam:2016',
        MATRIX_COEFFICIENTS_SCHEME_ID_URI: 'urn:mpeg:mpegB:cicp:MatrixCoefficients',
        TRANSFER_CHARACTERISTICS_SCHEME_ID_URI: 'urn:mpeg:mpegB:cicp:TransferCharacteristics',
        HDR_METADATA_FORMAT_SCHEME_ID_URI: 'urn:dvb:dash:hdr-dmi',
        HDR_METADATA_FORMAT_VALUES: {
            ST2094_10: 'ST2094-10',
            SL_HDR2: 'SL-HDR2',
            ST2094_40: 'ST2094-40'
        },
        MEDIA_CAPABILITIES_API: {
            COLORGAMUT: {
                SRGB: 'srgb',
                P3: 'p3',
                REC2020: 'rec2020'
            },
            TRANSFERFUNCTION: {
                SRGB: 'srgb',
                PQ: 'pq',
                HLG: 'hlg'
            },
            HDR_METADATATYPE: {
                SMPTE_ST_2094_10: 'smpteSt2094-10',
                SLHDR2: 'slhdr2',
                SMPTE_ST_2094_40: 'smpteSt2094-40'
            }
        },
        XML: 'XML',
        ARRAY_BUFFER: 'ArrayBuffer',
        DVB_REPORTING_URL: 'dvb:reportingUrl',
        DVB_PROBABILITY: 'dvb:probability',
        OFF_MIMETYPE: 'application/font-sfnt',
        WOFF_MIMETYPE: 'application/font-woff',
        VIDEO_ELEMENT_READY_STATES: {
            HAVE_NOTHING: 0,
            HAVE_METADATA: 1,
            HAVE_CURRENT_DATA: 2,
            HAVE_FUTURE_DATA: 3,
            HAVE_ENOUGH_DATA: 4
        },
        FILE_LOADER_TYPES: {
            FETCH: 'fetch_loader',
            XHR: 'xhr_loader'
        },
        THROUGHPUT_TYPES: {
            LATENCY: 'throughput_type_latency',
            BANDWIDTH: 'throughput_type_bandwidth'
        },
        THROUGHPUT_CALCULATION_MODES: {
            EWMA: 'throughputCalculationModeEwma',
            ZLEMA: 'throughputCalculationModeZlema',
            ARITHMETIC_MEAN: 'throughputCalculationModeArithmeticMean',
            BYTE_SIZE_WEIGHTED_ARITHMETIC_MEAN: 'throughputCalculationModeByteSizeWeightedArithmeticMean',
            DATE_WEIGHTED_ARITHMETIC_MEAN: 'throughputCalculationModeDateWeightedArithmeticMean',
            HARMONIC_MEAN: 'throughputCalculationModeHarmonicMean',
            BYTE_SIZE_WEIGHTED_HARMONIC_MEAN: 'throughputCalculationModeByteSizeWeightedHarmonicMean',
            DATE_WEIGHTED_HARMONIC_MEAN: 'throughputCalculationModeDateWeightedHarmonicMean',
        },
        LOW_LATENCY_DOWNLOAD_TIME_CALCULATION_MODE: {
            MOOF_PARSING: 'lowLatencyDownloadTimeCalculationModeMoofParsing',
            DOWNLOADED_DATA: 'lowLatencyDownloadTimeCalculationModeDownloadedData',
            AAST: 'lowLatencyDownloadTimeCalculationModeAast',
        },
        RULES_TYPES: {
            QUALITY_SWITCH_RULES: 'qualitySwitchRules',
            ABANDON_FRAGMENT_RULES: 'abandonFragmentRules'
        },
        QUALITY_SWITCH_RULES: {
            BOLA_RULE: 'BolaRule',
            THROUGHPUT_RULE: 'ThroughputRule',
            INSUFFICIENT_BUFFER_RULE: 'InsufficientBufferRule',
            SWITCH_HISTORY_RULE: 'SwitchHistoryRule',
            DROPPED_FRAMES_RULE: 'DroppedFramesRule',
            LEARN_TO_ADAPT_RULE: 'L2ARule',
            LOL_PLUS_RULE: 'LoLPRule'
        },
        ABANDON_FRAGMENT_RULES: {
            ABANDON_REQUEST_RULE: 'AbandonRequestsRule'
        },

        /**
         *  @constant {string} ID3_SCHEME_ID_URI specifies scheme ID URI for ID3 timed metadata
         *  @memberof Constants#
         *  @static
         */
        ID3_SCHEME_ID_URI: 'https://aomedia.org/emsg/ID3',
        COMMON_ACCESS_TOKEN_HEADER: 'common-access-token',
        DASH_ROLE_SCHEME_ID: 'urn:mpeg:dash:role:2011',
        CODEC_FAMILIES: {
            MP3: 'mp3',
            AAC: 'aac',
            AC3: 'ac3',
            EC3: 'ec3',
            DTSX: 'dtsx',
            DTSC: 'dtsc',
            AVC: 'avc',
            HEVC: 'hevc'
        }
    }

    export interface MetricsConstants {
        TCP_CONNECTION: 'TcpList',
        HTTP_REQUEST: 'HttpList',
        TRACK_SWITCH: 'RepSwitchList',
        BUFFER_LEVEL: 'BufferLevel',
        BUFFER_LOADED: 'bufferLoaded',
        ABANDON_LOAD: 'abandonload',
        ALLOW_LOAD: 'allowload',
        BUFFER_EMPTY: 'bufferStalled',
        BUFFER_STATE: 'BufferState',
        DVR_INFO: 'DVRInfo',
        DROPPED_FRAMES: 'DroppedFrames',
        SCHEDULING_INFO: 'SchedulingInfo',
        REQUESTS_QUEUE: 'RequestsQueue',
        MANIFEST_UPDATE: 'ManifestUpdate',
        MANIFEST_UPDATE_STREAM_INFO: 'ManifestUpdatePeriodInfo',
        MANIFEST_UPDATE_TRACK_INFO: 'ManifestUpdateRepresentationInfo',
        PLAY_LIST: 'PlayList',
        DVB_ERRORS: 'DVBErrors',
        HTTP_REQUEST_DVB_REPORTING_TYPE: 'DVBReporting',
    }

    export interface ProtectionConstants {
        CLEARKEY_KEYSTEM_STRING: 'org.w3.clearkey',
        WIDEVINE_KEYSTEM_STRING: 'com.widevine.alpha',
        PLAYREADY_KEYSTEM_STRING: 'com.microsoft.playready',
        PLAYREADY_RECOMMENDATION_KEYSTEM_STRING: 'com.microsoft.playready.recommendation',
        WIDEVINE_UUID: 'edef8ba9-79d6-4ace-a3c8-27dcd51d21ed',
        PLAYREADY_UUID: '9a04f079-9840-4286-ab92-e65be0885f95',
        CLEARKEY_UUID: 'e2719d58-a985-b3c9-781a-b030af78d30e',
        W3C_CLEARKEY_UUID: '1077efec-c0b2-4d02-ace3-3c1e52e2fb4b',
        INITIALIZATION_DATA_TYPE_CENC: 'cenc',
        INITIALIZATION_DATA_TYPE_KEYIDS: 'keyids',
        INITIALIZATION_DATA_TYPE_WEBM: 'webm',
        ENCRYPTION_SCHEME_CENC: 'cenc',
        ENCRYPTION_SCHEME_CBCS: 'cbcs',
        MEDIA_KEY_MESSAGE_TYPES: {
            LICENSE_REQUEST: 'license-request',
            LICENSE_RENEWAL: 'license-renewal',
            LICENSE_RELEASE: 'license-release',
            INDIVIDUALIZATION_REQUEST: 'individualization-request',
        },
        ROBUSTNESS_STRINGS: {
            WIDEVINE: {
                SW_SECURE_CRYPTO: 'SW_SECURE_CRYPTO',
                SW_SECURE_DECODE: 'SW_SECURE_DECODE',
                HW_SECURE_CRYPTO: 'HW_SECURE_CRYPTO',
                HW_SECURE_DECODE: 'HW_SECURE_DECODE',
                HW_SECURE_ALL: 'HW_SECURE_ALL'
            }
        },
        MEDIA_KEY_STATUSES: {
            USABLE: 'usable',
            EXPIRED: 'expired',
            RELEASED: 'released',
            OUTPUT_RESTRICTED: 'output-restricted',
            OUTPUT_DOWNSCALED: 'output-downscaled',
            STATUS_PENDING: 'status-pending',
            INTERNAL_ERROR: 'internal-error',
        }
    }

    /**
     * Streaming - Controllers
     **/

    export interface AbrController {
        initialize(): void;

        registerStreamType(type: object, streamProcessor: object): void;

        unRegisterStreamType(streamId: string, type: string): void;

        reset(): void;

        setConfig(config: object): void;

        getOptimalRepresentationForBitrate(mediaInfo: MediaInfo, bitrateInKbit: number, includeCompatibleMediaInfos: boolean): Representation | null;

        getRepresentationByAbsoluteIndex(absoluteIndex: number, mediaInfo: MediaInfo, includeCompatibleMediaInfos: boolean): Representation | null;

        getPossibleVoRepresentations(mediaInfo: MediaInfo, includeCompatibleMediaInfos: boolean): Representation[] | null;

        getPossibleVoRepresentationsFilteredBySettings(mediaInfo: MediaInfo, includeCompatibleMediaInfos: boolean): Representation[] | null;

        getInitialBitrateFor(type: string): number;

        checkPlaybackQuality(type: string, streamId: string | number): boolean;

        setPlaybackQuality(type: string, streamInfo: StreamInfo, representation: Representation, reason: object): void;

        getAbandonmentStateFor(streamId: string, type: string): any | null;

        isPlayingAtLowestQuality(representation: Representation): boolean;

        isPlayingAtTopQuality(representation: Representation): boolean;

        setWindowResizeEventCalled(value: any): void;

        clearDataForStream(streamId: string): void;
    }

    export interface BaseURLController {
        setConfig(config: object): void;

        update(manifest: object): void;

        resolve(path: any): BaseURL;

        reset(): void;

        getBaseUrls(manifest: any): BaseURL[];

        initialize(data: any): void;
    }

    export interface BlacklistController {
        contains(query: any): boolean;

        add(entry: any): void;

        remove(entry: any): void;

        reset(): void;
    }

    export interface BufferController {
        initialize(mediaSource: MediaSource): void;

        getStreamId(): string;

        getType(): string;

        getBufferControllerType(): string;

        setMediaSource(value: object, mediaInfo: MediaInfo | null): void;

        createBufferSink(mediaInfo: MediaInfo, oldBufferSinks?: any[]): Promise<any>;

        dischargePreBuffer(): void;

        appendInitSegmentFromCache(representationId: string): boolean;

        prepareForPlaybackSeek(): any;

        prepareForabandonQualitySwitch(newRepresentation: Representation, oldRepresentation: Representation): Promise<any>;

        prepareForFastQualitySwitch(newRepresentation: Representation, oldRepresentation: Representation): Promise<any>;

        prepareForReplacementTrackSwitch(codec: string): Promise<any>;

        prepareForForceReplacementQualitySwitch(voRepresentation: Representation): Promise<any>;

        prepareForNonReplacementTrackSwitch(codec: string): Promise<any>;

        pruneAllSafely(): Promise<any>;

        getAllRangesWithSafetyFactor(seekTime: number): { start: number, end: number }[];

        hasBufferAtTime(time: number): boolean;

        getRangeAt(time: number, tolerance: number): Range | null;

        pruneBuffer(): void;

        clearBuffers(ranges: Range[]): Promise<any>;

        updateBufferTimestampOffset(voRepresentation: Representation): Promise<any>;

        updateAppendWindow(): Promise<any>;

        segmentRequestingCompleted(segmentIndex: number): void;

        getBuffer(): SourceBufferSink;

        getBufferLevel(): number;

        getMediaSource(): MediaSource;

        getIsBufferingCompleted(): boolean;

        setIsBufferingCopleted(value: object): void;

        getIsPruningInProgress(): boolean;

        getContinuousBufferTimeForTargetTime(targetTime: number): number;

        setSeekTarget(value: object): void;

        reset(errored: any, keepBuffers: boolean): void;
    }

    export interface CatchupController {
        initialize(): void;

        setConfig(config: any): void;

        reset(): void;
    }

    export interface ClientDataReportingController {
        setconfig(conifg: any): void;

        isServiceLocationIncluded(requestType: string, serviceLocation: any): boolean;

        isAdaptationsIncluded(adaptationSet: AdaptationSet): boolean;
    }

    export interface CommonAccessTokenController {
        processResponseHeaders(httpResponse: object): void;

        getCommonAccessTokenForUrl(url: URL): any;

        reset(): void;
    }

    export interface EventController {
        start(): void;

        addInlineEvents(values: object[], periodId: string | number): void;

        addInbandEvents(values: object[], periodId: string | number): void;

        setConfig(config: object): void;

        getInlineEvents(): object;

        getInbandEvents(): object;

        reset(): void;
    }

    export interface ExtUrlQueryInfoController {
        createFinalQueryStrings(manifest: object): void;

        getFinalQueryString(request: HTTPRequest): any;
    }

    export interface FragmentController {
        getStreamId(): string;

        getModel(type: string): any;

        reset(): void;
    }

    export interface GapController {
        reset(): void;

        setConfig(config: object): void;

        initialize(): void;
    }

    export interface MediaController {
        setConfig(config: object): void;

        initialize(): void;

        setInitialMediaSettingsForType(type: string, streamInfo: StreamInfo): void;

        addTrack(track: MediaInfo): void;

        getTracksFor(type: string, streamId: string): MediaInfo[];

        getCurrentTrackFor(type: string, streamId: string): MediaInfo;

        isCurrentTrack(track: MediaInfo): boolean;

        setTrack(track: MediaInfo, options: object): void;

        setInitialSettings(type: string, value: object): void;

        getInitialSettings(type: string): object | null;

        saveTextSettingsDisabled(): void;

        areTracksEqual(t1: MediaInfo, t2: MediaInfo): boolean;

        reset(): void;

        matchSettingsLang(settings: object, track: MediaInfo): any;

        matchSettingsIndex(settings: object, track: MediaInfo): any;

        matchSettingsViewPoint(settings: object, track: MediaInfo): any;

        matchSettingsRole(settings: object, track: MediaInfo): any;

        matchSettingsAccessibility(settings: object, track: MediaInfo): any;

        matchSettingsAudioChannelConfig(settings: object, track: MediaInfo): any;

        matchSettingsCodec(settings: object, track: MediaInfo): any;

        matchSettings(settings: object, track: MediaInfo, isTrackActive?: boolean): any;

        getTracksWithHighestSelectionPriority(trackArr: MediaInfo[]): MediaInfo[];

        getTracksWithHighestBitrate(trackArr: MediaInfo[]): MediaInfo[];

        getTracksWithHighestEfficiency(trackArr: MediaInfo[]): MediaInfo[];

        getTracksWithWidestRange(trackArr: MediaInfo[]): MediaInfo[];

        selectInitialTrack(type: string, tracks: MediaInfo[]): MediaInfo;
    }

    export interface MediaSourceController {
        createMediaSource(): MediaSource;

        attachMediaSource(videoModel: object): string;

        detachMediaSource(videoModel: object): void;

        setDuration(value: object): void;

        setSeekable(start: number, end: number): void;

        signalEndOfStream(source: any): void;
    }

    export interface PlaybackController {
        initialize(sInfo: StreamInfo, periodSwitch: boolean): void;

        getPlaybackStalled(): boolean;

        getTimeToStreamEnd(sInfo?: StreamInfo): number;

        getStreamEndTime(sInfo: StreamInfo): number;

        play(): void;

        pause(): void;

        seek(time: number, stickToBuffered: boolean, internal: boolean): void;

        seekToOriginalLive(stickToBuffered?: boolean, internal?: boolean, adjustLiveDelay?: boolean): void;

        seekToCurrentLive(stickToBuffered?: boolean, internal?: boolean, adjustLiveDelay?: boolean): void;

        getTime(): number | null;

        isPaused(): boolean | null;

        isSeeking(): boolean | null;

        isStalled(): boolean | null;

        isProgressing(): Promise<any>;

        getPlaybackRate(): number | null;

        getPlayedRanges(): TimeRanges | null;

        getEnded(): boolean | null;

        getIsDynamic(): boolean;

        getStreamController(): object;

        getIsManifestUpdateInProgress(): boolean;

        getAvailabilityStartTime(): number;

        getLiveDelay(): number;

        getOriginalLiveDelay(): number;

        getCurrentLiveLatency(): number;

        computeAndSetLiveDelay(fragmentDuration: number, manifestInfo: IManifestInfo): number;

        reset(): void;

        setConfig(config: object): void;

        updateCurrentTime(mediaType?: MediaType): void;

        getBufferLevel(filterList?: any[]): number | null;

        getLowLatencyModeEnabled(): boolean;

        getInitialCatchupModeActivated(): boolean;
    }

    export interface ScheduleController {
        initialize(_hasVideoTrack: boolean): void;

        getType(): string;

        getStreamId(): string;

        startScheduleTimer(value: object): void;

        clearScheduleTimer(): void;

        getBufferTarget(): number;

        setSwitchTrack(value: object): void;

        getSwitchTrack(): any;

        setTimeToLoadDelay(value: object): void;

        getTimeToLoadDelay(): number;

        setCheckPlaybackQuality(value: object): void;

        setInitSegmentRequired(value: object): void;

        setLastInitializedRepresentationId(value: number): void;

        reset(): void;
    }

    export interface StreamController {
        initialize(autoPl: any, protData: object): void;

        load(url: string, startTime?: number): void;

        loadWithManifest(manifest: object): void;

        getStreamForTime(time: number): object | null;

        addDVRMetric(): void;

        getTimeRelativeToStreamId(time: number, id: string): number | null;

        getActiveStreamProcessors(): any[];

        getActiveStream(): object;

        getInitialPlayback(): any;

        getAutoPlay(): boolean;

        hasVideoTrack(): void;

        hasAudioTrack(): void;

        switchToVideoElement(seekTime: number): void;

        getActiveStreamInfo(): StreamInfo | null;

        getIsStreamSwitchInProgress(): boolean;

        getHasMediaOrInitialisationError(): boolean;

        getStreamById(id: string): object | null;

        setConfig(config: object): void;

        setProtectionData(protData: object): void;

        reset(): void;

        refreshManifest(): void;

        getStreams(): any[];
    }

    export interface ThroughputController {

        initialize(): void;

        setConfig(config: object): void;

        getArithmeticMean(dict: ThroughputDictEntry[], sampleSize: number): number

        getByteSizeWeightedArithmeticMean(dict: ThroughputDictEntry[], sampleSize: number): number

        getDateWeightedArithmeticMean(dict: ThroughputDictEntry[], sampleSize: number): number

        getHarmonicMean(dict: ThroughputDictEntry[], sampleSize: number): number

        getByteSizeWeightedHarmonicMean(dict: ThroughputDictEntry[], sampleSize: number): number

        getDateWeightedHarmonicMean(dict: ThroughputDictEntry[], sampleSize: number): number

        getEwma(dict: ThroughputEwmaDictEntry[], halfLife: object, useMin: boolean): number

        getZlema(dict: ThroughputDictEntry[], sampleSize: number): number

        getAverageThroughput(mediaType: MediaType, calculationMode: string, sampleSize: number): number

        getSafeAverageThroughput(mediaType: MediaType, calculationMode: string, sampleSize: number): number

        getAverageLatency(mediaType: MediaType, calculationMode: string, sampleSize: number): number

        getRawThroughputData(mediaType: MediaType): number

        reset(): void;
    }

    export interface TimeSyncController {
        setConfig(config: object): void;

        initialize(): void;

        attemptSync(tSources: number[], isDynamic: boolean): void;

        reset(): void;
    }

    export interface XlinkController {
        resolveManifestOnLoad(mpd: Mpd): void;

        setParser(value: object): void;

        reset(): void;
    }

    /**
     * Streaming - Metrics - Controllers
     **/

    export interface MetricsCollectionController {
        reset(): void;
    }

    export interface MetricsController {
        initialize(metricsEntry: object): void;

        reset(): void;
    }

    export interface MetricsHandlersController {
        initialize(metrics: object[], reportingController: ReportingController): void;

        reset(): void;
    }

    export interface RangeController {
        initialize(rs: object[]): void;

        reset(): void;

        isEnabled(): boolean;
    }

    export interface ReportingController {
        initialize(rangeController: RangeController): void;

        reset(): void;

        report(type: string, vos: any[]): void;
    }

    /**
     * Streaming - Metrics - Metrics - Handlers
     **/

    export interface BufferLevelHandler {
        initialize(basename: string, rc: RangeController, n_ms: string): void;

        reset(): void;

        handleNewMetric(metric: any, vo: any, type: string): void;
    }

    export interface DVBErrorsHandler {
        initialize(unused: any, rc: RangeController): void; //unused does nothing

        reset(): void;

        handleNewMetric(metric: any, vo: any): void;
    }

    export interface GenericMetricHandler {
        initialize(name: string, rc: RangeController): void;

        reset(): void;

        handleNewMetric(metric: any, vo: any): void;
    }

    export interface HttpListHandler {
        initialize(basename: string, rc: RangeController, n_ms: string, requestType: string): void;

        reset(): void;

        handleNewMetric(metric: any, vo: any): void;
    }

    /**
     * Streaming - Metrics - Metrics
     **/

    export interface MetricsHandlerFactory {
        create(listType: string, reportingController: ReportingController): void;

        register(key: string, handler: object): void;

        unregister(key: string): void;
    }

    /**
     * Streaming - Metrics - Reporting - Reporters
     **/

    export interface DVBReporting {
        report(type: string, vos: any[]): void;

        initialize(entry: object, rc: RangeController): void;

        reset(): void;
    }

    /**
     * Streaming - Metrics - Reporting
     **/

    export interface ReportingFactory {
        create(entry: object, reportingController: ReportingController): void;

        register(schemeIdUri: string, moduleName: string): void;

        unregister(schemeIdUri: string): void;
    }

    /**
     * Streaming - Metrics - utils
     **/

    export interface DVBErrorsTranslator {
        initialize(): void;

        reset(): void;
    }

    export interface HandlerHelpers {
        // Exports nothing
    }

    export interface ManifestParsing {
        getMetrics(manifest: object): object[];
    }

    export interface MetricSerialiser {
        serialise(metric: object): string;
    }

    export interface RNG {
        random(min: number, max: number): number;
    }

    /**
     * Streaming - Metrics - Vo
     **/

    export class DVBErrors {
        mpdurl: string | null;
        errorcode: string | null;
        terror: Date | null;
        url: string | null;
        ipaddress: string | null;
        servicelocation: string | null;

        SSL_CONNECTION_FAILED_PREFIX: 'SSL';
        DNS_RESOLUTION_FAILED: 'C00';
        HOST_UNREACHABLE: 'C01';
        CONNECTION_REFUSED: 'C02';
        CONNECTION_ERROR: 'C03';
        CORRUPT_MEDIA_ISOBMFF: 'M00';
        CORRUPT_MEDIA_OTHER: 'M01';
        BASE_URL_CHANGED: 'F00';
        BECAME_REPORTER: 'S00';
    }

    export interface Metrics {
        metrics: string;
        Range: any[];
        Reporting: any[];
    }

    export interface Range {
        starttime: number;
        duration: number;
        _useWallClockTime: boolean;
    }

    export interface Reporting {
        DEFAULT_DVB_PROBABILITY: 1000;

        schemeIdUri: string;
        value: string;
        dvbReportingUrl: string;
        dvbProbability: number;
    }

    /**
     * Streaming - Metrics
     **/

    export interface MetricsReporting {
        createMetricsReporting(config: object): void;

        getReportingFactory(): ReportingFactory;

        getMetricsHandlerFactory(): MetricsHandlerFactory;
    }

    export class MetricsReportingEvents extends EventsBase {
        METRICS_INITIALISATION_COMPLETE: 'internal_metricsReportingInitialized';
        BECAME_REPORTING_PLAYER: 'internal_becameReportingPlayer';

        CMCD_DATA_GENERATED: 'cmcdDataGenerated';
    }

    /**
     * Streaming - Models
     **/

    export interface AastLowLatencyThroughputModel {
        setup(): void;

        getEstimatedDownloadDurationMS(request: HTTPRequest): number;

        getThroughputCapacityDelayMS(request: HTTPRequest, currentBufferLevelMS: number): number;

        addMeasurement(request: HTTPRequest, chunkMeasurements: any[], requestTimeMs: number, throughputCapacityDelayMS: number): void;
    }

    export interface BaseURLTreeModel {
        reset(): void;

        update(manifest: object): void;

        getForPath(path: any): any;

        invalidateSelectedIndexes(serviceLocation: string): void;

        getBaseUrls(root: any): BaseURL[];

        setConfig(config: object): void;
    }

    export interface CmcdModel {
        getQueryParameter(request: HTTPRequest): { key: string, finalPayloadString: string } | null;

        getHeaderParameters(request: HTTPRequest): object | null;

        isCmcdEnabled(): boolean;

        getCmcdParametersFromManifest(): CMCDParameters;

        getCmcdData(request: HTTPRequest): object;

        setConfig(config: object): void;

        reset(): void;

        initialize(): void;
    }

    export interface CmsdModel {
        initialize(): void; // NOT IMPLEMENTED!

        setConfig(): void; // NOT IMPLEMENTED!

        parseResponseHeader(responseHeaders: object, mediaType: MediaType): void;

        getMaxBitrate(type: string): number;

        getEstimatedThroughput(type: string): number;

        getResponseDelay(type: string): number;

        getRoundTripTime(type: string): number;

        reset(): void;
    }

    export interface CustomParametersModel {
        setConfig(): void; // NOT IMPLEMENTED

        setCustomInitialTrackSelectionFunction(customFunc: Function): void;

        resetCustomInitialTrackSelectionFunction(): void;

        getCustomInitialTrackSelectionFunction(): Function;

        getLicenseRequestFilters(): Array<Function>;

        getLicenseResponseFilters(): Array<Function>;

        registerLicenseRequestFilter(filter: Function): void;

        registerLicenseResponseFilter(filter: Function): void;

        unregisterLicenseRequestFilter(filter: Function): void;

        unregisterLicenseResponseFilter(filter: Function): void

        getCustomCapabilitiesFilters(): Array<Function>;

        registerCustomCapabilitiesFilter(filter: Function): void;

        unregisterCustomCapabilitiesFilter(filter: Function): void;

        addAbrCustomRule(type: string, rulename: string, rule: object): void;

        removeAbrCustomRule(ruleName: string): void;

        removeAllAbrCustomRule(): void;

        getAbrCustomRules(): Array<object>;

        addRequestInterceptor(interceptor: Function): void;

        addResponseInterceptor(interceptor: Function): void;

        removeRequestInterceptor(interceptor: Function): void;

        removeResponseInterceptor(interceptor: Function): void;

        getRequestInterceptors(): void;

        getResponseInterceptors(): void;

        addUTCTimingSource(schemeIdUri: string, value: string): void;

        getUTCTimingSources(): Array<object>;

        removeUTCTimingSource(schemeIdUri: string, value: string): void;

        clearDefaultUTCTimingSources(): void;

        restoreDefaultUTCTimingSources(): void;

        setXHRWithCredentialsForType(type: string, value: string): void;

        getXHRWithCredentialsForType(type: string): any;

        reset(): void;
    }

    export interface FragmentModel {
        getStreamId(): string;

        getType(): string;

        isFragmentLoaded(request: HTTPRequest): boolean;

        isFragmentLoadedOrPending(request: HTTPRequest): boolean;

        getRequests(filter: any): HTTPRequest[];

        removeExecutedRequestsBeforeTime(time: number): boolean;

        removeExecutedRequestAfterTime(time: number): boolean;

        syncExecutedRequestsWithBufferedRange(bufferedRanges: Range[], streamDuration: number): void;

        abortRequests(): void;

        executeRequest(request: HTTPRequest): void;

        reset(): void;

        resetInitialSettings(): void;
    }

    export interface ManifestModel {
        getValue(): object;

        setValue(value: object): void;
    }

    export interface MediaPlayerModel {
        setConfig(config: object): void;

        getCatchupMaxDrift(): number;

        getCatchupPlaybackRates(log: any): number;

        getCatchupModeEnabled(): boolean;

        getBufferTimeDefault(): number;

        getFastSwitchEnabled(): boolean;

        getInitialBufferLevel(): number;

        getRetryAttemptsForType(type: string): number;

        getRetryIntervalsForType(type: string): any;

        getAbrBitrateParameter(field: string, mediaType: string): object | -1;

        reset(): void;
    }

    export interface MetricsModel {
        config: object;

        clearCurrentMetricsForType(type: string): void;

        clearAllCurrentMetrics(): void;

        getMetricsFor(type: string, readOnly: boolean): object;

        //addHttpRequest(mediaType: MediaType, tcpid: string, type: string, url: string, quality: number, actualurl: string, servicelocation: string, rage: Range, trequest: Date, tresponse: Date, tfinish: Date, responsecode: number, mediaduration: number, responseHeaders: any[], traces: object): void;

        addHttpRequest(request: HTTPRequest, response: object, traces: object, cmsd: object): void;

        addRepresentationSwitch(mediaType: MediaType, t: Date, mt: Date, to: string, lto: string): void;

        addBufferLevel(mediaType: MediaType, t: Date, level: number): void;

        addBufferState(mediaType: MediaType, state: string, target: number): void;

        addDVRInfo(mediaType: MediaType, currentTime: number, mpd: Mpd, range: Range): void;

        addDroppedFrames(mediaType: MediaType, quality: number): void;

        addSchedulingInfo(mediaType: MediaType, t: number, startTime: number, availabilityStartTime: number, duration: number, quality: number, range: Range, state: string): void;

        addRequestsQueue(mediaType: MediaType, loadingRequests: any[], executedRequests: any[]): void;

        addManifestUpdate(mediaType: MediaType, type: string, requestTime: number, fetchTime: number): void;

        updateManifestUpdateInfo(manifestUpdate: ManifestUpdate, updatedFields: any[]): void;

        addManifestUpdateStreamInfo(manifestUpdate: ManifestUpdate, id: string, index: number, start: number, duration: number): void;

        addManifestUpdateRepresentationInfo(manifestUpdate: ManifestUpdate, representation: Representation, mediaType: MediaType): void;

        addPlayList(vo: any): void;

        addDVBErrors(vo: any): void;
    }

    export interface ThroughputModel {
        addEntry(mediaType: MediaType, httpRequest: HTTPRequest): void;

        getThroughputDict(mediaType: MediaType): ThroughputDictEntry;

        getEwmaThroughputDict(mediaType: MediaType): ThroughputEwmaDictEntry;

        getEwmaLatencyDict(mediaType: MediaType): ThroughputEwmaDictEntry;

        getEwmaHalfLife(mediaType: MediaType): object;

        getLatencyDict(mediaType: MediaType): ThroughputDictEntry;

        reset(): void;
    }

    export interface URIFragmentModel {
        initialize(uri: string): void;

        getURIFragmentData(): URIFragmentData;
    }

    interface VideoModel {
        initialize(): void;

        reset(): void;

        setPlaybackRate(value: number, ignoreReadyState?: boolean): void;

        setcurrentTime(currentTime: number, stickToBuffered: boolean): void;

        getElement(): HTMLVideoElement | HTMLAudioElement;

        setElement(value: HTMLVideoElement | HTMLAudioElement): void;

        setSource(source: string): void;

        setDisableRemotePlayback(value: boolean): void;

        getSource(): string | null;

        getTTMLRenderingDiv(): HTMLDivElement | null;

        getVttRenderingDiv(): HTMLDivElement | null;

        setTTMLRenderingDiv(div: HTMLDivElement): void;

        setVttRenderingDiv(div: HTMLDivElement): void;

        setStallState(type: MediaType, state: boolean): void;

        isStalled(): boolean;

        stallStream(type: MediaType, isStalled: boolean): void;

        onPlaying(): void;

        getPlaybackQuality(): number;

        play(): void;

        isPaused(): void;

        pause(): void;

        isSeeking(): void;

        getTime(): number | null;

        getPlaybackRate(): number | null;

        getPlayedRanges(): TimeRanges | null;

        getEnded(): boolean | null;

        addEventListener(): void;

        removeEventListener(): void;

        getReadyState(): number;

        getBufferRange(): TimeRanges | null;

        getClientWidth(): number;

        getClientHeight(): number;

        getVideoWidth(): number;

        getVideoHeight(): number;

        getVideoRelativeOffsetTop(): number;

        getVideoRelativeOffsetLeft(): number;

        getTextTracks(): TextTrackList[];

        getTextTrack(kind: TextTrackType, label: string | number | undefined, isTTML: boolean, isEmbedded: boolean): TextTrackInfo | null;

        addTextTrack(kind: TextTrackType, label: string | number | undefined, isTTML: boolean, isEmbedded: boolean): TextTrackInfo;

        appendChild(childElement: any): void;

        removeChild(childElement: any): void;

        waitForReadyState(targetReadyState: number, callback: () => any): void;

    }

    /**
     * Streaming - Net
     **/

    export interface FetchLoader {
        load(httpRequest: HTTPRequest, httpResponse: object): void;

        abort(): void;

        calculateDownloadedTime(downloadedData: any, bytesReceived: any): number | null;

        setup(cfg: object): void;
    }

    export interface HTTPLoader {
        cfg: object;

        setConfig(config: object): void;

        load(config: object): void;

        abort(): void;

        resetInitialSettings(): void;

        reset(): void;
    }

    export interface SchemeLoaderFactory {
        registerLoader(scheme: string, loader: any): void;

        unregisterLoader(scheme: string): void;

        getLoader(url: string): HTTPLoader;

        unregisterAllLoader(): void;

        reset(): void;
    }

    export interface URLLoader {
        load(config: object): any;

        abort(): void;

        resetInitialsettings(): void;

        reset(): void;
    }

    export interface XHRLoader {
        load(httpRequest: HTTPRequest): HTTPRequest;

        abort(request: HTTPRequest): void;

        getXhr(httpRequest: CommonMediaRequest, httpResponse: CommonMediaResponse): boolean;

        resetInitialsettings(): void;

        reset(): void;
    }

    /**
     * Streaming - Protection - Controllers
     **/

    interface ProtectionController {
        initializeForMedia(mediaInfo: MediaInfo): void;

        clearMediaInfoArray(): void;

        handleKeySystemFromManifest(): void;

        createKeySession(keySystemInfo: KeySystemInfo): void;

        loadKeySession(keySystemInfo: KeySystemInfo): void;

        removeKeySession(sessionToken: SessionToken): void;

        closeKeySession(sessionToken: SessionToken): void;

        setServerCertificate(serverCertificate: ArrayBuffer): void;

        setMediaElement(element: HTMLMediaElement): void;

        setSessionType(value: string): void;

        setRobustnessLevel(level: string): void;

        setProtectionData(data: object): void;

        getSupportedKeySystemMetadataFromContentProtection(cps: object[]): object[];

        getKeySystems(): any[];

        setKeySystems(keySystems: KeySystem[]): void;

        updateKeyStatusesMap(e: object): void;

        stop(): void;

        reset(): void;

        areKeyIdsUsable(normalizedKeyIds: Array<string | number>): boolean;

        areKeyIdsExpired(normalizedKeyIds: Array<string | number>): boolean;
    }

    export interface ProtectionKeyController {
        setConfig(config: object): void;

        initialize(): void;

        getKeySystems(): KeySystem[];

        setKeySystems(newKeySystems: KeySystem[]): void;

        getKeySystemBySystemString(systemString: string): KeySystem | null;

        isClearKey(keySystem: KeySystem): boolean;

        initDataEquals(initData1: ArrayBuffer, initData2: ArrayBuffer): boolean;

        getSupportedKeySystemMetadataFromContentProtection(cps: object[], protDataSet: ProtectionDataSet, sessionType: string): object[]; //it says protDataSet but param is marked as protData

        getSupportedKeySystemsFromSegmentPssh(initData: ArrayBuffer, protDataSet: ProtectionDataSet, sessionType: string): object[];

        getLicenseServerModelInstance(keySystem: KeySystem, protData: ProtectionData, messageType: string): any | null; // LicenseServer instead of any

        processClearKeyLicenseRequest(clearKeySystem: KeySystem, ProtectionData: ProtectionData, message: ArrayBuffer): ClearKeyKeySet | null;

        setProtectionData(protectionDataSet: ProtectionDataSet): ProtectionData;
    }

    /**
     * Streaming - Protection - Drm
     **/

    export interface KeySystem {
        systemString: string;
        uuid: string;
        schemeIdURI: string;

        getInitData(cp: object, cencContentProtection: object | null): ArrayBuffer | null;

        getRequestHeadersFromMessage(message: ArrayBuffer): object | null;

        getLicenseRequestFromMessage(message: ArrayBuffer): Uint8Array | null;

        getLicenseServerURLFromInitData(initData: ArrayBuffer): string | null;

        getCDMData(cdmData: string | null): ArrayBuffer | null;

        getSessionId(): string | null;
    }

    export interface KeySystemClearKey {
        uuid: string;
        systemString: string;
        schemeIdURI: string;

        getInitData(cp: object, cencContentProtection: object | null): ArrayBuffer | null;

        getRequestHeadersFromMessage(): object;

        getLicenseRequestFromMessage(message: ArrayBuffer): Uint8Array | null;

        getLicenseServerURLFromInitData(): null;

        getCDMData(): null;

        getClearKeysFromProtectionData(protectionData: ProtectionData, message: ArrayBuffer): ClearKeyKeySet;
    }

    export interface KeySystemPlayReady {
        uuid: string;
        schemeIdURI: string;
        systemString: string;

        getInitData(cpData: object): ArrayBuffer;

        getRequestHeadersFromMessage(message: ArrayBuffer): object;

        getLicenseRequestFromMessage(message: ArrayBuffer): Uint8Array | null;

        getLicenseServerURLFromInitData(initData: ArrayBuffer): string | null;

        getCDMData(cdmData: string | null): ArrayBuffer | null;

        setPlayReadyMessageFormat(format: string): void;
    }

    export interface KeySystemW3CClearKey {
        uuid: string;
        systemString: string;
        schemeIdURI: string;

        getInitData(cp: object): ArrayBuffer | null;

        getRequestHeadersFromMessage(): null;

        getLicenseRequestFromMessage(message: ArrayBuffer): Uint8Array | null;

        getLicenseServerURLFromInitData(): null;

        getCDMData(): null;

        getClearKeysFromProtectionData(protectionData: ProtectionData, message: ArrayBuffer): ClearKeyKeySet;
    }

    export interface KeySystemWidevine {
        uuid: string;
        schemeIdURI: string;
        systemString: string;

        getInitData(cp: object): ArrayBuffer | null;

        getRequestHeadersFromMessage(): null;

        getLicenseRequestFromMessage(message: ArrayBuffer): Uint8Array | null;

        getLicenseServerURLFromInitData(): null;

        getCDMData(): null;
    }

    /**
     * Streaming - Protection - Errors
     **/

    interface ProtectionErrors {
        MEDIA_KEYERR_CODE: 100;
        MEDIA_KEYERR_UNKNOWN_CODE: 101;
        MEDIA_KEYERR_CLIENT_CODE: 102;
        MEDIA_KEYERR_SERVICE_CODE: 103;
        MEDIA_KEYERR_OUTPUT_CODE: 104;
        MEDIA_KEYERR_HARDWARECHANGE_CODE: 105;
        MEDIA_KEYERR_DOMAIN_CODE: 106;
        MEDIA_KEY_MESSAGE_ERROR_CODE: 107;
        MEDIA_KEY_MESSAGE_NO_CHALLENGE_ERROR_CODE: 108;
        SERVER_CERTIFICATE_UPDATED_ERROR_CODE: 109;
        KEY_STATUS_CHANGED_EXPIRED_ERROR_CODE: 110;
        MEDIA_KEY_MESSAGE_NO_LICENSE_SERVER_URL_ERROR_CODE: 111;
        KEY_SYSTEM_ACCESS_DENIED_ERROR_CODE: 112;
        KEY_SESSION_CREATED_ERROR_CODE: 113;
        MEDIA_KEY_MESSAGE_LICENSER_ERROR_CODE: 114;

        MEDIA_KEYERR_UNKNOWN_MESSAGE: 'An unspecified error occurred. This value is used for errors that don\'t match any of the other codes.';
        MEDIA_KEYERR_CLIENT_MESSAGE: 'The Key System could not be installed or updated.';
        MEDIA_KEYERR_SERVICE_MESSAGE: 'The message passed into update indicated an error from the license service.';
        MEDIA_KEYERR_OUTPUT_MESSAGE: 'There is no available output device with the required characteristics for the content protection system.';
        MEDIA_KEYERR_HARDWARECHANGE_MESSAGE: 'A hardware configuration change caused a content protection error.';
        MEDIA_KEYERR_DOMAIN_MESSAGE: 'An error occurred in a multi-device domain licensing configuration. The most common error is a failure to join the domain.';
        MEDIA_KEY_MESSAGE_ERROR_MESSAGE: 'Multiple key sessions were creates with a user-agent that does not support sessionIDs!! Unpredictable behavior ahead!';
        MEDIA_KEY_MESSAGE_NO_CHALLENGE_ERROR_MESSAGE: 'DRM: Empty key message from CDM';
        SERVER_CERTIFICATE_UPDATED_ERROR_MESSAGE: 'Error updating server certificate -- ';
        KEY_STATUS_CHANGED_EXPIRED_ERROR_MESSAGE: 'DRM: KeyStatusChange error! -- License has expired';
        MEDIA_KEY_MESSAGE_NO_LICENSE_SERVER_URL_ERROR_MESSAGE: 'DRM: No license server URL specified!';
        KEY_SYSTEM_ACCESS_DENIED_ERROR_MESSAGE: 'DRM: KeySystem Access Denied! -- ';
        KEY_SESSION_CREATED_ERROR_MESSAGE: 'DRM: unable to create session! --';
        MEDIA_KEY_MESSAGE_LICENSER_ERROR_MESSAGE: 'DRM: licenser error! --';
    }

    /**
     * Streaming - Protection - Models
     **/

    export interface DefaultProtectionModel {
        getAllInitData(): ArrayBuffer[];

        getSessionTokens(): any[]; // Is this MediaSession[] ?

        requestKeySystemAccess(ksConfigurations: object[]): Promise<any>;

        selectKeySystem(keySystemAccess: KeySystemAccess): Promise<any>;

        setMediaElement(mediaElement: HTMLMediaElement): void;

        setServerCertificate(serverCertificate: ArrayBuffer): void;

        createKeySession(ksInfo: KeySystemInfo): any;

        updateKeySession(sessionToken: SessionToken, message: ArrayBuffer): void;

        loadKeySession(ksInfo: KeySystemInfo): void;

        removeKeySession(sessionToken: SessionToken): void;

        closeKeySession(sessionToken: SessionToken): void;

        stop(): void;

        reset(): void;
    }

    export interface ProtectionModel_01b {
        getAllInitData(): ArrayBuffer[];

        getSessionTokens(): any[]; // Is this MediaSession[] ?

        requestKeySystemAccess(ksConfigurations: object[]): Promise<any>;

        selectKeySystem(keySystemAccess: any): Promise<any>;

        setMediaElement(mediaElement: HTMLMediaElement): void;

        createKeySession(ksInfo: KeySystemInfo): any;

        updateKeySession(sessionToken: SessionToken, message: ArrayBuffer): void;

        closeKeySession(sessionToken: SessionToken): void;

        setServerCertificate(): void; // Not supproted

        loadKeySession(): void; // Not supproted

        removeKeySession(): void; // Not supproted

        stop(): void;

        reset(): void;
    }

    export interface ProtectionModel_3Fe2014 {
        getAllInitData(): ArrayBuffer[];

        getSessionTokens(): any[]; // Is this MediaSession[] ?

        requestKeySystemAccess(ksConfigurations: object[]): Promise<any>;

        selectKeySystem(keySystemAccess: any): Promise<any>;

        setMediaElement(mediaElement: HTMLMediaElement): void;

        createKeySession(ksInfo: KeySystemInfo): any;

        updateKeySession(sessionToken: SessionToken, message: ArrayBuffer): void;

        closeKeySession(sessionToken: SessionToken): void;

        setServerCertificate(): void; // Not supproted

        loadKeySession(): void; // Not supproted

        removeKeySession(): void; // Not supproted

        stop(): void;

        reset(): void;
    }

    export interface ProtectionModel {
        getAllInitData(): ArrayBuffer[];

        requestKeySystemAccess(ksConfigurations: object[]): Promise<any>;

        selectKeySystem(keySystemAccess: KeySystemAccess): Promise<any>;

        setMediaElement(mediaElement: HTMLMediaElement): void;

        createKeySession(initData: ArrayBuffer, protData: ProtectionData, sessionType: string): void;

        updateKeySession(sessionToken: SessionToken, message: ArrayBuffer): void;

        closeKeySession(sessionToken: SessionToken): void;

        setServerCertificate(serverCertificate: ArrayBuffer): void;

        loadKeySession(sessionId: string, initData: ArrayBuffer): void;

        removeKeySession(sessionToken: SessionToken): void;

        stop(): void;

        reset(): void;
    }

    /**
     * Streaming - Protection - Server
     **/

    export interface ClearKey {
        getServerURLFromMessage(url: string): string;

        getHTTPMethod(): 'POST';

        getResponseType(): 'json';

        getLicenseMessage(serverResponse: object): ClearKeyKeySet;

        getErrorResponse(serverResponse: object): string;
    }

    export interface DRMToday {
        getServerURLFromMessage(url: string): string;

        getHTTPMethod(): 'POST';

        getResponseType(keySystemStr: string): string;

        getLicenseMessage(serverResponse: object, keySystemStr: string): any;

        getErrorResponse(serverResponse: object): string;
    }

    export interface LicenseServer {
        getServerURLFromMessage(url: string, message: ArrayBuffer, messageType: string): string;

        getHTTPMethod(messageType: string): string;

        getResponseType(keySystemStr: string, messageType: string): string;

        getLicenseMessage(serverResponse: object, keySystemStr: string): ArrayBuffer | null;

        getErrorResponse(serverResponse: object): string;
    }

    export interface PlayReady {
        getServerURLFromMessage(url: string): string;

        getHTTPMethod(): 'POST';

        getResponseType(): 'arraybuffer';

        getLicenseMessage(serverResponse: object): any;

        getErrorResponse(serverResponse: object): string;
    }

    export interface Widevine {
        getServerURLFromMessage(url: string): string;

        getHTTPMethod(): 'POST';

        getResponseType(): 'arraybuffer';

        getLicenseMessage(serverResponse: object): object;

        getErrorResponse(serverResponse: object): string;
    }

    /**
     * Streaming - Protection - Vo
     **/

    export interface ClearKeyKeySet {
        keyPairs: KeyPair[];
        type: string;
    }

    export class KeyMessage {
        constructor(sessionToken: SessionToken, message: ArrayBuffer, defaultURL: string, messageType?: string);

        sessionToken: SessionToken;
        message: ArrayBuffer;
        defaultURL: string;
        messageType: string;
    }

    export class KeyPair {
        constructor(keyId: string, key: string)

        keyId: string;
        key: string;
    }

    export class KeySystemAccess {
        constructor(keySystem: KeySystem, ksConfiguration: KeySystemConfiguration)

        keySystem: KeySystem;
        ksConfiguration: KeySystemConfiguration;
        nativeMediaKrxSystemAccessObject: object | null;
        selectedSystemString: string | null;
    }

    export class KeySystemConfiguration {
        constructor(audioCapabilities: MediaCapability[], videoCapabilities: MediaCapability[], distinctiveIdentifier: string, persistentState: string, sessionTypes: string[])

        audioCapabilities: MediaCapability[];
        videoCapabilities: MediaCapability[];
        distinctiveIdentifier: string;
        persistentState: string;
        sessionTypes: string[];
    }

    export class KeySystemMetadata {
        constructor(config: object);

        config: object;
    }

    export class LicenseRequest {
        constructor(url: string, method: string, responseType: string, headers: {
            [key: string]: string
        }, withCredentials: boolean, messageType: string, sessionId: string, data: ArrayBuffer)

        url: string;
        method: string;
        responseType: string;
        headers: { [key: string]: string };
        withCredentials: boolean;
        messageType: string;
        sessionId: string;
        data: ArrayBuffer;
    }

    export class LicenseRequestComplete {
        constructor(message: Uint8Array, sessionToken: SessionToken, messageType: string)

        message: Uint8Array;
        sessionToken: SessionToken;
        messageType: string;
    }

    export class LicenseResponse {
        constructor(url: string, headers: object, data: ArrayBuffer)

        url: string;
        headers: object;
        data: ArrayBuffer;
    }

    export class MediaCapability {
        constructor(contentType: string, robustness: string)

        contentType: string;
        robustness: string;
    }

    export class NeedKey {
        constructor(initData: ArrayBuffer, initDataType: string)

        initData: ArrayBuffer;
        initDataType: string;
    }

    export interface ProtectionDataSet {
        [keySystemName: string]: ProtectionData;
    }

    export interface ProtectionData {
        /**
         * A license server URL to use with this key system.
         * When specified as a string, a single URL will be used regardless of message type.
         * When specified as an object, the object will have property names for each message
         * type with the corresponding property value being the URL to use for
         * messages of that type
         */
        serverURL?: string | { [P in MediaKeyMessageType]: string };

        /** HTTP headers to add to the license request */
        httpRequestHeaders?: object;

        /** Wether license request is made using credentials */
        withCredentials?: Boolean;

        /** Timeout (in ms) for the license requests */
        httpTimeout?: number;

        /** The licenser server certificate as a BASE64 string representation of the binary stream (see https://www.w3.org/TR/encrypted-media/#dom-mediakeys-setservercertificate) */
        serverCertificate?: string;

        /** The audio robustness level (see https://www.w3.org/TR/encrypted-media/#dom-mediakeysystemmediacapability-robustness) */
        audioRobustness?: string;

        /** The video robustness level (see https://www.w3.org/TR/encrypted-media/#dom-mediakeysystemmediacapability-robustness) */
        videoRobustness?: string;

        /** Distinctive identifier (see https://www.w3.org/TR/encrypted-media/#dom-mediakeysystemconfiguration-distinctiveidentifier) */
        distinctiveIdentifier?: string;

        /** The session type (see https://www.w3.org/TR/encrypted-media/#dom-mediakeysessiontype) */
        sessionType?: string;

        /** The session id (see https://www.w3.org/TR/encrypted-media/#session-id) */
        sessionId?: string;

        /**
         * Defines a set of clear keys that are available to the key system.
         * Object properties are base64-encoded keyIDs (with no padding).
         * Corresponding property values are keys, base64-encoded (no padding).
         */
        clearkeys?: { [key: string]: string };

        /** Priority level of the key system to be selected (0 is the highest prority, -1 for undefined priority) */
        priority?: number;
    }

    export interface SessionToken {
        session: MediaKeySession;
        initData: any;

        getSessionId(): string;

        getExpirationTime(): number;

        getKeyStatuses(): MediaKeyStatusMap;

        getSessionType(): string;
    }

    /**
     * Streaming - Protection
     **/

    export interface ProtectionEvents extends EventsBase {
        KEY_ADDED: 'public_keyAdded';
        KEY_ERROR: 'public_keyError';
        KEY_MESSAGE: 'public_keyMessage';
        KEY_SESSION_CLOSED: 'public_keySessionClosed';
        KEY_SESSION_CREATED: 'public_keySessionCreated';
        KEY_SESSION_REMOVED: 'public_keySessionRemoved';
        KEY_STATUSES_CHANGED: 'public_keyStatusesChanged';
        KEY_SYSTEM_ACCESS_COMPLETE: 'public_keySystemAccessComplete';
        KEY_SYSTEM_SELECTED: 'public_keySystemSelected';
        LICENSE_REQUEST_COMPLETE: 'public_licenseRequestComplete';
        LICENSE_REQUEST_SENDING: 'public_licenseRequestSending';
        NEED_KEY: 'needkey';
        PROTECTION_CREATED: 'public_protectioncreated';
        PROTECTION_DESTROYED: 'public_protectiondestroyed';
        SERVER_CERTIFICATE_UPDATED: 'serverCertificateUpdated';
        TEARDOWN_COMPLETE: 'protectionTeardownComplete';
        VIDEO_ELEMENT_SELECTED: 'videoElementSelected';
        KEY_SESSION_UPDATED: 'public_keySessionUpdated';
    }

    export interface CommonEncryption {
        // Does not export anything
    }

    export interface Protection {
        createProtectionSystem(config: object): void;
    }

    export namespace Protection {
        export const events: ProtectionEvents;
        export const errors: ProtectionErrors;
    }

    /**
     * Streaming - Rules - ABR - LolP
     */

    export interface LearningAbrController {
        getNextoQuality(mediaInfo: MediaInfo, throughput: number, latency: number, bufferSize: number, playbackRate: number, currentQualityIndex: number, dynamicWeightSelector: object): any | null;

        reset(): void;
    }

    export interface LoLpQoEEvaluator {
        setupPerSegmentQoe(sDuration: number, maxBrKbps: number, minBrKbs: number): void;

        logSegmentMetrics(segmentBitrate: number, segmentRebufferTime: number, currentLatency: number, currentPlaybackSpeed: number): void;

        getPerSegmentQoe(): QoeInfo;

        calculateSingleUseQoe(segmentBitrate: number, segmentRebufferTime: number, currentLatency: number, currentPlaybackSpeed: number): number;

        reset(): void;
    }

    export interface LoLpRule {
        getSwitchRequest(rulesContext: RulesContext): SwitchRequest;

        reset(): void;
    }

    export interface LoLpWeightSelector {
        getMinBuffer(): number;

        getSegmentDuration(): number;

        getNextBufferWithBitrate(bitrateToDownload: number, currentBuffer: number, currentThroughput: number): number;

        getNextBuffer(currentBuffer: number, downloadTime: number): number;

        findWeightVector(neurons: any[], currentLatency: number, currentBuffer: number, currentRebuffer: number, currentThroughput: number, playbackRate: number): number | null;
    }

    export class QoeInfo {
        type: string | null;
        lastBitrate: number | null;
        weights: {
            bitrateReward: number | null,
            bitrateSwitchPenalty: number | null,
            rebufferPenalty: number | null,
            latencyPenalty: number | null,
            playbackSpeedPenalty: number | null
        };
        bitrateWSum: number;
        bitrateSwitchSum: number;
        rebufferWSum: number;
        latencyWSum: number;
        playbackSpeedWSum: number;
        totalQoe: number;

    }

    /**
     * Streaming - Rules -Abr
     **/

    export interface AbandonRequestsRule {
        shouldAbandon(rulesContext: RulesContext): SwitchRequest;

        reset(): void;
    }

    export interface ABRRulesCollection {
        initialize(): void;

        getMinSwitchRequest(srArray: any[]): SwitchRequest;

        getBestPossibleSwitchRequest(rulesContext: RulesContext): SwitchRequest;

        shouldAbandonFragment(rulesContext: RulesContext, streamId: string): SwitchRequest;

        getQualitySwitchRules(): any[];

        reset(): void;

        clearDataForStream(streamId: string | number): void;

        getQualitySwitchRules(): object;

        getabandonFragmentRules(): object;

        setBolaState(mediaType: MediaType, value: string): void;

        getBolaState(mediaType: MediaType): string;
    }

    export interface BolaRule {
        getSwitchRequest(rulesContext: RulesContext): SwitchRequest;

        reset(): void;
    }

    export interface DroppedFramesRule {
        getSwitchRequest(rulesContext: RulesContext): SwitchRequest;
    }

    export interface InsufficientBufferRule {
        getSwitchRequest(rulesContext: RulesContext): SwitchRequest;

        reset(): void;
    }

    export interface L2ARule {
        getSwitchRequest(rulesContext: RulesContext): SwitchRequest;

        reset(): void;
    }

    export interface SwitchHistoryRule {
        getSwitchRequest(rulesContext: RulesContext): SwitchRequest;
    }

    export interface ThroughputRule {
        getSwitchRequest(rulesContext: RulesContext): SwitchRequest;

        reset(): void;
    }

    /**
     * Streaming - Rules
     **/

    export interface DroppedFramesHistory {
        push(streamId: string, index: number, playbackQuality: number): void;

        getFrameHistory(streamId: string): object;

        clearDataForStream(streamId: string): void;

        reset(): void;
    }

    export interface RulesContext {
        getMediaType(): string;

        getMediaInfo(): MediaInfo;

        getDroppedFramesHistory(): DroppedFramesHistory;

        getCurrentRequest(): SwitchRequest;

        getSwitchHistory(): SwitchRequestHistory; //pot. just Switch History

        getStreamInfo(): StreamInfo;

        getScheduleController(): ScheduleController;

        getThroughputController(): ThroughputController;

        getAbrController(): AbrController;

        getRepresentation(): Representation;

        getVideoModel(): VideoModel;
    }

    export interface SwitchRequest {
        representation: Representation;
        priority: number | null;
        reason: string | null;
        rule: any
    }

    export interface SwitchRequestHistory {
        push(switchRequest: SwitchRequest): void;

        getSwitchRequests(): SwitchRequest[];

        clearForStream(streamId: string | number): object;

        reset(): void;
    }

    /**
     * Streaming - Text
     **/

    export type TextTrackType = 'subtitles' | 'caption' | 'descriptions' | 'chapters' | 'metadata';

    export type FontDownloadStatus = 'unloaded' | 'loaded' | 'error';

    export interface FontInfo {
        fontFamily: string;
        url: string;
        mimeType: string;
        trackId: number;
        streamId: string;
        isEssential: boolean;
        status: FontDownloadStatus;
        fontFace: FontFace;
    }

    export interface DVBFonts {
        addFontsFromTracks(tracks: TextTrackInfo, streamId: string): void;

        downloadFonts(): void;

        getFonts(): FontInfo[];

        getFontsForTrackId(trackId: number): FontInfo[];

        reset(): void;
    }

    export interface EmbeddedTextHtmlRender {
        createHTMLCaptionsFromScreen(videoElement: HTMLVideoElement, startTime: number, endTime: number, captionScreen: any): any[];
    }

    export interface NotFragmentTextBufferController {
        initialize(source: MediaSource): void;

        getStreamId(): string;

        getType(): string;

        getBufferControllerType(): string;

        createBufferSink(mediaInfo: MediaInfo): void;

        dischargePreBuffer(): void; // DECLARED AND EXPORTED BUT NOT IMPLEMENTED

        getBuffer(): SourceBufferSink;

        getBufferLevel(): 0;

        getRangeAt(): null;

        hasBufferAtTime(): boolean; // DECLARED AND EXPORTED BUT ALWAYS RETURNS TRUE

        getAllRangesWithSafetyFactor(): [];

        getContinuousBufferTimeForTargetTime(): number;

        setMediaSource(value: MediaSource): void;

        getMediaSource(): MediaSource;

        appendInitSegmentFromCache(representationId: string): void;

        getIsBufferingCompleted(): boolean;

        setIsBufferingCompleted(value: boolean): void;

        getIsPruningInProgress(): false;

        reset(): void;

        clearBuffers(): Promise<any>;

        pruneBuffer(): void; // DECLARED AND EXPORTED BUT NOT IMPLEMENTED

        prepareForPlaybackSeek(): Promise<any>;

        prepareForReplacementTrackSwitch(): Promise<any>;

        setSeekTarget(): void; // DECLARED AND EXPORTED BUT NOT IMPLEMENTED

        updateAppendWindow(): Promise<any>;

        pruneAllSafely(): Promise<any>;

        updateBufferTimestampOffset(): Promise<any>;

        segmentRequestingCompleted(): void // DECLARED AND EXPORTED BUT NOT IMPLEMENTED
    }

    export interface TextController {
        deactivateStream(streamInfo: StreamInfo): void;

        initialize(): void;

        initializeForStream(streamInfo: StreamInfo): void;

        createTracks(streamInfo: StreamInfo): void;

        getTextSourceBuffer(streamInfo: StreamInfo): TextSourceBuffer;

        getAllTracksAreDisabled(): boolean;

        addEmbeddedTrack(streamInfo: StreamInfo, mediaInfo: MediaInfo): void;

        enableText(streamId: string, enable: boolean): void;

        isTextEnabled(): boolean;

        setTextTrack(streamId: string, idx: number): void;

        getCurrentTrackIdx(streamId: string): number;

        enableForcedTextStreaming(enable: boolean): void;

        addMediaInfosToBuffer(streamInfo: StreamInfo, mInfos: MediaInfo[], mimeType: string | null, fragmentModel?: FragmentModel): void;

        reset(): void;
    }

    export interface TextSourceBuffer {
        initialize(): void;

        addMediaInfos(type: string, mInfos: MediaInfo[], fModel: FragmentModel): void;

        resetMediaInfos(): void;

        getStreamId(): string;

        append(bytes: number[], chunk: DataChunk): void;

        abort(): void; // DECLARED AND EXPORTED BUT NOT IMPLEMENTED

        addEmbeddedTrack(mediaInfo: MediaInfo): void;

        resetEmbedded(): void;

        getConfig(): object;

        setCurrentFragmentedTrackIdx(idx: number): void;

        remove(start?: number, end?: number): void;

        reset(): void;
    }

    export interface TextTracks {
        initialize(): void;

        getStreamId(): string;

        createTracks(): void;

        addTextTrack(textTrackInfoVO: TextTrackInfo): void;

        addCaptions(trackIdx: number, timeOffset: number, captionData: object): void;

        manualProcessing(time: number): void;

        disableManualTracks(): void;

        getTrackByIdx(idx: number): object;

        getCurrentTrackIdx(): number;

        setCurrentTrackIdx(idx: number): void;

        getTrackIdxForId(trackId: string): number;

        getCurrentTrackInfo(): TextTrackInfo;

        setModeForTrackIdx(idx: number, mode: string): void;

        deleteCuesFromTrackIdx(trackIdx: number, start: number, end: number): void;

        deleteAllTextTracks(): void;
    }

    /**
     * Streaming - Thumbnail
     **/

    export interface ThumbnailController {
        initialize(): void;

        getStreamId(): string;

        provide(time: number, callback: Function): void;

        setTrackByIndex(index: number): void;

        setTrackById(id: number): void;

        getCurrentTrackIndex(): number;

        getCurrentTrack(): object;

        getPossibleVoRepresentations(): Representation[];

        reset(): void;
    }

    export interface ThumbnailTracks {
        getTracks(): any[];

        addTracks(): void;

        reset(): void;

        setTrackByIndex(index: number): void;

        setTrackById(id: number): void;

        getCurrentTrack(): any | null;

        getCurrentTrackIndex(): number;

        getRepresentations(): Representation[];

        getThumbnailRequestForTime(time: number): Request;
    }

    /**
     * Streaming - Utils - baseUrlResolution
     **/

    export interface BasicSelector {
        select(baseURLs: BaseURL[]): BaseURL;
    }

    export interface ContentSteeringSelector {
        setConfig(config: object): void;

        selectBaseUrlIndex(data: any): number;

        reset(): void;
    }

    export interface DVBSelector {
        select(baseURLs: BaseURL[]): BaseURL[];
    }

    /**
     * Streaming - Utils
     **/

    export interface BaseURLSelector {
        chooseSelector(isDVB: boolean): void;

        select(data: ArrayBuffer): void;

        reset(): void;

        setConfig(config: object): void;
    }

    export interface BoxParser {
        parse(data: ArrayBuffer): IsoFile | null;

        findLastTopIsoBoxCompleted(types: string[], buffer: ArrayBuffer | Uint8Array, offset: number): IsoBoxSearchInfo;

        getMediaTimescaleFromMoov(ab: ArrayBuffer): number;

        getSamplesInfo(ab: ArrayBuffer): object;

        findInitRange(data: ArrayBuffer): Range;

        parsePayload(types: string[], buffer: ArrayBuffer, offset: number): IsoBoxSearchInfo;
    }

    export interface Capabilities {
        supportsMediaSource(): boolean;

        setConfig(config: object): void;

        setProtectionController(data: any): void;

        areKeyIdsUsable(mediaInfo: MediaInfo): boolean;

        areKeyIdsExpired(mediaInfo: MediaInfo): boolean;

        isProtectionCompatible(previousStreamInfo: StreamInfo, newStreamInfo: StreamInfo): boolean;

        supportsEncryptedMedia(): boolean;

        supportsChangeType(): boolean;

        setEncryptedMediaSupported(value: boolean): void;

        runCodecSupportCheck(basicConfiguration: object, type: string): Promise<void>;

        isCodecSupportedBasedOnTestedConfigurations(basicConfiguration: object, type: string): boolean;

        supportsEssentialProperty(ep: object): boolean;

        codecRootCompatibleWithCodec(codec1: string, codec2: string): boolean;
    }

    export interface CapabilitiesFilter {
        setConfig(config: object): void;

        filterUnsupportedFeatures(manifest: object): Promise<any>;
    }

    export interface CustomTimeRanges {
        customTimeRangeArray: any[];
        length: number;

        add(start: number, end: number): void;

        clear(): void;

        remove(start: number, end: number): void;

        mergeRanges(rangeIndex1: number, rangeIndex2: number): boolean;

        start(index: number): number;

        end(index: number): number;
    }

    export interface DefaultURLUtils {
        parseBaseUrl(url: string): string;

        parseOrigin(url: string): string;

        parseScheme(url: string): string;

        isRelative(url: string): boolean;

        isPathAbsolute(url: string): boolean;

        isSchemeRelative(url: string): boolean;

        isHTTPURL(url: string): boolean;

        isHTTPS(url: string): boolean;

        removeHostname(url: string): string;

        resolve(url: string, baseUrl: BaseURL): string;
    }

    export interface DOMStorage {
        getSavedBitrateSettings(type: string): number;

        setSavedBitrateSettings(type: string, bitrate: number): void;

        getSavedMediaSettings(type: string): object;

        setSavedMediaSettings(type: string, value: any): void;
    }

    export interface EBMLParser {
        getPos(): number;

        setPos(value: number): void;

        consumeTag(tag: object, test: boolean): boolean;

        consumeTagAndSize(tag: object, test: boolean): boolean;

        parseTag(tag: object): boolean;

        skipOverElement(tag: object, test: boolean): boolean;

        getMatroskaCodedNum(retainMSB: boolean): number;

        getMatroskaFloat(size: number): number;

        getMatroskaUint(size: number): number;

        moreData(): boolean;
    }

    export interface ErrorHandler {
        error(err: any): void;
    }

    export interface InitCache {
        save(chunk: DataChunk): void;

        extract(streamId: string, representationId: string): any | null;

        reset(): void;
    }

    export interface IsoFile {
        getBox(type: string): IsoBox;

        getBoxes(type: string): IsoBox[];

        setData(value: string): void;

        getLastBox(): IsoBox | null;
    }

    export interface LocationSelector { // DOUBLED UP?
        selectBaseUrlIndex(data: any): number;

        setConfig(config: object): void;
    }

    export interface LocationSelector {
        select(mpdLocations: MpdLocation[]): MpdLocation | null;

        reset(): void;

        setConfig(config: object): void;
    }

    export interface ObjectUtils {
        areEqual(obj1: object, obj2: object): boolean;
    }

    export interface SupervisorTools { // BASE FILE DIFFERENT LAYOUT FROM ALL OTHERS
        checkParameterType(parameter: any, type: string): void;

        checkInteger(parameter: any): void;

        checkRange(parameter: any, min: number, max: number): void;

        checkIsVideoOrAudioType(type: string): void;
    }

    export interface TimeUtils {
        ntpToUTC(ntpTimeStamp: number): number;
    }

    export interface TTMLParser {
        parse(data: string, offsetTime: number, startTimeSegment: number, endTimeSegment: number, images: any[]): {
            start: number,
            end: number,
            type: string,
            cueID: string,
            isd: any,
            images: any[],
            embeddedImages: any[]
        }[];
    }

    export interface URLUtils {
        registerUrlRegex(regex: RegExp, utils: object): void;

        parseBaseUrl(url: string): string;

        parseOrigin(url: string): string;

        parseScheme(url: string): string;

        isRelative(url: string): boolean;

        isPathAbsolute(url: string): boolean;

        isSchemeRelative(url: string): boolean;

        isHTTPURL(url: string): boolean;

        isHTTPS(url: string): boolean;

        removeHostname(url: string): string;

        resolve(url: string, baseUrl: BaseURL): string;
    }

    export interface VttCsutomRenderingParser {
        parse(data: any): any[];
    }

    export interface VTTParser {
        parse(data: ArrayBuffer): { start: number, end: number, data: string, styles: any };

        getCaptionStyles(arr: Array<any>): object;
    }

    /**
     * Streaming - Vo - Metrics
     **/

    export interface BufferLevel {
        level: number;
        t: Date;
    }

    export interface BufferState {
        state: string;
        target: number;
    }

    export interface DroppedFrames {
        droppedFrames: number;
        time: Date;
    }

    export interface DVRInfo {
        manifestInfo: IManifestInfo;
        range: Range;
        time: number;
    }

    export interface HTTPRequest {
        tcpid: string | null;
        type?: string | null;
        url: string | null;
        actualurl: string | null;
        range: any[];
        trequest: Date | null;
        tresponse: Date | null;
        responsecode: number | null;
        interval: number | null;
        trace: any[];
        cmsd: object;
        _stream: MediaType;
        _tfinish: Date | null;
        _mediaduration: number | null;
        _quality: number | null;
        _responseHeaders: any[] | null;
        _serviceLocation: string | null;
        _fileLoaderType: string;
        _resourceTimingValues: object;
    }

    export interface ManifestUpdate {
        mediaType: MediaType | null;
        type: string | null;
        requestTime: number | null;
        fetchTime: number | null;
        availabilityStartTime: number | null;
        presentationStartTime: number;
        clientTimeOffset: number;
        currentTime: number | null;
        buffered: object | null;
        latency: number;
        streamInfo: StreamInfo[];
        representationInfo: ManifestUpdateRepresentationInfo[];

    }

    export interface ManifestUpdateRepresentationInfo {
        id: string | null;
        index: number | null;
        mediaType: MediaType | null;
        presentationTimeOffset: number | null;
        startNumber: number | null;
    }

    export interface PlayList {
        start: number | null;
        mstart: number | null;
        starttype: string | null;
        trace: any[];
    }

    export interface RepresentationSwitch {
        t: number | null;
        mt: number | null;
        to: number | null;
        lto: number | null;
    }

    export interface PlayListTrace {
        representationid: string | null;
        subreplevel: number | null;
        start: number | null;
        mstart: number | null;
        duration: number | null;
        playbackspeed: number | null;
        stopreason: string | null;
    }

    export interface RequestSwitch {
        t: number | null;
        mt: number | null;
        to: string | null;
        lto: string | null;
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

    //eg. duration initialized with null; should be NaN?
    export interface SchedulingInfo {
        mediaType: MediaType | null;
        t: number | null;
        type: string | null;
        startTime: number | null;
        availabilityStartTime: number | null;
        duration: number | null;
        quality: number | null;
        range: Range | null;
        state: string | null;
    }

    export interface TCPConnection {
        tcpid: string | null;
        dest: string | null;
        topen: number | null;
        tclose: number | null;
        tconnect: number | null
    }

    /**
     * Streaming - Vo
     */

    export class BitrateInfo {
        mediaType: MediaType;
        bitrate: number;
        width: number;
        height: number;
        scanType: string;
        qualityIndex: number;
    }

    interface DashJSError {
        code: number | null;
        message: string | null;
        data: unknown | null;
    }

    export interface DataChunk {
        streamId: string | null;
        mediaInfo: MediaInfo | null;
        segmentType: string | null;
        quality: number;
        index: number;
        bytes: number[] | null;
        start: number;
        end: number;
        duration: number;
        representationId: string | null;
        endFragment: object | null;
    }

    export class FragmentRequest {
        constructor(url: string);

        action: string;
        availabilityEndTime: number;
        availabilityStartTime: number;
        bytesLoaded: number;
        bytesTotal: number;
        delayLoadingTime: number;
        duration: number;
        firstByteDate: Date;
        index: number;
        mediaInfo: MediaInfo;
        mediaStartTime: number;
        mediaType: MediaType;
        quality: number;
        representationId: string;
        startDate: Date;
        requestEndDate: Date | null;
        responseType: string;
        serviceLocation: string;
        startTime: number;
        timescale: number;
        type: 'InitializationSegment' | 'MediaSegment' | null;
        url: string | null;
        wallStartTime: number | null;
    }

    export class HeadRequest extends FragmentRequest {
        constructor(url: string);

        checkforExistenceOnly: boolean;
    }

    export class HttpLoaderRequest {
        url: string;
        method: string;
        withCredentials: boolean;
        request: FragmentRequest;
        onload: Function;
        onloadend: Function;
        onerror: Function;
        progress: Function;
        ontimeout: Function;
        loader: object;
        timeout: number;
        headers: object;
        response: object;
        reader: object;
    }

    export class IsoBox {
        constructor(boxData: object);
    }

    export class IsoBoxSearchInfo {
        constructor(lastCompletedOffset: number, found: boolean, size: number);

        lastCompletedOffset: number;
        found: boolean;
        size: number;
    }

    export class MetricsList {
        BufferLevel: BufferLevel[];
        BufferState: BufferState[];
        DVBErrors: DVBErrors[];
        DVRInfo: DVRInfo[];
        DroppedFrames: DroppedFrames[];
        HttpList: any[];
        ManifestUpdate: ManifestUpdate[];
        PlayList: PlayList[];
        RepSwitchList: RequestSwitch[];
        RequestsQueue: RequestsQueue | null;
        SchedulingInfo: SchedulingInfo;
        TcpList: TCPConnection[];
    }

    export class MediaInfoSelectionInput {
        newMediaInfo: MediaInfo;
        previouslySelectedRepresentation: Representation | null;
        newRepresentation: Representation | null
    }

    export class TextRequest extends FragmentRequest {
        constructor(url: string, type: string);

        url: string | null;
        type: 'InitializationSegment' | 'MediaSegment' | null;
        mediaType: MediaType;
        responseType: string;
    }

    export class TextTrackInfo extends MediaInfo {
        captionData: CaptionData[] | null;
        label: string | null;
        defaultTrack: boolean;
        kind: string;
        isFragmented: boolean;
        isEmbedded: boolean;
        isTTML: boolean;
    }

    export interface Thumbnail {
        url: string;
        width: number;
        height: number;
        x: number;
        y: number;
    }

    export interface ThumbnailTrackInfo {
        bitrate: number;
        width: number;
        height: number;
        tilesHor: number;
        tilesVert: number;
        widthPerTile: number;
        heightPerTile: number;
        startNumber: number;
        segmentDuration: number;
        timescale: number;
        templateUrl: string;
        id: string;
    }

    export interface URIFragmentData {
        t: number | null;
        xywh: any | null;
        track: any | null;
        id: string | null;
        s: any | null;
        r: any | null;
    }

    /**
     * Streaming
     **/

    export interface FragmentLoader {
        checkForExistence(request: Request): void;

        load(request: Request): void;

        abort(): void;

        resetInitialSettings(): void;

        reset(): void;
    }

    export interface FragmentSink {
        append(chunk: DataChunk): void;

        remove(start?: number, end?: number): void;

        abort(): void;

        getAllBufferRanges(): any[];

        reset(): void;
    }

    export interface ManifestLoader {
        load(url: string, serviceLocation: string | null, queryParams: object | null): void;

        reset(): void;
    }

    export interface ManifestUpdater {
        initialize(): void;

        setManifest(manifest: object): void;

        refreshManifest(ignorePatch?: boolean): void;

        getIsUpdating(): boolean;

        setConfig(config: object): void;

        reset(): void;
    }

    export namespace MediaPlayer {
        export const events: MediaPlayerEvents;
        export const errors: MediaPlayerErrors;
    }

    export interface MediaPlayerFactory {
        create(): MediaPlayerClass;
    }

    export function MediaPlayer(): MediaPlayerFactory;

    export interface PreBufferSink {
        getAllBufferRanges(): TimeRanges;

        append(chunk: DataChunk): void;

        remove(start: number, end: number): void;

        abort(): void; // DECLARED AND EXPORTED BUT NOT IMPLEMENTED

        discharge(start?: number, end?: number): void;

        reset(): void;

        updateTimestampOffset(): void; // DECLARED AND EXPORTED BUT NOT IMPLEMENTED

        waitForUpdateEnd(callback: Function): void;

        getBuffer(): PreBufferSink;
    }

    export interface SourceBufferSink {
        getType(): string;

        getAllBufferRanges(): object;

        getBuffer(): Buffer;

        append(chunk: DataChunk, request?: Request): Promise<any>;

        remove(range: Range): Promise<any>;

        abort(): Promise<any>;

        reset(): void;

        updateTimestampOffset(mseTimeOffset: number): void;

        initializeForStreamSwitch(mInfo: MediaInfo, selectedRepresentation: Representation, oldSourceBufferSink: SourceBufferSink): Promise<any>;

        initializeForFirstUse(streamInfo: StreamInfo, mInfo: MediaInfo, selectedRepresentation: Representation): void;

        updateAppendWindow(sInfo: StreamInfo): void;

        changeType(codec: string): Promise<any>;

        getSessionType(): string;

        getUsable(): boolean;
    }

    export interface Stream {
        initialize(streamInfo: StreamInfo, protectionController: ProtectionController): void;

        getStreamId(): string;

        activate(mediaSource: MediaSource, previousBufferSinks: any[]): void;

        deactivate(keepBuffers: boolean): void;

        getIsActive(): boolean;

        getDuration(): number;

        getStartTime(): number;

        getId(): string;

        getStreamInfo(): StreamInfo | null;

        getHasAudioTrack(): boolean;

        getHasVideoTrack(): boolean;

        startPreloading(mediaSource: MediaSource, previousBuffers: any[], representationsFromPreviousPeriod: Representation[]): void;

        getThumbnailController(): object;

        updateData(updatedStreamInfo: StreamInfo): void;

        reset(): void;

        getStreamProcessors(): any[];

        setMediaSource(mediaSource: MediaSource): void;

        isMediaCodecCompatible(newStream: Stream, previousStream: Stream | null): boolean;

        isProtectionCompatible(newStream: Stream): boolean

        getPreloaded(): boolean

        getIsEndedEventSignaled(): boolean

        setIsEndedEventSignaled(value: boolean): void

        getAdapter(): DashAdapter

        getHasFinishedBuffering(): boolean

        startScheduleControllers(): void

        prepareTrackChange(e: object): void

        prepareQualityChange(e: object): void
    }

    export interface StreamProcessor {
        initialize(mediaSource: MediaSource, hasVideoTrack: boolean, isFragmented: boolean): void;

        getStreamId(): string;

        getType(): string;

        isUpdating(): boolean;

        getBufferController(): BufferController;

        getFragmentModel(): FragmentModel;

        getScheduleController(): ScheduleController;

        getRepresentationController(): RepresentationController;

        getVoRepresentation(quality: number): Representation;

        getBufferLevel(): number;

        isBufferingCompleted(): boolean;

        createBufferSinks(previousBufferSinks: any[]): Promise<any>;

        updateStreamInfo(newStreamInfo: StreamInfo): Promise<any>;

        getStreamInfo(): StreamInfo;

        selectMediaInfo(selectionInput: object): Promise<any>;

        clearMediaInfoArray(): void;

        addMediaInfo(newMediaInfo: MediaInfo): void;

        prepareTrackSwitch(previousBufferSinks: any[]): Promise<any>;

        prepareQualityChange(e: object): void;

        getMediaInfo(): MediaInfo;

        getMediaSource(): MediaSource;

        setMediaSource(mediaSource: MediaSource): void;

        getBuffer(): Buffer;

        setExplicitBufferingTime(value: number): void;

        finalisePlayList(time: number, reason: string): void;

        probeNextRequest(): Request;

        prepareInnerPeriodPlaybackSeeking(e: object): Promise<any>;

        prepareOuterPeriodPlaybackSeeking(): Promise<unknown>;

        reset(errored: boolean, keepBuffers: boolean): void;
    }

    export interface Constants {
        STREAM: 'stream';
        VIDEO: 'video';
        AUDIO: 'audio';
        TEXT: 'text';
        MUXED: 'muxed';
        IMAGE: 'image';
        STPP: 'stpp';
        TTML: 'ttml';
        VTT: 'vtt';
        WVTT: 'wvtt';
        CONTENT_STEERING: 'contentSteering';
        LIVE_CATCHUP_MODE_DEFAULT: 'liveCatchupModeDefault';
        LIVE_CATCHUP_MODE_LOLP: 'liveCatchupModeLoLP';
        MOVING_AVERAGE_SLIDING_WINDOW: 'slidingWindow';
        MOVING_AVERAGE_EWMA: 'ewma';
        BAD_ARGUMENT_ERROR: 'Invalid Arguments';
        MISSING_CONFIG_ERROR: 'Missing config parameter(s)';
        TRACK_SWITCH_MODE_ALWAYS_REPLACE: 'alwaysReplace';
        TRACK_SWITCH_MODE_NEVER_REPLACE: 'neverReplace';
        TRACK_SELECTION_MODE_FIRST_TRACK: 'firstTrack';
        TRACK_SELECTION_MODE_HIGHEST_BITRATE: 'highestBitrate';
        TRACK_SELECTION_MODE_HIGHEST_EFFICIENCY: 'highestEfficiency';
        TRACK_SELECTION_MODE_WIDEST_RANGE: 'widestRange';
        TRACK_SELECTION_MODE_HIGHEST_SELECTION_PRIORITY: 'highestSelectionPriority';
        CMCD_MODE_QUERY: 'query';
        CMCD_MODE_HEADER: 'header';
        INITIALIZE: 'initialize';
        TEXT_SHOWING: 'showing';
        TEXT_HIDDEN: 'hidden';
        CC1: 'CC1';
        CC3: 'CC3';
        UTF8: 'utf-8';
        SCHEME_ID_URI: 'schemeIdUri';
        START_TIME: 'starttime';
        SERVICE_DESCRIPTION_DVB_LL_SCHEME: 'urn:dvb:dash:lowlatency:scope:2019';
        SUPPLEMENTAL_PROPERTY_DVB_LL_SCHEME: 'urn:dvb:dash:lowlatency:critical:2019';
        XML: 'XML';
        ARRAY_BUFFER: 'ArrayBuffer';
        DVB_REPORTING_URL: 'dvb:reportingUrl';
        DVB_PROBABILITY: 'dvb:probability';
        VIDEO_ELEMENT_READY_STATES: {
            HAVE_NOTHING: 0;
            HAVE_METADATA: 1;
            HAVE_CURRENT_DATA: 2;
            HAVE_FUTURE_DATA: 3;
            HAVE_ENOUGH_DATA: 4
        };
        FILE_LOADER_TYPES: {
            FETCH: 'fetch_loader';
            XHR: 'xhr_loader'
        };
        THROUGHPUT_TYPES: {
            LATENCY: 'throughput_type_latency';
            BANDWIDTH: 'throughput_type_bandwidth'
        };
        THROUGHPUT_CALCULATION_MODES: {
            EWMA: 'throughputCalculationModeEwma';
            ZLEMA: 'throughputCalculationModeZlema';
            ARITHMETIC_MEAN: 'throughputCalculationModeArithmeticMean';
            BYTE_SIZE_WEIGHTED_ARITHMETIC_MEAN: 'throughputCalculationModeByteSizeWeightedArithmeticMean';
            DATE_WEIGHTED_ARITHMETIC_MEAN: 'throughputCalculationModeDateWeightedArithmeticMean';
            HARMONIC_MEAN: 'throughputCalculationModeHarmonicMean';
            BYTE_SIZE_WEIGHTED_HARMONIC_MEAN: 'throughputCalculationModeByteSizeWeightedHarmonicMean';
            DATE_WEIGHTED_HARMONIC_MEAN: 'throughputCalculationModeDateWeightedHarmonicMean';
        };
        LOW_LATENCY_DOWNLOAD_TIME_CALCULATION_MODE: {
            MOOF_PARSING: 'lowLatencyDownloadTimeCalculationModeMoofParsing';
            DOWNLOADED_DATA: 'lowLatencyDownloadTimeCalculationModeDownloadedData';
            AAST: 'lowLatencyDownloadTimeCalculationModeAast';
        };
        RULES_TYPES: {
            QUALITY_SWITCH_RULES: 'qualitySwitchRules';
            ABANDON_FRAGMENT_RULES: 'abandonFragmentRules'
        };
        QUALITY_SWITCH_RULES: {
            BOLA_RULE: 'BolaRule';
            THROUGHPUT_RULE: 'ThroughputRule';
            INSUFFICIENT_BUFFER_RULE: 'InsufficientBufferRule';
            SWITCH_HISTORY_RULE: 'SwitchHistoryRule';
            DROPPED_FRAMES_RULE: 'DroppedFramesRule';
            LEARN_TO_ADAPT_RULE: 'L2ARule';
            LOL_PLUS_RULE: 'LoLPRule'
        };
        ABANDON_FRAGMENT_RULES: {
            ABANDON_REQUEST_RULE: 'AbandonRequestsRule'
        }

    }

    export interface XlinkLoader {
        load(url: string, element: any, resolveObject: object): void;

        reset(): void;
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

    export type MetricType = 'ManifestUpdate' | 'RequestsQueue';
    export type TrackSwitchMode = 'alwaysReplace' | 'neverReplace';
    export type TrackSelectionMode =
        'highestSelectionPriority'
        | 'highestBitrate'
        | 'firstTrack'
        | 'highestEfficiency'
        | 'widestRange';

    export function supportsMediaSource(): boolean;

    export interface ClassConstructor {
        __dashjs_factory_name: string
    }

    export type Factory = (context: object) => {
        create: () => any
    }

    export type SingletonFactory = (context: object) => {
        getInstance: () => any
    }

    export interface Range {
        start: number;
        end: number;
    }

    export interface KeySystemInfo {
        ks: KeySystem;
        sessionId?: string,
        sessionType?: string,
        keyId?: string,
        initData?: ArrayBuffer;
        cdmData?: ArrayBuffer;
        protData?: ProtectionData
    }

    export type RequestFilter = (request: LicenseRequest) => Promise<any>;
    export type ResponseFilter = (response: LicenseResponse) => Promise<any>;
}

