import FactoryMaker from '../../../core/FactoryMaker.js';
import SwitchRequest from '../SwitchRequest.js';
import Debug from '../../../core/Debug.js';
import Settings from '../../../core/Settings.js';

function DroppedFramesRule() {

    const context = this.context;
    const settings = Settings(context).getInstance();
    let instance,
        logger;

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
        if (!droppedFramesHistory) {
            return switchRequest
        }
        const streamId = rulesContext.getStreamInfo().id;
        const mediaInfo = rulesContext.getMediaInfo();
        const abrController = rulesContext.getAbrController();
        const droppedFramesHistoryData = droppedFramesHistory.getFrameHistory(streamId);

        if (!droppedFramesHistoryData || Object.keys(droppedFramesHistoryData).length === 0) {
            return switchRequest;
        }

        let droppedFrames = 0;
        let totalFrames = 0;
        const representations = abrController.getPossibleVoRepresentations(mediaInfo, true);
        let newRepresentation = null;

        //No point in measuring dropped frames for the first index.
        for (let i = 1; i < representations.length; i++) {
            const currentRepresentation = representations[i];
            if (currentRepresentation && droppedFramesHistoryData[currentRepresentation.id]) {
                droppedFrames = droppedFramesHistoryData[currentRepresentation.id].droppedVideoFrames;
                totalFrames = droppedFramesHistoryData[currentRepresentation.id].totalVideoFrames;

                if (totalFrames > settings.get().streaming.abr.rules.droppedFramesRule.parameters.minimumSampleSize && droppedFrames / totalFrames > settings.get().streaming.abr.rules.droppedFramesRule.parameters.droppedFramesPercentageThreshold) {
                    newRepresentation = representations[i - 1];
                    logger.debug('index: ' + newRepresentation.absoluteIndex + ' Dropped Frames: ' + droppedFrames + ' Total Frames: ' + totalFrames);
                    break;
                }
            }
        }
        if (newRepresentation) {
            switchRequest.representation = newRepresentation;
            switchRequest.reason = { droppedFrames };
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
