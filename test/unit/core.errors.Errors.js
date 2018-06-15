import Errors from '../../src/core/errors/Errors';

const expect = require('chai').expect;

describe('Errors', function () {
    it('Errors code should exist', () => {
        expect(Errors).to.exist; // jshint ignore:line
        expect(Errors.MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE).to.equal(1);
        expect(Errors.MANIFEST_LOADER_LOADING_FAILURE_ERROR_CODE).to.equal(2);
        expect(Errors.XLINK_LOADER_LOADING_FAILURE_ERROR_CODE).to.equal(3);
        expect(Errors.SEGMENTS_UPDATE_FAILED_ERROR_CODE).to.equal(4);
        expect(Errors.SEGMENTS_UNAVAILABLE_ERROR_CODE).to.equal(5);
        expect(Errors.SEGMENT_BASE_LOADER_ERROR_CODE).to.equal(6);
        expect(Errors.TIME_SYNC_FAILED_ERROR_CODE).to.equal(7);
        expect(Errors.FRAGMENT_LOADER_LOADING_FAILURE_ERROR_CODE).to.equal(8);
        expect(Errors.FRAGMENT_LOADER_NULL_REQUEST_ERROR_CODE).to.equal(9);
        expect(Errors.URL_RESOLUTION_FAILED_GENERIC_ERROR_CODE).to.equal(10);
        expect(Errors.APPEND_ERROR_CODE).to.equal(11);
        expect(Errors.REMOVE_ERROR_CODE).to.equal(12);
        expect(Errors.DATA_UPDATE_FAILED_ERROR_CODE).to.equal(13);
        expect(Errors.CAPABILITY_MEDIASOURCE_ERROR_CODE).to.equal(14);
        expect(Errors.CAPABILITY_MEDIAKEYS_ERROR_CODE).to.equal(15);
        expect(Errors.DOWNLOAD_ERROR_ID_MANIFEST).to.equal(16);
        expect(Errors.DOWNLOAD_ERROR_ID_SIDX).to.equal(17);
        expect(Errors.DOWNLOAD_ERROR_ID_CONTENT).to.equal(18);
        expect(Errors.DOWNLOAD_ERROR_ID_INITIALIZATION).to.equal(19);
        expect(Errors.DOWNLOAD_ERROR_ID_XLINK).to.equal(20);
        expect(Errors.MANIFEST_ERROR_ID_CODEC).to.equal(21);
        expect(Errors.MANIFEST_ERROR_ID_PARSE).to.equal(22);
        expect(Errors.MANIFEST_ERROR_ID_NOSTREAMS).to.equal(23);
        expect(Errors.TIMED_TEXT_ERROR_ID_PARSE).to.equal(24);
    });

    it('Errors should return the correct error message', () => {
        expect(Errors).to.exist; // jshint ignore:line
        expect(Errors.MANIFEST_LOADER_PARSING_FAILURE_ERROR_MESSAGE).to.equal('parsing failed for ');
        expect(Errors.MANIFEST_LOADER_LOADING_FAILURE_ERROR_MESSAGE).to.equal('Failed loading manifest: ');
        expect(Errors.XLINK_LOADER_LOADING_FAILURE_ERROR_MESSAGE).to.equal('Failed loading Xlink element: ');
        expect(Errors.SEGMENTS_UPDATE_FAILED_ERROR_MESSAGE).to.equal('Segments update failed');
        expect(Errors.SEGMENTS_UNAVAILABLE_ERROR_MESSAGE).to.equal('no segments are available yet');
        expect(Errors.SEGMENT_BASE_LOADER_ERROR_MESSAGE).to.equal('error loading segments');
        expect(Errors.TIME_SYNC_FAILED_ERROR_MESSAGE).to.equal('Failed to synchronize time');
        expect(Errors.FRAGMENT_LOADER_NULL_REQUEST_ERROR_MESSAGE).to.equal('request is null');
        expect(Errors.URL_RESOLUTION_FAILED_GENERIC_ERROR_MESSAGE).to.equal('Failed to resolve a valid URL');
        expect(Errors.APPEND_ERROR_MESSAGE).to.equal('chunk is not defined');
        expect(Errors.REMOVE_ERROR_MESSAGE).to.equal('buffer is not defined');
        expect(Errors.DATA_UPDATE_FAILED_ERROR_MESSAGE).to.equal('Data update failed');
    });
});
