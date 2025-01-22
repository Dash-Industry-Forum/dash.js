import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';

import {
    checkIsPlaying,
    checkIsProgressing,
    checkNoCriticalErrors,
    initializeDashJsAdapter
} from '../common/common.js';
import {expect} from 'chai';

const TESTCASE = Constants.TESTCASES.FEATURE_SUPPORT.ANNEX_I;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {
        let playerAdapter;

        before(() => {
            if (!item.testdata || !item.testdata.annexI || !item.testdata.annexI.mediaTypes || item.testdata.annexI.mediaTypes.length === 0 || !item.testdata.annexI.expectedQueryString) {
                this.skip();
            }
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


        it(`Expect requests to have Annex I query parameters`, async () => {
            for (const mediaType of item.testdata.annexI.mediaTypes) {
                const eventPayload = await playerAdapter.waitForMediaSegmentDownload(Constants.TEST_TIMEOUT_THRESHOLDS.EVENT_WAITING_TIME, mediaType)
                expect(eventPayload.request).to.not.be.undefined;
                expect(eventPayload.request.url).to.not.be.undefined;
                const requestUrl = eventPayload.request.url;
                const url = new URL(requestUrl);
                const queryParameterString = url.search;
                expect(queryParameterString).to.be.equal(item.testdata.annexI.expectedQueryString);
            }
        })

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })

    })
})
