import {expect} from 'chai';
import sinon from 'sinon';
import ListMpdController from '../../../../src/streaming/controllers/ListMpdController.js';
import EventBus from '../../../../src/core/EventBus.js';
import Events from '../../../../src/core/events/Events.js';
import DashAdapter from '../../../../src/dash/DashAdapter.js';
import MpdHelper from '../../helpers/MPDHelper.js';
import Settings from '../../../../src/core/Settings.js';
import ErrorHandlerMock from '../../mocks/ErrorHandlerMock.js';
import ManifestLoaderMock from '../../mocks/ManifestLoaderMock.js';


describe('ListMpdController', function () {
    let listMpdController,
        eventBus,
        context,
        mpdHelper,
        manifestLoaderMock,
        settings,
        dashAdapterMock

    beforeEach(() => {
        context = {};
        eventBus = EventBus(context).getInstance();
        listMpdController = ListMpdController(context).getInstance();

        dashAdapterMock = DashAdapter(context).getInstance();
        const errorHandlerMock = new ErrorHandlerMock();
        dashAdapterMock.setConfig({
            errHandler: errorHandlerMock,
        });

        settings = Settings(context).getInstance();

        mpdHelper = new MpdHelper();
    });

    describe('IMPORTED_MPDS_LOADED event', function () {
        beforeEach(() => {
            const responseMpdMock = mpdHelper.getMpd('static', undefined);
            responseMpdMock.minBufferTime = 4;
            manifestLoaderMock = new ManifestLoaderMock(responseMpdMock);
            const config = {
                settings: settings,
                dashAdapter: dashAdapterMock,
                manifestLoader: manifestLoaderMock
            };

            listMpdController.setConfig(config);
        });

        it('should trigger a manifest update if first period is a linked period', async () => {
            const spy = sinon.spy(eventBus, 'trigger');

            const manifest = mpdHelper.getListMpd();
            const linkedPeriod = mpdHelper.composeLinkedPeriod('0', 0);
            const regularPeriod = mpdHelper.composePeriod(undefined);
            manifest.Period = [linkedPeriod, regularPeriod];
            listMpdController.initialize();
            const linkedPeriods = [linkedPeriod];
            
            // Create a promise that resolves when MANIFEST_UPDATED is triggered
            let updatedManifest;
            const manifestUpdatedPromise = new Promise((resolve) => {
                eventBus.on(Events.MANIFEST_UPDATED, (manifest) => {
                    updatedManifest = manifest;
                    resolve();
                });
            });

            // Create a timeout promise that rejects after 4 seconds
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout: MANIFEST_UPDATED event was not triggered')), 4000)
            );

            eventBus.trigger(Events.IMPORTED_MPDS_LOADED, { manifest, linkedPeriods } )

            // Wait for the specific event to occur
            await Promise.race([manifestUpdatedPromise, timeoutPromise]);
            sinon.assert.calledWith(spy, Events.MANIFEST_UPDATED, sinon.match.any);
            expect(updatedManifest.manifest.Period[0]).to.have.property('AdaptationSet');
        });

        it('should trigger a manifest update event if the first period is a regular period', async () => {
            const spy = sinon.spy(eventBus, 'trigger');
            
            const manifest = mpdHelper.getListMpd();
            const regularPeriod = mpdHelper.composePeriod(undefined);
            const linkedPeriod = mpdHelper.composeLinkedPeriod('0', 0);
            manifest.Period = [regularPeriod, linkedPeriod];
            listMpdController.initialize();
            const linkedPeriods = [linkedPeriod];

            // Create a promise that resolves when MANIFEST_UPDATED is triggered
            const manifestUpdatedPromise = new Promise((resolve) => {
                eventBus.on(Events.MANIFEST_UPDATED, (resolve));
            });

            // Create a timeout promise that rejects after 4 seconds
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout: MANIFEST_UPDATED event was not triggered')), 4000)
            );

            eventBus.trigger(Events.IMPORTED_MPDS_LOADED, { manifest, linkedPeriods } )

            // Wait for the specific event to occur
            await Promise.race([manifestUpdatedPromise, timeoutPromise]);
            sinon.assert.calledWith(spy, Events.MANIFEST_UPDATED, sinon.match.any);
        })
    })

    describe('loadLinkedPeriod', function () {
        afterEach(() => {
            listMpdController.reset();
        });
        
        it('should merge a the imported manifest if the load success', async () => {
            const responseMpdMock = mpdHelper.getMpd('static', undefined);
            responseMpdMock.minBufferTime = 4;
            manifestLoaderMock = new ManifestLoaderMock(responseMpdMock);
            const config = {
                settings: settings,
                dashAdapter: dashAdapterMock,
                manifestLoader: manifestLoaderMock
            };

            listMpdController.setConfig(config);

            const spy = sinon.spy(eventBus, 'trigger');
            const manifest = mpdHelper.getListMpd();
            const regularPeriod = mpdHelper.composePeriod(undefined);
            const linkedPeriod = mpdHelper.composeLinkedPeriod('0', 0);
            manifest.Period = [regularPeriod, linkedPeriod];
            listMpdController.initialize();
            
            // Create a promise that resolves when MANIFEST_UPDATED is triggered
            let updatedManifest;
            const manifestUpdatedPromise = new Promise((resolve) => {
                eventBus.on(Events.MANIFEST_UPDATED, (manifest) => {
                    updatedManifest = manifest;
                    resolve();
                });
            });
            // Create a timeout promise that rejects after 4 seconds
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout: MANIFEST_UPDATED event was not triggered')), 4000)
            );

            listMpdController.loadLinkedPeriod(manifest, linkedPeriod);

            // Wait for the specific event to occur
            await Promise.race([manifestUpdatedPromise, timeoutPromise]);
            sinon.assert.calledWith(spy, Events.MANIFEST_UPDATED, sinon.match.any);
            expect(updatedManifest.manifest.Period[1]).to.have.property('AdaptationSet');
        });

        it('should not merge a the imported manifest if the load success', async () => {
            manifestLoaderMock = new ManifestLoaderMock('fail');
            const config = {
                settings: settings,
                dashAdapter: dashAdapterMock,
                manifestLoader: manifestLoaderMock
            };

            listMpdController.setConfig(config);
            const spy = sinon.spy(eventBus, 'trigger');
            const manifest = mpdHelper.getListMpd();
            const regularPeriod = mpdHelper.composePeriod(undefined);
            const linkedPeriod = mpdHelper.composeLinkedPeriod('0', 0);
            manifest.Period = [regularPeriod, linkedPeriod];
            listMpdController.initialize();
            
            // Create a promise that resolves when MANIFEST_UPDATED is triggered
            let updatedManifest;
            const manifestUpdatedPromise = new Promise((resolve) => {
                eventBus.on(Events.MANIFEST_UPDATED, (manifest) => {
                    updatedManifest = manifest;
                    resolve();
                });
            });

            // Create a timeout promise that rejects after 4 seconds
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout: MANIFEST_UPDATED event was not triggered')), 4000)
            );

            listMpdController.loadLinkedPeriod(manifest, linkedPeriod);

            // Wait for the specific event to occur
            await Promise.race([manifestUpdatedPromise, timeoutPromise]);
            sinon.assert.calledWith(spy, Events.MANIFEST_UPDATED, sinon.match.any);
            expect(updatedManifest.manifest.Period[1]).to.be.undefined;

        });
    });
});
