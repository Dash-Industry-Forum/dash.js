import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {
    checkEventHasBeenTriggered,
    checkIsPlaying,
    checkIsProgressing,
    checkNoCriticalErrors,
    initializeDashJsAdapterWithoutAttachSource,
    playForDuration
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.FEATURE_SUPPORT.DYNAMIC_TO_STATIC;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, function () {

        let playerAdapter

        before(function () {
            if (item.type === Constants.CONTENT_TYPES.VOD || !item.testdata || !item.testdata.dynamicToStatic || isNaN(item.testdata.dynamicToStatic.runtime)) {
                this.skip();
            }
            playerAdapter = initializeDashJsAdapterWithoutAttachSource(item);
            playerAdapter.registerEvent(dashjs.MediaPlayer.events.DYNAMIC_TO_STATIC);
            playerAdapter.registerEvent(dashjs.MediaPlayer.events.PLAYBACK_ENDED);
            playerAdapter.attachSource(mpd);
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

        it(`Play for the defined runtime`, async () => {
            const runtime = item.testdata.dynamicToStatic.runtime;
            await playForDuration(runtime)
        });

        it(`DYNAMIC_TO_STATIC event has been thrown`, async () => {
            checkEventHasBeenTriggered(playerAdapter, dashjs.MediaPlayer.events.DYNAMIC_TO_STATIC);
        });

        it(`PLAYBACK_ENDED event has been thrown`, async () => {
            checkEventHasBeenTriggered(playerAdapter, dashjs.MediaPlayer.events.PLAYBACK_ENDED);
        });

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })

    })
})
