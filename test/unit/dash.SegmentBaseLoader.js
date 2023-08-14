import SegmentBaseLoader from '../../src/dash/SegmentBaseLoader.js';
import EventBus from '../../src/core/EventBus.js';
import Events from '../../src/core/events/Events.js';
import Errors from '../../src/core/errors/Errors.js';
import RequestModifier from '../../src/streaming/utils/RequestModifier.js';
import ErrorHandlerMock from './mocks/ErrorHandlerMock.js';
import MediaPlayerModelMock from './mocks/MediaPlayerModelMock.js';
import DashMetricsMock from './mocks/DashMetricsMock.js';
import BaseURLControllerMock from './mocks/BaseURLControllerMock.js';
import DebugMock from './mocks/DebugMock.js';
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
                dashMetrics: new DashMetricsMock(),
                mediaPlayerModel: new MediaPlayerModelMock(),
                errHandler: new ErrorHandlerMock(),
                debug: new DebugMock(),
                eventBus: eventBus,
                events: Events,
                errors: Errors,
                requestModifier: RequestModifier(context).getInstance()
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
});
