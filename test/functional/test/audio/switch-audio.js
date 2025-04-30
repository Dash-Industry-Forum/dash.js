import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai'
import {checkIsPlaying, checkIsProgressing, checkNoCriticalErrors, initializeDashJsAdapter} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.AUDIO.SWITCH;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`Simple - Switch audio - ${item.name} - ${mpd}`, () => {

        let playerAdapter;

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

        it(`Switch audio languages`, async () => {
            const availableAudioTracks = playerAdapter.getTracksFor(Constants.DASH_JS.MEDIA_TYPES.AUDIO);
            for (let i = 0; i < availableAudioTracks.length; i++) {
                const track = availableAudioTracks[i];

                playerAdapter.setCurrentTrack(track);

                const currentTrack = playerAdapter.getCurrentTrackFor(Constants.DASH_JS.MEDIA_TYPES.AUDIO);
                expect(currentTrack.lang).to.be.equal(track.lang);
                expect(currentTrack.bitrateList.bandwidth).to.be.equal(track.bitrateList.bandwidth);

                await checkIsProgressing(playerAdapter);
                await playerAdapter.sleep(500);
            }
        });

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })
    })
})
