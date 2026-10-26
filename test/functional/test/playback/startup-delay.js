import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai';
import {checkNoCriticalErrors, initializeDashJsAdapterWithoutAttachSource} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.PLAYBACK.STARTUP_DELAY;

// Opt-in: only testvectors that define a "startupDelay" block are measured, as timing budgets need per-vector calibration
Utils.getTestvectorsForTestcase(TESTCASE).filter((item) => item.startupDelay).forEach((item) => {
    const mpd = item.url;
    const maxStartupDelayMs = item.startupDelay.maxMs || Constants.TEST_INPUTS.STARTUP_DELAY.MAX_STARTUP_DELAY_MS;
    const maxFragmentRequests = item.startupDelay.maxFragmentRequests || Constants.TEST_INPUTS.STARTUP_DELAY.MAX_FRAGMENT_REQUESTS_BEFORE_PLAYING;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {
        let playerAdapter;
        const results = [];

        before(async () => {
            for (let i = 0; i < Constants.TEST_INPUTS.STARTUP_DELAY.NUMBER_OF_RUNS; i++) {
                if (playerAdapter) {
                    playerAdapter.destroy();
                }
                playerAdapter = initializeDashJsAdapterWithoutAttachSource(item);
                results.push(await playerAdapter.measureStartup(mpd, Constants.TEST_TIMEOUT_THRESHOLDS.STARTUP_DELAY));
            }
            console.log(`[startup-delay] ${item.name}: runs=[${_getDelays().map(Math.round).join(', ')}]ms median=${Math.round(_getMedianDelay())}ms requests=[${results.map((r) => r.fragmentRequests).join(', ')}]`);
        })

        after(() => {
            if (playerAdapter) {
                playerAdapter.destroy();
            }
        })

        function _getDelays() {
            return results.map((result) => result.startupDelayMs);
        }

        function _getMedianDelay() {
            const sorted = _getDelays().sort((a, b) => a - b);
            const middle = Math.floor(sorted.length / 2);
            return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
        }

        it(`Expect playback to start within the timeout`, () => {
            const timedOutRuns = results.filter((result) => result.timedOut).length;
            expect(timedOutRuns, `expected all ${results.length} runs to reach playing within ${Constants.TEST_TIMEOUT_THRESHOLDS.STARTUP_DELAY}ms`).to.equal(0);
        })

        it(`Expect median startup delay to be below ${maxStartupDelayMs}ms`, () => {
            const median = _getMedianDelay();
            expect(median, `expected median startup delay to be below ${maxStartupDelayMs}ms, runs were [${_getDelays().map(Math.round).join(', ')}]ms`).to.be.below(maxStartupDelayMs);
        })

        it(`Expect at most ${maxFragmentRequests} fragment requests before playback starts`, () => {
            const requests = results.map((result) => result.fragmentRequests);
            expect(Math.max(...requests), `expected at most ${maxFragmentRequests} fragment requests before playing, runs were [${requests.join(', ')}]`).to.be.at.most(maxFragmentRequests);
        })

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })
    })
})
