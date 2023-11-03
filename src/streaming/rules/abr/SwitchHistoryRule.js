import FactoryMaker from '../../../core/FactoryMaker.js';
import Debug from '../../../core/Debug.js';
import SwitchRequest from '../SwitchRequest.js';

function SwitchHistoryRule() {

    const context = this.context;

    let instance,
        logger;

    //MAX_SWITCH is the number of drops made. It doesn't consider the size of the drop.
    const MAX_SWITCH = 0.075;

    //Before this number of switch requests(no switch or actual), don't apply the rule.
    //must be < SwitchRequestHistory SWITCH_REQUEST_HISTORY_DEPTH to enable rule
    const SAMPLE_SIZE = 6;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
    }

    function getSwitchRequest(rulesContext) {
        const switchRequest = SwitchRequest(context).create();
        switchRequest.rule = this.getClassName();

        if (!rulesContext) {
            return switchRequest;
        }
        const switchRequestHistory = rulesContext ? rulesContext.getSwitchHistory() : null;
        const switchRequests = switchRequestHistory ? switchRequestHistory.getSwitchRequests() : [];
        const abrController = rulesContext.getAbrController();
        const mediaInfo = rulesContext.getMediaInfo();
        let drops = 0;
        let noDrops = 0;
        let dropSize = 0;

        switchRequest.rule = this.getClassName();

        const representations = abrController.getPossibleVoRepresentations(mediaInfo, true);

        for (let i = 0; i < representations.length; i++) {
            const currentRepresentation = representations[i];
            if (currentRepresentation && switchRequests[currentRepresentation.id]) {
                drops += switchRequests[currentRepresentation.id].drops;
                noDrops += switchRequests[currentRepresentation.id].noDrops;
                dropSize += switchRequests[currentRepresentation.id].dropSize;

                if (drops + noDrops >= SAMPLE_SIZE && (drops / noDrops > MAX_SWITCH)) {
                    const targetRepresentation = (i > 0 && switchRequests[currentRepresentation.id].drops > 0) ? representations[i - 1] : currentRepresentation;
                    switchRequest.representation = targetRepresentation;
                    switchRequest.reason = {
                        index: switchRequest.quality,
                        drops: drops,
                        noDrops: noDrops,
                        dropSize: dropSize
                    };
                    logger.debug('Switch history rule index: ' + switchRequest.representation.absoluteIndex + ' samples: ' + (drops + noDrops) + ' drops: ' + drops);
                    break;
                }
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


SwitchHistoryRule.__dashjs_factory_name = 'SwitchHistoryRule';
export default FactoryMaker.getClassFactory(SwitchHistoryRule);
