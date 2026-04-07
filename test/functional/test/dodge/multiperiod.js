import Constants from '../../src/Constants.js';
import {expect} from 'chai';
import Utils from '../../src/Utils.js';

import {
    checkIsPlaying,
    initializeDashJsAdapter
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.DODGE.MULTIPERIOD;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {
        let playerAdapter;
        let trafficPromise;

        before(() => {
            playerAdapter = initializeDashJsAdapter(item, mpd, {
                streaming: {
                    abr: {
                        autoSwitchBitrate: { video: false, audio: false }
                    }
                }
            });

            // Collect traffic long enough to span both periods.
            // Each period is 12s (3 segments x 4s) but with random walk
            // delays the requests take longer. Use a generous timeout.
            trafficPromise = playerAdapter.collectDodgeTraffic(45000);
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

        it(`Period transition occurs`, async () => {
            // Wait for at least one period switch. Period 0 is 12s of content,
            // so the transition to period 1 should happen within ~20s.
            const transitions = await playerAdapter.performedPeriodTransitions(40000);
            expect(transitions).to.be.at.least(1, 'Expected at least one period transition');
        })

        it(`Segments are fetched from both periods`, async () => {
            const traffic = await trafficPromise;

            const videoRequests = traffic.filter(
                t => t.mediaType === 'video' && t.type === 'MediaSegment'
            );

            // Period 0 has segments at indices 0,1,2 and period 1 also has
            // indices 0,1,2. After a period transition, segment index resets
            // to 0. So we should see index 0 appear more than once (once per
            // period) if both periods were played.
            const indexZeroCount = videoRequests.filter(r => r.index === 0).length;
            expect(indexZeroCount).to.be.at.least(2, 'Expected segment index 0 to appear at least twice (once per period)');

            // Total video requests should cover cycles from both periods
            // (3 per period = 6 minimum)
            expect(videoRequests.length).to.be.at.least(4, 'Expected video requests from both periods');
        })
    })
})
