import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';

import {
    checkEventHasBeenTriggered,
    checkIsPlaying,
    checkIsProgressing,
    checkNoCriticalErrors,
    initializeDashJsAdapterWithoutAttachSource
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.PLAYBACK.CAN_PLAY;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {
        let playerAdapter;

        before(() => {
            playerAdapter = initializeDashJsAdapterWithoutAttachSource(item);
            playerAdapter.registerEvent(dashjs.MediaPlayer.events.CAN_PLAY);
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

        it(`"canplay" event has been thrown`, async () => {
            checkEventHasBeenTriggered(playerAdapter, dashjs.MediaPlayer.events.CAN_PLAY);
        });

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })

    })
})
