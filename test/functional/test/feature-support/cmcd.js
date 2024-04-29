import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';

import {
    checkIsPlaying,
    checkIsProgressing,
    checkNoCriticalErrors,
    initializeDashJsAdapter
} from '../common/common.js';
import {expect} from 'chai';

const TESTCASE = Constants.TESTCASES.FEATURE_SUPPORT.CMCD;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {
        let playerAdapter;

        before(() => {
            const settings = {
                streaming: {
                    cmcd: {
                        enabled: true,
                        sid: 'sid',
                        cid: 'cid',
                        mode: 'query'
                    }
                }
            }
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

        it(`Expect CMCD event to be thrown`, async () => {
            await playerAdapter.waitForEvent(Constants.TEST_TIMEOUT_THRESHOLDS.EVENT_WAITING_TIME, dashjs.MetricsReporting.events.CMCD_DATA_GENERATED)
        });

        it(`Expect requests to have CMCD query parameters`, async () => {
            const eventPayload = await playerAdapter.waitForMediaSegmentDownload(Constants.TEST_TIMEOUT_THRESHOLDS.EVENT_WAITING_TIME)
            expect(eventPayload.request).to.not.be.undefined;
            expect(eventPayload.request.url).to.not.be.undefined;
            const requestUrl = eventPayload.request.url;
            const url = new URL(requestUrl);
            const cmcdString = url.searchParams.get('CMCD');
            const cmcdParams = {}
            cmcdString.split(',').forEach(pair => {
                const [key, value] = pair.split('=');
                if (value) {
                    cmcdParams[key] = value.replace(/"/g, '');
                }
            });

            expect(cmcdParams.sid).to.be.equal('sid');
            expect(cmcdParams.cid).to.be.equal('cid');
        });

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })

    })
})
