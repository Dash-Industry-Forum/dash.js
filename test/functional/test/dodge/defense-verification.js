import Constants from '../../src/Constants.js';
import {expect} from 'chai';
import Utils from '../../src/Utils.js';

import {
    checkIsPlaying,
    checkNoCriticalErrors,
    initializeDashJsAdapter
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.DODGE.DEFENSE_VERIFICATION;

/**
 * Reproduce the right-to-left full flag precomputation from DefenseRegistry.
 * The last non-padding occurrence of each segment index is full=true.
 */
function computeExpectedFull(cycles) {
    const full = new Array(cycles.length).fill(false);
    const seen = new Set();
    for (let i = cycles.length - 1; i >= 0; i--) {
        if (cycles[i].padding) {
            full[i] = false;
        } else if (seen.has(cycles[i].index)) {
            full[i] = false;
        } else {
            full[i] = true;
            seen.add(cycles[i].index);
        }
    }
    return full;
}

/**
 * Find the defended stream matching a representation ID. Audio streams use
 * a separate label namespace, so this works for both media types.
 */
function findStream(manifest, representationId) {
    return manifest.streams.find(s => s.label === representationId);
}

/**
 * Run cycle-by-cycle assertions for a given media type.
 */
function verifyInitCycleMatch(requests, stream, mediaType) {
    const initCycles = stream.init;

    for (let i = 0; i < requests.length; i++) {
        const req = requests[i];
        const cycle = initCycles[i];

        expect(cycle, `${mediaType} init cycle ${i}: no cycle in manifest (collected ${requests.length}, manifest has ${initCycles.length})`).to.not.be.undefined;

        // Byte range must match
        if (cycle.range) {
            expect(req.range).to.equal(cycle.range, `${mediaType} init cycle ${i}: byte range mismatch (request=${req.range}, manifest=${cycle.range})`);
        }

        // Padding must match
        expect(!!req.padding).to.equal(!!cycle.padding, `${mediaType} init cycle ${i}: padding mismatch (request=${!!req.padding}, manifest=${!!cycle.padding})`);

        // Buffer and full should be true only on last init cycle
        const expectedBufferAndFull = (i === initCycles.length - 1);
        expect(!!req.buffer).to.equal(expectedBufferAndFull, `${mediaType} init cycle ${i}: full flag mismatch (request=${!!req.full}, expected=${expectedBufferAndFull})`);
        expect(!!req.full).to.equal(expectedBufferAndFull, `${mediaType} init cycle ${i}: full flag mismatch (request=${!!req.full}, expected=${expectedBufferAndFull})`);
    }
}

/**
 * Run cycle-by-cycle assertions for a given media type.
 */
function verifyCycleMatch(requests, stream, mediaType) {
    const cycles = stream.data;

    for (let i = 0; i < requests.length; i++) {
        const req = requests[i];
        const cycle = cycles[i];

        expect(cycle, `${mediaType} cycle ${i}: no cycle in manifest (collected ${requests.length} requests, manifest has ${cycles.length} cycles)`).to.not.be.undefined;

        // Segment index must match
        expect(req.index).to.equal(cycle.index, `${mediaType} cycle ${i}: segment index mismatch (request=${req.index}, manifest=${cycle.index})`);

        // Byte range must match
        if (cycle.range) {
            expect(req.range).to.equal(cycle.range, `${mediaType} cycle ${i}: byte range mismatch (request=${req.range}, manifest=${cycle.range})`);
        }

        // Padding must match
        expect(!!req.padding).to.equal(!!cycle.padding, `${mediaType} cycle ${i}: padding mismatch (request=${!!req.padding}, manifest=${!!cycle.padding})`);

        // Buffer must match
        expect(req.buffer).to.equal(cycle.buffer, `${mediaType} cycle ${i}: buffer mismatch (request=${req.buffer}, manifest=${cycle.buffer})`);
    }
}

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {
        let playerAdapter;
        let extendedManifest;
        let trafficPromise;

        before(async () => {
            // Fetch and parse the extended manifest so we can compare traffic against it
            const response = await fetch(mpd);
            extendedManifest = await response.json();

            // Pin quality to prevent ABR switches from changing which representation's
            // cycles are active, which would break the cycle-by-cycle comparison
            playerAdapter = initializeDashJsAdapter(item, mpd, {
                streaming: {
                    abr: {
                        autoSwitchBitrate: { video: false, audio: false }
                    }
                }
            });

            // Start collecting traffic concurrently with playback
            trafficPromise = playerAdapter.collectDodgeTraffic(
                Constants.TEST_TIMEOUT_THRESHOLDS.DODGE_TRAFFIC_COLLECTION
            );
        })

        after(() => {
            if (playerAdapter) {
                playerAdapter.destroy();
            }
        })

        it(`Checking playing state`, async () => {
            await checkIsPlaying(playerAdapter, true);
        })

        it(`Checking Dodge defense is active`, async () => {
            // Defense activation requires manifest load + first cycle request;
            // poll until active or timeout
            const timeout = Constants.TEST_TIMEOUT_THRESHOLDS.DODGE_PLAYING;
            const start = Date.now();
            let isActive = false;
            while (Date.now() - start < timeout) {
                isActive = playerAdapter.isDodgeActive();
                if (isActive) {
                    break;
                }
                await playerAdapter.sleep(200);
            }
            expect(isActive).to.be.true;
        })

        it(`Init cycle traffic matches extended manifest`, async () => {
            const traffic = await trafficPromise;

            for (const mediaType of ['video', 'audio']) {
                const initRequests = traffic.filter(
                    t => t.mediaType === mediaType && t.type === 'InitializationSegment'
                );

                if (initRequests.length === 0) {
                    continue;
                }

                const representationId = initRequests[0].representationId;
                const stream = findStream(extendedManifest, representationId);
                expect(stream, `No defended stream found for ${mediaType} representation ${representationId}`).to.not.be.undefined;

                verifyInitCycleMatch(initRequests, stream, mediaType);
            }
        })

        it(`Video traffic matches extended manifest cycles`, async () => {
            const traffic = await trafficPromise;

            const videoRequests = traffic.filter(
                t => t.mediaType === 'video' && t.type === 'MediaSegment'
            );

            expect(videoRequests.length).to.be.at.least(10, 'Expected at least 10 video data cycle requests');

            const representationId = videoRequests[0].representationId;
            expect(representationId).to.be.a('string');

            const stream = findStream(extendedManifest, representationId);
            expect(stream, `No defended stream found for video representation ${representationId}`).to.not.be.undefined;

            verifyCycleMatch(videoRequests, stream, 'video');
        })

        it(`Audio traffic matches extended manifest cycles`, async () => {
            const traffic = await trafficPromise;

            const audioRequests = traffic.filter(
                t => t.mediaType === 'audio' && t.type === 'MediaSegment'
            );

            expect(audioRequests.length).to.be.at.least(7, 'Expected at least 7 audio data cycle requests');

            const representationId = audioRequests[0].representationId;
            expect(representationId).to.be.a('string');

            const stream = findStream(extendedManifest, representationId);
            expect(stream, `No defended stream found for audio representation ${representationId}`).to.not.be.undefined;

            verifyCycleMatch(audioRequests, stream, 'audio');
        })

        it(`Full flag matches precomputed value from manifest`, async () => {
            const traffic = await trafficPromise;

            // Verify for both video and audio
            for (const mediaType of ['video', 'audio']) {
                const requests = traffic.filter(
                    t => t.mediaType === mediaType && t.type === 'MediaSegment'
                );
                if (requests.length === 0) {
                    continue; // covered by previous tests
                }

                const representationId = requests[0].representationId;
                const stream = findStream(extendedManifest, representationId);
                if (!stream) {
                    continue; // covered by previous tests
                }

                const expectedFull = computeExpectedFull(stream.data);

                for (let i = 0; i < requests.length; i++) {
                    expect(!!requests[i].full).to.equal(expectedFull[i], `${mediaType} cycle ${i} (index=${stream.data[i].index}): full flag mismatch (request=${!!requests[i].full}, expected=${expectedFull[i]})`);
                }
            }
        })

        it(`URL padding query parameter is present on requests`, async () => {
            const traffic = await trafficPromise;
            const settings = playerAdapter.getSettings();
            const queryParam = (settings.dodge && settings.dodge.queryParam) || 'padding';

            // Check both init and media segment requests for both media types
            const dodgeRequests = traffic.filter(
                t => (t.type === 'MediaSegment' || t.type === 'InitializationSegment') &&
                     (t.mediaType === 'video' || t.mediaType === 'audio')
            );

            expect(dodgeRequests.length).to.be.at.least(1, 'Expected at least one Dodge request');

            for (let i = 0; i < dodgeRequests.length; i++) {
                const req = dodgeRequests[i];
                const qp = req.requestRef && req.requestRef.queryParams;
                expect(qp, `Request ${i} (${req.mediaType} ${req.type}): queryParams not available`).to.not.be.undefined;
                expect(qp).to.have.property(queryParam);
                expect(qp[queryParam]).to.be.a('string').and.not.be.empty;
            }
        })

        it(`Random walk delay is applied between requests`, async () => {
            const traffic = await trafficPromise;

            // The Dodge schedule controller enforces a minimum delay of
            // scheduleWaitBase (default 100ms) between requests. Measure the
            // gap between the previous response completing (endDate) and the
            // next request starting (startDate) for a faithful measurement
            // that excludes download time.
            const settings = playerAdapter.getSettings();
            const waitBase = (settings.dodge && settings.dodge.scheduleWaitBase) || 100;
            // Allow tolerance for timer jitter and JS event loop overhead
            const minExpectedGap = waitBase * 0.6;

            for (const mediaType of ['video', 'audio']) {
                const requests = traffic.filter(
                    t => t.mediaType === mediaType && t.type === 'MediaSegment'
                );

                // Need at least 7 requests to check gaps
                if (requests.length < 7) {
                    continue;
                }

                let gapsAboveMin = 0;
                for (let i = 1; i < requests.length; i++) {
                    const prev = requests[i - 1].requestRef;
                    const curr = requests[i].requestRef;

                    // Use HTTP timing when available: gap = curr.startDate - prev.endDate.
                    // Fall back to Date.now() timestamps if timing isn't populated.
                    let gap;
                    if (prev && prev.endDate && curr && curr.startDate) {
                        gap = curr.startDate.getTime() - prev.endDate.getTime();
                    } else {
                        gap = requests[i].timestamp - requests[i - 1].timestamp;
                    }

                    if (gap >= minExpectedGap) {
                        gapsAboveMin++;
                    }
                }

                // Most gaps should meet the minimum delay. Allow slack for
                // the first request and occasional scheduling artifacts.
                const checked = requests.length - 1;
                expect(gapsAboveMin).to.be.at.least(Math.floor(checked * 0.7),
                    `${mediaType}: expected most scheduling gaps (response end to request start) to be >= ${minExpectedGap}ms, but only ${gapsAboveMin}/${checked} were`);
            }
        })

        it(`Buffer level is positive during playback`, async () => {
            // After several segments have been buffered through the Dodge
            // pipeline (partial downloads assembled via mock buffer), the
            // reported buffer level should be positive. A broken mockBuffer
            // (e.g., always 0 or going negative) would cause the buffer level
            // to undercount or go to zero despite successful playback.
            const traffic = await trafficPromise;

            // Ensure we've had enough data cycles to have meaningful buffer
            const videoData = traffic.filter(
                t => t.mediaType === 'video' && t.type === 'MediaSegment'
            );
            if (videoData.length < 3) {
                return; // not enough data to check
            }

            const videoBuffer = playerAdapter.getBufferLengthByType('video');
            expect(videoBuffer).to.be.a('number');
            expect(videoBuffer).to.be.above(0, 'Video buffer level should be positive during defended playback (mockBuffer may be broken)');
        })

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })
    })
})
