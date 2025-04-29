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

        getCurrentRepresentation(): object;

        getCurrentRepresentation(): Representation;

        getRepresentationForQuality(quality: number): object | null;

        prepareQualityChange(newRep: Representation): void;

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

        getFramerate(representation: object): number;

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
        availabilityTimeComplete: boolean;
        availabilityTimeOffset: number;
        dvbPriority: number;
        dvbWeight: number;
        queryParams: object;
        serviceLocation: string;
        url: string;
    }

    export interface ClientDataReporting {
        adaptationSets: AdaptationSet;
        adaptationSetsArray: Array<AdaptationSet>;
        cmcdParameters: CMCDParameters;
        serviceLocations: any;
        serviceLocationsArray: Array<any>;
    }

    export class CMCDParameters extends DescriptorType {
        contentID: string;
        keys: Array<string>;
        mode: string;
        schemeIdUri: string;
        sessionID: string;
        version: number;
    }

    export class ContentProtection extends DescriptorType {
        cencDefaultKid: any;
        keyId: any;
        laUrl: string;
        pro: any;
        pssh: any;
        ref: any;
        refId: any;
        robustness: any;

        init(data: any): void;

        mergeAttributesFromReference(reference: any): any;
    }

    export class ContentSteering {
        clientRequirement: boolean;
        defaultServiceLocation: string;
        defaultServiceLocationArray: string[];
        queryBeforeStart: boolean;
        serverUrl: string;
    }

    export class ContentSteeringRequest {
        constructor(url: any);

        url: string;
    }

    export class ContentSteeringResponse {
        pathwayClones: object[];
        pathwayPriority: string[];
        reloadUri: string;
        ttl: number;
        version: number;
    }

    export class DescriptorType {
        dvbFontFamily?: string;
        dvbMimeType?: string;
        dvbUrl?: string;
        id?: string;
        schemeIdUri: string;
        value?: string;
    }

    export interface Event {
        duration: number;
        eventStream: EventStream;
        id: number;
        messageData: string;
        parsedMessageData: any;
        presentationTime: number;
        presentationTimeDelta: number;
        type: string;
    }

    export interface EventStream {
        adaptationSet: AdaptationSet | null;
        period: Period | null;
        presentationTimeOffset: number;
        representation: Representation | null;
        schemeIdUri: string;
        timescale: number;
        value: string;
    }

    export interface IManifestInfo {
        availableFrom: Date;
        duration: number;
        dvrWindowSize: number;
        isDynamic: boolean;
        loadedTime: Date;
        maxFragmentDuration: number;
        minBufferTime: number;
        protocol?: string;
        serviceDescriptions: serviceDescriptions[]
    }

    export interface IAdaptation {
        ContentProtection: IContentProtection | IContentProtection[];
        Role: IRole | IRole[];
        SegmentTemplate: ISegmentTemplate | ISegmentTemplate[];
        Representation: Representation | Representation[];
        id: string;
        group: number;
        contentType: string;
        lang: string;
        par: string;
        minBandwidth: number;
        maxBandwidth: number;
        maxWidth: number;
        maxHeight: number;
        SegmentAlignment: boolean;
        sar: string;
        frameRate: number;
        mimeType: string;
        startWithSAP: number;
    }

    export interface IRole { // same content as UTCTiming ?
        schemeIdUri: string;
        value: string;
    }

    export interface ISegmentTemplate {
        SegmentTimeline: ISegmentTimeline | ISegmentTimeline[];
        timescale: number;
        initialization: string;
        media: string;
    }

    export interface ISegmentTimeline {
        S: ISegmentTimelineProperty | ISegmentTimelineProperty[];
    }

    export interface ISegmentTimelineProperty {
        d?: number;
        r?: number;
        t?: number;
    }

    export interface IRepresentation {
        id: string;
        bandwidth: number;
        width: number;
        height: number;
        codecs: string;
        scanType: string;
        SegmentTemplate: ISegmentTemplate;
        sar: string;
        frameRate: number;
        mimeType: string,
        startWithSAP: number;
        ContentProtection: IContentProtection[];
    }

    export interface IContentProtection {
        keyId: string;
        schemeIdUri: string;
        "cenc:default_KID"?: string;
        value?: string;
        pssh?: IPssh | IPssh[];
    }

    export interface IPssh {
        __prefix: string;
        __text: string;
    }

    export class MediaInfo {
        KID: any | null;
        accessibility: DescriptorType[] | null;
        audioChannelConfiguration: DescriptorType[] | null;
        bitrateList: Bitrate[];
        codec: string | null;
        contentProtection: any | null;
        essentialProperties: object;
        id: string | null;
        index: number | null;
        isEmbedded: any | null;
        isFragmented: any | null;
        isText: boolean;
        labels: { text: string, lang?: string }[];
        lang: string | null;
        mimeType: string | null;
        representationCount: number;
        roles: DescriptorType[] | null;
        segmentAlignment: boolean;
        selectionPriority: number;
        streamInfo: StreamInfo | null;
        subSegmentAlignment: boolean;
        supplementalProperties: object;
        type: MediaType | null;
        viewpoint: DescriptorType[] | null;
    }

    export interface Mpd {
        availabilityEndTime: number;
        availabilityStartTime: number | null;
        manifest: object;
        maxSegmentDuration: number;
        mediaPresentationDuration: number;
        minimumUpdatePeriod: number;
        publishTime: number | null;
        suggestedPresentationDelay: number;
        timeShiftBufferDepth: number;
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
        duration: number;
        id: string | null;
        index: number;
        isEncrypted: boolean;
        mpd: Mpd;
        nextPeriodId: string | null;
        start: number;
    }

    export interface ProducerReferenceTime {
        UTCTiming: any;
        applicationSchme: any;
        id: any;
        inband: boolean;
        presentationTime: number;
        type: 'encoder';
        wallClockTime: any;
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
        endNumber: number | null;
    }

    export interface Segment {
        availabilityEndTime: number;
        availabilityStartTime: number;
        duration: number;
        index: number | null;
        indexRange: any;
        media: any;
        mediaRange: any;
        mediaStartTime: number;
        presentationStartTime: number;
        replacementNumber: number;
        replacementTime: number;
        representation: Representation | null;
        wallStartTime: number;
    }

    export class SimpleXPath {
        constructor(selector: any);
    }

    export class StreamInfo {
        duration: number;
        id: string;
        index: number;
        isEncrypted: boolean;
        isLast: boolean;
        manifestInfo: IManifestInfo;
        start: number;
    }

    export class UTCTiming {
        schemeIdUri: string;
        value: string;
    }

    export interface ThroughputDictValue {
        downloadTimeInMs: number,
        downloadedBytes: number,
        latencyInMs: number
        serviceLocation: string,
        value: number,
    }

    /**
     * Dash
     **/

    export interface DashAdapter {
        applyPatchToManifest(manifest: object, patch: object): void;

        areMediaInfosEqual(mInfoOne: MediaInfo, mInfoTwo: MediaInfo): boolean;

        getMainAdaptationForType(periodIndex: number, type: MediaType, streamInfo: object): IAdaptation | null;

        getAllMediaInfoForType(streamInfo: object, type: MediaType, externalManifest?: object | null): any[];

        getAvailabilityStartTime(externalManifest?: object): number;

        getBandwidthForRepresentation(representationId: string, periodIdx: number): number;

        getBaseURLsFromElement(node: object): BaseURL[];

        getCodec(adaptation: object, representationIndex: number, addResolutionInfo: boolean): string;

        getContentSteering(manifest: object): object;

        getDuration(externalManifest?: object): number;

        getEssentialPropertiesAdaptationSet(adaptationSet: AdaptationSet): object | [];

        getEssentialPropertiesForRepresentation(representation: Representation): any[];

        getEvent(eventBox: object, eventStreams: object, mediaStartTime: number, voRepresentation: object): null | Event;

        getEventsFor(info: object, voRepresentation: object): Array<Event>;

        getFramerate(representation: object): number;

        getIndexForRepresentation(representationId: string, periodIdx: number): number;

        getIsDVB(manifest: object): boolean;

        getIsDynamic(externalManifest?: object): boolean;

        getIsMain(adaptation: object): boolean;

        getIsPatch(manifest: object): boolean;

        getIsTextTrack(adaptation: object): boolean;

        getIsTypeOf(adaptation: object, type: string): boolean;

        getLocation(manifest: object): MpdLocation[];

        getManifestUpdatePeriod(manifest: object, latencyOfLastUpdate?: number): number;

        getMediaInfoForType(streamInfo: object, type: MediaType): MediaInfo | null;

        getMpd(externalManifest?: object): Mpd;

        getPatchLocation(manifest: object): PatchLocation[];

        getPeriodById(id: string): Period | null;

        getProducerReferenceTime(streamInfo: StreamInfo, mediaInfo: MediaInfo): object | [];

        getPublishTime(manifest: object): number | null;

        getRealAdaptation(streamInfo: StreamInfo, mediaInfo: MediaInfo): object;

        getRealPeriodByIndex(index: number): object;

        getRegularPeriods(externalManifest?: object): any[];

        getRepresentationSortFunction(): (a: object, b: object) => number;

        getStreamsInfo(externalManifest: object, maxStreamsInfo: number): Array<any>;

        getSuggestedPresentationDelay(): string;

        getSupplementalCodex(representation: Representation): Array<any>;

        getUTCTimingSources(): any[];

        getVoRepresentation(mediaInfo: MediaInfo): Representation[];

        isPatchValid(manifest: object, patch: object): boolean;

        reset(): void;
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


        addBufferLevel(mediaType: MediaType, t: number, level: number): void;

        addBufferState(mediaType: MediaType, state: string, target: number): void;

        addDVBErrors(errors: object): void;

        addDVRInfo(mediaType: MediaType, currentTime: Date, mpd: Mpd, range: Range): void;

        addDroppedFrames(quality: number): void;

        addHttpRequest(request: HTTPRequest, responseURL: string, responseStatus: number, responseHeaders: object, traces: object): void;

        addManifestUpdate(request: ManifestUpdate): void;

        addManifestUpdateRepresentationInfo(representation: Representation, mediaType: MediaType): void;

        addManifestUpdateStreamInfo(streamInfo: StreamInfo): void;

        addPlayList(): void;

        addRepresentationSwitch(mediaType: MediaType, t: Date, mt: Date, to: string, lto: string): void;

        addRequestsQueue(mediaType: MediaType, loadingRequests: any[], executedRequests: any[]): void;

        addSchedulingInfo(request: SchedulingInfo, state: string): void;

        clearAllCurrentMetrics(): void;

        createPlaylistMetrics(mediaStartTime: number, startReason: string): void;

        createPlaylistTraceMetrics(representationId: number, mediaStartTime: number, speed: number): void;

        getCurrent(metrics: MetricsList, metricName: string): DroppedFrames;

        getCurrentBufferLevel(type: MediaType): number;

        getCurrentBufferState(type: MediaType): IBufferState;

        getCurrentDVRInfo(type?: MediaType): DVRInfo;

        getCurrentDroppedFrames(): DroppedFrames;

        getCurrentHttpRequest(type: MediaType): object;

        getCurrentManifestUpdate(): any;

        getCurrentRepresentationSwitch(type: MediaType): ICurrentRepresentationSwitch;

        getCurrentSchedulingInfo(type: MediaType): object;

        getHttpRequests(type: MediaType): object[];

        getLatestFragmentRequestHeaderValueByID(id: string): string;

        getLatestMPDRequestHeaderValueByID(type: MediaType, id: string): string;

        pushPlaylistTraceMetrics(endTime: number, reason: string): void;

        updateManifestUpdateInfo(updateFields: any[]): void;

        updatePlayListTraceMetrics(traceToUpdate: object): void;
    }

    export interface SegmentBaseLoader {
        initialize(): void;

        loadInitialization(representation: Representation, mediaType: MediaType): Promise<any>;

        loadSegments(representation: Representation, mediaType: MediaType, range: Range): Promise<any>;

        reset(): any;

        setConfig(config: object): void;
    }

    export interface WebSegmentBaseLoader {
        initialize(): void;

        loadInitialization(representation: Representation, mediaType: MediaType): Promise<any>;

        loadSegments(representation: Representation, mediaType: MediaType, range: Range): Promise<any>;

        reset(): any;

        setConfig(config: object): void;
    }

    /**
     * MSS - Errors
     **/

    export interface MssError extends ErrorsBase {
        MSS_NO_TFRF_CODE: 200;
        MSS_NO_TFRF_MESSAGE: 'Missing tfrf in live media segment';
        MSS_UNSUPPORTED_CODEC_CODE: 201;
        MSS_UNSUPPORTED_CODEC_MESSAGE: 'Unsupported codec';
    }

    /**
     * MSS - Parser
     **/

    export interface MssParser {
        getIron(): null;

        parse(data: any): object;

        reset(): void;

        setup(): void;
    }

    /**
     * MSS
     **/

    export interface MssFragmentInfoController {
        controllerType: 'MssFragmentInfoController';

        fragmentInfoLoaded(e: object): void;

        getType(): string;

        initialize(): void;

        reset(): void;

        start(): void;
    }

    export interface MssFragmentMoofProcessor {
        convertFragment(e: object, streamProcessor: any): void;

        getType(): string;

        updateSegmentList(e: object, streamProcessor: any): void;
    }

    export interface MssFragmentMoovProcessor {
        generateMoov(rep: Representation): ArrayBuffer;
    }

    export interface MssFragmentProcessor {
        generateMoov(rep: Representation): ArrayBuffer;

        processFragment(e: object, streamProcessor: any): void;
    }

    export interface MssHandler {
        createMssFragmentProcessor(): void;

        createMssParser(): void;

        registerEvents(): void;

        reset(): void;
    }

    /**
     * Offline - Constants
     **/

    class OfflineConstants {
        OFFLINE_SCHEME: 'offline_indexeddb';
        OFFLINE_STATUS_CREATED: 'created';
        OFFLINE_STATUS_ERROR: 'error';
        OFFLINE_STATUS_FINISHED: 'finished';
        OFFLINE_STATUS_STARTED: 'started';
        OFFLINE_STATUS_STOPPED: 'stopped';
        OFFLINE_URL_REGEX: RegExp;
    }

    /**
     * Offline - Controllers
     */

    export interface OfflineRecord {
        id: string;
        originalUrl: string;
        progress: number;
        status: string;
        url: string;
    }

    interface OfflineController {
        createRecord(manifestURL: string): Promise<string>;

        deleteRecord(id: string): void;

        getAllRecords(): OfflineRecord[];

        getRecordProgression(id: string): number;

        loadRecordsFromStorage(): Promise<void>;

        reset(): void;

        resetRecords(): void;

        resumeRecord(id: string): void;

        startRecord(id: string, mediaInfos: MediaInfo[]): void;

        stopRecord(id: string): void;
    }

    interface OfflineStoreController {
        createFragmentStore(manifestId: number | string, storeName: string): void;

        createOfflineManifest(manifest: object): object;

        deleteDownloadById(manifestId: number | string): object;

        getAllManifests(): object;

        getCurrentHigherManifestId(): object;

        getManifestById(manifestId: number | string): object;

        getRepresentationCurrentState(manifestId: number | string, representationId: number | string): object;

        saveSelectedRepresentations(manifestId: number | string, selected: Representation): object;

        setDownloadingStatus(manifestId: number | string, status: any): object;

        setRepresentationCurrentState(manifestId: number | string, representationId: number | string, state: any): object;

        storeFragment(manifestId: number | string, fragmentId: number | string, fragmentData: any): object;

        updateOfflineManifest(manifest: object): object;
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
        abort(): void;

        config: object | {};

        load(config: object | {}): void;
    }

    /**
     * Offline - Storage
     */

    export class IndexDBStore {
        createFragmentStore(storeName: string): void;

        deleteDownloadById(manifestId: number): Promise<string | any>;

        dropAll(): Promise<any>;

        dropFragmentStore(storeName: string): void;

        getAllManifests(): Promise<Object[] | String | Error>;

        getCurrentHigherManifestId(): Promise<number>;

        getFragmentByKey(manifestId: number, key: number): Promise<any>;

        getManifestById(id: number): Promise<Object[] | String | Error>;

        getRepresentationCurrentState(manifestId: number, state: number): Promise<number | Error>;

        saveSelectedRepresentation(manifest: object, selected: object): Promise<string | Error>;

        setDownloadingStatus(manifestId: number, newStatus: number): Promise<string | Error>;

        setRepresentationCurrentState(manifestId: number, representationId: string, state: number): Promise<string | Error>;

        storeFragment(manifestI: number, fragmentId: string, fragmentData: object): Promise<string | Error>;

        storeManifest(manifest: object): Object[];

        updateManifest(manifest: object): Promise<Object[] | Error>;
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

        isRelative(): boolean;

        removeHostName(url: string): string;

        resolve(url: string, baseUrl: string): string;
    }

    /**
     * Offline - Vo
     */

    export class OfflineDownload {
        id: object;
        originalUrl: object;
        progress: object;
        status: object;
        url: object;
    }

    /**
     * Offline
     */

    export interface OfflineDownload {
        config: object | {};

        deleteDownload(): void;

        downloadFromUrl(url: string): object;

        getDownloadProgression(): number;

        getId(): number;

        getManifestUrl(): string;

        getMediaInfos(): void;

        getStatus(): number;

        initDownload(): void;

        isDownloading(): boolean;

        reset(): void;

        resetDownload(): void;

        resumeDownload(): void;

        setInitialState(state: object): void;

        startDownload(mediaInfos: MediaInfo[]): any;

        stopDownload(): void;
    }

    export class OfflineStream {
        getMediaInfos(): MediaInfo[];

        getStreamId(): string;

        getStreamInfo(): StreamInfo;

        initialize(initStreamInfo: StreamInfo): void;

        initializeAllMediaInfoList(mediaInfoList: object): void;

        reset(): void;

        startOfflineStreamProcessors(): void;

        stopOfflineStreamProcessors(): void;
    }

    export class OfflineStreamProcessor {
        config: object | void;

        getAvailableSegmentsNumber(): number;

        getMediaInfo(): MediaInfo;

        getRepresentationController(): RepresentationController;

        getRepresentationId(): number | string;

        getType(): any;

        initialize(_mediaInfo: MediaInfo): void;

        isUpdating(): boolean;

        removeExecutedRequestsBeforeTime(time: any): void;

        reset(): void;

        start(): void;

        stop(): void;
    }

    export interface Bitrate {
        bandwidth?: number;
        height?: number;
        id?: string;
        scanType?: string;
        width?: number;
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
                filterVideoColorimetryEssentialProperties?: boolean
            },
            events?: {
                eventControllerRefreshDelay?: number,
                deleteEventMessageDataTimeout?: number
            }
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
                lowLatencyStallThreshold?: number,
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
            };
            ignoreSelectionPriority?: boolean;
            prioritizeRoleMain?: boolean;
            assumeDefaultRoleAsMain?: boolean;
            selectionModeForInitialTrack?: TrackSelectionMode;
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
        mediaTimeOfLastSignaledSegment: number
        numberOfSegments: number,
    }

    export type TrackSelectionFunction = (tracks: MediaInfo[]) => MediaInfo[];

    export interface DvrWindow {
        end: number;
        endAsUtc: number;
        size: number;
        start: number;
        startAsUtc: number;
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

        on(type: OfflineRecordLoadedmetadataEvent['type'], listener: (e: OfflineRecordLoadedmetadataEvent) => void, scope?: object): void;

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

        addABRCustomRule(type: string, rulename: string, rule: object): void;

        addRequestInterceptor(interceptor: RequestInterceptor): void;

        addResponseInterceptor(interceptor: ResponseInterceptor): void;

        addUTCTimingSource(schemeIdUri: string, value: string): void;

        attachProtectionController(value: ProtectionController): void;

        attachSource(urlOrManifest: string | object, startTime?: number | string): void;

        attachTTMLRenderingDiv(div: HTMLDivElement): void;

        attachView(element: HTMLMediaElement): void;

        clearDefaultUTCTimingSources(): void;

        convertToTimeCode(value: number): string;

        destroy(): void;

        duration(): number;

        enableForcedTextStreaming(enable: boolean): boolean;

        enableText(enable: boolean): boolean;

        extend(parentNameString: string, childInstance: object, override: boolean): void;

        formatUTC(time: number, locales: string, hour12: boolean, withDate?: boolean): string;

        getABRCustomRules(): any[];

        getActiveStream(): Stream | null;

        getAutoPlay(): boolean;

        getAvailableBaseUrls(): BaseURL[];

        getAvailableLocations(): MpdLocation[];

        getAverageLatency(type: MediaType, calculationMode?: string | null, sampleSize?: number): number;

        getAverageThroughput(type: MediaType, calculationMode?: string | null, sampleSize?: number): number;

        getBufferLength(type: MediaType): number;

        getCurrentLiveLatency(): number;

        getCurrentRepresentationForType(type: MediaType): Representation | null;

        getCurrentSteeringResponseData(): object;

        getCurrentTextTrackIndex(): number;

        getCurrentTrackFor(type: MediaType): MediaInfo | null;

        getDashAdapter(): DashAdapter;

        getDashMetrics(): DashMetrics;

        getDebug(): Debug;

        getDvrSeekOffset(value: number): number;

        getDvrWindow(): DvrWindow;

        getInitialMediaSettingsFor(type: MediaType): MediaSettings;

        getLowLatencyModeEnabled(): boolean;

        getManifest(): object;

        getOfflineController(): OfflineController;

        getPlaybackRate(): number;

        getProtectionController(): ProtectionController;

        getRawThroughputData(type: MediaType): ThroughputDictValue[];

        getRepresentationsByType(type: MediaType, streamId?: string | null): Representation[];

        getSafeAverageThroughput(type: MediaType, calculationMode?: string | null, sampleSize?: number): number;

        getSettings(): MediaPlayerSettingClass;

        getSource(): string | object;

        getStreamsFromManifest(manifest: object): StreamInfo[];

        getTTMLRenderingDiv(): HTMLDivElement | null;

        getTargetLiveDelay(): number;

        getTracksFor(type: MediaType): MediaInfo[];

        getTracksForTypeFromManifest(type: MediaType, manifest: object, streamInfo: StreamInfo): MediaInfo[];

        getVersion(): string;

        getVideoElement(): HTMLVideoElement;

        getVolume(): number;

        getXHRWithCredentialsForType(type: string): boolean;

        initialize(view: HTMLVideoElement, source: string, autoPlay: boolean, startTime: number | string): void;

        isDynamic(): boolean;

        isMuted(): boolean;

        isPaused(): boolean;

        isReady(): boolean;

        isSeeking(): boolean;

        isTextEnabled(): boolean;

        off(type: string, listener: (e: any) => void, scope?: object): void;

        on(type: string, listener: (e: any) => void, scope?: object, options?: object): void;

        pause(): void;

        play(): void;

        preload(): void;

        provideThumbnail(time: number, callback: (thumbnail: Thumbnail | null) => void): void;

        refreshManifest(callback: (manifest: object | null, error: unknown) => void): void;

        registerCustomCapabilitiesFilter(filter: CapabilitiesFilterFunction): void;

        registerLicenseRequestFilter(filter: RequestFilter): void;

        registerLicenseResponseFilter(filter: ResponseFilter): void;

        removeABRCustomRule(rulename: string): void;

        removeAllABRCustomRule(): void;

        removeRequestInterceptor(interceptor: RequestInterceptor): void;

        removeResponseInterceptor(interceptor: ResponseInterceptor): void;

        removeUTCTimingSource(schemeIdUri: string, value: string): void;

        reset(): void;

        resetCustomInitialTrackSelectionFunction(fn: TrackSelectionFunction): void;

        resetSettings(): void;

        restoreDefaultUTCTimingSources(): void;

        retrieveManifest(url: string, callback: (manifest: object | null, error: any) => void): void;

        seek(value: number): void;

        seekToOriginalLive(): void;

        seekToPresentationTime(value: number): void;

        setAutoPlay(value: boolean): void;

        setConfig(config: object): void;

        setCurrentTrack(track: MediaInfo, noSettingsSave?: boolean): void;

        setCustomInitialTrackSelectionFunction(fn: TrackSelectionFunction): void;

        setInitialMediaSettingsFor(type: MediaType, value: MediaSettings): void;

        setMute(value: boolean): void;

        setPlaybackRate(value: number): void;

        setProtectionData(value: ProtectionDataSet): void;

        setRepresentationForTypeById(type: MediaType, id: number, forceReplace?: boolean): void;

        setRepresentationForTypeByIndex(type: MediaType, index: number, forceReplace?: boolean): void;

        setTextTrack(idx: number): void;

        setVolume(value: number): void;

        setXHRWithCredentialsForType(type: string, value: boolean): void;

        time(periodId?: string): number;

        timeAsUTC(): number;

        timeInDvrWindow(): number;

        trigger(type: MediaPlayerEvent, payload: object, filters: object): void;

        triggerSteeringRequest(): Promise<any>;

        unregisterCustomCapabilitiesFilter(filter: CapabilitiesFilterFunction): void;

        unregisterLicenseRequestFilter(filter: RequestFilter): void;

        unregisterLicenseResponseFilter(filter: ResponseFilter): void;

        updateSettings(settings: MediaPlayerSettingClass): void;

        updateSource(urlOrManifest: string | object): void;

    }

    interface MediaPlayerErrors {
        APPEND_ERROR_CODE: 20;
        CAPABILITY_MEDIAKEYS_ERROR_CODE: 24;
        CAPABILITY_MEDIASOURCE_ERROR_CODE: 23;
        DATA_UPDATE_FAILED_ERROR_CODE: 22;
        DOWNLOAD_ERROR_ID_CONTENT_CODE: 27;
        DOWNLOAD_ERROR_ID_INITIALIZATION_CODE: 28;
        DOWNLOAD_ERROR_ID_MANIFEST_CODE: 25;
        DOWNLOAD_ERROR_ID_SIDX_CODE: 26;
        DOWNLOAD_ERROR_ID_XLINK_CODE: 29;
        FRAGMENT_LOADER_LOADING_FAILURE_ERROR_CODE: 17;
        FRAGMENT_LOADER_NULL_REQUEST_ERROR_CODE: 18;
        INDEXEDDB_ABORT_ERROR: 11012;
        INDEXEDDB_DATA_ERROR: 11006;
        INDEXEDDB_INVALID_STATE_ERROR: 11002;
        INDEXEDDB_NETWORK_ERROR: 11005;
        INDEXEDDB_NOT_ALLOWED_ERROR: 11008;
        INDEXEDDB_NOT_FOUND_ERROR: 11004;
        INDEXEDDB_NOT_READABLE_ERROR: 11003;
        INDEXEDDB_NOT_SUPPORTED_ERROR: 11009;
        INDEXEDDB_QUOTA_EXCEED_ERROR: 11001;
        INDEXEDDB_TIMEOUT_ERROR: 11011;
        INDEXEDDB_TRANSACTION_INACTIVE_ERROR: 11007;
        INDEXEDDB_UNKNOWN_ERROR: 11013;
        INDEXEDDB_VERSION_ERROR: 11010;
        KEY_SESSION_CREATED_ERROR_CODE: 113;
        KEY_STATUS_CHANGED_EXPIRED_ERROR_CODE: 110;
        KEY_SYSTEM_ACCESS_DENIED_ERROR_CODE: 112;
        MANIFEST_ERROR_ID_MULTIPLEXED_CODE: 34;
        MANIFEST_ERROR_ID_NOSTREAMS_CODE: 32;
        MANIFEST_ERROR_ID_PARSE_CODE: 31;
        MANIFEST_LOADER_LOADING_FAILURE_ERROR_CODE: 11;
        MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE: 10;
        MEDIASOURCE_TYPE_UNSUPPORTED_CODE: 35;
        MEDIA_KEYERR_CLIENT_CODE: 102;
        MEDIA_KEYERR_CODE: 100;
        MEDIA_KEYERR_DOMAIN_CODE: 106;
        MEDIA_KEYERR_HARDWARECHANGE_CODE: 105;
        MEDIA_KEYERR_OUTPUT_CODE: 104;
        MEDIA_KEYERR_SERVICE_CODE: 103;
        MEDIA_KEYERR_UNKNOWN_CODE: 101;
        MEDIA_KEY_MESSAGE_ERROR_CODE: 107;
        MEDIA_KEY_MESSAGE_LICENSER_ERROR_CODE: 114;
        MEDIA_KEY_MESSAGE_NO_CHALLENGE_ERROR_CODE: 108;
        MEDIA_KEY_MESSAGE_NO_LICENSE_SERVER_URL_ERROR_CODE: 111;
        MSS_NO_TFRF_CODE: 200;
        MSS_UNSUPPORTED_CODEC_CODE: 201;
        OFFLINE_ERROR: 11000;
        REMOVE_ERROR_CODE: 21;
        SEGMENT_BASE_LOADER_ERROR_CODE: 15;
        SERVER_CERTIFICATE_UPDATED_ERROR_CODE: 109;
        TIMED_TEXT_ERROR_ID_PARSE_CODE: 33;
        TIME_SYNC_FAILED_ERROR_CODE: 16;
        URL_RESOLUTION_FAILED_GENERIC_ERROR_CODE: 19;
        XLINK_LOADER_LOADING_FAILURE_ERROR_CODE: 12;
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
        delay: number;
        type: MediaPlayerEvents['AST_IN_FUTURE'];
    }

    export interface BufferEvent extends MediaPlayerEvent {
        mediaType: MediaType;
        type: MediaPlayerEvents['BUFFER_EMPTY' | 'BUFFER_LOADED'];
    }

    export interface BufferStateChangedEvent extends MediaPlayerEvent {
        mediaType: MediaType;
        sender: object;
        state: 'bufferStalled' | 'bufferLoaded';
        streamInfo: StreamInfo;
        type: MediaPlayerEvents['BUFFER_LEVEL_STATE_CHANGED'];
    }

    export interface GenericErrorEvent extends MediaPlayerEvent {
        error: 'capability' | 'mediasource' | 'key_session' | 'key_message';
        event: string;
        type: MediaPlayerEvents['ERROR'];
    }

    export interface DownloadErrorEvent extends MediaPlayerEvent {
        error: 'download';
        event: {
            id: string;
            url: string;
            request: XMLHttpRequest;
        };
        type: MediaPlayerEvents['ERROR'];
    }

    export interface ManifestErrorEvent extends MediaPlayerEvent {
        error: 'manifestError';
        event: {
            id: string;
            message: string;
            manifest?: object;
            event?: string;
        };
        type: MediaPlayerEvents['ERROR'];
    }

    export interface TimedTextErrorEvent extends MediaPlayerEvent {
        error: 'cc';
        event: {
            id: string;
            message: string;
            cc: string;
        };
        type: MediaPlayerEvents['ERROR'];
    }

    export interface MediaPlayerErrorEvent extends MediaPlayerEvent {
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
        type: MediaPlayerEvents['ERROR'];
    }

    export type ErrorEvent =
        GenericErrorEvent
        | DownloadErrorEvent
        | ManifestErrorEvent
        | TimedTextErrorEvent
        | MediaPlayerErrorEvent;

    export interface CaptionRenderedEvent extends MediaPlayerEvent {
        captionDiv: HTMLDivElement;
        currentTrackIdx: number;
        type: MediaPlayerEvents['CAPTION_RENDERED'];
    }

    export interface CaptionContainerResizeEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['CAPTION_CONTAINER_RESIZE'];
    }

    export interface dvbFontDownloadAdded extends MediaPlayerEvent {
        font: FontInfo;
        type: MediaPlayerEvents['DVB_FONT_DOWNLOAD_ADDED'];
    }

    export interface dvbFontDownloadComplete extends MediaPlayerEvent {
        font: FontInfo;
        type: MediaPlayerEvents['DVB_FONT_DOWNLOAD_COMPLETE'];
    }

    export interface dvbFontDownloadFailed extends MediaPlayerEvent {
        font: FontInfo;
        type: MediaPlayerEvents['DVB_FONT_DOWNLOAD_FAILED'];
    }

    export interface DynamicToStaticEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['DYNAMIC_TO_STATIC'];
    }

    export interface FragmentLoadingCompletedEvent extends MediaPlayerEvent {
        request: FragmentRequest;
        response: ArrayBuffer;
        sender: object;
        type: MediaPlayerEvents['FRAGMENT_LOADING_COMPLETED'];
    }

    export interface FragmentLoadingAbandonedEvent extends MediaPlayerEvent {
        mediaType: MediaType;
        request: object;
        streamProcessor: object;
        type: MediaPlayerEvents['FRAGMENT_LOADING_ABANDONED'];
    }

    export interface InbandPrftReceivedEvent extends MediaPlayerEvent {
        data: object
        mediaType: MediaType;
        streamInfo: StreamInfo;
        type: MediaPlayerEvents['INBAND_PRFT_RECEIVED'];
    }

    export interface KeyErrorEvent extends MediaPlayerEvent {
        error: DashJSError;
        type: MediaPlayerEvents['KEY_ERROR'];
    }

    export interface KeyMessageEvent extends MediaPlayerEvent {
        data: KeyMessage;
        type: MediaPlayerEvents['KEY_MESSAGE'];
    }

    export interface KeySessionClosedEvent extends MediaPlayerEvent {
        data: string | null;
        error?: string;
        type: MediaPlayerEvents['KEY_SESSION_CLOSED' | 'KEY_SESSION_REMOVED'];
    }

    export interface KeySessionEvent extends MediaPlayerEvent {
        data: SessionToken | null;
        error?: DashJSError;
        type: MediaPlayerEvents['KEY_SESSION_CREATED'];
    }

    export interface KeyStatusesChangedEvent extends MediaPlayerEvent {
        data: SessionToken;
        error?: DashJSError;
        type: MediaPlayerEvents['KEY_STATUSES_CHANGED'];
    }

    export interface KeySystemSelectedEvent extends MediaPlayerEvent {
        type: MediaPlayerEvents['KEY_SYSTEM_SELECTED'];
        data: object | null;
        error?: DashJSError;
    }

    export interface LicenseRequestCompleteEvent extends MediaPlayerEvent {
        data: {
            sessionToken: SessionToken;
            messageType: string;
        };
        error?: DashJSError;
        type: MediaPlayerEvents['LICENSE_REQUEST_COMPLETE'];
    }

    export interface LogEvent extends MediaPlayerEvent {
        message: string;
        type: MediaPlayerEvents['LOG'];
    }

    export interface ManifestLoadedEvent extends MediaPlayerEvent {
        data: object;
        type: MediaPlayerEvents['MANIFEST_LOADED'];
    }

    export interface MetricEvent extends MediaPlayerEvent {
        mediaType: MediaType;
        metric: MetricType;
        type: MediaPlayerEvents['METRIC_ADDED' | 'METRIC_UPDATED'];
        value: object;
    }

    export interface MetricChangedEvent extends MediaPlayerEvent {
        mediaType: MediaType;
        type: MediaPlayerEvents['METRIC_CHANGED'];
    }

    export interface OfflineRecordEvent extends MediaPlayerEvent {
        id: string;
        type: MediaPlayerEvents['OFFLINE_RECORD_FINISHED' | 'OFFLINE_RECORD_STARTED' | 'OFFLINE_RECORD_STOPPED'];
    }

    export interface OfflineRecordLoadedmetadataEvent extends MediaPlayerEvent {
        mediaInfos: MediaInfo[];
        type: MediaPlayerEvents['OFFLINE_RECORD_LOADEDMETADATA'];
    }

    export interface PeriodSwitchEvent extends MediaPlayerEvent {
        fromStreamInfo?: StreamInfo | null;
        toStreamInfo: StreamInfo | null;
        type: MediaPlayerEvents['PERIOD_SWITCH_COMPLETED' | 'PERIOD_SWITCH_STARTED'];
    }

    export interface PlaybackErrorEvent extends MediaPlayerEvent {
        error: MediaError;
        type: MediaPlayerEvents['PLAYBACK_ERROR'];
    }

    export interface PlaybackPausedEvent extends MediaPlayerEvent {
        ended: boolean | null;
        type: MediaPlayerEvents['PLAYBACK_PAUSED'];
    }

    export interface PlaybackPlayingEvent extends MediaPlayerEvent {
        playingTime: number | null;
        type: MediaPlayerEvents['PLAYBACK_PLAYING'];
    }

    export interface PlaybackRateChangedEvent extends MediaPlayerEvent {
        playbackRate: number | null;
        type: MediaPlayerEvents['PLAYBACK_RATE_CHANGED'];
    }

    export interface PlaybackSeekingEvent extends MediaPlayerEvent {
        seekTime: number | null;
        type: MediaPlayerEvents['PLAYBACK_SEEKING'];
    }

    export interface PlaybackStartedEvent extends MediaPlayerEvent {
        startTime: number | null;
        type: MediaPlayerEvents['PLAYBACK_STARTED'];
    }

    export interface PlaybackTimeUpdatedEvent extends MediaPlayerEvent {
        time: number | null;
        timeToEnd: number;
        type: MediaPlayerEvents['PLAYBACK_TIME_UPDATED'];
    }

    export interface PlaybackWaitingEvent extends MediaPlayerEvent {
        playingTime: number | null;
        type: MediaPlayerEvents['PLAYBACK_WAITING'];
    }

    export interface ProtectionCreatedEvent extends MediaPlayerEvent {
        controller: object;
        type: MediaPlayerEvents['PROTECTION_CREATED'];
    }

    export interface ProtectionDestroyedEvent extends MediaPlayerEvent {
        data: string;
        type: MediaPlayerEvents['PROTECTION_DESTROYED'];
    }

    export interface TrackChangeRenderedEvent extends MediaPlayerEvent {
        mediaType: MediaType;
        newMediaInfo: MediaInfo;
        oldMediaInfo: MediaInfo;
        type: MediaPlayerEvents['TRACK_CHANGE_RENDERED'];
    }

    export interface QualityChangeRenderedEvent extends MediaPlayerEvent {
        mediaType: MediaType;
        newRepresentation: Representation;
        oldRepresentation: Representation;
        streamId: string;
        type: MediaPlayerEvents['QUALITY_CHANGE_RENDERED'];
    }

    export interface QualityChangeRequestedEvent extends MediaPlayerEvent {
        mediaType: MediaType;
        newRepresentation: Representation;
        oldRepresentation: Representation;
        reason: {
            name?: string;
            droppedFrames?: number;
        } | null;
        streamInfo: StreamInfo | null;
        isAdaptationSetSwitch: boolean;
        type: MediaPlayerEvents['QUALITY_CHANGE_REQUESTED'];
    }

    export interface StreamInitializedEvent extends MediaPlayerEvent {
        error: Error | null;
        streamInfo: StreamInfo;
        type: MediaPlayerEvents['STREAM_INITIALIZED'];
    }

    export interface TextTracksAddedEvent extends MediaPlayerEvent {
        enabled: boolean;
        index: number;
        tracks: TextTrackInfo[];
        type: MediaPlayerEvents['TEXT_TRACKS_ADDED'];
    }

    export interface TtmlParsedEvent extends MediaPlayerEvent {
        ttmlDoc: object;
        ttmlString: string;
        type: MediaPlayerEvents['TTML_PARSED'];
    }

    export interface TtmlToParseEvent extends MediaPlayerEvent {
        content: object;
        type: MediaPlayerEvents['TTML_TO_PARSE'];
    }

    export interface CueEnterEvent extends MediaPlayerEvent {
        end: number
        id: string,
        start: number,
        text: string,
        type: MediaPlayerEvents['CUE_ENTER'];
    }

    export interface CueExitEvent extends MediaPlayerEvent {
        id: string,
        type: MediaPlayerEvents['CUE_EXIT'];
    }

    export interface AdaptationSetRemovedNoCapabilitiesEvent extends MediaPlayerEvent {
        adaptationSet: object;
        type: MediaPlayerEvents['ADAPTATION_SET_REMOVED_NO_CAPABILITIES'];
    }

    export interface MediaSettings {
        accessibility?: DescriptorType | string;
        audioChannelConfiguration?: DescriptorType | string;
        lang?: RegExp | string;
        role?: DescriptorType | string;
        viewpoint?: DescriptorType | string;
    }

    export class serviceDescriptions {
        contentSteering: ContentSteering | null;
        id: number;
        latency: number | null;
        playbackrate: number;
        schemeIdUri: string;
    }

    export interface ICurrentRepresentationSwitch {
        mt: number;
        t: Date;
        to: string;
        lto: string;
    }

    export interface IBufferState {
        state: string;
        target: number;
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
        checkPlaybackQuality(type: string, streamId: string | number): boolean;

        clearDataForStream(streamId: string): void;

        getAbandonmentStateFor(streamId: string, type: string): any | null;

        getInitialBitrateFor(type: string): number;

        getOptimalRepresentationForBitrate(mediaInfo: MediaInfo, bitrateInKbit: number, includeCompatibleMediaInfos: boolean): Representation | null;

        getPossibleVoRepresentations(mediaInfo: MediaInfo, includeCompatibleMediaInfos: boolean): Representation[] | null;

        getPossibleVoRepresentationsFilteredBySettings(mediaInfo: MediaInfo, includeCompatibleMediaInfos: boolean): Representation[] | null;

        getRepresentationByAbsoluteIndex(absoluteIndex: number, mediaInfo: MediaInfo, includeCompatibleMediaInfos: boolean): Representation | null;

        handleNewMediaInfo(mediaInfo: MediaInfo): void;

        initialize(): void;

        isPlayingAtLowestQuality(representation: Representation): boolean;

        isPlayingAtTopQuality(representation: Representation): boolean;

        registerStreamType(type: object, streamProcessor: object): void;

        reset(): void;

        setConfig(config: object): void;

        setPlaybackQuality(type: string, streamInfo: StreamInfo, representation: Representation, reason: object): void;

        setWindowResizeEventCalled(value: any): void;

        unRegisterStreamType(streamId: string, type: string): void;
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
        appendInitSegmentFromCache(representationId: string): boolean;

        clearBuffers(ranges: Range[]): Promise<any>;

        createBufferSink(mediaInfo: MediaInfo, oldBufferSinks?: any[]): Promise<any>;

        dischargePreBuffer(): void;

        getAllRangesWithSafetyFactor(seekTime: number): { start: number, end: number }[];

        getBuffer(): SourceBufferSink;

        getBufferControllerType(): string;

        getBufferLevel(): number;

        getContinuousBufferTimeForTargetTime(targetTime: number): number;

        getIsBufferingCompleted(): boolean;

        getIsPruningInProgress(): boolean;

        getMediaSource(): MediaSource;

        getRangeAt(time: number, tolerance: number): Range | null;

        getStreamId(): string;

        getType(): string;

        hasBufferAtTime(time: number): boolean;

        initialize(mediaSource: MediaSource): void;

        prepareForFastQualitySwitch(newRepresentation: Representation, oldRepresentation: Representation): Promise<any>;

        prepareForForceReplacementQualitySwitch(voRepresentation: Representation): Promise<any>;

        prepareForNonReplacementTrackSwitch(codec: string): Promise<any>;

        prepareForPlaybackSeek(): any;

        prepareForReplacementTrackSwitch(codec: string): Promise<any>;

        prepareForabandonQualitySwitch(newRepresentation: Representation, oldRepresentation: Representation): Promise<any>;

        pruneAllSafely(): Promise<any>;

        pruneBuffer(): void;

        reset(errored: any, keepBuffers: boolean): void;

        segmentRequestingCompleted(segmentIndex: number): void;

        setIsBufferingCopleted(value: object): void;

        setMediaSource(value: object, mediaInfo: MediaInfo | null): void;

        setSeekTarget(value: object): void;

        updateAppendWindow(): Promise<any>;

        updateBufferTimestampOffset(voRepresentation: Representation): Promise<any>;
    }

    export interface CatchupController {
        initialize(): void;

        reset(): void;

        setConfig(config: any): void;
    }

    export interface ClientDataReportingController {
        isAdaptationsIncluded(adaptationSet: AdaptationSet): boolean;

        isServiceLocationIncluded(requestType: string, serviceLocation: any): boolean;

        setConfig(config: any): void;
    }

    export interface CommonAccessTokenController {
        getCommonAccessTokenForUrl(url: URL): any;

        processResponseHeaders(httpResponse: object): void;

        reset(): void;
    }

    export interface EventController {
        addInbandEvents(values: object[], periodId: string | number): void;

        addInlineEvents(values: object[], periodId: string | number): void;

        getInbandEvents(): object;

        getInlineEvents(): object;

        reset(): void;

        setConfig(config: object): void;

        start(): void;
    }

    export interface ExtUrlQueryInfoController {
        createFinalQueryStrings(manifest: object): void;

        getFinalQueryString(request: HTTPRequest): any;
    }

    export interface FragmentController {
        getModel(type: string): any;

        getStreamId(): string;

        reset(): void;
    }

    export interface GapController {
        initialize(): void;

        reset(): void;

        setConfig(config: object): void;
    }

    export interface MediaController {
        addTrack(track: MediaInfo): void;

        areTracksEqual(t1: MediaInfo, t2: MediaInfo): boolean;

        clearDataForStream(streamId: string): void;

        getCurrentTrackFor(type: string, streamId: string): MediaInfo;

        getInitialSettings(type: string): object | null;

        getTracksFor(type: string, streamId: string): MediaInfo[];

        getTracksWithHighestBitrate(trackArr: MediaInfo[]): MediaInfo[];

        getTracksWithHighestEfficiency(trackArr: MediaInfo[]): MediaInfo[];

        getTracksWithHighestSelectionPriority(trackArr: MediaInfo[]): MediaInfo[];

        getTracksWithWidestRange(trackArr: MediaInfo[]): MediaInfo[];

        initialize(): void;

        isCurrentTrack(track: MediaInfo): boolean;

        matchSettings(settings: object, track: MediaInfo, isTrackActive?: boolean): any;

        matchSettingsAccessibility(settings: object, track: MediaInfo): any;

        matchSettingsAudioChannelConfig(settings: object, track: MediaInfo): any;

        matchSettingsCodec(settings: object, track: MediaInfo): any;

        matchSettingsIndex(settings: object, track: MediaInfo): any;

        matchSettingsLang(settings: object, track: MediaInfo): any;

        matchSettingsRole(settings: object, track: MediaInfo): any;

        matchSettingsViewPoint(settings: object, track: MediaInfo): any;

        reset(): void;

        saveTextSettingsDisabled(): void;

        selectInitialTrack(type: string, tracks: MediaInfo[]): MediaInfo;

        setConfig(config: object): void;

        setInitialMediaSettingsForType(type: string, streamInfo: StreamInfo): void;

        setInitialSettings(type: string, value: object): void;

        setTrack(track: MediaInfo, options: object): void;
    }

    export interface MediaSourceController {
        attachMediaSource(videoModel: object): string;

        createMediaSource(): MediaSource;

        detachMediaSource(videoModel: object): void;

        setDuration(value: object): void;

        setSeekable(start: number, end: number): void;

        signalEndOfStream(source: any): void;
    }

    export interface PlaybackController {
        computeAndSetLiveDelay(fragmentDuration: number, manifestInfo: IManifestInfo): number;

        getAvailabilityStartTime(): number;

        getBufferLevel(filterList?: any[]): number | null;

        getCurrentLiveLatency(): number;

        getEnded(): boolean | null;

        getInitialCatchupModeActivated(): boolean;

        getIsDynamic(): boolean;

        getIsManifestUpdateInProgress(): boolean;

        getLiveDelay(): number;

        getLowLatencyModeEnabled(): boolean;

        getOriginalLiveDelay(): number;

        getPlaybackRate(): number | null;

        getPlaybackStalled(): boolean;

        getPlayedRanges(): TimeRanges | null;

        getStreamController(): object;

        getStreamEndTime(sInfo: StreamInfo): number;

        getTime(): number | null;

        getTimeToStreamEnd(sInfo?: StreamInfo): number;

        initialize(sInfo: StreamInfo, periodSwitch: boolean): void;

        isPaused(): boolean | null;

        isProgressing(): Promise<any>;

        isSeeking(): boolean | null;

        isStalled(): boolean | null;

        pause(): void;

        play(): void;

        reset(): void;

        seek(time: number, stickToBuffered: boolean, internal: boolean): void;

        seekToCurrentLive(stickToBuffered?: boolean, internal?: boolean, adjustLiveDelay?: boolean): void;

        seekToOriginalLive(stickToBuffered?: boolean, internal?: boolean, adjustLiveDelay?: boolean): void;

        setConfig(config: object): void;

        updateCurrentTime(mediaType?: MediaType): void;
    }

    export interface ScheduleController {
        clearScheduleTimer(): void;

        getBufferTarget(): number;

        getStreamId(): string;

        getSwitchTrack(): any;

        getTimeToLoadDelay(): number;

        getType(): string;

        initialize(_hasVideoTrack: boolean): void;

        reset(): void;

        setCheckPlaybackQuality(value: object): void;

        setInitSegmentRequired(value: object): void;

        setLastInitializedRepresentationId(value: number): void;

        setSwitchTrack(value: object): void;

        setTimeToLoadDelay(value: object): void;

        startScheduleTimer(value: object): void;
    }

    export interface StreamController {
        addDVRMetric(): void;

        getActiveStream(): object;

        getActiveStreamInfo(): StreamInfo | null;

        getActiveStreamProcessors(): any[];

        getAutoPlay(): boolean;

        getHasMediaOrInitialisationError(): boolean;

        getInitialPlayback(): any;

        getIsStreamSwitchInProgress(): boolean;

        getStreamById(id: string): object | null;

        getStreamForTime(time: number): object | null;

        getStreams(): any[];

        getTimeRelativeToStreamId(time: number, id: string): number | null;

        hasAudioTrack(): void;

        hasVideoTrack(): void;

        initialize(autoPl: any, protData: object): void;

        load(url: string, startTime?: number): void;

        loadWithManifest(manifest: object): void;

        refreshManifest(): void;

        reset(): void;

        setConfig(config: object): void;

        setProtectionData(protData: object): void;

        switchToVideoElement(seekTime: number): void;
    }

    export interface ThroughputController {
        getArithmeticMean(dict: ThroughputDictEntry[], sampleSize: number): number

        getAverageLatency(mediaType: MediaType, calculationMode: string, sampleSize: number): number

        getAverageThroughput(mediaType: MediaType, calculationMode: string, sampleSize: number): number

        getByteSizeWeightedArithmeticMean(dict: ThroughputDictEntry[], sampleSize: number): number

        getByteSizeWeightedHarmonicMean(dict: ThroughputDictEntry[], sampleSize: number): number

        getDateWeightedArithmeticMean(dict: ThroughputDictEntry[], sampleSize: number): number

        getDateWeightedHarmonicMean(dict: ThroughputDictEntry[], sampleSize: number): number

        getEwma(dict: ThroughputEwmaDictEntry[], halfLife: object, useMin: boolean): number

        getHarmonicMean(dict: ThroughputDictEntry[], sampleSize: number): number

        getRawThroughputData(mediaType: MediaType): number

        getSafeAverageThroughput(mediaType: MediaType, calculationMode: string, sampleSize: number): number

        getZlema(dict: ThroughputDictEntry[], sampleSize: number): number

        initialize(): void;

        reset(): void;

        setConfig(config: object): void;
    }

    export interface TimeSyncController {
        attemptSync(tSources: number[], isDynamic: boolean): void;

        initialize(): void;

        setConfig(config: object): void;

        reset(): void;
    }

    export interface XlinkController {
        reset(): void;

        resolveManifestOnLoad(mpd: Mpd): void;

        setParser(value: object): void;
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

        isEnabled(): boolean;

        reset(): void;
    }

    export interface ReportingController {
        initialize(rangeController: RangeController): void;

        report(type: string, vos: any[]): void;

        reset(): void;
    }

    /**
     * Streaming - Metrics - Metrics - Handlers
     **/

    export interface BufferLevelHandler {
        initialize(basename: string, rc: RangeController, n_ms: string): void;

        handleNewMetric(metric: any, vo: any, type: string): void;

        reset(): void;
    }

    export interface DVBErrorsHandler {
        initialize(unused: any, rc: RangeController): void; //unused does nothing

        handleNewMetric(metric: any, vo: any): void;

        reset(): void;
    }

    export interface GenericMetricHandler {
        initialize(name: string, rc: RangeController): void;

        handleNewMetric(metric: any, vo: any): void;

        reset(): void;
    }

    export interface HttpListHandler {
        initialize(basename: string, rc: RangeController, n_ms: string, requestType: string): void;

        handleNewMetric(metric: any, vo: any): void;

        reset(): void;
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
        initialize(entry: object, rc: RangeController): void;

        report(type: string, vos: any[]): void;

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
        errorcode: string | null;
        ipaddress: string | null;
        mpdurl: string | null;
        servicelocation: string | null;
        terror: Date | null;
        url: string | null;

        BASE_URL_CHANGED: 'F00';
        BECAME_REPORTER: 'S00';
        CONNECTION_ERROR: 'C03';
        CONNECTION_REFUSED: 'C02';
        CORRUPT_MEDIA_ISOBMFF: 'M00';
        CORRUPT_MEDIA_OTHER: 'M01';
        DNS_RESOLUTION_FAILED: 'C00';
        HOST_UNREACHABLE: 'C01';
        SSL_CONNECTION_FAILED_PREFIX: 'SSL';
    }

    export interface Metrics {
        metrics: string;
        Range: any[];
        Reporting: any[];
    }

    export interface Range {
        _useWallClockTime: boolean;
        duration: number;
        starttime: number;
    }

    export interface Reporting {
        DEFAULT_DVB_PROBABILITY: 1000;

        dvbProbability: number;
        dvbReportingUrl: string;
        schemeIdUri: string;
        value: string;
    }

    /**
     * Streaming - Metrics
     **/

    export interface MetricsReporting {
        createMetricsReporting(config: object): void;

        getMetricsHandlerFactory(): MetricsHandlerFactory;

        getReportingFactory(): ReportingFactory;
    }

    export class MetricsReportingEvents extends EventsBase {
        BECAME_REPORTING_PLAYER: 'internal_becameReportingPlayer';
        CMCD_DATA_GENERATED: 'cmcdDataGenerated';
        METRICS_INITIALISATION_COMPLETE: 'internal_metricsReportingInitialized';
    }

    /**
     * Streaming - Models
     **/

    export interface AastLowLatencyThroughputModel {
        addMeasurement(request: HTTPRequest, chunkMeasurements: any[], requestTimeMs: number, throughputCapacityDelayMS: number): void;

        getEstimatedDownloadDurationMS(request: HTTPRequest): number;

        getThroughputCapacityDelayMS(request: HTTPRequest, currentBufferLevelMS: number): number;

        setup(): void;
    }

    export interface BaseURLTreeModel {
        getBaseUrls(root: any): BaseURL[];

        getForPath(path: any): any;

        invalidateSelectedIndexes(serviceLocation: string): void;

        reset(): void;

        setConfig(config: object): void;

        update(manifest: object): void;
    }

    export interface CmcdModel {
        getCmcdData(request: HTTPRequest): object;

        getCmcdParametersFromManifest(): CMCDParameters;

        getHeaderParameters(request: HTTPRequest): object | null;

        getQueryParameter(request: HTTPRequest): { key: string, finalPayloadString: string } | null;

        initialize(): void;

        isCmcdEnabled(): boolean;

        reset(): void;

        setConfig(config: object): void;
    }

    export interface CmsdModel {
        getEstimatedThroughput(type: string): number;

        getMaxBitrate(type: string): number;

        getResponseDelay(type: string): number;

        getRoundTripTime(type: string): number;

        initialize(): void; // NOT IMPLEMENTED!
        parseResponseHeader(responseHeaders: object, mediaType: MediaType): void;

        reset(): void;

        setConfig(): void; // NOT IMPLEMENTED!
    }

    export interface CustomParametersModel {
        addAbrCustomRule(type: string, rulename: string, rule: object): void;

        addRequestInterceptor(interceptor: Function): void;

        addResponseInterceptor(interceptor: Function): void;

        addUTCTimingSource(schemeIdUri: string, value: string): void;

        clearDefaultUTCTimingSources(): void;

        getAbrCustomRules(): Array<object>;

        getCustomCapabilitiesFilters(): Array<CapabilitiesFilterFunction>;

        getCustomInitialTrackSelectionFunction(): Function;

        getLicenseRequestFilters(): Array<Function>;

        getLicenseResponseFilters(): Array<Function>;

        getRequestInterceptors(): void;

        getResponseInterceptors(): void;

        getUTCTimingSources(): Array<object>;

        getXHRWithCredentialsForType(type: string): any;

        registerCustomCapabilitiesFilter(filter: CapabilitiesFilterFunction): void;

        registerLicenseRequestFilter(filter: Function): void;

        registerLicenseResponseFilter(filter: Function): void;

        removeAbrCustomRule(ruleName: string): void;

        removeAllAbrCustomRule(): void;

        removeRequestInterceptor(interceptor: Function): void;

        removeResponseInterceptor(interceptor: Function): void;

        removeUTCTimingSource(schemeIdUri: string, value: string): void;

        reset(): void;

        resetCustomInitialTrackSelectionFunction(): void;

        restoreDefaultUTCTimingSources(): void;

        setConfig(): void; // NOT IMPLEMENTED
        setCustomInitialTrackSelectionFunction(customFunc: Function): void;

        setXHRWithCredentialsForType(type: string, value: string): void;

        unregisterCustomCapabilitiesFilter(filter: CapabilitiesFilterFunction): void;

        unregisterLicenseRequestFilter(filter: Function): void;

        unregisterLicenseResponseFilter(filter: Function): void
    }

    export interface FragmentModel {
        abortRequests(): void;

        executeRequest(request: HTTPRequest): void;

        getRequests(filter: any): HTTPRequest[];

        getStreamId(): string;

        getType(): string;

        isFragmentLoaded(request: HTTPRequest): boolean;

        isFragmentLoadedOrPending(request: HTTPRequest): boolean;

        removeExecutedRequestAfterTime(time: number): boolean;

        removeExecutedRequestsBeforeTime(time: number): boolean;

        reset(): void;

        resetInitialSettings(): void;

        syncExecutedRequestsWithBufferedRange(bufferedRanges: Range[], streamDuration: number): void;
    }

    export interface ManifestModel {
        getValue(): object;

        setValue(value: object): void;
    }

    export interface MediaPlayerModel {
        getAbrBitrateParameter(field: string, mediaType: string): object | -1;

        getBufferTimeDefault(): number;

        getCatchupMaxDrift(): number;

        getCatchupModeEnabled(): boolean;

        getCatchupPlaybackRates(log: any): number;

        getFastSwitchEnabled(): boolean;

        getInitialBufferLevel(): number;

        getRetryAttemptsForType(type: string): number;

        getRetryIntervalsForType(type: string): any;

        reset(): void;

        setConfig(config: object): void;
    }

    export interface MetricsModel {
        config: object;

        addBufferLevel(mediaType: MediaType, t: Date, level: number): void;

        addBufferState(mediaType: MediaType, state: string, target: number): void;

        addDVBErrors(vo: any): void;

        addDVRInfo(mediaType: MediaType, currentTime: number, mpd: Mpd, range: Range): void;

        addDroppedFrames(mediaType: MediaType, quality: number): void;

        addHttpRequest(request: HTTPRequest, response: object, traces: object, cmsd: object): void;

        addManifestUpdate(mediaType: MediaType, type: string, requestTime: number, fetchTime: number): void;

        addManifestUpdateRepresentationInfo(manifestUpdate: ManifestUpdate, representation: Representation, mediaType: MediaType): void;

        addManifestUpdateStreamInfo(manifestUpdate: ManifestUpdate, id: string, index: number, start: number, duration: number): void;

        addPlayList(vo: any): void;

        addRepresentationSwitch(mediaType: MediaType, t: Date, mt: Date, to: string, lto: string): void;

        addRequestsQueue(mediaType: MediaType, loadingRequests: any[], executedRequests: any[]): void;

        addSchedulingInfo(mediaType: MediaType, t: number, startTime: number, availabilityStartTime: number, duration: number, quality: number, range: Range, state: string): void;

        clearAllCurrentMetrics(): void;

        clearCurrentMetricsForType(type: string): void;

        getMetricsFor(type: string, readOnly: boolean): object;

        updateManifestUpdateInfo(manifestUpdate: ManifestUpdate, updatedFields: any[]): void;
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
        getURIFragmentData(): URIFragmentData;

        initialize(uri: string): void;
    }

    interface VideoModel {
        addEventListener(): void;

        addTextTrack(kind: TextTrackType, label: string | number | undefined, isTTML: boolean, isEmbedded: boolean): TextTrackInfo;

        appendChild(childElement: any): void;

        getBufferRange(): TimeRanges | null;

        getClientHeight(): number;

        getClientWidth(): number;

        getElement(): HTMLVideoElement | HTMLAudioElement;

        getEnded(): boolean | null;

        getPlaybackQuality(): number;

        getPlaybackRate(): number | null;

        getPlayedRanges(): TimeRanges | null;

        getReadyState(): number;

        getSource(): string | null;

        getTTMLRenderingDiv(): HTMLDivElement | null;

        getTextTrack(kind: TextTrackType, label: string | number | undefined, isTTML: boolean, isEmbedded: boolean): TextTrackInfo | null;

        getTextTracks(): TextTrackList[];

        getTime(): number | null;

        getVideoHeight(): number;

        getVideoRelativeOffsetLeft(): number;

        getVideoRelativeOffsetTop(): number;

        getVideoWidth(): number;

        getVttRenderingDiv(): HTMLDivElement | null;

        initialize(): void;

        isPaused(): void;

        isSeeking(): void;

        isStalled(): boolean;

        onPlaying(): void;

        pause(): void;

        play(): void;

        removeChild(childElement: any): void;

        removeEventListener(): void;

        reset(): void;

        setDisableRemotePlayback(value: boolean): void;

        setElement(value: HTMLVideoElement | HTMLAudioElement): void;

        setPlaybackRate(value: number, ignoreReadyState?: boolean): void;

        setSource(source: string): void;

        setStallState(type: MediaType, state: boolean): void;

        setTTMLRenderingDiv(div: HTMLDivElement): void;

        setVttRenderingDiv(div: HTMLDivElement): void;

        setcurrentTime(currentTime: number, stickToBuffered: boolean): void;

        stallStream(type: MediaType, isStalled: boolean): void;

        waitForReadyState(targetReadyState: number, callback: () => any): void;

    }

    /**
     * Streaming - Net
     **/

    export interface FetchLoader {
        abort(): void;

        calculateDownloadedTime(downloadedData: any, bytesReceived: any): number | null;

        load(httpRequest: HTTPRequest, httpResponse: object): void;

        reset(): void;

        setup(cfg: object): void;
    }

    export interface HTTPLoader {
        cfg: object;

        abort(): void;

        load(config: object): void;

        reset(): void;

        resetInitialSettings(): void;

        setConfig(config: object): void;
    }

    export interface SchemeLoaderFactory {
        getLoader(url: string): HTTPLoader;

        registerLoader(scheme: string, loader: any): void;

        reset(): void;

        unregisterAllLoader(): void;

        unregisterLoader(scheme: string): void;
    }

    export interface URLLoader {
        abort(): void;

        load(config: object): any;

        reset(): void;

        resetInitialSettings(): void;
    }

    export interface XHRLoader {
        abort(request: HTTPRequest): void;

        getXhr(httpRequest: CommonMediaRequest, httpResponse: CommonMediaResponse): boolean;

        load(httpRequest: HTTPRequest): HTTPRequest;

        reset(): void;

        resetInitialSettings(): void;
    }

    /**
     * Streaming - Protection - Controllers
     **/

    interface ProtectionController {
        areKeyIdsExpired(normalizedKeyIds: Array<string | number>): boolean;

        areKeyIdsUsable(normalizedKeyIds: Array<string | number>): boolean;

        clearMediaInfoArray(): void;

        closeKeySession(sessionToken: SessionToken): void;

        createKeySession(keySystemInfo: KeySystemInfo): void;

        getKeySystems(): any[];

        getSupportedKeySystemMetadataFromContentProtection(cps: object[]): object[];

        handleKeySystemFromManifest(): void;

        initializeForMedia(mediaInfo: MediaInfo): void;

        loadKeySession(keySystemInfo: KeySystemInfo): void;

        removeKeySession(sessionToken: SessionToken): void;

        reset(): void;

        setKeySystems(keySystems: KeySystem[]): void;

        setMediaElement(element: HTMLMediaElement): void;

        setProtectionData(data: object): void;

        setRobustnessLevel(level: string): void;

        setServerCertificate(serverCertificate: ArrayBuffer): void;

        setSessionType(value: string): void;

        stop(): void;

        updateKeyStatusesMap(e: object): void;
    }

    export interface ProtectionKeyController {
        getKeySystemBySystemString(systemString: string): KeySystem | null;

        getKeySystems(): KeySystem[];

        getLicenseServerModelInstance(keySystem: KeySystem, protData: ProtectionData, messageType: string): any | null;

        getSupportedKeySystemMetadataFromContentProtection(cps: object[], protDataSet: ProtectionDataSet, sessionType: string): object[];

        getSupportedKeySystemMetadataFromSegmentPssh(initData: ArrayBuffer, protDataSet: ProtectionDataSet, sessionType: string): object[];

        initDataEquals(initData1: ArrayBuffer, initData2: ArrayBuffer): boolean;

        initialize(): void;

        isClearKey(keySystem: KeySystem): boolean;

        processClearKeyLicenseRequest(clearKeySystem: KeySystem, ProtectionData: ProtectionData, message: ArrayBuffer): ClearKeyKeySet | null;

        setConfig(config: object): void;

        setKeySystems(newKeySystems: KeySystem[]): void;

        setProtectionData(protectionDataSet: ProtectionDataSet): ProtectionData;
    }

    /**
     * Streaming - Protection - Drm
     **/

    export interface KeySystem {
        schemeIdURI: string;
        systemString: string;
        uuid: string;

        getCDMData(cdmData: string | null): ArrayBuffer | null;

        getInitData(cp: object, cencContentProtection: object | null): ArrayBuffer | null;

        getLicenseRequestFromMessage(message: ArrayBuffer): Uint8Array | null;

        getLicenseServerURLFromInitData(initData: ArrayBuffer): string | null;

        getRequestHeadersFromMessage(message: ArrayBuffer): object | null;

        getSessionId(): string | null;
    }

    export interface KeySystemClearKey {
        uuid: string;
        schemeIdURI: string;
        systemString: string;

        getCDMData(): null;

        getClearKeysFromProtectionData(protectionData: ProtectionData, message: ArrayBuffer): ClearKeyKeySet;

        getInitData(cp: object, cencContentProtection: object | null): ArrayBuffer | null;

        getLicenseRequestFromMessage(message: ArrayBuffer): Uint8Array | null;

        getLicenseServerURLFromInitData(): null;

        getRequestHeadersFromMessage(): object;
    }

    export interface KeySystemPlayReady {
        uuid: string;
        schemeIdURI: string;
        systemString: string;

        getCDMData(cdmData: string | null): ArrayBuffer | null;

        getInitData(cpData: object): ArrayBuffer;

        getLicenseRequestFromMessage(message: ArrayBuffer): Uint8Array | null;

        getLicenseServerURLFromInitData(initData: ArrayBuffer): string | null;

        getRequestHeadersFromMessage(message: ArrayBuffer): object;

        setPlayReadyMessageFormat(format: string): void;
    }

    export interface KeySystemW3CClearKey {
        uuid: string;
        systemString: string;
        schemeIdURI: string;

        getCDMData(): null;

        getClearKeysFromProtectionData(protectionData: ProtectionData, message: ArrayBuffer): ClearKeyKeySet;

        getInitData(cp: object): ArrayBuffer | null;

        getLicenseRequestFromMessage(message: ArrayBuffer): Uint8Array | null;

        getLicenseServerURLFromInitData(): null;

        getRequestHeadersFromMessage(): null;
    }

    export interface KeySystemWidevine {
        uuid: string;
        schemeIdURI: string;
        systemString: string;

        getCDMData(): null;

        getInitData(cp: object): ArrayBuffer | null;

        getLicenseRequestFromMessage(message: ArrayBuffer): Uint8Array | null;

        getLicenseServerURLFromInitData(): null;

        getRequestHeadersFromMessage(): null;
    }

    /**
     * Streaming - Protection - Errors
     **/

    interface ProtectionErrors {
        KEY_SESSION_CREATED_ERROR_CODE: 113;
        KEY_STATUS_CHANGED_EXPIRED_ERROR_CODE: 110;
        KEY_SYSTEM_ACCESS_DENIED_ERROR_CODE: 112;
        MEDIA_KEYERR_CLIENT_CODE: 102;
        MEDIA_KEYERR_CODE: 100;
        MEDIA_KEYERR_DOMAIN_CODE: 106;
        MEDIA_KEYERR_HARDWARECHANGE_CODE: 105;
        MEDIA_KEYERR_OUTPUT_CODE: 104;
        MEDIA_KEYERR_SERVICE_CODE: 103;
        MEDIA_KEYERR_UNKNOWN_CODE: 101;
        MEDIA_KEY_MESSAGE_ERROR_CODE: 107;
        MEDIA_KEY_MESSAGE_LICENSER_ERROR_CODE: 114;
        MEDIA_KEY_MESSAGE_NO_CHALLENGE_ERROR_CODE: 108;
        MEDIA_KEY_MESSAGE_NO_LICENSE_SERVER_URL_ERROR_CODE: 111;
        SERVER_CERTIFICATE_UPDATED_ERROR_CODE: 109;

        KEY_SESSION_CREATED_ERROR_MESSAGE: 'DRM: unable to create session! --';
        KEY_STATUS_CHANGED_EXPIRED_ERROR_MESSAGE: 'DRM: KeyStatusChange error! -- License has expired';
        KEY_SYSTEM_ACCESS_DENIED_ERROR_MESSAGE: 'DRM: KeySystem Access Denied! -- ';
        MEDIA_KEYERR_CLIENT_MESSAGE: 'The Key System could not be installed or updated.';
        MEDIA_KEYERR_DOMAIN_MESSAGE: 'An error occurred in a multi-device domain licensing configuration. The most common error is a failure to join the domain.';
        MEDIA_KEYERR_HARDWARECHANGE_MESSAGE: 'A hardware configuration change caused a content protection error.';
        MEDIA_KEYERR_OUTPUT_MESSAGE: 'There is no available output device with the required characteristics for the content protection system.';
        MEDIA_KEYERR_SERVICE_MESSAGE: 'The message passed into update indicated an error from the license service.';
        MEDIA_KEYERR_UNKNOWN_MESSAGE: 'An unspecified error occurred. This value is used for errors that don\'t match any of the other codes.';
        MEDIA_KEY_MESSAGE_ERROR_MESSAGE: 'Multiple key sessions were creates with a user-agent that does not support sessionIDs!! Unpredictable behavior ahead!';
        MEDIA_KEY_MESSAGE_LICENSER_ERROR_MESSAGE: 'DRM: licenser error! --';
        MEDIA_KEY_MESSAGE_NO_CHALLENGE_ERROR_MESSAGE: 'DRM: Empty key message from CDM';
        MEDIA_KEY_MESSAGE_NO_LICENSE_SERVER_URL_ERROR_MESSAGE: 'DRM: No license server URL specified!';
        SERVER_CERTIFICATE_UPDATED_ERROR_MESSAGE: 'Error updating server certificate -- ';
    }

    /**
     * Streaming - Protection - Models
     **/

    export interface DefaultProtectionModel {
        closeKeySession(sessionToken: SessionToken): void;

        createKeySession(ksInfo: KeySystemInfo): any;

        getAllInitData(): ArrayBuffer[];

        getSessionTokens(): any[];

        loadKeySession(ksInfo: KeySystemInfo): void;

        removeKeySession(sessionToken: SessionToken): void;

        requestKeySystemAccess(ksConfigurations: object[]): Promise<any>;

        reset(): void;

        selectKeySystem(keySystemAccess: KeySystemAccess): Promise<any>;

        setMediaElement(mediaElement: HTMLMediaElement): void;

        setServerCertificate(serverCertificate: ArrayBuffer): void;

        stop(): void;

        updateKeySession(sessionToken: SessionToken, message: ArrayBuffer): void;
    }

    export interface ProtectionModel_01b {
        closeKeySession(sessionToken: SessionToken): void;

        createKeySession(ksInfo: KeySystemInfo): any;

        getAllInitData(): ArrayBuffer[];

        getSessionTokens(): any[];

        loadKeySession(): void;

        removeKeySession(): void;

        requestKeySystemAccess(ksConfigurations: object[]): Promise<any>;

        reset(): void;

        selectKeySystem(keySystemAccess: any): Promise<any>;

        setMediaElement(mediaElement: HTMLMediaElement): void;

        setServerCertificate(): void;

        stop(): void;

        updateKeySession(sessionToken: SessionToken, message: ArrayBuffer): void;
    }

    export interface ProtectionModel_3Fe2014 {
        closeKeySession(sessionToken: SessionToken): void;

        createKeySession(ksInfo: KeySystemInfo): any;

        getAllInitData(): ArrayBuffer[];

        getSessionTokens(): any[];

        loadKeySession(): void;

        removeKeySession(): void;

        requestKeySystemAccess(ksConfigurations: object[]): Promise<any>;

        reset(): void;

        selectKeySystem(keySystemAccess: any): Promise<any>;

        setMediaElement(mediaElement: HTMLMediaElement): void;

        setServerCertificate(): void;

        stop(): void;

        updateKeySession(sessionToken: SessionToken, message: ArrayBuffer): void;
    }

    export interface ProtectionModel {
        closeKeySession(sessionToken: SessionToken): void;

        createKeySession(initData: ArrayBuffer, protData: ProtectionData, sessionType: string): void;

        getAllInitData(): ArrayBuffer[];

        loadKeySession(sessionId: string, initData: ArrayBuffer): void;

        removeKeySession(sessionToken: SessionToken): void;

        requestKeySystemAccess(ksConfigurations: object[]): Promise<any>;

        reset(): void;

        selectKeySystem(keySystemAccess: KeySystemAccess): Promise<any>;

        setMediaElement(mediaElement: HTMLMediaElement): void;

        setServerCertificate(serverCertificate: ArrayBuffer): void;

        stop(): void;

        updateKeySession(sessionToken: SessionToken, message: ArrayBuffer): void;
    }

    /**
     * Streaming - Protection - Server
     **/

    export interface ClearKey {
        getErrorResponse(serverResponse: object): string;

        getHTTPMethod(): 'POST';

        getLicenseMessage(serverResponse: object): ClearKeyKeySet;

        getResponseType(): 'json';

        getServerURLFromMessage(url: string): string;
    }

    export interface DRMToday {
        getErrorResponse(serverResponse: object): string;

        getHTTPMethod(): 'POST';

        getLicenseMessage(serverResponse: object, keySystemStr: string): any;

        getResponseType(keySystemStr: string): string;

        getServerURLFromMessage(url: string): string;
    }

    export interface LicenseServer {
        getErrorResponse(serverResponse: object): string;

        getHTTPMethod(messageType: string): string;

        getLicenseMessage(serverResponse: object, keySystemStr: string): ArrayBuffer | null;

        getResponseType(keySystemStr: string, messageType: string): string;

        getServerURLFromMessage(url: string, message: ArrayBuffer, messageType: string): string;
    }

    export interface PlayReady {
        getErrorResponse(serverResponse: object): string;

        getHTTPMethod(): 'POST';

        getLicenseMessage(serverResponse: object): any;

        getResponseType(): 'arraybuffer';

        getServerURLFromMessage(url: string): string;
    }

    export interface Widevine {
        getErrorResponse(serverResponse: object): string;

        getHTTPMethod(): 'POST';

        getLicenseMessage(serverResponse: object): object;

        getResponseType(): 'arraybuffer';

        getServerURLFromMessage(url: string): string;
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

        defaultURL: string;
        message: ArrayBuffer;
        messageType: string;
        sessionToken: SessionToken;
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
        nativeMediaKeySystemAccessObject: object | null;
        selectedSystemString: string | null;
    }

    export class KeySystemConfiguration {
        constructor(audioCapabilities: MediaCapability[], videoCapabilities: MediaCapability[], distinctiveIdentifier: string, persistentState: string, sessionTypes: string[])

        audioCapabilities: MediaCapability[];
        distinctiveIdentifier: string;
        persistentState: string;
        sessionTypes: string[];
        videoCapabilities: MediaCapability[];
    }

    export class KeySystemMetadata {
        constructor(config: object);

        config: object;
    }

    export class LicenseRequest {
        constructor(url: string, method: string, responseType: string, headers: {
            [key: string]: string
        }, withCredentials: boolean, messageType: string, sessionId: string, data: ArrayBuffer)

        data: ArrayBuffer;
        headers: { [key: string]: string };
        messageType: string;
        method: string;
        responseType: string;
        sessionId: string;
        url: string;
        withCredentials: boolean;
    }

    export class LicenseRequestComplete {
        constructor(message: Uint8Array, sessionToken: SessionToken, messageType: string)

        message: Uint8Array;
        messageType: string;
        sessionToken: SessionToken;
    }

    export class LicenseResponse {
        constructor(url: string, headers: object, data: ArrayBuffer)

        data: ArrayBuffer;
        headers: object;
        url: string;
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

        getExpirationTime(): number;

        getKeyStatuses(): MediaKeyStatusMap;

        getSessionId(): string;

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
        KEY_SESSION_UPDATED: 'public_keySessionUpdated';
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
        getNextQuality(mediaInfo: MediaInfo, throughput: number, latency: number, bufferSize: number, playbackRate: number, currentQualityIndex: number, dynamicWeightSelector: object): any | null;

        reset(): void;
    }

    export interface LoLpQoEEvaluator {
        calculateSingleUseQoe(segmentBitrate: number, segmentRebufferTime: number, currentLatency: number, currentPlaybackSpeed: number): number;

        getPerSegmentQoe(): QoeInfo;

        logSegmentMetrics(segmentBitrate: number, segmentRebufferTime: number, currentLatency: number, currentPlaybackSpeed: number): void;

        reset(): void;

        setupPerSegmentQoe(sDuration: number, maxBrKbps: number, minBrKbs: number): void;
    }

    export interface LoLpRule {
        getSwitchRequest(rulesContext: RulesContext): SwitchRequest;

        reset(): void;
    }

    export interface LoLpWeightSelector {
        findWeightVector(neurons: any[], currentLatency: number, currentBuffer: number, currentRebuffer: number, currentThroughput: number, playbackRate: number): number | null;

        getMinBuffer(): number;

        getNextBuffer(currentBuffer: number, downloadTime: number): number;

        getNextBufferWithBitrate(bitrateToDownload: number, currentBuffer: number, currentThroughput: number): number;

        getSegmentDuration(): number;
    }

    export class QoeInfo {
        bitrateSwitchSum: number;
        bitrateWSum: number;
        lastBitrate: number | null;
        latencyWSum: number;
        playbackSpeedWSum: number;
        rebufferWSum: number;
        totalQoe: number;
        type: string | null;
        weights: {
            bitrateReward: number | null,
            bitrateSwitchPenalty: number | null,
            rebufferPenalty: number | null,
            latencyPenalty: number | null,
            playbackSpeedPenalty: number | null
        };
    }

    /**
     * Streaming - Rules -Abr
     **/

    export interface AbandonRequestsRule {
        shouldAbandon(rulesContext: RulesContext): SwitchRequest;

        reset(): void;
    }

    export interface ABRRulesCollection {
        clearDataForStream(streamId: string | number): void;

        getAbandonFragmentRules(): object;

        getBestPossibleSwitchRequest(rulesContext: RulesContext): SwitchRequest;

        getBolaState(mediaType: MediaType): string;

        getMinSwitchRequest(srArray: any[]): SwitchRequest;

        getQualitySwitchRules(): any[];

        initialize(): void;

        reset(): void;

        setBolaState(mediaType: MediaType, value: string): void;

        shouldAbandonFragment(rulesContext: RulesContext, streamId: string): SwitchRequest;
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
        clearDataForStream(streamId: string): void;

        getFrameHistory(streamId: string): object;

        push(streamId: string, index: number, playbackQuality: number): void;

        reset(): void;
    }

    export interface RulesContext {
        getAbrController(): AbrController;

        getCurrentRequest(): SwitchRequest;

        getDroppedFramesHistory(): DroppedFramesHistory;

        getMediaInfo(): MediaInfo;

        getMediaType(): string;

        getRepresentation(): Representation;

        getScheduleController(): ScheduleController;

        getStreamInfo(): StreamInfo;

        getSwitchHistory(): SwitchRequestHistory;

        getThroughputController(): ThroughputController;

        getVideoModel(): VideoModel;
    }

    export interface SwitchRequest {
        priority: number | null;
        reason: string | null;
        representation: Representation;
        rule: any
    }

    export interface SwitchRequestHistory {
        clearForStream(streamId: string | number): object;

        getSwitchRequests(): SwitchRequest[];

        push(switchRequest: SwitchRequest): void;

        reset(): void;
    }

    /**
     * Streaming - Text
     **/

    export type TextTrackType = 'subtitles' | 'caption' | 'descriptions' | 'chapters' | 'metadata';

    export type FontDownloadStatus = 'unloaded' | 'loaded' | 'error';

    export interface FontInfo {
        fontFace: FontFace;
        fontFamily: string;
        isEssential: boolean;
        mimeType: string;
        status: FontDownloadStatus;
        streamId: string;
        trackId: number;
        url: string;
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
        appendInitSegmentFromCache(representationId: string): void;

        clearBuffers(): Promise<any>;

        createBufferSink(mediaInfo: MediaInfo): void;

        dischargePreBuffer(): void;

        getAllRangesWithSafetyFactor(): [];

        getBuffer(): SourceBufferSink;

        getBufferControllerType(): string;

        getBufferLevel(): 0;

        getContinuousBufferTimeForTargetTime(): number;

        getIsBufferingCompleted(): boolean;

        getIsPruningInProgress(): false;

        getMediaSource(): MediaSource;

        getRangeAt(): null;

        getStreamId(): string;

        getType(): string;

        hasBufferAtTime(): boolean;

        initialize(source: MediaSource): void;

        prepareForPlaybackSeek(): Promise<any>;

        prepareForReplacementTrackSwitch(): Promise<any>;

        pruneAllSafely(): Promise<any>;

        pruneBuffer(): void;

        reset(): void;

        segmentRequestingCompleted(): void

        setIsBufferingCompleted(value: boolean): void;

        setMediaSource(value: MediaSource): void;

        setSeekTarget(): void;

        updateAppendWindow(): Promise<any>;

        updateBufferTimestampOffset(): Promise<any>;
    }

    export interface TextController {
        addEmbeddedTrack(streamInfo: StreamInfo, mediaInfo: MediaInfo): void;

        addMediaInfosToBuffer(streamInfo: StreamInfo, mInfos: MediaInfo[], mimeType: string | null, fragmentModel?: FragmentModel): void;

        createTracks(streamInfo: StreamInfo): void;

        deactivateStream(streamInfo: StreamInfo): void;

        enableForcedTextStreaming(enable: boolean): void;

        enableText(streamId: string, enable: boolean): void;

        getAllTracksAreDisabled(): boolean;

        getCurrentTrackIdx(streamId: string): number;

        getTextSourceBuffer(streamInfo: StreamInfo): TextSourceBuffer;

        initialize(): void;

        initializeForStream(streamInfo: StreamInfo): void;

        isTextEnabled(): boolean;

        reset(): void;

        setTextTrack(streamId: string, idx: number): void;
    }

    export interface TextSourceBuffer {
        abort(): void;

        addEmbeddedTrack(mediaInfo: MediaInfo): void;

        addMediaInfos(type: string, mInfos: MediaInfo[], fModel: FragmentModel): void;

        append(bytes: number[], chunk: DataChunk): void;

        getConfig(): object;

        getStreamId(): string;

        initialize(): void;

        remove(start?: number, end?: number): void;

        reset(): void;

        resetEmbedded(): void;

        resetMediaInfos(): void;

        setCurrentFragmentedTrackIdx(idx: number): void;
    }

    export interface TextTracks {
        addCaptions(trackIdx: number, timeOffset: number, captionData: object): void;

        addTextTrack(textTrackInfoVO: TextTrackInfo): void;

        createTracks(): void;

        deleteAllTextTracks(): void;

        deleteCuesFromTrackIdx(trackIdx: number, start: number, end: number): void;

        disableManualTracks(): void;

        getCurrentTrackIdx(): number;

        getCurrentTrackInfo(): TextTrackInfo;

        getStreamId(): string;

        getTrackByIdx(idx: number): object;

        getTrackIdxForId(trackId: string): number;

        initialize(): void;

        manualProcessing(time: number): void;

        setCurrentTrackIdx(idx: number): void;

        setModeForTrackIdx(idx: number, mode: string): void;
    }

    /**
     * Streaming - Thumbnail
     **/

    export interface ThumbnailController {
        getCurrentTrack(): object;

        getCurrentTrackIndex(): number;

        getPossibleVoRepresentations(): Representation[];

        getStreamId(): string;

        initialize(): void;

        provide(time: number, callback: Function): void;

        reset(): void;

        setTrackById(id: number): void;

        setTrackByIndex(index: number): void;
    }

    export interface ThumbnailTracks {
        addTracks(): void;

        getCurrentTrack(): any | null;

        getCurrentTrackIndex(): number;

        getRepresentations(): Representation[];

        getThumbnailRequestForTime(time: number): Request;

        getTracks(): any[];

        reset(): void;

        setTrackById(id: number): void;

        setTrackByIndex(index: number): void;
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

        reset(): void;

        select(data: ArrayBuffer): void;

        setConfig(config: object): void;
    }

    export interface BoxParser {
        findInitRange(data: ArrayBuffer): Range;

        findLastTopIsoBoxCompleted(types: string[], buffer: ArrayBuffer | Uint8Array, offset: number): IsoBoxSearchInfo;

        getMediaTimescaleFromMoov(ab: ArrayBuffer): number;

        getSamplesInfo(ab: ArrayBuffer): object;

        parse(data: ArrayBuffer): IsoFile | null;

        parsePayload(types: string[], buffer: ArrayBuffer, offset: number): IsoBoxSearchInfo;
    }

    export interface Capabilities {
        areKeyIdsExpired(mediaInfo: MediaInfo): boolean;

        areKeyIdsUsable(mediaInfo: MediaInfo): boolean;

        codecRootCompatibleWithCodec(codec1: string, codec2: string): boolean;

        isCodecSupportedBasedOnTestedConfigurations(basicConfiguration: object, type: string): boolean;

        isProtectionCompatible(previousStreamInfo: StreamInfo, newStreamInfo: StreamInfo): boolean;

        runCodecSupportCheck(basicConfiguration: object, type: string): Promise<void>;

        setConfig(config: object): void;

        setEncryptedMediaSupported(value: boolean): void;

        setProtectionController(data: any): void;

        supportsChangeType(): boolean;

        supportsEncryptedMedia(): boolean;

        supportsEssentialProperty(ep: object): boolean;

        supportsMediaSource(): boolean;
    }

    export type CapabilitiesFilterFunction = (representation: Representation) => boolean;

    export interface CapabilitiesFilter {
        filterUnsupportedFeatures(manifest: object): Promise<any>;

        setConfig(config: object): void;
    }

    export interface CustomTimeRanges {
        customTimeRangeArray: any[];
        length: number;

        add(start: number, end: number): void;

        clear(): void;

        end(index: number): number;

        mergeRanges(rangeIndex1: number, rangeIndex2: number): boolean;

        remove(start: number, end: number): void;

        start(index: number): number;
    }

    export interface DefaultURLUtils {
        isHTTPS(url: string): boolean;

        isHTTPURL(url: string): boolean;

        isPathAbsolute(url: string): boolean;

        isRelative(url: string): boolean;

        isSchemeRelative(url: string): boolean;

        parseBaseUrl(url: string): string;

        parseOrigin(url: string): string;

        parseScheme(url: string): string;

        removeHostname(url: string): string;

        resolve(url: string, baseUrl: BaseURL): string;
    }

    export interface DOMStorage {
        getSavedBitrateSettings(type: string): number;

        getSavedMediaSettings(type: string): object;

        setSavedBitrateSettings(type: string, bitrate: number): void;

        setSavedMediaSettings(type: string, value: any): void;
    }

    export interface EBMLParser {
        consumeTag(tag: object, test: boolean): boolean;

        consumeTagAndSize(tag: object, test: boolean): boolean;

        getMatroskaCodedNum(retainMSB: boolean): number;

        getMatroskaFloat(size: number): number;

        getMatroskaUint(size: number): number;

        getPos(): number;

        moreData(): boolean;

        parseTag(tag: object): boolean;

        setPos(value: number): void;

        skipOverElement(tag: object, test: boolean): boolean;
    }

    export interface ErrorHandler {
        error(err: any): void;
    }

    export interface InitCache {
        extract(streamId: string, representationId: string): any | null;

        save(chunk: DataChunk): void;

        reset(): void;
    }

    export interface IsoFile {
        getBox(type: string): IsoBox;

        getBoxes(type: string): IsoBox[];

        getLastBox(): IsoBox | null;

        setData(value: string): void;
    }

    export interface LocationSelector { // DOUBLED UP?
        selectBaseUrlIndex(data: any): number;

        setConfig(config: object): void;
    }

    export interface LocationSelector {
        reset(): void;

        select(mpdLocations: MpdLocation[]): MpdLocation | null;

        setConfig(config: object): void;
    }

    export interface ObjectUtils {
        areEqual(obj1: object, obj2: object): boolean;
    }

    export interface SupervisorTools { // BASE FILE DIFFERENT LAYOUT FROM ALL OTHERS
        checkInteger(parameter: any): void;

        checkIsVideoOrAudioType(type: string): void;

        checkParameterType(parameter: any, type: string): void;

        checkRange(parameter: any, min: number, max: number): void;
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
        isHTTPS(url: string): boolean;

        isHTTPURL(url: string): boolean;

        isPathAbsolute(url: string): boolean;

        isRelative(url: string): boolean;

        isSchemeRelative(url: string): boolean;

        parseBaseUrl(url: string): string;

        parseOrigin(url: string): string;

        parseScheme(url: string): string;

        registerUrlRegex(regex: RegExp, utils: object): void;

        removeHostname(url: string): string;

        resolve(url: string, baseUrl: BaseURL): string;
    }

    export interface VttCsutomRenderingParser {
        parse(data: any): any[];
    }

    export interface VTTParser {
        getCaptionStyles(arr: Array<any>): object;

        parse(data: ArrayBuffer): { start: number, end: number, data: string, styles: any };
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
        _fileLoaderType: string;
        _mediaduration: number | null;
        _quality: number | null;
        _resourceTimingValues: object;
        _responseHeaders: any[] | null;
        _serviceLocation: string | null;
        _stream: MediaType;
        _tfinish: Date | null;
        actualurl: string | null;
        cmsd: object;
        interval: number | null;
        range: any[];
        responsecode: number | null;
        tcpid: string | null;
        trace: any[];
        trequest: Date | null;
        tresponse: Date | null;
        type?: string | null;
        url: string | null;
    }

    export interface ManifestUpdate {
        availabilityStartTime: number | null;
        buffered: object | null;
        clientTimeOffset: number;
        currentTime: number | null;
        fetchTime: number | null;
        latency: number;
        mediaType: MediaType | null;
        presentationStartTime: number;
        representationInfo: ManifestUpdateRepresentationInfo[];
        requestTime: number | null;
        streamInfo: StreamInfo[];
        type: string | null;
    }

    export interface ManifestUpdateRepresentationInfo {
        id: string | null;
        index: number | null;
        mediaType: MediaType | null;
        presentationTimeOffset: number | null;
        startNumber: number | null;
    }

    export interface PlayList {
        mstart: number | null;
        start: number | null;
        starttype: string | null;
        trace: any[];
    }

    export interface RepresentationSwitch {
        lto: number | null;
        mt: number | null;
        t: number | null;
        to: number | null;
    }

    export interface PlayListTrace {
        duration: number | null;
        mstart: number | null;
        playbackspeed: number | null;
        representationid: string | null;
        start: number | null;
        stopreason: string | null;
        subreplevel: number | null;
    }

    export interface RequestSwitch {
        lto: string | null;
        mt: number | null;
        t: number | null;
        to: string | null;
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
        availabilityStartTime: number | null;
        duration: number | null;
        mediaType: MediaType | null;
        quality: number | null;
        range: Range | null;
        startTime: number | null;
        state: string | null;
        t: number | null;
        type: string | null;
    }

    export interface TCPConnection {
        dest: string | null;
        tclose: number | null;
        tconnect: number | null
        tcpid: string | null;
        topen: number | null;
    }

    /**
     * Streaming - Vo
     */

    export class BitrateInfo {
        bitrate: number;
        height: number;
        mediaType: MediaType;
        qualityIndex: number;
        scanType: string;
        width: number;
    }

    interface DashJSError {
        code: number | null;
        data: unknown | null;
        message: string | null;
    }

    export interface DataChunk {
        bytes: number[] | null;
        duration: number;
        end: number;
        endFragment: object | null;
        index: number;
        mediaInfo: MediaInfo | null;
        quality: number;
        representationId: string | null;
        segmentType: string | null;
        start: number;
        streamId: string | null;
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
        requestEndDate: Date | null;
        responseType: string;
        serviceLocation: string;
        startDate: Date;
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
        headers: object;
        loader: object;
        method: string;
        onerror: Function;
        onload: Function;
        onloadend: Function;
        ontimeout: Function;
        progress: Function;
        reader: object;
        request: FragmentRequest;
        response: object;
        timeout: number;
        url: string;
        withCredentials: boolean;
    }

    export class IsoBox {
        constructor(boxData: object);
    }

    export class IsoBoxSearchInfo {
        constructor(found: boolean,
                    sizeOfLastCompletedBox: number,
                    sizeOfLastFoundTargetBox: number,
                    startOffsetOfLastCompletedBox: number,
                    startOffsetOfLastFoundTargetBox: number,
                    typeOfLastCompletedBox: string,
                    typeOfLastTargetBox: string);

        found: boolean;
        sizeOfLastCompletedBox: number;
        sizeOfLastFoundTargetBox: number;
        startOffsetOfLastCompletedBox: number;
        startOffsetOfLastFoundTargetBox: number;
        typeOfLastCompletedBox: string | null;
        typeOfLastTargetBox: string | null;
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
        newRepresentation: Representation | null
        previouslySelectedRepresentation: Representation | null;
    }

    export class TextRequest extends FragmentRequest {
        constructor(url: string, type: string);

        mediaType: MediaType;
        responseType: string;
        type: 'InitializationSegment' | 'MediaSegment' | null;
        url: string | null;
    }

    export class TextTrackInfo extends MediaInfo {
        captionData: CaptionData[] | null;
        defaultTrack: boolean;
        isEmbedded: boolean;
        isFragmented: boolean;
        isTTML: boolean;
        kind: string;
        label: string | null;
    }

    export interface Thumbnail {
        height: number;
        url: string;
        width: number;
        x: number;
        y: number;
    }

    export interface ThumbnailTrackInfo {
        bitrate: number;
        height: number;
        heightPerTile: number;
        id: string;
        segmentDuration: number;
        startNumber: number;
        templateUrl: string;
        tilesHor: number;
        tilesVert: number;
        timescale: number;
        width: number;
        widthPerTile: number;
    }

    export interface URIFragmentData {
        id: string | null;
        r: any | null;
        s: any | null;
        t: number | null;
        track: any | null;
        xywh: any | null;
    }

    /**
     * Streaming
     **/

    export interface FragmentLoader {
        abort(): void;

        checkForExistence(request: Request): void;

        load(request: Request): void;

        reset(): void;

        resetInitialSettings(): void;
    }

    export interface FragmentSink {
        abort(): void;

        append(chunk: DataChunk): void;

        getAllBufferRanges(): any[];

        remove(start?: number, end?: number): void;

        reset(): void;
    }

    export interface ManifestLoader {
        load(url: string, serviceLocation: string | null, queryParams: object | null): void;

        reset(): void;
    }

    export interface ManifestUpdater {
        getIsUpdating(): boolean;

        initialize(): void;

        refreshManifest(ignorePatch?: boolean): void;

        reset(): void;

        setConfig(config: object): void;

        setManifest(manifest: object): void;
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
        abort(): void;

        append(chunk: DataChunk): void;

        discharge(start?: number, end?: number): void;

        getAllBufferRanges(): TimeRanges;

        getBuffer(): PreBufferSink;

        remove(start: number, end: number): void;

        reset(): void;

        updateTimestampOffset(): void;

        waitForUpdateEnd(callback: Function): void;
    }

    export interface SourceBufferSink {
        abort(): Promise<any>;

        append(chunk: DataChunk, request?: Request): Promise<any>;

        changeType(codec: string): Promise<any>;

        getAllBufferRanges(): object;

        getBuffer(): Buffer;

        getSessionType(): string;

        getType(): string;

        getUsable(): boolean;

        initializeForFirstUse(streamInfo: StreamInfo, mInfo: MediaInfo, selectedRepresentation: Representation): void;

        initializeForStreamSwitch(mInfo: MediaInfo, selectedRepresentation: Representation, oldSourceBufferSink: SourceBufferSink): Promise<any>;

        remove(range: Range): Promise<any>;

        reset(): void;

        updateAppendWindow(sInfo: StreamInfo): void;

        updateTimestampOffset(mseTimeOffset: number): void;
    }

    export interface Stream {
        activate(mediaSource: MediaSource, previousBufferSinks: any[]): void;

        checkAndHandleCompletedBuffering(): void;

        deactivate(keepBuffers: boolean): void;

        getAdapter(): DashAdapter

        getDuration(): number;

        getHasAudioTrack(): boolean;

        getHasFinishedBuffering(): boolean

        getHasVideoTrack(): boolean;

        getId(): string;

        getIsActive(): boolean;

        getIsEndedEventSignaled(): boolean

        getPreloaded(): boolean

        getStartTime(): number;

        getStreamId(): string;

        getStreamInfo(): StreamInfo | null;

        getStreamProcessors(): any[];

        getThumbnailController(): object;

        initialize(streamInfo: StreamInfo, protectionController: ProtectionController): void;

        isMediaCodecCompatible(newStream: Stream, previousStream: Stream | null): boolean;

        isProtectionCompatible(newStream: Stream): boolean

        prepareQualityChange(e: object): void

        prepareTrackChange(e: object): void

        reset(): void;

        setIsEndedEventSignaled(value: boolean): void

        setMediaSource(mediaSource: MediaSource): void;

        startPreloading(mediaSource: MediaSource, previousBuffers: any[], representationsFromPreviousPeriod: Representation[]): void;

        startScheduleControllers(): void

        updateData(updatedStreamInfo: StreamInfo): void;
    }

    export interface StreamProcessor {
        addMediaInfo(newMediaInfo: MediaInfo): void;

        checkAndHandleCompletedBuffering(): void;

        clearMediaInfoArray(): void;

        createBufferSinks(previousBufferSinks: any[]): Promise<any>;

        finalisePlayList(time: number, reason: string): void;

        getBuffer(): Buffer;

        getBufferController(): BufferController;

        getBufferLevel(): number;

        getFragmentModel(): FragmentModel;

        getMediaInfo(): MediaInfo;

        getMediaSource(): MediaSource;

        getRepresentationController(): RepresentationController;

        getScheduleController(): ScheduleController;

        getStreamId(): string;

        getStreamInfo(): StreamInfo;

        getType(): string;

        getVoRepresentation(quality: number): Representation;

        handleNewMediaInfo(mediaInfo: MediaInfo): void;

        initialize(mediaSource: MediaSource, hasVideoTrack: boolean, isFragmented: boolean): void;

        isBufferingCompleted(): boolean;

        isUpdating(): boolean;

        prepareInnerPeriodPlaybackSeeking(e: object): Promise<any>;

        prepareOuterPeriodPlaybackSeeking(): Promise<unknown>;

        prepareQualityChange(e: object): void;

        prepareTrackSwitch(previousBufferSinks: any[]): Promise<any>;

        probeNextRequest(): Request;

        reset(errored: boolean, keepBuffers: boolean): void;

        selectMediaInfo(selectionInput: object): Promise<any>;

        setExplicitBufferingTime(value: number): void;

        setMediaSource(mediaSource: MediaSource): void;

        updateStreamInfo(newStreamInfo: StreamInfo): Promise<any>;
    }

    export interface XlinkLoader {
        load(url: string, element: any, resolveObject: object): void;

        reset(): void;
    }

    export interface CaptionData {
        cueID?: string;
        data?: string;
        embeddedImages?: { [id: string]: string };
        end: number;
        images?: string[];
        isd?: object;
        start: number;
        styles?: {
            align?: string;
            line?: string;
            position?: string;
            size?: string;
        };
        type?: string;
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
        cdmData?: ArrayBuffer;
        initData?: ArrayBuffer;
        keyId?: string,
        ks: KeySystem;
        protData?: ProtectionData
        sessionId?: string,
        sessionType?: string,
    }

    export type RequestFilter = (request: LicenseRequest) => Promise<any>;
    export type ResponseFilter = (response: LicenseResponse) => Promise<any>;
}

