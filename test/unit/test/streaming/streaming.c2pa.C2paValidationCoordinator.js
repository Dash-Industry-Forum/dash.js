import C2paValidationCoordinator from '../../../../src/streaming/c2pa/C2paValidationCoordinator.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';
import {expect} from 'chai';

const context = {};

function createEngine({initValidation, throwOnInit, segmentOutcome, manifestBoxOutcome}) {
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
            return manifestBoxOutcome !== undefined ? manifestBoxOutcome : null;
        }
    };
    return {engine, calls};
}

function manifestBoxInitValidation() {
    return {
        manifest: {signatureInfo: {issuer: 'CN=Test Issuer'}, assertions: []},
        manifestId: 'urn:c2pa:manifest-0',
        sessionKeys: [],
        isValid: true,
        errorCodes: []
    };
}

function manifestBoxOutcomeFor({isValid, errorCodes, previousManifestId, nextManifestId}) {
    return {
        result: {
            manifest: {signatureInfo: {issuer: 'CN=Test Issuer'}, assertions: []},
            issuer: 'CN=Test Issuer',
            sequenceNumber: 289,
            previousManifestId,
            streamId: 'stream3',
            continuityMethod: 'manifest-id',
            bmffHashHex: 'beef',
            isValid,
            errorCodes
        },
        nextManifestId,
        nextState: {lastStreamId: 'stream3', lastSequenceNumber: 289}
    };
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

function vsiSegmentOutcome({isValid, errorCodes, seq = 289}) {
    return {
        result: {
            sequenceNumber: seq,
            manifestId: 'urn:c2pa:manifest-1',
            bmffHashHex: 'abcd',
            kidHex: 'key-1',
            sequenceResult: {isValid: true, reason: 'valid'},
            isValid,
            errorCodes
        },
        nextSequenceState: {lastSequenceNumber: seq, seenSequences: new Set([seq])}
    };
}

function vsiEngineReturningSequences(seqs) {
    const {engine, calls} = createEngine({initValidation: vsiInitValidation([{kid: 'key-1'}])});
    let index = 0;
    engine.validateC2paSegment = async () => {
        calls.vsi++;
        return vsiSegmentOutcome({isValid: true, errorCodes: [], seq: seqs[index++]});
    };
    return {engine, calls};
}

function createCoordinator({engine, method = 'auto', detector, isCryptoAvailable}) {
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
        detector,
        isCryptoAvailable: isCryptoAvailable || (() => true),
        loadEngine: () => Promise.resolve(engine)
    });
    return {coordinator, events};
}

function eventsOfType(events, type) {
    return events.filter((event) => event.type === type).map((event) => event.payload);
}

function countingDetector(method) {
    const calls = {count: 0};
    const detector = {
        detect: () => {
            calls.count++;
            return {hasC2pa: method !== null, method};
        }
    };
    return {detector, calls};
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

    describe('ManifestBox (§19.3) media-segment validation', function () {

        it('should emit a valid SegmentRecord for a valid ManifestBox segment', async () => {
            const {engine, calls} = createEngine({
                initValidation: manifestBoxInitValidation(),
                manifestBoxOutcome: manifestBoxOutcomeFor({
                    isValid: true,
                    errorCodes: [],
                    previousManifestId: 'urn:c2pa:manifest-0',
                    nextManifestId: 'urn:c2pa:manifest-1'
                })
            });
            const {coordinator, events} = createCoordinator({engine});

            await coordinator.handleSegment(initInput('stream3'));
            await coordinator.handleSegment(mediaInput('stream3', 289));

            expect(calls.manifestBox).to.equal(1);
            const record = events[1];
            expect(record.type).to.equal(MediaPlayerEvents.C2PA_SEGMENT_VALIDATED);
            expect(record.payload.status).to.equal('valid');
            expect(record.payload.method).to.equal('19.3');
            expect(record.payload.manifestId).to.equal('urn:c2pa:manifest-1');
            expect(record.payload.previousManifestId).to.equal('urn:c2pa:manifest-0');
            expect(record.payload.issuer).to.equal('CN=Test Issuer');
            expect(record.payload.hash).to.equal('beef');
            expect(record.payload.keyId).to.be.null;
        });

        it('should emit invalid with the CML error code for a broken manifest-id chain', async () => {
            const {engine} = createEngine({
                initValidation: manifestBoxInitValidation(),
                manifestBoxOutcome: manifestBoxOutcomeFor({
                    isValid: false,
                    errorCodes: ['livevideo.continuityMethod.invalid'],
                    previousManifestId: 'urn:c2pa:unexpected',
                    nextManifestId: 'urn:c2pa:manifest-1'
                })
            });
            const {coordinator, events} = createCoordinator({engine});

            await coordinator.handleSegment(initInput('stream3'));
            await coordinator.handleSegment(mediaInput('stream3', 289));

            expect(events[1].payload.status).to.equal('invalid');
            expect(events[1].payload.errorCodes).to.deep.equal(['livevideo.continuityMethod.invalid']);
        });

        it('should thread lastManifestId across the chain starting from an unknown baseline', async () => {
            const seenLastManifestIds = [];
            const {engine} = createEngine({initValidation: manifestBoxInitValidation()});
            engine.validateC2paManifestBoxSegment = async (bytes, lastManifestId) => {
                seenLastManifestIds.push(lastManifestId);
                return manifestBoxOutcomeFor({
                    isValid: true,
                    errorCodes: [],
                    previousManifestId: lastManifestId,
                    nextManifestId: 'urn:c2pa:manifest-' + seenLastManifestIds.length
                });
            };
            const {coordinator} = createCoordinator({engine});

            await coordinator.handleSegment(initInput('stream3'));
            await coordinator.handleSegment(mediaInput('stream3', 289));
            await coordinator.handleSegment(mediaInput('stream3', 290));

            // The init segment's own manifest is not part of the media-segment chain, so the
            // first media segment a track sees has no baseline to check against (null); the
            // chain only self-anchors from that segment's own manifest id onward.
            expect(seenLastManifestIds).to.deep.equal([null, 'urn:c2pa:manifest-1']);
        });
    });

    describe('lean per-track sequence checks', function () {

        function segmentStatuses(events) {
            return events
                .filter((event) => event.type === MediaPlayerEvents.C2PA_SEGMENT_VALIDATED)
                .map((event) => [event.payload.segmentNumber, event.payload.status]);
        }

        it('should mark a duplicate signed sequence number as replayed', async () => {
            const {engine} = vsiEngineReturningSequences([10, 10]);
            const {coordinator, events} = createCoordinator({engine});

            await coordinator.handleSegment(initInput('stream3'));
            await coordinator.handleSegment(mediaInput('stream3', 1000));
            await coordinator.handleSegment(mediaInput('stream3', 2000));

            expect(segmentStatuses(events)).to.deep.equal([[10, 'valid'], [10, 'replayed']]);
        });

        it('should mark a lower signed sequence number as reordered', async () => {
            const {engine} = vsiEngineReturningSequences([10, 9]);
            const {coordinator, events} = createCoordinator({engine});

            await coordinator.handleSegment(initInput('stream3'));
            await coordinator.handleSegment(mediaInput('stream3', 1000));
            await coordinator.handleSegment(mediaInput('stream3', 2000));

            expect(segmentStatuses(events)).to.deep.equal([[10, 'valid'], [9, 'reordered']]);
        });

        it('should emit missing records for a gap and then validate the current segment', async () => {
            const {engine} = vsiEngineReturningSequences([10, 13]);
            const {coordinator, events} = createCoordinator({engine});

            await coordinator.handleSegment(initInput('stream3'));
            await coordinator.handleSegment(mediaInput('stream3', 1000));
            await coordinator.handleSegment(mediaInput('stream3', 2000));

            expect(segmentStatuses(events)).to.deep.equal([
                [10, 'valid'],
                [11, 'missing'],
                [12, 'missing'],
                [13, 'valid']
            ]);
        });

        it('should keep sequence state independent per track', async () => {
            const {engine} = vsiEngineReturningSequences([10, 10]);
            const {coordinator, events} = createCoordinator({engine});

            await coordinator.handleSegment(initInput('stream3'));
            await coordinator.handleSegment(initInput('stream4'));
            await coordinator.handleSegment(mediaInput('stream3', 1000));
            await coordinator.handleSegment(mediaInput('stream4', 1000));

            expect(segmentStatuses(events)).to.deep.equal([[10, 'valid'], [10, 'valid']]);
        });

        it('should not report a gap when a track resumes after an ABR switch to a sibling representation', async () => {
            const {engine} = vsiEngineReturningSequences([10, 999, 50]);
            const {coordinator, events} = createCoordinator({engine});

            await coordinator.handleSegment(initInput('stream3'));
            await coordinator.handleSegment(mediaInput('stream3', 1000));
            await coordinator.handleSegment(initInput('stream4'));
            await coordinator.handleSegment(mediaInput('stream4', 1000));
            await coordinator.handleSegment(mediaInput('stream3', 2000));

            // stream3 resumes at 50 (far past its last-seen 10) after the ABR switch to
            // stream4 and back; it must read as a fresh baseline, not a 39-segment gap.
            expect(segmentStatuses(events)).to.deep.equal([
                [10, 'valid'],
                [999, 'valid'],
                [50, 'valid']
            ]);
        });
    });

    describe('lifecycle', function () {

        function createValidVsiCoordinator() {
            const {engine} = createEngine({
                initValidation: vsiInitValidation([{kid: 'key-1'}]),
                segmentOutcome: vsiSegmentOutcome({isValid: true, errorCodes: []})
            });
            return createCoordinator({engine});
        }

        it('should not leak sequence state across sources after reset', async () => {
            const {coordinator, events} = createValidVsiCoordinator();

            await coordinator.handleSegment(initInput('stream3'));
            await coordinator.handleSegment(mediaInput('stream3', 289));

            coordinator.reset();

            await coordinator.handleSegment(initInput('stream3'));
            await coordinator.handleSegment(mediaInput('stream3', 289));

            const statuses = eventsOfType(events, MediaPlayerEvents.C2PA_SEGMENT_VALIDATED).map((record) => record.status);
            expect(statuses).to.deep.equal(['valid', 'valid']);
        });

        it('should reset one track\'s sequence while keeping its classification', async () => {
            const {coordinator, events} = createValidVsiCoordinator();

            await coordinator.handleSegment(initInput('stream3'));
            await coordinator.handleSegment(mediaInput('stream3', 289));

            coordinator.resetSequenceForTrack('stream3');

            await coordinator.handleSegment(mediaInput('stream3', 289));

            const statuses = eventsOfType(events, MediaPlayerEvents.C2PA_SEGMENT_VALIDATED).map((record) => record.status);
            expect(statuses).to.deep.equal(['valid', 'valid']);
        });
    });

    describe('error handling and unverified degradation', function () {

        it('should emit unverified without calling the engine when Web Crypto is unavailable', async () => {
            const {engine, calls} = createEngine({
                segmentOutcome: vsiSegmentOutcome({isValid: true, errorCodes: []})
            });
            const {detector} = countingDetector('19.4');
            const {coordinator, events} = createCoordinator({
                engine,
                detector,
                isCryptoAvailable: () => false
            });

            await coordinator.handleSegment(mediaInput('stream3', 289));

            const records = eventsOfType(events, MediaPlayerEvents.C2PA_SEGMENT_VALIDATED);
            expect(records.length).to.equal(1);
            expect(records[0].status).to.equal('unverified');
            expect(records[0].errorCodes).to.deep.equal(['c2pa.cryptoUnavailable']);
            expect(calls.vsi).to.equal(0);

            const errors = eventsOfType(events, MediaPlayerEvents.C2PA_ERROR);
            expect(errors.length).to.equal(1);
            expect(errors[0].errorCodes).to.deep.equal(['c2pa.cryptoUnavailable']);
        });

        it('should report crypto unavailability on the init event without calling the engine', async () => {
            const {engine, calls} = createEngine({initValidation: vsiInitValidation([{kid: 'key-1'}])});
            const {coordinator, events} = createCoordinator({engine, isCryptoAvailable: () => false});

            await coordinator.handleSegment(initInput('stream3'));

            expect(calls.init).to.equal(0);
            const initEvents = eventsOfType(events, MediaPlayerEvents.C2PA_INIT_PROCESSED);
            expect(initEvents[0].method).to.be.null;
            expect(initEvents[0].errorCodes).to.deep.equal(['c2pa.cryptoUnavailable']);
        });

        it('should surface an engine throw as unverified and a C2PA_ERROR, never throwing', async () => {
            const {engine} = createEngine({initValidation: vsiInitValidation([{kid: 'key-1'}])});
            engine.validateC2paSegment = async () => {
                throw new Error('engine exploded');
            };
            const {coordinator, events} = createCoordinator({engine, isCryptoAvailable: () => true});

            await coordinator.handleSegment(initInput('stream3'));
            await coordinator.handleSegment(mediaInput('stream3', 289));

            const records = eventsOfType(events, MediaPlayerEvents.C2PA_SEGMENT_VALIDATED);
            expect(records[0].status).to.equal('unverified');
            expect(records[0].errorCodes).to.deep.equal(['c2pa.validationError']);
            const errors = eventsOfType(events, MediaPlayerEvents.C2PA_ERROR);
            expect(errors[0].message).to.equal('engine exploded');
        });
    });

    describe('forced-method routing', function () {

        it('should emit a mismatch diagnostic when forcing §19.4 on a §19.3 segment', async () => {
            const {engine, calls} = createEngine({
                initValidation: manifestBoxInitValidation(),
                segmentOutcome: null
            });
            const {detector, calls: detectorCalls} = countingDetector('19.3');
            const {coordinator, events} = createCoordinator({engine, method: '19.4', detector});

            await coordinator.handleSegment(initInput('stream3'));
            await coordinator.handleSegment(mediaInput('stream3', 289));

            expect(detectorCalls.count).to.equal(0);
            expect(calls.vsi).to.equal(1);
            expect(events[1].payload.status).to.equal('invalid');
            expect(events[1].payload.method).to.equal('19.4');
            expect(events[1].payload.errorCodes).to.deep.equal(['c2pa.forcedMethodMismatch']);
        });

        it('should emit a mismatch diagnostic when forcing §19.3 on a §19.4 segment', async () => {
            const {engine} = createEngine({initValidation: vsiInitValidation([{kid: 'key-1'}])});
            engine.validateC2paManifestBoxSegment = async () => {
                throw new Error('No C2PA UUID box found in the provided bytes');
            };
            const {detector, calls: detectorCalls} = countingDetector('19.4');
            const {coordinator, events} = createCoordinator({engine, method: '19.3', detector});

            await coordinator.handleSegment(initInput('stream3'));
            await coordinator.handleSegment(mediaInput('stream3', 289));

            expect(detectorCalls.count).to.equal(0);
            expect(events[1].payload.status).to.equal('invalid');
            expect(events[1].payload.method).to.equal('19.3');
            expect(events[1].payload.errorCodes).to.deep.equal(['c2pa.forcedMethodMismatch']);
        });

        it('should validate against the forced method even without prior init state', async () => {
            const {engine} = createEngine({
                segmentOutcome: vsiSegmentOutcome({isValid: true, errorCodes: []})
            });
            const {coordinator, events} = createCoordinator({engine, method: '19.4'});

            await coordinator.handleSegment(mediaInput('stream3', 289));

            expect(events.length).to.equal(1);
            expect(events[0].payload.status).to.equal('valid');
            expect(events[0].payload.method).to.equal('19.4');
        });

        it('should use the detector to classify media segments in auto mode', async () => {
            const {engine} = createEngine({
                initValidation: vsiInitValidation([{kid: 'key-1'}]),
                segmentOutcome: vsiSegmentOutcome({isValid: true, errorCodes: []})
            });
            const {detector, calls: detectorCalls} = countingDetector('19.4');
            const {coordinator, events} = createCoordinator({engine, method: 'auto', detector});

            await coordinator.handleSegment(initInput('stream3'));
            await coordinator.handleSegment(mediaInput('stream3', 289));

            expect(detectorCalls.count).to.equal(1);
            expect(events[1].payload.status).to.equal('valid');
            expect(events[1].payload.method).to.equal('19.4');
        });
    });
});
