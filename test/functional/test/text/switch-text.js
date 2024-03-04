import DashJsAdapter from '../../adapter/DashJsAdapter.js';
import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai'

const TESTCASE = Constants.TESTCASES.SIMPLE.SWITCH_TEXT;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`Simple - Switch text - ${item.name} - ${mpd}`, () => {

        let playerAdapter;

        before(() => {
            playerAdapter = new DashJsAdapter();
            playerAdapter.init(true);
            playerAdapter.setDrmData(item.drm);
            playerAdapter.attachSource(mpd);
        })

        after(() => {
            playerAdapter.destroy();
        })

        it(`Checking playing state`, async () => {
            const isPlaying = await playerAdapter.isInPlayingState(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PLAYING);
            expect(isPlaying).to.be.true;
        })

        it(`Checking progressing state`, async () => {
            const isProgressing = await playerAdapter.isProgressing(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PROGRESSING, Constants.TEST_INPUTS.GENERAL.MINIMUM_PROGRESS_WHEN_PLAYING);
            expect(isProgressing).to.be.true;
        });

        it(`Switch texttracks`, async () => {
            const availableTracks = playerAdapter.getTracksFor(Constants.DASH_JS.MEDIA_TYPES.TEXT);
            for (let i = 0; i < availableTracks.length; i++) {
                const track = availableTracks[i];

                playerAdapter.setTextTrack(i);

                const currentTrack = playerAdapter.getCurrentTrackFor(Constants.DASH_JS.MEDIA_TYPES.TEXT);
                expect(currentTrack.lang).to.be.equal(track.lang);
                expect(currentTrack.index).to.be.equal(track.index);

                const isProgressing = await playerAdapter.isProgressing(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PROGRESSING, Constants.TEST_INPUTS.GENERAL.MINIMUM_PROGRESS_WHEN_PLAYING);
                expect(isProgressing).to.be.true;
            }
        });

        it(`on/off/on`, async () => {
            const availableTracks = playerAdapter.getTracksFor(Constants.DASH_JS.MEDIA_TYPES.TEXT);
            if (availableTracks && availableTracks.length > 0) {
                const targetTrack = availableTracks[0];

                playerAdapter.setCurrentTrack(targetTrack);
                let currentTrack = playerAdapter.getCurrentTrackFor(Constants.DASH_JS.MEDIA_TYPES.TEXT);
                expect(currentTrack.lang).to.be.equal(targetTrack.lang);
                expect(currentTrack.index).to.be.equal(targetTrack.index);
                let isProgressing = await playerAdapter.isProgressing(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PROGRESSING, Constants.TEST_INPUTS.GENERAL.MINIMUM_PROGRESS_WHEN_PLAYING);
                expect(isProgressing).to.be.true;

                playerAdapter.setTextTrack(-1);
                const currentIndex = playerAdapter.getCurrentTextTrackIndex();
                expect(currentIndex).to.be.equal(-1);

                playerAdapter.setCurrentTrack(targetTrack);
                currentTrack = playerAdapter.getCurrentTrackFor(Constants.DASH_JS.MEDIA_TYPES.TEXT);
                expect(currentTrack.lang).to.be.equal(targetTrack.lang);
                expect(currentTrack.index).to.be.equal(targetTrack.index);
                isProgressing = await playerAdapter.isProgressing(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PROGRESSING, Constants.TEST_INPUTS.GENERAL.MINIMUM_PROGRESS_WHEN_PLAYING);
                expect(isProgressing).to.be.true;
            }
        });

        it(`Expect no critical errors to be thrown`, () => {
            const logEvents = playerAdapter.getLogEvents();
            expect(logEvents[dashjs.Debug.LOG_LEVEL_ERROR]).to.be.empty;
        })
    })
})
