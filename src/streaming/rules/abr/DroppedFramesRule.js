
import FactoryMaker from '../../../core/FactoryMaker.js';
import SwitchRequest from '../SwitchRequest.js';
import Debug from '../../../core/Debug';

function DroppedFramesRule() {
    const context = this.context;
    const log = Debug(context).getInstance().log;

    const DROPPED_PERCENTAGE_FORBID = 0.15;
    const GOOD_SAMPLE_SIZE = 375; //Don't apply the rule until this many frames have been rendered(and counted under those indices).


    function getMaxIndex(rulesContext) {
        let droppedFramesHistory = rulesContext.getDroppedFramesHistory();
        if (droppedFramesHistory) {
            let dfh = droppedFramesHistory.getFrameHistory();
            let droppedFrames = 0;
            let totalFrames = 0;
            let maxIndex = SwitchRequest.NO_CHANGE;
            for (let i = 1; i < dfh.length; i++) { //No point in measuring dropped frames for the zeroeth index.
                if (dfh[i]) {
                    droppedFrames = dfh[i].droppedVideoFrames;
                    totalFrames = dfh[i].totalVideoFrames;

                    if (totalFrames > GOOD_SAMPLE_SIZE && droppedFrames / totalFrames > DROPPED_PERCENTAGE_FORBID) {
                        maxIndex = i - 1;
                        log('DroppedFramesRule, index: ' + maxIndex + ' Dropped Frames: ' + droppedFrames + ' Total Frames: ' + totalFrames);
                        break;
                    }
                }
            }
            return SwitchRequest(context).create(maxIndex, {droppedFrames: droppedFrames});
        }

        return SwitchRequest(context).create();
    }

    return {
        getMaxIndex: getMaxIndex
    };
}

DroppedFramesRule.__dashjs_factory_name = 'DroppedFramesRule';
let factory = FactoryMaker.getClassFactory(DroppedFramesRule);

export default factory;