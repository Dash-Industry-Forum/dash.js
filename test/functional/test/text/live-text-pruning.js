/**
 * Checks that the text buffer of live streams is pruned like audio and video, so that parsed cues do not
 * accumulate for as long as playback runs.
 */
import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai';
import {checkIsPlaying, checkIsProgressing, checkNoCriticalErrors, initializeDashJsAdapter} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.TEXT.LIVE_PRUNING;
const BUFFER_CLEARED = 'bufferCleared';

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {

        let playerAdapter;
        let textBufferClearedEvents = [];
        const onBufferCleared = (e) => {
            if (e.mediaType === Constants.DASH_JS.MEDIA_TYPES.TEXT) {
                textBufferClearedEvents.push(e);
            }
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

        it(`Prunes the text buffer behind the playhead`, async function () {
            const textTracks = playerAdapter.getTracksFor(Constants.DASH_JS.MEDIA_TYPES.TEXT);
            const fragmentedTrackIndex = textTracks.findIndex((track) => track.isFragmented && !track.isEmbedded);
            if (!playerAdapter.isDynamic() || fragmentedTrackIndex < 0) {
                this.skip();
            }

            playerAdapter.setTextTrack(fragmentedTrackIndex);
            textBufferClearedEvents = [];

            const timeoutValue = Constants.TEST_TIMEOUT_THRESHOLDS.TEXT_BUFFER_CLEARED;
            for (let elapsed = 0; elapsed < timeoutValue && textBufferClearedEvents.length === 0; elapsed += 500) {
                await playerAdapter.sleep(500);
            }

            expect(textBufferClearedEvents, `expected the text buffer to be pruned within ${timeoutValue}ms`).to.not.be.empty;
        });

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })
    })
})
