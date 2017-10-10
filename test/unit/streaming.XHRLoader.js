import XHRLoader from '../../src/streaming/XHRLoader';
import RequestModifier from '../../src/streaming/utils/RequestModifier';
import ErrorHandler from '../../src/streaming/utils/ErrorHandler';
import MetricsModel from '../../src/streaming/models/MetricsModel';

import MediaPlayerModelMock from './mocks/MediaPlayerModelMock';

const expect = require('chai').expect;
const sinon = require('sinon');

const context = {};

let errHandler;
let metricsModel;
let requestModifier;
let mediaPlayerModelMock;
let xhrLoader;

describe('XHRLoader', function () {

    beforeEach(function () {
        mediaPlayerModelMock = new MediaPlayerModelMock();
        errHandler = ErrorHandler(context).getInstance();
        metricsModel = MetricsModel(context).getInstance();
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
        xhrLoader = XHRLoader(context).create({mediaPlayerModel: mediaPlayerModelMock});
        expect(xhrLoader.load.bind(xhrLoader, {request: {}})).to.throw('config object is not correct or missing');
    });

    it('should call success and complete callback when load is called successfully', () => {
        let self = this.ctx;
        const callbackSucceeded = sinon.spy();
        const callbackCompleted = sinon.spy();
        const callbackError = sinon.spy();

        xhrLoader = XHRLoader(context).create({
            errHandler: errHandler,
            metricsModel: metricsModel,
            requestModifier: requestModifier,
            mediaPlayerModel: mediaPlayerModelMock
        });

        xhrLoader.load({request: {checkExistenceOnly: true}, success: callbackSucceeded, complete: callbackCompleted, error: callbackError});
        expect(self.requests.length).to.equal(1);
        self.requests[0].respond(200);
        sinon.assert.calledOnce(callbackSucceeded);
        sinon.assert.calledOnce(callbackCompleted);
        expect(callbackSucceeded.calledBefore(callbackCompleted)).to.be.true; // jshint ignore:line
    });

    it('should call error and complete callback when load is called with error', () => {
        let self = this.ctx;
        const callbackSucceeded = sinon.spy();
        const callbackCompleted = sinon.spy();
        const callbackError = sinon.spy();
        xhrLoader = XHRLoader(context).create({
            errHandler: errHandler,
            metricsModel: metricsModel,
            requestModifier: requestModifier,
            mediaPlayerModel: mediaPlayerModelMock
        });
        xhrLoader.load({request: {checkExistenceOnly: true}, success: callbackSucceeded, complete: callbackCompleted, error: callbackError});
        expect(self.requests.length).to.equal(1);
        self.requests[0].respond(404);
        sinon.assert.calledOnce(callbackError);
        sinon.assert.calledOnce(callbackCompleted);
        sinon.assert.notCalled(callbackSucceeded);
        expect(callbackError.calledBefore(callbackCompleted)).to.be.true; // jshint ignore:line
    });
});
