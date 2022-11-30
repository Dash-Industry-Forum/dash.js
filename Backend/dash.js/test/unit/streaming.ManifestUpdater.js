import ManifestUpdater from './../../src/streaming/ManifestUpdater';
import Events from '../../src/core/events/Events';
import EventBus from '../../src/core/EventBus';
import Errors from '../../src/core/errors/Errors';

import AdapterMock from './mocks/AdapterMock';
import ManifestModelMock from './mocks/ManifestModelMock';
import ManifestLoaderMock from './mocks/ManifestLoaderMock';
import ErrorHandlerMock from './mocks/ErrorHandlerMock';

const chai = require('chai');
const sinon = require('sinon');
const expect = chai.expect;

describe('ManifestUpdater', function () {
    const context = {};
    const eventBus = EventBus(context).getInstance();
    let manifestUpdater = ManifestUpdater(context).create();

    // init mock
    const adapterMock = new AdapterMock();
    const manifestModelMock = new ManifestModelMock();
    const manifestLoaderMock = new ManifestLoaderMock();
    const errHandlerMock = new ErrorHandlerMock();

    const manifestErrorMockText = `Mock Failed detecting manifest type or manifest type unsupported`;

    manifestUpdater.setConfig({
        adapter: adapterMock,
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

    it('should call MANIFEST_UPDATED with existing manifest if update provided 204', function () {
        let originalTime = new Date(Date.now() - 1000 * 60 * 10); // originally 10 minutes ago
        let inMemoryManifest = {
            loadedTime: originalTime
        };
        manifestModelMock.setValue(inMemoryManifest);

        const spy = sinon.spy(); // using sinon to access call params later
        eventBus.on(Events.MANIFEST_UPDATED, spy);

        // call empty for 204 simulation
        eventBus.trigger(Events.INTERNAL_MANIFEST_LOADED, {});

        expect(manifestModelMock.getValue()).to.equal(inMemoryManifest);
        expect(inMemoryManifest.loadedTime).to.not.equal(originalTime);
        expect(spy.calledOnce).to.be.true; // jshint ignore:line
        expect(spy.firstCall.args[0].manifest).to.equal(inMemoryManifest);

        manifestModelMock.setValue(null);
        eventBus.off(Events.MANIFEST_UPDATED, spy);
    });

    it('should call MANIFEST_UPDATED with patched manifest if valid patch update provided', function () {
        let originalTime = new Date(Date.now() - 1000 * 60 * 10);
        let inMemoryManifest = {
            loadedTime: originalTime
        };
        manifestModelMock.setValue(inMemoryManifest);

        const patchCheckStub = sinon.stub(adapterMock, 'getIsPatch').returns(true);
        const isPatchValidStub = sinon.stub(adapterMock, 'isPatchValid').returns(true);
        const applyPatchStub = sinon.stub(adapterMock, 'applyPatchToManifest');
        const publishTimeStub = sinon.stub(adapterMock, 'getPublishTime');
        publishTimeStub.onCall(0).returns(originalTime);
        publishTimeStub.onCall(1).returns(new Date());

        const spy = sinon.spy();
        eventBus.on(Events.MANIFEST_UPDATED, spy);

        const patch = {};
        eventBus.trigger(Events.INTERNAL_MANIFEST_LOADED, {manifest: patch});

        expect(manifestModelMock.getValue()).to.equal(inMemoryManifest);
        expect(inMemoryManifest.loadedTime).to.not.equal(originalTime);
        expect(patchCheckStub.called).to.be.true; // jshint ignore:line
        expect(isPatchValidStub.called).to.be.true; // jshint ignore:line
        expect(applyPatchStub.calledWith(inMemoryManifest, patch)).to.be.true; // jshint ignore:line
        expect(spy.calledOnce).to.be.true; // jshint ignore:line
        expect(spy.firstCall.args[0].manifest).to.equal(inMemoryManifest);

        manifestModelMock.setValue(null);
        patchCheckStub.restore();
        isPatchValidStub.restore();
        applyPatchStub.restore();
        publishTimeStub.restore();
        eventBus.off(Events.MANIFEST_UPDATED, spy);
    });

    it('should force full manifest refresh if invalid patch update provided', function () {
        let originalTime = new Date(Date.now() - 1000 * 60 * 10);
        let inMemoryManifest = {
            loadedTime: originalTime
        };
        manifestModelMock.setValue(inMemoryManifest);

        const patchCheckStub = sinon.stub(adapterMock, 'getIsPatch').returns(true);
        const isPatchValidStub = sinon.stub(adapterMock, 'isPatchValid').returns(false);
        const applyPatchStub = sinon.stub(adapterMock, 'applyPatchToManifest');
        const loaderStub = sinon.stub(manifestLoaderMock, 'load');
        const publishTimeStub = sinon.stub(adapterMock, 'getPublishTime');
        publishTimeStub.onCall(0).returns(originalTime);
        publishTimeStub.onCall(1).returns(new Date());

        const patch = {};
        eventBus.trigger(Events.INTERNAL_MANIFEST_LOADED, {manifest: patch});

        expect(manifestModelMock.getValue()).to.equal(inMemoryManifest);
        expect(patchCheckStub.called).to.be.true; // jshint ignore:line
        expect(isPatchValidStub.called).to.be.true; // jshint ignore:line
        expect(applyPatchStub.called).to.be.false; // jshint ignore:line
        expect(loaderStub.called).to.be.true; // jshint ignore:line

        manifestModelMock.setValue(null);
        patchCheckStub.restore();
        isPatchValidStub.restore();
        applyPatchStub.restore();
        publishTimeStub.restore();
        loaderStub.restore();
    });

    it('should force full manifest refresh if patch update does not update publish time', function () {
        let originalTime = new Date(Date.now() - 1000 * 60 * 10);
        let inMemoryManifest = {
            loadedTime: originalTime
        };
        manifestModelMock.setValue(inMemoryManifest);

        const patchCheckStub = sinon.stub(adapterMock, 'getIsPatch').returns(true);
        const isPatchValidStub = sinon.stub(adapterMock, 'isPatchValid').returns(true);
        const applyPatchStub = sinon.stub(adapterMock, 'applyPatchToManifest');
        const loaderStub = sinon.stub(manifestLoaderMock, 'load');
        const publishTimeStub = sinon.stub(adapterMock, 'getPublishTime').returns(originalTime);

        const patch = {};
        eventBus.trigger(Events.INTERNAL_MANIFEST_LOADED, {manifest: patch});

        expect(manifestModelMock.getValue()).to.equal(inMemoryManifest);
        expect(patchCheckStub.called).to.be.true; // jshint ignore:line
        expect(isPatchValidStub.called).to.be.true; // jshint ignore:line
        expect(applyPatchStub.called).to.be.true; // jshint ignore:line
        expect(loaderStub.called).to.be.true; // jshint ignore:line

        manifestModelMock.setValue(null);
        patchCheckStub.restore();
        isPatchValidStub.restore();
        applyPatchStub.restore();
        publishTimeStub.restore();
        loaderStub.restore();
    });

    describe('refresh manifest location', function () {
        const patchLocation = 'http://example.com/bar';
        const location = 'http://example.com/baz';
        const manifest = {
            url: 'http://example.com'
        };

        let patchLocationStub, locationStub, loadStub;

        beforeEach(function () {
            patchLocationStub = sinon.stub(adapterMock, 'getPatchLocation');
            locationStub = sinon.stub(adapterMock, 'getLocation');
            loadStub = sinon.stub(manifestLoaderMock, 'load');
            manifestModelMock.setValue(manifest);
        });

        afterEach(function () {
            patchLocationStub.restore();
            locationStub.restore();
            loadStub.restore();
            manifestModelMock.setValue(null);

            patchLocationStub = null;
            locationStub = null;
            loadStub = null;
        });

        it('should utilize patch location for update if provided one', function () {
            patchLocationStub.returns(patchLocation);
            locationStub.returns(location);

            manifestUpdater.refreshManifest();

            expect(loadStub.calledWith(patchLocation)).to.be.true; // jshint ignore:line
        });

        it('should utilize location for update if provided one and no patch location', function () {
            patchLocationStub.returns(null);
            locationStub.returns(location);

            manifestUpdater.refreshManifest();

            expect(loadStub.calledWith(location)).to.be.true; // jshint ignore:line
        });

        it('should utilize original mpd location if no other signal provided', function () {
            patchLocationStub.returns(null);
            locationStub.returns(null);

            manifestUpdater.refreshManifest();

            expect(loadStub.calledWith(manifest.url)).to.be.true; // jshint ignore:line
        });

        it('should make relative locations absolute relative to the manifest', function () {
            patchLocationStub.returns(null);
            locationStub.returns('baz'); // should convert to 'http://example.com/baz'

            manifestUpdater.refreshManifest();

            expect(loadStub.calledWith(location)).to.be.true; // jshint ignore:line
        });
    });
});
