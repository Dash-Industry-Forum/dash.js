import C2paValidationCoordinator from '../../../../src/streaming/c2pa/C2paValidationCoordinator.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';
import {expect} from 'chai';

const context = {};

function createEngine({initValidation, throwOnInit, segmentOutcome}) {
    const calls = {init: 0, vsi: 0, manifestBox: 0};
    const engine = {
        validateC2paInitSegment: async () => {
            calls.init++;
            if (throwOnInit) {
                throw new Error('No C2PA UUID box found in the provided bytes');
            }
            return initValidation;
        },
        validateC2paSegment: async () => {
            calls.vsi++;
            return segmentOutcome !== undefined ? segmentOutcome : null;
        },
        validateC2paManifestBoxSegment: async () => {
            calls.manifestBox++;
            return {};
        }
    };
    return {engine, calls};
}

function vsiInitValidation(sessionKeys) {
    return {
        manifest: {signatureInfo: {issuer: 'CN=Test Issuer'}, assertions: []},
        manifestId: 'urn:c2pa:manifest-1',
        sessionKeys,
        isValid: true,
        errorCodes: []
    };
}

function vsiSegmentOutcome({isValid, errorCodes}) {
    return {
        result: {
            sequenceNumber: 289,
            manifestId: 'urn:c2pa:manifest-1',
            bmffHashHex: 'abcd',
            kidHex: 'key-1',
            sequenceResult: {isValid: true, reason: 'valid'},
            isValid,
            errorCodes
        },
        nextSequenceState: {lastSequenceNumber: 289, seenSequences: new Set([289])}
    };
}

function createCoordinator({engine, method = 'auto'}) {
    const events = [];
    const eventBus = {
        trigger: (type, payload, filters) => events.push({type, payload, filters})
    };
    const settings = {
        get: () => ({streaming: {c2pa: {method}}})
    };
    const coordinator = C2paValidationCoordinator(context).create({
        eventBus,
        settings,
        loadEngine: () => Promise.resolve(engine)
    });
    return {coordinator, events};
}

function initInput(trackKey, mediaType) {
    return {kind: 'init', mediaType: mediaType || 'video', trackKey, bytes: new Uint8Array([1, 2, 3]), segmentNumber: NaN};
}

function mediaInput(trackKey, segmentNumber) {
    return {kind: 'media', mediaType: 'video', trackKey, bytes: new Uint8Array([4, 5, 6]), segmentNumber};
}

describe('C2paValidationCoordinator', function () {

    describe('init-segment classification', function () {

        it('should classify a §19.4 init with session keys as VSI', async () => {
            const {engine} = createEngine({
                initValidation: {
                    manifest: {signatureInfo: {issuer: 'CN=Test Issuer'}, assertions: []},
                    manifestId: 'urn:c2pa:manifest-1',
                    sessionKeys: [{kid: 'key-1'}, {kid: 'key-2'}],
                    isValid: true,
                    errorCodes: []
                }
            });
            const {coordinator, events} = createCoordinator({engine});

            await coordinator.handleSegment(initInput('stream3'));

            expect(events.length).to.equal(1);
            expect(events[0].type).to.equal(MediaPlayerEvents.C2PA_INIT_PROCESSED);
            expect(events[0].payload.trackKey).to.equal('stream3');
            expect(events[0].payload.method).to.equal('19.4');
            expect(events[0].payload.manifestId).to.equal('urn:c2pa:manifest-1');
            expect(events[0].payload.issuer).to.equal('CN=Test Issuer');
            expect(events[0].payload.sessionKeyCount).to.equal(2);
            expect(events[0].payload.isValid).to.equal(true);
        });

        it('should classify a §19.3 init without session keys as ManifestBox', async () => {
            const {engine} = createEngine({
                initValidation: {
                    manifest: {signatureInfo: {issuer: 'CN=Test Issuer'}, assertions: []},
                    manifestId: 'urn:c2pa:manifest-2',
                    sessionKeys: [],
                    isValid: true,
                    errorCodes: []
                }
            });
            const {coordinator, events} = createCoordinator({engine});

            await coordinator.handleSegment(initInput('stream3'));

            expect(events.length).to.equal(1);
            expect(events[0].payload.method).to.equal('19.3');
            expect(events[0].payload.sessionKeyCount).to.equal(0);
            expect(events[0].payload.manifestId).to.equal('urn:c2pa:manifest-2');
        });

        it('should map CML error codes to strings', async () => {
            const {engine} = createEngine({
                initValidation: {
                    manifest: {signatureInfo: {issuer: null}, assertions: []},
                    manifestId: 'urn:c2pa:manifest-3',
                    sessionKeys: [],
                    isValid: false,
                    errorCodes: ['livevideo.init.invalid']
                }
            });
            const {coordinator, events} = createCoordinator({engine});

            await coordinator.handleSegment(initInput('stream3'));

            expect(events[0].payload.errorCodes).to.deep.equal(['livevideo.init.invalid']);
            expect(events[0].payload.isValid).to.equal(false);
        });
    });

    describe('non-C2PA init in auto mode', function () {

        it('should emit a no-provenance event and skip the track\'s media segments', async () => {
            const {engine, calls} = createEngine({throwOnInit: true});
            const {coordinator, events} = createCoordinator({engine, method: 'auto'});

            await coordinator.handleSegment(initInput('stream3'));

            expect(events.length).to.equal(1);
            expect(events[0].type).to.equal(MediaPlayerEvents.C2PA_INIT_PROCESSED);
            expect(events[0].payload.method).to.be.null;
            expect(events[0].payload.sessionKeyCount).to.equal(0);
            expect(events[0].payload.isValid).to.equal(false);

            await coordinator.handleSegment(mediaInput('stream3', 289));
            await coordinator.handleSegment(mediaInput('stream3', 290));

            expect(events.length).to.equal(1);
            expect(calls.init).to.equal(1);
            expect(calls.vsi).to.equal(0);
            expect(calls.manifestBox).to.equal(0);
        });
    });

    describe('VSI (§19.4) media-segment validation', function () {

        it('should emit a valid SegmentRecord for a valid VSI segment', async () => {
            const {engine, calls} = createEngine({
                initValidation: vsiInitValidation([{kid: 'key-1'}]),
                segmentOutcome: vsiSegmentOutcome({isValid: true, errorCodes: []})
            });
            const {coordinator, events} = createCoordinator({engine});

            await coordinator.handleSegment(initInput('stream3'));
            await coordinator.handleSegment(mediaInput('stream3', 289));

            expect(calls.vsi).to.equal(1);
            expect(events.length).to.equal(2);
            const record = events[1];
            expect(record.type).to.equal(MediaPlayerEvents.C2PA_SEGMENT_VALIDATED);
            expect(record.payload.status).to.equal('valid');
            expect(record.payload.method).to.equal('19.4');
            expect(record.payload.segmentNumber).to.equal(289);
            expect(record.payload.keyId).to.equal('key-1');
            expect(record.payload.hash).to.equal('abcd');
            expect(record.payload.manifestId).to.equal('urn:c2pa:manifest-1');
            expect(record.payload.issuer).to.equal('CN=Test Issuer');
            expect(record.payload.errorCodes).to.deep.equal([]);
            expect(record.payload.timestamp).to.be.a('number');
        });

        it('should emit an invalid SegmentRecord with the CML error code for a tampered segment', async () => {
            const {engine} = createEngine({
                initValidation: vsiInitValidation([{kid: 'key-1'}]),
                segmentOutcome: vsiSegmentOutcome({isValid: false, errorCodes: ['livevideo.segment.invalid']})
            });
            const {coordinator, events} = createCoordinator({engine});

            await coordinator.handleSegment(initInput('stream3'));
            await coordinator.handleSegment(mediaInput('stream3', 289));

            const record = events[1];
            expect(record.payload.status).to.equal('invalid');
            expect(record.payload.errorCodes).to.deep.equal(['livevideo.segment.invalid']);
        });

        it('should thread the sequence state returned by the engine into the next call', async () => {
            let seenSequenceState = 'unset';
            const {engine} = createEngine({initValidation: vsiInitValidation([{kid: 'key-1'}])});
            engine.validateC2paSegment = async (bytes, sessionKeys, sequenceState) => {
                seenSequenceState = sequenceState;
                return vsiSegmentOutcome({isValid: true, errorCodes: []});
            };
            const {coordinator} = createCoordinator({engine});

            await coordinator.handleSegment(initInput('stream3'));
            await coordinator.handleSegment(mediaInput('stream3', 289));
            expect(seenSequenceState).to.equal(undefined);

            await coordinator.handleSegment(mediaInput('stream3', 290));
            expect(seenSequenceState).to.deep.equal({lastSequenceNumber: 289, seenSequences: new Set([289])});
        });
    });
});
