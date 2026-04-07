import Constants from '../../src/Constants.js';
import {expect} from 'chai';
import Utils from '../../src/Utils.js';

import {
    initializeDashJsAdapter,
    playForDuration
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.DODGE.REPRESENTATION_STRICT_MODE;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {
        let playerAdapter;
        let trafficPromise;

        before(async () => {
            // Default strictMode 'representation' blocks undefended representations.
            // This manifest has no audio defense, so audio should be blocked.
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

            await playForDuration(10000);
        })

        after(() => {
            if (playerAdapter) {
                playerAdapter.destroy();
            }
        })

        it(`Video defense is active`, () => {
            const isActive = playerAdapter.isDodgeActive();
            expect(isActive).to.be.true;
        })

        it(`No audio segment requests are made (undefended audio blocked)`, async () => {
            const traffic = await trafficPromise;

            // With no audio stream entry in the extended manifest, strict mode
            // should prevent audio segment requests entirely.
            const audioRequests = traffic.filter(
                t => t.mediaType === 'audio' && t.type === 'MediaSegment'
            );
            expect(audioRequests.length).to.equal(0, 'Expected no audio media segment requests (undefended audio should be blocked)');
        })

        it(`Video segments are fetched normally`, async () => {
            const traffic = await trafficPromise;

            const videoRequests = traffic.filter(
                t => t.mediaType === 'video' && t.type === 'MediaSegment'
            );
            expect(videoRequests.length).to.be.above(0, 'Expected video segments to be fetched');
        })
    })
})
