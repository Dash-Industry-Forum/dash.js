import sinon from 'sinon';
import ListMpdController from '../../../../src/streaming/controllers/ListMpdController.js';
import EventBus from '../../../../src/core/EventBus.js';
import Events from '../../../../src/core/events/Events.js';
import DashAdapter from '../../../../src/dash/DashAdapter.js';
import VoHelper from '../../helpers/VOHelper.js';
import Settings from '../../../../src/core/Settings.js';
import ErrorHandlerMock from '../../mocks/ErrorHandlerMock.js';
import ManifestLoaderMock from '../../mocks/ManifestLoaderMock.js';


describe('ListMpdController', function () {
    let listMpdController, eventBus;
    let context;
    let voHelper;
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

        voHelper = new VoHelper();
        let dummyURL = 'someurl.com';
        let responseMpdMock = voHelper.getDummyListMpd(dummyURL);
        let regularMockPeriod = voHelper.getDummyPeriod();
        responseMpdMock.Period[0] = regularMockPeriod;

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

        console.log('Are they the same?', manifestLoaderMock === ListMpdController(context).getInstance().manifestLoader);

        const spy = sinon.spy(eventBus, 'trigger');

        const baseURL = 'someurl.com';
        const uriList = [
            'bbb_30fps.mpd',
        ];
         
        let manifest = voHelper.getDummyListMpd(baseURL);
        let linkedPeriod = voHelper.getDummyLinkedPeriod(uriList[0], '0', 0);
        manifest.Period[0] = linkedPeriod;
        let regularPeriod = voHelper.getDummyPeriod();
        manifest.Period[1] = regularPeriod;
        listMpdController.initialize();
        let linkedPeriods = [linkedPeriod];
        let updatedManifest;

        // Create a promise that resolves when MANIFEST_UPDATED is triggered
        const manifestUpdatedPromise = new Promise((resolve) => {
            eventBus.on(Events.MANIFEST_UPDATED, (manifest) => {
                updatedManifest = manifest;
                console.log(updatedManifest);
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
        // console.log(updatedManifest);
    });

});
