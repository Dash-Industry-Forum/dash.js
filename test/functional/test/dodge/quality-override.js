import Constants from '../../src/Constants.js';
import {expect} from 'chai';
import Utils from '../../src/Utils.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';

import {
    checkIsPlaying,
    checkEventHasBeenTriggered,
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
                    abr: {
                        autoSwitchBitrate: {
                            video: false,
                            audio: false
                        }
                    }
                },
                dodge: {
                    strictMode: false
                }
            });

            trafficPromise = playerAdapter.collectDodgeTraffic(
                Constants.TEST_TIMEOUT_THRESHOLDS.DODGE_TRAFFIC_COLLECTION
            );

            playerAdapter.registerEvent(MediaPlayerEvents.PLAYBACK_ENDED);
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

            // Identify the home stream from the first home representation
            // request. A home request is one whose representationId matches a
            // stream entry AND whose range matches that stream's data[0].range.
            // This is robust to the player picking either of the defended
            // video representations at startup.
            const primaryStream = extendedManifest.streams.find(s =>
                s.label === videoRequests[0].representationId &&
                s.data[0] && s.data[0].range === videoRequests[0].range
            );
            expect(
                primaryStream,
                `videoRequests[0] (repId=${videoRequests[0].representationId}, range=${videoRequests[0].range}) does not match any stream's home cycle 0`
            ).to.not.be.undefined;

            // Walk the primary stream's data[] cycle-by-cycle and match each
            // against the corresponding recorded request. For override cycles,
            // check representationId + range + URL all reference the alt rep.
            let overridesSeen = 0;
            const cycleCount = Math.min(primaryStream.data.length, videoRequests.length);
            for (let i = 0; i < cycleCount; i++) {
                const req = videoRequests[i];
                const cycle = primaryStream.data[i];

                if (cycle.quality) {
                    overridesSeen++;

                    expect(req.representationId).to.equal(
                        cycle.quality,
                        `Cycle ${i}: request should target alternate representation ${cycle.quality} (got ${req.representationId})`
                    );
                    expect(req.range).to.equal(
                        cycle.range,
                        `Cycle ${i} (quality=${cycle.quality}): range should match the alternate representation's segment`
                    );

                    const url = req.requestRef ? req.requestRef.url : req.url;
                    expect(url).to.include(
                        cycle.quality,
                        `Cycle ${i}: URL should reference alternate representation ${cycle.quality}`
                    );
                } else {
                    expect(req.representationId).to.equal(
                        primaryStream.label,
                        `Cycle ${i}: home cycle should target primary representation ${primaryStream.label} (got ${req.representationId})`
                    );
                    if (cycle.range) {
                        expect(req.range).to.equal(
                            cycle.range,
                            `Cycle ${i}: range should match the primary representation's segment`
                        );
                    }
                }
            }

            expect(overridesSeen).to.be.at.least(1, 'Expected at least one quality override cycle to be verified');
        })

        it(`Playback completes past quality override segments`, () => {
            // The defense is only ~16s long (4 cycles x 4s) and PLAYBACK_ENDED
            // typically fires while the prior "Quality override ..." block is
            // still awaiting trafficPromise. Check the recorded event log
            // instead of attaching a fresh listener.
            checkEventHasBeenTriggered(playerAdapter, MediaPlayerEvents.PLAYBACK_ENDED);
        })

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })
    })
})
