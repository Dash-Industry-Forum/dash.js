import MediaManagerMock from '../../mocks/MediaManagerMock.js';
import PlaybackControllerMock from '../../mocks/PlaybackControllerMock.js';
import VideoModelMock from '../../mocks/VideoModelMock.js';
import DebugMock from '../../mocks/DebugMock.js';
import AlternativeMediaController from '../../../../src/streaming/controllers/AlternativeMediaController.js';
import EventBus from '../../../../src/core/EventBus.js';
import Events from '../../../../src/core/events/Events.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';
import Constants from '../../../../src/streaming/constants/Constants.js';
import DashConstants from '../../../../src/dash/constants/DashConstants.js';

import sinon from 'sinon';
import { expect } from 'chai';

describe('AlternativeMediaController', function () {
    const EVENT_WAIT_TIMEOUT = 1000;
    let eventBus;
    let alternativeMediaController;
    let mediaManagerMock;
    let playbackControllerMock;
    let videoModelMock;
    let debugMock;

    function waitForEvent(eventName, eventBus, timeout = EVENT_WAIT_TIMEOUT) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                eventBus.off(eventName, eventHandler);
                reject(new Error(`Event ${eventName} was not triggered within ${timeout}ms`));
            }, timeout);

            const eventHandler = (eventData) => {
                clearTimeout(timeoutId);
                eventBus.off(eventName, eventHandler);
                resolve(eventData);
            };

            eventBus.on(eventName, eventHandler);
        });
    }

    beforeEach(function () {
        // Create a new context for each test to avoid singleton issues
        const testContext = {};
        eventBus = EventBus(testContext).getInstance();
        mediaManagerMock = new MediaManagerMock();
        playbackControllerMock = new PlaybackControllerMock();
        videoModelMock = new VideoModelMock();
        debugMock = new DebugMock();

        alternativeMediaController = AlternativeMediaController(testContext).getInstance();

        alternativeMediaController.setConfig({
            playbackController: playbackControllerMock,
            videoModel: videoModelMock,
            mediaManager: mediaManagerMock,
            debug: debugMock
        });
        alternativeMediaController.initialize();

        eventBus.trigger(MediaPlayerEvents.MANIFEST_LOADED, {
            data: { type: DashConstants.STATIC, originalUrl: 'http://example.com/manifest.mpd' }
        });
    });

    afterEach(function () {
        alternativeMediaController.reset();
        mediaManagerMock.reset();
        eventBus.reset();
    });

    describe('Configuration and Initialization', function () {
        it('should set config properly', function () {
            const config = {
                playbackController: playbackControllerMock,
                videoModel: videoModelMock,
                mediaManager: mediaManagerMock,
                debug: debugMock
            };

            // Should not throw error
            expect(() => alternativeMediaController.setConfig(config)).to.not.throw();
        });

        it('should handle null config', function () {
            expect(() => alternativeMediaController.setConfig(null)).to.not.throw();
            expect(() => alternativeMediaController.setConfig(undefined)).to.not.throw();
        });

        it('should initialize properly', function () {
            alternativeMediaController.setConfig({
                playbackController: playbackControllerMock,
                videoModel: videoModelMock,
                mediaManager: mediaManagerMock,
                debug: debugMock
            });

            expect(() => alternativeMediaController.initialize()).to.not.throw();
        });
    });

    describe('Alternative MPD Event Triggering', function () {
        it('should handle REPLACE mode alternative event', function (done) {
            const mockEvent = {
                event: {
                    presentationTime: 10000,
                    duration: 5000,
                    id: 'test-event-replace',
                    eventStream: {
                        schemeIdUri: Constants.ALTERNATIVE_MPD.URIS.REPLACE,
                        timescale: 1000
                    },
                    alternativeMpd: {
                        mode: Constants.ALTERNATIVE_MPD.MODES.REPLACE,
                        url: 'http://example.com/alternative.mpd',
                        maxDuration: 30000,
                        returnOffset: 5000,
                        clip: true,
                        startWithOffset: true
                    }
                }
            };

            playbackControllerMock.getTime = sinon.stub().returns(12);

            waitForEvent(Constants.ALTERNATIVE_MPD.CONTENT_START, eventBus)
                .then((eventData) => {
                    expect(eventData).to.exist;
                    done();
                })
                .catch((error) => {
                    done(error);
                });

            eventBus.trigger(Constants.ALTERNATIVE_MPD.URIS.REPLACE, mockEvent);
        });

        it('should handle INSERT mode alternative event', function (done) {
            const mockEvent = {
                event: {
                    presentationTime: 10000,
                    duration: 5000,
                    id: 'test-event-2',
                    eventStream: {
                        schemeIdUri: Constants.ALTERNATIVE_MPD.URIS.INSERT,
                        timescale: 1000
                    },
                    alternativeMpd: {
                        mode: Constants.ALTERNATIVE_MPD.MODES.INSERT,
                        url: 'http://example.com/alternative-insert.mpd',
                        maxDuration: 20000
                    }
                }
            };

            waitForEvent(Constants.ALTERNATIVE_MPD.CONTENT_START, eventBus)
                .then((eventData) => {
                    expect(eventData).to.exist;
                    done();
                })
                .catch((error) => {
                    done(error);
                });

            eventBus.trigger(Constants.ALTERNATIVE_MPD.URIS.INSERT, mockEvent);
        });

        it('should reject INSERT mode for dynamic manifests', function () {
            eventBus.trigger(MediaPlayerEvents.MANIFEST_LOADED, {
                data: { type: DashConstants.DYNAMIC, originalUrl: 'http://example.com/manifest.mpd' }
            });

            const mockEvent = {
                event: {
                    presentationTime: 10000,
                    duration: 5000,
                    id: 'test-event-3',
                    eventStream: {
                        schemeIdUri: Constants.ALTERNATIVE_MPD.URIS.INSERT,
                        timescale: 1000
                    },
                    alternativeMpd: {
                        mode: Constants.ALTERNATIVE_MPD.MODES.INSERT,
                        url: 'http://example.com/alternative.mpd'
                    }
                }
            };

            eventBus.trigger(Constants.ALTERNATIVE_MPD.URIS.INSERT, mockEvent);

            expect(debugMock.log.warn).to.equal('Insert mode not supported for dynamic manifests - ignoring event');
        });

        it('should handle anchor parsing from URL', function (done) {
            const mockEvent = {
                event: {
                    presentationTime: 10000,
                    duration: 5000,
                    id: 'test-event-5',
                    eventStream: {
                        schemeIdUri: Constants.ALTERNATIVE_MPD.URIS.REPLACE,
                        timescale: 1000
                    },
                    alternativeMpd: {
                        mode: Constants.ALTERNATIVE_MPD.MODES.REPLACE,
                        url: 'http://example.com/alternative.mpd#t=5',
                        maxDuration: 30000
                    }
                }
            };

            playbackControllerMock.getTime = sinon.stub().returns(10);

            waitForEvent(Constants.ALTERNATIVE_MPD.CONTENT_START, eventBus)
                .then((eventData) => {
                    expect(eventData).to.exist;
                    done();
                })
                .catch((error) => {
                    done(error);
                });

            eventBus.trigger(Constants.ALTERNATIVE_MPD.URIS.REPLACE, mockEvent);
        });
    });

    describe('Event Ready to Resolve Handling', function () {
        it('should handle event ready to resolve for REPLACE events', function () {
            const mockEventData = {
                schemeIdUri: Constants.ALTERNATIVE_MPD.URIS.REPLACE,
                eventId: 'prebuffer-event-1',
                event: {
                    presentationTime: 15000,
                    duration: 5000,
                    id: 'prebuffer-event-1',
                    eventStream: {
                        schemeIdUri: Constants.ALTERNATIVE_MPD.URIS.REPLACE,
                        timescale: 1000
                    },
                    alternativeMpd: {
                        mode: Constants.ALTERNATIVE_MPD.MODES.REPLACE,
                        url: 'http://example.com/prebuffer.mpd',
                        maxDuration: 25000
                    }
                }
            };

            eventBus.trigger(Events.EVENT_READY_TO_RESOLVE, mockEventData);

            expect(debugMock.log.info).to.equal('Event prebuffer-event-1 is ready for prebuffering');
        });

        it('should handle event ready to resolve for INSERT events', function () {
            const mockEventData = {
                schemeIdUri: Constants.ALTERNATIVE_MPD.URIS.INSERT,
                eventId: 'prebuffer-event-2',
                event: {
                    presentationTime: 20000,
                    duration: 3000,
                    id: 'prebuffer-event-2',
                    eventStream: {
                        schemeIdUri: Constants.ALTERNATIVE_MPD.URIS.INSERT,
                        timescale: 1000
                    },
                    alternativeMpd: {
                        mode: Constants.ALTERNATIVE_MPD.MODES.INSERT,
                        url: 'http://example.com/insert-prebuffer.mpd'
                    }
                }
            };

            eventBus.trigger(Events.EVENT_READY_TO_RESOLVE, mockEventData);

            expect(debugMock.log.info).to.equal('Event prebuffer-event-2 is ready for prebuffering');
        });
    });

    describe('should handle the switch back to main content logic', function () {
        it('should switch back when alternative content duration is reached', function (done) {
            const mockEvent = {
                event: {
                    presentationTime: 10000,
                    duration: 5000,
                    id: 'test-event-switch-back',
                    eventStream: {
                        schemeIdUri: Constants.ALTERNATIVE_MPD.URIS.REPLACE,
                        timescale: 1000
                    },
                    alternativeMpd: {
                        mode: Constants.ALTERNATIVE_MPD.MODES.REPLACE,
                        url: 'http://example.com/alternative.mpd',
                        maxDuration: 30000,
                        returnOffset: 5000,
                        clip: true,
                        startWithOffset: true
                    }
                }
            };

            playbackControllerMock.getTime = sinon.stub().returns(12);

            waitForEvent(Constants.ALTERNATIVE_MPD.CONTENT_START, eventBus)
                .then((eventData) => {
                    const altPlayer = eventData.player || mediaManagerMock.getAlternativePlayer();
                    if (altPlayer) {
                        altPlayer.triggerTimeUpdate(30);
                    } else {
                        done(new Error('Alternative player not available'));
                    }
                })
                .catch((error) => {
                    done(error);
                });

            waitForEvent(Constants.ALTERNATIVE_MPD.CONTENT_END, eventBus, 1000)
                .then((eventData) => {
                    expect(eventData).to.exist;
                    expect(eventData.event).to.exist;
                    expect(mediaManagerMock.switchBackToMainContent.calledOnce).to.be.true;
                    done();
                })
                .catch((error) => {
                    done(error);
                });

            eventBus.trigger(Constants.ALTERNATIVE_MPD.URIS.REPLACE, mockEvent);
        });
    });
});