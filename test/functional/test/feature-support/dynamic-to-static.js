import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import { expect } from 'chai';
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

        it(`Player is not dynamic anymore`, () => {
            expect(playerAdapter.isDynamic()).to.be.false;
        });

        it(`Duration is finite`, () => {
            expect(playerAdapter.getDuration()).to.be.a('number');
            expect(playerAdapter.getDuration()).to.be.finite;
        });

        it(`DVR window covers the final static presentation`, () => {
            const dvrWindow = playerAdapter.getDvrWindow();
            expect(dvrWindow.start).to.be.closeTo(0, 0.001);
            expect(dvrWindow.end).to.be.closeTo(playerAdapter.getDuration(), Constants.TEST_INPUTS.DYNAMIC_TO_STATIC.END_TOLERANCE);

            const seekable = playerAdapter.getVideoElement().seekable;
            expect(seekable.length).to.be.greaterThan(0);
            expect(seekable.start(0)).to.be.closeTo(0, 0.001);
            expect(seekable.end(seekable.length - 1)).to.be.closeTo(playerAdapter.getDuration(), Constants.TEST_INPUTS.DYNAMIC_TO_STATIC.END_TOLERANCE);
        });

        it(`Seek back to start replaying the stream`, async function () {
            if (!item.testdata.dynamicToStatic.checkReplay) {
                this.skip();
            }
            playerAdapter.seek(0);
            playerAdapter.play();
            await checkIsProgressing(playerAdapter);
        });

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })

    })
})
