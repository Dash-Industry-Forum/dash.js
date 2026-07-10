import C2paValidationCoordinator from '../../../../src/streaming/c2pa/C2paValidationCoordinator.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';
import {expect} from 'chai';

const context = {};

function createEngine({initValidation, throwOnInit}) {
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
            return {};
        },
        validateC2paManifestBoxSegment: async () => {
            calls.manifestBox++;
            return {};
        }
    };
    return {engine, calls};
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
});
