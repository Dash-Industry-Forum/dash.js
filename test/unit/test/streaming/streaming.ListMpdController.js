// import { expect } from 'chai';
import ListMpdController from '../../../../src/streaming/controllers/ListMpdController.js';
import EventBus from '../../../../src/core/EventBus.js';
import Events from '../../../../src/core/events/Events.js';
import AdapterMock from '../../mocks/AdapterMock.js';
import VoHelper from '../../helpers/VOHelper.js';
import Settings from '../../../../src/core/Settings.js';

describe('ListMpdController', function () {
    let listMpdController, eventBus, linkedPeriods;

    beforeEach(() => {
        eventBus = EventBus().getInstance();
        listMpdController = ListMpdController().getInstance();
        const dashAdapter = new AdapterMock();
        let settings = Settings().getInstance();
        let config = {
            settings: settings,
            dashAdapter: dashAdapter
        };
        listMpdController.setConfig(config);
    });

    afterEach(() => {
    });

    // it('should throw an error if the first period does not start at 0', async () => {
    //     let voHelper = new VoHelper();
    //     let manifest = voHelper.getDummyMpd();
    //     manifest.manifest.Period[0].start = 1
    //     listMpdController.initialize();
    //     const consoleErrorSpy = sinon.spy(console, "error");
    //     linkedPeriods = [];
    //     eventBus.trigger(Events.IMPORTED_MPDS_LOADED, { manifest, linkedPeriods } )
    //     expect(consoleErrorSpy.calledOnce).to.be.true;
    //     expect(consoleErrorSpy.firstCall.args[0].message).to.equal("The first period in a list MPD must have start time equal to 0");
    // });

    it("should trigger a manifest update event if the first period is a regular period", () => {
        let voHelper = new VoHelper();
        let manifest = voHelper.getDummyMpd();
        //let manifest = voHelper.getDummyListMpd();
        listMpdController.initialize();
        linkedPeriods = [];
        eventBus.trigger(Events.IMPORTED_MPDS_LOADED, { manifest, linkedPeriods } )
        //catch event trigger
    })
});
