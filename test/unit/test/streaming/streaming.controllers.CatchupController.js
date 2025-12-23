import CatchupController from '../../../../src/streaming/controllers/CatchupController.js';
import EventBus from '../../../../src/core/EventBus.js';
import Events from '../../../../src/core/events/Events.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';
import Settings from '../../../../src/core/Settings.js';
import MetricsConstants from '../../../../src/streaming/constants/MetricsConstants.js';
import Constants from '../../../../src/streaming/constants/Constants.js';

import PlaybackControllerMock from '../../mocks/PlaybackControllerMock.js';
import StreamControllerMock from '../../mocks/StreamControllerMock.js';
import VideoModelMock from '../../mocks/VideoModelMock.js';
import MediaPlayerModelMock from '../../mocks/MediaPlayerModelMock.js';

import chai from 'chai';
import sinon from 'sinon';

const expect = chai.expect;

const context = {};
const eventBus = EventBus(context).getInstance();

describe('CatchupController', function () {
    let catchupController;
    let settings;
    let playbackControllerMock;
    let streamControllerMock;
    let videoModelMock;
    let mediaPlayerModelMock;

    beforeEach(function () {
        settings = Settings(context).getInstance();
        playbackControllerMock = new PlaybackControllerMock();
        streamControllerMock = new StreamControllerMock();
        videoModelMock = new VideoModelMock();
        mediaPlayerModelMock = new MediaPlayerModelMock();

        catchupController = CatchupController(context).getInstance();
        catchupController.setConfig({
            settings: settings,
            playbackController: playbackControllerMock,
            streamController: streamControllerMock,
            videoModel: videoModelMock,
            mediaPlayerModel: mediaPlayerModelMock
        });
    });

    afterEach(function () {
        catchupController.reset();
        catchupController = null;
        settings.reset();
    });

    describe('Method initialize', function () {
        it('should initialize the controller', function () {
            catchupController.initialize();
        });
    });

    describe('Method setConfig', function () {
        it('should update config with provided settings', function () {
            const newSettings = Settings(context).getInstance();
            catchupController.setConfig({
                settings: newSettings
            });
        });

        it('should handle null config', function () {
            catchupController.setConfig(null);
        });

        it('should handle empty config', function () {
            catchupController.setConfig({});
        });
    });

    describe('Method reset', function () {
        it('should reset the controller and set playback rate to 1.0', function () {
            const setPlaybackRateSpy = sinon.spy(videoModelMock, 'setPlaybackRate');
            catchupController.initialize();
            catchupController.reset();
            
            expect(setPlaybackRateSpy.calledWith(1.0, true)).to.be.true;
        });
    });

    describe('Event handling', function () {
        beforeEach(function () {
            catchupController.initialize();
        });

        it('should handle BUFFER_LEVEL_UPDATED event', function () {
            const streamInfo = { id: 'stream-1' };
            streamControllerMock.getActiveStreamInfo = sinon.stub().returns(streamInfo);
            playbackControllerMock.getLiveDelay = sinon.stub().returns(4);
            playbackControllerMock.getBufferLevel = sinon.stub().returns(3);

            eventBus.trigger(MediaPlayerEvents.BUFFER_LEVEL_UPDATED, {
                streamId: 'stream-1',
                mediaType: 'video'
            });
        });

        it('should handle BUFFER_LEVEL_STATE_CHANGED event', function () {
            const streamInfo = { id: 'stream-1' };
            streamControllerMock.getActiveStreamInfo = sinon.stub().returns(streamInfo);

            eventBus.trigger(MediaPlayerEvents.BUFFER_LEVEL_STATE_CHANGED, {
                streamId: 'stream-1',
                state: MetricsConstants.BUFFER_EMPTY
            });
        });

        it('should handle PLAYBACK_PROGRESS event', function () {
            playbackControllerMock.getIsDynamic = sinon.stub().returns(true);
            mediaPlayerModelMock.getCatchupModeEnabled = sinon.stub().returns(true);
            mediaPlayerModelMock.getCatchupPlaybackRates = sinon.stub().returns({ min: -0.5, max: 0.5 });
            playbackControllerMock.isPaused = sinon.stub().returns(false);
            playbackControllerMock.isSeeking = sinon.stub().returns(false);
            playbackControllerMock.getTime = sinon.stub().returns(10);
            playbackControllerMock.getCurrentLiveLatency = sinon.stub().returns(5);
            playbackControllerMock.getLiveDelay = sinon.stub().returns(3);
            playbackControllerMock.getBufferLevel = sinon.stub().returns(2);
            playbackControllerMock.getPlaybackStalled = sinon.stub().returns(false);
            videoModelMock.getPlaybackRate = sinon.stub().returns(1.0);
            const setPlaybackRateSpy = sinon.spy(videoModelMock, 'setPlaybackRate');

            eventBus.trigger(MediaPlayerEvents.PLAYBACK_PROGRESS);

            expect(setPlaybackRateSpy.called).to.be.true;
        });

        it('should handle PLAYBACK_TIME_UPDATED event', function () {
            playbackControllerMock.getIsDynamic = sinon.stub().returns(true);
            mediaPlayerModelMock.getCatchupModeEnabled = sinon.stub().returns(true);
            mediaPlayerModelMock.getCatchupPlaybackRates = sinon.stub().returns({ min: -0.5, max: 0.5 });
            playbackControllerMock.isPaused = sinon.stub().returns(false);
            playbackControllerMock.isSeeking = sinon.stub().returns(false);
            playbackControllerMock.getTime = sinon.stub().returns(10);
            playbackControllerMock.getCurrentLiveLatency = sinon.stub().returns(5);
            playbackControllerMock.getLiveDelay = sinon.stub().returns(3);
            playbackControllerMock.getBufferLevel = sinon.stub().returns(2);
            playbackControllerMock.getPlaybackStalled = sinon.stub().returns(false);
            videoModelMock.getPlaybackRate = sinon.stub().returns(1.0);
            const setPlaybackRateSpy = sinon.spy(videoModelMock, 'setPlaybackRate');

            eventBus.trigger(MediaPlayerEvents.PLAYBACK_TIME_UPDATED);

            expect(setPlaybackRateSpy.called).to.be.true;
        });

        it('should handle PLAYBACK_SEEKED event', function () {
            eventBus.trigger(MediaPlayerEvents.PLAYBACK_SEEKED);
        });

        it('should handle SETTING_UPDATED_CATCHUP_ENABLED event', function () {
            mediaPlayerModelMock.getCatchupModeEnabled = sinon.stub().returns(false);
            const setPlaybackRateSpy = sinon.spy(videoModelMock, 'setPlaybackRate');

            eventBus.trigger(Events.SETTING_UPDATED_CATCHUP_ENABLED);

            expect(setPlaybackRateSpy.calledWith(1.0)).to.be.true;
        });

        it('should handle SETTING_UPDATED_PLAYBACK_RATE_MIN event', function () {
            mediaPlayerModelMock.getCatchupPlaybackRates = sinon.stub().returns({ min: -0.5, max: 0.5 });
            eventBus.trigger(Events.SETTING_UPDATED_PLAYBACK_RATE_MIN);
        });

        it('should handle SETTING_UPDATED_PLAYBACK_RATE_MAX event', function () {
            mediaPlayerModelMock.getCatchupPlaybackRates = sinon.stub().returns({ min: -0.5, max: 0.5 });
            eventBus.trigger(Events.SETTING_UPDATED_PLAYBACK_RATE_MAX);
        });

        it('should handle STREAM_INITIALIZED event', function () {
            mediaPlayerModelMock.getCatchupPlaybackRates = sinon.stub().returns({ min: -0.5, max: 0.5 });
            eventBus.trigger(MediaPlayerEvents.STREAM_INITIALIZED);
        });
    });

    describe('Catchup mode behavior', function () {
        beforeEach(function () {
            catchupController.initialize();
            settings.update({
                streaming: {
                    liveCatchup: {
                        mode: Constants.LIVE_CATCHUP_MODE_DEFAULT,
                        playbackBufferMin: 0.5
                    }
                }
            });
        });

        it('should not apply catchup when not in dynamic mode', function () {
            playbackControllerMock.getIsDynamic = sinon.stub().returns(false);
            mediaPlayerModelMock.getCatchupModeEnabled = sinon.stub().returns(true);
            mediaPlayerModelMock.getCatchupPlaybackRates = sinon.stub().returns({ min: -0.5, max: 0.5 });

            eventBus.trigger(MediaPlayerEvents.PLAYBACK_PROGRESS);
        });

        it('should not apply catchup when catchup mode is disabled', function () {
            playbackControllerMock.getIsDynamic = sinon.stub().returns(true);
            mediaPlayerModelMock.getCatchupModeEnabled = sinon.stub().returns(false);
            mediaPlayerModelMock.getCatchupPlaybackRates = sinon.stub().returns({ min: -0.5, max: 0.5 });
            playbackControllerMock.isPaused = sinon.stub().returns(false);
            playbackControllerMock.isSeeking = sinon.stub().returns(false);
            playbackControllerMock.getTime = sinon.stub().returns(10);

            const setPlaybackRateSpy = sinon.spy(videoModelMock, 'setPlaybackRate');
            const seekToCurrentLiveSpy = sinon.spy(playbackControllerMock, 'seekToCurrentLive');

            eventBus.trigger(MediaPlayerEvents.PLAYBACK_PROGRESS);

            expect(setPlaybackRateSpy.notCalled).to.be.true;
            expect(seekToCurrentLiveSpy.notCalled).to.be.true;
        });

        it('should not apply catchup when paused', function () {
            playbackControllerMock.getIsDynamic = sinon.stub().returns(true);
            mediaPlayerModelMock.getCatchupModeEnabled = sinon.stub().returns(true);
            mediaPlayerModelMock.getCatchupPlaybackRates = sinon.stub().returns({ min: -0.5, max: 0.5 });
            playbackControllerMock.isPaused = sinon.stub().returns(true);
            playbackControllerMock.isSeeking = sinon.stub().returns(false);
            playbackControllerMock.getTime = sinon.stub().returns(10);

            const setPlaybackRateSpy = sinon.spy(videoModelMock, 'setPlaybackRate');
            const seekToCurrentLiveSpy = sinon.spy(playbackControllerMock, 'seekToCurrentLive');

            eventBus.trigger(MediaPlayerEvents.PLAYBACK_PROGRESS);

            expect(setPlaybackRateSpy.notCalled).to.be.true;
            expect(seekToCurrentLiveSpy.notCalled).to.be.true;
        });

        it('should not apply catchup when seeking', function () {
            playbackControllerMock.getIsDynamic = sinon.stub().returns(true);
            mediaPlayerModelMock.getCatchupModeEnabled = sinon.stub().returns(true);
            mediaPlayerModelMock.getCatchupPlaybackRates = sinon.stub().returns({ min: -0.5, max: 0.5 });
            playbackControllerMock.isPaused = sinon.stub().returns(false);
            playbackControllerMock.isSeeking = sinon.stub().returns(true);
            playbackControllerMock.getTime = sinon.stub().returns(10);

            const setPlaybackRateSpy = sinon.spy(videoModelMock, 'setPlaybackRate');
            const seekToCurrentLiveSpy = sinon.spy(playbackControllerMock, 'seekToCurrentLive');

            eventBus.trigger(MediaPlayerEvents.PLAYBACK_PROGRESS);

            expect(setPlaybackRateSpy.notCalled).to.be.true;
            expect(seekToCurrentLiveSpy.notCalled).to.be.true;
        });

        it('should apply catchup in default mode when latency drift exists', function () {
            playbackControllerMock.getIsDynamic = sinon.stub().returns(true);
            mediaPlayerModelMock.getCatchupModeEnabled = sinon.stub().returns(true);
            mediaPlayerModelMock.getCatchupPlaybackRates = sinon.stub().returns({ min: -0.5, max: 0.5 });
            playbackControllerMock.isPaused = sinon.stub().returns(false);
            playbackControllerMock.isSeeking = sinon.stub().returns(false);
            playbackControllerMock.getTime = sinon.stub().returns(10);
            playbackControllerMock.getCurrentLiveLatency = sinon.stub().returns(5);
            playbackControllerMock.getLiveDelay = sinon.stub().returns(3);
            playbackControllerMock.getBufferLevel = sinon.stub().returns(2);
            playbackControllerMock.getPlaybackStalled = sinon.stub().returns(false);
            videoModelMock.getPlaybackRate = sinon.stub().returns(1.0);
            const setPlaybackRateSpy = sinon.spy(videoModelMock, 'setPlaybackRate');

            eventBus.trigger(MediaPlayerEvents.PLAYBACK_PROGRESS);

            expect(setPlaybackRateSpy.called).to.be.true;
        });

        it('should seek to live when max drift is exceeded', function () {
            playbackControllerMock.getIsDynamic = sinon.stub().returns(true);
            mediaPlayerModelMock.getCatchupModeEnabled = sinon.stub().returns(true);
            mediaPlayerModelMock.getCatchupPlaybackRates = sinon.stub().returns({ min: -0.5, max: 0.5 });
            mediaPlayerModelMock.getCatchupMaxDrift = sinon.stub().returns(2);
            playbackControllerMock.isPaused = sinon.stub().returns(false);
            playbackControllerMock.isSeeking = sinon.stub().returns(false);
            playbackControllerMock.getTime = sinon.stub().returns(10);
            playbackControllerMock.getCurrentLiveLatency = sinon.stub().returns(10);
            playbackControllerMock.getLiveDelay = sinon.stub().returns(3);
            const seekToCurrentLiveSpy = sinon.spy(playbackControllerMock, 'seekToCurrentLive');

            eventBus.trigger(MediaPlayerEvents.PLAYBACK_PROGRESS);

            expect(seekToCurrentLiveSpy.called).to.be.true;
        });
    });

    describe('LoL+ catchup mode', function () {
        beforeEach(function () {
            catchupController.initialize();
            settings.update({
                streaming: {
                    liveCatchup: {
                        mode: Constants.LIVE_CATCHUP_MODE_LOLP,
                        playbackBufferMin: 1.0
                    }
                }
            });
        });

        it('should use buffer-based catchup when buffer is low', function () {
            playbackControllerMock.getIsDynamic = sinon.stub().returns(true);
            mediaPlayerModelMock.getCatchupModeEnabled = sinon.stub().returns(true);
            mediaPlayerModelMock.getCatchupPlaybackRates = sinon.stub().returns({ min: -0.5, max: 0.5 });
            playbackControllerMock.isPaused = sinon.stub().returns(false);
            playbackControllerMock.isSeeking = sinon.stub().returns(false);
            playbackControllerMock.getTime = sinon.stub().returns(10);
            playbackControllerMock.getCurrentLiveLatency = sinon.stub().returns(5);
            playbackControllerMock.getLiveDelay = sinon.stub().returns(3);
            playbackControllerMock.getBufferLevel = sinon.stub().returns(0.5);
            videoModelMock.getPlaybackRate = sinon.stub().returns(1.0);

            eventBus.trigger(MediaPlayerEvents.PLAYBACK_PROGRESS);
        });

        it('should use latency-based catchup when buffer is sufficient', function () {
            playbackControllerMock.getIsDynamic = sinon.stub().returns(true);
            mediaPlayerModelMock.getCatchupModeEnabled = sinon.stub().returns(true);
            mediaPlayerModelMock.getCatchupPlaybackRates = sinon.stub().returns({ min: -0.5, max: 0.5 });
            playbackControllerMock.isPaused = sinon.stub().returns(false);
            playbackControllerMock.isSeeking = sinon.stub().returns(false);
            playbackControllerMock.getTime = sinon.stub().returns(10);
            playbackControllerMock.getCurrentLiveLatency = sinon.stub().returns(5);
            playbackControllerMock.getLiveDelay = sinon.stub().returns(3);
            playbackControllerMock.getBufferLevel = sinon.stub().returns(2.0);
            videoModelMock.getPlaybackRate = sinon.stub().returns(1.0);

            eventBus.trigger(MediaPlayerEvents.PLAYBACK_PROGRESS);
        });
    });

    describe('Buffer state management', function () {
        beforeEach(function () {
            catchupController.initialize();
        });

        it('should update stalled state when buffer becomes empty', function () {
            const streamInfo = { id: 'stream-1' };
            streamControllerMock.getActiveStreamInfo = sinon.stub().returns(streamInfo);

            eventBus.trigger(MediaPlayerEvents.BUFFER_LEVEL_STATE_CHANGED, {
                streamId: 'stream-1',
                state: MetricsConstants.BUFFER_EMPTY
            });
        });

        it('should ignore buffer state changes from inactive streams', function () {
            const streamInfo = { id: 'stream-1' };
            streamControllerMock.getActiveStreamInfo = sinon.stub().returns(streamInfo);

            eventBus.trigger(MediaPlayerEvents.BUFFER_LEVEL_STATE_CHANGED, {
                streamId: 'stream-2',
                state: MetricsConstants.BUFFER_EMPTY
            });
        });

        it('should remove stalled state when buffer level increases', function () {
            const streamInfo = { id: 'stream-1' };
            streamControllerMock.getActiveStreamInfo = sinon.stub().returns(streamInfo);
            playbackControllerMock.getLiveDelay = sinon.stub().returns(4);
            playbackControllerMock.getBufferLevel = sinon.stub().returns(3);

            // First set stalled state
            eventBus.trigger(MediaPlayerEvents.BUFFER_LEVEL_STATE_CHANGED, {
                streamId: 'stream-1',
                state: MetricsConstants.BUFFER_EMPTY
            });

            // Then trigger buffer level update
            eventBus.trigger(MediaPlayerEvents.BUFFER_LEVEL_UPDATED, {
                streamId: 'stream-1',
                mediaType: 'video'
            });
        });
    });
});
