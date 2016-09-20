
import FactoryMaker from '../../../core/FactoryMaker.js';
import Debug from '../../../core/Debug';

function SwitchHistoryRule(switchRequestHistory) {
    const log = Debug(this.context).getInstance().log;

    //MAX_INDEX_SWITCH is the number of drops made, divided by the number of times the abr rules were invoked(that is, opportunities to drop).
    //0.05 is equivalent to a drop from the highest quality to the lowest quality after 20 switch requests.
    //const MAX_INDEX_SWITCH = 0.025;
    //MAX_SWITCH is the number of drops made. It doesn't consider the size of the drop.
    const MAX_SWITCH = 0.075;

    //Before this number of switch requests(no switch or actual), don't prevent apply the rule.
    const SAMPLE_SIZE = 8;


    function getMaxIndex() {
        let switchRequests = switchRequestHistory.getSwitchRequests();
        let maxIndex = -1;
        let drops = 0;
        let noDrops = 0;
        let dropSize = 0;

        for (let i = 0; i < switchRequests.length; i++) {
            if (switchRequests[i] !== undefined) {
                drops += switchRequests[i].drops;
                noDrops += switchRequests[i].noDrops;
                dropSize += switchRequests[i].dropSize;

                if (drops + noDrops >= SAMPLE_SIZE && (drops / noDrops > MAX_SWITCH)) {// || dropSize / (drops + noDrops) / i > MAX_INDEX_SWITCH)) {
                    maxIndex = i > 0 ? i - 1 : 0;
                    log('Switch history rule index: ' + maxIndex + ' samples: ' + (drops + noDrops) + ' drops: ' + drops + ' dropSize: ' + dropSize);
                    break;
                }
            }
        }

        return maxIndex;
    }

    return {
        getMaxIndex: getMaxIndex
    };
}


SwitchHistoryRule.__dashjs_factory_name = 'SwitchRequest';
let factory = FactoryMaker.getClassFactory(SwitchHistoryRule);

export default factory;