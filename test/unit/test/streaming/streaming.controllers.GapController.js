import GapController from '../../../../src/streaming/controllers/GapController.js';
import EventBus from '../../../../src/core/EventBus.js';
import Events from '../../../../src/core/events/Events.js';
import Settings from '../../../../src/core/Settings.js';

import PlaybackControllerMock from '../../mocks/PlaybackControllerMock.js';
import StreamControllerMock from '../../mocks/StreamControllerMock.js';
import VideoModelMock from '../../mocks/VideoModelMock.js';

import chai from 'chai';
import sinon from 'sinon';

const expect = chai.expect;

const context = {};
const eventBus = EventBus(context).getInstance();

describe('GapController', function () {
    let gapController;
    let settings;
    let playbackControllerMock;
    let streamControllerMock;
    let videoModelMock;

    beforeEach(function () {
        settings = Settings(context).getInstance();
        playbackControllerMock = new PlaybackControllerMock();
        streamControllerMock = new StreamControllerMock();
        videoModelMock = new VideoModelMock();

        gapController = GapController(context).getInstance();
        gapController.setConfig({
            settings: settings,
            playbackController: playbackControllerMock,
            streamController: streamControllerMock,
            videoModel: videoModelMock
        });
    });

    afterEach(function () {
        gapController.reset();
        gapController = null;
        settings.reset();
    });

    describe('Method initialize', function () {
        it('should initialize the controller', function () {
            gapController.initialize();
        });
    });

    describe('Method setConfig', function () {
        it('should update config with provided settings', function () {
            const newSettings = Settings(context).getInstance();
            gapController.setConfig({
                settings: newSettings
            });
        });

        it('should handle null config', function () {
            gapController.setConfig(null);
        });

        it('should handle empty config', function () {
            gapController.setConfig({});
        });
    });

    describe('Method reset', function () {
        it('should reset the controller', function () {
            gapController.initialize();
            gapController.reset();
        });
    });

    describe('Event handling', function () {
        beforeEach(function () {
            gapController.initialize();
        });

        it('should handle WALLCLOCK_TIME_UPDATED event', function () {
            playbackControllerMock.getTime = sinon.stub().returns(10);
            streamControllerMock.getActiveStream = sinon.stub().returns({
                getStartTime: () => 0,
                getDuration: () => 100
            });
            streamControllerMock.getActiveStreamProcessors = sinon.stub().returns([{}]);
            playbackControllerMock.isSeeking = sinon.stub().returns(false);
            playbackControllerMock.isPaused = sinon.stub().returns(false);
            streamControllerMock.getIsStreamSwitchInProgress = sinon.stub().returns(false);
            streamControllerMock.getHasMediaOrInitialisationError = sinon.stub().returns(false);

            eventBus.trigger(Events.WALLCLOCK_TIME_UPDATED);
        });

        it('should handle INITIAL_STREAM_SWITCH event', function () {
            eventBus.trigger(Events.INITIAL_STREAM_SWITCH);
        });

        it('should handle PLAYBACK_SEEKING event', function () {
            eventBus.trigger(Events.PLAYBACK_SEEKING);
        });

        it('should handle BUFFER_REPLACEMENT_STARTED event', function () {
            const streamInfo = { id: 'stream-1' };
            streamControllerMock.getActiveStreamInfo = sinon.stub().returns(streamInfo);

            eventBus.trigger(Events.BUFFER_REPLACEMENT_STARTED, {
                streamId: 'stream-1',
                mediaType: 'video'
            });
        });

        it('should handle TRACK_CHANGE_RENDERED event', function () {
            eventBus.trigger(Events.TRACK_CHANGE_RENDERED, {
                mediaType: 'video'
            });
        });

        it('should ignore BUFFER_REPLACEMENT_STARTED for different stream', function () {
            const streamInfo = { id: 'stream-1' };
            streamControllerMock.getActiveStreamInfo = sinon.stub().returns(streamInfo);

            eventBus.trigger(Events.BUFFER_REPLACEMENT_STARTED, {
                streamId: 'stream-2',
                mediaType: 'video'
            });
        });

        it('should handle TRACK_CHANGE_RENDERED with null event', function () {
            eventBus.trigger(Events.TRACK_CHANGE_RENDERED, null);
        });

        it('should handle TRACK_CHANGE_RENDERED without mediaType', function () {
            eventBus.trigger(Events.TRACK_CHANGE_RENDERED, {});
        });
    });

    describe('Gap detection and jumping', function () {
        beforeEach(function () {
            gapController.initialize();
            settings.update({
                streaming: {
                    gaps: {
                        jumpGaps: true,
                        smallGapLimit: 1.5,
                        threshold: 0.3,
                        enableStallFix: true,
                        stallSeek: 0.1,
                        jumpLargeGaps: false,
                        enableSeekFix: true
                    }
                }
            });
        });

        it('should not check for gaps when no active stream', function () {
            streamControllerMock.getActiveStream = sinon.stub().returns(null);
            const getTimeSpy = sinon.spy(playbackControllerMock, 'getTime');

            // Trigger enough wallclock updates that, if gap checks were enabled,
            // we would reach the THRESHOLD_TO_STALLS branch and call getTime().
            for (let i = 0; i < 15; i++) {
                eventBus.trigger(Events.WALLCLOCK_TIME_UPDATED);
            }

            expect(getTimeSpy.notCalled).to.be.true;
        });

        it('should not check for gaps when paused', function () {
            streamControllerMock.getActiveStream = sinon.stub().returns({
                getStartTime: () => 0,
                getDuration: () => 100
            });
            streamControllerMock.getActiveStreamProcessors = sinon.stub().returns([{}]);
            playbackControllerMock.isPaused = sinon.stub().returns(true);
            const seekSpy = sinon.spy(playbackControllerMock, 'seek');

            for (let i = 0; i < 15; i++) {
                eventBus.trigger(Events.WALLCLOCK_TIME_UPDATED);
            }

            expect(seekSpy.notCalled).to.be.true;
        });

        it('should not check for gaps when seeking', function () {
            streamControllerMock.getActiveStream = sinon.stub().returns({
                getStartTime: () => 0,
                getDuration: () => 100
            });
            streamControllerMock.getActiveStreamProcessors = sinon.stub().returns([{}]);
            playbackControllerMock.isSeeking = sinon.stub().returns(true);
            playbackControllerMock.isPaused = sinon.stub().returns(false);
            const seekSpy = sinon.spy(playbackControllerMock, 'seek');

            for (let i = 0; i < 15; i++) {
                eventBus.trigger(Events.WALLCLOCK_TIME_UPDATED);
            }

            expect(seekSpy.notCalled).to.be.true;
        });

        it('should not check for gaps during stream switch', function () {
            streamControllerMock.getActiveStream = sinon.stub().returns({
                getStartTime: () => 0,
                getDuration: () => 100
            });
            streamControllerMock.getActiveStreamProcessors = sinon.stub().returns([{}]);
            streamControllerMock.getIsStreamSwitchInProgress = sinon.stub().returns(true);
            playbackControllerMock.isSeeking = sinon.stub().returns(false);
            playbackControllerMock.isPaused = sinon.stub().returns(false);
            const seekSpy = sinon.spy(playbackControllerMock, 'seek');

            for (let i = 0; i < 15; i++) {
                eventBus.trigger(Events.WALLCLOCK_TIME_UPDATED);
            }

            expect(seekSpy.notCalled).to.be.true;
        });

        it('should not check for gaps when media error occurred', function () {
            streamControllerMock.getActiveStream = sinon.stub().returns({
                getStartTime: () => 0,
                getDuration: () => 100
            });
            streamControllerMock.getActiveStreamProcessors = sinon.stub().returns([{}]);
            streamControllerMock.getHasMediaOrInitialisationError = sinon.stub().returns(true);
            playbackControllerMock.isSeeking = sinon.stub().returns(false);
            playbackControllerMock.isPaused = sinon.stub().returns(false);
            const seekSpy = sinon.spy(playbackControllerMock, 'seek');

            for (let i = 0; i < 15; i++) {
                eventBus.trigger(Events.WALLCLOCK_TIME_UPDATED);
            }

            expect(seekSpy.notCalled).to.be.true;
        });

        it('should not check for gaps when jumpGaps is disabled', function () {
            settings.update({
                streaming: {
                    gaps: {
                        jumpGaps: false
                    }
                }
            });

            streamControllerMock.getActiveStream = sinon.stub().returns({
                getStartTime: () => 0,
                getDuration: () => 100
            });
            streamControllerMock.getActiveStreamProcessors = sinon.stub().returns([{}]);
            playbackControllerMock.isSeeking = sinon.stub().returns(false);
            playbackControllerMock.isPaused = sinon.stub().returns(false);
            const seekSpy = sinon.spy(playbackControllerMock, 'seek');

            for (let i = 0; i < 15; i++) {
                eventBus.trigger(Events.WALLCLOCK_TIME_UPDATED);
            }

            expect(seekSpy.notCalled).to.be.true;
        });

        it('should jump a gap that exists only in the video SourceBuffer', function () {
            const clock = sinon.useFakeTimers();
            const toRanges = (r) => ({ length: r.length, start: (i) => r[i][0], end: (i) => r[i][1] });
            const streamProcessor = (type, ranges) => ({
                getType: () => type,
                getBuffer: () => ({ getAllBufferRanges: () => toRanges(ranges) })
            });

            settings.update({ streaming: { gaps: { jumpLargeGaps: true } } });
            streamControllerMock.getActiveStream = sinon.stub().returns({
                getStartTime: () => 0,
                getDuration: () => 60,
                getStreamId: () => 'p0'
            });
            streamControllerMock.getActiveStreamProcessors = sinon.stub().returns([
                streamProcessor('video', [[0, 16], [24, 60]]),
                streamProcessor('audio', [[0, 20]])
            ]);
            // The video element only reports the intersection of the audio and video ranges
            videoModelMock.getBufferRange = sinon.stub().returns(toRanges([[0, 16]]));
            playbackControllerMock.getTime = sinon.stub().returns(16);
            playbackControllerMock.isSeeking = sinon.stub().returns(false);
            playbackControllerMock.isPaused = sinon.stub().returns(false);
            playbackControllerMock.getTimeToStreamEnd = sinon.stub().returns(44);
            const seekSpy = sinon.spy(playbackControllerMock, 'seek');

            for (let i = 0; i < 20; i++) {
                eventBus.trigger(Events.WALLCLOCK_TIME_UPDATED);
            }
            clock.tick(1);
            clock.restore();

            expect(seekSpy.calledOnce).to.be.true;
            expect(seekSpy.firstCall.args[0]).to.equal(24 + settings.get().streaming.gaps.seekOffset);
            // The target is not part of the buffered ranges of the video element: no stick to buffered and no internal seek
            expect(seekSpy.firstCall.args[1]).to.be.false;
            expect(seekSpy.firstCall.args[2]).to.be.false;
        });
    });

    describe('Configuration', function () {
        it('should respect gap settings', function () {
            const customSettings = {
                streaming: {
                    gaps: {
                        jumpGaps: false,
                        smallGapLimit: 2.0,
                        threshold: 0.5,
                        enableStallFix: false,
                        stallSeek: 0.2,
                        jumpLargeGaps: true,
                        enableSeekFix: false
                    }
                }
            };

            settings.update(customSettings);
            const currentSettings = settings.get();
            expect(currentSettings.streaming.gaps.jumpGaps).to.equal(false);
            expect(currentSettings.streaming.gaps.smallGapLimit).to.equal(2.0);
            expect(currentSettings.streaming.gaps.threshold).to.equal(0.5);
        });

        it('should use default checkInterval of 250ms', function () {
            const currentSettings = settings.get();
            expect(currentSettings.streaming.gaps.checkInterval).to.equal(250);
        });

        it('should allow overriding checkInterval via settings', function () {
            settings.update({
                streaming: {
                    gaps: {
                        checkInterval: 100
                    }
                }
            });
            const currentSettings = settings.get();
            expect(currentSettings.streaming.gaps.checkInterval).to.equal(100);
        });
    });
});
