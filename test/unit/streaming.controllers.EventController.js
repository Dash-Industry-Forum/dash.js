import EventController from '../../src/streaming/controllers/EventController';
import EventBus from '../../src/core/EventBus';
import Events from '../../src/core/events/Events';

import PlaybackControllerMock from './mocks/PlaybackControllerMock';
import ManifestUpdaterMock from './mocks/ManifestUpdaterMock';

import { EVENT_MODE_ON_START, EVENT_MODE_ON_RECEIVE } from '../../src/streaming/MediaPlayerEvents';

const expect = require('chai').expect;
const context = {};
const eventBus = EventBus(context).getInstance();

describe('EventController', function () {
    let eventController;

    let manifestUpdaterMock = new ManifestUpdaterMock();
    let playbackControllerMock = new PlaybackControllerMock();

    const manifestExpiredEventStub = {
        'duration': 0,
        'calculatedPresentationTime': 30 * 48000,
        'id': 1819112295,
        'messageData': { },
        'eventStream': {
            'adaptionSet': null,
            'representation': null,
            'period': null,
            'timescale': 48000,
            'value': '1',
            'schemeIdUri': 'urn:mpeg:dash:event:2012'
        },
        'presentationTimeDelta': 0
    };

    beforeEach(function () {
        eventController = EventController(context).getInstance();
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
                calculatedPresentationTime: 0
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
                calculatedPresentationTime: 0
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

        it('should trigger added inline events immediately with mode set to on_receive', function (done) {
            let schemeIdUri = 'inlineEvent';
            let events = [{
                eventStream: {
                    timescale: 1,
                    schemeIdUri: schemeIdUri
                },
                id: 'event0',
                calculatedPresentationTime: 20
            }];

            let onReceiveEvent = function (e) {
                expect(e.event.id).to.equal('event0');
                eventBus.off(schemeIdUri, onReceiveEvent);
            };

            eventBus.on(schemeIdUri, onReceiveEvent, { scope: this, mode: EVENT_MODE_ON_RECEIVE });

            let onStartEvent = function (e) {
                expect(e.event.id).to.equal('event0');
                eventBus.off(schemeIdUri, onStartEvent);
                expect(playbackControllerMock.getTime()).to.equal(20);
                playbackControllerMock.setTime(0);
                done();
            };
            eventBus.on(schemeIdUri, onStartEvent, { scope: this, mode: EVENT_MODE_ON_START });

            eventController.addInlineEvents(events);
            eventController.start();

            playbackControllerMock.setTime(20);
        });

        it('should trigger added inline events immediately with mode set to on_receive', function (done) {
            let schemeIdUri = 'inbandEvent';
            let events = [{
                eventStream: {
                    timescale: 1,
                    schemeIdUri: schemeIdUri
                },
                id: 'event0',
                calculatedPresentationTime: 20
            }];

            let onReceiveEvent = function (e) {
                expect(e.event.id).to.equal('event0');
                eventBus.off(schemeIdUri, onReceiveEvent);
            };

            eventBus.on(schemeIdUri, onReceiveEvent, { scope: this, mode: EVENT_MODE_ON_RECEIVE });

            let onStartEvent = function (e) {
                expect(e.event.id).to.equal('event0');
                eventBus.off(schemeIdUri, onStartEvent);
                expect(playbackControllerMock.getTime()).to.equal(20);
                playbackControllerMock.setTime(0);
                done();
            };
            eventBus.on(schemeIdUri, onStartEvent, { scope: this, mode: EVENT_MODE_ON_START });

            eventController.addInbandEvents(events);
            eventController.start();

            playbackControllerMock.setTime(20);
        });

        it('should respect provided timescale when triggering events', function (done) {
            let schemeIdUri = 'inbandEvent';
            let events = [{
                eventStream: {
                    timescale: 3,
                    schemeIdUri: schemeIdUri
                },
                id: 'event0',
                calculatedPresentationTime: 60
            }];

            let onStartEvent = function (e) {
                expect(e.event.id).to.equal('event0');
                eventBus.off(schemeIdUri, onStartEvent);
                expect(playbackControllerMock.getTime()).to.equal(20);
                playbackControllerMock.setTime(0);
                done();
            };
            eventBus.on(schemeIdUri, onStartEvent, { scope: this, mode: EVENT_MODE_ON_START });

            eventController.addInlineEvents(events);
            eventController.start();

            playbackControllerMock.setTime(20);
        });

        it('should fire MANIFEST_VALIDITY_CHANGED events immediately', function (done) {
            const manifestValidityExpiredHandler = function (event) {
                expect(event.id).to.equal(manifestExpiredEventStub.id);
                expect(event.validUntil).to.equal(manifestExpiredEventStub.calculatedPresentationTime / manifestExpiredEventStub.eventStream.timescale);
                expect(event.newDuration).to.equal((manifestExpiredEventStub.calculatedPresentationTime + manifestExpiredEventStub.duration) / manifestExpiredEventStub.eventStream.timescale);

                eventBus.off(Events.MANIFEST_VALIDITY_CHANGED, manifestValidityExpiredHandler, this);
                done();
            };

            eventBus.on(Events.MANIFEST_VALIDITY_CHANGED, manifestValidityExpiredHandler, this);

            eventController.addInbandEvents([manifestExpiredEventStub]);
        });

        it('should not fire manifest validity expiration events if an event with that ID has already been received', function () {
            let triggerCount = 0;
            const manifestValidityExpiredHandler = function () {
                triggerCount++;
            };

            eventBus.on(Events.MANIFEST_VALIDITY_CHANGED, manifestValidityExpiredHandler, this);

            eventController.addInbandEvents([manifestExpiredEventStub]);
            eventController.addInbandEvents([manifestExpiredEventStub]);

            expect(triggerCount).to.equal(1);

            eventBus.off(Events.MANIFEST_VALIDITY_CHANGED, manifestValidityExpiredHandler, this);
        });
    });
});
