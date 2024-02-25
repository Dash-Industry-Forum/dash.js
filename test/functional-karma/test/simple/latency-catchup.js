import DashJsAdapter from '../../adapter/DashJsAdapter.js';
import Constants from '../../helper/Constants.js';
import Utils from '../../helper/Utils.js';
import {expect} from 'chai'

const TESTCASE = Constants.TESTCASES.SIMPLE.LIVE_CATCHUP;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`Simple - Latency catchup - ${item.name} - ${mpd}`, () => {

        let playerAdapter;

        before(function () {
            playerAdapter = new DashJsAdapter();
            if (item.type === Constants.CONTENT_TYPES.VOD) {
                this.skip();
            }
            playerAdapter.init(true);
            playerAdapter.updateSettings({
                streaming: {
                    delay: {
                        liveDelay: Constants.TEST_INPUTS.LATENCY_CATCHUP.DELAY
                    },
                    liveCatchup: {
                        enabled: true
                    }
                }
            })
            playerAdapter.setDrmData(item.drm);
        })

        after(() => {
            playerAdapter.destroy();
        })


        it(`Attach source`, () => {
            playerAdapter.attachSource(mpd);
        })

        it(`Checking playing state`, async () => {
            const isPlaying = await playerAdapter.isInPlayingState(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PLAYING);
            expect(isPlaying).to.be.true;
        })

        it(`Checking progressing state`, async () => {
            const isProgressing = await playerAdapter.isProgressing(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PROGRESSING, Constants.TEST_INPUTS.GENERAL.MINIMUM_PROGRESS_WHEN_PLAYING);
            expect(isProgressing).to.be.true;
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
            const logEvents = playerAdapter.getLogEvents();
            expect(logEvents[dashjs.Debug.LOG_LEVEL_ERROR]).to.be.empty;
        })
    })
})
