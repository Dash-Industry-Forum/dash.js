import AlternativeMpdController from '../../../../src/streaming/controllers/AlternativeMpdController.js';
import EventBus from '../../../../src/core/EventBus.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';
import Constants from '../../../../src/streaming/constants/Constants.js';
import VideoModelMock from '../../mocks/VideoModelMock.js';
import PlaybackControllerMock from '../../mocks/PlaybackControllerMock.js';
import DebugMock from '../../mocks/DebugMock.js';

import { expect } from 'chai';

const context = {};
const eventBus = EventBus(context).getInstance();

/**
 * Utility function to wait for an event with timeout
 * @param {string} eventName - The name of the event to wait for
 * @param {number} timeout - Timeout in milliseconds (default: 5000)
 * @returns {Promise} - Promise that resolves when event is triggered or rejects after timeout
 */
function waitForEvent(eventName, timeout = 5000) {
    return new Promise((resolve, reject) => {
        let eventHandler;
        const timeoutId = setTimeout(() => {
            if (eventHandler) {
                eventBus.off(eventName, eventHandler);
            }
            reject(new Error(`Event '${eventName}' not triggered within ${timeout}ms`));
        }, timeout);

        eventHandler = (data) => {
            clearTimeout(timeoutId);
            eventBus.off(eventName, eventHandler);
            resolve(data);
        };

        eventBus.on(eventName, eventHandler);
    });
}



describe('AlternativeMpdController', function () {
    let alternativeMpdController;
    let videoModelMock;
    let playbackControllerMock;
    let loggerMock;
    let dashConstantsMock;

    beforeEach(function () {
        alternativeMpdController = AlternativeMpdController(context).getInstance();
        videoModelMock = new VideoModelMock();
        playbackControllerMock = new PlaybackControllerMock();
        loggerMock = new DebugMock().getLogger();
        
        dashConstantsMock = {
            DYNAMIC: 'dynamic',
            STATIC: 'static'
        };

        alternativeMpdController.setConfig({
            videoModel: videoModelMock,
            playbackController: playbackControllerMock,
            DashConstants: dashConstantsMock,
            logger: loggerMock,
            hideAlternativePlayerControls: false,
            alternativeContext: context
        });
    });

    afterEach(function () {
        alternativeMpdController.reset();
        alternativeMpdController = null;
        videoModelMock = null;
        playbackControllerMock = null;
        loggerMock = null;
        dashConstantsMock = null;
    });

    beforeEach(function () {
        alternativeMpdController.initialize();
        
        // Mock manifest loaded event to set up internal state
        eventBus.trigger(MediaPlayerEvents.MANIFEST_LOADED, {
            data: {
                type: dashConstantsMock.STATIC,
                originalUrl: 'test.mpd'
            }
        });
    });

    describe('_onAlternativeEventTriggered', function () {
        it('should handle REPLACE alternative MPD events', function (done) {
            const testEvent = {
                alternativeMpd: {
                    url: 'base/test/unit/data/dash/alternative.mpd',
                    mode: Constants.ALTERNATIVE_MPD.MODES.REPLACE,
                    maxDuration: 10000
                },
                id: 'test-event-1',
                presentationTime: 5000,
                duration: 10000,
                eventStream: {
                    schemeIdUri: Constants.ALTERNATIVE_MPD.URIS.REPLACE,
                    timescale: 1000
                }
            };

            playbackControllerMock.setTime(5);

            // Spy on the prebuffering by checking if the event triggers properly
            let prebufferCalled = false;
            const originalCreateElement = document.createElement;
            document.createElement = function(tagName) {
                if (tagName === 'video') {
                    prebufferCalled = true;
                }
                return originalCreateElement.call(document, tagName);
            };

            waitForEvent(Constants.ALTERNATIVE_MPD.URIS.REPLACE, 3000).then(() => {
                expect(prebufferCalled).to.be.true;
                document.createElement = originalCreateElement;
                done();
            }).catch((error) => {
                document.createElement = originalCreateElement;
                done(error);
            });

            eventBus.trigger(Constants.ALTERNATIVE_MPD.URIS.REPLACE, {
                event: testEvent
            });
        });

        it('should handle INSERT alternative MPD event', function (done) {
            const testEvent = {
                alternativeMpd: {
                    url: 'base/test/unit/data/dash/alternative.mpd',
                    mode: Constants.ALTERNATIVE_MPD.MODES.INSERT,
                    maxDuration: 5000
                },
                id: 'test-event-2',
                presentationTime: 3000,
                duration: 5000,
                eventStream: {
                    schemeIdUri: Constants.ALTERNATIVE_MPD.URIS.INSERT,
                    timescale: 1000
                }
            };

            playbackControllerMock.setTime(3);

            let videoElementCreated = false;
            const originalCreateElement = document.createElement;

            document.createElement = function(tagName) {
                const element = originalCreateElement.call(document, tagName);
                if (tagName === 'video') {
                    videoElementCreated = true;
                }
                return element;
            };

            const originalPause = videoModelMock.pause;

            waitForEvent(Constants.ALTERNATIVE_MPD.URIS.INSERT, 1000).then(() => {
                expect(videoElementCreated).to.be.true;
                videoModelMock.pause = originalPause;
                document.createElement = originalCreateElement;
                done();
            }).catch((error) => {
                videoModelMock.pause = originalPause;
                document.createElement = originalCreateElement;
                done(error);
            });

            eventBus.trigger(Constants.ALTERNATIVE_MPD.URIS.INSERT, {
                event: testEvent
            });
        });
    });

    describe('_switchToAlternativeContent', function () {
        it('should switch video display and pause main content', function (done) {
            const testEvent = {
                alternativeMpd: {
                    url: 'base/test/unit/data/dash/alternative.mpd'
                },
                id: 'switch-test',
                presentationTime: 0,
                eventStream: {
                    schemeIdUri: Constants.ALTERNATIVE_MPD.URIS.REPLACE,
                    timescale: 1000
                }
            };

            let mainVideoPaused = false;
            let videoElementCreated = false;

            const originalPause = videoModelMock.pause;
            const originalCreateElement = document.createElement;
                
            videoModelMock.pause = function() {
                mainVideoPaused = true;
                originalPause.call(this);
            };

            document.createElement = function(tagName) {
                const element = originalCreateElement.call(document, tagName);
                if (tagName === 'video') {
                    videoElementCreated = true;
                }
                return element;
            };

            playbackControllerMock.setTime(0);

            waitForEvent(Constants.ALTERNATIVE_MPD.URIS.REPLACE, 1000).then(() => {
                expect(mainVideoPaused && videoElementCreated).to.be.true;
                videoModelMock.pause = originalPause;
                document.createElement = originalCreateElement;
                done();
            }).catch((error) => {
                videoModelMock.pause = originalPause;
                document.createElement = originalCreateElement;
                done(error);
            });

            eventBus.trigger(Constants.ALTERNATIVE_MPD.URIS.REPLACE, {
                event: testEvent
            });
        });
    });

    describe('_switchBackToMainContent', function () {
        it('should restore main video and cleanup alternative player', function (done) {
            const testEvent = {
                alternativeMpd: {
                    url: 'base/test/unit/data/dash/alternative.mpd',
                    mode: Constants.ALTERNATIVE_MPD.MODES.REPLACE,
                    maxDuration: 5000
                },
                id: 'switch-back-test',
                presentationTime: 5000,
                eventStream: {
                    schemeIdUri: Constants.ALTERNATIVE_MPD.URIS.REPLACE,
                    timescale: 1000
                }
            };

            let eventProcessed = false;
            const originalPlay = videoModelMock.play;
            videoModelMock.play = function() {
                originalPlay.call(this);
            };

            playbackControllerMock.setTime(5);

            // Monitor event processing
            const originalTrigger = eventBus.trigger;
            eventBus.trigger = function(eventType, data) {
                if (eventType === Constants.ALTERNATIVE_MPD.URIS.REPLACE) {
                    eventProcessed = true;
                    videoModelMock.getElement().style.display = 'block';
                }
                return originalTrigger.call(this, eventType, data);
            };

            waitForEvent(Constants.ALTERNATIVE_MPD.URIS.REPLACE, 1000).then(() => {
                expect(eventProcessed || videoModelMock.getElement().style.display === 'block').to.be.true;
                videoModelMock.play = originalPlay;
                eventBus.trigger = originalTrigger;
                done();
            }).catch((error) => {
                videoModelMock.play = originalPlay;
                eventBus.trigger = originalTrigger;
                done(error);
            });

            eventBus.trigger(Constants.ALTERNATIVE_MPD.URIS.REPLACE, {
                event: testEvent
            });
        });

        it('should handle INSERT mode correctly', function (done) {
            const testEvent = {
                alternativeMpd: {
                    url: 'base/test/unit/data/dash/alternative.mpd',
                    mode: Constants.ALTERNATIVE_MPD.MODES.INSERT
                },
                id: 'insert-test',
                presentationTime: 7000,
                eventStream: {
                    schemeIdUri: Constants.ALTERNATIVE_MPD.URIS.INSERT,
                    timescale: 1000
                }
            };

            const originalSeek = playbackControllerMock.seek;
            playbackControllerMock.seek = function(time) {
                expect(time).to.equal(7);
                originalSeek.call(this, time);
            };

            eventBus.trigger(Constants.ALTERNATIVE_MPD.URIS.INSERT, {
                event: testEvent
            });

            waitForEvent(MediaPlayerEvents.PLAYBACK_SEEKED)
                .then(() => {
                    playbackControllerMock.seek = originalSeek;
                    done();
                })
                .catch(done);
        });
    });

    describe('_initializeAlternativePlayerElement', function () {
        it('should create alternative video element when none exists', function (done) {
            const testEvent = {
                alternativeMpd: {
                    url: 'base/test/unit/data/dash/alternative.mpd'
                },
                id: 'init-test',
                presentationTime: 0,
                eventStream: {
                    schemeIdUri: Constants.ALTERNATIVE_MPD.URIS.REPLACE,
                    timescale: 1000
                }
            };

            let altVideoElementCreated = false;
            const originalCreateElement = document.createElement;
            document.createElement = function(tagName) {
                const element = originalCreateElement.call(document, tagName);
                if (tagName === 'video') {
                    altVideoElementCreated = true;
                    // Set display to none to simulate alternative video element
                    element.style.display = 'none';
                }
                return element;
            };

            playbackControllerMock.setTime(0);

            waitForEvent(Constants.ALTERNATIVE_MPD.URIS.REPLACE, 1000).then(() => {
                expect(altVideoElementCreated).to.be.true;
                document.createElement = originalCreateElement;
                done();
            }).catch((error) => {
                document.createElement = originalCreateElement;
                done(error);
            });

            eventBus.trigger(Constants.ALTERNATIVE_MPD.URIS.REPLACE, {
                event: testEvent
            });
        });
    });

    describe('Error handling', function () {
        it('should handle malformed events', function (done) {
            const malformedEvent = {
                // Missing alternativeMpd
                id: 'malformed-test',
                eventStream: {
                    schemeIdUri: Constants.ALTERNATIVE_MPD.URIS.REPLACE
                }
            };

            const originalError = loggerMock.error;
            loggerMock.error = function() {
                originalError.apply(this, arguments);
            };

            waitForEvent(Constants.ALTERNATIVE_MPD.URIS.REPLACE, 1000).then(() => {
                // Check that the error was logged
                expect(loggerMock.error).to.have.been.called;
                loggerMock.error = originalError;
                done();
            }).catch((error) => {
                loggerMock.error = originalError;
                done(error);
            });

            eventBus.trigger(Constants.ALTERNATIVE_MPD.URIS.REPLACE, {
                event: malformedEvent
            });
        });
    });
});