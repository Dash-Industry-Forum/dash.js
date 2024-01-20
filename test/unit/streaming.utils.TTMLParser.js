import TTMLParser from '../../src/streaming/utils/TTMLParser';
import FileLoader from './helpers/FileLoader';

const expect = require('chai').expect;

const context = {};
const ttmlParser = TTMLParser(context).getInstance();
let ttml_file;

describe('TTMLParser', function () {

    describe('parse', async () => {

        before(async function () {
            ttml_file = await FileLoader.loadTextFile('/data/subtitles/ttmlSample.ttml');
        });

        it('should return an empty array when parse is called and parameters are undefined', () => {
            expect(ttmlParser.parse.bind(ttmlParser)).to.throw('no ttml data to parse');
        });
    
        // An amount of the following will come under the testing for IMSCjs
        it('should return the correct captions array', () => {
            const captionsArray = ttmlParser.parse(ttml_file, 0, 0, 10, [], []);
            expect(captionsArray).to.have.lengthOf(2);
            expect(captionsArray[0].start).to.equal(0);
            expect(captionsArray[0].end).to.equal(5);
        });
    });

});
