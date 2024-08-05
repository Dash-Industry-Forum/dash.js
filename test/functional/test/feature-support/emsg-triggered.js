import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import { expect } from '@esm-bundle/chai';
import {checkIsPlaying, checkIsProgressing, checkNoCriticalErrors, initializeDashJsAdapter} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.FEATURE_SUPPORT.EMSG_TRIGGERED;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, function () {

        let playerAdapter

        before(function () {
            if (!item.testdata || !item.testdata.emsg || isNaN(item.testdata.emsg.minimumNumberOfEvents) || isNaN(item.testdata.emsg.runtime) || !item.testdata.emsg.schemeIdUri) {
                this.skip();
            }
            playerAdapter = initializeDashJsAdapter(item, mpd);
        })

        after(() => {
            if (playerAdapter) {
                playerAdapter.destroy();
            }
        })

        it(`Checking playing state`, async () => {
            await checkIsPlaying(playerAdapter, true);
        })

        it(`Checking progressing state`, async () => {
            await checkIsProgressing(playerAdapter);
        });

        it(`Dispatches events in receive and start mode`, async () => {
            const eventData = await playerAdapter.emsgEvents(item.testdata.emsg.runtime, item.testdata.emsg.schemeIdUri);
            expect(eventData.onStart).to.be.at.least(item.testdata.emsg.minimumNumberOfEvents);
            expect(eventData.onReceive).to.be.at.least(item.testdata.emsg.minimumNumberOfEvents);
        });

        it(`Should still be progressing`, async () => {
            await checkIsProgressing(playerAdapter);
        });

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })

    })
})
