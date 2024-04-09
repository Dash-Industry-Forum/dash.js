import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {
    checkForEndedEvent,
    checkIsPlaying,
    checkIsProgressing,
    checkNoCriticalErrors, checkTimeWithinThreshold,
    initializeDashJsAdapter
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.PLAYBACK.ENDED;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {

        let playerAdapter;

        before(function () {
            if (item.type === Constants.CONTENT_TYPES.LIVE) {
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

        it(`Seek close to playback end`, async () => {
            const targetTime = playerAdapter.getDuration() - Constants.TEST_INPUTS.ENDED.SEEK_END_OFFSET;
            playerAdapter.seek(targetTime);

            checkTimeWithinThreshold(playerAdapter, targetTime, Constants.TEST_INPUTS.GENERAL.MAXIMUM_ALLOWED_SEEK_DIFFERENCE);
        })

        it(`Check if ended event is thrown`, async () => {
            await checkForEndedEvent(playerAdapter);
        })

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })
    })
})
