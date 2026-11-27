/**
 * Checks that subtitles are shown again after seeking back into a range whose buffer and cues have been pruned.
 */
import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai';
import {
    checkIsPlaying,
    checkIsProgressing,
    checkNoCriticalErrors,
    checkTimeWithinThreshold,
    initializeDashJsAdapter
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.TEXT.SEEK_BACK;
const BUFFER_CLEARED = 'bufferCleared';
const PLAYBACK_SEEKED = 'playbackSeeked';

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {

        let playerAdapter;
        let bufferClearedEvents = [];
        const onBufferCleared = (e) => {
            bufferClearedEvents.push(e);
        };

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
            playerAdapter.registerEvent(BUFFER_CLEARED, onBufferCleared);
        })

        after(() => {
            playerAdapter.unregisterEvent(BUFFER_CLEARED, onBufferCleared);
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
            const currentTrack = textTracks[playerAdapter.getCurrentTextTrackIndex()];
            // Embedded captions are removed with the video buffer, fragmented subtitles with the text buffer
            const prunedMediaType = currentTrack.isEmbedded ? Constants.DASH_JS.MEDIA_TYPES.VIDEO :
                Constants.DASH_JS.MEDIA_TYPES.TEXT;

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

            // Play until the buffer holding the reference range has been removed
            bufferClearedEvents = [];
            await playerAdapter.sleep(Constants.TEST_INPUTS.TEXT_CUES.PLAY_UNTIL_PRUNED);
            const isReferenceRangePruned = bufferClearedEvents.some((e) => {
                return e.mediaType === prunedMediaType && e.from <= referenceTime && e.to >= referenceTime + cueRange;
            });
            if (!isReferenceRangePruned) {
                // Nothing to restore, e.g. the text of static streams is not pruned
                this.skip();
            }

            const seekedPromise = playerAdapter.waitForEvent(Constants.TEST_TIMEOUT_THRESHOLDS.EVENT_WAITING_TIME,
                PLAYBACK_SEEKED);
            playerAdapter.seekToPresentationTime(referenceTime);
            expect(await seekedPromise, 'expected the seek back to complete').to.be.true;
            checkTimeWithinThreshold(playerAdapter, referenceTime,
                Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE + cueRange);

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
