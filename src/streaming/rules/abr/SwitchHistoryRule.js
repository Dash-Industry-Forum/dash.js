
import FactoryMaker from '../../../core/FactoryMaker.js';
import Debug from '../../../core/Debug';
import SwitchRequest from '../SwitchRequest.js';

function SwitchHistoryRule() {
    const context = this.context;
    const log = Debug(context).getInstance().log;

    //MAX_SWITCH is the number of drops made. It doesn't consider the size of the drop.
    const MAX_SWITCH = 0.075;

    //Before this number of switch requests(no switch or actual), don't apply the rule.
    //must be < SwitchRequestHistory SWITCH_REQUEST_HISTORY_DEPTH to enable rule
    const SAMPLE_SIZE = 6;


    function getMaxIndex(rulesContext) {
        const switchRequestHistory = rulesContext.getSwitchHistory();
        let switchRequests = switchRequestHistory.getSwitchRequests();
        let drops = 0;
        let noDrops = 0;
        let dropSize = 0;
        let switchRequest = SwitchRequest(context).create();

        for (let i = 0; i < switchRequests.length; i++) {
            if (switchRequests[i] !== undefined) {
                drops += switchRequests[i].drops;
                noDrops += switchRequests[i].noDrops;
                dropSize += switchRequests[i].dropSize;

                if (drops + noDrops >= SAMPLE_SIZE && (drops / noDrops > MAX_SWITCH)) {
                    switchRequest.value = i > 0 ? i - 1 : 0;
                    switchRequest.reason = {index: switchRequest.value, drops: drops, noDrops: noDrops, dropSize: dropSize};
                    log('Switch history rule index: ' + switchRequest.value + ' samples: ' + (drops + noDrops) + ' drops: ' + drops);
                    break;
                }
            }
        }

        return switchRequest;
    }

    return {
        getMaxIndex: getMaxIndex
    };
}


SwitchHistoryRule.__dashjs_factory_name = 'SwitchRequest';
let factory = FactoryMaker.getClassFactory(SwitchHistoryRule);

export default factory;