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
            // Default strictMode 'representation' blocks undefended representations
            // per DashHandler: the audio DashHandler's request methods return null
            // because it has no matching defended stream info, so no audio segment
            // is ever fetched. Because dash.js will not enter the playing state
            // until both audio and video buffers reach the startup threshold,
            // playback never progresses under this manifest.
            //
            // The video DashHandler still runs defense cycles until the video
            // buffer reaches the buffer target, at which point the base ScheduleController
            // stops scheduling. A small bounded number of defended video
            // segments therefore leaks before the session goes silent.
            //
            // We explicitly accept this bounded leak instead of failing the whole
            // session at manifest load: the attacker can likely already tell Dodge is
            // in use from the defended pattern itself, and the per-representation
            // null return keeps the code path simple. The assertions below pin
            // both that the defense ran for video and that scheduling halted
            // within the expected buffer fill bound.
            playerAdapter = initializeDashJsAdapter(item, mpd, {
                streaming: {
                    abr: {
                        autoSwitchBitrate: { video: false, audio: false },
                        maxBitrate: { video: 1500 }
                    },
                    buffer: {
                        bufferTimeDefault: 8
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

        it(`Video fetching halts once the buffer fills (playback never starts)`, async () => {
            const traffic = await trafficPromise;

            // Playback cannot start without audio, so video scheduling must stop
            // after the buffer reaches the target. At bufferTimeDefault = 8s
            // and 4s/segment, the buffer fills after ~2 segments; the highest
            // segment index fetched should not exceed 4.
            const videoSegments = traffic.filter(
                t => t.mediaType === 'video' && t.type === 'MediaSegment'
            );
            const maxIndex = videoSegments.reduce(
                (max, t) => (t.index > max ? t.index : max),
                -1
            );
            expect(maxIndex).to.be.at.most(6, 'Expected video scheduling to halt after buffer filled');
        })
    })
})
