import XHRLoader from '../../src/streaming/XHRLoader';
import RequestModifier from '../../src/streaming/utils/RequestModifier';
import ErrorHandler from '../../src/streaming/utils/ErrorHandler';
import MetricsModel from '../../src/streaming/models/MetricsModel';

const expect = require('chai').expect;
const sinon = require('sinon');

const context = {};
let xhrLoader = XHRLoader(context).create({});

describe('XHRLoader', function () {
    beforeEach(function() {

        global.XMLHttpRequest = sinon.useFakeXMLHttpRequest();

        this.requests = [];
        global.XMLHttpRequest.onCreate = function(xhr) {
            this.requests.push(xhr);
        }.bind(this);
    });

    afterEach(function() {
        global.XMLHttpRequest.restore();
    });
    
    it('should throw an exception when attempting to call load and config parameter has not been set properly', () => {   
        expect(xhrLoader.load.bind(xhrLoader, {request : {}})).to.throw('config object is not correct or missing');
    });

    it('should call success and complete callback when load is called successfully', () => {
        let self = this.ctx;
        const errHandler = ErrorHandler(context).getInstance();
        const metricsModel = MetricsModel(context).getInstance();
        const requestModifier = RequestModifier(context).getInstance();
        const callbackSucceeded = sinon.spy();
        const callbackCompleted = sinon.spy();
        xhrLoader = XHRLoader(context).create({errHandler : errHandler, metricsModel : metricsModel, requestModifier : requestModifier});
        xhrLoader.load({request : {checkExistenceOnly : true}, success : callbackSucceeded, complete : callbackCompleted});
        expect(self.requests.length).to.equal(1);
        self.requests[0].respond(200);
        sinon.assert.calledOnce(callbackSucceeded);
        sinon.assert.calledOnce(callbackCompleted);
        expect(callbackSucceeded.calledBefore(callbackCompleted)).to.be.true;
    });

    it('should call error and complete callback when load is called with error', () => {
        let self = this.ctx;
        const callbackSucceeded = sinon.spy();
        const callbackCompleted = sinon.spy();
        const callbackError = sinon.spy();
        xhrLoader.load({request : {checkExistenceOnly : true}, success : callbackSucceeded, complete : callbackCompleted, error : callbackError});
        expect(self.requests.length).to.equal(1);
        self.requests[0].respond(404);
        sinon.assert.calledOnce(callbackError);
        sinon.assert.calledOnce(callbackCompleted);
        sinon.assert.notCalled(callbackSucceeded);
        expect(callbackError.calledBefore(callbackCompleted)).to.be.true;
    });  
});