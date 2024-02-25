import DashJsAdapter from '../../adapter/DashJsAdapter.js';
import Constants from '../../helper/Constants.js';
import Utils from '../../helper/Utils.js';
import {expect} from 'chai'

const TESTCASE = Constants.TESTCASES.ADVANCED.SEEK_IN_GAPS

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`Advanced - Seek in gaps - ${item.name} -${mpd}`, function () {

        let playerAdapter;

        before(function () {
            playerAdapter = new DashJsAdapter();

            if (!item.testdata || !item.testdata.gaps) {
                this.skip();
            }

            playerAdapter.init(true);
            playerAdapter.setDrmData(item.drm);
            playerAdapter.attachSource(mpd);
        })

        after(() => {
            playerAdapter.destroy();
        })

        if (item && item.testdata && item.testdata.gaps && item.testdata.gaps.length > 0) {
            item.testdata.gaps.forEach((gap) => {
                const midGap = (gap.end - gap.start) / 2;
                it(`Seeking in the middle of the gap to ${midGap}`, async () => {
                    playerAdapter.seek(midGap);

                    const reachedTargetTime = await playerAdapter.reachedPlaybackPosition(Constants.TEST_TIMEOUT_THRESHOLDS.TO_REACH_TARGET_OFFSET, gap.end + Constants.TEST_INPUTS.SEEK_IN_GAPS.MAXIMUM_ALLOWED_PLAYING_DIFFERENCE_TO_GAP_END);
                    expect(reachedTargetTime).to.be.true;
                });

                const beforeGap = Math.max(gap.start - Constants.TEST_INPUTS.SEEK_IN_GAPS.OFFSET_BEFORE_GAP, 0);
                it(`Seeking right before the beginning of the gap to ${beforeGap}`, async () => {
                    playerAdapter.seek(beforeGap);

                    const reachedTargetTime = await playerAdapter.reachedPlaybackPosition(Constants.TEST_TIMEOUT_THRESHOLDS.TO_REACH_TARGET_OFFSET, gap.end + Constants.TEST_INPUTS.SEEK_IN_GAPS.MAXIMUM_ALLOWED_PLAYING_DIFFERENCE_TO_GAP_END);
                    expect(reachedTargetTime).to.be.true;
                });

                const beforeEndGap = gap.end - Constants.TEST_INPUTS.SEEK_IN_GAPS.OFFSET_BEFORE_END_GAP;
                it(`Seeking right before the end of the gap to ${beforeEndGap}`, async () => {
                    playerAdapter.seek(beforeEndGap);

                    const reachedTargetTime = await playerAdapter.reachedPlaybackPosition(Constants.TEST_TIMEOUT_THRESHOLDS.TO_REACH_TARGET_OFFSET, gap.end + Constants.TEST_INPUTS.SEEK_IN_GAPS.MAXIMUM_ALLOWED_PLAYING_DIFFERENCE_TO_GAP_END);
                    expect(reachedTargetTime).to.be.true;
                });

                it(`Expect no critical errors to be thrown`, () => {
                    const logEvents = playerAdapter.getLogEvents();
                    expect(logEvents[dashjs.Debug.LOG_LEVEL_ERROR]).to.be.empty;
                })
            })
        }
    })
})
