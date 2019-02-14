import Errors from '../../src/core/errors/Errors';

const expect = require('chai').expect;

describe('Errors', function () {
    it('Errors code should exist', () => {
        expect(Errors).to.exist; // jshint ignore:line
        expect(Errors.MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE).to.equal(10);
        expect(Errors.MANIFEST_LOADER_LOADING_FAILURE_ERROR_CODE).to.equal(11);
        expect(Errors.XLINK_LOADER_LOADING_FAILURE_ERROR_CODE).to.equal(12);
        expect(Errors.SEGMENTS_UPDATE_FAILED_ERROR_CODE).to.equal(13);
        expect(Errors.SEGMENTS_UNAVAILABLE_ERROR_CODE).to.equal(14);
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
        expect(Errors.MANIFEST_ERROR_ID_CODEC_CODE).to.equal(30);
        expect(Errors.MANIFEST_ERROR_ID_PARSE_CODE).to.equal(31);
        expect(Errors.MANIFEST_ERROR_ID_NOSTREAMS_CODE).to.equal(32);
        expect(Errors.TIMED_TEXT_ERROR_ID_PARSE_CODE).to.equal(33);
        expect(Errors.MANIFEST_ERROR_ID_MULTIPLEXED_CODE).to.equal(34);
        expect(Errors.MEDIASOURCE_TYPE_UNSUPPORTED_CODE).to.equal(35);
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
        expect(Errors.CAPABILITY_MEDIASOURCE_ERROR_MESSAGE).to.equal('mediasource is not supported');
        expect(Errors.CAPABILITY_MEDIAKEYS_ERROR_MESSAGE).to.equal('mediakeys is not supported');
        expect(Errors.TIMED_TEXT_ERROR_MESSAGE_PARSE).to.equal('parsing error :');
        expect(Errors.MEDIASOURCE_TYPE_UNSUPPORTED_MESSAGE).to.equal('Error creating source buffer of type : ');
    });
});
