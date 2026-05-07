import Constants from '../../src/Constants.js';
import {expect} from 'chai';
import Utils from '../../src/Utils.js';

import {
    checkIsPlaying,
    checkIsProgressing,
    checkNoCriticalErrors,
    initializeDashJsAdapter
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.DODGE.SEEK;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {
        let playerAdapter;

        before(() => {
            playerAdapter = initializeDashJsAdapter(item, mpd, {
                streaming: {
                    abr: {
                        autoSwitchBitrate: { video: false, audio: false }
                    }
                }
            });
        })

        after(() => {
            if (playerAdapter) {
                playerAdapter.destroy();
            }
        })

        it(`Checking playing state`, async () => {
            await checkIsPlaying(playerAdapter, true);
        })

        it(`Dodge defense is active`, async () => {
            const timeout = Constants.TEST_TIMEOUT_THRESHOLDS.DODGE_PLAYING;
            const start = Date.now();
            let isActive = false;
            while (Date.now() - start < timeout) {
                isActive = playerAdapter.isDodgeActive();
                if (isActive) {
                    break;
                }
                await playerAdapter.sleep(200);
            }
            expect(isActive).to.be.true;
        })

        it(`Seek forward resumes defended playback`, async () => {
            // Seek to 60s (well past the initial buffer). This exercises
            // getSegmentRequestForTime which uses a different code path than
            // getNextSegmentRequest (it locates the cycle by time rather than
            // advancing sequentially).
            const seekTarget = 60;
            playerAdapter.seek(seekTarget);

            // Verify playback resumes near the seek target
            const reached = await playerAdapter.reachedPlaybackPosition(30000, seekTarget + 1);
            expect(reached, `Expected playback to reach ${seekTarget + 1}s after seeking to ${seekTarget}s`).to.be.true;
        })

        it(`Defense remains active after seek`, () => {
            const isActive = playerAdapter.isDodgeActive();
            expect(isActive).to.be.true;
        })

        it(`Playback progresses after seek`, async () => {
            await checkIsProgressing(playerAdapter);
        })

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })
    })
})
