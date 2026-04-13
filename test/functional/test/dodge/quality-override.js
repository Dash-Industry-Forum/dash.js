import Constants from '../../src/Constants.js';
import {expect} from 'chai';
import Utils from '../../src/Utils.js';

import {
    checkIsPlaying,
    checkIsProgressing,
    checkNoCriticalErrors,
    initializeDashJsAdapter
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.DODGE.QUALITY_OVERRIDE;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {
        let playerAdapter;
        let extendedManifest;
        let trafficPromise;

        before(async () => {
            const response = await fetch(mpd);
            extendedManifest = await response.json();

            playerAdapter = initializeDashJsAdapter(item, mpd, {
                streaming: {
                    cacheInitSegments: true
                },
                dodge: {
                    strictMode: false
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

        it(`Quality override cycles fetch from alternate representation`, async () => {
            const traffic = await trafficPromise;

            const videoRequests = traffic.filter(
                t => t.mediaType === 'video' && t.type === 'MediaSegment'
            );

            expect(videoRequests.length).to.be.at.least(3, 'Expected at least 3 video data cycle requests');

            // Find which representation the player selected by matching the
            // first request's representationId against manifest streams.
            const selectedRepId = videoRequests[0].representationId;
            expect(selectedRepId).to.be.a('string');

            const primaryStream = extendedManifest.streams.find(
                s => s.label === selectedRepId
            );
            expect(primaryStream, `No stream found for selected representation ${selectedRepId}`).to.not.be.undefined;

            // Verify that cycles with quality overrides fetch the alternate
            // rep's byte range and URL, while normal cycles match the primary.
            let overridesSeen = 0;
            for (let i = 0; i < videoRequests.length; i++) {
                const req = videoRequests[i];
                const cycle = primaryStream.data[i];
                if (!cycle) {
                    break;
                }

                if (cycle.quality) {
                    overridesSeen++;

                    // Range should match the alternate representation's segment
                    expect(req.range).to.equal(cycle.range, `Cycle ${i} (quality=${cycle.quality}): range should match alternate representation's segment`);

                    // URL should contain the alternate representation's ID
                    // since _resolveCycleRepresentation swaps the representation
                    // before URL template expansion.
                    const url = req.requestRef ? req.requestRef.url : req.url;
                    expect(url).to.include(cycle.quality, `Cycle ${i}: URL should reference alternate representation ${cycle.quality}`);
                } else if (cycle.range) {
                    // Normal cycle - range matches primary representation
                    expect(req.range).to.equal(cycle.range, `Cycle ${i}: range should match primary representation's segment`);
                }
            }

            expect(overridesSeen).to.be.at.least(1, 'Expected at least one quality override cycle to be verified');
        })

        it(`Playback progresses through quality override cycles`, async () => {
            await checkIsProgressing(playerAdapter);
        })

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })
    })
})
