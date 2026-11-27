/**
 * Checks that the cues of an embedded (CEA-608) or non-fragmented text track are kept when switching to a
 * fragmented track and back. Their data is not loaded again, so cues deleted on the switch would be lost.
 */
import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai';
import {checkIsPlaying, checkIsProgressing, checkNoCriticalErrors, initializeDashJsAdapter} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.TEXT.SWITCH_KEEPS_CUES;

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
            await checkIsPlaying(playerAdapter, true);
        })

        it(`Checking progressing state`, async () => {
            await checkIsProgressing(playerAdapter);
        });

        it(`Keeps the cues of a not reloadable track when switching to a fragmented track and back`, async function () {
            const textTracks = playerAdapter.getTracksFor(Constants.DASH_JS.MEDIA_TYPES.TEXT);
            const keptTrackIndex = textTracks.findIndex((track) => track.isEmbedded || !track.isFragmented);
            const fragmentedTrackIndex = textTracks.findIndex((track) => track.isFragmented && !track.isEmbedded);
            if (keptTrackIndex < 0 || fragmentedTrackIndex < 0) {
                this.skip();
            }

            const cueRange = Constants.TEST_INPUTS.TEXT_CUES.CUE_RANGE;
            playerAdapter.setTextTrack(keptTrackIndex);
            const startTime = playerAdapter.getVideoElementTime();
            const hadCues = await playerAdapter.waitForShowingTextTrackCuesInRange(
                Constants.TEST_TIMEOUT_THRESHOLDS.TEXT_CUES_AFTER_SEEK, startTime, startTime + cueRange);
            if (!hadCues) {
                // The content has no subtitles at this position, nothing to compare against
                this.skip();
            }

            playerAdapter.setTextTrack(fragmentedTrackIndex);
            await playerAdapter.sleep(Constants.TEST_INPUTS.TEXT_CUES.WAIT_ON_OTHER_TRACK);
            playerAdapter.setTextTrack(keptTrackIndex);

            const switchBackTime = playerAdapter.getVideoElementTime();
            const switchBackTimeout = Constants.TEST_TIMEOUT_THRESHOLDS.TEXT_CUES_AFTER_SWITCH_BACK;
            const hasCues = await playerAdapter.waitForShowingTextTrackCuesInRange(switchBackTimeout, switchBackTime,
                switchBackTime + cueRange);

            expect(hasCues, `expected cues of track ${textTracks[keptTrackIndex].id} in ` +
                `[${switchBackTime}, ${switchBackTime + cueRange}] right after switching back`).to.be.true;
        });

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })
    })
})
