import Errors from '../../src/core/errors/Errors';

const expect = require('chai').expect;

describe('Errors', function () {
    it('Errors code should exist', () => {
        expect(Errors).to.exist; // jshint ignore:line
        expect(Errors.MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE).to.equal(10);
        expect(Errors.MANIFEST_LOADER_LOADING_FAILURE_ERROR_CODE).to.equal(11);
        expect(Errors.XLINK_LOADER_LOADING_FAILURE_ERROR_CODE).to.equal(12);
        expect(Errors.SEGMENT_BASE_LOADER_ERROR_CODE).to.equal(15);
        expect(Errors.TIME_SYNC_FAILED_ERROR_CODE).to.equal(16);
        expect(Errors.FRAGMENT_LOADER_LOADING_FAILURE_ERROR_CODE).to.equal(17);
        expect(Errors.FRAGMENT_LOADER_NULL_REQUEST_ERROR_CODE).to.equal(18);
        expect(Errors.URL_RESOLUTION_FAILED_GENERIC_ERROR_CODE).to.equal(19);
        expect(Errors.APPEND_ERROR_CODE).to.equal(20);
        expect(Errors.REMOVE_ERROR_CODE).to.equal(21);
        expect(Errors.DATA_UPDATE_FAILED_ERROR_CODE).to.equal(22);
        expect(Errors.CAPABILITY_MEDIASOURCE_ERROR_CODE).to.equal(23);
        expect(Errors.CAPABILITY_MEDIAKEYS_ERROR_CODE).to.equal(24);
        expect(Errors.DOWNLOAD_ERROR_ID_MANIFEST_CODE).to.equal(25);
        expect(Errors.DOWNLOAD_ERROR_ID_SIDX_CODE).to.equal(26);
        expect(Errors.DOWNLOAD_ERROR_ID_CONTENT_CODE).to.equal(27);
        expect(Errors.DOWNLOAD_ERROR_ID_INITIALIZATION_CODE).to.equal(28);
        expect(Errors.DOWNLOAD_ERROR_ID_XLINK_CODE).to.equal(29);
        expect(Errors.MANIFEST_ERROR_ID_PARSE_CODE).to.equal(31);
        expect(Errors.MANIFEST_ERROR_ID_NOSTREAMS_CODE).to.equal(32);
        expect(Errors.TIMED_TEXT_ERROR_ID_PARSE_CODE).to.equal(33);
        expect(Errors.MANIFEST_ERROR_ID_MULTIPLEXED_CODE).to.equal(34);
        expect(Errors.MEDIASOURCE_TYPE_UNSUPPORTED_CODE).to.equal(35);
    });
});
