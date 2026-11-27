/**
 * Checks that subtitles are shown again after seeking back into a range whose buffer and cues have been pruned.
 */
import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai';
import {checkIsPlaying, checkIsProgressing, checkNoCriticalErrors, initializeDashJsAdapter} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.TEXT.SEEK_BACK;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {

        let playerAdapter;

        before(() => {
            const settings = {
                streaming: {
                    buffer: {
                        bufferToKeep: Constants.TEST_INPUTS.TEXT_CUES.BUFFER_TO_KEEP,
                        bufferPruningInterval: Constants.TEST_INPUTS.TEXT_CUES.BUFFER_PRUNING_INTERVAL
                    }
                }
            };
            playerAdapter = initializeDashJsAdapter(item, mpd, settings);
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

        it(`Shows subtitles after seeking back into a pruned range`, async function () {
            const textTracks = playerAdapter.getTracksFor(Constants.DASH_JS.MEDIA_TYPES.TEXT);
            if (textTracks.length === 0) {
                this.skip();
            }
            if (playerAdapter.getCurrentTextTrackIndex() < 0) {
                playerAdapter.setTextTrack(0);
            }

            const cueRange = Constants.TEST_INPUTS.TEXT_CUES.CUE_RANGE;
            const requiredPlaybackTime = (Constants.TEST_INPUTS.TEXT_CUES.WAIT_BEFORE_REFERENCE +
                Constants.TEST_INPUTS.TEXT_CUES.PLAY_UNTIL_PRUNED) / 1000 + cueRange;
            if (!playerAdapter.isDynamic() &&
                playerAdapter.getDuration() - playerAdapter.getVideoElementTime() < requiredPlaybackTime) {
                // The content ends before the reference range can be pruned
                this.skip();
            }
            await playerAdapter.sleep(Constants.TEST_INPUTS.TEXT_CUES.WAIT_BEFORE_REFERENCE);
            const referenceTime = playerAdapter.getVideoElementTime();
            const cueTimeout = Constants.TEST_TIMEOUT_THRESHOLDS.TEXT_CUES_AFTER_SEEK;
            const hadCues = await playerAdapter.waitForShowingTextTrackCuesInRange(cueTimeout, referenceTime,
                referenceTime + cueRange);
            if (!hadCues) {
                // The content has no subtitles at this position, nothing to compare against
                this.skip();
            }

            // Play until the reference range is behind bufferToKeep and has been pruned
            await playerAdapter.sleep(Constants.TEST_INPUTS.TEXT_CUES.PLAY_UNTIL_PRUNED);
            expect(playerAdapter.getVideoElementTime() - (referenceTime + cueRange),
                'expected the reference range to be behind bufferToKeep')
                .to.be.above(Constants.TEST_INPUTS.TEXT_CUES.BUFFER_TO_KEEP);

            playerAdapter.seekToPresentationTime(referenceTime);
            const hasCues = await playerAdapter.waitForShowingTextTrackCuesInRange(cueTimeout, referenceTime,
                referenceTime + cueRange);

            expect(hasCues, `expected cues in [${referenceTime}, ${referenceTime + cueRange}] after seeking back, ` +
                `currentTime is ${playerAdapter.getVideoElementTime()}`).to.be.true;
        });

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })
    })
})
