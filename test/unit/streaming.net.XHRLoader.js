import XHRLoader from '../../src/streaming/net/XHRLoader.js';

import {expect} from 'chai';
import sinon from 'sinon';

const context = {};

let xhrLoader;

describe('XHRLoader', function () {

    beforeEach(function () {
        window.XMLHttpRequest = sinon.useFakeXMLHttpRequest();

        this.requests = [];
        window.XMLHttpRequest.onCreate = function (xhr) {
            this.requests.push(xhr);
        }.bind(this);
    });

    afterEach(function () {
        window.XMLHttpRequest.restore();
    });

    afterEach(function () {
    });

    it('should call success and complete callback when load is called successfully', () => {
        const self = this.ctx;
        const callbackSucceeded = sinon.spy();
        const callbackCompleted = sinon.spy();
        const callbackError = sinon.spy();
        const callbackAbort = sinon.spy();

        xhrLoader = XHRLoader(context).create({});
        const request = {
            request: {},
            customData: {
                onload: callbackSucceeded,
                onloadend: callbackCompleted,
                onerror: callbackError,
                onabort: callbackAbort    
            }
        };
        xhrLoader.load(request, {});
        expect(self.requests.length).to.equal(1);
        self.requests[0].respond(200);
        sinon.assert.notCalled(callbackError);
        sinon.assert.calledOnce(callbackSucceeded);
        sinon.assert.calledOnce(callbackCompleted);
        sinon.assert.notCalled(callbackAbort);
        expect(callbackSucceeded.calledBefore(callbackCompleted)).to.be.true; // jshint ignore:line
    });

    it('should call onload and complete callback when load is called and there is an error response', () => {
        const self = this.ctx;
        const callbackSucceeded = sinon.spy();
        const callbackCompleted = sinon.spy();
        const callbackError = sinon.spy();
        const callbackAbort = sinon.spy();
        xhrLoader = XHRLoader(context).create({});
        const request = {
            customData: {
                onload: callbackSucceeded,
                onloadend: callbackCompleted,
                onerror: callbackError,
                onabort: callbackAbort    
            }
        };
        xhrLoader.load(request, {});
        expect(self.requests.length).to.equal(1);
        self.requests[0].respond(404);
        sinon.assert.notCalled(callbackError);
        sinon.assert.calledOnce(callbackCompleted);
        sinon.assert.calledOnce(callbackSucceeded);
        sinon.assert.notCalled(callbackAbort);
        expect(callbackSucceeded.calledBefore(callbackCompleted)).to.be.true; // jshint ignore:line
    });

    it('should call onabort callback when abort is called', () => {
        const callbackSucceeded = sinon.spy();
        const callbackCompleted = sinon.spy();
        const callbackError = sinon.spy();
        const callbackAbort = sinon.spy();

        xhrLoader = XHRLoader(context).create({});

        const request = {
            customData: {
                onload: callbackSucceeded,
                onloadend: callbackCompleted,
                onerror: callbackError,
                onabort: callbackAbort    
            }
        };
        xhrLoader.load(request, {});
        xhrLoader.abort();

        sinon.assert.notCalled(callbackError);
        sinon.assert.notCalled(callbackSucceeded);
        // abort triggers both onloadend and onabort
        sinon.assert.notCalled(callbackCompleted);
        sinon.assert.calledOnce(callbackAbort);
    });

    it('should call onerror and onloadend when load is called and there is a network error', () => {
        const self = this.ctx;
        const callbackSucceeded = sinon.spy();
        const callbackCompleted = sinon.spy();
        const callbackError = sinon.spy();
        const callbackAbort = sinon.spy();
        xhrLoader = XHRLoader(context).create({});
        const request = {
            customData: {
                onload: callbackSucceeded,
                onloadend: callbackCompleted,
                onerror: callbackError,
                onabort: callbackAbort    
            }
        };
        xhrLoader.load(request, {});
        expect(self.requests.length).to.equal(1);
        self.requests[0].error();
        sinon.assert.calledOnce(callbackError);
        sinon.assert.calledOnce(callbackCompleted);
        sinon.assert.notCalled(callbackSucceeded);
        sinon.assert.notCalled(callbackAbort);
        expect(callbackError.calledBefore(callbackCompleted)).to.be.true; // jshint ignore:line
    });

    it('should set timeout on the sending XHR request', () => {
        xhrLoader = XHRLoader(context).create({});
        const request = {
            timeout: 100,
            customData: {
            }
        };
        xhrLoader.load(request, {});
        expect(xhrLoader.getXhr().timeout).to.be.equal(100);
    });
});
