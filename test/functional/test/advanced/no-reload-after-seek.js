import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai'
import {
    checkIsPlaying,
    checkIsProgressing, checkNoCriticalErrors,
    checkTimeWithinThreshold,
    initializeDashJsAdapter
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.ADVANCED.NO_RELOAD_AFTER_SEEK;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} -${mpd}`, () => {

        let playerAdapter;

        before(() => {
            playerAdapter = initializeDashJsAdapter(item, mpd, {
                streaming: {
                    buffer: {
                        fastSwitchEnabled: false
                    }
                }
            });
        })

        after(() => {
            playerAdapter.destroy();
        })

        it(`Checking playing state`, async () => {
            await checkIsPlaying(playerAdapter, true);
        })

        it(`Checking progressing state`, async () => {
            await checkIsProgressing(playerAdapter);
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
            checkTimeWithinThreshold(playerAdapter, seekTime, Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE);
        });

        it(`Start playback`, () => {
            playerAdapter.play();
        });

        it(`Checking playing state`, async () => {
            await checkIsPlaying(playerAdapter, true);
        })

        it(`Checking progressing state`, async () => {
            await checkIsProgressing(playerAdapter);
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
            checkNoCriticalErrors(playerAdapter);
        })

    })
})
