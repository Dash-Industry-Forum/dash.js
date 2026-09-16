import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai'
import {
    checkIsPlaying,
    checkIsProgressing,
    checkTimeWithinThresholdForDvrWindow,
    initializeDashJsAdapter,
    isLiveContent
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.PLAYBACK_ADVANCED.ATTACH_AT_NON_ZERO;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {

        let playerAdapter;

        before(() => {
            playerAdapter = initializeDashJsAdapter(item, mpd);
        })

        after(() => {
            playerAdapter.destroy();
        })

        it(`Attach null as start time and expect content to play from start`, async () => {
            playerAdapter.attachSource(mpd, null);

            await checkIsPlaying(playerAdapter, true);
            checkTimeWithinThresholdForDvrWindow(playerAdapter, 0, Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE);
            await checkIsProgressing(playerAdapter);
        })

        it(`Attach negative value as start time and expect content to play from start`, async () => {
            playerAdapter.attachSource(mpd, -10);

            await checkIsPlaying(playerAdapter, true);
            checkTimeWithinThresholdForDvrWindow(playerAdapter, 0, Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE);
            await checkIsProgressing(playerAdapter);
        })

        it(`Attach string as start time and expect content to play`, async () => {
            playerAdapter.attachSource(mpd, 'foobar');

            await checkIsPlaying(playerAdapter, true)
            checkTimeWithinThresholdForDvrWindow(playerAdapter, 0, Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE);
            await checkIsProgressing(playerAdapter);
        })

        it(`Attach with start time beyond duration and expect playback to end`, async function () {
            if (isLiveContent(item)) {
                this.skip();
            }

            // The start time is clamped to slightly before the end of the content, so playback ends after a short play-through
            const endedPromise = playerAdapter.waitForEvent(Constants.TEST_INPUTS.SEEK_ENDED.EVENT_WAITING_TIME, dashjs.MediaPlayer.events.PLAYBACK_ENDED);
            playerAdapter.attachSource(mpd, 999999999);
            const endedEventThrown = await endedPromise;
            expect(endedEventThrown).to.be.true;
        })

        for (let i = 0; i < Constants.TEST_INPUTS.ATTACH_AT_NON_ZERO.NUMBER_OF_RANDOM_ATTACHES; i++) {
            it(`Generate random start time and use in attachSource() call`, async () => {
                playerAdapter.attachSource(mpd);

                let metadataLoaded = await playerAdapter.waitForEvent(Constants.TEST_TIMEOUT_THRESHOLDS.EVENT_WAITING_TIME, dashjs.MediaPlayer.events.PLAYBACK_METADATA_LOADED);
                expect(metadataLoaded).to.be.true;

                let startTime = playerAdapter.generateValidStartPosition();
                startTime = playerAdapter.isDynamic() ? startTime - Constants.TEST_INPUTS.ATTACH_AT_NON_ZERO.LIVE_RANDOM_ATTACH_SUBTRACT_OFFSET : startTime - Constants.TEST_INPUTS.ATTACH_AT_NON_ZERO.VOD_RANDOM_ATTACH_SUBTRACT_OFFSET;
                startTime = Math.max(startTime, 0);
                playerAdapter.attachSource(mpd, startTime);
                playerAdapter.pause();
                let seeked = await playerAdapter.waitForEvent(Constants.TEST_TIMEOUT_THRESHOLDS.EVENT_WAITING_TIME, dashjs.MediaPlayer.events.PLAYBACK_SEEKED);
                expect(seeked).to.be.true;
                const targetTime = playerAdapter.isDynamic() ? startTime - playerAdapter.getDvrSeekOffset(0) : startTime;
                checkTimeWithinThresholdForDvrWindow(playerAdapter, targetTime, Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE);
            });
        }

    })
})
