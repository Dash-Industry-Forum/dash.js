
import FactoryMaker from '../../../core/FactoryMaker';
import SwitchRequest from '../SwitchRequest';
import Debug from '../../../core/Debug';

function DroppedFramesRule() {

    const context = this.context;
    let instance,
        logger;

    const DROPPED_PERCENTAGE_FORBID = 0.15;
    const GOOD_SAMPLE_SIZE = 375; //Don't apply the rule until this many frames have been rendered(and counted under those indices).

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
    }

    function getMaxIndex(rulesContext) {
        const switchRequest = SwitchRequest(context).create();

        if (!rulesContext || !rulesContext.hasOwnProperty('getDroppedFramesHistory')) {
            return switchRequest;
        }
        const droppedFramesHistory = rulesContext.getDroppedFramesHistory();
        if (droppedFramesHistory) {
            const dfh = droppedFramesHistory.getFrameHistory();
            let droppedFrames = 0;
            let totalFrames = 0;
            let maxIndex = SwitchRequest.NO_CHANGE;
            for (let i = 1; i < dfh.length; i++) { //No point in measuring dropped frames for the zeroeth index.
                if (dfh[i]) {
                    droppedFrames = dfh[i].droppedVideoFrames;
                    totalFrames = dfh[i].totalVideoFrames;

                    if (totalFrames > GOOD_SAMPLE_SIZE && droppedFrames / totalFrames > DROPPED_PERCENTAGE_FORBID) {
                        maxIndex = i - 1;
                        logger.debug('index: ' + maxIndex + ' Dropped Frames: ' + droppedFrames + ' Total Frames: ' + totalFrames);
                        break;
                    }
                }
            }
            return SwitchRequest(context).create(maxIndex, {droppedFrames: droppedFrames});
        }

        return switchRequest;
    }

    instance = {
        getMaxIndex: getMaxIndex
    };

    setup();

    return instance;
}

DroppedFramesRule.__dashjs_factory_name = 'DroppedFramesRule';
export default FactoryMaker.getClassFactory(DroppedFramesRule);