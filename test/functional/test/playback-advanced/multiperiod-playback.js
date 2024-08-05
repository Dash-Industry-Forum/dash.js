import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import { expect } from '@esm-bundle/chai';
import {checkIsPlaying, checkIsProgressing, checkNoCriticalErrors, initializeDashJsAdapter} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.PLAYBACK_ADVANCED.MULTIPERIOD_PLAYBACK;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, function () {

        let playerAdapter

        before(function () {
            if (!item.testdata || !item.testdata.periods || isNaN(item.testdata.periods.waitingTimeForPeriodSwitches)
                || isNaN(item.testdata.periods.minimumNumberOfPeriodSwitches) || isNaN(item.testdata.periods.maximumNumberOfPeriodSwitches)) {
                this.skip();
            }
            playerAdapter = initializeDashJsAdapter(item, mpd);
        })

        after(() => {
            if (playerAdapter) {
                playerAdapter.destroy();
            }
        })

        it(`Checking playing state`, async () => {
            await checkIsPlaying(playerAdapter, true)
        })

        it(`Checking progressing state`, async () => {
            await checkIsProgressing(playerAdapter)
        });

        it(`Transitions to next periods`, async () => {
            const numberOfPeriodSwitches = await playerAdapter.performedPeriodTransitions(item.testdata.periods.waitingTimeForPeriodSwitches);
            expect(numberOfPeriodSwitches).to.be.at.most(item.testdata.periods.maximumNumberOfPeriodSwitches);
            expect(numberOfPeriodSwitches).to.be.at.least(item.testdata.periods.minimumNumberOfPeriodSwitches);
        });

        it(`Checking progressing state`, async () => {
            await checkIsProgressing(playerAdapter)
        });

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter)
        })
    })
})
