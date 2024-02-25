import DashJsAdapter from '../../adapter/DashJsAdapter.js';
import Constants from '../../helper/Constants.js';
import Utils from '../../helper/Utils.js';
import {expect} from 'chai'

const TESTCASE = Constants.TESTCASES.SIMPLE.SEEK;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`Simple - Seek - ${item.name} - ${mpd}`, () => {

        let playerAdapter;

        before(() => {
            playerAdapter = new DashJsAdapter();
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

        it(`Checking seek to 0`, async () => {
            playerAdapter.seek(0);
            const timeIsWithinThreshold = playerAdapter.timeIsWithinThreshold(0, Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE);
            expect(timeIsWithinThreshold).to.be.true;

            const isPlaying = await playerAdapter.isInPlayingState(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PLAYING);
            expect(isPlaying).to.be.true;

            const isProgressing = await playerAdapter.isProgressing(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PROGRESSING, Constants.TEST_INPUTS.GENERAL.MINIMUM_PROGRESS_WHEN_PLAYING);
            expect(isProgressing).to.be.true;
        });

        it(`Checking seek to negative value`, async () => {
            playerAdapter.pause();
            playerAdapter.seek(-10);
            const timeIsWithinThreshold = playerAdapter.timeIsWithinThreshold(0, Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE);
            expect(timeIsWithinThreshold).to.be.true;

            playerAdapter.play();
            const isPlaying = await playerAdapter.isInPlayingState(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PLAYING);
            expect(isPlaying).to.be.true;

            const isProgressing = await playerAdapter.isProgressing(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PROGRESSING, Constants.TEST_INPUTS.GENERAL.MINIMUM_PROGRESS_WHEN_PLAYING);
            expect(isProgressing).to.be.true;
        });

        it(`Checking seek to high value`, async () => {
            playerAdapter.pause();
            playerAdapter.seek(999999999999);

            // For live we expect to be playing close to the live edge, For VoD we are at the end of the stream.
            const targetTime = playerAdapter.isDynamic() ? playerAdapter.getDuration() - playerAdapter.getCurrentLiveLatency() : playerAdapter.getDuration();
            const allowedDifference = playerAdapter.isDynamic() ? Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE_LIVE_EDGE : Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE;
            const timeIsWithinThreshold = playerAdapter.timeIsWithinThreshold(targetTime, allowedDifference);
            expect(timeIsWithinThreshold).to.be.true;
        });

        for (let i = 0; i < Constants.TEST_INPUTS.SEEK.NUMBER_OF_RANDOM_SEEKS; i++) {
            it(`Checking seek to random time`, async () => {
                const targetTime = playerAdapter.generateValidSeekPosition();
                playerAdapter.pause();
                playerAdapter.seek(targetTime);
                const timeIsWithinThreshold = playerAdapter.timeIsWithinThreshold(targetTime, Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE);
                expect(timeIsWithinThreshold).to.be.true;

                playerAdapter.play();
                const isPlaying = await playerAdapter.isInPlayingState(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PLAYING);
                expect(isPlaying).to.be.true;

                const isProgressing = await playerAdapter.isProgressing(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PROGRESSING, Constants.TEST_INPUTS.GENERAL.MINIMUM_PROGRESS_WHEN_PLAYING);
                expect(isProgressing).to.be.true;
            });
        }

        it(`Expect no critical errors to be thrown`, () => {
            const logEvents = playerAdapter.getLogEvents();
            expect(logEvents[dashjs.Debug.LOG_LEVEL_ERROR]).to.be.empty;
        })
    })
})

