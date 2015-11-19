import FactoryMaker from '../../core/FactoryMaker.js';

export default FactoryMaker.getSingletonFactory(MediaPlayerModel);

function MediaPlayerModel() {

    let instance = {
        setScheduleWhilePaused: setScheduleWhilePaused,
        getScheduleWhilePaused: getScheduleWhilePaused,
        reset: reset
    };

    setup();

    return instance;

    let usePresentationDelay,
        liveDelayFragmentCount,
        scheduleWhilePaused;


    function setup() {
        scheduleWhilePaused = false;
    }

    function setScheduleWhilePaused(value){ //TODO Can we use Object.define to have setters/getters
        scheduleWhilePaused = value;
    }

    function getScheduleWhilePaused(){
        return scheduleWhilePaused;
    }

    function reset() {
        scheduleWhilePaused = false;
    }

}