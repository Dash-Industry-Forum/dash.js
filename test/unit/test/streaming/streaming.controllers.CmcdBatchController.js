import CmcdBatchController from '../../../../src/streaming/controllers/CmcdBatchController.js';
import Constants from '../../../../src/streaming/constants/Constants.js';
import { HTTPRequest } from '../../../../src/streaming/vo/metrics/HTTPRequest.js';
import DashMetricsMock from '../../mocks/DashMetricsMock.js';
import MediaPlayerModelMock from '../../mocks/MediaPlayerModelMock.js';
import ErrorHandlerMock from '../../mocks/ErrorHandlerMock.js';

import { expect } from 'chai';
import sinon from 'sinon';

const context = {};

describe('CmcdBatchController', function () {
    let cmcdBatchController;
    let urlLoaderMock;
    let clock;

    let dashMetricsMock = new DashMetricsMock();
    let mediaPlayerModelMock = new MediaPlayerModelMock();
    let errorHandlerMock = new ErrorHandlerMock();

    beforeEach(function () {
        urlLoaderMock = {
            // Default mock for urlLoader.load. Returns a resolved promise to simulate a successful request.
            // This is necessary because the controller's async logic depends on the promise returned by load().
            // Individual tests can override this for specific scenarios (e.g., simulating a 429 error).
            load: sinon.stub().returns(Promise.resolve({}))
        };

        clock = sinon.useFakeTimers();

        cmcdBatchController = CmcdBatchController(context).getInstance();
        cmcdBatchController.setConfig({
            dashMetrics: dashMetricsMock,
            mediaPlayerModel: mediaPlayerModelMock,
            errHandler: errorHandlerMock,
            urlLoader: urlLoaderMock
        });
    });

    afterEach(function () {
        cmcdBatchController.reset();
        clock.restore();
    });

    describe('Batching by size', function () {
        it('should send a batch when batchSize is reached', function () {
            const target = {
                url: 'http://test.com/report',
                batchSize: 2,
                cmcdMode: Constants.CMCD_REPORTING_MODE.RESPONSE
            };
            const cmcdData1 = 'ot%3Dm%2Csid%3D%session1';
            const cmcdData2 = 'ot%3Da%2Csid%3D%session2';
            cmcdBatchController.addReport(target, cmcdData1);
            expect(urlLoaderMock.load.called).to.be.false;

            cmcdBatchController.addReport(target, cmcdData2);
            expect(urlLoaderMock.load.calledOnce).to.be.true;

            const request = urlLoaderMock.load.getCall(0).args[0].request;
            expect(request.url).to.equal(target.url);
            expect(request.method).to.equal(HTTPRequest.POST);
            expect(request.body).to.equal(cmcdData1 + '\n' + cmcdData2);
            expect(request.type).to.equal(HTTPRequest.CMCD_RESPONSE);
        });
    });

    describe('Batching by timer', function () {
        it('should send a batch when batchTimer expires', function () {
            const target = {
                url: 'http://test.com/report',
                batchTimer: 5,
                cmcdMode: Constants.CMCD_REPORTING_MODE.EVENT
            };
            const cmcdData = 'ot%3Dm%2Csid%3D%session1';

            cmcdBatchController.addReport(target, cmcdData);
            expect(urlLoaderMock.load.called).to.be.false;

            clock.tick(5000);

            expect(urlLoaderMock.load.calledOnce).to.be.true;
            const request = urlLoaderMock.load.getCall(0).args[0].request;
            expect(request.url).to.equal(target.url);
            expect(request.method).to.equal(HTTPRequest.POST);
            expect(request.body).to.equal(cmcdData);
            expect(request.type).to.equal(HTTPRequest.CMCD_EVENT);
        });

        it('should not set multiple timers for the same target', function () {
            const setTimeoutSpy = sinon.spy(window, 'setTimeout');
            const target = {
                url: 'http://test.com/report',
                batchTimer: 5
            };
            const cmcdData1 = 'ot%3Dm%2Csid%3D%session1';
            const cmcdData2 = 'ot%3Da%2Csid%3D%session2';

            cmcdBatchController.addReport(target, cmcdData1);
            expect(setTimeoutSpy.callCount).to.equal(1);

            cmcdBatchController.addReport(target, cmcdData2);
            expect(setTimeoutSpy.callCount).to.equal(1);

            setTimeoutSpy.restore();
        });
    });

    describe('Coexistence of batchSize and batchTimer', function () {
        it('should flush when batchSize is reached and clear the timer', function () {
            const clearTimeoutSpy = sinon.spy(window, 'clearTimeout');
            const target = {
                url: 'http://test.com/report',
                batchSize: 2,
                batchTimer: 10
            };
            const cmcdData1 = 'ot%3Dm';
            const cmcdData2 = 'ot%3Da';

            cmcdBatchController.addReport(target, cmcdData1);
            expect(urlLoaderMock.load.called).to.be.false;

            cmcdBatchController.addReport(target, cmcdData2);
            expect(urlLoaderMock.load.calledOnce).to.be.true;
            expect(clearTimeoutSpy.calledOnce).to.be.true;

            clock.tick(10000);
            expect(urlLoaderMock.load.calledOnce).to.be.true;

            clearTimeoutSpy.restore();
        });

        it('should flush when batchTimer expires and reset the batch', function () {
            const target = {
                url: 'http://test.com/report',
                batchSize: 3,
                batchTimer: 5
            };
            const cmcdData1 = 'ot%3Dv';
            const cmcdData2 = 'ot%3Da';

            cmcdBatchController.addReport(target, cmcdData1);
            cmcdBatchController.addReport(target, cmcdData2);
            expect(urlLoaderMock.load.called).to.be.false;

            clock.tick(5000);
            expect(urlLoaderMock.load.calledOnce).to.be.true;

            const request = urlLoaderMock.load.getCall(0).args[0].request;
            expect(request.body.split('\n').length).to.equal(2);

            cmcdBatchController.addReport(target, 'ot%3Dm');
            expect(urlLoaderMock.load.calledOnce).to.be.true;
        });
    });

    describe('reset', function () {
        it('should clear all pending batches and timers', function () {
            const clearTimeoutSpy = sinon.spy(window, 'clearTimeout');
            const target = { url: 'http://test.com/1', batchTimer: 5 };

            cmcdBatchController.addReport(target, [{ ot: 'v' }]);
            expect(clearTimeoutSpy.called).to.be.false;

            cmcdBatchController.reset();
            expect(clearTimeoutSpy.calledOnce).to.be.true;

            clock.tick(5000);
            expect(urlLoaderMock.load.called).to.be.false;

            clearTimeoutSpy.restore();
        });
    });

    describe('Targets with same URL but different configs', function () {
        it('should treat targets with the same URL as separate batches', function () {
            const target1 = {
                url: 'http://test.com/report',
                batchSize: 2,
                cmcdMode: Constants.CMCD_REPORTING_MODE.RESPONSE
            };

            const target2 = {
                url: 'http://test.com/report',
                batchSize: 1,
                cmcdMode: Constants.CMCD_REPORTING_MODE.EVENT
            };

            const cmcdData1 = 'ot%3Dm';
            const cmcdData2 = 'ot%3Da';

            cmcdBatchController.addReport(target1, cmcdData1);
            expect(urlLoaderMock.load.called).to.be.false;

            cmcdBatchController.addReport(target2, cmcdData2);
            expect(urlLoaderMock.load.calledOnce).to.be.true;

            const request = urlLoaderMock.load.getCall(0).args[0].request;
            expect(request.url).to.equal('http://test.com/report');
            expect(request.method).to.equal(HTTPRequest.POST);
            expect(request.type).to.equal(HTTPRequest.CMCD_EVENT);
            expect(request.body).to.equal(cmcdData2);

            const cmcdData3 = 'ot%3Dx';
            cmcdBatchController.addReport(target1, cmcdData3);
            expect(urlLoaderMock.load.calledTwice).to.be.true;

            const secondRequest = urlLoaderMock.load.getCall(1).args[0].request;
            expect(secondRequest.type).to.equal(HTTPRequest.CMCD_RESPONSE);
            expect(secondRequest.body).to.equal(cmcdData1 + '\n' + cmcdData3);
        });
    });

    describe('Retry logic', function () {
        it('should retry sending a batch after a 429 response', async function () {
            const target = {
                url: 'http://test.com/report',
                batchSize: 1
            };
            const cmcdData = 'ot%3Dm';

            urlLoaderMock.load.onCall(0).returns(Promise.resolve({ status: 429 }));
            urlLoaderMock.load.onCall(1).returns(Promise.resolve({ status: 200 }));

            cmcdBatchController.addReport(target, cmcdData);

            expect(urlLoaderMock.load.calledOnce).to.be.true;

            await clock.tickAsync(100);

            expect(urlLoaderMock.load.calledTwice).to.be.true;
        });

        it('should not send any more reports to a target that returned a 410 response', async function () {
            const target = {
                url: 'http://test.com/report',
                batchSize: 1
            };
            const cmcdData = 'ot%3Dm';

            urlLoaderMock.load.returns(Promise.resolve({ status: 410 }));

            cmcdBatchController.addReport(target, cmcdData);

            expect(urlLoaderMock.load.calledOnce).to.be.true;

            await clock.tickAsync(0);

            cmcdBatchController.addReport(target, cmcdData);

            expect(urlLoaderMock.load.calledOnce).to.be.true;
        });
    });
});
