import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {checkIsKeepingBackwardsBufferTarget, checkNoCriticalErrors, initializeDashJsAdapter} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.BUFFER.CLEANUP;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {

        let playerAdapter;

        before(() => {
            const settings = {
                streaming: {
                    buffer: {
                        bufferPruningInterval: Constants.TEST_INPUTS.BUFFER_CLEANUP.INTERVAL,
                        bufferToKeep: Constants.TEST_INPUTS.BUFFER_CLEANUP.TO_KEEP
                    }
                }
            }
            playerAdapter = initializeDashJsAdapter(item, mpd, settings);
        })

        after(() => {
            if (playerAdapter) {
                playerAdapter.destroy();
            }
        })

        it(`Play for ${Constants.TEST_TIMEOUT_THRESHOLDS.BUFFER_CLEANUP}ms and expect backwards buffer to stay within ${Constants.TEST_INPUTS.BUFFER_CLEANUP.TO_KEEP}s (tolerance ${Constants.TEST_INPUTS.BUFFER_CLEANUP.TOLERANCE}s)`, async () => {
            await checkIsKeepingBackwardsBufferTarget(playerAdapter, Constants.TEST_TIMEOUT_THRESHOLDS.BUFFER_CLEANUP, Constants.TEST_INPUTS.BUFFER_CLEANUP.TO_KEEP, Constants.TEST_INPUTS.BUFFER_CLEANUP.TOLERANCE);
        });

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })
    })
})
