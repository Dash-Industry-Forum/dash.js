import {expect, assert} from 'chai';
import sinon from 'sinon';
import ListMpdController from '../../../../src/streaming/controllers/ListMpdController.js';
import EventBus from '../../../../src/core/EventBus.js';
import Events from '../../../../src/core/events/Events.js';
import DashAdapter from '../../../../src/dash/DashAdapter.js';
import MpdHelper from '../../helpers/MPDHelper.js';
import Settings from '../../../../src/core/Settings.js';
import ErrorHandlerMock from '../../mocks/ErrorHandlerMock.js';
import ManifestLoaderMock from '../../mocks/ManifestLoaderMock.js';
import Constants from '../../../../src/streaming/constants/Constants.js';

describe('ListMpdController', function () {
    let listMpdController,
        eventBus,
        context,
        mpdHelper,
        manifestLoaderMock,
        settings,
        dashAdapter

    beforeEach(() => {
        context = {};
        eventBus = EventBus(context).getInstance();
        listMpdController = ListMpdController(context).getInstance();

        dashAdapter = DashAdapter(context).getInstance();
        const errorHandlerMock = new ErrorHandlerMock();
        dashAdapter.setConfig({
            errHandler: errorHandlerMock,
            constants: Constants,
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
                dashAdapter: dashAdapter,
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

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout: MANIFEST_UPDATED event was not triggered')), 4000)
            );

            eventBus.trigger(Events.IMPORTED_MPDS_LOADED, { manifest, linkedPeriods } )

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

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout: MANIFEST_UPDATED event was not triggered')), 4000)
            );

            eventBus.trigger(Events.IMPORTED_MPDS_LOADED, { manifest, linkedPeriods } )

            await Promise.race([manifestUpdatedPromise, timeoutPromise]);
            sinon.assert.calledWith(spy, Events.MANIFEST_UPDATED, sinon.match.any);
        })

        it('should throw an error if the first period does not start at 0', function () {
            let manifest = mpdHelper.getListMpd();
            let linkedPeriod = mpdHelper.composeLinkedPeriod('0', 1);
            manifest.Period = [linkedPeriod];
            listMpdController.initialize();
            let linkedPeriods = [linkedPeriod];
    
            assert.throws(() => {
                eventBus.trigger(Events.IMPORTED_MPDS_LOADED, { manifest, linkedPeriods });
            }, /The first period in a list MPD must have start time equal to 0/);
        });
    })

    describe('loadListMpdManifest', function (){
        beforeEach(() => {
            const config = {
                settings: settings,
                dashAdapter: dashAdapter,
            };
            listMpdController.setConfig(config);
        });

        afterEach(() => {
            listMpdController.reset();
        });

        it('should not import mpd if time < start - resolutionTime', async function () {
            let manifest = mpdHelper.getListMpd();
            let regularPeriod = mpdHelper.composePeriod(undefined);
            let linkedPeriod = mpdHelper.composeLinkedPeriod('2', 5);
            linkedPeriod.ImportedMPD.earliestResolutionTimeOffset = 3
            linkedPeriod.duration = 10;
            manifest.Period = [regularPeriod, linkedPeriod]
            listMpdController.initialize();
            dashAdapter.updatePeriods(manifest);
            let linkedPeriods = [linkedPeriod];
            let nonUpdatedManifest;
            
            eventBus.trigger(Events.IMPORTED_MPDS_LOADED, { manifest, linkedPeriods } )
            listMpdController.loadListMpdManifest(1)
            
            // Create a promise that resolves when MANIFEST_UPDATED is triggered
            const manifestUpdatedPromise = new Promise((resolve) => {
                eventBus.on(Events.MANIFEST_UPDATED, (manifest) => {
                    nonUpdatedManifest = manifest;
                    resolve();
                });
            });
    
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout: MANIFEST_UPDATED event was not triggered')), 4000)
            );
    
            eventBus.trigger(Events.IMPORTED_MPDS_LOADED, { manifest, linkedPeriods } )
    
            await Promise.race([manifestUpdatedPromise, timeoutPromise]);
            expect(manifest).to.deep.equal(nonUpdatedManifest.manifest);
        })

    });

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
                dashAdapter: dashAdapter,
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

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout: MANIFEST_UPDATED event was not triggered')), 4000)
            );

            listMpdController.loadLinkedPeriod(manifest, linkedPeriod);

            await Promise.race([manifestUpdatedPromise, timeoutPromise]);
            sinon.assert.calledWith(spy, Events.MANIFEST_UPDATED, sinon.match.any);
            expect(updatedManifest.manifest.Period[1]).to.have.property('AdaptationSet');
        });

        it('should not merge a the imported manifest if the load fails', async () => {
            manifestLoaderMock = new ManifestLoaderMock('fail');
            const config = {
                settings: settings,
                dashAdapter: dashAdapter,
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

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout: MANIFEST_UPDATED event was not triggered')), 4000)
            );

            listMpdController.loadLinkedPeriod(manifest, linkedPeriod);

            await Promise.race([manifestUpdatedPromise, timeoutPromise]);
            sinon.assert.calledWith(spy, Events.MANIFEST_UPDATED, sinon.match.any);
            expect(updatedManifest.manifest.Period[1]).to.be.undefined;
        });
    });
});
