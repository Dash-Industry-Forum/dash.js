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
        const TIMESCALE = 1000;
        const BASE_MEDIA_DECODE_TIME = 10000; // 10s in media (period-local) time
        const SAMPLE_DURATION = 2000;
        const TIMESTAMP_OFFSET = 100; // MSE offset for a later period

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

        function createInitSegment() {
            const mdhd = fullBox('mdhd', 0, 0, u32(0), u32(0), u32(TIMESCALE), u32(0), u16(0), u16(0));
            return new Uint8Array(box('moov', box('trak', box('mdia', mdhd)))).buffer;
        }

        function createMediaSegment(cueText) {
            const vttc = box('vttc', box('payl', stringToBytes(cueText)));

            function createMoof(dataOffset) {
                const tfhd = fullBox('tfhd', 0, 0, u32(1));
                const tfdt = fullBox('tfdt', 1, 0, u32(0), u32(BASE_MEDIA_DECODE_TIME));
                // trun flags: data-offset, sample-duration and sample-size present
                const trun = fullBox('trun', 0, 0x000301, u32(1), u32(dataOffset), u32(SAMPLE_DURATION), u32(vttc.length));
                return box('moof', fullBox('mfhd', 0, 0, u32(1)), box('traf', tfhd, tfdt, trun));
            }

            const moofSize = createMoof(0).length;
            const moof = createMoof(moofSize + 8); // sample data starts after the mdat header
            return new Uint8Array([...moof, ...box('mdat', vttc)]).buffer;
        }

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
            buffer.append(createMediaSegment('Hello'), { segmentType: 'MediaSegment', representation: { mediaInfo } });

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
});
