import ManifestUpdater from './../../../../src/streaming/ManifestUpdater.js';
import Events from '../../../../src/core/events/Events.js';
import EventBus from '../../../../src/core/EventBus.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';
import Errors from '../../../../src/core/errors/Errors.js';
import Settings from '../../../../src/core/Settings.js';
import DashConstants from '../../../../src/dash/constants/DashConstants.js';
import AdapterMock from '../../mocks/AdapterMock.js';
import ManifestModelMock from '../../mocks/ManifestModelMock.js';
import ManifestLoaderMock from '../../mocks/ManifestLoaderMock.js';
import ErrorHandlerMock from '../../mocks/ErrorHandlerMock.js';
import ContentSteeringControllerMock from '../../mocks/ContentSteeringControllerMock.js';
import CustomParametersModel from '../../../../src/streaming/models/CustomParametersModel.js';

import chai from 'chai';
import sinon from 'sinon';
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
    const contentSteeringControllerMock = new ContentSteeringControllerMock();

    const settings = Settings(context).getInstance();

    const manifestErrorMockText = `Mock Failed detecting manifest type or manifest type unsupported`;

    manifestUpdater.setConfig({
        adapter: adapterMock,
        manifestModel: manifestModelMock,
        manifestLoader: manifestLoaderMock,
        errHandler: errHandlerMock,
        contentSteeringController: contentSteeringControllerMock,
        settings: settings
    });

    manifestUpdater.initialize();

    it('should not call MANIFEST_UPDATED if a loading error occurs, no error should be sent', function () {
        const spy = chai.spy();
        eventBus.on(Events.MANIFEST_UPDATED, spy);

        eventBus.trigger(Events.INTERNAL_MANIFEST_LOADED, {
            error: { code: Errors.MANIFEST_LOADER_LOADING_FAILURE_ERROR_CODE, message: manifestErrorMockText }
        });

        expect(spy).to.have.not.been.called();

        eventBus.off(Events.MANIFEST_UPDATED, spy);

        expect(errHandlerMock.errorCode).to.equal(undefined);
    });

    it('should not call MANIFEST_UPDATED if a parsing error occurs, errorHandler should send an error', function () {
        const spy = chai.spy();
        eventBus.on(Events.MANIFEST_UPDATED, spy);

        eventBus.trigger(Events.INTERNAL_MANIFEST_LOADED, {
            error: { code: Errors.MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE, message: manifestErrorMockText }
        });

        expect(spy).to.have.not.been.called();

        eventBus.off(Events.MANIFEST_UPDATED, spy);

        expect(errHandlerMock.errorCode).to.equal(Errors.MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE);
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
        expect(spy.calledOnce).to.be.true;
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
        eventBus.trigger(Events.INTERNAL_MANIFEST_LOADED, { manifest: patch });

        expect(manifestModelMock.getValue()).to.equal(inMemoryManifest);
        expect(inMemoryManifest.loadedTime).to.not.equal(originalTime);
        expect(patchCheckStub.called).to.be.true;
        expect(isPatchValidStub.called).to.be.true;
        expect(applyPatchStub.calledWith(inMemoryManifest, patch)).to.be.true;
        expect(spy.calledOnce).to.be.true;
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
        eventBus.trigger(Events.INTERNAL_MANIFEST_LOADED, { manifest: patch });

        expect(manifestModelMock.getValue()).to.equal(inMemoryManifest);
        expect(patchCheckStub.called).to.be.true;
        expect(isPatchValidStub.called).to.be.true;
        expect(applyPatchStub.called).to.be.false;
        expect(loaderStub.called).to.be.true;

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
        eventBus.trigger(Events.INTERNAL_MANIFEST_LOADED, { manifest: patch });

        expect(manifestModelMock.getValue()).to.equal(inMemoryManifest);
        expect(patchCheckStub.called).to.be.true;
        expect(isPatchValidStub.called).to.be.true;
        expect(applyPatchStub.called).to.be.true;
        expect(loaderStub.called).to.be.true;

        manifestModelMock.setValue(null);
        patchCheckStub.restore();
        isPatchValidStub.restore();
        applyPatchStub.restore();
        publishTimeStub.restore();
        loaderStub.restore();
    });

    describe('dynamic to static transition', function () {

        afterEach(function () {
            manifestModelMock.setValue(null);
            settings.reset();
        });

        it('should trigger DYNAMIC_TO_STATIC and apply the static manifest when a static manifest follows a dynamic one', function () {
            manifestModelMock.setValue({ type: DashConstants.DYNAMIC, loadedTime: new Date() });

            const dynamicToStaticSpy = sinon.spy();
            const manifestUpdatedSpy = sinon.spy();
            eventBus.on(Events.DYNAMIC_TO_STATIC, dynamicToStaticSpy);
            eventBus.on(Events.MANIFEST_UPDATED, manifestUpdatedSpy);

            const staticManifest = { type: DashConstants.STATIC, loadedTime: new Date() };
            eventBus.trigger(Events.INTERNAL_MANIFEST_LOADED, { manifest: staticManifest });

            expect(dynamicToStaticSpy.calledOnce).to.be.true;
            expect(manifestModelMock.getValue()).to.equal(staticManifest);
            expect(manifestUpdatedSpy.calledOnce).to.be.true;
            expect(manifestUpdatedSpy.firstCall.args[0].manifest).to.equal(staticManifest);

            eventBus.off(Events.DYNAMIC_TO_STATIC, dynamicToStaticSpy);
            eventBus.off(Events.MANIFEST_UPDATED, manifestUpdatedSpy);
        });

        it('should not trigger DYNAMIC_TO_STATIC again on subsequent static updates', function () {
            manifestModelMock.setValue({ type: DashConstants.DYNAMIC, loadedTime: new Date() });

            const dynamicToStaticSpy = sinon.spy();
            const manifestUpdatedSpy = sinon.spy();
            eventBus.on(Events.DYNAMIC_TO_STATIC, dynamicToStaticSpy);
            eventBus.on(Events.MANIFEST_UPDATED, manifestUpdatedSpy);

            eventBus.trigger(Events.INTERNAL_MANIFEST_LOADED, {
                manifest: { type: DashConstants.STATIC, loadedTime: new Date() }
            });
            eventBus.trigger(Events.INTERNAL_MANIFEST_LOADED, {
                manifest: { type: DashConstants.STATIC, loadedTime: new Date() }
            });

            expect(dynamicToStaticSpy.calledOnce).to.be.true;
            expect(manifestUpdatedSpy.calledTwice).to.be.true;

            eventBus.off(Events.DYNAMIC_TO_STATIC, dynamicToStaticSpy);
            eventBus.off(Events.MANIFEST_UPDATED, manifestUpdatedSpy);
        });

        it('should ignore the static manifest when ignoreFinalStaticManifestOnDynamicToStaticTransition is enabled', function () {
            settings.update({ streaming: { ignoreFinalStaticManifestOnDynamicToStaticTransition: true } });

            const dynamicManifest = { type: DashConstants.DYNAMIC, loadedTime: new Date() };
            manifestModelMock.setValue(dynamicManifest);

            const dynamicToStaticSpy = sinon.spy();
            const manifestUpdatedSpy = sinon.spy();
            eventBus.on(Events.DYNAMIC_TO_STATIC, dynamicToStaticSpy);
            eventBus.on(Events.MANIFEST_UPDATED, manifestUpdatedSpy);

            eventBus.trigger(Events.INTERNAL_MANIFEST_LOADED, {
                manifest: { type: DashConstants.STATIC, loadedTime: new Date() }
            });

            expect(dynamicToStaticSpy.calledOnce).to.be.true;
            expect(manifestModelMock.getValue()).to.equal(dynamicManifest);
            expect(manifestUpdatedSpy.called).to.be.false;

            eventBus.off(Events.DYNAMIC_TO_STATIC, dynamicToStaticSpy);
            eventBus.off(Events.MANIFEST_UPDATED, manifestUpdatedSpy);
        });
    });

    describe('refresh manifest location', function () {
        const patchLocation = [{ url: 'http://example.com/bar' }];
        const location = [{ url: 'http://example.com/baz' }];
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

            expect(loadStub.calledWith(patchLocation[0].url)).to.be.true;
        });

        it('should utilize location for update if provided one and no patch location', function () {
            patchLocationStub.returns(null);
            locationStub.returns(location);

            manifestUpdater.refreshManifest();

            expect(loadStub.calledWith(location[0].url)).to.be.true;
        });

        it('should utilize original mpd location if no other signal provided', function () {
            patchLocationStub.returns([]);
            locationStub.returns([]);

            manifestUpdater.refreshManifest();

            expect(loadStub.calledWith(manifest.url)).to.be.true;
        });

        it('should make relative locations absolute relative to the manifest', function () {
            patchLocationStub.returns(null);
            locationStub.returns([{ url: 'baz' }]); // should convert to 'http://example.com/baz'

            manifestUpdater.refreshManifest();

            expect(loadStub.calledWith(location[0].url)).to.be.true;
        });
    });

    describe('content pending before playback started', function () {
        const REFRESH_DELAY_S = 2;
        let clock, loadStub, updatePeriodStub, locationStub;

        beforeEach(function () {
            clock = sinon.useFakeTimers();
            manifestUpdater.reset();
            manifestUpdater.initialize();
            loadStub = sinon.stub(manifestLoaderMock, 'load');
            locationStub = sinon.stub(adapterMock, 'getLocation').returns([]);
            updatePeriodStub = sinon.stub(adapterMock, 'getManifestUpdatePeriod').returns(REFRESH_DELAY_S);
            eventBus.trigger(Events.INTERNAL_MANIFEST_LOADED, {
                manifest: { type: DashConstants.DYNAMIC, url: 'http://example.com/manifest.mpd', loadedTime: new Date() }
            });
        });

        afterEach(function () {
            manifestUpdater.reset();
            manifestUpdater.initialize();
            loadStub.restore();
            locationStub.restore();
            updatePeriodStub.restore();
            manifestModelMock.setValue(null);
            clock.restore();
        });

        it('should not refresh the manifest before playback started if content is not pending', function () {
            clock.tick(REFRESH_DELAY_S * 1000 * 3);

            expect(loadStub.called).to.be.false;
        });

        it('should refresh the manifest after the update period while content is pending', function () {
            eventBus.trigger(Events.MANIFEST_CONTENT_PENDING);

            clock.tick(REFRESH_DELAY_S * 1000 - 1);
            expect(loadStub.called).to.be.false;

            clock.tick(1);
            expect(loadStub.calledOnce).to.be.true;
            expect(loadStub.firstCall.args[0]).to.equal('http://example.com/manifest.mpd');
        });

        it('should no longer be updating once content is reported as pending', function () {
            manifestUpdater.refreshManifest();
            expect(manifestUpdater.getIsUpdating()).to.be.true;

            eventBus.trigger(Events.MANIFEST_CONTENT_PENDING);

            expect(manifestUpdater.getIsUpdating()).to.be.false;
        });

        it('should keep refreshing while content stays pending', function () {
            eventBus.trigger(Events.MANIFEST_CONTENT_PENDING);
            clock.tick(REFRESH_DELAY_S * 1000);
            eventBus.trigger(Events.INTERNAL_MANIFEST_LOADED, {
                manifest: { type: DashConstants.DYNAMIC, url: 'http://example.com/manifest.mpd', loadedTime: new Date() }
            });
            eventBus.trigger(Events.MANIFEST_CONTENT_PENDING);
            clock.tick(REFRESH_DELAY_S * 1000);

            expect(loadStub.calledTwice).to.be.true;
        });

        it('should keep refreshing while content is pending if an MPD refresh failed', function () {
            eventBus.trigger(Events.MANIFEST_CONTENT_PENDING);
            clock.tick(REFRESH_DELAY_S * 1000);
            expect(manifestUpdater.getIsUpdating()).to.be.true;

            eventBus.trigger(Events.INTERNAL_MANIFEST_LOADED, {
                sender: manifestLoaderMock,
                error: { code: Errors.MANIFEST_LOADER_LOADING_FAILURE_ERROR_CODE }
            });
            expect(manifestUpdater.getIsUpdating()).to.be.false;

            clock.tick(REFRESH_DELAY_S * 1000);
            expect(loadStub.calledTwice).to.be.true;
        });

        it('should report a parsing failure and keep refreshing while content is pending', function () {
            errHandlerMock.reset();
            eventBus.trigger(Events.MANIFEST_CONTENT_PENDING);
            clock.tick(REFRESH_DELAY_S * 1000);

            eventBus.trigger(Events.INTERNAL_MANIFEST_LOADED, {
                sender: manifestLoaderMock,
                error: { code: Errors.MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE }
            });
            expect(errHandlerMock.errorCode).to.equal(Errors.MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE);
            expect(manifestUpdater.getIsUpdating()).to.be.false;

            clock.tick(REFRESH_DELAY_S * 1000);
            expect(loadStub.calledTwice).to.be.true;
        });

        it('should not restart refreshing while content is pending if an MPD request of another loader failed', function () {
            eventBus.trigger(Events.MANIFEST_CONTENT_PENDING);
            clock.tick(REFRESH_DELAY_S * 1000);
            expect(manifestUpdater.getIsUpdating()).to.be.true;

            // e.g. player.retrieveManifest(), which uses its own ManifestLoader
            eventBus.trigger(Events.INTERNAL_MANIFEST_LOADED, {
                sender: {},
                error: { code: Errors.MANIFEST_LOADER_LOADING_FAILURE_ERROR_CODE }
            });

            expect(manifestUpdater.getIsUpdating()).to.be.true;
            clock.tick(REFRESH_DELAY_S * 1000);
            expect(loadStub.calledOnce).to.be.true;
        });

        it('should not refresh before playback started after a parsing failure if content is not pending', function () {
            manifestUpdater.refreshManifest();
            eventBus.trigger(Events.INTERNAL_MANIFEST_LOADED, {
                sender: manifestLoaderMock,
                error: { code: Errors.MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE }
            });

            clock.tick(REFRESH_DELAY_S * 1000 * 3);

            expect(loadStub.calledOnce).to.be.true;
        });

        it('should not refresh before playback started after a failed MPD refresh if content is not pending', function () {
            manifestUpdater.refreshManifest();
            eventBus.trigger(Events.INTERNAL_MANIFEST_LOADED, {
                sender: manifestLoaderMock,
                error: { code: Errors.MANIFEST_LOADER_LOADING_FAILURE_ERROR_CODE }
            });

            clock.tick(REFRESH_DELAY_S * 1000 * 3);

            expect(loadStub.calledOnce).to.be.true;
        });

        it('should keep refreshing before playback started once the streams have been composed', function () {
            eventBus.trigger(Events.MANIFEST_CONTENT_PENDING);
            clock.tick(REFRESH_DELAY_S * 1000);
            eventBus.trigger(Events.INTERNAL_MANIFEST_LOADED, {
                manifest: { type: DashConstants.DYNAMIC, url: 'http://example.com/manifest.mpd', loadedTime: new Date() }
            });
            eventBus.trigger(Events.STREAMS_COMPOSED);

            clock.tick(REFRESH_DELAY_S * 1000);
            expect(loadStub.calledTwice).to.be.true;
        });

        it('should keep refreshing on a pause before playback of a stream whose content was pending started', function () {
            settings.update({ streaming: { scheduling: { scheduleWhilePaused: false } } });
            eventBus.trigger(Events.MANIFEST_CONTENT_PENDING);
            eventBus.trigger(MediaPlayerEvents.PLAYBACK_PAUSED);

            clock.tick(REFRESH_DELAY_S * 1000);

            expect(loadStub.calledOnce).to.be.true;
            settings.reset();
        });

        it('should keep the current MPD on a response without content if external subtitles are added', function () {
            const updatedSpy = sinon.spy();
            eventBus.on(Events.MANIFEST_UPDATED, updatedSpy);
            manifestUpdater.setConfig({
                customParametersModel: { getExternalSubtitles: () => [{ id: 'sub', periodId: null }] }
            });
            eventBus.trigger(Events.MANIFEST_CONTENT_PENDING);
            clock.tick(REFRESH_DELAY_S * 1000);

            try {
                eventBus.trigger(Events.INTERNAL_MANIFEST_LOADED, { manifest: null });

                expect(updatedSpy.calledOnce).to.be.true;
            } finally {
                eventBus.off(Events.MANIFEST_UPDATED, updatedSpy);
                manifestUpdater.setConfig({ customParametersModel: CustomParametersModel(context).getInstance() });
            }
        });

        it('should stop refreshing on pause once playback of a stream whose content was pending started', function () {
            settings.update({ streaming: { scheduling: { scheduleWhilePaused: false } } });
            eventBus.trigger(Events.MANIFEST_CONTENT_PENDING);
            eventBus.trigger(Events.STREAMS_COMPOSED);
            eventBus.trigger(MediaPlayerEvents.PLAYBACK_STARTED);
            eventBus.trigger(MediaPlayerEvents.PLAYBACK_PAUSED);

            clock.tick(REFRESH_DELAY_S * 1000 * 3);

            expect(loadStub.called).to.be.false;
            settings.reset();
        });
    });
});
