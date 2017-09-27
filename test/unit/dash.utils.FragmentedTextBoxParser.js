import FragmentedTextBoxParser from '../../src/dash/utils/FragmentedTextBoxParser';
import BoxParser from '../../src/streaming/utils/BoxParser';

const expect = require('chai').expect;

const context = {};
const fragmentedTextBoxParser = FragmentedTextBoxParser(context).getInstance();

describe('FragmentedTextBoxParser', function () {

    describe('when no boxParser has been set', () => {
        it('should throw an exception when attempting to call getSamplesInfo and no boxParser has been set', () => {
            expect(fragmentedTextBoxParser.getSamplesInfo.bind(fragmentedTextBoxParser)).to.throw('boxParser is undefined');
        });

        it('should throw an exception when attempting to call getMediaTimescaleFromMoov and no boxParser has been set', () => {
            expect(fragmentedTextBoxParser.getMediaTimescaleFromMoov.bind(fragmentedTextBoxParser)).to.throw('boxParser is undefined');
        });
    });

    describe('when no sample is defined', () => {
        it('should return an object with an empty array called samplesInfo.sampleList when getSamplesInfo is called and sample is undefined', () => {
            const parser = BoxParser(context).getInstance();
            const config = {boxParser: parser};
            fragmentedTextBoxParser.setConfig(config);
            const samplesInfo = fragmentedTextBoxParser.getSamplesInfo();

            expect(samplesInfo.sampleList).to.be.instanceOf(Array);    // jshint ignore:line
            expect(samplesInfo.sampleList).to.be.empty;    // jshint ignore:line
        });

        it('should return NaN when getMediaTimescaleFromMoov is called and sample is undefined', () => {
            const timeScale = fragmentedTextBoxParser.getMediaTimescaleFromMoov();

            expect(timeScale).to.be.NaN;    // jshint ignore:line
        });
    });
});