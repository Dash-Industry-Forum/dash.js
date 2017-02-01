
import FactoryMaker from '../../core/FactoryMaker.js';

const SWITCH_REQUEST_HISTORY_DEPTH = 8; // must be > SwitchHistoryRule SAMPLE_SIZE to enable rule

function SwitchRequestHistory() {
    let switchRequests = []; // running total
    let srHistory = []; // history of each switch

    function push(switchRequest) {
        if (!switchRequests[switchRequest.oldValue]) {
            switchRequests[switchRequest.oldValue] = {noDrops: 0, drops: 0, dropSize: 0};
        }

        // Set switch details
        let indexDiff = switchRequest.newValue - switchRequest.oldValue;
        let drop = (indexDiff < 0) ? 1 : 0;
        let dropSize = drop ? -indexDiff : 0;
        let noDrop = drop ? 0 : 1;

        // Update running totals
        switchRequests[switchRequest.oldValue].drops += drop;
        switchRequests[switchRequest.oldValue].dropSize += dropSize;
        switchRequests[switchRequest.oldValue].noDrops += noDrop;

        // Save to history
        srHistory.push({idx: switchRequest.oldValue, noDrop: noDrop, drop: drop, dropSize: dropSize});

        // Shift earliest switch off srHistory and readjust to keep depth of running totals constant
        if ( srHistory.length > SWITCH_REQUEST_HISTORY_DEPTH ) {
            let srHistoryFirst = srHistory.shift();
            switchRequests[srHistoryFirst.idx].drops -= srHistoryFirst.drop;
            switchRequests[srHistoryFirst.idx].dropSize -= srHistoryFirst.dropSize;
            switchRequests[srHistoryFirst.idx].noDrops -= srHistoryFirst.noDrop;
        }
    }

    function getSwitchRequests() {
        return switchRequests;
    }

    function reset() {
        switchRequests = [];
        srHistory = [];
    }

    return {
        push: push,
        getSwitchRequests: getSwitchRequests,
        reset: reset
    };
}

SwitchRequestHistory.__dashjs_factory_name = 'SwitchRequestHistory';
let factory = FactoryMaker.getClassFactory(SwitchRequestHistory);
export default factory;