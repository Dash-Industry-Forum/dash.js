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
            if (playerAdapter) {
                playerAdapter.destroy();
            }
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
                    lang: track.lang,
                    index: track.index
                })
                await checkIsProgressing(playerAdapter);
                const currentTrack = playerAdapter.getCurrentTrackFor(Constants.DASH_JS.MEDIA_TYPES.AUDIO);
                expect(currentTrack.lang).to.be.equal(track.lang);
                expect(currentTrack.index).to.be.equal(track.index);
            }
        });

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })
    })
})
