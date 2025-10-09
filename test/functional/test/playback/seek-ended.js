import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {
    checkIsPlaying,
    checkIsProgressing,
    checkNoCriticalErrors,
    initializeDashJsAdapter, seekAndEndedEvent
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.PLAYBACK.SEEK_ENDED;

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

        it(`Seek to time larger than duration and expect ended event to be thrown`, async () => {
            await seekAndEndedEvent(playerAdapter, Constants.TEST_INPUTS.SEEK_ENDED.SEEK_END_OFFSET);
        })

        it(`Seek back and then seek to duration() and expect ended event to be thrown`, async () => {
            const seekTime = Math.max(playerAdapter.getDuration() - Constants.TEST_INPUTS.SEEK_ENDED.SEEK_BACK_OFFSET, 0);
            playerAdapter.seek(seekTime);
            playerAdapter.play();
            await checkIsProgressing(playerAdapter);
            await seekAndEndedEvent(playerAdapter, 0);
        })

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })
    })
})
