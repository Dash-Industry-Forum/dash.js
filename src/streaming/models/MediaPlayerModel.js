import FactoryMaker from '../../core/FactoryMaker.js';

export default FactoryMaker.getSingletonFactory(MediaPlayerModel);

function MediaPlayerModel() {

    let instance = {
        setScheduleWhilePaused: setScheduleWhilePaused,
        getScheduleWhilePaused: getScheduleWhilePaused,
        getUseSuggestedPresentationDelay: getUseSuggestedPresentationDelay,
        setUseSuggestedPresentationDelay: setUseSuggestedPresentationDelay,
        setLiveDelayFragmentCount: setLiveDelayFragmentCount,
        getLiveDelayFragmentCount: getLiveDelayFragmentCount,
        reset: reset
    };

    setup();

    return instance;

    let useSuggestedPresentationDelay,
        liveDelayFragmentCount,
        scheduleWhilePaused;

    function setup() {
        useSuggestedPresentationDelay = false,
        scheduleWhilePaused = false;
        liveDelayFragmentCount = 4;
    }

    function setScheduleWhilePaused(value) { //TODO Can we use Object.define to have setters/getters
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

    function setUseSuggestedPresentationDelay(value) {
        useSuggestedPresentationDelay = value;
    }

    function getUseSuggestedPresentationDelay() {
        return useSuggestedPresentationDelay;
    }

    function reset() {
        setup();
    }
}