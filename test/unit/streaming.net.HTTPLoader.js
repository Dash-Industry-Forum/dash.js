import HTTPLoader from '../../src/streaming/net/HTTPLoader';
import RequestModifier from '../../src/streaming/utils/RequestModifier';
import Errors from '../../src/core/errors/Errors';
import ErrorHandler from '../../src/streaming/utils/ErrorHandler';
import DashMetrics from '../../src/dash/DashMetrics';
import MediaPlayerModelMock from './mocks/MediaPlayerModelMock';
import {HTTPRequest} from '../../src/streaming/vo/metrics/HTTPRequest';
import Settings from '../../src/core/Settings';

const expect = require('chai').expect;
const sinon = require('sinon');

const context = {};

let errHandler;
let dashMetrics;
let requestModifier;
let mediaPlayerModelMock;
let httpLoader;
let settings = Settings(context).getInstance();

describe('HTTPLoader', function () {


    beforeEach(function () {
        settings.reset();
        mediaPlayerModelMock = new MediaPlayerModelMock();
        errHandler = ErrorHandler(context).getInstance();
        dashMetrics = DashMetrics(context).getInstance();
        requestModifier = RequestModifier(context).getInstance();
    });

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

    afterEach(function () {
        mediaPlayerModelMock = null;
    });

    it('should throw an exception when attempting to call load and config parameter has not been set properly', () => {
        httpLoader = HTTPLoader(context).create({mediaPlayerModel: mediaPlayerModelMock, errors: Errors});
        expect(httpLoader.load.bind(httpLoader, {request: {}})).to.throw('config object is not correct or missing');
    });

    it('should use XHRLoader if it is not an arraybuffer request even if availabilityTimeComplete is set to false', () => {
        let self = this.ctx;
        const callbackSucceeded = sinon.spy();
        const callbackCompleted = sinon.spy();
        const callbackError = sinon.spy();

        httpLoader = HTTPLoader(context).create({
            errHandler: errHandler,
            dashMetrics: dashMetrics,
            requestModifier: requestModifier,
            mediaPlayerModel: mediaPlayerModelMock,
            errors: Errors
        });

        httpLoader.load({
            request: {
                checkExistenceOnly: true,
                responseType: 'json',
                type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                availabilityTimeComplete: false
            }, success: callbackSucceeded, complete: callbackCompleted, error: callbackError
        });
        expect(self.requests.length).to.equal(1);
        self.requests[0].respond(200);
    });

    it('should use XHRLoader and call success and complete callback when load is called successfully', () => {
        let self = this.ctx;
        const callbackSucceeded = sinon.spy();
        const callbackCompleted = sinon.spy();
        const callbackError = sinon.spy();

        httpLoader = HTTPLoader(context).create({
            errHandler: errHandler,
            dashMetrics: dashMetrics,
            requestModifier: requestModifier,
            mediaPlayerModel: mediaPlayerModelMock,
            errors: Errors
        });

        httpLoader.load({
            request: {checkExistenceOnly: true},
            success: callbackSucceeded,
            complete: callbackCompleted,
            error: callbackError
        });
        expect(self.requests.length).to.equal(1);
        self.requests[0].respond(200);
        sinon.assert.calledOnce(callbackSucceeded);
        sinon.assert.calledOnce(callbackCompleted);
        expect(callbackSucceeded.calledBefore(callbackCompleted)).to.be.true; // jshint ignore:line
    });

    it('should use XHRLoader and call error and complete callback when load is called with error', () => {
        let self = this.ctx;
        const callbackSucceeded = sinon.spy();
        const callbackCompleted = sinon.spy();
        const callbackError = sinon.spy();

        httpLoader = HTTPLoader(context).create({
            errHandler: errHandler,
            dashMetrics: dashMetrics,
            requestModifier: requestModifier,
            mediaPlayerModel: mediaPlayerModelMock,
            errors: Errors
        });

        httpLoader.load({
            request: {checkExistenceOnly: true},
            success: callbackSucceeded,
            complete: callbackCompleted,
            error: callbackError
        });
        expect(self.requests.length).to.equal(1);
        self.requests[0].respond(404);
        sinon.assert.calledOnce(callbackError);
        sinon.assert.calledOnce(callbackCompleted);
        sinon.assert.notCalled(callbackSucceeded);
        expect(callbackError.calledBefore(callbackCompleted)).to.be.true; // jshint ignore:line
    });

    it('should use XHRLoader if it is not a MEDIA_SEGMENT_TYPE request even if availabilityTimeComplete is set to false and it is an arraybuffer request', () => {
        let self = this.ctx;
        const callbackSucceeded = sinon.spy();
        const callbackCompleted = sinon.spy();
        const callbackError = sinon.spy();

        httpLoader = HTTPLoader(context).create({
            errHandler: errHandler,
            dashMetrics: dashMetrics,
            requestModifier: requestModifier,
            mediaPlayerModel: mediaPlayerModelMock,
            errors: Errors
        });

        httpLoader.load({
            request: {
                checkExistenceOnly: true,
                responseType: 'arraybuffer',
                type: HTTPRequest.INIT_SEGMENT_TYPE,
                availabilityTimeComplete: false
            }, success: callbackSucceeded, complete: callbackCompleted, error: callbackError
        });
        expect(self.requests.length).to.equal(1);
        self.requests[0].respond(200);
    });
});



