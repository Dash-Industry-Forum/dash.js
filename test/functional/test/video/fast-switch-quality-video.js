import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai'
import {
    checkIsPlaying, checkIsProgressing, checkNoCriticalErrors,
    initializeDashJsAdapterWithoutAttachSource, reachedTargetForwardBuffer
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.VIDEO.FAST_SWITCH_QUALITY;
let playerAdapter;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;
    let lowestVideoBitrate = NaN;
    let bufferInformation = {
        currentTime: NaN,
        forwardBuffer: NaN,
        currentRepresentation: null
    };

    describe(`${TESTCASE} - ${item.name} -${mpd}`, () => {
        // Flag to allow skipping all subsequent tests if representations are insufficient
        let skipSuite = false;

        before(() => {
            playerAdapter = initializeDashJsAdapterWithoutAttachSource(item);
            playerAdapter.updateSettings({
                streaming: {
                    abr: {
                        autoSwitchBitrate: {
                            video: false
                        }
                    },
                    delay: {
                        liveDelay: Constants.TEST_INPUTS.FAST_SWITCH_QUALITY_VIDEO.LIVE_DELAY
                    },
                    buffer: {
                        bufferTimeDefault: Constants.TEST_INPUTS.FAST_SWITCH_QUALITY_VIDEO.TARGET_BUFFER,
                        bufferTimeAtTopQuality: Constants.TEST_INPUTS.FAST_SWITCH_QUALITY_VIDEO.TARGET_BUFFER,
                        bufferTimeAtTopQualityLongForm: Constants.TEST_INPUTS.FAST_SWITCH_QUALITY_VIDEO.TARGET_BUFFER,
                    },
                }
            })
            playerAdapter.attachSource(mpd);
        })

        after(() => {
            playerAdapter.destroy();
        })

        it(`Checking playing state`, async () => {
            await checkIsPlaying(playerAdapter, true)
        })

        it(`Checking progressing state`, async () => {
            await checkIsProgressing(playerAdapter)
        });

        it(`Save lowest video bitrate and reinitialize playback`, function () {
            const representations = playerAdapter.getRepresentationsByType(Constants.DASH_JS.MEDIA_TYPES.VIDEO);

            if (!representations || representations.length <= 1) {
                skipSuite = true; // mark suite to be skipped
                this.skip(); // skip this test now
            }

            lowestVideoBitrate = representations.reduce((lowest, rep) => {
                return rep.bitrateInKbit < lowest ? rep.bitrateInKbit : lowest;
            }, Infinity);

            playerAdapter.updateSettings({
                streaming: {
                    abr: {
                        maxBitrate: {
                            video: lowestVideoBitrate + 1
                        }
                    }
                }
            })
            playerAdapter.attachSource(mpd);
        });

        // Subsequent tests use function() to allow access to Mocha's this and perform conditional skip
        it(`Checking playing state`, async function () {
            if (skipSuite) {
                this.skip();
            }
            await checkIsPlaying(playerAdapter, true)
        })

        it(`Checking progressing state`, async function () {
            if (skipSuite) {
                this.skip();
            }
            await checkIsProgressing(playerAdapter)
        });

        it(`Wait for forward buffer to be filled`, async function () {
            if (skipSuite) {
                this.skip();
            }
            await reachedTargetForwardBuffer(playerAdapter, Constants.TEST_INPUTS.FAST_SWITCH_QUALITY_VIDEO.TARGET_BUFFER, Constants.TEST_INPUTS.FAST_SWITCH_QUALITY_VIDEO.TARGET_BUFFER_TOLERANCE);
        });

        it(`Set buffer information`, async function () {
            if (skipSuite) {
                this.skip();
            }
            bufferInformation.currentTime = playerAdapter.getCurrentTime();
            bufferInformation.forwardBuffer = playerAdapter.getBufferLengthByType(Constants.DASH_JS.MEDIA_TYPES.VIDEO);
            bufferInformation.currentRepresentation = playerAdapter.getCurrentRepresentationForType(Constants.DASH_JS.MEDIA_TYPES.VIDEO);
        });

        it(`Enable fast ABR quality switching and expect buffer to be replaced`, async function () {
            if (skipSuite) {
                this.skip();
            }
            playerAdapter.updateSettings({
                streaming: {
                    buffer: {
                        fastSwitchEnabled: true,
                    },
                    abr: {
                        autoSwitchBitrate: {
                            video: true
                        },
                        maxBitrate: {
                            video: -1
                        }
                    },
                }
            })
            const replacedBuffer = await playerAdapter.replacedSegmentsInBuffer(
                Constants.TEST_INPUTS.FAST_SWITCH_QUALITY_VIDEO.MAX_NUMBER_OF_SEGMENT_DOWNLOADS_TO_WAIT,
                Constants.TEST_TIMEOUT_THRESHOLDS.FAST_SWITCH_QUALITY_VIDEO,
                bufferInformation)
            expect(replacedBuffer).to.be.true;
        });
        it(`Expect no critical errors to be thrown`, function () {
            if (skipSuite) {
                this.skip();
            }
            checkNoCriticalErrors(playerAdapter)
        })
    })
})
