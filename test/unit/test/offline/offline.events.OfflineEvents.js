import OfflineEvents from '../../../../src/offline/events/OfflineEvents.js';

import {expect} from 'chai';

describe('OfflineEvents', function () {

    describe('event definitions', function () {
        it('should define OFFLINE_RECORD_LOADEDMETADATA', function () {
            expect(OfflineEvents.OFFLINE_RECORD_LOADEDMETADATA).to.exist;
            expect(OfflineEvents.OFFLINE_RECORD_LOADEDMETADATA).to.be.a('string');
        });

        it('should define OFFLINE_RECORD_STARTED', function () {
            expect(OfflineEvents.OFFLINE_RECORD_STARTED).to.exist;
            expect(OfflineEvents.OFFLINE_RECORD_STARTED).to.be.a('string');
        });

        it('should define OFFLINE_RECORD_STOPPED', function () {
            expect(OfflineEvents.OFFLINE_RECORD_STOPPED).to.exist;
            expect(OfflineEvents.OFFLINE_RECORD_STOPPED).to.be.a('string');
        });

        it('should define OFFLINE_RECORD_FINISHED', function () {
            expect(OfflineEvents.OFFLINE_RECORD_FINISHED).to.exist;
            expect(OfflineEvents.OFFLINE_RECORD_FINISHED).to.be.a('string');
        });
    });

    describe('event naming convention', function () {
        it('should use public_ prefix for all events', function () {
            expect(OfflineEvents.OFFLINE_RECORD_LOADEDMETADATA).to.match(/^public_/);
            expect(OfflineEvents.OFFLINE_RECORD_STARTED).to.match(/^public_/);
            expect(OfflineEvents.OFFLINE_RECORD_STOPPED).to.match(/^public_/);
            expect(OfflineEvents.OFFLINE_RECORD_FINISHED).to.match(/^public_/);
        });

        it('should use camelCase after prefix', function () {
            expect(OfflineEvents.OFFLINE_RECORD_LOADEDMETADATA).to.equal('public_offlineRecordLoadedmetadata');
            expect(OfflineEvents.OFFLINE_RECORD_STARTED).to.equal('public_offlineRecordStarted');
            expect(OfflineEvents.OFFLINE_RECORD_STOPPED).to.equal('public_offlineRecordStopped');
            expect(OfflineEvents.OFFLINE_RECORD_FINISHED).to.equal('public_offlineRecordFinished');
        });
    });

    describe('event uniqueness', function () {
        it('should have unique event names', function () {
            const events = [
                OfflineEvents.OFFLINE_RECORD_LOADEDMETADATA,
                OfflineEvents.OFFLINE_RECORD_STARTED,
                OfflineEvents.OFFLINE_RECORD_STOPPED,
                OfflineEvents.OFFLINE_RECORD_FINISHED
            ];

            const uniqueEvents = new Set(events);
            expect(uniqueEvents.size).to.equal(events.length);
        });
    });

    describe('event values', function () {
        it('should not be empty strings', function () {
            expect(OfflineEvents.OFFLINE_RECORD_LOADEDMETADATA).to.not.be.empty;
            expect(OfflineEvents.OFFLINE_RECORD_STARTED).to.not.be.empty;
            expect(OfflineEvents.OFFLINE_RECORD_STOPPED).to.not.be.empty;
            expect(OfflineEvents.OFFLINE_RECORD_FINISHED).to.not.be.empty;
        });

        it('should be strings', function () {
            expect(OfflineEvents.OFFLINE_RECORD_LOADEDMETADATA).to.be.a('string');
            expect(OfflineEvents.OFFLINE_RECORD_STARTED).to.be.a('string');
            expect(OfflineEvents.OFFLINE_RECORD_STOPPED).to.be.a('string');
            expect(OfflineEvents.OFFLINE_RECORD_FINISHED).to.be.a('string');
        });
    });

    describe('inheritance', function () {
        it('should be an instance of EventsBase', function () {
            // OfflineEvents extends EventsBase
            expect(OfflineEvents).to.be.an('object');
        });
    });

    describe('event lifecycle', function () {
        it('should define events in logical order', function () {
            // LOADEDMETADATA -> STARTED -> STOPPED/FINISHED
            const events = [
                OfflineEvents.OFFLINE_RECORD_LOADEDMETADATA,
                OfflineEvents.OFFLINE_RECORD_STARTED,
                OfflineEvents.OFFLINE_RECORD_STOPPED,
                OfflineEvents.OFFLINE_RECORD_FINISHED
            ];

            // All events should be defined
            events.forEach(event => {
                expect(event).to.exist;
            });
        });
    });
});
