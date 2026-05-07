import Constants from '../../src/Constants.js';
import {expect} from 'chai';
import Utils from '../../src/Utils.js';

import {
    initializeDashJsAdapter,
    playForDuration
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.DODGE.SIDE_CHANNEL_POLICY;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {
        let playerAdapter;

        before(async () => {
            const isMax = item.name.includes('max mode');
            const isNonStrict = item.name.includes('non-strict');
            const settings = isMax ? { dodge: { strictMode: 'max' } }
                : (isNonStrict ? { dodge: { strictMode: false } } : {});
            playerAdapter = initializeDashJsAdapter(item, mpd, settings);

            // Wait for player to initialize and Dodge module to run registerExtensions
            await playForDuration(item.name.includes('DRM') ? 8000 : 5000);
        })

        after(() => {
            if (playerAdapter) {
                playerAdapter.destroy();
            }
        })

        if (item.name.includes('max mode')) {
            it('background sync after segment download error should remain enabled (max mode warns only)', () => {
                const settings = playerAdapter.getSettings();
                expect(settings.streaming.utcSynchronization.enableBackgroundSyncAfterSegmentDownloadError).to.be.true;
            })

            it('content steering should remain enabled (max mode warns only)', () => {
                const settings = playerAdapter.getSettings();
                expect(settings.streaming.applyContentSteering).to.be.true;
            })

            it('media segment retry attempts should be at default (3)', () => {
                const settings = playerAdapter.getSettings();
                expect(settings.streaming.retryAttempts.MediaSegment).to.equal(3);
            })

            it('init segment retry attempts should be at default (3)', () => {
                const settings = playerAdapter.getSettings();
                expect(settings.streaming.retryAttempts.InitializationSegment).to.equal(3);
            })
        }

        if (item.name.includes('non-strict')) {
            it('media segment retry attempts should be at default (3)', () => {
                const settings = playerAdapter.getSettings();
                expect(settings.streaming.retryAttempts.MediaSegment).to.equal(3);
            })

            it('init segment retry attempts should be at default (3)', () => {
                const settings = playerAdapter.getSettings();
                expect(settings.streaming.retryAttempts.InitializationSegment).to.equal(3);
            })

            it('background sync should remain enabled', () => {
                const settings = playerAdapter.getSettings();
                expect(settings.streaming.utcSynchronization.enableBackgroundSyncAfterSegmentDownloadError).to.be.true;
            })

            it('content steering should remain enabled', () => {
                const settings = playerAdapter.getSettings();
                expect(settings.streaming.applyContentSteering).to.be.true;
            })
        }

        if (item.name.includes('DRM')) {
            it('Dodge defense should be active (DRM allowed with warning)', () => {
                const isActive = playerAdapter.isDodgeActive();
                expect(isActive).to.be.true;
            })
        }
    })
})
