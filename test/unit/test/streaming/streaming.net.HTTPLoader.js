import HTTPLoader from '../../../../src/streaming/net/HTTPLoader.js';
import Errors from '../../../../src/core/errors/Errors.js';
import ErrorHandler from '../../../../src/streaming/utils/ErrorHandler.js';
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

    function _createHttpLoader() {
        return HTTPLoader(context).create({
            errHandler: errHandler,
            dashMetrics: dashMetrics,
            mediaPlayerModel: mediaPlayerModelMock,
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
