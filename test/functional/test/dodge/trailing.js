import Constants from '../../src/Constants.js';
import {expect} from 'chai';
import Utils from '../../src/Utils.js';

import {
    checkIsPlaying,
    checkNoCriticalErrors,
    initializeDashJsAdapter
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.DODGE.TRAILING;

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

        it(`Trailing phase is reached`, async () => {
            // The short manifest has only 3 real segments (12s) then padding.
            // Poll until isDodgeTrailing() becomes true or timeout.
            const timeout = 30000;
            const start = Date.now();
            let isTrailing = false;
            while (Date.now() - start < timeout) {
                isTrailing = playerAdapter.isDodgeTrailing();
                if (isTrailing) {
                    break;
                }
                await playerAdapter.sleep(500);
            }
            expect(isTrailing, 'Expected isDodgeTrailing() to become true after real segments were exhausted').to.be.true;
        })

        it(`Buffer level remains positive during trailing`, () => {
            const videoBuffer = playerAdapter.getBufferLengthByType('video');
            expect(videoBuffer).to.be.a('number');
            expect(videoBuffer).to.be.at.least(0, 'Video buffer level should not be negative during trailing (mock buffer may be broken)');
        })

        it(`Playback position does not jump to stream end during trailing`, async () => {
            const duration = playerAdapter.getDuration();
            await playerAdapter.sleep(3000);
            const currentTime = playerAdapter.getCurrentTime();
            expect(currentTime).to.be.below(duration - 100, 'Playback position jumped near stream end during trailing - gap jump suppression may have failed (duration=' + duration + ', currentTime=' + currentTime + ')');
        })

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })
    })
})
