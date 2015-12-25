import FactoryMaker from '../../core/FactoryMaker.js';

const DEFAULT_UTC_TIMING_SOURCE = { scheme: 'urn:mpeg:dash:utc:http-xsdate:2014', value: 'http://time.akamai.com/?iso' };
const BUFFER_TO_KEEP = 30;
const BUFFER_PRUNING_INTERVAL = 30;
const LIVE_DELAY_FRAGMENT_COUNT = 4;

function MediaPlayerModel() {

    let instance,
        useManifestDateHeaderTimeSource,
        useSuggestedPresentationDelay,
        UTCTimingSources,
        liveDelayFragmentCount,
        scheduleWhilePaused,
        bufferToKeep,
        bufferPruningInterval;

    function setup() {
        UTCTimingSources = [];
        useSuggestedPresentationDelay = false;
        useManifestDateHeaderTimeSource = true;
        scheduleWhilePaused = false;
        liveDelayFragmentCount = LIVE_DELAY_FRAGMENT_COUNT;
        bufferToKeep = BUFFER_TO_KEEP;
        bufferPruningInterval = BUFFER_PRUNING_INTERVAL;
    }
    //TODO Can we use Object.define to have setters/getters

    function setBufferToKeep(value) {
        bufferToKeep = value;
    }

    function getBufferToKeep(){
        return bufferToKeep;
    }

    function setBufferPruningInterval(value) {
        bufferPruningInterval = value;
    }

    function getBufferPruningInterval(){
        return bufferPruningInterval;
    }

    function setScheduleWhilePaused(value) {
        scheduleWhilePaused = value;
    }

    function getScheduleWhilePaused(){
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
        setup();
    }

    instance = {
        setBufferToKeep: setBufferToKeep,
        getBufferToKeep: getBufferToKeep,
        setBufferPruningInterval: setBufferPruningInterval,
        getBufferPruningInterval: getBufferPruningInterval,
        setScheduleWhilePaused: setScheduleWhilePaused,
        getScheduleWhilePaused: getScheduleWhilePaused,
        getUseSuggestedPresentationDelay: getUseSuggestedPresentationDelay,
        setUseSuggestedPresentationDelay: setUseSuggestedPresentationDelay,
        setLiveDelayFragmentCount: setLiveDelayFragmentCount,
        getLiveDelayFragmentCount: getLiveDelayFragmentCount,
        setUseManifestDateHeaderTimeSource: setUseManifestDateHeaderTimeSource,
        getUseManifestDateHeaderTimeSource: getUseManifestDateHeaderTimeSource,
        setUTCTimingSources:setUTCTimingSources,
        getUTCTimingSources:getUTCTimingSources,
        reset: reset
    };

    setup();

    return instance;
}

let factory = FactoryMaker.getSingletonFactory(MediaPlayerModel);
factory.DEFAULT_UTC_TIMING_SOURCE = DEFAULT_UTC_TIMING_SOURCE;
export default factory;