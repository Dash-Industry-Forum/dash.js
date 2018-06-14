import ErrorConstants from '../../src/streaming/constants/ErrorConstants';

const expect = require('chai').expect;

describe('ErrorConstants', function () {
    it('ErrorConstants code should exist', () => {
        expect(ErrorConstants).to.exist; // jshint ignore:line
        expect(ErrorConstants.MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE).to.equal(1);
        expect(ErrorConstants.MANIFEST_LOADER_LOADING_FAILURE_ERROR_CODE).to.equal(2);
        expect(ErrorConstants.XLINK_LOADER_LOADING_FAILURE_ERROR_CODE).to.equal(3);
        expect(ErrorConstants.SEGMENTS_UPDATE_FAILED_ERROR_CODE).to.equal(4);
        expect(ErrorConstants.SEGMENTS_UNAVAILABLE_ERROR_CODE).to.equal(5);
        expect(ErrorConstants.SEGMENT_BASE_LOADER_ERROR_CODE).to.equal(6);
        expect(ErrorConstants.TIME_SYNC_FAILED_ERROR_CODE).to.equal(7);
        expect(ErrorConstants.FRAGMENT_LOADER_LOADING_FAILURE_ERROR_CODE).to.equal(8);
        expect(ErrorConstants.FRAGMENT_LOADER_NULL_REQUEST_ERROR_CODE).to.equal(9);
        expect(ErrorConstants.URL_RESOLUTION_FAILED_GENERIC_ERROR_CODE).to.equal(10);
        expect(ErrorConstants.APPEND_ERROR_CODE).to.equal(11);
        expect(ErrorConstants.REMOVE_ERROR_CODE).to.equal(12);
        expect(ErrorConstants.DATA_UPDATE_FAILED_ERROR_CODE).to.equal(13);
        expect(ErrorConstants.CAPABILITY_MEDIASOURCE_ERROR_CODE).to.equal(14);
        expect(ErrorConstants.CAPABILITY_MEDIAKEYS_ERROR_CODE).to.equal(15);
    });

    it('ErrorConstants should return the correct error message', () => {
        const context = {};
        const errorConstants = ErrorConstants(context).getInstance();
        expect(errorConstants).to.exist; // jshint ignore:line
        expect(errorConstants.getErrorMessage(ErrorConstants.MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE)).to.equal('parsing failed for ');
        expect(errorConstants.getErrorMessage(ErrorConstants.MANIFEST_LOADER_LOADING_FAILURE_ERROR_CODE)).to.equal('Failed loading manifest: ');
        expect(errorConstants.getErrorMessage(ErrorConstants.XLINK_LOADER_LOADING_FAILURE_ERROR_CODE)).to.equal('Failed loading Xlink element: ');
        expect(errorConstants.getErrorMessage(ErrorConstants.SEGMENTS_UPDATE_FAILED_ERROR_CODE)).to.equal('Segments update failed');
        expect(errorConstants.getErrorMessage(ErrorConstants.SEGMENTS_UNAVAILABLE_ERROR_CODE)).to.equal('no segments are available yet');
        expect(errorConstants.getErrorMessage(ErrorConstants.SEGMENT_BASE_LOADER_ERROR_CODE)).to.equal('error loading segments');
        expect(errorConstants.getErrorMessage(ErrorConstants.TIME_SYNC_FAILED_ERROR_CODE)).to.equal('Failed to synchronize time');
        expect(errorConstants.getErrorMessage(ErrorConstants.FRAGMENT_LOADER_LOADING_FAILURE_ERROR_CODE)).to.equal('');
        expect(errorConstants.getErrorMessage(ErrorConstants.FRAGMENT_LOADER_NULL_REQUEST_ERROR_CODE)).to.equal('request is null');
        expect(errorConstants.getErrorMessage(ErrorConstants.URL_RESOLUTION_FAILED_GENERIC_ERROR_CODE)).to.equal('Failed to resolve a valid URL');
        expect(errorConstants.getErrorMessage(ErrorConstants.APPEND_ERROR_CODE)).to.equal('buffer or chunk is not defined');
        expect(errorConstants.getErrorMessage(ErrorConstants.REMOVE_ERROR_CODE)).to.equal('buffer is not defined');
        expect(errorConstants.getErrorMessage(ErrorConstants.DATA_UPDATE_FAILED_ERROR_CODE)).to.equal('Data update failed');
        expect(errorConstants.getErrorMessage(ErrorConstants.CAPABILITY_MEDIASOURCE_ERROR_CODE)).to.equal('');
        expect(errorConstants.getErrorMessage(ErrorConstants.CAPABILITY_MEDIAKEYS_ERROR_CODE)).to.equal('');
    });
});
