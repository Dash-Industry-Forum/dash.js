import HTTPLoader from '../../src/streaming/net/HTTPLoader';
import RequestModifier from '../../src/streaming/utils/RequestModifier';
import Errors from '../../src/core/errors/Errors';
import ErrorHandler from '../../src/streaming/utils/ErrorHandler';
import DashMetrics from '../../src/dash/DashMetrics';
import MediaPlayerModelMock from './mocks/MediaPlayerModelMock';
import {
    HTTPRequest
}
    from '../../src/streaming/vo/metrics/HTTPRequest';
import Settings from '../../src/core/Settings';

const expect = require('chai').expect;
const sinon = require('sinon');
const Stream = require('stream');

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
        if (typeof window === 'undefined') {
            global.window = {
                fetch: function () { }
            };
        }

        // Mock Reponse
        global.Response = function (body, opts) {
            this.url = '';
            this.statusText = '';
            this.headers = null;
            if (body instanceof Stream.Readable) {
                this.body = {
                    getReader: function () {
                        return {
                            read: function () {
                                return Promise.resolve({ value: body, done: true });
                            }
                        };
                    }
                };
            } else {
                this.body = body;
            }
            this.status = opts.status;
            this.ok = this.status >= 200 && this.status < 300 ? true : false;
            this.headers = {
                keys: function () {
                    return [];
                },
                get: function () {
                    return '';
                }
            };
            this.arrayBuffer = function () {
                return Promise.resolve(this.body);
            };
        };

        global.Headers = function () { };
        global.fetch = function () { };
        sinon.stub(global, 'fetch');

        global.XMLHttpRequest = sinon.useFakeXMLHttpRequest();

        this.requests = [];
        global.XMLHttpRequest.onCreate = function (xhr) {
            this.requests.push(xhr);
        }.bind(this);
    });

    afterEach(function () {
        global.XMLHttpRequest.restore();
        delete global.window;
        delete global.Response;
        delete global.Headers;
        delete global.fetch;
    });

    afterEach(function () {
        mediaPlayerModelMock = null;
    });

    it('should throw an exception when attempting to call load and config parameter has not been set properly', () => {
        httpLoader = HTTPLoader(context).create({ mediaPlayerModel: mediaPlayerModelMock, errors: Errors });
        expect(httpLoader.load.bind(httpLoader, { request: {} })).to.throw('config object is not correct or missing');
    });

    it('should use XHRLoader if it is not an arraybuffer request even if useFetch is set to true', () => {
        let self = this.ctx;
        const callbackSucceeded = sinon.spy();
        const callbackCompleted = sinon.spy();
        const callbackError = sinon.spy();

        settings.update({
            streaming: {
                lowLatencyEnabled: true
            }
        })

        httpLoader = HTTPLoader(context).create({
            errHandler: errHandler,
            dashMetrics: dashMetrics,
            requestModifier: requestModifier,
            mediaPlayerModel: mediaPlayerModelMock,
            errors: Errors
        });
        global.fetch.returns(Promise.resolve(new global.Response('', { status: 200 })));

        httpLoader.load({ request: { checkExistenceOnly: true, responseType: 'json', type: HTTPRequest.MEDIA_SEGMENT_TYPE }, success: callbackSucceeded, complete: callbackCompleted, error: callbackError });
        expect(self.requests.length).to.equal(1);
        self.requests[0].respond(200);
        sinon.assert.notCalled(global.fetch);
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
        global.fetch.returns(Promise.resolve(new global.Response('', { status: 200 })));

        httpLoader.load({ request: { checkExistenceOnly: true }, success: callbackSucceeded, complete: callbackCompleted, error: callbackError });
        expect(self.requests.length).to.equal(1);
        self.requests[0].respond(200);
        sinon.assert.notCalled(global.fetch);
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
        global.fetch.returns(Promise.resolve(new global.Response('', { status: 200 })));

        httpLoader.load({ request: { checkExistenceOnly: true }, success: callbackSucceeded, complete: callbackCompleted, error: callbackError });
        expect(self.requests.length).to.equal(1);
        self.requests[0].respond(404);
        sinon.assert.calledOnce(callbackError);
        sinon.assert.calledOnce(callbackCompleted);
        sinon.assert.notCalled(callbackSucceeded);
        expect(callbackError.calledBefore(callbackCompleted)).to.be.true; // jshint ignore:line
    });

    it('should use XHRLoader if it is not a MEDIA_SEGMENT_TYPE request even if useFetch is set to true and it is an arraybuffer request', () => {
        let self = this.ctx;
        const callbackSucceeded = sinon.spy();
        const callbackCompleted = sinon.spy();
        const callbackError = sinon.spy();

        settings.update({
            streaming: {
                lowLatencyEnabled: true
            }
        })

        httpLoader = HTTPLoader(context).create({
            errHandler: errHandler,
            dashMetrics: dashMetrics,
            requestModifier: requestModifier,
            mediaPlayerModel: mediaPlayerModelMock,
            errors: Errors
        });
        global.fetch.returns(Promise.resolve(new global.Response('', { status: 200 })));

        httpLoader.load({ request: { checkExistenceOnly: true, responseType: 'arraybuffer', type: HTTPRequest.INIT_SEGMENT_TYPE}, success: callbackSucceeded, complete: callbackCompleted, error: callbackError });
        expect(self.requests.length).to.equal(1);
        self.requests[0].respond(200);
        sinon.assert.notCalled(global.fetch);
    });

    it('should use XHRLoader if it is an arraybuffer and  MEDIA_SEGMENT_TYPE request, useFetch is true and body is not an Stream. It should call success and complete callback when load is called successfully', (done) => {
        let self = this.ctx;
        const callbackSucceeded = sinon.spy();
        const callbackCompleted = sinon.spy();
        const callbackError = sinon.spy();

        settings.update({
            streaming: {
                lowLatencyEnabled: true
            }
        })

        httpLoader = HTTPLoader(context).create({
            errHandler: errHandler,
            dashMetrics: dashMetrics,
            requestModifier: requestModifier,
            mediaPlayerModel: mediaPlayerModelMock,
            errors: Errors
        });
        global.fetch.returns(Promise.resolve(new global.Response('', { status: 200 })));
        httpLoader.load({ request: { checkExistenceOnly: true, responseType: 'arraybuffer', type: HTTPRequest.MEDIA_SEGMENT_TYPE }, success: callbackSucceeded, complete: callbackCompleted, error: callbackError });

        // Added a setTimeout as fetch uses promises (finishing method load) and it doesn't call callbacks immediately
        setTimeout(function () {
            expect(self.requests.length).to.equal(0);
            sinon.assert.calledOnce(global.fetch);
            sinon.assert.notCalled(callbackError);
            sinon.assert.calledOnce(callbackSucceeded);
            sinon.assert.calledOnce(callbackCompleted);
            expect(callbackSucceeded.calledBefore(callbackCompleted)).to.be.true; // jshint ignore:line
            done();
        }, 10);
    });

    it('should use FetchLoader if it is an arraybuffer and MEDIA_SEGMENT_TYPE request, useFetch is true and body is an Stream. It should call success and complete callback when load is called successfully', (done) => {
        let self = this.ctx;
        const callbackSucceeded = sinon.spy();
        const callbackCompleted = sinon.spy();
        const callbackError = sinon.spy();

        settings.update({
            streaming: {
                lowLatencyEnabled: true
            }
        })

        httpLoader = HTTPLoader(context).create({
            errHandler: errHandler,
            dashMetrics: dashMetrics,
            requestModifier: requestModifier,
            mediaPlayerModel: mediaPlayerModelMock,
            errors: Errors
        });
        // Creating stream
        const stream = new Stream.Readable();
        stream.pipe(process.stdout);
        stream.push('test');
        stream.push(null);

        global.fetch.returns(Promise.resolve(new global.Response(stream, { status: 200 })));
        httpLoader.load({ request: { checkExistenceOnly: true, responseType: 'arraybuffer', type: HTTPRequest.MEDIA_SEGMENT_TYPE }, success: callbackSucceeded, complete: callbackCompleted, error: callbackError });

        setTimeout(function () {
            expect(self.requests.length).to.equal(0);
            sinon.assert.calledOnce(global.fetch);
            sinon.assert.notCalled(callbackError);
            sinon.assert.calledOnce(callbackSucceeded);
            sinon.assert.calledOnce(callbackCompleted);
            expect(callbackSucceeded.calledBefore(callbackCompleted)).to.be.true; // jshint ignore:line
            done();
        }, 10);
    });

    it('should use FetchLoader if it is an arraybuffer and MEDIA_SEGMENT_TYPE request and call error and complete callback when load is called with error', (done) => {
        let self = this.ctx;
        const callbackSucceeded = sinon.spy();
        const callbackCompleted = sinon.spy();
        const callbackError = sinon.spy();

        settings.update({
            streaming: {
                lowLatencyEnabled: true
            }
        })

        mediaPlayerModelMock.retryAttempts[HTTPRequest.MEDIA_SEGMENT_TYPE ] = 0;
        httpLoader = HTTPLoader(context).create({
            errHandler: errHandler,
            errors: Errors,
            dashMetrics: dashMetrics,
            requestModifier: requestModifier,
            mediaPlayerModel: mediaPlayerModelMock,
        });
        global.fetch.returns(Promise.resolve(new global.Response('', { status: 404 })));
        httpLoader.load({ request: { checkExistenceOnly: true, responseType: 'arraybuffer', type: HTTPRequest.MEDIA_SEGMENT_TYPE }, success: callbackSucceeded, complete: callbackCompleted, error: callbackError });
        setTimeout(function () {
            expect(self.requests.length).to.equal(0);
            sinon.assert.calledOnce(global.fetch);
            sinon.assert.calledOnce(callbackError);
            sinon.assert.notCalled(callbackSucceeded);
            sinon.assert.calledOnce(callbackCompleted);
            expect(callbackError.calledBefore(callbackCompleted)).to.be.true; // jshint ignore:line
            done();
        }, 10);
    });

});
