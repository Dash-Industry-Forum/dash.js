import SegmentBaseLoader from '../../../../src/dash/SegmentBaseLoader.js';
import BoxParser from '../../../../src/streaming/utils/BoxParser.js';
import FactoryMaker from '../../../../src/core/FactoryMaker.js';
import EventBus from '../../../../src/core/EventBus.js';
import Events from '../../../../src/core/events/Events.js';
import Errors from '../../../../src/core/errors/Errors.js';
import ErrorHandlerMock from '../../mocks/ErrorHandlerMock.js';
import MediaPlayerModelMock from '../../mocks/MediaPlayerModelMock.js';
import DashMetricsMock from '../../mocks/DashMetricsMock.js';
import BaseURLControllerMock from '../../mocks/BaseURLControllerMock.js';
import DebugMock from '../../mocks/DebugMock.js';
import {expect} from 'chai';
import {fakeXhr} from 'nise';

const context = {};
let segmentBaseLoader;
const eventBus = EventBus(context).getInstance();

describe('SegmentBaseLoader', function () {

    beforeEach(function () {
        XMLHttpRequest = fakeXhr.useFakeXMLHttpRequest();
        this.requests = [];
        XMLHttpRequest.onCreate = function (xhr) {
            this.requests.push(xhr);
        }.bind(this);
    });

    afterEach(function () {
        XMLHttpRequest.restore();
    });

    describe('Well initialized', function () {
        beforeEach(function () {
            segmentBaseLoader = SegmentBaseLoader(context).getInstance();
            segmentBaseLoader.setConfig({
                baseURLController: new BaseURLControllerMock(),
                boxParser: BoxParser(context).getInstance(),
                dashMetrics: new DashMetricsMock(),
                mediaPlayerModel: new MediaPlayerModelMock(),
                errHandler: new ErrorHandlerMock(),
                debug: new DebugMock(),
                eventBus: eventBus,
                events: Events,
                errors: Errors
            });
            segmentBaseLoader.initialize();
        });

        afterEach(function () {
            segmentBaseLoader.reset();
        });

        it('should work if loadInitialization function is called without representation parameter', function (done) {
            segmentBaseLoader.loadInitialization()
                .then(() => {
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        });

        it('should trigger SEGMENTS_LOADED event with an error when loadSegments function is called without representation parameter', function (done) {
            segmentBaseLoader.loadSegments()
                .then((e) => {
                    expect(e.error).not.to.equal(undefined);
                    expect(e.error.code).to.equal(Errors.SEGMENT_BASE_LOADER_ERROR_CODE);
                    expect(e.error.message).to.equal(Errors.SEGMENT_BASE_LOADER_ERROR_MESSAGE);
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        });

        describe('multi-SIDX', function () {
            let requests, parent, firstChild, secondChild;

            const toBuffer = (words) => {
                const data = new DataView(new ArrayBuffer(words.length * 4));
                words.forEach((word, index) => data.setUint32(index * 4, word));
                return data.buffer;
            };

            beforeEach(function () {
                requests = [];
                FactoryMaker.extend('URLLoader', () => ({
                    load: (request) => requests.push(request),
                    abort: () => {}
                }), false, context);
                try {
                    segmentBaseLoader.initialize();
                } finally {
                    delete context.URLLoader;
                }

                // Version 0 SIDX boxes: a parent referencing two child indexes, each with one media segment.
                [parent, firstChild, secondChild] = [
                    [56, 0x73696478, 0, 1, 1000, 0, 0, 2, 0x8000002c, 1000, 0, 0x8000002c, 1000, 0],
                    [44, 0x73696478, 0, 1, 1000, 0, 44, 1, 100, 1000, 0],
                    [44, 0x73696478, 0, 1, 1000, 1000, 100, 1, 100, 1000, 0]
                ].map(toBuffer);
            });

            it('should keep segments in parent reference order when child requests complete out of order', async function () {
                const loading = segmentBaseLoader.loadSegments({ path: { url: 'video.mp4' } }, 'video', '0-55');
                requests[0].success(parent);
                expect(requests.slice(1).map(({ request }) => request.range)).to.deep.equal(['56-99', '100-143']);
                requests[2].success(secondChild);
                requests[1].success(firstChild);

                const { segments, error } = await loading;
                expect(error).to.equal(undefined);
                expect(segments.map((segment) => segment.startTime)).to.deep.equal([0, 1000]);
                expect(segments.map((segment) => segment.mediaRange)).to.deep.equal(['144-243', '244-343']);
            });

            it('should keep collecting child results when an incomplete child SIDX is reloaded', async function () {
                const loading = segmentBaseLoader.loadSegments({ path: { url: 'video.mp4' } }, 'video', '0-55');
                requests[0].success(parent);
                requests[1].success(firstChild.slice(0, 40));
                expect(requests[3].request.range).to.equal('56-99');
                requests[2].success(secondChild);
                requests[3].success(firstChild);

                const { segments, error } = await loading;
                expect(error).to.equal(undefined);
                expect(segments.map((segment) => segment.mediaRange)).to.deep.equal(['144-243', '244-343']);
            });

            it('should request child SIDX boxes relative to the parent SIDX position and first_offset', async function () {
                // A free box, then a parent SIDX with first_offset 16 referencing two child indexes.
                const offsetParent = toBuffer([8, 0x66726565, 56, 0x73696478, 0, 1, 1000, 0, 16, 2, 0x8000002c, 1000, 0, 0x8000002c, 1000, 0]);

                const loading = segmentBaseLoader.loadSegments({ path: { url: 'video.mp4' } }, 'video', '100-163');
                requests[0].success(offsetParent);
                // 100 (index range start) + 8 (free box) + 56 (parent size) + 16 (first_offset)
                expect(requests.slice(1).map(({ request }) => request.range)).to.deep.equal(['180-223', '224-267']);
                requests[1].success(firstChild);
                requests[2].success(secondChild);

                const { segments, error } = await loading;
                expect(error).to.equal(undefined);
                expect(segments.map((segment) => segment.mediaRange)).to.deep.equal(['268-367', '368-467']);
            });

            it('should reload an incomplete SIDX relative to the index range start', async function () {
                // A free box, then a parent SIDX with first_offset 16; the index range only covers its first 32 bytes.
                const offsetParent = toBuffer([8, 0x66726565, 56, 0x73696478, 0, 1, 1000, 0, 16, 2, 0x8000002c, 1000, 0, 0x8000002c, 1000, 0]);

                const loading = segmentBaseLoader.loadSegments({ path: { url: 'video.mp4' } }, 'video', '100-139');
                requests[0].success(offsetParent.slice(0, 40));
                // 100 (index range start) + 8 (free box), up to the end of the 56 byte parent
                expect(requests[1].request.range).to.equal('108-163');
                requests[1].success(offsetParent.slice(8));
                expect(requests.slice(2).map(({ request }) => request.range)).to.deep.equal(['180-223', '224-267']);
                requests[2].success(firstChild);
                requests[3].success(secondChild);

                const { segments, error } = await loading;
                expect(error).to.equal(undefined);
                expect(segments.map((segment) => segment.mediaRange)).to.deep.equal(['268-367', '368-467']);
            });

            it('should continue the SIDX search from the end of the last box in the current chunk', async function () {
                // Search chunks are 1500 bytes; each starts with a box that extends past the chunk end.
                const chunkStartingWithBox = (size) => {
                    const data = new DataView(new ArrayBuffer(1501));
                    data.setUint32(0, size);
                    data.setUint32(4, 0x66726565);
                    return data.buffer;
                };

                const loading = segmentBaseLoader.loadSegments({ path: { url: 'video.mp4' } }, 'video');
                expect(requests[0].request.range).to.equal('0-1500');
                requests[0].success(chunkStartingWithBox(2000));
                expect(requests[1].request.range).to.equal('2000-3500');
                requests[1].success(chunkStartingWithBox(3000));
                // 2000 (chunk start) + 3000 (box size)
                expect(requests[2].request.range).to.equal('5000-6500');
                requests[2].success(parent);
                expect(requests.slice(3).map(({ request }) => request.range)).to.deep.equal(['5056-5099', '5100-5143']);
                requests[3].success(firstChild);
                requests[4].success(secondChild);

                const { segments, error } = await loading;
                expect(error).to.equal(undefined);
                expect(segments.map((segment) => segment.mediaRange)).to.deep.equal(['5144-5243', '5244-5343']);
            });
        });
    });

    describe('loadSegments', function () {
        // A sidx carrying two references, preceded by an eight byte free box so that the sidx does
        // not start at offset zero and sidx.offset takes part in the byte range calculation.
        const SIDX_TIMESCALE = 90000;
        const SIDX_REFERENCES = [
            { referencedSize: 100, subsegmentDuration: 1000 },
            { referencedSize: 200, subsegmentDuration: 1500 }
        ];
        const FREE_BOX_SIZE = 8;
        const SIDX_SIZE = 32 + SIDX_REFERENCES.length * 12;
        // range.start + sidx.offset + first_offset + sidx.size
        const FIRST_SEGMENT_START = 0 + FREE_BOX_SIZE + 0 + SIDX_SIZE;

        function buildSidxResponse() {
            const buffer = new ArrayBuffer(FREE_BOX_SIZE + SIDX_SIZE);
            const view = new DataView(buffer);
            let offset = 0;

            const writeType = (type) => {
                for (let i = 0; i < 4; i++) {
                    view.setUint8(offset + i, type.charCodeAt(i));
                }
                offset += 4;
            };

            view.setUint32(offset, FREE_BOX_SIZE); offset += 4;
            writeType('free');

            view.setUint32(offset, SIDX_SIZE); offset += 4;
            writeType('sidx');
            view.setUint32(offset, 0); offset += 4; // version 0, no flags
            view.setUint32(offset, 1); offset += 4; // reference_ID
            view.setUint32(offset, SIDX_TIMESCALE); offset += 4;
            view.setUint32(offset, 0); offset += 4; // earliest_presentation_time
            view.setUint32(offset, 0); offset += 4; // first_offset
            view.setUint16(offset, 0); offset += 2; // reserved
            view.setUint16(offset, SIDX_REFERENCES.length); offset += 2;

            SIDX_REFERENCES.forEach((reference) => {
                // reference_type 0 in the top bit, referenced_size in the remaining 31
                view.setUint32(offset, reference.referencedSize & 0x7FFFFFFF); offset += 4;
                view.setUint32(offset, reference.subsegmentDuration); offset += 4;
                view.setUint32(offset, 0x90000000); offset += 4; // starts_with_SAP, SAP type 1
            });

            return buffer;
        }

        beforeEach(function () {
            segmentBaseLoader = SegmentBaseLoader(context).getInstance();
            segmentBaseLoader.setConfig({
                // resolve() must hand back an object carrying a url, the loader reads baseUrl.url
                baseURLController: {
                    resolve: function () {
                        return { url: 'http://example.com/media.mp4', serviceLocation: '' };
                    }
                },
                dashMetrics: new DashMetricsMock(),
                mediaPlayerModel: new MediaPlayerModelMock(),
                errHandler: new ErrorHandlerMock(),
                debug: new DebugMock(),
                boxParser: BoxParser(context).getInstance(),
                eventBus: eventBus,
                events: Events,
                errors: Errors
            });
            segmentBaseLoader.initialize();
        });

        afterEach(function () {
            segmentBaseLoader.reset();
        });

        it('should turn the sidx references into index records carrying the fields their consumers read', function (done) {
            const self = this.test.ctx;
            const representation = { path: 'http://example.com/media.mp4' };

            segmentBaseLoader.loadSegments(representation, 'video', { start: 0, end: FREE_BOX_SIZE + SIDX_SIZE - 1 })
                .then((result) => {
                    expect(result.error).to.equal(undefined);
                    expect(result.segments).to.be.an('array').with.lengthOf(2);

                    const [first, second] = result.segments;
                    const firstEnd = FIRST_SEGMENT_START + SIDX_REFERENCES[0].referencedSize - 1;
                    const secondStart = firstEnd + 1;
                    const secondEnd = secondStart + SIDX_REFERENCES[1].referencedSize - 1;

                    expect(first.duration).to.equal(SIDX_REFERENCES[0].subsegmentDuration);
                    expect(first.startTime).to.equal(0);
                    expect(first.timescale).to.equal(SIDX_TIMESCALE);
                    expect(first.mediaRange).to.equal(`${FIRST_SEGMENT_START}-${firstEnd}`);
                    expect(first.media).to.equal(null);

                    // The second entry advances both the media time and the byte range.
                    expect(second.duration).to.equal(SIDX_REFERENCES[1].subsegmentDuration);
                    expect(second.startTime).to.equal(SIDX_REFERENCES[0].subsegmentDuration);
                    expect(second.timescale).to.equal(SIDX_TIMESCALE);
                    expect(second.mediaRange).to.equal(`${secondStart}-${secondEnd}`);
                    expect(second.media).to.equal(null);

                    done();
                })
                .catch(done);

            setTimeout(() => self.requests[0].respond(200, { 'Content-Type': 'application/octet-stream' }, buildSidxResponse()), 1);
        });
    });
});
