import DashJsAdapter from '../../adapter/DashJsAdapter';
import Constants from '../../helper/Constants';
import Utils from '../../helper/Utils';
import {expect} from 'chai'

const TESTCASE = Constants.TESTCASES.SIMPLE.ATTACH_WITH_POSIX;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`Simple - Attach with posix - ${item.name} - ${mpd}`, () => {

        let playerAdapter;

        before(function () {
            playerAdapter = new DashJsAdapter();
            if (item.type === Constants.CONTENT_TYPES.VOD) {
                this.skip();
            }
            playerAdapter.init(true);
            playerAdapter.setDrmData(item.drm);
        })

        after(() => {
            playerAdapter.destroy();
        })

        it(`Attach with posix and expect live delay to correspond`, async () => {
            const starttime = new Date().getTime() / 1000 - Constants.TEST_INPUTS.ATTACH_WITH_POSIX.DELAY;
            playerAdapter.attachSource(mpd, `posix:${starttime}`); /* start from UTC time */

            const isPlaying = await playerAdapter.isInPlayingState(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PLAYING);
            expect(isPlaying).to.be.true;

            const isProgressing = await playerAdapter.isProgressing(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PROGRESSING, Constants.TEST_INPUTS.GENERAL.MINIMUM_PROGRESS_WHEN_PLAYING);
            expect(isProgressing).to.be.true;

            const liveDelay = playerAdapter.getCurrentLiveLatency();
            expect(liveDelay).to.be.at.least(Constants.TEST_INPUTS.ATTACH_WITH_POSIX.DELAY - Constants.TEST_INPUTS.ATTACH_WITH_POSIX.TOLERANCE);
            expect(liveDelay).to.be.below(Constants.TEST_INPUTS.ATTACH_WITH_POSIX.DELAY + Constants.TEST_INPUTS.ATTACH_WITH_POSIX.TOLERANCE);
        })

        it(`Expect no critical errors to be thrown`, () => {
            const logEvents = playerAdapter.getLogEvents();
            expect(logEvents[dashjs.Debug.LOG_LEVEL_ERROR]).to.be.empty;
        })
    })
})
