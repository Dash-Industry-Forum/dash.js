import { expect } from 'chai';
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

    it('should throw an error if the first period does not start at 0', () => {
        let errorCaught
        let voHelper = new VoHelper();
        let manifest = voHelper.getDummyMpd();
        manifest.manifest.Period[0].start = 1
        listMpdController.initialize();
        linkedPeriods = [];
        eventBus.trigger(Events.IMPORTED_MPDS_LOADED, { manifest, linkedPeriods } ).finally(error =>{
            debugger;
            errorCaught = error;
            expect(errorCaught).to.be.an('error');
        })
    
        expect(errorCaught.message).to.equal('error');
        // expect(() => eventBus.trigger(Events.IMPORTED_MPDS_LOADED, { manifest, linkedPeriods } )).to.throw('The first period in a list MPD must have start time equal to 0');
    });

    // it('should correctly set the start time of the first period to 0', () => {
    // });

    // it('should trigger MANIFEST_UPDATED if no period starts at 0', () => {
    // });

    // it('should load linked periods when playback time updates', () => {
    // });

    // it('should correctly determine whether to load a linked period', () => {
    // });

    // it('should reset the linked period list', () => {
    // });
});
