import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {
    checkIsPlaying,
    checkIsProgressing,
    checkNoCriticalErrors,
    checkTimeWithinThreshold,
    checkTimeWithinThresholdForDvrWindow,
    initializeDashJsAdapter,
    isLiveContent
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.PLAYBACK.SEEK_TO_PRESENTATION_TIME;

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

        it(`Checking initial playing state`, async () => {
            await checkIsPlaying(playerAdapter, true)
        })

        it(`Checking initial progressing state`, async () => {
            await checkIsProgressing(playerAdapter)
        });

        it(`seekToPresentationTime() to 0`, async () => {
            playerAdapter.seekToPresentationTime(0);

            if (!isLiveContent(item)) {
                checkTimeWithinThreshold(playerAdapter, 0, Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE);
            } else {
                checkTimeWithinThresholdForDvrWindow(playerAdapter, 0, Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE);
            }
        });

        it(`Checking playing state after seeking to 0`, async () => {
            await checkIsPlaying(playerAdapter, true)
        })

        it(`Checking progressing state after seeking to 0`, async () => {
            await checkIsProgressing(playerAdapter)
        });

        it(`seekToPresentationTime() to negative value`, async () => {
            playerAdapter.pause();
            playerAdapter.seekToPresentationTime(-10);

            if (!isLiveContent(item)) {
                checkTimeWithinThreshold(playerAdapter, 0, Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE);
            } else {
                checkTimeWithinThresholdForDvrWindow(playerAdapter, 0, Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE);
            }
        });

        it(`Checking playing state after seeking to negative value`, async () => {
            playerAdapter.play();
            await checkIsPlaying(playerAdapter, true)
        })

        it(`Checking progressing state after seeking to negative value`, async () => {
            await checkIsProgressing(playerAdapter)
        });

        it(`seekToPresentationTime() to large value`, async () => {
            playerAdapter.pause();
            let seektime;
            if (!isLiveContent(item)) {
                seektime = playerAdapter.getDuration() + 100;
            } else {
                seektime = playerAdapter.getCurrentTime() + playerAdapter.getTargetLiveDelay() + 100
            }
            playerAdapter.seekToPresentationTime(seektime);

            // For live we expect to be playing close to the live edge, For VoD we are at the end of the stream.
            const targetTime = playerAdapter.isDynamic() ? playerAdapter.getDuration() - playerAdapter.getCurrentLiveLatency() : playerAdapter.getDuration();
            const allowedDifference = playerAdapter.isDynamic() ? Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE_LIVE_EDGE : Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE;

            checkTimeWithinThresholdForDvrWindow(playerAdapter, targetTime, allowedDifference);
        });


        for (let i = 0; i < Constants.TEST_INPUTS.SEEK.NUMBER_OF_RANDOM_SEEKS; i++) {
            it(`seekToPresentationTime to random time`, async () => {
                const targetTime = playerAdapter.generateValidPresentationTimeSeekPosition();
                playerAdapter.pause();
                playerAdapter.seekToPresentationTime(targetTime);

                checkTimeWithinThreshold(playerAdapter, targetTime, Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE);
            });

            it(`Checking playing state after random seek`, async () => {
                playerAdapter.play();
                await checkIsPlaying(playerAdapter, true)
            })

            it(`Checking progressing state after random seek`, async () => {
                await checkIsProgressing(playerAdapter)
            });
        }

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter)
        })
    })
})

