import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai'
import {checkNoCriticalErrors, initializeDashJsAdapterWithoutAttachSource} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.ADVANCED.PLAY_INTO_GAP
const START_OFFSET_BEFORE_GAP = 4;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    if (item && item.testdata && item.testdata.gaps && item.testdata.gaps.length > 0) {
        item.testdata.gaps.forEach((gap) => {
            describe(`${TESTCASE} - ${item.name} - gap from ${gap.start} to ${gap.end} - ${mpd}`, function () {

                let playerAdapter;

                before(function () {
                    // Use a fresh player for each gap to make sure that no media from a previous seek is buffered behind the gap
                    playerAdapter = initializeDashJsAdapterWithoutAttachSource(item);
                    playerAdapter.attachSource(mpd, Math.max(gap.start - START_OFFSET_BEFORE_GAP, 0));
                })

                after(() => {
                    if (playerAdapter) {
                        playerAdapter.destroy();
                    }
                })

                it(`Playing into the gap and jumping to ${gap.end}`, async () => {
                    const reachedTargetTime = await playerAdapter.reachedPlaybackPosition(Constants.TEST_TIMEOUT_THRESHOLDS.TO_REACH_TARGET_OFFSET, gap.end + Constants.TEST_INPUTS.SEEK_IN_GAPS.MAXIMUM_ALLOWED_PLAYING_DIFFERENCE_TO_GAP_END);
                    expect(reachedTargetTime).to.be.true;
                });

                it(`Expect no critical errors to be thrown`, () => {
                    checkNoCriticalErrors(playerAdapter)
                })
            })
        })
    }
})
