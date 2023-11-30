import DashJsAdapter from '../../adapter/DashJsAdapter';
import Constants from '../../helper/Constants';
import Utils from '../../helper/Utils';
import {expect} from 'chai'

const TESTCASE = Constants.TESTCASES.SIMPLE.ATTACH_AT_NON_ZERO;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`Simple - Attach source non zero - ${item.name} - ${mpd}`, () => {

        let playerAdapter;

        before(() => {
            playerAdapter = new DashJsAdapter();
            playerAdapter.init(true);
            playerAdapter.setDrmData(item.drm);
        })

        after(() => {
            playerAdapter.destroy();
        })

        it(`Attach null as starttime and expect content to play from start`, async () => {
            playerAdapter.attachSource(mpd, null);

            const isPlaying = await playerAdapter.isInPlayingState(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PLAYING);
            expect(isPlaying).to.be.true;

            const timeIsWithinThreshold = playerAdapter.timeIsWithinThreshold(0, Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE);
            expect(timeIsWithinThreshold).to.be.true;

            const isProgressing = await playerAdapter.isProgressing(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PROGRESSING, Constants.TEST_INPUTS.GENERAL.MINIMUM_PROGRESS_WHEN_PLAYING);
            expect(isProgressing).to.be.true;
        })

        it(`Attach negative value as starttime and expect content to play from start`, async () => {
            playerAdapter.attachSource(mpd, -10);

            const isPlaying = await playerAdapter.isInPlayingState(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PLAYING);
            expect(isPlaying).to.be.true;

            const timeIsWithinThreshold = playerAdapter.timeIsWithinThreshold(0, Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE);
            expect(timeIsWithinThreshold).to.be.true;

            const isProgressing = await playerAdapter.isProgressing(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PROGRESSING, Constants.TEST_INPUTS.GENERAL.MINIMUM_PROGRESS_WHEN_PLAYING);
            expect(isProgressing).to.be.true;
        })

        it(`Attach string as starttime and expect content to play`, async () => {
            playerAdapter.attachSource(mpd, 'foobar');

            const isPlaying = await playerAdapter.isInPlayingState(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PLAYING);
            expect(isPlaying).to.be.true;

            const timeIsWithinThreshold = playerAdapter.timeIsWithinThreshold(0, Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE);
            expect(timeIsWithinThreshold).to.be.true;

            const isProgressing = await playerAdapter.isProgressing(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PROGRESSING, Constants.TEST_INPUTS.GENERAL.MINIMUM_PROGRESS_WHEN_PLAYING);
            expect(isProgressing).to.be.true;
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

                let seeked = await playerAdapter.waitForEvent(Constants.TEST_TIMEOUT_THRESHOLDS.EVENT_WAITING_TIME, dashjs.MediaPlayer.events.PLAYBACK_SEEKED);
                expect(seeked).to.be.true;

                const targetTime = playerAdapter.isDynamic() ? startTime - playerAdapter.getDvrSeekOffset(0) : startTime;
                const timeIsWithinThreshold = playerAdapter.timeIsWithinThreshold(targetTime, Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE);
                expect(timeIsWithinThreshold).to.be.true;
            });
        }

    })
})
