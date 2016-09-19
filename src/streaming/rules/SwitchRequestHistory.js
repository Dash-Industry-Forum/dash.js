
import FactoryMaker from '../../core/FactoryMaker.js';


function SwitchRequestHistory() {
    let switchRequests = [];

    function push(switchRequest) {
        if (!switchRequests[switchRequest.oldValue]) {
            switchRequests[switchRequest.oldValue] = {noDrops: 0, drops: 0, dropSize: 0};
        }

        let indexDiff = switchRequest.newValue - switchRequest.oldValue;

        if (indexDiff < 0) {
            switchRequests[switchRequest.oldValue].drops++;
            switchRequests[switchRequest.oldValue].dropSize += -indexDiff;
        } else {
            switchRequests[switchRequest.oldValue].noDrops++;
        }
    }

    function getSwitchRequests() {
        return switchRequests;
    }

    function reset() {
        switchRequests = [];
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