import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai'
import {checkIsPlaying, checkIsProgressing, checkNoCriticalErrors, initializeDashJsAdapter} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.VIDEO.SWITCH;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} -${mpd}`, () => {

        let playerAdapter;

        before(() => {
            playerAdapter = initializeDashJsAdapter(item, mpd);
        })

        after(() => {
            playerAdapter.destroy();
        })

        it(`Checking playing state`, async () => {
            await checkIsPlaying(playerAdapter, true)
        })

        it(`Checking progressing state`, async () => {
            await checkIsProgressing(playerAdapter)
        });


        it(`Switch video tracks`, async () => {
            const availableTracks = playerAdapter.getTracksFor(Constants.DASH_JS.MEDIA_TYPES.VIDEO);
            for (let i = 0; i < availableTracks.length; i++) {
                const track = availableTracks[i];

                playerAdapter.setCurrentTrack(track);

                const currentTrack = playerAdapter.getCurrentTrackFor(Constants.DASH_JS.MEDIA_TYPES.VIDEO);
                expect(currentTrack.type).to.be.equal(Constants.DASH_JS.MEDIA_TYPES.VIDEO);
                expect(currentTrack.codec).to.be.equal(track.codec);

                await checkIsProgressing(playerAdapter)
            }
        });

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter)
        })
    })
})
