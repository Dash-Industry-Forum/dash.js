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

        it('should request child SIDX boxes relative to the parent SIDX position and first_offset', async function () {
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

            const toBuffer = (words) => {
                const data = new DataView(new ArrayBuffer(words.length * 4));
                words.forEach((word, index) => data.setUint32(index * 4, word));
                return data.buffer;
            };
            // Version 0 boxes: a free box, then a parent SIDX with first_offset 16 referencing two child indexes.
            const parent = toBuffer([8, 0x66726565, 56, 0x73696478, 0, 1, 1000, 0, 16, 2, 0x8000002c, 1000, 0, 0x8000002c, 1000, 0]);
            const firstChild = toBuffer([44, 0x73696478, 0, 1, 1000, 0, 44, 1, 100, 1000, 0]);
            const secondChild = toBuffer([44, 0x73696478, 0, 1, 1000, 1000, 100, 1, 100, 1000, 0]);

            const loading = segmentBaseLoader.loadSegments({ path: { url: 'video.mp4' } }, 'video', '100-163');
            requests[0].success(parent);
            // 100 (index range start) + 8 (free box) + 56 (parent size) + 16 (first_offset)
            expect(requests.slice(1).map(({ request }) => request.range)).to.deep.equal(['180-223', '224-267']);
            requests[1].success(firstChild);
            requests[2].success(secondChild);

            const { segments, error } = await loading;
            expect(error).to.equal(undefined);
            expect(segments.map((segment) => segment.mediaRange)).to.deep.equal(['268-367', '368-467']);
        });
    });
});
