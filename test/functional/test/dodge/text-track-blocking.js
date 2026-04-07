import Constants from '../../src/Constants.js';
import {expect} from 'chai';
import Utils from '../../src/Utils.js';

import {
    checkIsPlaying,
    initializeDashJsAdapter
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.DODGE.TEXT_TRACK_BLOCKING;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {
        let playerAdapter;
        let trafficPromise;

        before(() => {
            // Default strictMode 'representation' blocks undefended text tracks
            playerAdapter = initializeDashJsAdapter(item, mpd, {
                streaming: {
                    abr: {
                        autoSwitchBitrate: { video: false, audio: false }
                    }
                }
            });

            trafficPromise = playerAdapter.collectDodgeTraffic(
                Constants.TEST_TIMEOUT_THRESHOLDS.DODGE_TRAFFIC_COLLECTION
            );
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

        it(`No text segment requests are made`, async () => {
            const traffic = await trafficPromise;

            // The text track has no defense entry. In strict mode,
            // the text StreamProcessor should not fetch any segments.
            const textRequests = traffic.filter(t => t.mediaType === 'text');
            expect(textRequests.length).to.equal(0, 'Expected no text segment requests (undefended text should be blocked by strict mode)');
        })
    })
})
