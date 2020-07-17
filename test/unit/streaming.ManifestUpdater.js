import ManifestUpdater from './../../src/streaming/ManifestUpdater';
import Events from '../../src/core/events/Events';
import EventBus from '../../src/core/EventBus';
import Errors from '../../src/core/errors/Errors';

import ManifestModelMock from './mocks/ManifestModelMock';
import ManifestLoaderMock from './mocks/ManifestLoaderMock';
import ErrorHandlerMock from './mocks/ErrorHandlerMock';

const chai = require('chai');
const expect = chai.expect;

describe('ManifestUpdater', function () {
    const context = {};
    const eventBus = EventBus(context).getInstance();
    let manifestUpdater = ManifestUpdater(context).create();

    // init mock
    const manifestModelMock = new ManifestModelMock();
    const manifestLoaderMock = new ManifestLoaderMock();
    const errHandlerMock = new ErrorHandlerMock();

    const manifestErrorMockText = `Mock Failed detecting manifest type or manifest type unsupported`;

    manifestUpdater.setConfig({
        manifestModel: manifestModelMock,
        manifestLoader: manifestLoaderMock,
        errHandler: errHandlerMock
    });

    manifestUpdater.initialize();

    it('should not call MANIFEST_UPDATED if a loading error occurs, no error should be sent', function () {
        const spy = chai.spy();
        eventBus.on(Events.MANIFEST_UPDATED, spy);

        eventBus.trigger(Events.INTERNAL_MANIFEST_LOADED, {
            error: {code: Errors.MANIFEST_LOADER_LOADING_FAILURE_ERROR_CODE, message: manifestErrorMockText}
        });

        expect(spy).to.have.not.been.called(); // jshint ignore:line

        eventBus.off(Events.MANIFEST_UPDATED, spy);

        expect(errHandlerMock.errorCode).to.equal(undefined); // jshint ignore:line
    });

    it('should not call MANIFEST_UPDATED if a parsing error occurs, errorHandler should send an error', function () {
        const spy = chai.spy();
        eventBus.on(Events.MANIFEST_UPDATED, spy);

        eventBus.trigger(Events.INTERNAL_MANIFEST_LOADED, {
            error: {code: Errors.MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE, message: manifestErrorMockText}
        });

        expect(spy).to.have.not.been.called(); // jshint ignore:line

        eventBus.off(Events.MANIFEST_UPDATED, spy);

        expect(errHandlerMock.errorCode).to.equal(Errors.MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE); // jshint ignore:line
    });
});