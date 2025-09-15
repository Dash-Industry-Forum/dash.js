import MediaManagerMock from '../../../mocks/MediaManagerMock.js';
import PlaybackControllerMock from '../../../mocks/PlaybackControllerMock.js';
import VideoModelMock from '../../../mocks/VideoModelMock.js';
import AlternativeMediaController from '../../../../../src/streaming/controllers/AlternativeMediaController.js';
import EventBus from '../../../../../src/core/EventBus.js';
import Events from '../../../../../src/core/events/Events.js';
import MediaPlayerEvents from '../../../../../src/streaming/MediaPlayerEvents.js';
import Constants from '../../../../../src/streaming/constants/Constants.js';
import DashConstants from '../../../../../src/dash/constants/DashConstants.js';

import sinon from 'sinon';
import { expect } from 'chai';

describe('AlternativeMediaController', function () {

    const context = {};
    const EVENT_WAIT_TIMEOUT = 1000;
    let eventBus;
    let alternativeMediaController;
    let mediaManagerMock;
    let playbackControllerMock;
    let videoModelMock;

    /**
     * Helper function to wait for a specific event on the event bus
     * @param {string} eventName - The name of the event to wait for
     * @param {Object} eventBus - The event bus instance
     * @param {number} timeout - Timeout in milliseconds (default: EVENT_WAIT_TIMEOUT)
     * @returns {Promise} Promise that resolves when event is triggered or rejects on timeout
     */
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
        eventBus = EventBus(context).getInstance();
        mediaManagerMock = new MediaManagerMock();
        playbackControllerMock = new PlaybackControllerMock();
        videoModelMock = new VideoModelMock();
        
        alternativeMediaController = AlternativeMediaController(context).getInstance();
    });

    afterEach(function () {
        alternativeMediaController.reset();
        mediaManagerMock.reset();
        eventBus.off();
    });

    describe('Configuration and Initialization', function () {
        it('should set config properly', function () {
            const config = {
                playbackController: playbackControllerMock,
                videoModel: videoModelMock,
                mediaManager: mediaManagerMock,
                logger: console
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
                mediaManager: mediaManagerMock
            });
            
            expect(() => alternativeMediaController.initialize()).to.not.throw();
        });
    });

    describe('Alternative MPD Event Triggering', function () {
        beforeEach(function () {
            alternativeMediaController.reset();
            alternativeMediaController.setConfig({
                playbackController: playbackControllerMock,
                videoModel: videoModelMock,
                mediaManager: mediaManagerMock
            });
            alternativeMediaController.initialize();
            
            // Mock manifest info as static
            eventBus.trigger(MediaPlayerEvents.MANIFEST_LOADED, { 
                data: { type: DashConstants.STATIC, originalUrl: 'http://example.com/manifest.mpd' } 
            });
        });

        it('should handle REPLACE mode alternative event', function (done) {
            const mockEvent = {
                event: {
                    presentationTime: 10000, // 10 seconds in timescale
                    duration: 5000,
                    id: 'test-event-1',
                    eventStream: {
                        schemeIdUri: Constants.ALTERNATIVE_MPD.URIS.REPLACE,
                        timescale: 1000
                    },
                    alternativeMpd: {
                        mode: Constants.ALTERNATIVE_MPD.MODES.REPLACE,
                        url: 'http://example.com/alternative.mpd',
                        maxDuration: 30000, // 30 seconds in timescale
                        returnOffset: 5000, // 5 seconds in timescale
                        clip: true,
                        startWithOffset: true
                    }
                }
            };

            // Mock playback controller methods
            playbackControllerMock.getTime = sinon.stub().returns(8); // Current time 8 seconds

            waitForEvent(Constants.ALTERNATIVE_MPD.CONTENT_START, eventBus)
                .then((eventData) => {
                    expect(eventData).to.exist;
                    done();
                })
                .catch((error) => {
                    done(error);
                });

            // Trigger the alternative event which should cause CONTENT_START to be emitted
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

            // Trigger the alternative event which should cause CONTENT_START to be emitted
            eventBus.trigger(Constants.ALTERNATIVE_MPD.URIS.INSERT, mockEvent);
        });

        it('should reject INSERT mode for dynamic manifests', function () {
            // Change manifest to dynamic
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

            const consoleSpy = sinon.spy(console, 'warn');
            
            eventBus.trigger(Constants.ALTERNATIVE_MPD.URIS.INSERT, mockEvent);
            
            expect(consoleSpy.calledWith('Insert mode not supported for dynamic manifests - ignoring event')).to.be.true;
            consoleSpy.restore();
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

            // Trigger the alternative event which should cause CONTENT_START to be emitted
            eventBus.trigger(Constants.ALTERNATIVE_MPD.URIS.REPLACE, mockEvent);
        });
    });

    describe('Event Ready to Resolve Handling', function () {
        
        beforeEach(function () {
            alternativeMediaController.setConfig({
                playbackController: playbackControllerMock,
                videoModel: videoModelMock,
                mediaManager: mediaManagerMock
            });
            alternativeMediaController.initialize();
        });

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

            const consoleSpy = sinon.spy(console, 'info');
            
            eventBus.trigger(Events.EVENT_READY_TO_RESOLVE, mockEventData);
            
            expect(consoleSpy.calledWith('Event prebuffer-event-1 is ready for prebuffering')).to.be.true;
            consoleSpy.restore();
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

            const consoleSpy = sinon.spy(console, 'info');

            eventBus.trigger(Events.EVENT_READY_TO_RESOLVE, mockEventData);

            expect(consoleSpy.calledWith('Event prebuffer-event-2 is ready for prebuffering')).to.be.true;
            consoleSpy.restore();
        });
    });
});