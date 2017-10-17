import VTTParser from '../../src/streaming/utils/VTTParser';

const expect = require('chai').expect;
const fs = require('fs');

const context = {};
const vttParser = VTTParser(context).getInstance();

describe('VTTParser', function () {
    it('should return an empty array when parse is called and data is not defined', function () {
        const vttSubtitlesArray = vttParser.parse();

        expect(vttSubtitlesArray).to.be.instanceOf(Array);    // jshint ignore:line
        expect(vttSubtitlesArray).to.be.empty;                // jshint ignore:line
    });

    it('should return an array with a size of 8 when parse is called and data is vttSample', function () {
        let vtt_file = fs.readFileSync(__dirname + '/data/subtitles/vttSample.vtt', 'utf8');
        const vttSubtitlesArray = vttParser.parse(vtt_file);

        expect(vttSubtitlesArray).to.be.instanceOf(Array);    // jshint ignore:line
        expect(vttSubtitlesArray.length).to.be.equal(8);
    });
});