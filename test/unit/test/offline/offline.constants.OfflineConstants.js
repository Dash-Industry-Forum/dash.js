import OfflineConstants from '../../../../src/offline/constants/OfflineConstants.js';

import {expect} from 'chai';

describe('OfflineConstants', function () {

    describe('constants definition', function () {
        it('should define OFFLINE_SCHEME', function () {
            expect(OfflineConstants.OFFLINE_SCHEME).to.exist;
            expect(OfflineConstants.OFFLINE_SCHEME).to.equal('offline_indexeddb');
        });

        it('should define OFFLINE_URL_REGEX', function () {
            expect(OfflineConstants.OFFLINE_URL_REGEX).to.exist;
            expect(OfflineConstants.OFFLINE_URL_REGEX).to.be.instanceof(RegExp);
        });

        it('should define OFFLINE_STATUS_CREATED', function () {
            expect(OfflineConstants.OFFLINE_STATUS_CREATED).to.exist;
            expect(OfflineConstants.OFFLINE_STATUS_CREATED).to.equal('created');
        });

        it('should define OFFLINE_STATUS_STARTED', function () {
            expect(OfflineConstants.OFFLINE_STATUS_STARTED).to.exist;
            expect(OfflineConstants.OFFLINE_STATUS_STARTED).to.equal('started');
        });

        it('should define OFFLINE_STATUS_STOPPED', function () {
            expect(OfflineConstants.OFFLINE_STATUS_STOPPED).to.exist;
            expect(OfflineConstants.OFFLINE_STATUS_STOPPED).to.equal('stopped');
        });

        it('should define OFFLINE_STATUS_FINISHED', function () {
            expect(OfflineConstants.OFFLINE_STATUS_FINISHED).to.exist;
            expect(OfflineConstants.OFFLINE_STATUS_FINISHED).to.equal('finished');
        });

        it('should define OFFLINE_STATUS_ERROR', function () {
            expect(OfflineConstants.OFFLINE_STATUS_ERROR).to.exist;
            expect(OfflineConstants.OFFLINE_STATUS_ERROR).to.equal('error');
        });
    });

    describe('OFFLINE_URL_REGEX', function () {
        it('should match valid offline URLs', function () {
            const validUrls = [
                'offline_indexeddb://manifest-id',
                'OFFLINE_INDEXEDDB://manifest-id',
                'Offline_IndexedDB://manifest-id'
            ];

            validUrls.forEach(url => {
                expect(OfflineConstants.OFFLINE_URL_REGEX.test(url)).to.be.true;
            });
        });

        it('should not match invalid offline URLs', function () {
            const invalidUrls = [
                'http://example.com/manifest.mpd',
                'https://example.com/manifest.mpd',
                'offline://manifest-id',
                'indexeddb://manifest-id',
                'file://manifest-id'
            ];

            invalidUrls.forEach(url => {
                expect(OfflineConstants.OFFLINE_URL_REGEX.test(url)).to.be.false;
            });
        });

        it('should be case insensitive', function () {
            expect(OfflineConstants.OFFLINE_URL_REGEX.test('offline_indexeddb://test')).to.be.true;
            expect(OfflineConstants.OFFLINE_URL_REGEX.test('OFFLINE_INDEXEDDB://test')).to.be.true;
            expect(OfflineConstants.OFFLINE_URL_REGEX.test('Offline_Indexeddb://test')).to.be.true;
        });
    });

    describe('status values', function () {
        it('should have unique status values', function () {
            const statuses = [
                OfflineConstants.OFFLINE_STATUS_CREATED,
                OfflineConstants.OFFLINE_STATUS_STARTED,
                OfflineConstants.OFFLINE_STATUS_STOPPED,
                OfflineConstants.OFFLINE_STATUS_FINISHED,
                OfflineConstants.OFFLINE_STATUS_ERROR
            ];

            const uniqueStatuses = new Set(statuses);
            expect(uniqueStatuses.size).to.equal(statuses.length);
        });

        it('should have string status values', function () {
            expect(OfflineConstants.OFFLINE_STATUS_CREATED).to.be.a('string');
            expect(OfflineConstants.OFFLINE_STATUS_STARTED).to.be.a('string');
            expect(OfflineConstants.OFFLINE_STATUS_STOPPED).to.be.a('string');
            expect(OfflineConstants.OFFLINE_STATUS_FINISHED).to.be.a('string');
            expect(OfflineConstants.OFFLINE_STATUS_ERROR).to.be.a('string');
        });
    });

    describe('scheme', function () {
        it('should be a string', function () {
            expect(OfflineConstants.OFFLINE_SCHEME).to.be.a('string');
        });

        it('should not be empty', function () {
            expect(OfflineConstants.OFFLINE_SCHEME).to.not.be.empty;
        });

        it('should be lowercase with underscore', function () {
            expect(OfflineConstants.OFFLINE_SCHEME).to.match(/^[a-z_]+$/);
        });
    });
});
