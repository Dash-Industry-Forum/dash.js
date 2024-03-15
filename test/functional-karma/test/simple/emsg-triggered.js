import DashJsAdapter from '../../adapter/DashJsAdapter';
import Constants from '../../helper/Constants';
import Utils from '../../helper/Utils';
import {expect} from 'chai'

const TESTCASE = Constants.TESTCASES.SIMPLE.EMSG_TRIGGERED;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`Simple - Check if emsg events are dispatched - ${item.name} - ${mpd}`, function () {

        let playerAdapter

        before(function () {
            playerAdapter = new DashJsAdapter();

            if (!item.testdata || !item.testdata.emsg || isNaN(item.testdata.emsg.minimumNumberOfEvents) || isNaN(item.testdata.emsg.runtime) || !item.testdata.emsg.schemeIdUri) {
                this.skip();
            }

            playerAdapter.init(true);
            playerAdapter.setDrmData(item.drm);
            playerAdapter.attachSource(mpd);
        })

        after(() => {
            playerAdapter.destroy();
        })

        it(`Checking playing state`, async () => {
            const isPlaying = await playerAdapter.isInPlayingState(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PLAYING);
            expect(isPlaying).to.be.true;
        })

        it(`Checking progressing state`, async () => {
            const isProgressing = await playerAdapter.isProgressing(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PROGRESSING, Constants.TEST_INPUTS.GENERAL.MINIMUM_PROGRESS_WHEN_PLAYING);
            expect(isProgressing).to.be.true;
        });

        it(`Dispatches events in receive and start mode`, async () => {
            const eventData = await playerAdapter.emsgEvents(item.testdata.emsg.runtime, item.testdata.emsg.schemeIdUri);
            expect(eventData.onStart).to.be.at.least(item.testdata.emsg.minimumNumberOfEvents);
            expect(eventData.onReceive).to.be.at.least(item.testdata.emsg.minimumNumberOfEvents);
        });

        it(`Should still be progressing`, async () => {
            const isProgressing = await playerAdapter.isProgressing(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PROGRESSING, Constants.TEST_INPUTS.GENERAL.MINIMUM_PROGRESS_WHEN_PLAYING);
            expect(isProgressing).to.be.true;
        });

        it(`Expect no critical errors to be thrown`, () => {
            const logEvents = playerAdapter.getLogEvents();
            expect(logEvents[dashjs.Debug.LOG_LEVEL_ERROR]).to.be.empty;
        })

    })
})
