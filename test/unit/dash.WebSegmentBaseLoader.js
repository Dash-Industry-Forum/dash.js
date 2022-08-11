import WebmSegmentBaseLoader from '../../src/dash/WebmSegmentBaseLoader';
import Constants from '../../src/streaming/constants/Constants';
import EventBus from '../../src/core/EventBus';
import Events from '../../src/core/events/Events';
import Errors from '../../src/core/errors/Errors';
import RequestModifier from '../../src/streaming/utils/RequestModifier';
import { sleep } from './helpers/Async';

import ErrorHandlerMock from './mocks/ErrorHandlerMock';
import MediaPlayerModelMock from './mocks/MediaPlayerModelMock';
import DashMetricsMock from './mocks/DashMetricsMock';
import BaseURLControllerMock from './mocks/BaseURLControllerMock';
import DebugMock from './mocks/DebugMock';

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

        it('should trigger INITIALIZATION_LOADED event when loadInitialization function is called without representation parameter', async function () {
            const self = this.test.ctx;

            webmSegmentBaseLoader.loadInitialization();

            await sleep(0);

            self.requests[0].respond(200);
        });

        it('should trigger SEGMENTS_LOADED event with an error when loadSegments function is called without representation parameter', async function () {
            const self = this.test.ctx;

            const promise = webmSegmentBaseLoader.loadSegments();

            await sleep(0);

            self.requests[0].respond(200);

            const e = await promise;
            expect(e.error).not.to.equal(undefined);
            expect(e.error.code).to.equal(Errors.SEGMENT_BASE_LOADER_ERROR_CODE);
            expect(e.error.message).to.equal(Errors.SEGMENT_BASE_LOADER_ERROR_MESSAGE);
        });
    });
});
