import DashJsAdapter from '../../adapter/DashJsAdapter.js';
import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai'
import {checkNoCriticalErrors, initializeDashJsAdapter} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.BUFFER.CLEANUP;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {

        let playerAdapter;

        before(() => {
            playerAdapter = initializeDashJsAdapter(item, mpd);
        })

        after(() => {
            playerAdapter.destroy();
        })

        it(`Setting buffer cleanup values`, async () => {
            playerAdapter.updateSettings({
                streaming: {
                    buffer: {
                        bufferPruningInterval: Constants.TEST_INPUTS.BUFFER_CLEANUP.INTERVAL,
                        bufferToKeep: Constants.TEST_INPUTS.BUFFER_CLEANUP.TO_KEEP
                    }
                }
            })
        })

        it(`Attach source`, async () => {
            playerAdapter.attachSource(mpd);
        })

        it(`Play for some time and expect buffer level to stay within tolerance`, async () => {
            const isKeepingBackwardsBufferTarget = await playerAdapter.isKeepingBackwardsBufferTarget(Constants.TEST_TIMEOUT_THRESHOLDS.BUFFER_CLEANUP, Constants.TEST_INPUTS.BUFFER_CLEANUP.TO_KEEP, Constants.TEST_INPUTS.BUFFER_CLEANUP.TOLERANCE);
            expect(isKeepingBackwardsBufferTarget).to.be.true;
        });

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })
    })
})
