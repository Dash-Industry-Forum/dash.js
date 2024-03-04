import DashJsAdapter from '../../adapter/DashJsAdapter.js';
import Constants from '../../helper/Constants.js';
import Utils from '../../helper/Utils.js';
import {expect} from 'chai'

const TESTCASE = Constants.TESTCASES.SIMPLE.INITIAL_BUFFER_TARGET;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`Simple - Initial buffer target - ${item.name} - ${mpd}`, () => {

        let playerAdapter;

        before(() => {
            playerAdapter = new DashJsAdapter();
            playerAdapter.init(true);
            playerAdapter.setDrmData(item.drm);
        })

        after(() => {
            playerAdapter.destroy();
        })

        it(`Setting initial buffer target to ${Constants.TEST_INPUTS.INITIAL_BUFFER_TARGET.VALUE} seconds`, async () => {
            playerAdapter.updateSettings({ streaming: { buffer: { initialBufferLevel: Constants.TEST_INPUTS.INITIAL_BUFFER_TARGET.VALUE } } })
            const settings = playerAdapter.getSettings();
            expect(settings.streaming.buffer.initialBufferLevel).to.be.equal(Constants.TEST_INPUTS.INITIAL_BUFFER_TARGET.VALUE);
        })

        it(`Attach source`, async () => {
            playerAdapter.attachSource(mpd);
        })

        it(`Expect buffer level to be within the initial target or the live delay once progressing`, async () => {
            const isProgressing = await playerAdapter.isProgressing(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PROGRESSING, Constants.TEST_INPUTS.GENERAL.MINIMUM_PROGRESS_WHEN_PLAYING);
            expect(isProgressing).to.be.true;
            const videoBuffer = playerAdapter.getBufferLengthByType(Constants.DASH_JS.MEDIA_TYPES.VIDEO);
            const liveDelay = playerAdapter.getTargetLiveDelay();
            const minimumTarget = liveDelay > 0 ? Math.min(liveDelay - Constants.TEST_INPUTS.INITIAL_BUFFER_TARGET.TOLERANCE, Constants.TEST_INPUTS.INITIAL_BUFFER_TARGET.VALUE) : Constants.TEST_INPUTS.INITIAL_BUFFER_TARGET.VALUE;
            expect(videoBuffer).to.be.above(minimumTarget - Constants.TEST_INPUTS.INITIAL_BUFFER_TARGET.TOLERANCE);
        });

        it(`Expect no critical errors to be thrown`, () => {
            const logEvents = playerAdapter.getLogEvents();
            expect(logEvents[dashjs.Debug.LOG_LEVEL_ERROR]).to.be.empty;
        })
    })
})
