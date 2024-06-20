import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai'
import {checkIsProgressing, checkNoCriticalErrors, initializeDashJsAdapter} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.BUFFER.INITIAL_TARGET;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {

        let playerAdapter;

        before(() => {
            const settings = { streaming: { buffer: { initialBufferLevel: Constants.TEST_INPUTS.INITIAL_BUFFER_TARGET.VALUE } } }
            playerAdapter = initializeDashJsAdapter(item, mpd, settings);
        })

        after(() => {
            playerAdapter.destroy();
        })

        it(`Expect buffer level to be within the initial target or the live delay once progressing`, async () => {
            await checkIsProgressing(playerAdapter);
            const videoBuffer = playerAdapter.getBufferLengthByType(Constants.DASH_JS.MEDIA_TYPES.VIDEO);
            const liveDelay = playerAdapter.getTargetLiveDelay();
            const minimumTarget = liveDelay > 0 ? Math.min(liveDelay - Constants.TEST_INPUTS.INITIAL_BUFFER_TARGET.TOLERANCE, Constants.TEST_INPUTS.INITIAL_BUFFER_TARGET.VALUE) : Constants.TEST_INPUTS.INITIAL_BUFFER_TARGET.VALUE;
            expect(videoBuffer).to.be.above(minimumTarget - Constants.TEST_INPUTS.INITIAL_BUFFER_TARGET.TOLERANCE);
        });

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })
    })
})
