import FactoryMaker from '../../../core/FactoryMaker.js';
import SwitchRequest from '../SwitchRequest.js';
import Settings from '../../../core/Settings.js';

function SwitchHistoryRule() {

    const context = this.context;
    const settings = Settings(context).getInstance();
    let instance;

    function getSwitchRequest(rulesContext) {
        const switchRequest = SwitchRequest(context).create();
        switchRequest.rule = this.getClassName();

        if (!rulesContext) {
            return switchRequest;
        }

        const streamId = rulesContext.getStreamInfo().id;
        const mediaType = rulesContext.getMediaType();
        const switchRequestHistory = rulesContext ? rulesContext.getSwitchRequestHistory() : null;
        const switchRequests = switchRequestHistory ? switchRequestHistory.getSwitchRequests(streamId, mediaType) : {};
        const abrController = rulesContext.getAbrController();
        const mediaInfo = rulesContext.getMediaInfo();
        const representations = abrController.getPossibleVoRepresentations(mediaInfo, true);
        let drops = 0;
        let noDrops = 0;

        for (let i = 0; i < representations.length; i++) {
            const currentPossibleRepresentation = representations[i];
            if (currentPossibleRepresentation && switchRequests[currentPossibleRepresentation.id]) {
                drops += switchRequests[currentPossibleRepresentation.id].drops;
                noDrops += switchRequests[currentPossibleRepresentation.id].noDrops;

                if (drops + noDrops >= settings.get().streaming.abr.rules.switchHistoryRule.parameters.sampleSize && (drops / noDrops > settings.get().streaming.abr.rules.switchHistoryRule.parameters.switchPercentageThreshold)) {
                    switchRequest.representation = (i > 0 && switchRequests[currentPossibleRepresentation.id].drops > 0) ? representations[i - 1] : currentPossibleRepresentation;
                    switchRequest.reason = {
                        drops: drops,
                        noDrops: noDrops,
                        message: `[SwitchHistoryRule]: Switch to index: ${switchRequest.representation.absoluteIndex} samples: ${(drops + noDrops)} drops:  ${drops}`
                    };
                    break;
                }
            }
        }

        return switchRequest;
    }

    instance = {
        getSwitchRequest
    };



    return instance;
}


SwitchHistoryRule.__dashjs_factory_name = 'SwitchHistoryRule';
export default FactoryMaker.getClassFactory(SwitchHistoryRule);
