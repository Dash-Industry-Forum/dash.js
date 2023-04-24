import VTTParser from '../../src/streaming/utils/VTTParser';
import FileLoader from './helpers/FileLoader';

const expect = require('chai').expect;

const context = {};
const vttParser = VTTParser(context).getInstance();

describe('VTTParser', function () {
    it('should return an empty array when parse is called and data is not defined', function () {
        const vttSubtitlesArray = vttParser.parse();

        expect(vttSubtitlesArray).to.be.instanceOf(Array);
        expect(vttSubtitlesArray).to.be.empty;
    });

    it('should return an array with a size of 8 when parse is called and data is vttSample', async () => {
        let vtt_file = await FileLoader.loadTextFile('/data/subtitles/vttSample.vtt');
        const vttSubtitlesArray = vttParser.parse(vtt_file);

        expect(vttSubtitlesArray).to.be.instanceOf(Array);
        expect(vttSubtitlesArray.length).to.be.equal(8);
    });
});
