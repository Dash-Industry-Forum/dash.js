import SegmentBaseLoader from '../../src/dash/SegmentBaseLoader';
import EventBus from '../../src/core/EventBus';
import Events from '../../src/core/events/Events';
import Errors from '../../src/core/errors/Errors';

import ErrorHandlerMock from './mocks/ErrorHandlerMock';
import MediaPlayerModelMock from './mocks/MediaPlayerModelMock';
import DashMetricsMock from './mocks/DashMetricsMock';
import BaseURLControllerMock from './mocks/BaseURLControllerMock';

const expect = require('chai').expect;

const context = {};
let segmentBaseLoader;
const eventBus = EventBus(context).getInstance();

describe('SegmentBaseLoader', function () {
    describe('Not well initialized', function () {
        beforeEach(function () {
            segmentBaseLoader = SegmentBaseLoader(context).getInstance();
            segmentBaseLoader.initialize();
        });

        afterEach(function () {
            segmentBaseLoader.reset();
        });

        it('should throw an exception when attempting to call loadInitialization While the setConfig function was not called, and parameters are undefined', function () {
            expect(segmentBaseLoader.loadInitialization.bind(segmentBaseLoader)).to.throw('setConfig function has to be called previously');
        });

        it('should throw an exception when attempting to call loadSegments While the setConfig function was not called, and parameters are undefined', function () {
            expect(segmentBaseLoader.loadSegments.bind(segmentBaseLoader)).to.throw('setConfig function has to be called previously');
        });
    });

    describe('Well initialized', function () {
        beforeEach(function () {
            segmentBaseLoader = SegmentBaseLoader(context).getInstance();
            segmentBaseLoader.setConfig({
                baseURLController: new BaseURLControllerMock(),
                dashMetrics: new DashMetricsMock(),
                mediaPlayerModel: new MediaPlayerModelMock(),
                errHandler: new ErrorHandlerMock()
            });
            segmentBaseLoader.initialize();
        });

        afterEach(function () {
            segmentBaseLoader.reset();
        });

        it('should trigger INITIALIZATION_LOADED event when loadInitialization function is called without representation parameter', function (done) {
            const onInitLoaded = function () {
                eventBus.off(Events.INITIALIZATION_LOADED, onInitLoaded);
                done();
            };
            eventBus.on(Events.INITIALIZATION_LOADED, onInitLoaded, this);
            segmentBaseLoader.loadInitialization();
        });

        it('should trigger SEGMENTS_LOADED event with an error when loadSegments function is called without representation parameter', function (done) {
            const onSegmentLoaded = function (e) {
                eventBus.off(Events.SEGMENTS_LOADED, onSegmentLoaded);
                expect(e.error).not.to.equal(undefined);
                expect(e.error.code).to.equal(Errors.SEGMENT_BASE_LOADER_ERROR_CODE);
                expect(e.error.message).to.equal(Errors.SEGMENT_BASE_LOADER_ERROR_MESSAGE);
                done();
            };
            eventBus.on(Events.SEGMENTS_LOADED, onSegmentLoaded, this);
            segmentBaseLoader.loadSegments();
        });
    });
});