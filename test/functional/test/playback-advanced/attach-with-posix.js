import DashJsAdapter from '../../adapter/DashJsAdapter.js';
import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai'
import {
    checkIsPlaying,
    checkIsProgressing,
    checkLiveDelay,
    checkNoCriticalErrors,
    initializeDashJsAdapter
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.PLAYBACK_ADVANCED.ATTACH_WITH_POSIX;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {

        let playerAdapter;

        before(function () {
            if (item.type === Constants.CONTENT_TYPES.VOD) {
                this.skip();
            }
            playerAdapter = initializeDashJsAdapter(item, mpd);
        })

        after(() => {
            if (playerAdapter) {
                playerAdapter.destroy();
            }
        })

        it(`Attach with posix and expect live delay to correspond`, async () => {
            const starttime = new Date().getTime() / 1000 - Constants.TEST_INPUTS.ATTACH_WITH_POSIX.DELAY;
            playerAdapter.attachSource(mpd, `posix:${starttime}`); /* start from UTC time */

            await checkIsPlaying(playerAdapter, true);
            await checkIsProgressing(playerAdapter);
            checkLiveDelay(playerAdapter, Constants.TEST_INPUTS.ATTACH_WITH_POSIX.DELAY - Constants.TEST_INPUTS.ATTACH_WITH_POSIX.TOLERANCE, Constants.TEST_INPUTS.ATTACH_WITH_POSIX.DELAY + Constants.TEST_INPUTS.ATTACH_WITH_POSIX.TOLERANCE)
        })

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter)
        })
    })
})
