import sinon from 'sinon';
import ListMpdController from '../../../../src/streaming/controllers/ListMpdController.js';
import EventBus from '../../../../src/core/EventBus.js';
import Events from '../../../../src/core/events/Events.js';
import DashAdapter from '../../../../src/dash/DashAdapter.js';
import VoHelper from '../../helpers/VOHelper.js';
import Settings from '../../../../src/core/Settings.js';
import ErrorHandlerMock from '../../mocks/ErrorHandlerMock.js';


describe('ListMpdController', function () {
    let listMpdController, eventBus;
    let context;

    beforeEach(() => {
        context = {};
        eventBus = EventBus(context).getInstance();
        listMpdController = ListMpdController(context).getInstance();
        const dashAdapter = DashAdapter(context).getInstance();
        const errorHandlerMock = new ErrorHandlerMock();
        dashAdapter.setConfig({
            errHandler: errorHandlerMock,
        });
        let settings = Settings(context).getInstance();
        let config = {
            settings: settings,
            dashAdapter: dashAdapter,
        };
        listMpdController.setConfig(config);
    });

    afterEach(() => {
    });

    it('should trigger a manifest update event if first period is a linked period', async () => {
        const spy = sinon.spy(eventBus, 'trigger');

        const baseURL = 'https://comcast-dash-6-assets.s3.us-east-2.amazonaws.com/ListMPDs/';
        const uriList = [
            'bbb_30fps.mpd',
        ];
        let voHelper = new VoHelper();
        let manifest = voHelper.getDummyListMpd(baseURL);
        let linkedPeriod = voHelper.getDummyLinkedPeriod(uriList[0], '0', 0);
        manifest.Period[0] = linkedPeriod;
        let regularPeriod = voHelper.getDummyPeriod();
        manifest.Period[1] = regularPeriod;
        listMpdController.initialize();
        let linkedPeriods = [linkedPeriod];

        // Create a promise that resolves when MANIFEST_UPDATED is triggered
        const manifestUpdatedPromise = new Promise((resolve) => {
            eventBus.on(Events.MANIFEST_UPDATED, resolve);
        });

        eventBus.trigger(Events.IMPORTED_MPDS_LOADED, { manifest, linkedPeriods } )
       
        // console.log("Are they the same?", eventBus === ListMpdController(context).getInstance().eventBus);
        // Wait for the specific event to occur
        await manifestUpdatedPromise;
        sinon.assert.calledWith(spy, Events.MANIFEST_UPDATED, sinon.match.any);
    });

});
