import DashJsAdapter from '../../adapter/DashJsAdapter';
import Constants from '../../helper/Constants';
import Utils from '../../helper/Utils';
import {expect} from 'chai'

const TESTCASE = Constants.TESTCASES.SIMPLE.SWITCH_VIDEO;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`Simple - Switch video - ${item.name} -${mpd}`, () => {

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

        it(`Switch video track`, async () => {
            const availableTracks = playerAdapter.getTracksFor(Constants.DASH_JS.MEDIA_TYPES.VIDEO);
            for (let i = 0; i < availableTracks.length; i++) {
                const track = availableTracks[i];

                playerAdapter.setCurrentTrack(track);

                const currentTrack = playerAdapter.getCurrentTrackFor(Constants.DASH_JS.MEDIA_TYPES.VIDEO);
                expect(currentTrack.type).to.be.equal(Constants.DASH_JS.MEDIA_TYPES.VIDEO);
                expect(currentTrack.codec).to.be.equal(track.codec);

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
