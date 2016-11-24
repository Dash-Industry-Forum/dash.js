
import FactoryMaker from '../../core/FactoryMaker.js';

const SWITCH_REQUEST_HISTORY_DEPTH = 6;

function SwitchRequestHistory() {
    let switchRequests = []; // running total
    let srHistory = []; // history of each switch

    function push(switchRequest, type) {

        switchRequests[type] = switchRequests[type] || [];
        if (!switchRequests[type][switchRequest.oldValue]) {
            switchRequests[type][switchRequest.oldValue] = {noDrops: 0, drops: 0, dropSize: 0};
        }

        // Set switch details
        let indexDiff = switchRequest.newValue - switchRequest.oldValue;
        let drop = (indexDiff < 0) ? 1 : 0;
        let dropSize = drop ? -indexDiff : 0;
        let noDrop = drop ? 0 : 1;

        // Update running totals
        switchRequests[type][switchRequest.oldValue].drops += drop;
        switchRequests[type][switchRequest.oldValue].dropSize += dropSize;
        switchRequests[type][switchRequest.oldValue].noDrops += noDrop;

        // Save to history
        srHistory[type] = srHistory[type] || [];
        srHistory[type].push({idx: switchRequest.oldValue, noDrop: noDrop, drop: drop, dropSize: dropSize});

        // Shift earliest switch off srHistory and readjust to keep depth of running totals constant
        if ( srHistory[type].length > SWITCH_REQUEST_HISTORY_DEPTH ) {
            let srHistoryFirst = srHistory[type].shift();
            switchRequests[type][srHistoryFirst.idx].drops -= srHistoryFirst.drop;
            switchRequests[type][srHistoryFirst.idx].dropSize -= srHistoryFirst.dropSize;
            switchRequests[type][srHistoryFirst.idx].noDrops -= srHistoryFirst.noDrop;
        }

    }

    function getSwitchRequests(type) {
        switchRequests[type] = switchRequests[type] || [];
        return switchRequests[type];
    }

    function reset(type) {
        if (type === null || type === undefined) {
            switchRequests = [];
        } else {
            switchRequests[type] = [];
        }
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