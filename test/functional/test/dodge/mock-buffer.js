import Constants from '../../src/Constants.js';
import {expect} from 'chai';
import Utils from '../../src/Utils.js';

import {
    checkIsPlaying,
    checkNoCriticalErrors,
    initializeDashJsAdapter
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.DODGE.MOCK_BUFFER;

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

        it(`Buffer level is non-negative during defended playback`, async () => {
            const timeout = 30000;
            const start = Date.now();
            let bufferWasPositive = false;
            while (Date.now() - start < timeout) {
                const videoBuffer = playerAdapter.getBufferLengthByType('video');
                if (typeof videoBuffer === 'number' && !isNaN(videoBuffer)) {
                    expect(videoBuffer).to.be.at.least(0, 'Video buffer should never be negative during defended playback');
                    if (videoBuffer > 0) {
                        bufferWasPositive = true;
                    }
                }
                if (playerAdapter.isDodgeTrailing()) {
                    break;
                }
                await playerAdapter.sleep(500);
            }
            expect(bufferWasPositive, 'Expected buffer to be positive at some point during data cycles').to.be.true;
        })

        it(`Buffer level remains non-negative after data cycles`, () => {
            const videoBuffer = playerAdapter.getBufferLengthByType('video');
            if (typeof videoBuffer === 'number' && !isNaN(videoBuffer)) {
                expect(videoBuffer).to.be.at.least(0, 'Video buffer should not be negative after data cycles complete');
            }
        })

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })
    })
})
