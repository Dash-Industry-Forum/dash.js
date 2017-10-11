import EventController from '../../src/streaming/controllers/EventController';
import EventBus from '../../src/core/EventBus';

import PlaybackControllerMock from './mocks/PlaybackControllerMock';
import ManifestModelMock from './mocks/ManifestModelMock';
import ManifestUpdaterMock from './mocks/ManifestUpdaterMock';

const expect = require('chai').expect;
const context = {};
const eventBus = EventBus(context).getInstance();

describe('EventController', function () {
    let eventController;

    let manifestUpdaterMock = new ManifestUpdaterMock();
    let playbackControllerMock = new PlaybackControllerMock();
    let manifestModelMock = new ManifestModelMock();

    beforeEach(function () {
        eventController = EventController(context).create();
    });

    afterEach(function () {
        eventController.reset();
        eventController = null;
    });

    describe('if not configured', function () {
        it('should throw an exception when calling start', function () {
            expect(eventController.start).to.throw('setConfig function has to be called previously');
        });

        it('should throw an exception when calling addInbandEvents', function () {
            expect(eventController.addInbandEvents).to.throw('setConfig function has to be called previously');
        });

        it('should throw an exception when calling addInlineEvents', function () {
            expect(eventController.addInlineEvents).to.throw('setConfig function has to be called previously');
        });
    });

    describe('if configured', function () {
        beforeEach(function () {
            eventController.setConfig({
                manifestModel: manifestModelMock,
                manifestUpdater: manifestUpdaterMock,
                playbackController: playbackControllerMock
            });
        });

        it('should trigger added inband events', function (done) {
            let schemeIdUri = 'inbandEvent';
            let events = [{
                eventStream: {
                    timescale: 1,
                    schemeIdUri: schemeIdUri
                },
                id: 'event0',
                presentationTime: 0
            }];

            let onInbandEvent = function (e) {
                expect(e.event.id).to.equal('event0');
                eventBus.off(schemeIdUri, onInbandEvent);
                done();
            };

            eventBus.on(schemeIdUri, onInbandEvent, this);

            eventController.addInbandEvents(events);
            eventController.start();
        });

        it('should trigger added inline events', function (done) {
            let schemeIdUri = 'inbandEvent';
            let events = [{
                eventStream: {
                    timescale: 1,
                    schemeIdUri: schemeIdUri
                },
                id: 'event0',
                presentationTime: 0
            }];

            let onInlineEvent = function (e) {
                expect(e.event.id).to.equal('event0');
                eventBus.off(schemeIdUri, onInlineEvent);
                done();
            };

            eventBus.on(schemeIdUri, onInlineEvent, this);

            eventController.addInlineEvents(events);
            eventController.start();
        });
    });
});
