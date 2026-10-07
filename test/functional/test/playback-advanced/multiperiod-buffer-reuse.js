import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai'
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';
import {checkIsPlaying, checkIsProgressing, checkNoCriticalErrors, initializeDashJsAdapter} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.PLAYBACK_ADVANCED.MULTIPERIOD_BUFFER_REUSE;

// Headless Chrome supports SourceBuffer.changeType(). useChangeType must be false so the
// codec family based reuse path is exercised instead of the changeType() path.
const VARIANTS = [
    {
        name: 'enabled, matching codec families',
        expectReuse: true,
        buffer: {
            reuseExistingSourceBuffers: true,
            useChangeType: false,
            reuseExistingSourceBuffersWithoutChangeType: { enabled: true, codecFamilies: ['avc', 'aac'] }
        }
    },
    {
        name: 'disabled',
        expectReuse: false,
        buffer: {
            reuseExistingSourceBuffers: true,
            useChangeType: false,
            reuseExistingSourceBuffersWithoutChangeType: { enabled: false, codecFamilies: ['avc', 'aac'] }
        }
    },
    {
        name: 'enabled, codec family not allowed',
        expectReuse: false,
        buffer: {
            reuseExistingSourceBuffers: true,
            useChangeType: false,
            reuseExistingSourceBuffersWithoutChangeType: { enabled: true, codecFamilies: ['hevc'] }
        }
    },
    {
        name: 'master switch reuseExistingSourceBuffers off',
        expectReuse: false,
        buffer: {
            reuseExistingSourceBuffers: false,
            useChangeType: false,
            reuseExistingSourceBuffersWithoutChangeType: { enabled: true, codecFamilies: ['avc', 'aac'] }
        }
    }
];

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    VARIANTS.forEach((variant) => {
        describe(`${TESTCASE} - ${variant.name} - ${item.name} - ${mpd}`, function () {

            let playerAdapter
            let initialSource

            before(function () {
                if (!item.testdata || !item.testdata.periods || isNaN(item.testdata.periods.waitingTimeForPeriodSwitches)) {
                    this.skip();
                }
                playerAdapter = initializeDashJsAdapter(item, mpd, { streaming: { buffer: variant.buffer } });
            })

            after(() => {
                if (playerAdapter) {
                    playerAdapter.destroy();
                }
            })

            it(`Checking playing state`, async () => {
                await checkIsPlaying(playerAdapter, true)
            })

            it(`Checking progressing state`, async () => {
                await checkIsProgressing(playerAdapter)
                // A MediaSource reset detaches and re-attaches the MediaSource, which assigns a new object URL to the video element.
                // Reused SourceBuffers keep the same object URL for the whole session.
                initialSource = playerAdapter.getVideoElement().src;
                expect(initialSource).to.be.a('string').and.not.be.empty;
            });

            it(`Transitions to next period`, async () => {
                const switched = await playerAdapter.waitForEvent(item.testdata.periods.waitingTimeForPeriodSwitches, MediaPlayerEvents.PERIOD_SWITCH_COMPLETED);
                expect(switched).to.be.true;
                await checkIsProgressing(playerAdapter)
            });

            it(`SourceBuffers are ${variant.expectReuse ? 'reused' : 'reset'}`, () => {
                const currentSource = playerAdapter.getVideoElement().src;
                if (variant.expectReuse) {
                    expect(currentSource).to.equal(initialSource);
                } else {
                    expect(currentSource).to.not.equal(initialSource);
                }
            });

            it(`Expect no critical errors to be thrown`, () => {
                checkNoCriticalErrors(playerAdapter)
            })
        })
    })
})
