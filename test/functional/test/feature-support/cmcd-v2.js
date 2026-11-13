import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {
    checkIsPlaying,
    checkIsProgressing,
    checkNoCriticalErrors,
    initializeDashJsAdapter,
    initializeDashJsAdapterWithoutAttachSource,
    playForDuration,
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
    // The rr url carries the CMCD query of the request, so compare without the query
    const isManifestUrl = (url) => typeof url === 'string' && url.split('?')[0] === mpd.split('?')[0];

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
                                    responseReceivedTypes: ['mpd', 'segment'],
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
                expect(rrEvents.some((d) => isManifestUrl(d.url)), 'rr event for the manifest').to.be.true;
            });
        });

        describe('Response-received filter (responseReceivedTypes)', () => {
            let playerAdapter;
            let collector;

            before(function () {
                this.timeout(60000);
                const targetUrl = `${EVENT_TARGET_BASE}/rr-filter`;
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
                                    enabledKeys: ['url', 'rc', 'e', 'ts', 'sn'],
                                    responseReceivedTypes: ['segment'],
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

            it('Only segment responses trigger rr events', async function () {
                this.timeout(30000);
                await collector.waitForRequests('event', 2, TIMEOUTS.REQUEST_COLLECTION);

                const rrEvents = collector.getRequests('event')
                    .flatMap((r) => validateCmcdEvents(r.httpRequest.body, { version: 2 }).data || [])
                    .filter((d) => d.e === 'rr');
                expect(rrEvents.length).to.be.at.least(1);
                expect(rrEvents.filter((d) => isManifestUrl(d.url)), 'rr events for the manifest').to.be.empty;
            });
        });

        describe('Player error codes (ec)', () => {
            const DOWNLOAD_ERROR_ID_CONTENT_CODE = 27;
            let playerAdapter;
            let collector;
            let failNextVideoSegment = false;
            let errorCodes = [];

            function getEventReports() {
                return collector.getRequests('event').flatMap((r) => validateCmcdEvents(r.httpRequest.body, { version: 2 }).data || []);
            }

            function getRequestReports() {
                return collector.getRequests().filter((r) => r.reportingMode === 'query').map((r) => validateCmcdRequest(r.httpRequest, { version: 2 }).data);
            }

            before(function () {
                this.timeout(60000);
                const targetUrl = `${EVENT_TARGET_BASE}/ec`;
                collector = new CmcdRequestCollector();
                collector.attach({ eventTargetUrls: [targetUrl] });
                const settings = {
                    streaming: {
                        // Without retries a single failed segment request raises the error right away
                        retryAttempts: { MediaSegment: 0 },
                        // A small buffer target keeps segment requests flowing after the error
                        buffer: { bufferTimeDefault: 8, bufferTimeAtTopQuality: 8, bufferTimeAtTopQualityLongForm: 8 },
                        cmcd: {
                            ...DEFAULT_CMCD_V2_CONFIG,
                            mode: 'query',
                            enabledKeys: [...DEFAULT_CMCD_V2_CONFIG.enabledKeys, 'ec'],
                            eventTargets: [
                                {
                                    enabled: true,
                                    url: targetUrl,
                                    enabledKeys: ['e', 'ec', 'sn', 'url'],
                                    responseReceivedTypes: ['segment'],
                                    events: ['e', 'rr'],
                                },
                            ],
                        },
                    },
                };
                playerAdapter = initializeDashJsAdapterWithoutAttachSource(item, settings);
                playerAdapter.player.on('error', (e) => errorCodes.push(e.error.code));
                // Runs after the CMCD request interceptor, so the failing request was already reported
                playerAdapter.player.addRequestInterceptor((request) => {
                    const dashRequest = request.customData.request;
                    if (failNextVideoSegment && dashRequest.type === 'MediaSegment' && dashRequest.mediaType === 'video') {
                        failNextVideoSegment = false;
                        request.url = 'http://127.0.0.1:1/unreachable.m4s';
                    }
                    return Promise.resolve(request);
                });
                playerAdapter.attachSource(mpd);
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
                // Fail a segment mid-stream, not the first one
                await checkIsProgressing(playerAdapter);
            });

            it('No reports carry ec before an error occurred', async () => {
                await collector.waitForRequests('segment', 3, TIMEOUTS.REQUEST_COLLECTION);

                expect(getRequestReports().filter((d) => d.ec !== undefined)).to.be.empty;
                expect(getEventReports().filter((d) => d.ec !== undefined)).to.be.empty;
            });

            it('A failed segment request raises a download error', async function () {
                this.timeout(30000);
                errorCodes = [];
                failNextVideoSegment = true;

                const deadline = Date.now() + TIMEOUTS.REQUEST_COLLECTION;
                while (!errorCodes.includes(DOWNLOAD_ERROR_ID_CONTENT_CODE) && Date.now() < deadline) {
                    await playForDuration(200);
                }
                expect(errorCodes).to.include(DOWNLOAD_ERROR_ID_CONTENT_CODE);

                // Without BaseURL failover dash.js does not request the failed segment again. Seeking past the buffered range restarts the scheduling.
                playerAdapter.seek(playerAdapter.getCurrentTime() + 20);

                // Collect the reports that follow the error
                const segmentCount = collector.getRequests('segment').length;
                await collector.waitForRequests('segment', segmentCount + 3, TIMEOUTS.REQUEST_COLLECTION);
            });

            it('Exactly one request report carries the error code as an inner list of strings', () => {
                const withEc = getRequestReports().filter((d) => d.ec !== undefined);

                expect(withEc).to.have.lengthOf(1);
                expect(withEc[0].ec).to.deep.equal([String(DOWNLOAD_ERROR_ID_CONTENT_CODE)]);
            });

            it('Exactly one event report carries the error code, the error event', () => {
                const withEc = getEventReports().filter((d) => d.ec !== undefined);

                expect(withEc).to.have.lengthOf(1);
                expect(withEc[0].e).to.equal('e');
                expect(withEc[0].ec).to.deep.equal([String(DOWNLOAD_ERROR_ID_CONTENT_CODE)]);
            });

            it('Event reports after the error event do not repeat ec', async function () {
                this.timeout(30000);
                const getReportsAfterError = () => {
                    const reports = getEventReports();
                    const errorIndex = reports.findIndex((d) => d.e === 'e');
                    return reports.slice(errorIndex + 1);
                };

                // rr reports are sent asynchronously, wait until one arrived after the error event
                const deadline = Date.now() + TIMEOUTS.REQUEST_COLLECTION;
                while (!getReportsAfterError().some((d) => d.e === 'rr') && Date.now() < deadline) {
                    await playForDuration(200);
                }
                const later = getReportsAfterError();

                expect(later.filter((d) => d.e === 'rr')).to.not.be.empty;
                later.forEach((d) => expect(d).to.not.have.property('ec'));
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
                                    responseReceivedTypes: ['mpd', 'segment'],
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
