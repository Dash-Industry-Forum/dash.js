import FactoryMaker from '../../core/FactoryMaker.js';

const DEFAULT_UTC_TIMING_SOURCE = { scheme: 'urn:mpeg:dash:utc:http-xsdate:2014', value: 'http://time.akamai.com/?iso' };
const LIVE_DELAY_FRAGMENT_COUNT = 4;

const DEFAULT_LOCAL_STORAGE_BITRATE_EXPIRATION = 360000;
const DEFAULT_LOCAL_STORAGE_MEDIA_SETTINGS_EXPIRATION = 360000;

const BANDWIDTH_SAFETY_FACTOR = 0.9;
const ABANDON_LOAD_TIMEOUT = 10000;

const BUFFER_TO_KEEP = 30;
const BUFFER_PRUNING_INTERVAL = 30;
const DEFAULT_MIN_BUFFER_TIME = 12;
const BUFFER_TIME_AT_TOP_QUALITY = 30;
const BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM = 60;
const LONG_FORM_CONTENT_DURATION_THRESHOLD = 600;
const RICH_BUFFER_THRESHOLD = 20;

const FRAGMENT_RETRY_ATTEMPTS = 3;
const FRAGMENT_RETRY_INTERVAL = 1000;

function MediaPlayerModel() {

    let instance,
        useManifestDateHeaderTimeSource,
        useSuggestedPresentationDelay,
        UTCTimingSources,
        liveDelayFragmentCount,
        scheduleWhilePaused,
        bufferToKeep,
        bufferPruningInterval,
        lastBitrateCachingInfo,
        lastMediaSettingsCachingInfo,
        stableBufferTime,
        bufferTimeAtTopQuality,
        bufferTimeAtTopQualityLongForm,
        longFormContentDurationThreshold,
        richBufferThreshold,
        bandwidthSafetyFactor,
        abandonLoadTimeout,
        fragmentRetryAttempts,
        fragmentRetryInterval;

    function setup() {
        UTCTimingSources = [];
        useSuggestedPresentationDelay = false;
        useManifestDateHeaderTimeSource = true;
        scheduleWhilePaused = false;
        lastBitrateCachingInfo = {enabled: true , ttl: DEFAULT_LOCAL_STORAGE_BITRATE_EXPIRATION};
        lastMediaSettingsCachingInfo = {enabled: true , ttl: DEFAULT_LOCAL_STORAGE_MEDIA_SETTINGS_EXPIRATION};
        liveDelayFragmentCount = LIVE_DELAY_FRAGMENT_COUNT;
        bufferToKeep = BUFFER_TO_KEEP;
        bufferPruningInterval = BUFFER_PRUNING_INTERVAL;
        stableBufferTime = DEFAULT_MIN_BUFFER_TIME;
        bufferTimeAtTopQuality = BUFFER_TIME_AT_TOP_QUALITY;
        bufferTimeAtTopQualityLongForm = BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM;
        longFormContentDurationThreshold = LONG_FORM_CONTENT_DURATION_THRESHOLD;
        richBufferThreshold = RICH_BUFFER_THRESHOLD;
        bandwidthSafetyFactor = BANDWIDTH_SAFETY_FACTOR;
        abandonLoadTimeout = ABANDON_LOAD_TIMEOUT;
        fragmentRetryAttempts = FRAGMENT_RETRY_ATTEMPTS;
        fragmentRetryInterval = FRAGMENT_RETRY_INTERVAL;
    }

    //TODO Should we use Object.define to have setters/getters? makes more readable code on other side.

    function setBandwidthSafetyFactor(value) {
        bandwidthSafetyFactor = value;
    }

    function getBandwidthSafetyFactor() {
        return bandwidthSafetyFactor;
    }

    function setAbandonLoadTimeout(value) {
        abandonLoadTimeout = value;
    }

    function getAbandonLoadTimeout() {
        return abandonLoadTimeout;
    }

    function setStableBufferTime (value) {
        stableBufferTime = value;
    }

    function getStableBufferTime() {
        return stableBufferTime;
    }

    function setBufferTimeAtTopQuality(value) {
        bufferTimeAtTopQuality = value;
    }

    function getBufferTimeAtTopQuality() {
        return bufferTimeAtTopQuality;
    }

    function setBufferTimeAtTopQualityLongForm(value) {
        bufferTimeAtTopQualityLongForm = value;
    }

    function getBufferTimeAtTopQualityLongForm() {
        return bufferTimeAtTopQualityLongForm;
    }

    function setLongFormContentDurationThreshold(value) {
        longFormContentDurationThreshold = value;
    }

    function getLongFormContentDurationThreshold() {
        return longFormContentDurationThreshold;
    }

    function setRichBufferThreshold(value) {
        richBufferThreshold = value;
    }

    function getRichBufferThreshold() {
        return richBufferThreshold;
    }


    function setBufferToKeep(value) {
        bufferToKeep = value;
    }

    function getBufferToKeep() {
        return bufferToKeep;
    }

    function setLastBitrateCachingInfo(enable, ttl) {
        lastBitrateCachingInfo.enabled = enable;
        if (ttl !== undefined && !isNaN(ttl) && typeof (ttl) === 'number') {
            lastBitrateCachingInfo.ttl = ttl;
        }
    }

    function getLastBitrateCachingInfo() {
        return lastBitrateCachingInfo;
    }

    function setLastMediaSettingsCachingInfo(enable, ttl) {
        lastMediaSettingsCachingInfo.enabled = enable;
        if (ttl !== undefined && !isNaN(ttl) && typeof (ttl) === 'number') {
            lastMediaSettingsCachingInfo.ttl = ttl;
        }
    }

    function getLastMediaSettingsCachingInfo() {
        return lastMediaSettingsCachingInfo;
    }

    function setBufferPruningInterval(value) {
        bufferPruningInterval = value;
    }

    function getBufferPruningInterval() {
        return bufferPruningInterval;
    }

    function setFragmentRetryAttempts(value) {
        fragmentRetryAttempts = value;
    }

    function getFragmentRetryAttempts() {
        return fragmentRetryAttempts;
    }

    function setFragmentRetryInterval(value) {
        fragmentRetryInterval = value;
    }

    function getFragmentRetryInterval() {
        return fragmentRetryInterval;
    }

    function setScheduleWhilePaused(value) {
        scheduleWhilePaused = value;
    }

    function getScheduleWhilePaused() {
        return scheduleWhilePaused;
    }

    function setLiveDelayFragmentCount(value) {
        liveDelayFragmentCount = value;
    }

    function getLiveDelayFragmentCount() {
        return liveDelayFragmentCount;
    }

    function setUseManifestDateHeaderTimeSource(value) {
        useManifestDateHeaderTimeSource = value;
    }

    function getUseManifestDateHeaderTimeSource() {
        return useManifestDateHeaderTimeSource;
    }

    function setUseSuggestedPresentationDelay(value) {
        useSuggestedPresentationDelay = value;
    }

    function getUseSuggestedPresentationDelay() {
        return useSuggestedPresentationDelay;
    }

    function setUTCTimingSources(value) {
        UTCTimingSources = value;
    }

    function getUTCTimingSources() {
        return UTCTimingSources;
    }

    function reset() {
        //TODO need to figure out what props to persist across sessions and which to reset if any.
        //setup();
    }

    instance = {
        setBandwidthSafetyFactor: setBandwidthSafetyFactor,
        getBandwidthSafetyFactor: getBandwidthSafetyFactor,
        setAbandonLoadTimeout: setAbandonLoadTimeout,
        getAbandonLoadTimeout: getAbandonLoadTimeout,
        setLastBitrateCachingInfo: setLastBitrateCachingInfo,
        getLastBitrateCachingInfo: getLastBitrateCachingInfo,
        setLastMediaSettingsCachingInfo: setLastMediaSettingsCachingInfo,
        getLastMediaSettingsCachingInfo: getLastMediaSettingsCachingInfo,
        setStableBufferTime: setStableBufferTime,
        getStableBufferTime: getStableBufferTime,
        setBufferTimeAtTopQuality: setBufferTimeAtTopQuality,
        getBufferTimeAtTopQuality: getBufferTimeAtTopQuality,
        setBufferTimeAtTopQualityLongForm: setBufferTimeAtTopQualityLongForm,
        getBufferTimeAtTopQualityLongForm: getBufferTimeAtTopQualityLongForm,
        setLongFormContentDurationThreshold: setLongFormContentDurationThreshold,
        getLongFormContentDurationThreshold: getLongFormContentDurationThreshold,
        setRichBufferThreshold: setRichBufferThreshold,
        getRichBufferThreshold: getRichBufferThreshold,
        setBufferToKeep: setBufferToKeep,
        getBufferToKeep: getBufferToKeep,
        setBufferPruningInterval: setBufferPruningInterval,
        getBufferPruningInterval: getBufferPruningInterval,
        setFragmentRetryAttempts: setFragmentRetryAttempts,
        getFragmentRetryAttempts: getFragmentRetryAttempts,
        setFragmentRetryInterval: setFragmentRetryInterval,
        getFragmentRetryInterval: getFragmentRetryInterval,
        setScheduleWhilePaused: setScheduleWhilePaused,
        getScheduleWhilePaused: getScheduleWhilePaused,
        getUseSuggestedPresentationDelay: getUseSuggestedPresentationDelay,
        setUseSuggestedPresentationDelay: setUseSuggestedPresentationDelay,
        setLiveDelayFragmentCount: setLiveDelayFragmentCount,
        getLiveDelayFragmentCount: getLiveDelayFragmentCount,
        setUseManifestDateHeaderTimeSource: setUseManifestDateHeaderTimeSource,
        getUseManifestDateHeaderTimeSource: getUseManifestDateHeaderTimeSource,
        setUTCTimingSources: setUTCTimingSources,
        getUTCTimingSources: getUTCTimingSources,
        reset: reset
    };

    setup();

    return instance;
}

//TODO see if you can move this and not export and just getter to get default value.
MediaPlayerModel.__dashjs_factory_name = 'MediaPlayerModel';
let factory = FactoryMaker.getSingletonFactory(MediaPlayerModel);
factory.DEFAULT_UTC_TIMING_SOURCE = DEFAULT_UTC_TIMING_SOURCE;
export default factory;