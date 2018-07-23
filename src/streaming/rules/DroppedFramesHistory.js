
import FactoryMaker from '../../core/FactoryMaker';


function DroppedFramesHistory() {

    let values = [];
    let lastDroppedFrames = 0;
    let lastTotalFrames = 0;

    function push(index, playbackQuality) {
        let droppedVideoFrames = playbackQuality && playbackQuality.droppedVideoFrames ? playbackQuality.droppedVideoFrames : 0;
        let totalVideoFrames = playbackQuality && playbackQuality.totalVideoFrames ? playbackQuality.totalVideoFrames : 0;

        let intervalDroppedFrames = droppedVideoFrames - lastDroppedFrames;
        lastDroppedFrames = droppedVideoFrames;

        let intervalTotalFrames = totalVideoFrames - lastTotalFrames;
        lastTotalFrames = totalVideoFrames;

        if (!isNaN(index)) {
            if (!values[index]) {
                values[index] = {droppedVideoFrames: intervalDroppedFrames, totalVideoFrames: intervalTotalFrames};
            } else {
                values[index].droppedVideoFrames += intervalDroppedFrames;
                values[index].totalVideoFrames += intervalTotalFrames;
            }
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
const factory = FactoryMaker.getClassFactory(DroppedFramesHistory);
export default factory;
