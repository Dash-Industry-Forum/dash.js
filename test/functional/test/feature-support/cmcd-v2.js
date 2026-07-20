import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {
    checkIsPlaying,
    checkIsProgressing,
    checkNoCriticalErrors,
    initializeDashJsAdapter,
} from '../common/common.js';
import { expect } from 'chai';
import CmcdRequestCollector from '../../helpers/CmcdRequestCollector.js';
import { validateCmcdRequest, validateCmcdEvents } from '@svta/cml-cmcd';

const TESTCASE = Constants.TESTCASES.FEATURE_SUPPORT.CMCD_V2;

const EVENT_TARGET_BASE = 'http://localhost:19876/cmcd/event';

const DEFAULT_CMCD_V2_CONFIG = {
    version: 2,
    enabled: true,
    sid: 'test-session-id',
    cid: 'test-content-id',
    mode: 'query',
    enabledKeys: [
        'br', 'd', 'ot', 'tb', 'bl', 'dl', 'mtp', 'nor', 'nrr',
        'su', 'bs', 'rtp', 'cid', 'pr', 'sf', 'sid', 'st', 'v', 'msd', 'sn',
    ],
};

const TIMEOUTS = {
    REQUEST_COLLECTION: 15000,
    PLAYBACK_DURATION: 5000,
};

function formatIssues(result) {
    return result.issues.map((i) => `  [${i.severity}] ${i.key ? i.key + ': ' : ''}${i.message}`).join('\n');
}

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    // ─── CMCD Query Mode ────────────────────────────────────────────────

    describe(`CMCD V2 Query Mode - ${item.name} - ${mpd}`, () => {
        let playerAdapter;
        let collector;

        before(() => {
            collector = new CmcdRequestCollector();
            collector.attach();
            const settings = {
                streaming: {
                    cmcd: { ...DEFAULT_CMCD_V2_CONFIG, mode: 'query' },
                },
            };
            playerAdapter = initializeDashJsAdapter(item, mpd, settings);
        });

        after(() => {
            collector.detach();
            if (playerAdapter) {
                playerAdapter.destroy();
            }
        });

        it('Checking playing state', async () => {
            await checkIsPlaying(playerAdapter, true);
        });

        it('Checking progressing state', async () => {
            await checkIsProgressing(playerAdapter);
        });

        it('Manifest requests carry CMCD query params with v=2, ot, sid, cid', async () => {
            await collector.waitForRequests('segment', 3, TIMEOUTS.REQUEST_COLLECTION);

            const manifests = collector.getRequests('manifest');
            expect(manifests.length).to.be.greaterThan(0);

            const result = validateCmcdRequest(manifests[0].httpRequest, { version: 2 });
            expect(result.valid, `CMCD validation failed:\n${formatIssues(result)}`).to.be.true;
            expect(result.data.v).to.equal(2);
            expect(result.data.ot).to.not.be.undefined;
            expect(result.data.sid).to.equal('test-session-id');
            expect(result.data.cid).to.equal('test-content-id');
        });

        it('Init segment requests carry CMCD query params with ot, sid, cid, v=2', async function () {
            await collector.waitForRequests('segment', 3, TIMEOUTS.REQUEST_COLLECTION);

            const initSegments = collector.getRequests('segment').filter((r) => /_0\.(m4s|m4v|m4a|mp4)/i.test(r.httpRequest.url));
            if (initSegments.length === 0) {
                this.skip();
            }

            const result = validateCmcdRequest(initSegments[0].httpRequest, { version: 2 });
            expect(result.valid, `CMCD validation failed:\n${formatIssues(result)}`).to.be.true;
            expect(result.data.ot).to.not.be.undefined;
            expect(result.data.sid).to.equal('test-session-id');
            expect(result.data.cid).to.equal('test-content-id');
        });

        it('sn increments across successive requests', async () => {
            await collector.waitForRequests('segment', 3, TIMEOUTS.REQUEST_COLLECTION);

            const allRequests = collector.getRequests().filter((r) => r.reportingMode === 'query');
            const parsed = allRequests.map((r) => validateCmcdRequest(r.httpRequest, { version: 2 }).data);
            const withSn = parsed.filter((d) => d.sn !== undefined);
            expect(withSn.length).to.be.at.least(2);

            for (let i = 1; i < withSn.length; i++) {
                expect(withSn[i].sn).to.be.greaterThan(withSn[i - 1].sn);
            }
        });

        it('sf is d (DASH)', async () => {
            await collector.waitForRequests('segment', 3, TIMEOUTS.REQUEST_COLLECTION);

            const allRequests = collector.getRequests().filter((r) => r.reportingMode === 'query');
            const parsed = allRequests.map((r) => validateCmcdRequest(r.httpRequest, { version: 2 }).data);
            const withSf = parsed.filter((d) => d.sf !== undefined);
            expect(withSf.length).to.be.greaterThan(0);

            for (const data of withSf) {
                expect(data.sf).to.equal('d');
            }
        });

        it('st is v for VOD', async () => {
            await collector.waitForRequests('segment', 3, TIMEOUTS.REQUEST_COLLECTION);

            const allRequests = collector.getRequests().filter((r) => r.reportingMode === 'query');
            const parsed = allRequests.map((r) => validateCmcdRequest(r.httpRequest, { version: 2 }).data);
            const withSt = parsed.filter((d) => d.st !== undefined);
            expect(withSt.length).to.be.greaterThan(0);

            for (const data of withSt) {
                expect(data.st).to.equal('v');
            }
        });

        it('CMCD query payloads pass spec validation', async () => {
            await collector.waitForRequests('segment', 3, TIMEOUTS.REQUEST_COLLECTION);

            const queryRequests = collector.getRequests().filter((r) => r.reportingMode === 'query');
            expect(queryRequests.length).to.be.greaterThan(0);

            for (const req of queryRequests) {
                const result = validateCmcdRequest(req.httpRequest, { version: 2 });
                expect(result.valid, `CMCD validation failed for ${req.httpRequest.url}:\n${formatIssues(result)}`).to.be.true;
            }
        });

        it('Expect no critical errors to be thrown', () => {
            checkNoCriticalErrors(playerAdapter);
        });
    });

    // ─── CMCD Header Mode ───────────────────────────────────────────────

    describe(`CMCD V2 Header Mode - ${item.name} - ${mpd}`, () => {
        let playerAdapter;
        let collector;

        before(() => {
            collector = new CmcdRequestCollector();
            collector.attach();
            const settings = {
                streaming: {
                    cmcd: { ...DEFAULT_CMCD_V2_CONFIG, mode: 'headers' },
                },
            };
            playerAdapter = initializeDashJsAdapter(item, mpd, settings);
        });

        after(() => {
            collector.detach();
            if (playerAdapter) {
                playerAdapter.destroy();
            }
        });

        it('Checking playing state', async () => {
            await checkIsPlaying(playerAdapter, true);
        });

        it('CMCD headers present on manifest requests with v=2', async () => {
            await collector.waitForRequests('segment', 3, TIMEOUTS.REQUEST_COLLECTION);

            const manifests = collector.getRequests('manifest');
            expect(manifests.length).to.be.greaterThan(0);

            const result = validateCmcdRequest(manifests[0].httpRequest, { version: 2 });
            expect(result.valid, `CMCD header validation failed:\n${formatIssues(result)}`).to.be.true;
            expect(result.data.v).to.equal(2);
        });

        it('CMCD headers present on init segment requests', async function () {
            await collector.waitForRequests('segment', 3, TIMEOUTS.REQUEST_COLLECTION);

            const initSegments = collector.getRequests('segment').filter((r) => /_0\.(m4s|m4v|m4a|mp4)/i.test(r.httpRequest.url));
            if (initSegments.length === 0) {
                this.skip();
            }

            const result = validateCmcdRequest(initSegments[0].httpRequest, { version: 2 });
            expect(result.valid, `CMCD header validation failed:\n${formatIssues(result)}`).to.be.true;
            expect(result.data.ot).to.not.be.undefined;
            expect(result.data.sid).to.equal('test-session-id');
        });

        it('Keys distributed across correct header shards (validateCmcdRequest)', async () => {
            await collector.waitForRequests('segment', 3, TIMEOUTS.REQUEST_COLLECTION);

            const headerRequests = collector.getRequests().filter((r) => r.reportingMode === 'header');
            expect(headerRequests.length).to.be.greaterThan(0);

            for (const req of headerRequests) {
                const result = validateCmcdRequest(req.httpRequest, { version: 2 });
                expect(result.valid, `CMCD header validation failed for ${req.httpRequest.url}:\n${formatIssues(result)}`).to.be.true;
            }
        });

        it('No CMCD= query params when in header mode', async () => {
            await collector.waitForRequests('segment', 3, TIMEOUTS.REQUEST_COLLECTION);

            const headerReqs = collector.getRequests().filter((r) => r.reportingMode === 'header');
            const queryReqs = collector.getRequests().filter((r) => r.reportingMode === 'query');
            expect(queryReqs.length).to.equal(0);
            expect(headerReqs.length).to.be.greaterThan(0);
        });

        it('Expect no critical errors to be thrown', () => {
            checkNoCriticalErrors(playerAdapter);
        });
    });

    // ─── CMCD Event Mode ────────────────────────────────────────────────

    describe(`CMCD V2 Event Mode - ${item.name} - ${mpd}`, () => {

        describe('Response-received events (e=rr)', () => {
            let playerAdapter;
            let collector;

            before(function () {
                this.timeout(60000);
                const targetUrl = `${EVENT_TARGET_BASE}/rr`;
                collector = new CmcdRequestCollector();
                collector.attach({ eventTargetUrls: [targetUrl] });
                const settings = {
                    streaming: {
                        cmcd: {
                            ...DEFAULT_CMCD_V2_CONFIG,
                            mode: 'query',
                            eventTargets: [
                                {
                                    enabled: true,
                                    url: targetUrl,
                                    enabledKeys: ['url', 'rc', 'msd', 'e', 'ts', 'sn'],
                                    sendResponseReceivedForRequestTypes: ['segment'],
                                    events: ['rr'],
                                },
                            ],
                        },
                    },
                };
                playerAdapter = initializeDashJsAdapter(item, mpd, settings);
            });

            after(() => {
                collector.detach();
                if (playerAdapter) {
                    playerAdapter.destroy();
                }
            });

            it('Checking playing state', async () => {
                await checkIsPlaying(playerAdapter, true);
            });

            it('POST to configured target with e=rr', async function () {
                this.timeout(30000);
                await collector.waitForRequests('event', 2, TIMEOUTS.REQUEST_COLLECTION);

                const events = collector.getRequests('event');
                expect(events.length).to.be.at.least(1);

                const allEvents = events.flatMap((r) => validateCmcdEvents(r.httpRequest.body, { version: 2 }).data || []);
                const rrEvents = allEvents.filter((d) => d.e === 'rr');
                expect(rrEvents.length).to.be.at.least(1);
                expect(rrEvents.every((d) => !d.url.includes('.mpd'))).to.be.true;
            });
        });

        describe('Play-state events (e=ps)', () => {
            let playerAdapter;
            let collector;

            before(function () {
                this.timeout(60000);
                const targetUrl = `${EVENT_TARGET_BASE}/ps`;
                collector = new CmcdRequestCollector();
                collector.attach({ eventTargetUrls: [targetUrl] });
                const settings = {
                    streaming: {
                        cmcd: {
                            ...DEFAULT_CMCD_V2_CONFIG,
                            mode: 'query',
                            eventTargets: [
                                {
                                    enabled: true,
                                    url: targetUrl,
                                    enabledKeys: ['e', 'sta', 'msd', 'ts', 'sn'],
                                    events: ['ps'],
                                },
                            ],
                        },
                    },
                };
                playerAdapter = initializeDashJsAdapter(item, mpd, settings);
            });

            after(() => {
                collector.detach();
                if (playerAdapter) {
                    playerAdapter.destroy();
                }
            });

            it('Checking playing state', async () => {
                await checkIsPlaying(playerAdapter, true);
            });

            it('POST on state changes with sta defined', async function () {
                this.timeout(30000);
                await collector.waitForRequests('event', 1, TIMEOUTS.REQUEST_COLLECTION);

                const events = collector.getRequests('event');
                expect(events.length).to.be.at.least(1);

                const results = events.map((r) => validateCmcdEvents(r.httpRequest.body, { version: 2 }));

                for (const result of results) {
                    expect(result.valid, `Play-state event validation failed:\n${formatIssues(result)}`).to.be.true;
                }

                const psEvents = results.flatMap((r) => r.data || []).filter((d) => d.e === 'ps');
                expect(psEvents.length).to.be.at.least(1);

                for (const d of psEvents) {
                    expect(d.sta).to.not.be.undefined;
                }
            });
        });

        describe('Time interval events', () => {
            let playerAdapter;
            let collector;

            before(function () {
                this.timeout(90000);
                const targetUrl = `${EVENT_TARGET_BASE}/ti`;
                collector = new CmcdRequestCollector();
                collector.attach({ eventTargetUrls: [targetUrl] });
                const settings = {
                    streaming: {
                        cmcd: {
                            ...DEFAULT_CMCD_V2_CONFIG,
                            mode: 'query',
                            eventTargets: [
                                {
                                    enabled: true,
                                    url: targetUrl,
                                    enabledKeys: ['e', 'ts', 'sn'],
                                    events: ['t'],
                                    interval: 3,
                                },
                            ],
                        },
                    },
                };
                playerAdapter = initializeDashJsAdapter(item, mpd, settings);
            });

            after(() => {
                collector.detach();
                if (playerAdapter) {
                    playerAdapter.destroy();
                }
            });

            it('Checking playing state', async () => {
                await checkIsPlaying(playerAdapter, true);
            });

            it('Fire periodically', async function () {
                this.timeout(60000);
                // Wait long enough for at least 2 time interval events (3s interval)
                await playerAdapter.sleep(8000);
                await collector.waitForRequests('event', 2, 20000);

                const allEvents = collector.getRequests('event')
                    .flatMap((r) => validateCmcdEvents(r.httpRequest.body, { version: 2 }).data || []);
                const tiEvents = allEvents.filter((d) => d.e === 't');
                expect(tiEvents.length).to.be.at.least(2);
            });
        });

        describe('POST format and validation', () => {
            let playerAdapter;
            let collector;

            before(function () {
                this.timeout(60000);
                const targetUrl = `${EVENT_TARGET_BASE}/all`;
                collector = new CmcdRequestCollector();
                collector.attach({ eventTargetUrls: [targetUrl] });
                const settings = {
                    streaming: {
                        cmcd: {
                            ...DEFAULT_CMCD_V2_CONFIG,
                            mode: 'query',
                            eventTargets: [
                                {
                                    enabled: true,
                                    url: targetUrl,
                                    enabledKeys: ['e', 'ts', 'sn', 'sta', 'url', 'rc'],
                                    events: ['ps', 'rr'],
                                    sendResponseReceivedForRequestTypes: ['mpd', 'segment'],
                                },
                            ],
                        },
                    },
                };
                playerAdapter = initializeDashJsAdapter(item, mpd, settings);
            });

            after(() => {
                collector.detach();
                if (playerAdapter) {
                    playerAdapter.destroy();
                }
            });

            it('Checking playing state', async () => {
                await checkIsPlaying(playerAdapter, true);
            });

            it('POST content type is application/cmcd', async function () {
                this.timeout(30000);
                await collector.waitForRequests('event', 1, TIMEOUTS.REQUEST_COLLECTION);

                const events = collector.getRequests('event');
                expect(events.length).to.be.at.least(1);

                for (const evt of events) {
                    const contentType = evt.httpRequest.headers['content-type'] || '';
                    expect(contentType).to.include('application/cmcd');
                }
            });

            it('POST bodies pass CMCD event spec validation', async function () {
                this.timeout(30000);
                await collector.waitForRequests('event', 1, TIMEOUTS.REQUEST_COLLECTION);

                const events = collector.getRequests('event');
                expect(events.length).to.be.at.least(1);

                for (const evt of events) {
                    const result = validateCmcdEvents(evt.httpRequest.body, { version: 2 });
                    expect(result.valid, `CMCD event validation failed for POST to ${evt.httpRequest.url}:\n${formatIssues(result)}`).to.be.true;
                }
            });

            it('sn increments across event POSTs', async function () {
                this.timeout(30000);
                await collector.waitForRequests('event', 3, TIMEOUTS.REQUEST_COLLECTION);

                const withSn = collector.getRequests('event')
                    .flatMap((r) => validateCmcdEvents(r.httpRequest.body, { version: 2 }).data || [])
                    .filter((d) => d.sn !== undefined);
                expect(withSn.length).to.be.at.least(2);

                for (let i = 1; i < withSn.length; i++) {
                    expect(withSn[i].sn).to.be.greaterThan(withSn[i - 1].sn);
                }
            });
        });
    });

    // ─── CMCD Key Filtering ─────────────────────────────────────────────

    describe(`CMCD V2 Key Filtering - ${item.name} - ${mpd}`, () => {

        describe('Only configured enabledKeys appear', () => {
            let playerAdapter;
            let collector;
            const enabledKeys = ['ot', 'sid', 'v', 'sn'];

            before(() => {
                collector = new CmcdRequestCollector();
                collector.attach();
                const settings = {
                    streaming: {
                        cmcd: {
                            ...DEFAULT_CMCD_V2_CONFIG,
                            mode: 'query',
                            enabledKeys,
                        },
                    },
                };
                playerAdapter = initializeDashJsAdapter(item, mpd, settings);
            });

            after(() => {
                collector.detach();
                if (playerAdapter) {
                    playerAdapter.destroy();
                }
            });

            it('Checking playing state', async () => {
                await checkIsPlaying(playerAdapter, true);
            });

            it('Only configured keys appear in query mode', async () => {
                await collector.waitForRequests('segment', 3, TIMEOUTS.REQUEST_COLLECTION);

                const queryRequests = collector.getRequests().filter((r) => r.reportingMode === 'query');
                expect(queryRequests.length).to.be.greaterThan(0);

                for (const req of queryRequests) {
                    const result = validateCmcdRequest(req.httpRequest, { version: 2 });
                    const keys = Object.keys(result.data);
                    for (const key of keys) {
                        expect(
                            enabledKeys.includes(key),
                            `Unexpected key "${key}" found. Expected only: ${enabledKeys.join(', ')}`
                        ).to.be.true;
                    }
                }
            });
        });

        describe('Empty enabledKeys produces no CMCD data', () => {
            let playerAdapter;
            let collector;

            before(() => {
                collector = new CmcdRequestCollector();
                collector.attach();
                const settings = {
                    streaming: {
                        cmcd: {
                            ...DEFAULT_CMCD_V2_CONFIG,
                            mode: 'query',
                            enabledKeys: [],
                        },
                    },
                };
                playerAdapter = initializeDashJsAdapter(item, mpd, settings);
            });

            after(() => {
                collector.detach();
                if (playerAdapter) {
                    playerAdapter.destroy();
                }
            });

            it('Checking playing state', async () => {
                await checkIsPlaying(playerAdapter, true);
            });

            it('No CMCD data appended to requests', async () => {
                await playerAdapter.sleep(5000);
                const queryRequests = collector.getRequests().filter((r) => r.reportingMode === 'query');
                expect(queryRequests.length).to.equal(0);
            });
        });

        describe('All default keys appear when no filter is set', () => {
            let playerAdapter;
            let collector;

            before(() => {
                collector = new CmcdRequestCollector();
                collector.attach();
                const settings = {
                    streaming: {
                        cmcd: {
                            ...DEFAULT_CMCD_V2_CONFIG,
                            mode: 'query',
                        },
                    },
                };
                playerAdapter = initializeDashJsAdapter(item, mpd, settings);
            });

            after(() => {
                collector.detach();
                if (playerAdapter) {
                    playerAdapter.destroy();
                }
            });

            it('Checking playing state', async () => {
                await checkIsPlaying(playerAdapter, true);
            });

            it('Core keys appear across requests', async () => {
                await collector.waitForRequests('segment', 3, TIMEOUTS.REQUEST_COLLECTION);

                const allSeenKeys = new Set();
                const queryRequests = collector.getRequests().filter((r) => r.reportingMode === 'query');
                for (const req of queryRequests) {
                    const result = validateCmcdRequest(req.httpRequest, { version: 2 });
                    for (const key of Object.keys(result.data)) {
                        allSeenKeys.add(key);
                    }
                }

                const expectedKeys = ['ot', 'sid', 'v'];
                for (const key of expectedKeys) {
                    expect(
                        allSeenKeys.has(key),
                        `Expected key "${key}" to appear in at least one request`
                    ).to.be.true;
                }
            });

        });
    });

    // ─── CMCD Version ───────────────────────────────────────────────────

    describe(`CMCD V2 Version - ${item.name} - ${mpd}`, () => {

        describe('v=2 in query mode', () => {
            let playerAdapter;
            let collector;

            before(() => {
                collector = new CmcdRequestCollector();
                collector.attach();
                const settings = {
                    streaming: {
                        cmcd: { ...DEFAULT_CMCD_V2_CONFIG, mode: 'query' },
                    },
                };
                playerAdapter = initializeDashJsAdapter(item, mpd, settings);
            });

            after(() => {
                collector.detach();
                if (playerAdapter) {
                    playerAdapter.destroy();
                }
            });

            it('Checking playing state', async () => {
                await checkIsPlaying(playerAdapter, true);
            });

            it('v=2 present in query mode payloads', async () => {
                await collector.waitForRequests('segment', 3, TIMEOUTS.REQUEST_COLLECTION);

                const queryRequests = collector.getRequests().filter((r) => r.reportingMode === 'query');
                expect(queryRequests.length).to.be.greaterThan(0);

                const manifests = collector.getRequests('manifest');
                expect(manifests.length).to.be.greaterThan(0);

                const result = validateCmcdRequest(manifests[0].httpRequest, { version: 2 });
                expect(result.valid, `CMCD v2 query validation failed:\n${formatIssues(result)}`).to.be.true;
                expect(result.data.v).to.equal(2);
            });
        });

        describe('v=2 in header mode', () => {
            let playerAdapter;
            let collector;

            before(() => {
                collector = new CmcdRequestCollector();
                collector.attach();
                const settings = {
                    streaming: {
                        cmcd: { ...DEFAULT_CMCD_V2_CONFIG, mode: 'headers' },
                    },
                };
                playerAdapter = initializeDashJsAdapter(item, mpd, settings);
            });

            after(() => {
                collector.detach();
                if (playerAdapter) {
                    playerAdapter.destroy();
                }
            });

            it('Checking playing state', async () => {
                await checkIsPlaying(playerAdapter, true);
            });

            it('v=2 present in header mode payloads', async () => {
                await collector.waitForRequests('segment', 3, TIMEOUTS.REQUEST_COLLECTION);

                const headerRequests = collector.getRequests().filter((r) => r.reportingMode === 'header');
                expect(headerRequests.length).to.be.greaterThan(0);

                const manifests = collector.getRequests('manifest');
                expect(manifests.length).to.be.greaterThan(0);

                const result = validateCmcdRequest(manifests[0].httpRequest, { version: 2 });
                expect(result.valid, `CMCD v2 header validation failed:\n${formatIssues(result)}`).to.be.true;
                expect(result.data.v).to.equal(2);
            });
        });

        describe('v1 regression', () => {
            let playerAdapter;
            let collector;

            before(() => {
                collector = new CmcdRequestCollector();
                collector.attach();
                const settings = {
                    streaming: {
                        cmcd: {
                            version: 1,
                            enabled: true,
                            sid: 'test-session-id',
                            cid: 'test-content-id',
                            mode: 'query',
                            enabledKeys: [
                                'br', 'd', 'ot', 'tb', 'bl', 'dl', 'mtp',
                                'su', 'bs', 'rtp', 'cid', 'pr', 'sf', 'sid', 'st', 'v',
                            ],
                        },
                    },
                };
                playerAdapter = initializeDashJsAdapter(item, mpd, settings);
            });

            after(() => {
                collector.detach();
                if (playerAdapter) {
                    playerAdapter.destroy();
                }
            });

            it('Checking playing state', async () => {
                await checkIsPlaying(playerAdapter, true);
            });

            it('v absent or 1 in v1 mode', async () => {
                await collector.waitForRequests('segment', 1, TIMEOUTS.REQUEST_COLLECTION);

                const queryRequests = collector.getRequests().filter((r) => r.reportingMode === 'query');
                expect(queryRequests.length).to.be.greaterThan(0);

                for (const req of queryRequests) {
                    const result = validateCmcdRequest(req.httpRequest, { version: 1 });
                    expect(
                        result.data.v === undefined || result.data.v === 1,
                        `Expected v to be undefined or 1, got ${result.data.v}`
                    ).to.be.true;
                }
            });
        });
    });
});
