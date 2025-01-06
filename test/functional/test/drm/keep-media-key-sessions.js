import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import ProtectionEvents from '../../../../src/streaming/protection/ProtectionEvents.js';
import {expect} from 'chai'
import {checkIsPlaying, checkIsProgressing, checkNoCriticalErrors, initializeDashJsAdapter} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.DRM.KEEP_MEDIA_KEY_SESSIONS;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, function () {

        let playerAdapter;
        const completedLicenseRequests = []

        before(function () {
            if (item.type === Constants.CONTENT_TYPES.VOD || !item.testdata || !item.testdata.drm || !item.testdata.drm.keepMediaKeySessions) {
                this.skip();
            }
            const settings = {
                streaming: {
                    protection: {
                        keepProtectionMediaKeys: true
                    }
                }
            }
            playerAdapter = initializeDashJsAdapter(item, mpd, settings);
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

        it(`Should not trigger any new license requests and is progressing`, async () => {
            playerAdapter.registerEvent(ProtectionEvents.LICENSE_REQUEST_COMPLETE, (e) => {
                completedLicenseRequests.push(e.data);
            });
            playerAdapter.attachSource(mpd);
            await checkIsProgressing(playerAdapter);
            expect(completedLicenseRequests).to.be.empty
        });

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })

    })
})
