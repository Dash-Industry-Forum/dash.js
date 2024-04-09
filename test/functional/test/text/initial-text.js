import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai'
import {
    checkIsPlaying,
    checkIsProgressing,
    checkNoCriticalErrors,
    initializeDashJsAdapter
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.TEXT.INITIAL;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {

        let playerAdapter;
        let availableTextTracks;

        before(() => {
            playerAdapter = initializeDashJsAdapter(item, mpd);
        })

        after(() => {
            playerAdapter.destroy();
        })

        it(`Checking playing state`, async () => {
            await checkIsPlaying(playerAdapter, true);
        })

        it(`Checking progressing state`, async () => {
            await checkIsProgressing(playerAdapter);
        });

        it(`Set initial audio track`, async () => {
            availableTextTracks = playerAdapter.getTracksFor(Constants.DASH_JS.MEDIA_TYPES.TEXT);

            for (let i = 0; i < availableTextTracks.length; i++) {
                const track = availableTextTracks[i];
                playerAdapter.destroy();
                playerAdapter = initializeDashJsAdapter(item, mpd)
                playerAdapter.setInitialMediaSettingsFor(Constants.DASH_JS.MEDIA_TYPES.TEXT, {
                    lang: track.lang,
                    role: track.role
                })
                await checkIsProgressing(playerAdapter);
                const currentTrack = playerAdapter.getCurrentTrackFor(Constants.DASH_JS.MEDIA_TYPES.TEXT);
                expect(currentTrack.lang).to.be.equal(track.lang);
                expect(currentTrack.role).to.be.equal(track.role);
            }
        });

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })
    })
})
