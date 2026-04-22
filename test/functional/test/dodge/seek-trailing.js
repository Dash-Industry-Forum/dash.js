import Constants from '../../src/Constants.js';
import {expect} from 'chai';
import Utils from '../../src/Utils.js';

import {
    checkIsPlaying,
    checkIsProgressing,
    checkNoCriticalErrors,
    initializeDashJsAdapter
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.DODGE.SEEK_TRAILING;

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

        it(`Seek backward during trailing does not crash`, async () => {
            playerAdapter.seek(0);
            await playerAdapter.sleep(2000);
            expect(playerAdapter.isDodgeActive()).to.be.true;
        })

        it(`Buffer level is non-negative after seek during trailing`, () => {
            const videoBuffer = playerAdapter.getBufferLengthByType('video');
            expect(videoBuffer).to.be.a('number');
            expect(videoBuffer).to.be.at.least(0);
        })

        it(`Playback progresses after seek`, async () => {
            // PLAYBACK_ENDED fires during trailing once isLastSegmentRequested
            // returns true and the playable buffer drains; PlaybackController
            // then pauses the video element. Seeking backward moves currentTime
            // but leaves the element paused, so timeupdate never fires and the
            // progression check would time out. Explicitly resume playback.
            playerAdapter.play();
            await checkIsProgressing(playerAdapter);
        })

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })
    })
})
