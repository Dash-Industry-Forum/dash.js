import TextSourceBuffer from '../../../../src/streaming/text/TextSourceBuffer.js';
import TTMLParser from '../../../../src/streaming/utils/TTMLParser.js';
import Errors from '../../../../src/core/errors/Errors.js';
import ErrorHandlerMock from '../../mocks/ErrorHandlerMock.js';
import AdapterMock from '../../mocks/AdapterMock.js';
import CustomTimeRanges from '../../../../src/streaming/utils/CustomTimeRanges.js';
import EventBus from '../../../../src/core/EventBus.js';
import Events from '../../../../src/core/events/Events.js';

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
                },
                getTextTrackInfos: () => []
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
            expect(addCaptionsCalls[0].captionArray[0].end)
                .to.equal((BASE_MEDIA_DECODE_TIME + SAMPLE_DURATION) / TIMESCALE);
            // Buffered range is in presentation time: timestampOffset + cts / timescale
            expect(buffer.buffered.start(0)).to.equal(TIMESTAMP_OFFSET + BASE_MEDIA_DECODE_TIME / TIMESCALE);
            expect(buffer.buffered.end(0))
                .to.equal(TIMESTAMP_OFFSET + (BASE_MEDIA_DECODE_TIME + SAMPLE_DURATION) / TIMESCALE);
        });

        it('should add the cues to the text track of the current fragmented track', function () {
            const englishTrack = {
                type: 'text',
                id: 'eng',
                index: 0,
                lang: 'en',
                isFragmented: true,
                mimeType: 'application/mp4',
                codec: 'application/mp4;codecs="wvtt"'
            };
            // A non fragmented track between the fragmented ones shifts the index of every
            // following fragmented track in the list of all text tracks
            const sideloadedTrack = {
                type: 'text',
                id: 'side',
                index: 1,
                lang: 'fr',
                isFragmented: false,
                mimeType: 'text/vtt'
            };
            const germanTrack = {
                ...englishTrack,
                id: 'deu',
                index: 2,
                lang: 'de'
            };
            const allTracks = [englishTrack, sideloadedTrack, germanTrack];

            const textTrackInfos = [];
            const addCaptionsCalls = [];
            const textTracksMock = {
                addCaptions: (idx) => addCaptionsCalls.push(idx),
                addTextTrackInfo: (info) => textTrackInfos.push(info),
                getTextTrackInfos: () => textTrackInfos,
                deleteAllTextTracks: () => {}
            };
            const mediaControllerMock = {
                getTracksFor: () => allTracks,
                getCurrentTrackFor: () => germanTrack
            };
            const buffer = TextSourceBuffer(context).create({
                errHandler: errorHandlerMock,
                mediaController: mediaControllerMock,
                streamInfo: { id: 'stream' },
                textTracks: textTracksMock
            });
            buffer.initialize();
            buffer.addMediaInfos('text', allTracks, {});

            const representation = { mediaInfo: germanTrack };
            buffer.append(createInitSegment(), { segmentType: 'InitializationSegment', representation });
            buffer.append(createMediaSegment('Hallo'), { segmentType: 'MediaSegment', representation });

            buffer.resetEmbedded();

            expect(addCaptionsCalls).to.deep.equal([2]);
        });

        it('should keep the cues of other segments if a fragmented STPP sample cannot be parsed', function () {
            const track = {
                type: 'text',
                id: 'eng',
                index: 0,
                isFragmented: true,
                mimeType: 'application/mp4',
                codec: 'application/mp4;codecs="stpp"'
            };
            const textTrackInfos = [];
            const deleteCalls = [];
            const textTracksMock = {
                addCaptions: () => {},
                addTextTrackInfo: (info) => textTrackInfos.push(info),
                getTextTrackInfos: () => textTrackInfos,
                deleteCuesFromTrackIdx: (idx, from, to) => deleteCalls.push({ idx, from, to }),
                deleteAllTextTracks: () => {}
            };
            const buffer = TextSourceBuffer(context).create({
                errHandler: errorHandlerMock,
                manifestModel: { getValue: () => ({}) },
                mediaController: {
                    getTracksFor: () => [track],
                    getCurrentTrackFor: () => track
                },
                streamInfo: { id: 'stream' },
                textTracks: textTracksMock,
                ttmlParser: {
                    parse: () => {
                        throw new Error('invalid TTML');
                    }
                }
            });
            buffer.initialize();
            buffer.addMediaInfos('text', [track], { removeExecutedRequestsBeforeTime: () => {} });
            // Cues of earlier segments are already parsed up to the start of the failing sample
            buffer.buffered.add(0, BASE_MEDIA_DECODE_TIME / TIMESCALE);

            const representation = { mediaInfo: track };
            buffer.append(createInitSegment(), { segmentType: 'InitializationSegment', representation });
            buffer.append(createMediaSegment('<tt'), { segmentType: 'MediaSegment', representation });

            expect(deleteCalls).to.be.empty;
            expect(buffer.buffered.length).to.equal(1);
            expect(buffer.buffered.start(0)).to.equal(0);
            expect(buffer.buffered.end(0)).to.equal(BASE_MEDIA_DECODE_TIME / TIMESCALE);
        });
    });

    describe('Method remove', function () {
        it('should not delete any cues if no range is given and nothing is buffered', function () {
            const deleteCalls = [];
            const buffer = TextSourceBuffer(context).create({
                errHandler: errorHandlerMock,
                textTracks: {
                    deleteCuesFromTrackIdx: (idx, from, to) => deleteCalls.push({ idx, from, to })
                }
            });
            buffer.buffered = CustomTimeRanges(context).create();

            buffer.remove();

            expect(deleteCalls).to.be.empty;
        });

        it('should remove the range from the buffered ranges and delete its cues', function () {
            const deleteCalls = [];
            const buffer = TextSourceBuffer(context).create({
                errHandler: errorHandlerMock,
                textTracks: {
                    deleteCuesFromTrackIdx: (idx, from, to) => deleteCalls.push({ from, to })
                }
            });
            buffer.buffered = CustomTimeRanges(context).create();
            buffer.buffered.add(0, 30);

            buffer.remove(0, 20);

            expect(buffer.buffered.start(0)).to.equal(20);
            expect(buffer.buffered.end(0)).to.equal(30);
            expect(deleteCalls).to.deep.equal([{ from: 0, to: 20 }]);
        });
    });

    describe('embedded CEA-608 tracks on BUFFER_CLEARED', function () {
        const eventBus = EventBus(context).getInstance();
        let buffer;
        let deleteCalls;

        const createBuffer = (isDynamic) => {
            buffer = TextSourceBuffer(context).create({
                errHandler: errorHandlerMock,
                streamInfo: { id: 'stream', manifestInfo: { isDynamic } },
                textTracks: {
                    getTrackIdxForId: () => 0,
                    deleteCuesFromTrackIdx: (idx, from, to) => deleteCalls.push({ idx, from, to }),
                    deleteAllTextTracks: () => {}
                }
            });
            buffer.initialize();
            buffer.addEmbeddedTrack({ id: 'CC1' });
        };

        beforeEach(function () {
            deleteCalls = [];
        });

        afterEach(function () {
            buffer.resetEmbedded();
        });

        it('should delete the embedded cues when the video buffer of a dynamic stream is cleared', function () {
            createBuffer(true);
            eventBus.trigger(Events.BUFFER_CLEARED, { from: 0, to: 10 }, { streamId: 'stream', mediaType: 'video' });

            expect(deleteCalls).to.deep.equal([{ idx: 0, from: 0, to: 10 }]);
        });

        it('should keep the embedded cues when the video buffer of a static stream is cleared', function () {
            createBuffer(false);
            eventBus.trigger(Events.BUFFER_CLEARED, { from: 0, to: 10 }, { streamId: 'stream', mediaType: 'video' });

            expect(deleteCalls).to.be.empty;
        });

        it('should keep the embedded cues when the audio or text buffer is cleared', function () {
            createBuffer(true);
            eventBus.trigger(Events.BUFFER_CLEARED, { from: 0, to: 10 }, { streamId: 'stream', mediaType: 'audio' });
            eventBus.trigger(Events.BUFFER_CLEARED, { from: 0, to: 10 }, { streamId: 'stream', mediaType: 'text' });

            expect(deleteCalls).to.be.empty;
        });
    });
});
