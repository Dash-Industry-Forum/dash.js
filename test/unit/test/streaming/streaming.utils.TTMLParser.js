import TTMLParser from '../../../../src/streaming/utils/TTMLParser.js';
import FileLoader from '../../helpers/FileLoader.js';
import {expect} from 'chai';
import {renderHTML} from 'imsc';

const context = {};
const ttmlParser = TTMLParser(context).getInstance();
let ttml_file;
let ttml_last_cue_file;

describe('TTMLParser', function () {

    describe('parse', async () => {

        before(async function () {
            ttml_file = await FileLoader.loadTextFile('/data/subtitles/ttmlSample.ttml');
            ttml_last_cue_file = await FileLoader.loadTextFile('/data/subtitles/ttmlLastCue.ttml');
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

        it('should parse and render Unicode and XML entities without Node streams', () => {
            const xml = '<tt xmlns="http://www.w3.org/ns/ttml"><body><div>' +
                '<p begin="0s" end="5s">Café &amp; &#x1F3AC;</p>' +
                '</div></body></tt>';
            const captions = ttmlParser.parse(xml, 0, 0, 10, []);
            expect(captions).to.have.lengthOf(1);

            const container = document.createElement('div');
            document.body.appendChild(container);
            try {
                renderHTML(captions[0].isd, container, null, 180, 320);
                expect(container.textContent).to.equal('Café & 🎬');
            } finally {
                container.remove();
            }
        });

        it('should use endTimeSegment as fallback for the last cue end time', () => {
            const endTimeSegment = 10;
            const captionsArray = ttmlParser.parse(ttml_last_cue_file, 0, 0, endTimeSegment, []);
            expect(captionsArray).to.have.lengthOf(1);
            expect(captionsArray[0].start).to.equal(0);
            expect(captionsArray[0].end).to.equal(endTimeSegment);
        });
    });
});
