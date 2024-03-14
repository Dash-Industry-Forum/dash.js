import DashJsAdapter from '../../adapter/DashJsAdapter.js';
import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai'

const TESTCASE_CATEGORY = Constants.TESTCASES.CATEGORIES.PLAYBACK_ADVANCED;
const TESTCASE = Constants.TESTCASES.PLAYBACK_ADVANCED.MULTIPERIOD_PLAYBACK;

Utils.getTestvectorsForTestcase(TESTCASE_CATEGORY, TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, function () {

        let playerAdapter

        before(function () {
            playerAdapter = new DashJsAdapter();

            if (!item.testdata || !item.testdata.periods || isNaN(item.testdata.periods.waitingTimeForPeriodSwitches)
                || isNaN(item.testdata.periods.minimumNumberOfPeriodSwitches) || isNaN(item.testdata.periods.maximumNumberOfPeriodSwitches)) {
                this.skip();
            }

            playerAdapter.init(true);
            playerAdapter.setDrmData(item.drm);
            playerAdapter.attachSource(mpd);
        })

        after(() => {
            playerAdapter.destroy();
        })

        it(`Checking playing state`, async () => {
            const isPlaying = await playerAdapter.isInPlayingState(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PLAYING);
            expect(isPlaying).to.be.true;
        })

        it(`Checking progressing state`, async () => {
            const isProgressing = await playerAdapter.isProgressing(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PROGRESSING, Constants.TEST_INPUTS.GENERAL.MINIMUM_PROGRESS_WHEN_PLAYING);
            expect(isProgressing).to.be.true;
        });

        it(`Transitions to next periods`, async () => {
            const numberOfPeriodSwitches = await playerAdapter.performedPeriodTransitions(item.testdata.periods.waitingTimeForPeriodSwitches);
            expect(numberOfPeriodSwitches).to.be.at.most(item.testdata.periods.maximumNumberOfPeriodSwitches);
            expect(numberOfPeriodSwitches).to.be.at.least(item.testdata.periods.minimumNumberOfPeriodSwitches);
        });

        it(`Should still be progressing`, async () => {
            const isProgressing = await playerAdapter.isProgressing(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PROGRESSING, Constants.TEST_INPUTS.GENERAL.MINIMUM_PROGRESS_WHEN_PLAYING);
            expect(isProgressing).to.be.true;
        });

        it(`Expect no critical errors to be thrown`, () => {
            const logEvents = playerAdapter.getLogEvents();
            expect(logEvents[dashjs.Debug.LOG_LEVEL_ERROR]).to.be.empty;
        })
    })
})
