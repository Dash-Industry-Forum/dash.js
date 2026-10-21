import SegmentBaseLoader from '../../../../src/dash/SegmentBaseLoader.js';
import EventBus from '../../../../src/core/EventBus.js';
import Events from '../../../../src/core/events/Events.js';
import Errors from '../../../../src/core/errors/Errors.js';
import ErrorHandlerMock from '../../mocks/ErrorHandlerMock.js';
import MediaPlayerModelMock from '../../mocks/MediaPlayerModelMock.js';
import DashMetricsMock from '../../mocks/DashMetricsMock.js';
import BaseURLControllerMock from '../../mocks/BaseURLControllerMock.js';
import DebugMock from '../../mocks/DebugMock.js';
import BoxParser from '../../../../src/streaming/utils/BoxParser.js';
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
