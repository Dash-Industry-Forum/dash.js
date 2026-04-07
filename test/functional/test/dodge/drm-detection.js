import Constants from '../../src/Constants.js';
import {expect} from 'chai';
import Utils from '../../src/Utils.js';

import {
    checkIsNotProgressing,
    initializeDashJsAdapter,
    playForDuration
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.DODGE.DRM_DETECTION;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {

        describe(`with restrictive strict mode (manifest)`, () => {
            let playerAdapter;

            before(async () => {
                // Default strictMode is 'representation', which blocks DRM content
                playerAdapter = initializeDashJsAdapter(item, mpd, {
                    dodge: {
                        strictMode: 'manifest'
                    },
                    streaming: {
                        abr: {
                            autoSwitchBitrate: { video: false, audio: false }
                        }
                    }
                });
                await playForDuration(5000);
            })

            after(() => {
                if (playerAdapter) {
                    playerAdapter.destroy();
                }
            })

            it(`Dodge defense should not be active (DRM MPD rejected)`, () => {
                const isActive = playerAdapter.isDodgeActive();
                expect(isActive).to.be.false;
            })

            it(`Playback should not progress`, async () => {
                await checkIsNotProgressing(playerAdapter);
            })
        })

        describe(`with default strict mode (representation)`, () => {
            let playerAdapter;

            before(async () => {
                // Default strictMode is 'representation', which blocks DRM content
                playerAdapter = initializeDashJsAdapter(item, mpd);
                await playForDuration(5000);
            })

            after(() => {
                if (playerAdapter) {
                    playerAdapter.destroy();
                }
            })

            it(`Dodge defense should not be active (DRM MPD rejected)`, () => {
                const isActive = playerAdapter.isDodgeActive();
                expect(isActive).to.be.false;
            })

            it(`Playback should not progress`, async () => {
                await checkIsNotProgressing(playerAdapter);
            })
        })

        describe(`with strict mode off`, () => {
            let playerAdapter;

            before(async () => {
                playerAdapter = initializeDashJsAdapter(item, mpd, {
                    dodge: {
                        strictMode: false
                    },
                    streaming: {
                        abr: {
                            autoSwitchBitrate: { video: false, audio: false }
                        }
                    }
                });
                await playForDuration(8000);
            })

            after(() => {
                if (playerAdapter) {
                    playerAdapter.destroy();
                }
            })

            it(`Dodge defense should be active (DRM warning only, not blocked)`, () => {
                // With strict mode off, the DRM MPD is accepted with a warning.
                // isDodgeActive() should be true because the manifest was loaded
                // and defense info registered. Actual playback may fail (no DRM
                // keys) but that's expected; we're testing manifest acceptance.
                const isActive = playerAdapter.isDodgeActive();
                expect(isActive).to.be.true;
            })
        })
    })
})
