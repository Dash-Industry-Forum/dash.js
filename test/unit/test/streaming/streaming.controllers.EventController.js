import EventController from '../../../../src/streaming/controllers/EventController.js';
import EventBus from '../../../../src/core/EventBus.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';
import PlaybackControllerMock from '../../mocks/PlaybackControllerMock.js';
import ManifestUpdaterMock from '../../mocks/ManifestUpdaterMock.js';
import Settings from '../../../../src/core/Settings.js';
import Events from '../../../../src/core/events/Events.js';
import Constants from '../../../../src/streaming/constants/Constants.js';

import {expect} from 'chai';
const context = {};
const eventBus = EventBus(context).getInstance();

describe('EventController', function () {
    let eventController;

    let manifestUpdaterMock = new ManifestUpdaterMock();
    let playbackControllerMock = new PlaybackControllerMock();
    const settings = Settings(context).getInstance();

    const manifestExpiredEventStub = {
        'duration': 0,
        'calculatedPresentationTime': 30,
        'id': 1819112295,
        'messageData': {},
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
            playbackControllerMock.setTime(0);
            eventController.reset();
            eventController.setConfig({
                manifestUpdater: manifestUpdaterMock,
                playbackController: playbackControllerMock,
                settings
            });
        });

        it('should add a single inband event with a value and trigger it', function (done) {
            const schemeIdUri = 'schemeIdUri';
            const value = 'value';
            const periodId = 'periodId';
            let events = [{
                eventStream: {
                    timescale: 1,
                    schemeIdUri: schemeIdUri,
                    period: {
                        id: periodId
                    }
                },
                id: 'event0',
                value,
                calculatedPresentationTime: 0
            }];

            let onInbandEvent = function (e) {
                try {
                    expect(e.event.id).to.equal('event0');
                    eventBus.off(schemeIdUri, onInbandEvent);
                    done();
                } catch (error) {
                    done(error);
                }
            };

            eventBus.on(schemeIdUri, onInbandEvent, this);

            eventController.addInbandEvents(events, periodId);
            eventController.start();
        });

        it('should add a single inband event without a value and trigger it', function (done) {
            const schemeIdUri = 'schemeIdUri';
            const periodId = 'periodId';
            let events = [{
                eventStream: {
                    timescale: 1,
                    schemeIdUri: schemeIdUri,
                    period: {
                        id: periodId
                    }
                },
                id: 'event0',
                calculatedPresentationTime: 0
            }];

            let onInbandEvent = function (e) {
                try {
                    expect(e.event.id).to.equal('event0');
                    eventBus.off(schemeIdUri, onInbandEvent);
                    done();
                } catch (error) {
                    done(error);
                }
            };

            eventBus.on(schemeIdUri, onInbandEvent, this);

            eventController.addInbandEvents(events, periodId);
            eventController.start();
        });

        it('should add a two inband events with different values and same id and trigger them', function (done) {
            const schemeIdUri = 'schemeIdUri';
            const periodId = 'periodId';
            let events = [
                {
                    eventStream: {
                        timescale: 1,
                        schemeIdUri: schemeIdUri,
                        value: 'value1',
                        period: {
                            id: periodId
                        }
                    },
                    id: 'event0',
                    calculatedPresentationTime: 0
                },
                {
                    eventStream: {
                        timescale: 1,
                        schemeIdUri: schemeIdUri,
                        value: 'value2',
                        period: {
                            id: periodId
                        }
                    },
                    id: 'event0',
                    calculatedPresentationTime: 0
                }];
            let eventCounter = 0;

            let onInbandEvent = function (e) {
                try {
                    eventCounter += 1;
                    expect(e.event.id).to.equal('event0');
                    if (eventCounter === 2) {
                        eventBus.off(schemeIdUri, onInbandEvent);
                        done();
                    }
                } catch (error) {
                    done(error);
                }
            };

            eventBus.on(schemeIdUri, onInbandEvent, this);

            eventController.addInbandEvents(events, periodId);
            eventController.start();
        });

        it('should add a two inband events with different ids and same values and trigger them', function (done) {
            const schemeIdUri = 'schemeIdUri';
            const periodId = 'periodId';
            let events = [
                {
                    eventStream: {
                        timescale: 1,
                        schemeIdUri: schemeIdUri,
                        value: 'value1',
                        period: {
                            id: periodId
                        }
                    },
                    id: 'event0',
                    calculatedPresentationTime: 0
                },
                {
                    eventStream: {
                        timescale: 1,
                        schemeIdUri: schemeIdUri,
                        value: 'value1',
                        period: {
                            id: periodId
                        }
                    },
                    id: 'event1',
                    calculatedPresentationTime: 0
                }];
            let eventCounter = 0;

            let onInbandEvent = function (e) {
                try {
                    eventCounter += 1;
                    expect(e.event.eventStream.value).to.equal('value1');
                    if (eventCounter === 2) {
                        eventBus.off(schemeIdUri, onInbandEvent);
                        done();
                    }
                } catch (error) {
                    done(error);
                }
            };

            eventBus.on(schemeIdUri, onInbandEvent, this);

            eventController.addInbandEvents(events, periodId);
            eventController.start();
        });

        it('should add a two inband events with different scheme ids and same id and value fields and trigger them', function (done) {
            const periodId = 'periodId';
            let events = [
                {
                    eventStream: {
                        timescale: 1,
                        schemeIdUri: 'inbandEvent1',
                        value: 'value1',
                        period: {
                            id: periodId
                        }
                    },
                    id: 'event0',
                    calculatedPresentationTime: 0
                },
                {
                    eventStream: {
                        timescale: 1,
                        schemeIdUri: 'inbandEvent2',
                        value: 'value1',
                        period: {
                            id: periodId
                        }
                    },
                    id: 'event0',
                    calculatedPresentationTime: 0
                }];
            let eventCounter = 0;

            let onInbandEvent = function (e) {
                try {
                    eventCounter += 1;
                    expect(e.event.id).to.equal('event0');
                    if (eventCounter === 2) {
                        eventBus.off('inbandEvent1', onInbandEvent, this);
                        eventBus.off('inbandEvent2', onInbandEvent, this);
                        done();
                    }
                } catch (error) {
                    done(error);
                }
            };

            eventBus.on('inbandEvent1', onInbandEvent, this);
            eventBus.on('inbandEvent2', onInbandEvent, this);

            eventController.addInbandEvents(events, periodId);
            eventController.start();
        });

        it('should add only one out of two similar events and trigger it', function (done) {
            const schemeIdUri = 'schemeIdUri';
            const periodId = 'periodId';
            let events = [
                {
                    eventStream: {
                        timescale: 1,
                        schemeIdUri: schemeIdUri,
                        value: 'value1',
                        period: {
                            id: periodId
                        }
                    },
                    id: 'event0',
                    messageData: '1',
                    calculatedPresentationTime: 0
                },
                {
                    eventStream: {
                        timescale: 1,
                        schemeIdUri: schemeIdUri,
                        value: 'value1',
                        period: {
                            id: periodId
                        }
                    },
                    id: 'event0',
                    messageData: '2',
                    calculatedPresentationTime: 0
                }];

            let onInbandEvent = function (e) {
                try {
                    expect(e.event.id).to.equal('event0');
                    expect(e.event.messageData).to.equal('1');
                    eventBus.off(schemeIdUri, onInbandEvent);
                    done();
                } catch (error) {
                    done(error);
                }
            };

            eventBus.on(schemeIdUri, onInbandEvent, this);

            eventController.addInbandEvents(events, periodId);
            eventController.start();
        });

        it('should trigger added inline events', function (done) {
            const schemeIdUri = 'schemeIdUri';
            const value = 'value';
            const periodId = 'periodId';
            let events = [{
                eventStream: {
                    timescale: 1,
                    schemeIdUri: schemeIdUri,
                    period: {
                        id: periodId
                    }
                },
                id: 'event0',
                value,
                calculatedPresentationTime: 0
            }];

            let onInlineEvent = function (e) {
                try {
                    expect(e.event.id).to.equal('event0');
                    eventBus.off(schemeIdUri, onInlineEvent);
                    done();
                } catch (error) {
                    done(error);
                }
            };

            eventBus.on(schemeIdUri, onInlineEvent, this);

            eventController.addInlineEvents(events, periodId);
            eventController.start();
        });

        it('should add inline event twice, updating first event', function (done) {
            const schemeIdUri = 'schemeIdUri';
            const value = 'value';
            const periodId = 'periodId';
            let events = [
                {
                    eventStream: {
                        timescale: 1,
                        schemeIdUri: schemeIdUri,
                        period: {
                            id: periodId
                        }
                    },
                    id: 'event0',
                    value,
                    messageData: '1',
                    calculatedPresentationTime: 0
                },
                {
                    eventStream: {
                        timescale: 1,
                        schemeIdUri: schemeIdUri,
                        period: {
                            id: periodId
                        }
                    },
                    id: 'event0',
                    value,
                    messageData: '2',
                    calculatedPresentationTime: 0
                }];

            let onInlineEvent = function (e) {
                try {
                    expect(e.event.id).to.equal('event0');
                    expect(e.event.messageData).to.equal('2');
                    eventBus.off(schemeIdUri, onInlineEvent);
                    done();
                } catch (error) {
                    done(error);
                }
            };

            eventBus.on(schemeIdUri, onInlineEvent, this);

            eventController.addInlineEvents(events, periodId);
            eventController.start();
        });

        it('should trigger added inline events', function (done) {
            const schemeIdUri = 'schemeIdUri';
            const periodId = 'periodId';
            let events = [{
                eventStream: {
                    timescale: 1,
                    schemeIdUri: schemeIdUri,
                    period: {
                        id: periodId
                    }
                },
                id: 'event0',
                calculatedPresentationTime: 20
            }];

            let onReceiveEvent = function (e) {
                expect(e.event.id).to.equal('event0');
                eventBus.off(schemeIdUri, onReceiveEvent);
            };

            eventBus.on(schemeIdUri, onReceiveEvent, this, { mode: MediaPlayerEvents.EVENT_MODE_ON_RECEIVE });

            let onStartEvent = function (e) {
                try {
                    expect(e.event.id).to.equal('event0');
                    eventBus.off(schemeIdUri, onStartEvent);
                    expect(playbackControllerMock.getTime()).to.equal(20);
                    playbackControllerMock.setTime(0);
                    done();
                } catch (error) {
                    done(error);
                }
            };
            eventBus.on(schemeIdUri, onStartEvent, this, { mode: MediaPlayerEvents.EVENT_MODE_ON_START });

            eventController.addInbandEvents(events, periodId);
            eventController.start();

            playbackControllerMock.setTime(20);
        });

        it('should trigger an inline event that has already been started and is still running', function (done) {
            const schemeIdUri = 'schemeIdUri';
            const periodId = 'periodId';
            let events = [{
                eventStream: {
                    timescale: 3,
                    schemeIdUri: schemeIdUri,
                    period: {
                        id: periodId
                    }
                },
                id: 'event0',
                calculatedPresentationTime: 10,
                duration: 20
            }];

            let onStartEvent = function (e) {
                try {
                    expect(e.event.id).to.equal('event0');
                    eventBus.off(schemeIdUri, onStartEvent);
                    expect(playbackControllerMock.getTime()).to.equal(20);
                    playbackControllerMock.setTime(0);
                    done();
                } catch (error) {
                    done(error);
                }
            };
            eventBus.on(schemeIdUri, onStartEvent, this, { mode: MediaPlayerEvents.EVENT_MODE_ON_START });

            eventController.addInlineEvents(events, periodId);
            eventController.start();

            playbackControllerMock.setTime(20);
        });

        it('should not trigger an inline event for which the start + duration has already expired', function () {
            let triggerCount = 0;
            const schemeIdUri = 'schemeIdUri';
            const periodId = 'periodId';
            let events = [{
                eventStream: {
                    timescale: 3,
                    schemeIdUri: schemeIdUri,
                    period: {
                        id: periodId
                    }
                },
                id: 'event0',
                calculatedPresentationTime: 10,
                duration: 5
            }];
            const onStartEvent = function () {
                triggerCount++;
            };

            eventBus.on(schemeIdUri, onStartEvent, this, { mode: MediaPlayerEvents.EVENT_MODE_ON_START });

            eventController.addInlineEvents(events, periodId);
            eventController.start();

            playbackControllerMock.setTime(20);

            expect(triggerCount).to.equal(0);
            eventBus.off(schemeIdUri, onStartEvent, this);
            playbackControllerMock.setTime(0);
        });

        it('should not fire inline events in onReceive mode twice', function () {
            let triggerCount = 0;
            const schemeIdUri = 'schemeIdUri';
            const periodId = 'periodId';
            let events = [{
                eventStream: {
                    timescale: 3,
                    schemeIdUri: schemeIdUri,
                    period: {
                        id: periodId
                    }
                },
                id: 'event0',
                calculatedPresentationTime: 10,
                duration: 5
            }];
            const onReceiveEvent = function () {
                triggerCount++;
            };

            eventBus.on(schemeIdUri, onReceiveEvent, this, { mode: MediaPlayerEvents.EVENT_MODE_ON_RECEIVE });

            eventController.addInlineEvents(events, periodId);
            eventController.addInlineEvents(events, periodId);


            expect(triggerCount).to.equal(1);
            eventBus.off(schemeIdUri, onReceiveEvent, this);
        });

        it('should fire MANIFEST_VALIDITY_CHANGED events immediately', function (done) {
            const manifestValidityExpiredHandler = function (event) {
                expect(event.id).to.equal(manifestExpiredEventStub.id);
                expect(event.validUntil).to.equal(manifestExpiredEventStub.calculatedPresentationTime);
                expect(event.newDuration).to.equal((manifestExpiredEventStub.calculatedPresentationTime + manifestExpiredEventStub.duration));

                eventBus.off(MediaPlayerEvents.MANIFEST_VALIDITY_CHANGED, manifestValidityExpiredHandler, this);
                done();
            };

            eventBus.on(MediaPlayerEvents.MANIFEST_VALIDITY_CHANGED, manifestValidityExpiredHandler, this);

            eventController.addInbandEvents([manifestExpiredEventStub], 'periodId');
        });

        it('should not fire manifest validity expiration events if an event with that ID has already been received', function () {
            let triggerCount = 0;
            const manifestValidityExpiredHandler = function () {
                triggerCount++;
            };

            eventBus.on(MediaPlayerEvents.MANIFEST_VALIDITY_CHANGED, manifestValidityExpiredHandler, this);

            eventController.addInbandEvents([manifestExpiredEventStub], 'periodId');
            eventController.addInbandEvents([manifestExpiredEventStub], 'periodId');

            expect(triggerCount).to.equal(1);

            eventBus.off(MediaPlayerEvents.MANIFEST_VALIDITY_CHANGED, manifestValidityExpiredHandler, this);
        });

        describe('noJump event handling', function () {
            it('should trigger noJump=1 (first event) when skipping ahead', function (done) {
                const schemeIdUri = Constants.ALTERNATIVE_MPD.URIS.REPLACE;
                const periodId = 'periodId';
                let events = [
                    {
                        eventStream: {
                            timescale: 1,
                            schemeIdUri: schemeIdUri,
                            period: {
                                id: periodId
                            }
                        },
                        id: 'event1',
                        alternativeMpd: {
                            noJump: 1
                        },
                        calculatedPresentationTime: 10
                    },
                    {
                        eventStream: {
                            timescale: 1,
                            schemeIdUri: schemeIdUri,
                            period: {
                                id: periodId
                            }
                        },
                        id: 'event2',
                        alternativeMpd: {
                            noJump: 1
                        },
                        calculatedPresentationTime: 15
                    }
                ];

                let triggerCount = 0;
                let triggeredEventIds = [];
                let onStartEvent = function (e) {
                    triggerCount++;
                    triggeredEventIds.push(e.event.id);
                    expect(triggerCount).to.equal(1);
                    expect(triggeredEventIds[0]).to.equal('event1');
                    eventBus.off(schemeIdUri, onStartEvent);
                    done();

                };
                eventBus.on(schemeIdUri, onStartEvent, this, { mode: MediaPlayerEvents.EVENT_MODE_ON_START });
                eventController.addInlineEvents(events, periodId);
                eventController.start();
                playbackControllerMock.setTime(20);
            });

            it('should trigger noJump=2 (last event) when skipping ahead', function (done) {
                const schemeIdUri = Constants.ALTERNATIVE_MPD.URIS.REPLACE;
                const periodId = 'periodId';
                let events = [
                    {
                        eventStream: {
                            timescale: 1,
                            schemeIdUri: schemeIdUri,
                            period: {
                                id: periodId
                            }
                        },
                        id: 'event1',
                        alternativeMpd: {
                            noJump: 2
                        },
                        calculatedPresentationTime: 10
                    },
                    {
                        eventStream: {
                            timescale: 1,
                            schemeIdUri: schemeIdUri,
                            period: {
                                id: periodId
                            }
                        },
                        id: 'event2',
                        alternativeMpd: {
                            noJump: 2
                        },
                        calculatedPresentationTime: 15
                    }
                ];

                let triggerCount = 0;
                let triggeredEventIds = [];
                let onStartEvent = function (e) {
                    triggerCount++;
                    triggeredEventIds.push(e.event.id);
                    expect(triggerCount).to.equal(1);
                    expect(triggeredEventIds[0]).to.equal('event2');
                    eventBus.off(schemeIdUri, onStartEvent);
                    done();
                };

                eventBus.on(schemeIdUri, onStartEvent, this, { mode: MediaPlayerEvents.EVENT_MODE_ON_START });
                eventController.addInlineEvents(events, periodId);
                eventController.start();
                playbackControllerMock.setTime(20);
            });

            it('should not trigger noJump events if already triggered', function () {
                const schemeIdUri = Constants.ALTERNATIVE_MPD.URIS.REPLACE;
                const periodId = 'periodId';
                let events = [{
                    eventStream: {
                        timescale: 1,
                        schemeIdUri: schemeIdUri,
                        period: {
                            id: periodId
                        }
                    },
                    id: 'event1',
                    alternativeMpd: {
                        noJump: 1
                    },
                    calculatedPresentationTime: 10,
                    triggeredNoJumpEvent: true
                }];

                let triggerCount = 0;
                let onStartEvent = function () {
                    triggerCount++;
                };

                eventBus.on(schemeIdUri, onStartEvent, this, { mode: MediaPlayerEvents.EVENT_MODE_ON_START });
                eventController.addInlineEvents(events, periodId);
                eventController.start();
                playbackControllerMock.setTime(20);
                
                expect(triggerCount).to.equal(0);
                eventBus.off(schemeIdUri, onStartEvent);
            });

            it('should not trigger noJump events if current time is before presentation time', function () {
                const schemeIdUri = Constants.ALTERNATIVE_MPD.URIS.REPLACE;
                const periodId = 'periodId';
                let events = [{
                    eventStream: {
                        timescale: 1,
                        schemeIdUri: schemeIdUri,
                        period: {
                            id: periodId
                        }
                    },
                    id: 'event1',
                    alternativeMpd: {
                        noJump: 1
                    },
                    calculatedPresentationTime: 10
                }];

                let triggerCount = 0;
                let onStartEvent = function () {
                    triggerCount++;
                };

                eventBus.on(schemeIdUri, onStartEvent, this, { mode: MediaPlayerEvents.EVENT_MODE_ON_START });
                eventController.addInlineEvents(events, periodId);
                eventController.start();
                playbackControllerMock.setTime(5);
                
                expect(triggerCount).to.equal(0);
                eventBus.off(schemeIdUri, onStartEvent);
            });
        });

        describe('earliestResolutionTimeOffset handling', function () {
            it('should trigger EVENT_READY_TO_RESOLVE when resolution time is reached', function (done) {
                const schemeIdUri = 'resolutionTestScheme';
                const periodId = 'periodId';
                let events = [{
                    eventStream: {
                        timescale: 1,
                        schemeIdUri: schemeIdUri,
                        period: {
                            id: periodId
                        }
                    },
                    id: 'event0',
                    calculatedPresentationTime: 20,
                    earliestResolutionTimeOffset: 10
                }];

                let onEventReadyToResolve = function (e) {
                    expect(e.schemeIdUri).to.equal(schemeIdUri);
                    expect(e.eventId).to.equal('event0');
                    expect(e.event).to.be.an('object');
                    eventBus.off(Events.EVENT_READY_TO_RESOLVE, onEventReadyToResolve);
                    done();
                };

                eventBus.on(Events.EVENT_READY_TO_RESOLVE, onEventReadyToResolve, this);
                eventController.addInlineEvents(events, periodId);
                eventController.start();
                playbackControllerMock.setTime(10);
            });

            it('should not trigger EVENT_READY_TO_RESOLVE before resolution time', function () {
                const schemeIdUri = 'resolutionTestScheme';
                const periodId = 'periodId';
                let events = [{
                    eventStream: {
                        timescale: 1,
                        schemeIdUri: schemeIdUri,
                        period: {
                            id: periodId
                        }
                    },
                    id: 'event0',
                    calculatedPresentationTime: 20,
                    earliestResolutionTimeOffset: 10
                }];

                let triggerCount = 0;
                let onEventReadyToResolve = function () {
                    triggerCount++;
                };

                eventBus.on(Events.EVENT_READY_TO_RESOLVE, onEventReadyToResolve, this);
                eventController.addInlineEvents(events, periodId);
                eventController.start();
                playbackControllerMock.setTime(5);
                
                expect(triggerCount).to.equal(0);
                eventBus.off(Events.EVENT_READY_TO_RESOLVE, onEventReadyToResolve);
            });
        });
    });
});
