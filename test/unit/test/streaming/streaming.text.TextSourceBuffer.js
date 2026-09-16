import TextSourceBuffer from '../../../../src/streaming/text/TextSourceBuffer.js';
import TTMLParser from '../../../../src/streaming/utils/TTMLParser.js';
import Errors from '../../../../src/core/errors/Errors.js';
import ErrorHandlerMock from '../../mocks/ErrorHandlerMock.js';
import AdapterMock from '../../mocks/AdapterMock.js';
import CustomTimeRanges from '../../../../src/streaming/utils/CustomTimeRanges.js';

import chai from 'chai';

const expect = chai.expect;

const context = {};
const adapterMock = new AdapterMock();
const errorHandlerMock = new ErrorHandlerMock();
const ttmlParser = TTMLParser(context).getInstance();

const TIMESCALE = 1000;
const BASE_MEDIA_DECODE_TIME = 10000; // 10s in media (period-local) time
const SAMPLE_DURATION = 2000;

function u16(v) {
    return [(v >>> 8) & 0xFF, v & 0xFF];
}

function u32(v) {
    return [(v >>> 24) & 0xFF, (v >>> 16) & 0xFF, (v >>> 8) & 0xFF, v & 0xFF];
}

function stringToBytes(str) {
    return Array.from(str, c => c.charCodeAt(0));
}

function box(type, ...payloads) {
    const payload = [].concat(...payloads);
    return [...u32(8 + payload.length), ...stringToBytes(type), ...payload];
}

function fullBox(type, version, flags, ...payloads) {
    return box(type, [version, (flags >>> 16) & 0xFF, (flags >>> 8) & 0xFF, flags & 0xFF], ...payloads);
}

/**
 * An initialization segment. sampleEntryType adds a Sample Description Box naming that
 * sample entry; without it the moov has no stsd, as in a manifest-only description.
 */
function createInitSegment(sampleEntryType) {
    const mdhd = fullBox('mdhd', 0, 0, u32(0), u32(0), u32(TIMESCALE), u32(0), u16(0), u16(0));
    if (!sampleEntryType) {
        return new Uint8Array(box('moov', box('trak', box('mdia', mdhd)))).buffer;
    }
    // SampleEntry: six reserved bytes and a data reference index.
    const sampleEntry = box(sampleEntryType, [0, 0, 0, 0, 0, 0], u16(1));
    const stsd = fullBox('stsd', 0, 0, u32(1), sampleEntry);
    return new Uint8Array(
        box('moov', box('trak', box('mdia', mdhd, box('minf', box('stbl', stsd)))))).buffer;
}

/** A media segment of one sample carrying the given bytes. */
function createMediaSegment(sampleBytes) {
    function createMoof(dataOffset) {
        const tfhd = fullBox('tfhd', 0, 0, u32(1));
        const tfdt = fullBox('tfdt', 1, 0, u32(0), u32(BASE_MEDIA_DECODE_TIME));
        // trun flags: data-offset, sample-duration and sample-size present
        const trun = fullBox('trun', 0, 0x000301, u32(1), u32(dataOffset), u32(SAMPLE_DURATION), u32(sampleBytes.length));
        return box('moof', fullBox('mfhd', 0, 0, u32(1)), box('traf', tfhd, tfdt, trun));
    }

    const moofSize = createMoof(0).length;
    const moof = createMoof(moofSize + 8); // sample data starts after the mdat header
    return new Uint8Array([...moof, ...box('mdat', sampleBytes)]).buffer;
}

/** A media segment whose samples carry the given byte arrays, back to back. */
function createMultiSampleSegment(samples) {
    const data = [].concat(...samples);

    function createMoof(dataOffset) {
        const tfhd = fullBox('tfhd', 0, 0, u32(1));
        const tfdt = fullBox('tfdt', 1, 0, u32(0), u32(BASE_MEDIA_DECODE_TIME));
        const entries = [].concat(...samples.map((sample) => [...u32(SAMPLE_DURATION), ...u32(sample.length)]));
        // trun flags: data-offset, sample-duration and sample-size present
        const trun = fullBox('trun', 0, 0x000301, u32(samples.length), u32(dataOffset), entries);
        return box('moof', fullBox('mfhd', 0, 0, u32(1)), box('traf', tfhd, tfdt, trun));
    }

    const moofSize = createMoof(0).length;
    const moof = createMoof(moofSize + 8);
    return new Uint8Array([...moof, ...box('mdat', data)]).buffer;
}

function vttcBox(cueText) {
    return box('vttc', box('payl', stringToBytes(cueText)));
}

describe('TextSourceBuffer', function () {

    let textSourceBuffer = TextSourceBuffer(context).create({
        adapter: adapterMock,
        errHandler: errorHandlerMock,
        ttmlParser: ttmlParser
    });

    it('call to append function with invalid tttml data should triggered a parse error', function () {
        const buffer = new ArrayBuffer(8);
        textSourceBuffer.append(buffer, {
            representation: {
                mediaInfo: {
                    type: 'text',
                    mimeType: 'application/ttml+xml',
                    codec: 'application/ttml+xml;codecs=\'undefined\''
                }
            }
        });
        expect(errorHandlerMock.errorCode).to.equal(Errors.TIMED_TEXT_ERROR_ID_PARSE_CODE);
    });

    describe('fragmented WebVTT', function () {
        const TIMESTAMP_OFFSET = 100; // MSE offset for a later period

        it('should apply the timestamp offset when adding cues for fragmented WebVTT', function () {
            const addCaptionsCalls = [];
            const textTracksMock = {
                addCaptions: (idx, timeOffset, captionArray) => {
                    addCaptionsCalls.push({ idx, timeOffset, captionArray });
                }
            };
            const buffer = TextSourceBuffer(context).create({
                errHandler: errorHandlerMock,
                textTracks: textTracksMock
            });
            buffer.buffered = CustomTimeRanges(context).create();
            buffer.timestampOffset = TIMESTAMP_OFFSET;

            const mediaInfo = {
                type: 'text',
                mimeType: 'application/mp4',
                codec: 'application/mp4;codecs="wvtt"'
            };
            buffer.append(createInitSegment(), { segmentType: 'InitializationSegment', representation: { mediaInfo } });
            buffer.append(createMediaSegment(vttcBox('Hello')), { segmentType: 'MediaSegment', representation: { mediaInfo } });

            expect(addCaptionsCalls).to.have.lengthOf(1);
            expect(addCaptionsCalls[0].timeOffset).to.equal(TIMESTAMP_OFFSET);
            expect(addCaptionsCalls[0].captionArray).to.have.lengthOf(1);
            expect(addCaptionsCalls[0].captionArray[0].data).to.equal('Hello');
            expect(addCaptionsCalls[0].captionArray[0].start).to.equal(BASE_MEDIA_DECODE_TIME / TIMESCALE);
            expect(addCaptionsCalls[0].captionArray[0].end).to.equal((BASE_MEDIA_DECODE_TIME + SAMPLE_DURATION) / TIMESCALE);
            // Buffered range is in presentation time: timestampOffset + cts / timescale
            expect(buffer.buffered.start(0)).to.equal(TIMESTAMP_OFFSET + BASE_MEDIA_DECODE_TIME / TIMESCALE);
            expect(buffer.buffered.end(0)).to.equal(TIMESTAMP_OFFSET + (BASE_MEDIA_DECODE_TIME + SAMPLE_DURATION) / TIMESCALE);
        });
    });

    describe('text format resolution', function () {

        function createBuffer(ttmlParserStub) {
            const addCaptionsCalls = [];
            const textTracksMock = {
                addCaptions: (idx, timeOffset, captionArray) => {
                    addCaptionsCalls.push({ idx, timeOffset, captionArray });
                }
            };
            const buffer = TextSourceBuffer(context).create({
                errHandler: errorHandlerMock,
                textTracks: textTracksMock,
                ttmlParser: ttmlParserStub || ttmlParser,
                manifestModel: { getValue: () => ({}) }
            });
            buffer.buffered = CustomTimeRanges(context).create();
            return { buffer, addCaptionsCalls };
        }

        function appendSegments(buffer, mediaInfo, sampleEntryType, sampleBytes) {
            buffer.append(createInitSegment(sampleEntryType),
                { segmentType: 'InitializationSegment', representation: { mediaInfo } });
            buffer.append(createMediaSegment(sampleBytes),
                { segmentType: 'MediaSegment', representation: { mediaInfo } });
        }

        it('takes the format from the sample description when the manifest gives no codecs', function () {
            const parsed = [];
            const ttmlParserStub = {
                parse: (content) => {
                    parsed.push(content);
                    return [{ start: 0, end: 1, data: 'from ttml' }];
                }
            };
            const { buffer, addCaptionsCalls } = createBuffer(ttmlParserStub);

            // No codecs parameter, so only the stsd says that these are TTML documents.
            appendSegments(buffer, { type: 'text', mimeType: 'application/mp4', codec: 'application/mp4' },
                'stpp', stringToBytes('<tt xmlns="http://www.w3.org/ns/ttml"></tt>'));

            expect(parsed).to.have.lengthOf(1);
            expect(addCaptionsCalls).to.have.lengthOf(1);
        });

        it('does not parse samples of a sample entry it does not know', function () {
            const { buffer, addCaptionsCalls } = createBuffer();

            // abcd is not a sample entry dash.js knows. Its samples happen to look like
            // WebVTT ones here, which is exactly why guessing is wrong: the format is
            // whatever its specification says, not whatever the bytes can be read as.
            appendSegments(buffer, { type: 'text', mimeType: 'application/mp4', codec: 'application/mp4;codecs="abcd"' },
                'abcd', vttcBox('Hello'));

            expect(addCaptionsCalls).to.have.lengthOf(0);
        });

        it('reads the sample entry of an RFC 6381 codecs string with sub-parameters', function () {
            const parsed = [];
            const ttmlParserStub = {
                parse: (content) => {
                    parsed.push(content);
                    return [];
                }
            };
            const { buffer } = createBuffer(ttmlParserStub);

            appendSegments(buffer, {
                type: 'text',
                mimeType: 'application/mp4',
                codec: 'application/mp4;codecs="stpp.ttml.im1t"'
            }, null, stringToBytes('<tt xmlns="http://www.w3.org/ns/ttml"></tt>'));

            expect(parsed).to.have.lengthOf(1);
        });
    });

    describe('paint-model subtitles (experimental stpc and wvtc)', function () {

        const TTML_DOC = '<?xml version="1.0" encoding="UTF-8"?>' +
            '<tt xmlns="http://www.w3.org/ns/ttml" xml:lang="en">' +
            '<head><styling/></head>' +
            '<body><div><p begin="00:00:00.000">first</p></div></body></tt>';

        function createBuffer(ttmlParserStub) {
            const addCaptionsCalls = [];
            const textTracksMock = {
                addCaptions: (idx, timeOffset, captionArray) => {
                    addCaptionsCalls.push({ idx, timeOffset, captionArray });
                }
            };
            const buffer = TextSourceBuffer(context).create({
                errHandler: errorHandlerMock,
                textTracks: textTracksMock,
                ttmlParser: ttmlParserStub || ttmlParser,
                manifestModel: { getValue: () => ({}) }
            });
            buffer.buffered = CustomTimeRanges(context).create();
            return { buffer, addCaptionsCalls };
        }

        it('re-states the active cues for a ttmn no-change sample without parsing again', function () {
            const parsed = [];
            const ttmlParserStub = {
                parse: (content, offsetTime, start, end) => {
                    parsed.push(content);
                    return [{ start, end, type: 'html', cueID: 'c0', isd: {} }];
                }
            };
            const { buffer, addCaptionsCalls } = createBuffer(ttmlParserStub);
            const mediaInfo = { type: 'text', mimeType: 'application/mp4', codec: 'application/mp4;codecs="stpc"' };

            buffer.append(createInitSegment('stpc'), { segmentType: 'InitializationSegment', representation: { mediaInfo } });
            buffer.append(createMultiSampleSegment([stringToBytes(TTML_DOC), box('ttmn')]),
                { segmentType: 'MediaSegment', representation: { mediaInfo } });

            // The document is parsed once; the no-change sample re-states its cues.
            expect(parsed).to.have.lengthOf(1);
            expect(addCaptionsCalls).to.have.lengthOf(2);

            const first = addCaptionsCalls[0].captionArray[0];
            const restated = addCaptionsCalls[1].captionArray[0];
            expect(restated.cueID).to.equal(first.cueID);
            expect(restated.start).to.equal(first.end);
            expect(restated.end).to.equal(first.end + SAMPLE_DURATION / TIMESCALE);
        });

        it('splices the head of the segment into a ttmb body-only sample', function () {
            const parsed = [];
            const ttmlParserStub = {
                parse: (content, offsetTime, start, end) => {
                    parsed.push(content);
                    return [{ start, end, type: 'html', cueID: 'c', isd: {} }];
                }
            };
            const { buffer } = createBuffer(ttmlParserStub);
            const mediaInfo = { type: 'text', mimeType: 'application/mp4', codec: 'application/mp4;codecs="stpc"' };
            const body = '<body><div><p begin="00:00:02.000">second</p></div></body>';

            buffer.append(createInitSegment('stpc'), { segmentType: 'InitializationSegment', representation: { mediaInfo } });
            buffer.append(createMultiSampleSegment([stringToBytes(TTML_DOC), box('ttmb', stringToBytes(body))]),
                { segmentType: 'MediaSegment', representation: { mediaInfo } });

            expect(parsed).to.have.lengthOf(2);
            // The spliced document keeps the head of the first sample and takes the new body.
            expect(parsed[1]).to.contain('<head><styling/></head>');
            expect(parsed[1]).to.contain('second');
            expect(parsed[1]).to.not.contain('first');
        });

        it('re-states the active cues for a vttn no-change sample', function () {
            const { buffer, addCaptionsCalls } = createBuffer();
            const mediaInfo = { type: 'text', mimeType: 'application/mp4', codec: 'application/mp4;codecs="wvtc"' };

            buffer.append(createInitSegment('wvtc'), { segmentType: 'InitializationSegment', representation: { mediaInfo } });
            buffer.append(createMultiSampleSegment([vttcBox('Hello'), box('vttn')]),
                { segmentType: 'MediaSegment', representation: { mediaInfo } });

            expect(addCaptionsCalls).to.have.lengthOf(1);
            const cues = addCaptionsCalls[0].captionArray;
            expect(cues).to.have.lengthOf(2);
            expect(cues[1].data).to.equal(cues[0].data);
            expect(cues[1].start).to.equal(cues[0].end);
            expect(cues[1].end).to.equal(cues[0].end + SAMPLE_DURATION / TIMESCALE);
        });

        it('ignores a no-change box on a plain wvtt track', function () {
            const { buffer, addCaptionsCalls } = createBuffer();
            const mediaInfo = { type: 'text', mimeType: 'application/mp4', codec: 'application/mp4;codecs="wvtt"' };

            buffer.append(createInitSegment('wvtt'), { segmentType: 'InitializationSegment', representation: { mediaInfo } });
            buffer.append(createMultiSampleSegment([vttcBox('Hello'), box('vttn')]),
                { segmentType: 'MediaSegment', representation: { mediaInfo } });

            // wvtt has no no-change sample, so the box is just an unknown box and is skipped.
            expect(addCaptionsCalls[0].captionArray).to.have.lengthOf(1);
        });
    });
});
