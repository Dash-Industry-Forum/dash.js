import FactoryMaker from '../../core/FactoryMaker.js';

function DroppedFramesHistory() {

    let values = {};
    let lastDroppedFrames = {};
    let lastTotalFrames = {};

    function push(streamId, representationId, playbackQuality) {

        if (!representationId) {
            return;
        }

        if (!values[streamId]) {
            values[streamId] = [];
            lastDroppedFrames[streamId] = 0;
            lastTotalFrames[streamId] = 0;
        }

        let droppedVideoFrames = playbackQuality && playbackQuality.droppedVideoFrames ? playbackQuality.droppedVideoFrames : 0;
        let totalVideoFrames = playbackQuality && playbackQuality.totalVideoFrames ? playbackQuality.totalVideoFrames : 0;

        let intervalDroppedFrames = droppedVideoFrames - lastDroppedFrames[streamId];
        lastDroppedFrames[streamId] = droppedVideoFrames;

        let intervalTotalFrames = totalVideoFrames - lastTotalFrames[streamId];
        lastTotalFrames[streamId] = totalVideoFrames;

        const current = values[streamId];
        if (!isNaN(representationId)) {
            if (!current[representationId]) {
                current[representationId] = { droppedVideoFrames: intervalDroppedFrames, totalVideoFrames: intervalTotalFrames };
            } else {
                current[representationId].droppedVideoFrames += intervalDroppedFrames;
                current[representationId].totalVideoFrames += intervalTotalFrames;
            }
        }
    }

    function getFrameHistory(streamId) {
        return values[streamId];
    }

    function clearForStream(streamId) {
        try {
            delete values[streamId];
            delete lastDroppedFrames[streamId];
            delete lastTotalFrames[streamId];
        } catch (e) {

        }
    }

    function reset() {
        values = {};
        lastDroppedFrames = {};
        lastTotalFrames = {};
    }

    return {
        push,
        getFrameHistory,
        clearForStream,
        reset
    };
}

DroppedFramesHistory.__dashjs_factory_name = 'DroppedFramesHistory';
const factory = FactoryMaker.getClassFactory(DroppedFramesHistory);
export default factory;
