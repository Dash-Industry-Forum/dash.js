import Constants from '../../src/Constants.js';
import {expect} from 'chai';
import Utils from '../../src/Utils.js';

import {
    checkIsNotProgressing,
    initializeDashJsAdapter,
    playForDuration
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.DODGE.THUMBNAIL_DETECTION;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {

        describe(`with restrictive strict mode (manifest)`, () => {
            let playerAdapter;

            before(async () => {
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

            it(`Dodge defense should not be active (thumbnail MPD rejected)`, () => {
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
                playerAdapter = initializeDashJsAdapter(item, mpd);
                await playForDuration(5000);
            })

            after(() => {
                if (playerAdapter) {
                    playerAdapter.destroy();
                }
            })

            it(`Dodge defense should not be active (thumbnail MPD rejected)`, () => {
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

            it(`Dodge defense should be active (thumbnail warning only, not blocked)`, () => {
                // With strict mode off, the thumbnail MPD is accepted with a
                // warning. Actual thumbnail fetches bypass Dodge but that
                // doesn't prevent video/audio defense from activating.
                const isActive = playerAdapter.isDodgeActive();
                expect(isActive).to.be.true;
            })
        })
    })
})
