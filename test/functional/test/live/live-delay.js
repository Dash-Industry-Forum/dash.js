import DashJsAdapter from '../../adapter/DashJsAdapter.js';
import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai'
import {checkIsPlaying, checkIsProgressing, checkLiveDelay, checkNoCriticalErrors} from '../common/common.js';

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
            await checkIsPlaying(playerAdapter, true)
        })

        it(`Checking progressing state`, async () => {
            await checkIsProgressing(playerAdapter)
        });

        it(`Checking if live delay is correct`, async () => {
            checkLiveDelay(Constants.TEST_INPUTS.LIVE_DELAY.VALUE, Constants.TEST_INPUTS.LIVE_DELAY.VALUE + Constants.TEST_INPUTS.LIVE_DELAY.TOLERANCE);
        });

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter)
        })
    })
})
