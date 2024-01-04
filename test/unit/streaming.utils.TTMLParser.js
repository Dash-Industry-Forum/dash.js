import TTMLParser from '../../src/streaming/utils/TTMLParser';
import FileLoader from './helpers/FileLoader';

const expect = require('chai').expect;

const context = {};
const ttmlParser = TTMLParser(context).getInstance();
const mockDvbFonts = [
    {
        fontFace: {}, // Font face instance
        fontFamily: 'dashjs-UnitTestFont',
        isEssential: false,
        mimeType: 'application/font-woff',
        status: 'loaded',
        streamId: 'first',
        trackId: 888,
        url: ''
    }
];
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
    
        it('should append a prefix to recognised dvb font download font families', () => {
            const captionsArray = ttmlParser.parse(ttml_file, 0, 0, 10, [], mockDvbFonts);
            expect(captionsArray[0].isd.contents[0].contents[0].contents[0].contents[0].kind).to.equal('p');
            expect(captionsArray[0].isd.contents[0].contents[0].contents[0].contents[0].styleAttrs['http://www.w3.org/ns/ttml#styling fontFamily'][0]).to.equal('dashjs-UnitTestFont');
        });
        
        it('should correct for a bug in IMSCjs v1.1.4', () => {
            const captionsArray = ttmlParser.parse(ttml_file, 0, 0, 10, [], mockDvbFonts);
            const lastFontFamily = captionsArray[0].isd.contents[0].contents[0].contents[0].contents[0].styleAttrs['http://www.w3.org/ns/ttml#styling fontFamily'].pop();
            expect(lastFontFamily).to.equal('monospaceSerif');
        });
    });

});
