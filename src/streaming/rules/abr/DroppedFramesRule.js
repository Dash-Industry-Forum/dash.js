import FactoryMaker from '../../../core/FactoryMaker.js';
import SwitchRequest from '../SwitchRequest.js';
import Debug from '../../../core/Debug.js';

function DroppedFramesRule() {

    const context = this.context;
    let instance,
        logger;

    const DROPPED_PERCENTAGE_FORBID = 0.15;
    const GOOD_SAMPLE_SIZE = 375; //Don't apply the rule until this many frames have been rendered(and counted under those indices).

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
    }

    function getSwitchRequest(rulesContext) {
        const switchRequest = SwitchRequest(context).create();
        switchRequest.rule = this.getClassName();

        if (!rulesContext || !rulesContext.hasOwnProperty('getDroppedFramesHistory')) {
            return switchRequest;
        }

        const droppedFramesHistory = rulesContext.getDroppedFramesHistory();
        const streamId = rulesContext.getStreamInfo().id;
        const mediaInfo = rulesContext.getMediaInfo();
        const abrController = rulesContext.getAbrController();

        if (droppedFramesHistory) {
            const dfh = droppedFramesHistory.getFrameHistory(streamId);

            if (!dfh || Object.keys(dfh.length) === 0) {
                return switchRequest;
            }

            let droppedFrames = 0;
            let totalFrames = 0;
            let maxIndex = NaN;
            const representations = abrController.getPossibleVoRepresentations(mediaInfo, true);

            //No point in measuring dropped frames for the first index.
            for (let i = 1; i < representations.length; i++) {
                const currentRepresentation = representations[i];
                if (currentRepresentation && dfh[currentRepresentation.id]) {
                    droppedFrames = dfh[currentRepresentation.id].droppedVideoFrames;
                    totalFrames = dfh[currentRepresentation.id].totalVideoFrames;

                    if (totalFrames > GOOD_SAMPLE_SIZE && droppedFrames / totalFrames > DROPPED_PERCENTAGE_FORBID) {
                        maxIndex = i - 1;
                        logger.debug('index: ' + maxIndex + ' Dropped Frames: ' + droppedFrames + ' Total Frames: ' + totalFrames);
                        break;
                    }
                }
            }
            if (!isNaN(maxIndex)) {
                switchRequest.representation = abrController.getRepresentationByAbsoluteIndex(maxIndex, mediaInfo, true);
                switchRequest.reason = { droppedFrames };
            }
        }

        return switchRequest;
    }

    instance = {
        getSwitchRequest
    };

    setup();

    return instance;
}

DroppedFramesRule.__dashjs_factory_name = 'DroppedFramesRule';
export default FactoryMaker.getClassFactory(DroppedFramesRule);
