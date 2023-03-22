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

    function getSwitchRequest(rulesContext) {
        const switchRequest = SwitchRequest(context).create();

        if (!rulesContext || !rulesContext.hasOwnProperty('getDroppedFramesHistory')) {
            return switchRequest;
        }

        const droppedFramesHistory = rulesContext.getDroppedFramesHistory();
        const streamId = rulesContext.getStreamInfo().id;
        const mediaInfo = rulesContext.getMediaInfo();
        const abrController = rulesContext.getAbrController();
        const bitrateInfoList = abrController.getBitrateInfoList(mediaInfo, true, true);

        if (droppedFramesHistory) {
            const dfh = droppedFramesHistory.getFrameHistory(streamId)

            if (!dfh) {
                return switchRequest;
            }

            const keys = Object.keys(dfh);
            if (!keys || keys.length === 0 || !bitrateInfoList || bitrateInfoList.length === 0) {
                return switchRequest;
            }

            let droppedFrames = 0;
            let totalFrames = 0;
            let maxIndex = NaN;

            //No point in measuring dropped frames for the zeroeth index.
            for (let i = 1; i < bitrateInfoList.length; i++) {
                const repId = bitrateInfoList[i].representationId;
                if (repId && dfh[repId]) {
                    droppedFrames = dfh[repId].droppedVideoFrames;
                    totalFrames = dfh[repId].totalVideoFrames;

                    if (totalFrames > GOOD_SAMPLE_SIZE && droppedFrames / totalFrames > DROPPED_PERCENTAGE_FORBID) {
                        maxIndex = i - 1;
                        logger.debug('index: ' + maxIndex + ' Dropped Frames: ' + droppedFrames + ' Total Frames: ' + totalFrames);
                        break;
                    }
                }
            }

            if (!isNaN(maxIndex)) {
                switchRequest.bitrateInfo = abrController.getBitrateInfoByIndex(mediaInfo, maxIndex, true, true);
                switchRequest.reason = { rule: this.getClassName(), droppedFrames }
            }

            return switchRequest;
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
