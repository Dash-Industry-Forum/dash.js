import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import ProtectionEvents from '../../../../src/streaming/protection/ProtectionEvents.js';
import {expect} from 'chai'
import {
    checkIsPlaying,
    checkIsProgressing,
    checkNoCriticalErrors,
    initializeDashJsAdapterWithoutAttachSource
} from '../common/common.js';

/**
 * Channel switching with keepProtectionMediaKeys enabled:
 * channel 1 -> channel 2 -> back to channel 1.
 * Channel 1 is encrypted -> unencrypted -> encrypted multiperiod content (e.g. SSAI ad break in DRM protected content).
 * Channel 2 is encrypted content with different keys.
 * The unencrypted -> encrypted period switch can only be seamless (keep the MediaSource and SourceBuffers) once
 * MediaKeys with a usable license are in place. When zapping back to channel 1, the kept key sessions are reused and
 * no new license is requested. The period switch must still be seamless in that case.
 */
const TESTCASE = Constants.TESTCASES.DRM.KEEP_MEDIA_KEY_SESSIONS_MULTIPERIOD;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, function () {

        let playerAdapter;
        let completedLicenseRequests = [];
        const _onLicenseRequestComplete = (e) => {
            completedLicenseRequests.push(e.data);
        };

        // Like an application tuning to a channel: set the protection data, then attach the source
        const _tuneTo = (url) => {
            completedLicenseRequests = [];
            playerAdapter.setDrmData(item.drm);
            playerAdapter.attachSource(url);
        };

        before(function () {
            if (!item.testdata || !item.testdata.periods || isNaN(item.testdata.periods.waitingTimeForPeriodSwitches)
                || isNaN(item.testdata.periods.numberOfPeriodSwitches) || !item.testdata.secondChannel || !item.testdata.secondChannel.url) {
                this.skip();
            }
            const settings = {
                streaming: {
                    protection: {
                        keepProtectionMediaKeys: true
                    }
                }
            }
            playerAdapter = initializeDashJsAdapterWithoutAttachSource(item, settings);
            playerAdapter.registerEvent(ProtectionEvents.LICENSE_REQUEST_COMPLETE, _onLicenseRequestComplete);
        })

        after(() => {
            if (playerAdapter) {
                playerAdapter.unregisterEvent(ProtectionEvents.LICENSE_REQUEST_COMPLETE, _onLicenseRequestComplete);
                playerAdapter.destroy();
            }
        })

        it(`Channel 1: license is requested and all period switches are seamless`, async () => {
            const transitions = playerAdapter.trackPeriodTransitionsAndMediaSourceResets(item.testdata.periods.waitingTimeForPeriodSwitches, item.testdata.periods.numberOfPeriodSwitches);
            _tuneTo(mpd);
            await checkIsPlaying(playerAdapter, true);

            const result = await transitions;
            expect(completedLicenseRequests, 'expected a license request for channel 1').to.not.be.empty;
            expect(result.periodSwitches).to.equal(item.testdata.periods.numberOfPeriodSwitches);
            expect(result.mediaSourceResets, 'expected no MediaSource reset at the period switches').to.equal(0);
        });

        it(`Switch to channel 2: license is requested for the new keys and playback is progressing`, async () => {
            _tuneTo(item.testdata.secondChannel.url);
            await checkIsPlaying(playerAdapter, true);
            await checkIsProgressing(playerAdapter);
            expect(completedLicenseRequests, 'expected a license request for channel 2').to.not.be.empty;
        });

        it(`Switch back to channel 1: kept key sessions are reused and all period switches are seamless`, async () => {
            const transitions = playerAdapter.trackPeriodTransitionsAndMediaSourceResets(item.testdata.periods.waitingTimeForPeriodSwitches, item.testdata.periods.numberOfPeriodSwitches);
            _tuneTo(mpd);
            await checkIsPlaying(playerAdapter, true);

            const result = await transitions;
            expect(completedLicenseRequests, 'expected the kept key sessions to be reused without a new license request').to.be.empty;
            expect(result.periodSwitches).to.equal(item.testdata.periods.numberOfPeriodSwitches);
            expect(result.mediaSourceResets, 'expected no MediaSource reset at the period switches').to.equal(0);
        });

        it(`Checking progressing state`, async () => {
            await checkIsProgressing(playerAdapter);
        });

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })
    })
})
