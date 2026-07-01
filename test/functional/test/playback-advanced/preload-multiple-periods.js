import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';

import {
    checkIsNotProgressing,
    checkIsPlaying,
    checkIsProgressing,
    checkNoCriticalErrors,
    initializeDashJsAdapterForPreload
} from '../common/common.js';
import {expect} from 'chai';

const TESTCASE = Constants.TESTCASES.PLAYBACK_ADVANCED.PRELOAD_MULTIPLE_PERIODS;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {
        let playerAdapter;
        const preloadedPeriodIds = new Set();

        const _onFragmentLoadingCompleted = (e) => {
            if (e && e.request && e.request.type === Constants.SEGMENT_TYPES.MEDIA
                && e.request.representation && e.request.representation.mediaInfo
                && e.request.representation.mediaInfo.streamInfo) {
                preloadedPeriodIds.add(e.request.representation.mediaInfo.streamInfo.id);
            }
        }

        before(function () {
            if (item.drm || !item.testdata || !item.testdata.preloadMultiplePeriods) {
                this.skip();
            }
            playerAdapter = initializeDashJsAdapterForPreload(item, mpd);
            playerAdapter.registerEvent(MediaPlayerEvents.FRAGMENT_LOADING_COMPLETED, _onFragmentLoadingCompleted);
        })

        after(() => {
            if (playerAdapter) {
                playerAdapter.unregisterEvent(MediaPlayerEvents.FRAGMENT_LOADING_COMPLETED, _onFragmentLoadingCompleted);
                playerAdapter.destroy();
            }
        })

        it(`Should download segments`, async () => {
            const eventPayload = await playerAdapter.waitForMediaSegmentDownload(Constants.TEST_TIMEOUT_THRESHOLDS.EVENT_WAITING_TIME);

            expect(eventPayload).to.not.be.null;
        })

        it(`Should not progress`, async () => {
            await checkIsNotProgressing(playerAdapter);
        });


        it(`Should preload segments from multiple periods`, async () => {
            await playForDuration(item.testdata.preloadMultiplePeriods.preloadDuration);

            expect(preloadedPeriodIds.size).to.be.at.least(item.testdata.preloadMultiplePeriods.numberOfPeriods);
        });

        it(`Attach view and expect to progress`, async () => {
            playerAdapter.attachView();
            await checkIsPlaying(playerAdapter, true);
            await checkIsProgressing(playerAdapter);
        });

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })

    })
})
