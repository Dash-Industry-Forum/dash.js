import DashJsAdapter from '../../adapter/DashJsAdapter.js';
import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai'

const TESTCASE = Constants.TESTCASES.SIMPLE.ENDED;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`Simple - Ended - ${item.name} - ${mpd}`, () => {

        let playerAdapter;

        before(function () {
            playerAdapter = new DashJsAdapter();
            if (item.type === Constants.CONTENT_TYPES.LIVE) {
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

        it(`Seek close to playback end`, async () => {
            const targetTime = playerAdapter.getDuration() - Constants.TEST_INPUTS.ENDED.SEEK_END_OFFSET;
            playerAdapter.seek(targetTime);
            const timeIsWithinThreshold = playerAdapter.timeIsWithinThreshold(targetTime, Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE);
            expect(timeIsWithinThreshold).to.be.true;
        })

        it(`Check if ended event is thrown`, async () => {
            const ended = await playerAdapter.waitForEvent(Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE * 1000 + Constants.TEST_TIMEOUT_THRESHOLDS.EVENT_WAITING_TIME, dashjs.MediaPlayer.events.PLAYBACK_ENDED);
            expect(ended).to.be.true;
        })

        it(`Expect no critical errors to be thrown`, () => {
            const logEvents = playerAdapter.getLogEvents();
            expect(logEvents[dashjs.Debug.LOG_LEVEL_ERROR]).to.be.empty;
        })
    })
})
