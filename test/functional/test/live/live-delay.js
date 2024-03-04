import DashJsAdapter from '../../adapter/DashJsAdapter.js';
import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai'

const TESTCASE = Constants.TESTCASES.LIVE.DELAY;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`Simple - Live Delay - ${item.name} - ${mpd}`, () => {

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

        it(`Setting initial live delay`, () => {
            playerAdapter.updateSettings({ streaming: { delay: { liveDelay: Constants.TEST_INPUTS.LIVE_DELAY.VALUE } } })
        })

        it(`Attach source`, () => {
            playerAdapter.attachSource(mpd);
        })

        it(`Checking playing state`, async () => {
            const isPlaying = await playerAdapter.isInPlayingState(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PLAYING);
            expect(isPlaying).to.be.true;
        })

        it(`Checking progressing state`, async () => {
            const isProgressing = await playerAdapter.isProgressing(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PROGRESSING, Constants.TEST_INPUTS.GENERAL.MINIMUM_PROGRESS_WHEN_PLAYING);
            expect(isProgressing).to.be.true;
        });

        it(`Checking if live delay is correct`, async () => {
            const liveDelay = playerAdapter.getCurrentLiveLatency();
            expect(liveDelay).to.be.at.least(Constants.TEST_INPUTS.LIVE_DELAY.VALUE);
            expect(liveDelay).to.be.below(Constants.TEST_INPUTS.LIVE_DELAY.VALUE + Constants.TEST_INPUTS.LIVE_DELAY.TOLERANCE);
        });

        it(`Expect no critical errors to be thrown`, () => {
            const logEvents = playerAdapter.getLogEvents();
            expect(logEvents[dashjs.Debug.LOG_LEVEL_ERROR]).to.be.empty;
        })
    })
})
