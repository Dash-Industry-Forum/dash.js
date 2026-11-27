import HTTPLoader from '../../../../src/streaming/net/HTTPLoader.js';
import Errors from '../../../../src/core/errors/Errors.js';
import ErrorHandler from '../../../../src/streaming/utils/ErrorHandler.js';
import CustomParametersModel from '../../../../src/streaming/models/CustomParametersModel.js';
import DashMetrics from '../../../../src/dash/DashMetrics.js';
import MediaPlayerModelMock from '../../mocks/MediaPlayerModelMock.js';
import ServiceDescriptionControllerMock from '../../mocks/ServiceDescriptionControllerMock.js';
import {HTTPRequest} from '../../../../src/streaming/vo/metrics/HTTPRequest.js';
import Settings from '../../../../src/core/Settings.js';
import CmcdController from '../../../../src/streaming/controllers/CmcdController.js';
import ClientDataReportingController from '../../../../src/streaming/controllers/ClientDataReportingController.js';

import {expect} from 'chai';
import {fakeXhr} from 'nise';
import sinon from 'sinon';

const context = {};

let errHandler;
let dashMetrics;
let mediaPlayerModelMock;
let httpLoader;
let settings = Settings(context).getInstance();

describe('HTTPLoader', function () {
    let serviceDescriptionControllerMock = new ServiceDescriptionControllerMock();
    let clientDataReportingController,
        cmcdController,
        requests;

    function _createHttpLoader(boxParser) {
        return HTTPLoader(context).create({
            errHandler: errHandler,
            dashMetrics: dashMetrics,
            mediaPlayerModel: mediaPlayerModelMock,
            boxParser: boxParser,
            errors: Errors
        });
    }

    function _createCallbacks(overrides = {}) {
        return {
            success: overrides.success || sinon.spy(),
            complete: overrides.complete || sinon.spy(),
            error: overrides.error || sinon.spy()
        };
    }

    beforeEach(function () {
        settings.reset();
        mediaPlayerModelMock = new MediaPlayerModelMock();
        errHandler = ErrorHandler(context).getInstance();
        dashMetrics = DashMetrics(context).getInstance();
        clientDataReportingController = ClientDataReportingController(context).getInstance();
        cmcdController = CmcdController(context).getInstance();

        clientDataReportingController.setConfig({
            serviceDescriptionController: serviceDescriptionControllerMock,
        });

        cmcdController.setConfig({
            serviceDescriptionController: serviceDescriptionControllerMock,
        });

        window.XMLHttpRequest = fakeXhr.useFakeXMLHttpRequest();

        requests = [];
        window.XMLHttpRequest.onCreate = function (xhr) {
            requests.push(xhr);
        };
    });

    afterEach(function () {
        serviceDescriptionControllerMock.reset();
        window.XMLHttpRequest.restore();
        mediaPlayerModelMock = null;
        httpLoader = null;
        requests = null;
    });

    it('should throw an exception when attempting to call load and config parameter has not been set properly', () => {
        httpLoader = HTTPLoader(context).create({mediaPlayerModel: mediaPlayerModelMock, errors: Errors});
        expect(httpLoader.load.bind(httpLoader, {request: {}})).to.throw('config object is not correct or missing');
    });

    it('should use XHRLoader if it is not an arraybuffer request even if availabilityTimeComplete is set to false', async () => {
        const callbacks = _createCallbacks();

        httpLoader = _createHttpLoader();

        await httpLoader.load({
            request: {
                responseType: 'json',
                type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                availabilityTimeComplete: false
            },
            success: callbacks.success,
            complete: callbacks.complete,
            error: callbacks.error
        });

        expect(requests.length).to.equal(1);
        requests[0].respond(200);
    });

    it('should use XHRLoader and call success and complete callback when load is called successfully', async () => {
        let resolveOnComplete;
        const completePromise = new Promise((resolve) => {
            resolveOnComplete = resolve;
        });
        const callbacks = _createCallbacks();
        callbacks.complete = sinon.spy(() => resolveOnComplete());

        httpLoader = _createHttpLoader();

        await httpLoader.load({
            request: {},
            success: callbacks.success,
            complete: callbacks.complete,
            error: callbacks.error
        });

        expect(requests.length).to.equal(1);
        requests[0].respond(200, {}, 'ok');
        await completePromise;

        sinon.assert.calledOnce(callbacks.success);
        sinon.assert.calledOnce(callbacks.complete);
        expect(callbacks.success.calledBefore(callbacks.complete)).to.be.true; // jshint ignore:line
    });

    it('should call success and not retry when a POST returns 200 with an empty body', async () => {
        let resolveOnComplete;
        const completePromise = new Promise((resolve) => {
            resolveOnComplete = resolve;
        });
        const callbacks = _createCallbacks();
        callbacks.complete = sinon.spy(() => resolveOnComplete());

        httpLoader = _createHttpLoader();

        await httpLoader.load({
            request: { method: HTTPRequest.POST },
            success: callbacks.success,
            complete: callbacks.complete,
            error: callbacks.error
        });

        expect(requests.length).to.equal(1);
        requests[0].respond(200, {}, '');
        await completePromise;

        // Only one request fired (no retry), success was called.
        expect(requests.length).to.equal(1);
        sinon.assert.calledOnce(callbacks.success);
        sinon.assert.calledOnce(callbacks.complete);
        sinon.assert.notCalled(callbacks.error);
    });

    it('should set resourceTiming.responseStart on the performance.now() clock, not epoch time', async () => {
        const customParametersModel = CustomParametersModel(context).getInstance();
        let capturedRequest;
        let capturedResponse;
        let resolveOnComplete;
        const completePromise = new Promise((resolve) => {
            resolveOnComplete = resolve;
        });
        const callbacks = _createCallbacks({ complete: sinon.spy(() => resolveOnComplete()) });

        const requestInterceptor = (request) => {
            capturedRequest = request;
            return Promise.resolve(request);
        };
        const responseInterceptor = (response) => {
            capturedResponse = response;
            return Promise.resolve(response);
        };
        customParametersModel.addRequestInterceptor(requestInterceptor);
        customParametersModel.addResponseInterceptor(responseInterceptor);

        try {
            httpLoader = _createHttpLoader();

            await httpLoader.load({
                request: {},
                success: callbacks.success,
                complete: callbacks.complete,
                error: callbacks.error
            });

            // Simulate the first progress event with partial data, i.e. the first byte arriving
            capturedRequest.customData.onprogress({ lengthComputable: true, loaded: 5, total: 100 });

            requests[0].respond(200, {}, 'ok');
            await completePromise;

            const resourceTiming = capturedResponse.resourceTiming;
            // startTime and responseEnd use performance.now(); responseStart must be on the same
            // clock, otherwise derived durations (e.g. CMCD ttfb) become epoch-sized timestamps
            expect(resourceTiming.responseStart).to.be.at.least(resourceTiming.startTime);
            expect(resourceTiming.responseStart).to.be.at.most(performance.now());
        } finally {
            customParametersModel.removeRequestInterceptor(requestInterceptor);
            customParametersModel.removeResponseInterceptor(responseInterceptor);
        }
    });

    it('should abort and retry the intercepted replacement request on progress timeout', async () => {
        const customParametersModel = CustomParametersModel(context).getInstance();
        let originalRequest;
        let replacementRequest;
        let resolveRetry;
        const retryPromise = new Promise((resolve) => {
            resolveRetry = resolve;
        });

        const requestInterceptor = sinon.spy((request) => {
            if (!originalRequest) {
                originalRequest = request;
                replacementRequest = Object.assign({}, request, { customData: Object.assign({}, request.customData) });
                return Promise.resolve(replacementRequest);
            }
            resolveRetry();
            return Promise.resolve(request);
        });
        customParametersModel.addRequestInterceptor(requestInterceptor);
        settings.update({ streaming: { fragmentRequestProgressTimeout: 10 } });
        mediaPlayerModelMock.setRetryAttemptsForType(HTTPRequest.MEDIA_SEGMENT_TYPE, 1);
        mediaPlayerModelMock.setRetryIntervalForType(HTTPRequest.MEDIA_SEGMENT_TYPE, 0);

        try {
            httpLoader = _createHttpLoader();
            const callbacks = _createCallbacks();
            const abortCallback = sinon.spy();

            await httpLoader.load({
                request: { type: HTTPRequest.MEDIA_SEGMENT_TYPE },
                success: callbacks.success,
                complete: callbacks.complete,
                error: callbacks.error,
                abort: abortCallback
            });

            expect(originalRequest.customData.abort).to.be.undefined;
            expect(replacementRequest.customData.abort).to.be.a('function');
            const abortSpy = sinon.spy(replacementRequest.customData, 'abort');

            replacementRequest.customData.onprogress({ lengthComputable: true, loaded: 5, total: 100 });
            await retryPromise;

            sinon.assert.calledOnce(abortSpy);
            sinon.assert.notCalled(abortCallback);
            sinon.assert.calledTwice(requestInterceptor);
            expect(replacementRequest.customData.onabort).to.be.null;
            expect(replacementRequest.customData.xhr.onabort).to.be.null;
        } finally {
            customParametersModel.removeRequestInterceptor(requestInterceptor);
        }
    });

    [
        {
            title: 'AbortController',
            disableAbortController: false
        },
        {
            title: 'reader cancellation without AbortController',
            disableAbortController: true
        }
    ].forEach(({title, disableAbortController}) => {
        it(`should abort and retry an intercepted Fetch request on progress timeout using ${title}`, async () => {
            const customParametersModel = CustomParametersModel(context).getInstance();
            const sandbox = sinon.createSandbox();
            let originalRequest;
            let replacementRequest;
            let resolveRetry;
            let resolveRetryFetch;
            let resolveFirstProgress;
            let resolveComplete;
            const retryPromise = new Promise((resolve) => {
                resolveRetry = resolve;
            });
            const retryFetchPromise = new Promise((resolve) => {
                resolveRetryFetch = resolve;
            });
            const firstProgressPromise = new Promise((resolve) => {
                resolveFirstProgress = resolve;
            });
            const completePromise = new Promise((resolve) => {
                resolveComplete = resolve;
            });
            const callbacks = _createCallbacks({
                complete: sinon.spy(() => resolveComplete())
            });
            const abortCallback = sinon.spy();

            const requestInterceptor = sinon.spy((request) => {
                if (!originalRequest) {
                    originalRequest = request;
                    replacementRequest = Object.assign({}, request, { 
                        customData: Object.assign({}, request.customData) 
                    });
                    return Promise.resolve(replacementRequest);
                }
                resolveRetry();
                return Promise.resolve(request);
            });
            customParametersModel.addRequestInterceptor(requestInterceptor);

            if (disableAbortController) {
                sandbox.stub(window, 'AbortController').value(undefined);
            }

            const pendingResponse = new ReadableStream({
                start(controller) {
                    controller.enqueue(new Uint8Array([1, 2, 3]));
                }
            });
            const completedResponse = new ReadableStream({
                start(controller) {
                    controller.close();
                }
            });
            const fetchStub = sandbox.stub(window, 'fetch');
            fetchStub.onFirstCall().resolves(new Response(pendingResponse));
            fetchStub.onSecondCall().callsFake(() => {
                resolveRetryFetch();
                return Promise.resolve(new Response(completedResponse));
            });

            settings.update({ streaming: { fragmentRequestProgressTimeout: 25 } });
            mediaPlayerModelMock.setRetryAttemptsForType(HTTPRequest.MEDIA_SEGMENT_TYPE, 1);
            mediaPlayerModelMock.setRetryIntervalForType(HTTPRequest.MEDIA_SEGMENT_TYPE, 0);

            try {
                httpLoader = _createHttpLoader({
                    findLastTopIsoBoxCompleted: sinon.stub().returns({
                        found: false,
                        startOffsetOfLastCompletedBox: 0,
                        sizeOfLastCompletedBox: 0
                    })
                });

                await httpLoader.load({
                    request: {
                        url: 'https://example.com/segment.m4s',
                        method: 'GET',
                        responseType: 'arraybuffer',
                        type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                        availabilityTimeComplete: false
                    },
                    success: callbacks.success,
                    complete: callbacks.complete,
                    error: callbacks.error,
                    abort: abortCallback,
                    progress: resolveFirstProgress
                });

                await firstProgressPromise;

                expect(originalRequest.customData.abort).to.be.undefined;
                expect(replacementRequest.customData.abort).to.be.a('function');

                const abortSpy = sinon.spy(replacementRequest.customData, 'abort');
                let cancellationSpy;
                if (disableAbortController) {
                    cancellationSpy = sinon.spy(replacementRequest.customData.reader, 'cancel');
                } else {
                    cancellationSpy = sinon.spy(replacementRequest.customData.abortController, 'abort');
                }

                await retryPromise;
                await retryFetchPromise;
                await completePromise;

                sinon.assert.calledOnce(abortSpy);
                sinon.assert.calledOnce(cancellationSpy);
                expect(replacementRequest.customData.cancelled).to.equal(true);
                sinon.assert.notCalled(abortCallback);
                sinon.assert.calledTwice(requestInterceptor);
                sinon.assert.calledTwice(fetchStub);
            } finally {
                customParametersModel.removeRequestInterceptor(requestInterceptor);
                sandbox.restore();
            }
        });
    });

    it('should abort the intercepted replacement request when abort() is called', async () => {
        const customParametersModel = CustomParametersModel(context).getInstance();
        let originalRequest;
        let replacementRequest;

        const requestInterceptor = (request) => {
            originalRequest = request;
            replacementRequest = Object.assign({}, request, { customData: Object.assign({}, request.customData) });
            return Promise.resolve(replacementRequest);
        };
        customParametersModel.addRequestInterceptor(requestInterceptor);

        try {
            httpLoader = _createHttpLoader();
            const callbacks = _createCallbacks();

            await httpLoader.load({
                request: { type: HTTPRequest.MEDIA_SEGMENT_TYPE },
                success: callbacks.success,
                complete: callbacks.complete,
                error: callbacks.error
            });

            expect(originalRequest.customData.abort).to.be.undefined;
            const abortSpy = sinon.spy(replacementRequest.customData, 'abort');

            httpLoader.abort();

            sinon.assert.calledOnce(abortSpy);
            expect(requests[0].aborted).to.be.true;
        } finally {
            customParametersModel.removeRequestInterceptor(requestInterceptor);
        }
    });

    it('should use XHRLoader and call error and complete callback when load is called with error', async () => {
        let resolveOnError;
        const errorPromise = new Promise((resolve) => {
            resolveOnError = resolve;
        });
        const callbacks = _createCallbacks({
            error: sinon.spy(() => resolveOnError())
        });

        httpLoader = _createHttpLoader();

        await httpLoader.load({
            request: {},
            success: callbacks.success,
            complete: callbacks.complete,
            error: callbacks.error
        });

        expect(requests.length).to.equal(1);
        requests[0].respond(404);
        await errorPromise;

        sinon.assert.calledOnce(callbacks.error);
        sinon.assert.calledOnce(callbacks.complete);
        sinon.assert.notCalled(callbacks.success);
        expect(callbacks.error.calledBefore(callbacks.complete)).to.be.true; // jshint ignore:line
    });

    it('should use XHRLoader if it is not a MEDIA_SEGMENT_TYPE request even if availabilityTimeComplete is set to false and it is an arraybuffer request', async () => {
        const callbacks = _createCallbacks();

        httpLoader = _createHttpLoader();

        await httpLoader.load({
            request: {
                responseType: 'arraybuffer',
                type: HTTPRequest.INIT_SEGMENT_TYPE,
                availabilityTimeComplete: false
            },
            success: callbacks.success,
            complete: callbacks.complete,
            error: callbacks.error
        });

        expect(requests.length).to.equal(1);
        requests[0].respond(200);
    });

    describe('request timeout selection', function () {
        [
            {
                title: 'should use manifest timeout for MPD requests',
                type: HTTPRequest.MPD_TYPE,
                responseType: '',
                expectedTimeout: 4321
            },
            {
                title: 'should use fragment timeout for media requests',
                type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                responseType: 'arraybuffer',
                expectedTimeout: 9876
            },
            {
                title: 'should preserve no timeout for XLink requests',
                type: HTTPRequest.XLINK_EXPANSION_TYPE,
                responseType: '',
                expectedTimeout: 0
            },
            {
                title: 'should preserve no timeout for content steering requests',
                type: HTTPRequest.CONTENT_STEERING_TYPE,
                responseType: 'json',
                expectedTimeout: 0
            }
        ].forEach(({title, type, responseType, expectedTimeout}) => {
            it(title, async () => {
                settings.update({
                    streaming: {
                        manifestRequestTimeout: 4321,
                        fragmentRequestTimeout: 9876
                    }
                });

                httpLoader = _createHttpLoader();

                await httpLoader.load({
                    request: {
                        type,
                        responseType
                    }
                });

                expect(requests.length).to.equal(1);
                expect(requests[0].timeout).to.equal(expectedTimeout);
            });
        });

        it('should pick up timeout changes made via settings.update() after loader creation', async () => {
            settings.update({
                streaming: {
                    manifestRequestTimeout: 1000,
                    fragmentRequestTimeout: 2000
                }
            });

            httpLoader = _createHttpLoader();

            await httpLoader.load({
                request: {
                    type: HTTPRequest.MPD_TYPE,
                    responseType: ''
                }
            });

            expect(requests.length).to.equal(1);
            expect(requests[0].timeout).to.equal(1000);

            settings.update({
                streaming: {
                    manifestRequestTimeout: 5555
                }
            });

            await httpLoader.load({
                request: {
                    type: HTTPRequest.MPD_TYPE,
                    responseType: ''
                }
            });

            expect(requests.length).to.equal(2);
            expect(requests[1].timeout).to.equal(5555);
        });
    });
});
