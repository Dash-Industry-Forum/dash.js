import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {
    checkIsPlaying,
    checkIsProgressing,
    checkNoCriticalErrors,
    checkTimeWithinThresholdForDvrWindow,
    initializeDashJsAdapter
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.PLAYBACK.SEEK;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {

        let playerAdapter;

        before(() => {
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

        it(`Seek() to 0`, async () => {
            playerAdapter.seek(0);
            checkTimeWithinThresholdForDvrWindow(playerAdapter, 0, Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE);
        });

        it(`Checking playing state`, async () => {
            await checkIsPlaying(playerAdapter, true)
        })

        it(`Checking progressing state`, async () => {
            await checkIsProgressing(playerAdapter)
        });

        it(`Seek() to negative value`, async () => {
            playerAdapter.pause();
            playerAdapter.seek(-10);

            checkTimeWithinThresholdForDvrWindow(playerAdapter, 0, Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE);
        });

        it(`Checking playing state`, async () => {
            playerAdapter.play();
            await checkIsPlaying(playerAdapter, true)
        })

        it(`Checking progressing state`, async () => {
            await checkIsProgressing(playerAdapter)
        });

        it(`Seek() to large value`, async () => {
            playerAdapter.pause();
            playerAdapter.seek(999999999999);

            // For live we expect to be playing close to the live edge, For VoD we are at the end of the stream.
            const targetTime = playerAdapter.isDynamic() ? playerAdapter.getDuration() - playerAdapter.getCurrentLiveLatency() : playerAdapter.getDuration();
            const allowedDifference = playerAdapter.isDynamic() ? Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE_LIVE_EDGE : Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE;

            checkTimeWithinThresholdForDvrWindow(playerAdapter, targetTime, allowedDifference);
        });

        for (let i = 0; i < Constants.TEST_INPUTS.SEEK.NUMBER_OF_RANDOM_SEEKS; i++) {
            it(`Seek to random time`, async () => {
                const targetTime = playerAdapter.generateValidSeekPosition();
                playerAdapter.pause();
                playerAdapter.seek(targetTime);

                checkTimeWithinThresholdForDvrWindow(playerAdapter, targetTime, Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE);
            });

            it(`Checking playing state`, async () => {
                playerAdapter.play();
                await checkIsPlaying(playerAdapter, true)
            })

            it(`Checking progressing state`, async () => {
                await checkIsProgressing(playerAdapter)
            });
        }

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter)
        })
    })
})

