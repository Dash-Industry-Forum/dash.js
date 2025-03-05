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
    let listMpdController, eventBus;
    let context;
    let mpdHelper;
    let manifestLoaderMock;

    beforeEach(() => {
        context = {};
        eventBus = EventBus(context).getInstance();
        listMpdController = ListMpdController(context).getInstance();

        const dashAdapterMock = DashAdapter(context).getInstance();
        const errorHandlerMock = new ErrorHandlerMock();
        dashAdapterMock.setConfig({
            errHandler: errorHandlerMock,
        });

        let settings = Settings(context).getInstance();

        mpdHelper = new MpdHelper();
        let responseMpdMock = mpdHelper.getMpd('static', undefined);
        responseMpdMock.minBufferTime = 4;
        manifestLoaderMock = new ManifestLoaderMock(responseMpdMock);
        let config = {
            settings: settings,
            dashAdapter: dashAdapterMock,
            manifestLoader: manifestLoaderMock
        };

        listMpdController.setConfig(config);
    });

    afterEach(() => {
    });

    it('should trigger a manifest update event if first period is a linked period', async () => {

        const spy = sinon.spy(eventBus, 'trigger');

        const baseURL = 'someurl.com';
        const uriList = [
            'bbb_30fps.mpd',
        ];
         
        let manifest = mpdHelper.getListMpd(baseURL);
        let linkedPeriod = mpdHelper.composeLinkedPeriod(uriList[0], '0', 0);
        manifest.Period[0] = linkedPeriod;
        let regularPeriod = mpdHelper.composePeriod(undefined);
        manifest.Period[1] = regularPeriod;
        listMpdController.initialize();
        let linkedPeriods = [linkedPeriod];
        let updatedManifest;

        // Create a promise that resolves when MANIFEST_UPDATED is triggered
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
        expect(updatedManifest.manifest.Period[0]).to.have.property('AdaptationSet')

    });

});
