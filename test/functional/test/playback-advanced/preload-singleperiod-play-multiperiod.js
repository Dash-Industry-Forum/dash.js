import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';

import {
    checkIsNotProgressing,
    checkIsPlaying,
    checkIsProgressing,
    checkNoCriticalErrors,
    initializeDashJsAdapterForPreload
} from '../common/common.js';
import {expect} from 'chai';

const TESTCASE = Constants.TESTCASES.PLAYBACK_ADVANCED.PRELOAD_SINGLE_PERIOD_PLAY_MULTIPERIOD;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {
        let playerAdapter;

        before(function () {
            if (item.drm || !item.testdata || !item.testdata.preloadSingleperiodPlayMultiperiod || !item.testdata.preloadSingleperiodPlayMultiperiod.waitingTimeForPeriodSwitch) {
                this.skip();
            }
            playerAdapter = initializeDashJsAdapterForPreload(item, mpd);
        })

        after(() => {
            if (playerAdapter) {
                playerAdapter.destroy();
            }
        })

        it(`Should download segments`, async () => {
            const eventPayload = await playerAdapter.waitForMediaSegmentDownload(Constants.TEST_TIMEOUT_THRESHOLDS.EVENT_WAITING_TIME);

            expect(eventPayload).to.not.be.null;
        })

        it(`Should not progress`, async () => {
            await checkIsNotProgressing(playerAdapter);
        });

        it(`Attach view and expect to progress`, async () => {
            playerAdapter.attachView();
            await checkIsPlaying(playerAdapter, true);
            await checkIsProgressing(playerAdapter);
        });

        it(`Expect player to transition to second period`, async () => {
            const timeout = item.testdata.preloadSingleperiodPlayMultiperiod.waitingTimeForPeriodSwitch;
            const numberOfPeriodSwitches = await playerAdapter.performedPeriodTransitions(timeout);

            expect(numberOfPeriodSwitches).to.be.at.least(1);
        });

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })

    })
})
