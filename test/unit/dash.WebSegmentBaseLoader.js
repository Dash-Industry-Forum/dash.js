import WebmSegmentBaseLoader from '../../src/dash/WebmSegmentBaseLoader.js';
import Constants from '../../src/streaming/constants/Constants.js';
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
import sinon from 'sinon';

const context = {};
let webmSegmentBaseLoader;
const eventBus = EventBus(context).getInstance();

describe('WebmSegmentBaseLoader', function () {
    beforeEach(function () {

        XMLHttpRequest = sinon.useFakeXMLHttpRequest();

        this.requests = [];
        XMLHttpRequest.onCreate = function (xhr) {
            this.requests.push(xhr);
        }.bind(this);
    });

    afterEach(function () {
        XMLHttpRequest.restore();
    });
    describe('Not well initialized', function () {
        beforeEach(function () {
            webmSegmentBaseLoader = WebmSegmentBaseLoader(context).getInstance();
            webmSegmentBaseLoader.initialize();
        });

        afterEach(function () {
            webmSegmentBaseLoader.reset();
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
                errHandler: new ErrorHandlerMock(),
                debug: new DebugMock(),
                eventBus: eventBus,
                events: Events,
                errors: Errors,
                requestModifier: RequestModifier(context).getInstance()
            });
            webmSegmentBaseLoader.initialize();
        });

        afterEach(function () {
            webmSegmentBaseLoader.reset();
        });

        it('should trigger INITIALIZATION_LOADED event when loadInitialization function is called without representation parameter', function (done) {
            const self = this.test.ctx;
            webmSegmentBaseLoader.loadInitialization()
                .then(() => {
                    done();
                })
                .catch((e) => {
                    done(e);
                });
            self.requests[0].respond(200);
        });

        it('should trigger SEGMENTS_LOADED event with an error when loadSegments function is called without representation parameter', function (done) {
            const self = this.test.ctx;

            webmSegmentBaseLoader.loadSegments()
                .then((e) => {
                    expect(e.error).not.to.equal(undefined);
                    expect(e.error.code).to.equal(Errors.SEGMENT_BASE_LOADER_ERROR_CODE);
                    expect(e.error.message).to.equal(Errors.SEGMENT_BASE_LOADER_ERROR_MESSAGE);
                    done();
                })
                .catch((e) => {
                    done(e);
                });

            self.requests[0].respond(200);
        });
    });
});
