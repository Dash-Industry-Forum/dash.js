import Constants from '../../src/Constants.js';
import {expect} from 'chai';
import Utils from '../../src/Utils.js';

import {
    checkIsNotProgressing,
    initializeDashJsAdapter,
    playForDuration
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.DODGE.STRICT_MODE_REJECTS_MPD;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {
        let playerAdapter;

        before(async () => {
            playerAdapter = initializeDashJsAdapter(item, mpd, {
                dodge: {
                    strictMode: 'manifest'
                }
            });

            // Wait for manifest load attempt
            await playForDuration(8000);
        })

        after(() => {
            if (playerAdapter) {
                playerAdapter.destroy();
            }
        })

        it(`Dodge defense should not be active with a regular MPD`, () => {
            const isActive = playerAdapter.isDodgeActive();
            expect(isActive).to.be.false;
        })

        it(`Playback should not progress`, async () => {
            await checkIsNotProgressing(playerAdapter);
        })
    })
})
