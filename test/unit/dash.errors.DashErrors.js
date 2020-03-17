import DashErrors from '../../src/dash/errors/DashErrors';

const expect = require('chai').expect;

describe('Errors', function () {
    it('DashErrors code should exist', () => {
        expect(DashErrors).to.exist; // jshint ignore:line
        expect(DashErrors.SEGMENTS_UPDATE_FAILED_ERROR_CODE).to.equal(13);
        expect(DashErrors.SEGMENT_BASE_LOADER_ERROR_CODE).to.equal(15);
        expect(DashErrors.MANIFEST_ERROR_ID_PARSE_CODE).to.equal(31);
    });

    it('DashErrors should return the correct error message', () => {
        expect(DashErrors).to.exist; // jshint ignore:line
        expect(DashErrors.SEGMENTS_UPDATE_FAILED_ERROR_MESSAGE).to.equal('Segments update failed');
        expect(DashErrors.SEGMENT_BASE_LOADER_ERROR_MESSAGE).to.equal('error loading segments');
    });
});