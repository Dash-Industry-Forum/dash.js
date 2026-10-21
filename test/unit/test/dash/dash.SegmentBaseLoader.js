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

const context = {};
let segmentBaseLoader;
const eventBus = EventBus(context).getInstance();

describe('SegmentBaseLoader', function () {

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

        it('should advance the SIDX search by the box offsets within each response', async function () {
            const requests = [];
            FactoryMaker.extend('URLLoader', () => ({
                load: (request) => requests.push(request),
                abort: () => {}
            }), false, context);
            try {
                segmentBaseLoader.initialize();
            } finally {
                delete context.URLLoader;
            }

            const FREE = 0x66726565;
            const SIDX = 0x73696478;
            const response = (length, boxes) => {
                const data = new DataView(new ArrayBuffer(length));
                Object.entries(boxes).forEach(([at, words]) => words.forEach((word, index) => data.setUint32(+at + index * 4, word)));
                return data.buffer;
            };

            const loading = segmentBaseLoader.loadSegments({ path: { url: 'video.mp4' } }, 'video');
            // Each 1500-byte window ends inside a box; the next request starts where that box ends in the file.
            expect(requests[0].request.range).to.equal('0-1500');
            requests[0].success(response(1500, { 0: [1600, FREE] }));
            expect(requests[1].request.range).to.equal('1600-3100');
            requests[1].success(response(1500, { 0: [1500, FREE] }));
            expect(requests[2].request.range).to.equal('3100-4600');
            requests[2].success(response(1500, { 0: [1460, FREE], 1460: [56, SIDX] }));
            expect(requests[3].request.range).to.equal('4560-4616');
            requests[3].success(response(56, { 0: [56, SIDX, 0, 1, 1000, 0, 0, 2, 100, 1000, 0, 100, 1000, 0] }));

            const { segments, error } = await loading;
            expect(error).to.equal(undefined);
            expect(segments.map((segment) => segment.mediaRange)).to.deep.equal(['4616-4715', '4716-4815']);
        });
    });
});
