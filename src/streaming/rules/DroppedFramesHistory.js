
import FactoryMaker from '../../core/FactoryMaker.js';


function DroppedFramesHistory() {

    let values = [];
    let lastDroppedFrames = 0;
    let lastTotalFrames = 0;

    function push(index, playbackQuality) {
        let intervalDroppedFrames = playbackQuality.droppedVideoFrames - lastDroppedFrames;
        lastDroppedFrames = playbackQuality.droppedVideoFrames;

        let intervalTotalFrames = playbackQuality.totalVideoFrames - lastTotalFrames;
        lastTotalFrames = playbackQuality.totalVideoFrames;

        if (!values[index]) {
            values[index] = {droppedVideoFrames: intervalDroppedFrames, totalVideoFrames: intervalTotalFrames};
        } else {
            values[index].droppedVideoFrames += intervalDroppedFrames;
            values[index].totalVideoFrames += intervalTotalFrames;
        }
    }

    function getDroppedFrameHistory() {
        return values;
    }

    function reset(playbackQuality) {
        values = [];
        lastDroppedFrames = playbackQuality.droppedVideoFrames;
        lastTotalFrames = playbackQuality.totalVideoFrames;
    }

    return {
        push: push,
        getFrameHistory: getDroppedFrameHistory,
        reset: reset
    };
}

DroppedFramesHistory.__dashjs_factory_name = 'DroppedFramesHistory';
let factory = FactoryMaker.getClassFactory(DroppedFramesHistory);
export default factory;