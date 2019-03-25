import WebmSegmentBaseLoader from '../../src/dash/WebmSegmentBaseLoader';
import Constants from '../../src/streaming/constants/Constants';
import EventBus from '../../src/core/EventBus';
import Events from '../../src/core/events/Events';
import Errors from '../../src/core/errors/Errors';

import ErrorHandlerMock from './mocks/ErrorHandlerMock';
import MediaPlayerModelMock from './mocks/MediaPlayerModelMock';
import DashMetricsMock from './mocks/DashMetricsMock';
import BaseURLControllerMock from './mocks/BaseURLControllerMock';

const expect = require('chai').expect;
const sinon = require('sinon');

const context = {};
let webmSegmentBaseLoader;
const eventBus = EventBus(context).getInstance();

describe('WebmSegmentBaseLoader', function () {
    beforeEach(function () {

        global.XMLHttpRequest = sinon.useFakeXMLHttpRequest();

        this.requests = [];
        global.XMLHttpRequest.onCreate = function (xhr) {
            this.requests.push(xhr);
        }.bind(this);
    });

    afterEach(function () {
        global.XMLHttpRequest.restore();
    });
    describe('Not well initialized', function () {
        beforeEach(function () {
            webmSegmentBaseLoader = WebmSegmentBaseLoader(context).getInstance();
            webmSegmentBaseLoader.initialize();
        });

        afterEach(function () {
            webmSegmentBaseLoader.reset();
        });
        it('should throw an exception when attempting to call loadInitialization While the setConfig function was not called, and parameters are undefined', function () {
            expect(webmSegmentBaseLoader.loadInitialization.bind(webmSegmentBaseLoader)).to.throw('setConfig function has to be called previously');
        });

        it('should throw an exception when attempting to call loadSegments While the setConfig function was not called, and parameters are undefined', function () {
            expect(webmSegmentBaseLoader.loadSegments.bind(webmSegmentBaseLoader)).to.throw('setConfig function has to be called previously');
        });

        it('should throw an exception when attempting to call setConfig with an empty config parameter or malformed', function () {
            expect(webmSegmentBaseLoader.setConfig.bind(webmSegmentBaseLoader, {})).to.throw(Constants.MISSING_CONFIG_ERROR);
        });
    });

    describe('Well initialized', function () {
        beforeEach(function () {
            webmSegmentBaseLoader = WebmSegmentBaseLoader(context).getInstance();
            webmSegmentBaseLoader.setConfig({
                baseURLController: new BaseURLControllerMock(),
                dashMetrics: new DashMetricsMock(),
                mediaPlayerModel: new MediaPlayerModelMock(),
                errHandler: new ErrorHandlerMock()
            });
            webmSegmentBaseLoader.initialize();
        });

        afterEach(function () {
            webmSegmentBaseLoader.reset();
        });

        it('should trigger INITIALIZATION_LOADED event when loadInitialization function is called without representation parameter', function (done) {
            const self = this.test.ctx;
            const onInitLoaded = function () {
                eventBus.off(Events.INITIALIZATION_LOADED, onInitLoaded);
                done();
            };
            eventBus.on(Events.INITIALIZATION_LOADED, onInitLoaded, this);
            webmSegmentBaseLoader.loadInitialization();
            self.requests[0].respond(200);
        });

        it('should trigger SEGMENTS_LOADED event with an error when loadSegments function is called without representation parameter', function (done) {
            const self = this.test.ctx;
            const onSegmentLoaded = function (e) {
                eventBus.off(Events.SEGMENTS_LOADED, onSegmentLoaded);
                expect(e.error).not.to.equal(undefined);
                expect(e.error.code).to.equal(Errors.SEGMENT_BASE_LOADER_ERROR_CODE);
                expect(e.error.message).to.equal(Errors.SEGMENT_BASE_LOADER_ERROR_MESSAGE);
                done();
            };
            eventBus.on(Events.SEGMENTS_LOADED, onSegmentLoaded, this);
            webmSegmentBaseLoader.loadSegments();
            self.requests[0].respond(200);
        });
    });
});