import VTTParser from '../../src/streaming/utils/VTTParser';

const expect = require('chai').expect;

const context = {};
const vttParser = VTTParser(context).getInstance();

const vttSample = "WEBVTT\n\
\n\
1\n\
00:00:15.042 --> 00:00:18.042\n\
At the <c.red.caps>left</c> we can see...\n\
\n\
2\n\
00:00:18.167 --> 00:00:20.083\n\
<c.red.caps>At the right we can see the...</c>\n\
\n\
3\n\
00:00:20.083 --> 00:00:22.000\n\
...the head-snarlers.\n\
\n\
4\n\
00:00:22.000 --> 00:00:24.417\n\
Everything is safe. Perfectly safe.\n\
\n\
5\n\
00:00:24.583 --> 00:00:27.083\n\
Emo ? Emo!\n\
\n\
6\n\
00:00:28.208 --> 00:00:30.042\n\
Watch out!\n\
\n\
7\n\
00:00:46.642 --> 00:00:48.250\n\
Are you hurt?\n\
\n\
8\n\
00:00:52.000 --> 00:00:54.000\n\
I don't think so. You?";

describe('VTTParser', function () {
	it("should return an empty array when parse is called and data is not defined", function () {
        const vttSubtitlesArray = vttParser.parse();

        expect(vttSubtitlesArray).to.be.instanceOf(Array);    // jshint ignore:line
        expect(vttSubtitlesArray).to.be.empty;                // jshint ignore:line
    });

    it("should return an array with a size of 8 when parse is called and data is vttSample", function () {
        const vttSubtitlesArray = vttParser.parse(vttSample);

        expect(vttSubtitlesArray).to.be.instanceOf(Array);    // jshint ignore:line
        expect(vttSubtitlesArray.length).to.be.equal(8);
    });
}); 