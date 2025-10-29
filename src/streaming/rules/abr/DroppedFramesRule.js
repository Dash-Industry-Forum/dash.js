import FactoryMaker from '../../../core/FactoryMaker.js';
import SwitchRequest from '../SwitchRequest.js';
import Settings from '../../../core/Settings.js';

function DroppedFramesRule() {

    const context = this.context;
    const settings = Settings(context).getInstance();
    let instance;

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
        const representations = abrController.getPossibleVoRepresentationsFilteredBySettings(mediaInfo, true);
        let newRepresentation = null;

        //No point in measuring dropped frames for the first index.
        for (let i = 1; i < representations.length; i++) {
            const currentRepresentation = representations[i];
            if (currentRepresentation && droppedFramesHistoryData[currentRepresentation.id]) {
                droppedFrames = droppedFramesHistoryData[currentRepresentation.id].droppedVideoFrames;
                totalFrames = droppedFramesHistoryData[currentRepresentation.id].totalVideoFrames;

                if (totalFrames > settings.get().streaming.abr.rules.droppedFramesRule.parameters.minimumSampleSize && droppedFrames / totalFrames > settings.get().streaming.abr.rules.droppedFramesRule.parameters.droppedFramesPercentageThreshold) {
                    newRepresentation = representations[i - 1];
                    break;
                }
            }
        }
        if (newRepresentation) {
            switchRequest.representation = newRepresentation;
            switchRequest.priority = settings.get().streaming.abr.rules.droppedFramesRule.priority;
            switchRequest.reason = {
                droppedFrames,
                message: `[DroppedFramesRule]: Switching to index ${newRepresentation.absoluteIndex}. Dropped Frames: ${droppedFrames}, Total Frames: ${totalFrames}`
            };
        }

        return switchRequest;
    }

    instance = {
        getSwitchRequest
    };

    return instance;
}

DroppedFramesRule.__dashjs_factory_name = 'DroppedFramesRule';
export default FactoryMaker.getClassFactory(DroppedFramesRule);
