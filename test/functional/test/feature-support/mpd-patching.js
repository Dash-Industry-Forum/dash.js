import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import { expect } from '@esm-bundle/chai';
import {checkIsPlaying, checkIsProgressing, checkNoCriticalErrors, initializeDashJsAdapter} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.FEATURE_SUPPORT.MPD_PATCHING;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, function () {

        let playerAdapter

        before(function () {
            if (item.type === Constants.CONTENT_TYPES.VOD || !item.testdata || !item.testdata.mpdPatching) {
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

        it(`Two consecutive manifest updates shall be of type Patch`, async () => {
            const manifest = playerAdapter.getManifest();
            const minimumUpdatePeriodInMs = parseInt(manifest.minimumUpdatePeriod) * 1000;

            let manifestUpdateEvent = await playerAdapter.waitForEventAndGetPayload(minimumUpdatePeriodInMs * 2, 'internalManifestLoaded')
            expect(manifestUpdateEvent.manifest.tagName).to.be.equal('Patch')
            manifestUpdateEvent = await playerAdapter.waitForEventAndGetPayload(minimumUpdatePeriodInMs * 2, 'internalManifestLoaded')
            expect(manifestUpdateEvent.manifest.tagName).to.be.equal('Patch')
        });

        it(`Should still be progressing`, async () => {
            await checkIsProgressing(playerAdapter);
        });

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })

    })
})
