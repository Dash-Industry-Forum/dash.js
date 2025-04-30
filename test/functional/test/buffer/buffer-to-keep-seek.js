/**
 * This test checks if playback resumes after a seek in case bufferToKeep is larger than bufferTimeAtTopQuality
 */
import Constants from '../../src/Constants.js';
import {
    checkIsNotProgressing,
    checkIsPlaying,
    checkIsProgressing,
    checkNoCriticalErrors, checkTimeWithinThresholdForDvrWindow,
    initializeDashJsAdapter,
    reachedTargetForwardBuffer
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.BUFFER.TO_KEEP_SEEK;

const item = {
    url: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
    type: 'vod',
    name: 'Segment Template BBB',
    segmentDuration: 4
}

const mpd = item.url;
describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {

    let playerAdapter;
    const TARGET_BUFFER = 10;
    const BUFFER_TO_KEEP = TARGET_BUFFER + 100

    before(() => {
        const settings = {
            streaming: {
                buffer: {
                    bufferTimeDefault: TARGET_BUFFER,
                    bufferTimeAtTopQuality: TARGET_BUFFER,
                    bufferTimeAtTopQualityLongForm: TARGET_BUFFER,
                    longFormContentDurationThreshold: 6000,
                    bufferToKeep: BUFFER_TO_KEEP,
                    bufferPruningInterval: 10,
                },
            }
        }
        playerAdapter = initializeDashJsAdapter(item, mpd, settings);
    })

    after(() => {
        if (playerAdapter) {
            playerAdapter.destroy();
        }
    })

    it(`Checking playing state`, async () => {
        await checkIsPlaying(playerAdapter, true);
    })

    it(`Checking progressing state`, async () => {
        await checkIsProgressing(playerAdapter);
    });

    it(`Pause the playback`, async () => {
        playerAdapter.pause();
        await checkIsPlaying(playerAdapter, false);
        await checkIsNotProgressing(playerAdapter);
    });

    it(`Wait for forward buffer to be filled`, async () => {
        await reachedTargetForwardBuffer(playerAdapter, TARGET_BUFFER, item.segmentDuration);
    });

    it(`Seek to an unbuffered range`, () => {
        const bufferEnd = playerAdapter.getBufferLengthByType() + playerAdapter.getCurrentTime();
        const targetTime = Math.min(bufferEnd + Constants.TEST_INPUTS.BUFFER_TO_KEEP_SEEK.SEEK_OFFSET, playerAdapter.getDuration() - 10);
        playerAdapter.seek(targetTime);

        checkTimeWithinThresholdForDvrWindow(playerAdapter, targetTime, Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE);
    });

    it(`Resume playback`, async () => {
        playerAdapter.play()
        await checkIsPlaying(playerAdapter, true);
    })

    it(`Checking progressing state`, async () => {
        await checkIsProgressing(playerAdapter);
    });

    it(`Expect no critical errors to be thrown`, () => {
        checkNoCriticalErrors(playerAdapter);
    })
})

