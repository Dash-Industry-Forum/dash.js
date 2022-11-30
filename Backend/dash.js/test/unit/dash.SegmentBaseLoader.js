import SegmentBaseLoader from '../../src/dash/SegmentBaseLoader';
import EventBus from '../../src/core/EventBus';
import Events from '../../src/core/events/Events';
import Errors from '../../src/core/errors/Errors';
import RequestModifier from '../../src/streaming/utils/RequestModifier';

import ErrorHandlerMock from './mocks/ErrorHandlerMock';
import MediaPlayerModelMock from './mocks/MediaPlayerModelMock';
import DashMetricsMock from './mocks/DashMetricsMock';
import BaseURLControllerMock from './mocks/BaseURLControllerMock';
import DebugMock from './mocks/DebugMock';

const expect = require('chai').expect;

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
