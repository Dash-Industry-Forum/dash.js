import DashJsAdapter from '../../adapter/DashJsAdapter.js';
import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai'

const TESTCASE = Constants.TESTCASES.PLAYBACK.MPD_ANCHOR;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {

        let playerAdapter;

        before(function () {
            playerAdapter = new DashJsAdapter();
            playerAdapter.init(true);
            playerAdapter.setDrmData(item.drm);
        })

        after(() => {
            playerAdapter.destroy();
        })

        it(`Attach with #t and expect current time to correspond`, async function () {
            if (item.type === Constants.CONTENT_TYPES.LIVE) {
                this.skip();
            }

            playerAdapter.attachSource(mpd);

            let metadataLoaded = await playerAdapter.waitForEvent(Constants.TEST_TIMEOUT_THRESHOLDS.EVENT_WAITING_TIME, dashjs.MediaPlayer.events.PLAYBACK_METADATA_LOADED);
            expect(metadataLoaded).to.be.true;

            let startTime = playerAdapter.generateValidStartPosition();
            startTime -= Constants.TEST_INPUTS.MPD_ANCHOR.VOD_RANDOM_SUBTRACT_OFFSET;
            startTime = Math.max(startTime, 0);
            playerAdapter.attachSource(`${mpd}#t=${startTime}`);

            let seeked = await playerAdapter.waitForEvent(Constants.TEST_TIMEOUT_THRESHOLDS.EVENT_WAITING_TIME, dashjs.MediaPlayer.events.PLAYBACK_SEEKED);
            expect(seeked).to.be.true;

            const timeIsWithinThreshold = playerAdapter.timeIsWithinThreshold(startTime, Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE);
            expect(timeIsWithinThreshold).to.be.true;
        });

        it(`Attach with #posix and expect live delay to correspond`, async function (){
            if (item.type === Constants.CONTENT_TYPES.VOD) {
                this.skip();
            }

            const starttime = new Date().getTime() / 1000 - Constants.TEST_INPUTS.MPD_ANCHOR.LIVE_RANDOM_POSIX_DELAY;
            playerAdapter.attachSource(`${mpd}#t=posix:${starttime}`); /* start from UTC time */

            const isPlaying = await playerAdapter.isInPlayingState(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PLAYING);
            expect(isPlaying).to.be.true;

            const isProgressing = await playerAdapter.isProgressing(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PROGRESSING, Constants.TEST_INPUTS.GENERAL.MINIMUM_PROGRESS_WHEN_PLAYING);
            expect(isProgressing).to.be.true;

            const liveDelay = playerAdapter.getCurrentLiveLatency();
            expect(liveDelay).to.be.at.least(Constants.TEST_INPUTS.MPD_ANCHOR.LIVE_RANDOM_POSIX_DELAY - Constants.TEST_INPUTS.MPD_ANCHOR.LIVE_TOLERANCE);
            expect(liveDelay).to.be.below(Constants.TEST_INPUTS.MPD_ANCHOR.LIVE_RANDOM_POSIX_DELAY + Constants.TEST_INPUTS.MPD_ANCHOR.LIVE_TOLERANCE);
        })

        it(`Expect no critical errors to be thrown`, () => {
            const logEvents = playerAdapter.getLogEvents();
            expect(logEvents[dashjs.Debug.LOG_LEVEL_ERROR]).to.be.empty;
        })
    })
})
