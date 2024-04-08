import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai'
import {
    checkIsPlaying,
    checkIsProgressing,
    checkNoCriticalErrors,
    initializeDashJsAdapter
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.AUDIO.INITIAL;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {

        let playerAdapter;
        let availableAudioTracks;

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
            availableAudioTracks = playerAdapter.getTracksFor(Constants.DASH_JS.MEDIA_TYPES.AUDIO);

            for (let i = 0; i < availableAudioTracks.length; i++) {
                const track = availableAudioTracks[i];
                playerAdapter.destroy();
                playerAdapter = initializeDashJsAdapter(item, mpd)
                playerAdapter.setInitialMediaSettingsFor(Constants.DASH_JS.MEDIA_TYPES.AUDIO, {
                    lang: track.lang
                })
                await checkIsProgressing(playerAdapter);
                const currentTrack = playerAdapter.getCurrentTrackFor(Constants.DASH_JS.MEDIA_TYPES.AUDIO);
                expect(currentTrack.lang).to.be.equal(track.lang);
            }
        });

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })
    })
})
