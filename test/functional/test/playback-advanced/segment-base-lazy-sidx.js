import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai';
import {checkIsPlaying, checkIsProgressing, initializeDashJsAdapterWithoutAttachSource, playForDuration} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.PLAYBACK_ADVANCED.SEGMENT_BASE_LAZY_SIDX;
const VIDEO = Constants.DASH_JS.MEDIA_TYPES.VIDEO;
// Must match SEGMENT_LIST_RETRY_DELAY in RepresentationController
const SEGMENT_LIST_RETRY_DELAY = 10000;
const POLLING_INTERVAL = 200;
// A failing sidx load takes a few attempts (retryAttempts.MediaSegment) before the Representation is excluded
const EXCLUSION_TIMEOUT = 20000;

let playerAdapter;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {
        // Representation id -> number of sidx requests. SegmentBaseLoader requests the sidx as a MediaSegment without a segment index.
        const sidxRequests = {};
        const blockedRepresentationIds = new Set();
        let startRepresentation;
        let switchedRepresentation;
        let failingRepresentation;

        before(() => {
            // No ABR switches, the test decides which Representations are scheduled on
            const settings = { streaming: { abr: { autoSwitchBitrate: { video: false } } } };
            playerAdapter = initializeDashJsAdapterWithoutAttachSource(item, settings);
            playerAdapter.player.addRequestInterceptor((request) => {
                const dashRequest = request.customData.request;
                if (dashRequest && dashRequest.mediaType === VIDEO && dashRequest.type === 'MediaSegment' && isNaN(dashRequest.index) && dashRequest.representation) {
                    const id = dashRequest.representation.id;
                    sidxRequests[id] = (sidxRequests[id] || 0) + 1;
                    if (blockedRepresentationIds.has(id)) {
                        request.url = 'http://127.0.0.1:1/unreachable.mp4';
                    }
                }
                return Promise.resolve(request);
            });
            playerAdapter.attachSource(mpd);
        });

        after(() => {
            playerAdapter.destroy();
        });

        it('Checking playing state', async () => {
            await checkIsPlaying(playerAdapter, true);
        });

        it('Only loads the sidx of the selected video Representation at startup', async () => {
            await checkIsProgressing(playerAdapter);
            startRepresentation = playerAdapter.getCurrentRepresentationForType(VIDEO);

            // Before lazy loading the sidx of every video Representation was requested at startup
            expect(Object.keys(sidxRequests)).to.deep.equal([startRepresentation.id]);
        });

        it('Loads the sidx of another video Representation only once it is switched to', async () => {
            switchedRepresentation = playerAdapter.getRepresentationsByType(VIDEO).find((rep) => rep.id !== startRepresentation.id);
            expect(switchedRepresentation, 'expected a second video Representation').to.exist;
            expect(sidxRequests[switchedRepresentation.id]).to.be.undefined;

            playerAdapter.setRepresentationForTypeById(VIDEO, switchedRepresentation.id);
            await checkIsProgressing(playerAdapter);

            expect(playerAdapter.getCurrentRepresentationForType(VIDEO).id).to.equal(switchedRepresentation.id);
            expect(sidxRequests[switchedRepresentation.id]).to.be.above(0);
        });

        it('Excludes a video Representation whose sidx can not be loaded and falls back to another one', async function () {
            this.timeout(EXCLUSION_TIMEOUT + 30000);

            // The highest one that was not loaded yet, so a lower one is left to fall back to
            const candidates = playerAdapter.getRepresentationsByType(VIDEO)
                .filter((rep) => sidxRequests[rep.id] === undefined)
                .sort((a, b) => b.bandwidth - a.bandwidth);
            failingRepresentation = candidates[0];
            expect(failingRepresentation, 'expected a video Representation whose sidx was not loaded yet').to.exist;
            blockedRepresentationIds.add(failingRepresentation.id);

            playerAdapter.setRepresentationForTypeById(VIDEO, failingRepresentation.id);
            const isExcluded = await _waitFor(() => !_isSelectable(failingRepresentation), EXCLUSION_TIMEOUT);

            expect(isExcluded, `expected representation ${failingRepresentation.id} to be excluded`).to.be.true;
            expect(sidxRequests[failingRepresentation.id]).to.be.above(0);
            expect(playerAdapter.getCurrentRepresentationForType(VIDEO).id).to.not.equal(failingRepresentation.id);
            expect(playerAdapter.getErrorEvents().length, 'expected the failed sidx requests to be reported').to.be.above(0);
            await checkIsProgressing(playerAdapter);
        });

        it('Retries the sidx after the retry delay and plays the Representation once it can be loaded', async function () {
            this.timeout(SEGMENT_LIST_RETRY_DELAY + EXCLUSION_TIMEOUT + 30000);

            // The network recovered
            blockedRepresentationIds.delete(failingRepresentation.id);
            const failedRequests = sidxRequests[failingRepresentation.id];

            const isSelectableAgain = await _waitFor(() => _isSelectable(failingRepresentation), SEGMENT_LIST_RETRY_DELAY + EXCLUSION_TIMEOUT);
            expect(isSelectableAgain, `expected representation ${failingRepresentation.id} to be selectable after the retry delay`).to.be.true;

            playerAdapter.setRepresentationForTypeById(VIDEO, failingRepresentation.id);
            await checkIsProgressing(playerAdapter);

            expect(sidxRequests[failingRepresentation.id]).to.be.above(failedRequests);
            expect(playerAdapter.getCurrentRepresentationForType(VIDEO).id).to.equal(failingRepresentation.id);
            // Loaded this time, so it was not excluded again
            expect(_isSelectable(failingRepresentation)).to.be.true;
        });
    });
});

function _isSelectable(representation) {
    return playerAdapter.getRepresentationsByType(VIDEO).some((rep) => rep.id === representation.id);
}

async function _waitFor(condition, timeout) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        if (condition()) {
            return true;
        }
        await playForDuration(POLLING_INTERVAL);
    }
    return condition();
}
