import Events from '../../src/core/events/Events';
import MediaPlayerEvents from '../../src/streaming/MediaPlayerEvents';
import FragmentController from '../../src/streaming/controllers/FragmentController';
import EventBus from '../../src/core/EventBus';
import Settings from '../../src/core/Settings';

import MediaPlayerModelMock from './mocks/MediaPlayerModelMock';

const chai = require('chai');
const expect = chai.expect;

describe('FragmentController', function () {
    let videoFragmentModel;
    const context = {};
    const eventBus = EventBus(context).getInstance();
    const mediaPlayerModelMock = new MediaPlayerModelMock();
    const settings = Settings(context).getInstance();
    const fragmentController = FragmentController(context).create({
        streamInfo: { id: 'streamId' },
        mediaPlayerModel: mediaPlayerModelMock,
        settings: settings
    });

    Events.extend(MediaPlayerEvents);

    it('should create or return model for a given media type', function () {
        videoFragmentModel = fragmentController.getModel('DUMMY_STREAM-01', 'video');
        expect(videoFragmentModel).to.exist; // jshint ignore:line
    });

    it('should always return the same model for the context', function () {
        const context1 = 1;
        const context2 = 2;

        const model1 = fragmentController.getModel('DUMMY_STREAM-01', context1);
        const model2 = fragmentController.getModel('DUMMY_STREAM-01', context2);

        expect(fragmentController.getModel('DUMMY_STREAM-01', context1)).to.be.equal(model1);
        expect(fragmentController.getModel('DUMMY_STREAM-01', context2)).to.be.equal(model2);
    });

    it('should trigger INIT_FRAGMENT_LOADED event when an init segment download is completed.', function (done) {
        let onInitFragmentLoaded = function () {
            eventBus.off(Events.INIT_FRAGMENT_LOADED, onInitFragmentLoaded);
            done();
        };

        eventBus.on(Events.INIT_FRAGMENT_LOADED, onInitFragmentLoaded, this);
        eventBus.trigger(Events.FRAGMENT_LOADING_COMPLETED, {
            response: {},
            request: {
                mediaType: 'video',
                isInitializationRequest() { return true; },
                type: 'InitializationSegment',
                mediaInfo: {streamInfo: {}}
            },
            sender: videoFragmentModel});
    });

    it('should trigger SERVICE_LOCATION_BLACKLIST_ADD event when an init segment download is completed with an error.', function (done) {
        let onInitFragmentLoadedWithError = function () {
            eventBus.off(Events.SERVICE_LOCATION_BLACKLIST_ADD, onInitFragmentLoadedWithError);
            done();
        };

        eventBus.on(Events.SERVICE_LOCATION_BLACKLIST_ADD, onInitFragmentLoadedWithError, this);
        eventBus.trigger(Events.FRAGMENT_LOADING_COMPLETED, {error: {}, response: {}, request: {mediaType: 'video', isInitializationRequest() { return true; }, type: 'InitializationSegment', mediaInfo: {streamInfo: {}}}, sender: videoFragmentModel});
    });
});
