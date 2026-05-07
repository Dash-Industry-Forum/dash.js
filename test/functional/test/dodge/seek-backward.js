import Constants from '../../src/Constants.js';
import {expect} from 'chai';
import Utils from '../../src/Utils.js';

import {
    checkIsPlaying,
    checkIsProgressing,
    checkNoCriticalErrors,
    initializeDashJsAdapter
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.DODGE.SEEK_BACKWARD;

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

        it(`Seek forward then backward resumes defended playback`, async () => {
            const forwardTarget = 60;
            playerAdapter.seek(forwardTarget);
            const reachedForward = await playerAdapter.reachedPlaybackPosition(30000, forwardTarget + 1);
            expect(reachedForward, `Expected playback to reach ${forwardTarget + 1}s`).to.be.true;

            const backwardTarget = 10;
            playerAdapter.seek(backwardTarget);
            const reachedBackward = await playerAdapter.reachedPlaybackPosition(30000, backwardTarget + 1);
            expect(reachedBackward, `Expected playback to reach ${backwardTarget + 1}s after seeking backward`).to.be.true;
        })

        it(`Defense remains active after backward seek`, () => {
            expect(playerAdapter.isDodgeActive()).to.be.true;
        })

        it(`Rapid successive seeks do not break defense`, async () => {
            playerAdapter.seek(30);
            await playerAdapter.sleep(500);
            playerAdapter.seek(50);
            await playerAdapter.sleep(500);
            playerAdapter.seek(20);

            const reached = await playerAdapter.reachedPlaybackPosition(30000, 21);
            expect(reached, 'Expected playback to reach 21s after rapid seeks').to.be.true;
            expect(playerAdapter.isDodgeActive()).to.be.true;
        })

        it(`Playback progresses after seeks`, async () => {
            // Rapid successive seeks can leave the element briefly paused
            // (e.g. dash.js GapController toggle-pause to break a stall
            // following buffer clears). Explicitly resume so the progression
            // check sees timeupdate events.
            playerAdapter.play();
            await checkIsProgressing(playerAdapter);
        })

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })
    })
})
