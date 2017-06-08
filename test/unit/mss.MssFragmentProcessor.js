import MssFragmentProcessor from '../../src/mss/MssFragmentProcessor';

const expect = require('chai').expect;

const context = {};
const mssFragmentProcessor = MssFragmentProcessor(context).create();

describe('MssFragmentProcessor', function () {
    
    it('should return undefined when generateMoov is called and representation is undefined', () => {
        const moov = mssFragmentProcessor.generateMoov();

        expect(moov).to.be.undefined;  // jshint ignore:line
    });

    it('should return undefined when processMoof is called and e is undefined', () => {
        const moof = mssFragmentProcessor.processMoof();

        expect(moof).to.be.undefined;  // jshint ignore:line
    });

    it('should return undefined when processMoof is called and e.response is undefined', () => {
        const e = {};
        const moof = mssFragmentProcessor.processMoof(e);

        expect(moof).to.be.undefined;  // jshint ignore:line
    });
});