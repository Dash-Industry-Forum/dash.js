import XHRLoader from '../../../../src/streaming/net/XHRLoader.js';

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

    it('should call onloadend callback when load is called successfully', () => {
        const self = this.ctx;
        const callbackLoadend = sinon.spy();
        const callbackAbort = sinon.spy();

        xhrLoader = XHRLoader(context).create({});
        const request = {
            request: {},
            customData: {
                onloadend: callbackLoadend,
                onabort: callbackAbort    
            }
        };
        xhrLoader.load(request, {});
        expect(self.requests.length).to.equal(1);
        self.requests[0].respond(200);
        sinon.assert.calledOnce(callbackLoadend);
        sinon.assert.notCalled(callbackAbort);
    });

    it('should call onloadend callback when load is called and there is an error response', () => {
        const self = this.ctx;
        const callbackLoadend = sinon.spy();
        const callbackAbort = sinon.spy();
        xhrLoader = XHRLoader(context).create({});
        const request = {
            customData: {
                onloadend: callbackLoadend,
                onabort: callbackAbort    
            }
        };
        xhrLoader.load(request, {});
        expect(self.requests.length).to.equal(1);
        self.requests[0].respond(404);
        sinon.assert.calledOnce(callbackLoadend);
        sinon.assert.notCalled(callbackAbort);
    });

    it('should call onabort callback when abort is called', () => {
        const callbackLoadend = sinon.spy();
        const callbackAbort = sinon.spy();

        xhrLoader = XHRLoader(context).create({});

        const request = {
            customData: {
                onloadend: callbackLoadend,
                onabort: callbackAbort    
            }
        };
        xhrLoader.load(request, {});
        xhrLoader.abort();

        // abort triggers both onloadend and onabort
        sinon.assert.notCalled(callbackLoadend);
        sinon.assert.calledOnce(callbackAbort);
    });

    it('should call onloadend when load is called and there is a network error', () => {
        const self = this.ctx;
        const callbackLoadend = sinon.spy();
        const callbackAbort = sinon.spy();
        xhrLoader = XHRLoader(context).create({});
        const request = {
            customData: {
                onloadend: callbackLoadend,
                onabort: callbackAbort    
            }
        };
        xhrLoader.load(request, {});
        expect(self.requests.length).to.equal(1);
        self.requests[0].error();
        sinon.assert.calledOnce(callbackLoadend);
        sinon.assert.notCalled(callbackAbort);
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
