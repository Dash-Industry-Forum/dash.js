import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import { expect } from 'chai';
import {
    checkIsPlaying,
    checkIsProgressing,
    checkNoCriticalErrors,
    initializeDashJsAdapterWithoutAttachSource,
    playForDuration
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.FEATURE_SUPPORT.LIVE_CONTENT_PENDING;
const INPUTS = Constants.TEST_INPUTS.LIVE_CONTENT_PENDING;

/**
 * Simulates a live MPD that is published before its packager has written the first segment: a response interceptor
 * removes the content from the MPD responses while withholding is active.
 */
const CONTENT_REMOVERS = {
    // Period without AdaptationSet
    noAdaptationSet: (mpd) => mpd.replace(/<AdaptationSet\b[\s\S]*?<\/AdaptationSet>/g, ''),
    // AdaptationSets whose SegmentTimeline has no S element
    emptySegmentTimeline: (mpd) => mpd.replace(/<S\b[^>]*\/>|<S\b[^>]*>\s*<\/S>/g, '')
};

function addContentWithholdingInterceptor(playerAdapter, removeContent, isWithholding, mpdResponseCounts) {
    playerAdapter.player.addResponseInterceptor((response) => {
        const request = response.request && response.request.customData ? response.request.customData.request : null;
        if (!request || request.type !== 'MPD') {
            return Promise.resolve(response);
        }
        mpdResponseCounts.mpdResponses++;
        if (!isWithholding()) {
            return Promise.resolve(response);
        }
        mpdResponseCounts.withheldMpdResponses++;
        if (typeof response.data === 'string') {
            response.data = removeContent(response.data);
        } else if (response.data) {
            const encoded = new TextEncoder().encode(removeContent(new TextDecoder().decode(response.data)));
            response.data = response.data instanceof ArrayBuffer ? encoded.buffer : encoded;
        }
        return Promise.resolve(response);
    });
}

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    Object.keys(CONTENT_REMOVERS).forEach((contentRemoverName) => {

        describe(`${TESTCASE} - ${item.name} - ${contentRemoverName} - starts once the MPD lists content - ${mpd}`, function () {
            let playerAdapter;
            const mpdResponseCounts = { mpdResponses: 0, withheldMpdResponses: 0 };
            let withholdUntil;

            before(function () {
                if (item.type === Constants.CONTENT_TYPES.VOD) {
                    this.skip();
                }
                playerAdapter = initializeDashJsAdapterWithoutAttachSource(item);
                withholdUntil = Date.now() + INPUTS.WITHHOLD_CONTENT_DURATION_MS;
                const isWithholding = () => Date.now() < withholdUntil;
                addContentWithholdingInterceptor(playerAdapter, CONTENT_REMOVERS[contentRemoverName], isWithholding, mpdResponseCounts);
                playerAdapter.attachSource(mpd);
            });

            after(() => {
                if (playerAdapter) {
                    playerAdapter.destroy();
                }
            });

            it('Does not play while the MPD lists no content', async () => {
                await playForDuration(INPUTS.WITHHOLD_CONTENT_DURATION_MS / 2);
                expect(playerAdapter.getVideoElement().currentTime).to.equal(0);
                expect(playerAdapter.getErrorEvents()).to.be.empty;
            });

            it('Refreshes the MPD before playback started while the MPD lists no content', async () => {
                await playForDuration(Math.max(withholdUntil - Date.now(), 0));
                expect(mpdResponseCounts.withheldMpdResponses).to.be.at.least(2);
            });

            it('Checking playing state', async () => {
                await checkIsPlaying(playerAdapter, true);
            });

            it('Checking progressing state', async () => {
                await checkIsProgressing(playerAdapter);
            });

            it('Expect no critical errors to be thrown', () => {
                checkNoCriticalErrors(playerAdapter);
            });
        });

        describe(`${TESTCASE} - ${item.name} - ${contentRemoverName} - raises an error if the MPD never lists content - ${mpd}`, function () {
            let playerAdapter;
            const mpdResponseCounts = { mpdResponses: 0, withheldMpdResponses: 0 };

            before(function () {
                if (item.type === Constants.CONTENT_TYPES.VOD) {
                    this.skip();
                }
                playerAdapter = initializeDashJsAdapterWithoutAttachSource(item, {
                    streaming: { liveContentPendingTimeoutInSeconds: INPUTS.CONTENT_PENDING_TIMEOUT_S }
                });
                addContentWithholdingInterceptor(playerAdapter, CONTENT_REMOVERS[contentRemoverName], () => true, mpdResponseCounts);
                playerAdapter.attachSource(mpd);
            });

            after(() => {
                if (playerAdapter) {
                    playerAdapter.destroy();
                }
            });

            it('Raises a MANIFEST_ERROR_ID_NOSTREAMS_CODE error once the timeout expired', async () => {
                await playForDuration(INPUTS.CONTENT_PENDING_TIMEOUT_S * 1000 + INPUTS.ERROR_GRACE_PERIOD_MS);
                const codes = playerAdapter.getErrorEvents().map((event) => (event.error || event).code);
                expect(codes).to.include(dashjs.MediaPlayer.errors.MANIFEST_ERROR_ID_NOSTREAMS_CODE);
                expect(mpdResponseCounts.withheldMpdResponses).to.be.at.least(2);
            });

            it('Did not start playback', () => {
                expect(playerAdapter.getVideoElement().currentTime).to.equal(0);
            });
        });
    });
});
