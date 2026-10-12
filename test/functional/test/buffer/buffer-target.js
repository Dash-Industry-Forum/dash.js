/**
 * This test checks that the forward buffer converges on bufferTimeAtTopQuality for short-form content
 * and on bufferTimeAtTopQualityLongForm for long-form content, and stays within that target over time.
 */
import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai';
import {
    checkIsKeepingForwardBufferTarget,
    checkIsProgressing,
    checkNoCriticalErrors,
    initializeDashJsAdapterWithoutAttachSource,
    reachedTargetForwardBuffer
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.BUFFER.TARGET;
const TOLERANCE = Constants.TEST_INPUTS.BUFFER_TARGET.TOLERANCE;

function testBufferTarget(item, mpd, targetBuffer, longFormContentDurationThreshold) {
    let playerAdapter;

    before(function () {
        if (item.type === Constants.CONTENT_TYPES.LIVE) {
            this.skip();
        }
        playerAdapter = initializeDashJsAdapterWithoutAttachSource(item);
        playerAdapter.updateSettings({
            streaming: {
                abr: {
                    autoSwitchBitrate: {
                        video: false
                    },
                    initialBitrate: {
                        video: Number.MAX_SAFE_INTEGER
                    }
                },
                buffer: {
                    bufferTimeAtTopQuality: Constants.TEST_INPUTS.BUFFER_TARGET.SHORT_FORM_BUFFER,
                    bufferTimeAtTopQualityLongForm: Constants.TEST_INPUTS.BUFFER_TARGET.LONG_FORM_BUFFER,
                    longFormContentDurationThreshold
                }
            }
        })
        playerAdapter.attachSource(mpd);
    })

    after(() => {
        if (playerAdapter) {
            playerAdapter.destroy();
        }
    })

    it(`Checking progressing state`, async function () {
        await checkIsProgressing(playerAdapter);
    });

    it(`Expect playback to be at the top video representation (forced via initialBitrate + autoSwitchBitrate off)`, function () {
        const representations = playerAdapter.getRepresentationsByType(Constants.DASH_JS.MEDIA_TYPES.VIDEO);
        const topRepresentation = representations.reduce((top, rep) => rep.bitrateInKbit > top.bitrateInKbit ? rep : top, representations[0]);
        const currentRepresentation = playerAdapter.getCurrentRepresentationForType(Constants.DASH_JS.MEDIA_TYPES.VIDEO);

        expect(currentRepresentation.id, `expected top representation ${topRepresentation.id} (${topRepresentation.bitrateInKbit}kbps), but current representation is ${currentRepresentation.id} (${currentRepresentation.bitrateInKbit}kbps) - the buffer target below only applies while playing at the top quality`).to.equal(topRepresentation.id);
    });

    it(`Wait for forward buffer to reach ${targetBuffer}s (tolerance ${TOLERANCE}s)`, async function () {
        await reachedTargetForwardBuffer(playerAdapter, targetBuffer, TOLERANCE);
    });

    it(`Expect forward buffer to stay within ${targetBuffer}s (tolerance ${TOLERANCE}s) for ${Constants.TEST_TIMEOUT_THRESHOLDS.BUFFER_STABLE_WINDOW}ms`, async function () {
        await checkIsKeepingForwardBufferTarget(playerAdapter, Constants.TEST_TIMEOUT_THRESHOLDS.BUFFER_STABLE_WINDOW, targetBuffer, TOLERANCE);
    });

    it(`Expect no critical errors to be thrown`, function () {
        checkNoCriticalErrors(playerAdapter);
    })
}

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {

        describe(`Short-form content reaches bufferTimeAtTopQuality=${Constants.TEST_INPUTS.BUFFER_TARGET.SHORT_FORM_BUFFER}s (longFormContentDurationThreshold forced to ${Constants.TEST_INPUTS.BUFFER_TARGET.FORCE_SHORT_FORM_THRESHOLD}s)`, () => {
            testBufferTarget(item, mpd, Constants.TEST_INPUTS.BUFFER_TARGET.SHORT_FORM_BUFFER, Constants.TEST_INPUTS.BUFFER_TARGET.FORCE_SHORT_FORM_THRESHOLD);
        })

        describe(`Long-form content reaches bufferTimeAtTopQualityLongForm=${Constants.TEST_INPUTS.BUFFER_TARGET.LONG_FORM_BUFFER}s (longFormContentDurationThreshold forced to ${Constants.TEST_INPUTS.BUFFER_TARGET.FORCE_LONG_FORM_THRESHOLD}s)`, () => {
            testBufferTarget(item, mpd, Constants.TEST_INPUTS.BUFFER_TARGET.LONG_FORM_BUFFER, Constants.TEST_INPUTS.BUFFER_TARGET.FORCE_LONG_FORM_THRESHOLD);
        })
    })
})
