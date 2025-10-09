import VTTParser from '../../../../src/streaming/utils/VTTParser.js';
import FileLoader from '../../helpers/FileLoader.js';

import {expect} from 'chai';

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

    it('should parse cue settings', function () {
        const vttString = `WEBVTT

00:00:01.000 --> 00:00:03.000 line:10%,start position:20%,line-left align:center
cuebox on top left
with centered text

00:00:04.000 --> 00:00:06.000 line:90%,end position:80%,line-right align:left
cuebox on bottom right
with left aligned text

00:00:07.000 --> 00:00:09.000 line:50%,center position:50%,center align:center
cuebox on center
with centered text

00:00:10.000 --> 00:00:12.000 line:5 position:50%
numeric line value

00:00:13.000 --> 00:00:15.000 line:-5 position:10%
negative line value
`;

        const vttSubtitlesArray = vttParser.parse(vttString);

        expect(vttSubtitlesArray).to.deep.equal([
            {
                start: 1,
                end: 3,
                data: 'cuebox on top left\nwith centered text',
                styles: {
                    line: 10,
                    lineAlign: 'start',
                    snapToLines: false,
                    position: 20,
                    positionAlign: 'line-left',
                    align: 'center'
                }
            },
            {
                start: 4,
                end: 6,
                data: 'cuebox on bottom right\nwith left aligned text',
                styles: {
                    line: 90,
                    snapToLines: false,
                    lineAlign: 'end',
                    position: 80,
                    positionAlign: 'line-right',
                    align: 'left'
                }
            },
            {
                start: 7,
                end: 9,
                data: 'cuebox on center\nwith centered text',
                styles: {
                    line: 50,
                    snapToLines: false,
                    lineAlign: 'center',
                    position: 50,
                    positionAlign: 'center',
                    align: 'center'
                }
            },
            {
                start: 10,
                end: 12,
                data: 'numeric line value',
                styles: {
                    line: 5,
                    position: 50
                }
            },
            {
                start: 13,
                end: 15,
                data: 'negative line value',
                styles: {
                    line: -5,
                    position: 10
                }
            }
        ]);
    });
});
