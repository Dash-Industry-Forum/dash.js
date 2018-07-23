import ManifestUpdater from './../../src/streaming/ManifestUpdater';
import Events from '../../src/core/events/Events';
import EventBus from '../../src/core/EventBus';

import ManifestModelMock from './mocks/ManifestModelMock';
import DashManifestModelMock from './mocks/DashManifestModelMock';
import MediaPlayerModelMock from './mocks/MediaPlayerModelMock';
import ManifestLoaderMock from './mocks/ManifestLoaderMock';
import ErrorHandlerMock from './mocks/ErrorHandlerMock';

const expect = require('chai').expect;

describe('ManifestUpdater', function () {
    const context = {};
    const eventBus = EventBus(context).getInstance();
    let manifestUpdater = ManifestUpdater(context).create();

    // init mock
    const manifestModelMock = new ManifestModelMock();
    const dashManifestModelMock = new DashManifestModelMock();
    const mediaPlayerModelMock = new MediaPlayerModelMock();
    const manifestLoaderMock = new ManifestLoaderMock();
    const errHandlerMock = new ErrorHandlerMock();

    const manifestErrorMockText = `Mock Failed detecting manifest type or manifest type unsupported`;

    manifestUpdater.setConfig({
        manifestModel: manifestModelMock,
        dashManifestModel: dashManifestModelMock,
        mediaPlayerModel: mediaPlayerModelMock,
        manifestLoader: manifestLoaderMock,
        errHandler: errHandlerMock
    });

    manifestUpdater.initialize();

    it('should return an error when parsing error occurs', function () {
        eventBus.trigger(Events.INTERNAL_MANIFEST_LOADED, {
            error: {message: manifestErrorMockText}
        });
        expect(errHandlerMock.error).to.equal(manifestErrorMockText);
    });
});