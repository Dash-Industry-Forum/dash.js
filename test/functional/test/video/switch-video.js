import DashJsAdapter from '../../adapter/DashJsAdapter.js';
import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai'

const TESTCASE_CATEGORY = Constants.TESTCASES.CATEGORIES.VIDEO;
const TESTCASE = Constants.TESTCASES.VIDEO.SWITCH;

Utils.getTestvectorsForTestcase(TESTCASE_CATEGORY, TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} -${mpd}`, () => {

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
