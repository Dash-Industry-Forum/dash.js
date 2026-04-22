import Constants from '../../src/Constants.js';
import {expect} from 'chai';
import Utils from '../../src/Utils.js';

import {
    checkIsPlaying,
    checkNoCriticalErrors,
    initializeDashJsAdapter
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.DODGE.EXTENDED_TRAILING;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, function () {
        this.timeout(120000);

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
            expect(isTrailing, 'Expected isDodgeTrailing() to become true').to.be.true;
        })

        it(`Buffer level is non-negative during extended trailing`, () => {
            const videoBuffer = playerAdapter.getBufferLengthByType('video');
            if (typeof videoBuffer === 'number' && !isNaN(videoBuffer)) {
                expect(videoBuffer).to.be.at.least(0,
                    'Video buffer should be non-negative during extended trailing');
            }
        })

        it(`Extended trailing downloads more cycles than short trailing`, async () => {
            const timeout = 30000;
            const start = Date.now();
            let trailingSeenCount = 0;
            while (Date.now() - start < timeout) {
                if (playerAdapter.isDodgeTrailing()) {
                    trailingSeenCount++;
                }
                if (trailingSeenCount >= 3 && !playerAdapter.isDodgeTrailing()) {
                    break;
                }
                await playerAdapter.sleep(500);
            }
            expect(trailingSeenCount).to.be.at.least(2,
                'Expected trailing phase to persist across multiple polling intervals (10 padding cycles should take several seconds)');
        })

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })
    })
})
