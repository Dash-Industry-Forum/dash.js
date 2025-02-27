import { expect } from 'chai';
import sinon from 'sinon';
import ListMpdController from '../../../../src/streaming/controllers/ListMpdController.js';
import EventBus from '../../../../src/core/EventBus.js';
import Events from '../../../../src/core/events/Events.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';
import ManifestLoaderMock from '../../mocks/ManifestLoaderMock.js';
import DashAdapter from '../../../../src/dash/DashAdapter.js';
import DashConstants from '../../../../src/dash/constants/DashConstants.js';
import DashParser from '../../../../src/dash/parser/DashParser.js';
import FileLoader from '../../helpers/FileLoader.js';
import DebugMock from '../../mocks/DebugMock.js';

describe('ListMpdController', function () {
    let listMpdController, eventBus, manifestLoader, dashAdapter;

    beforeEach(() => {
        debugger;
        eventBus = EventBus().getInstance();
        manifestLoader = new ManifestLoaderMock();
        listMpdController = ListMpdController().getInstance();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should throw an error if the first period does not start at 0', async () => {
        debugger;
        let manifest = await FileLoader.loadTextFile('../data/dash/manifest_list_mpd.xml');
        console.log(manifest)
        let dashParser = DashParser(context).create({debug: new DebugMock()});
        let parsedMpd = dashParser.parse(manifest);
        expect(() => listMpdController.initialize()).to.throw('The first period in a list MPD must have start time equal to 0');
    });

    
});
