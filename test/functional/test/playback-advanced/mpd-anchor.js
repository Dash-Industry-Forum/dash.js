import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai'
import {
    checkIsPlaying,
    checkIsProgressing,
    checkLiveDelay,
    checkNoCriticalErrors, checkTimeWithinThreshold,
    initializeDashJsAdapter
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.PLAYBACK_ADVANCED.MPD_ANCHOR;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {

        let playerAdapter;

        before(function () {
            playerAdapter = initializeDashJsAdapter(item, mpd);
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

            checkTimeWithinThreshold(playerAdapter, startTime, Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE);
        });

        it(`Attach with #posix and expect live delay to correspond`, async function () {
            if (item.type === Constants.CONTENT_TYPES.VOD) {
                this.skip();
            }

            const starttime = new Date().getTime() / 1000 - Constants.TEST_INPUTS.MPD_ANCHOR.LIVE_RANDOM_POSIX_DELAY;
            playerAdapter.attachSource(`${mpd}#t=posix:${starttime}`); /* start from UTC time */

            await checkIsPlaying(playerAdapter, true);
            await checkIsProgressing(playerAdapter);
            checkLiveDelay(playerAdapter, Constants.TEST_INPUTS.MPD_ANCHOR.LIVE_RANDOM_POSIX_DELAY - Constants.TEST_INPUTS.MPD_ANCHOR.LIVE_TOLERANCE, Constants.TEST_INPUTS.MPD_ANCHOR.LIVE_RANDOM_POSIX_DELAY + Constants.TEST_INPUTS.MPD_ANCHOR.LIVE_TOLERANCE)
        })

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter)
        })
    })
})
