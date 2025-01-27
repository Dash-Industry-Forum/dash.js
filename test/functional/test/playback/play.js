import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';

import {
    checkIsPlaying,
    checkIsProgressing,
    checkNoCriticalErrors,
    initializeDashJsAdapter
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.PLAYBACK.PLAY;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {
        let playerAdapter;

        before(() => {
            playerAdapter = initializeDashJsAdapter(item, mpd);
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

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })

    })
})
