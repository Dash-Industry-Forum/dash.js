import MssErrors from '../../src/mss/errors/MssErrors';

const expect = require('chai').expect;

describe('Errors', function () {
    it('MssErrors code should exist', () => {
        expect(MssErrors).to.exist; // jshint ignore:line
        expect(MssErrors.MSS_NO_TFRF_CODE).to.equal(200);
        expect(MssErrors.MSS_UNSUPPORTED_CODEC_CODE).to.equal(201);
    });

    it('MssErrors should return the correct error message', () => {
        expect(MssErrors).to.exist; // jshint ignore:line
        expect(MssErrors.MSS_NO_TFRF_MESSAGE).to.equal('Missing tfrf in live media segment');
        expect(MssErrors.MSS_UNSUPPORTED_CODEC_MESSAGE).to.equal('Unsupported codec');
    });
});