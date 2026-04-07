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
        let periodTransitionPromise;

        before(() => {
            playerAdapter = initializeDashJsAdapter(item, mpd, {
                streaming: {
                    abr: {
                        autoSwitchBitrate: { video: false, audio: false }
                    }
                }
            });

            // Start both listeners concurrently in before() so neither
            // misses events that fire during the other's collection window.
            trafficPromise = playerAdapter.collectDodgeTraffic(45000);
            periodTransitionPromise = playerAdapter.performedPeriodTransitions(45000);
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
            const transitions = await periodTransitionPromise;
            expect(transitions).to.be.at.least(1, 'Expected at least one period transition');
        })

        it(`Segments are fetched from both periods`, async () => {
            const traffic = await trafficPromise;

            const videoRequests = traffic.filter(
                t => t.mediaType === 'video' && t.type === 'MediaSegment'
            );

            // Both periods use segment indices 0, 1, 2. After a period
            // transition the Dodge override resets and starts from cycle 0
            // of the period 1 stream. So we should see index 0 appear at
            // least twice (once per period) and the total count should
            // exceed a single period's 3 cycles.
            const indexZeroCount = videoRequests.filter(r => r.index === 0).length;
            expect(indexZeroCount).to.be.at.least(2, 'Expected segment index 0 at least twice (once per period)');
            expect(videoRequests.length).to.be.at.least(4, 'Expected video requests from both periods');
        })
    })
})
