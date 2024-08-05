import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import { expect } from '@esm-bundle/chai';
import {checkIsPlaying, checkIsProgressing, checkNoCriticalErrors, initializeDashJsAdapter} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.TEXT.SWITCH;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {

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

        it(`Switch texttracks`, async () => {
            const availableTracks = playerAdapter.getTracksFor(Constants.DASH_JS.MEDIA_TYPES.TEXT);
            for (let i = 0; i < availableTracks.length; i++) {
                const track = availableTracks[i];

                playerAdapter.setTextTrack(i);

                const currentTrack = playerAdapter.getCurrentTrackFor(Constants.DASH_JS.MEDIA_TYPES.TEXT);
                expect(currentTrack.lang).to.be.equal(track.lang);
                expect(currentTrack.index).to.be.equal(track.index);

                await checkIsProgressing(playerAdapter)
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
                await checkIsProgressing(playerAdapter)

                playerAdapter.setTextTrack(-1);
                const currentIndex = playerAdapter.getCurrentTextTrackIndex();
                expect(currentIndex).to.be.equal(-1);

                playerAdapter.setCurrentTrack(targetTrack);
                currentTrack = playerAdapter.getCurrentTrackFor(Constants.DASH_JS.MEDIA_TYPES.TEXT);
                expect(currentTrack.lang).to.be.equal(targetTrack.lang);
                expect(currentTrack.index).to.be.equal(targetTrack.index);
                await checkIsProgressing(playerAdapter)
            }
        });

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter)
        })
    })
})
