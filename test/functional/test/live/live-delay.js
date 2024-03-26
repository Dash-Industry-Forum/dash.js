import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {
    checkIsPlaying,
    checkIsProgressing,
    checkLiveDelay,
    checkNoCriticalErrors,
    initializeDashJsAdapter
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.LIVE.DELAY;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {
        let playerAdapter;

        before(function () {
            if (item.type === Constants.CONTENT_TYPES.VOD) {
                this.skip();
            }
            const settings = { streaming: { delay: { liveDelay: Constants.TEST_INPUTS.LIVE_DELAY.VALUE } } }
            playerAdapter = initializeDashJsAdapter(item, mpd, settings)
        })

        after(() => {
            if (playerAdapter) {
                playerAdapter.destroy();
            }
        })

        it(`Checking playing state`, async () => {
            await checkIsPlaying(playerAdapter, true);
        })

        it(`Checking progressing state`, async () => {
            await checkIsProgressing(playerAdapter);
        });

        it(`Checking if live delay is correct`, async () => {
            checkLiveDelay(playerAdapter, Constants.TEST_INPUTS.LIVE_DELAY.VALUE, Constants.TEST_INPUTS.LIVE_DELAY.VALUE + Constants.TEST_INPUTS.LIVE_DELAY.TOLERANCE);
        });

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter)
        })
    })
})
