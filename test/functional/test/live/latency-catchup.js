import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import { expect } from '@esm-bundle/chai';
import {checkIsPlaying, checkIsProgressing, checkNoCriticalErrors, initializeDashJsAdapter} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.LIVE.CATCHUP;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`Simple - Latency catchup - ${item.name} - ${mpd}`, () => {

        let playerAdapter;

        before(function () {
            if (item.type === Constants.CONTENT_TYPES.VOD) {
                this.skip();
            }
            const settings = {
                streaming: {
                    delay: {
                        liveDelay: Constants.TEST_INPUTS.LATENCY_CATCHUP.DELAY
                    },
                    liveCatchup: {
                        enabled: true
                    }
                }
            };
            playerAdapter = initializeDashJsAdapter(item, mpd, settings);
        })

        after(() => {
            if (playerAdapter) {
                playerAdapter.destroy();
            }
        })


        it(`Attach source`, () => {
            playerAdapter.attachSource(mpd);
        })

        it(`Checking playing state`, async () => {
            await checkIsPlaying(playerAdapter, true);
        })

        it(`Checking progressing state`, async () => {
            await checkIsProgressing(playerAdapter);
        });

        it(`Check if playback rate is adjusted`, async () => {
            const playbackRateChanged = await playerAdapter.waitForEvent(Constants.TEST_TIMEOUT_THRESHOLDS.EVENT_WAITING_TIME, dashjs.MediaPlayer.events.PLAYBACK_RATE_CHANGED)
            expect(playbackRateChanged).to.be.true;
        })

        it(`Checking if target live delay is reached`, async () => {
            const liveDelayReached = await playerAdapter.reachedTargetDelay(Constants.TEST_TIMEOUT_THRESHOLDS.TARGET_DELAY_REACHED, Constants.TEST_INPUTS.LATENCY_CATCHUP.DELAY, Constants.TEST_INPUTS.LATENCY_CATCHUP.TOLERANCE);
            expect(liveDelayReached).to.be.true;
        });

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })
    })
})
