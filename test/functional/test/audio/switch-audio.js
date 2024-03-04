import DashJsAdapter from '../../adapter/DashJsAdapter.js';
import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai'

const TESTCASE_CATEGORY = Constants.TESTCASES.CATEGORIES.AUDIO
const TESTCASE = Constants.TESTCASES.AUDIO.SWITCH;

Utils.getTestvectorsForTestcase(TESTCASE_CATEGORY, TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`Simple - Switch audio - ${item.name} - ${mpd}`, () => {

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

        it(`Switch audio languages`, async () => {
            const availableAudioTracks = playerAdapter.getTracksFor(Constants.DASH_JS.MEDIA_TYPES.AUDIO);
            for (let i = 0; i < availableAudioTracks.length; i++) {
                const track = availableAudioTracks[i];

                playerAdapter.setCurrentTrack(track);

                const currentTrack = playerAdapter.getCurrentTrackFor(Constants.DASH_JS.MEDIA_TYPES.AUDIO);
                expect(currentTrack.lang).to.be.equal(track.lang);
                expect(currentTrack.bitrateList.bandwidth).to.be.equal(track.bitrateList.bandwidth);

                const isProgressing = await playerAdapter.isProgressing(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PROGRESSING, Constants.TEST_INPUTS.GENERAL.MINIMUM_PROGRESS_WHEN_PLAYING);
                expect(isProgressing).to.be.true;
            }
        });

        it(`Expect no critical errors to be thrown`, () => {
            const logEvents = playerAdapter.getLogEvents();
            expect(logEvents[dashjs.Debug.LOG_LEVEL_ERROR]).to.be.empty;
        })
    })
})
