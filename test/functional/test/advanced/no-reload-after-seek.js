import DashJsAdapter from '../../adapter/DashJsAdapter.js';
import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai'

const TESTCASE = Constants.TESTCASES.ADVANCED.NO_RELOAD_AFTER_SEEK;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} -${mpd}`, () => {

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

        it(`Wait till the player has enough backwards buffer`, async () => {
            const reachedTargetTime = await playerAdapter.reachedPlaybackPosition(Constants.TEST_TIMEOUT_THRESHOLDS.TO_REACH_TARGET_OFFSET, Constants.TEST_INPUTS.NO_RELOAD_AFTER_SEEK.TIME_TO_REACH_FOR_REDUNDANT_SEGMENT_FETCH);
            expect(reachedTargetTime).to.be.true;
        });

        it(`Pause and seek back`, async () => {
            playerAdapter.pause();
            const previousTime = playerAdapter.getCurrentTime();
            const seekTime = previousTime - Constants.TEST_INPUTS.NO_RELOAD_AFTER_SEEK.TIME_TO_SEEK_BACK_FOR_REDUNDANT_SEGMENT_FETCH;
            playerAdapter.seek(seekTime);
            const timeIsWithinThreshold = playerAdapter.timeIsWithinThreshold(seekTime, Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE);
            expect(timeIsWithinThreshold).to.be.true;
        });

        it(`Start playback`, () => {
            playerAdapter.play();
        });

        it(`Checking playing state`, async () => {
            const isPlaying = await playerAdapter.isInPlayingState(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PLAYING);
            expect(isPlaying).to.be.true;
        })

        it(`Checking progressing state`, async () => {
            const isProgressing = await playerAdapter.isProgressing(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PROGRESSING, Constants.TEST_INPUTS.GENERAL.MINIMUM_PROGRESS_WHEN_PLAYING);
            expect(isProgressing).to.be.true;
        });

        it('Play for some time', async () => {
            const currentTime = playerAdapter.getCurrentTime();
            const reachedTargetTime = await playerAdapter.reachedPlaybackPosition(Constants.TEST_TIMEOUT_THRESHOLDS.TO_REACH_TARGET_OFFSET, Constants.TEST_INPUTS.NO_RELOAD_AFTER_SEEK.OFFSET_TO_REACH_WHEN_PLAYING + currentTime);
            expect(reachedTargetTime).to.be.true;
        })

        it(`Do not expect any redundant segment downloads`, async () => {
            const redundantSegmentsFetched = playerAdapter.hasDuplicateFragmentDownloads();
            expect(redundantSegmentsFetched).to.be.false;
        })

        it(`Expect no critical errors to be thrown`, () => {
            const logEvents = playerAdapter.getLogEvents();
            expect(logEvents[dashjs.Debug.LOG_LEVEL_ERROR]).to.be.empty;
        })

    })
})
