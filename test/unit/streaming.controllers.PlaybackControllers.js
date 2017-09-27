import PlaybackController from '../../src/streaming/controllers/PlaybackController';
import Events from '../../src/core/events/Events';
import EventBus from '../../src/core/EventBus';

import MetricsModelMock from './mocks/MetricsModelMock';
import VideoModelMock from './mocks/VideoModelMock';
import MediaPlayerModelMock from './mocks/MediaPlayerModelMock';
import DashMetricsMock from './mocks/DashMetricsMock';

const expect = require('chai').expect;
const context = {};

const eventBus = EventBus(context).getInstance();

describe('PlaybackController', function () {

    let playbackController;
    let videoModelMock;
    let metricsModelMock;
    let dashMetricsMock;
    let mediaPlayerModelMock;

    beforeEach(function () {
        videoModelMock = new VideoModelMock();
        metricsModelMock = new MetricsModelMock();
        dashMetricsMock = new DashMetricsMock();
        mediaPlayerModelMock = new MediaPlayerModelMock();

        playbackController = PlaybackController(context).getInstance();

        playbackController.setConfig({
            videoModel: videoModelMock,
            metricsModel: metricsModelMock,
            dashMetrics: dashMetricsMock,
            mediaPlayerModel: mediaPlayerModelMock
        });
    });

    afterEach(function () {
        playbackController.reset();
        playbackController = null;
    });

    describe('Not initialized', function () {
        it('should initialize', function () {

            expect(playbackController.getIsDynamic()).to.not.exist; // jshint ignore:line
            expect(playbackController.getLiveStartTime()).to.be.NaN; // jshint ignore:line

            let streamInfo = {
                manifestInfo: {
                    isDynamic: true
                },
                start: 10
            };

            playbackController.initialize(streamInfo);


            expect(playbackController.getIsDynamic()).to.equal(true);
            expect(playbackController.getLiveStartTime()).to.equal(10);
        });
    });

    describe('Initialized', function () {

        beforeEach(function () {
            let streamInfo = {
                manifestInfo: {
                    isDynamic: true
                },
                start: 10
            };

            playbackController.initialize(streamInfo);
        });

        describe('video management', function () {

            it('should start playing video', function () {
                playbackController.play();
                expect(videoModelMock.isplaying).to.be.true; // jshint ignore:line
            });

            it('should pause the video', function () {
                playbackController.pause();
                expect(videoModelMock.ispaused).to.be.true; // jshint ignore:line
            });

            it('should return if video is paused', function () {

                expect(playbackController.isPaused()).to.be.false; // jshint ignore:line
                playbackController.pause();
                expect(playbackController.isPaused()).to.be.true; // jshint ignore:line
            });

            it('should seek the video', function () {
                playbackController.seek(10);
                expect(videoModelMock.time).to.equal(10);
            });

            it('should seek and trigger Events.PLAYBACK_SEEK_ASKED event', function (done) {

                let onSeekedAsked = function () {
                    eventBus.off(Events.PLAYBACK_SEEK_ASKED, onSeekedAsked);
                    done();
                };
                eventBus.on(Events.PLAYBACK_SEEK_ASKED, onSeekedAsked, this);

                playbackController.seek(10);
            });

            it('should return if video is seeking', function () {
                videoModelMock.isseeking = true;
                expect(playbackController.isSeeking()).to.equal(videoModelMock.isseeking);
            });

            it('should return current video time', function () {
                videoModelMock.time = 2;
                expect(playbackController.getTime()).to.equal(videoModelMock.time);
            });

            it('should return video playback rate', function () {
                videoModelMock.playbackRate = 2;
                expect(playbackController.getPlaybackRate()).to.equal(videoModelMock.playbackRate);
            });

            it('should return video played range', function () {
                videoModelMock.playedRange = 3;
                expect(playbackController.getPlayedRanges()).to.equal(videoModelMock.playedRange);
            });

            it('should return video ended ', function () {
                videoModelMock.ended = true;
                expect(playbackController.getEnded()).to.equal(videoModelMock.ended);
            });
        });

        describe('video event handler', function () {
            it('should handle canplay event', function (done) {
                let onCanPlay = function () {
                    eventBus.off(Events.CAN_PLAY, onCanPlay);
                    done();
                };

                eventBus.on(Events.CAN_PLAY, onCanPlay, this);
                videoModelMock.fireEvent('canplay');

            });

            it('should handle play event', function (done) {
                videoModelMock.time = 10;
                let onPlay = function (e) {
                    eventBus.off(Events.PLAYBACK_STARTED, onPlay);

                    expect(e.startTime).to.equal(10);
                    done();
                };

                eventBus.on(Events.PLAYBACK_STARTED, onPlay, this);
                videoModelMock.fireEvent('play');
            });

            it('should handle playing event', function (done) {
                videoModelMock.time = 10;
                let onPlaying = function (e) {
                    eventBus.off(Events.PLAYBACK_PLAYING, onPlaying);

                    expect(e.playingTime).to.equal(10);
                    done();
                };

                eventBus.on(Events.PLAYBACK_PLAYING, onPlaying, this);
                videoModelMock.fireEvent('playing');
            });

            it('should handle pause event', function (done) {
                let onPaused = function () {
                    eventBus.off(Events.PLAYBACK_PAUSED, onPaused);
                    done();
                };

                eventBus.on(Events.PLAYBACK_PAUSED, onPaused, this);
                videoModelMock.fireEvent('pause');
            });

            it('should handle seeking event', function (done) {
                videoModelMock.time = 10;
                let onSeeking = function (e) {
                    eventBus.off(Events.PLAYBACK_SEEKING, onSeeking);

                    expect(e.seekTime).to.equal(10);
                    done();
                };

                eventBus.on(Events.PLAYBACK_SEEKING, onSeeking, this);
                videoModelMock.fireEvent('seeking');
            });

            it('should handle seeked event', function (done) {
                let onSeeked = function () {
                    eventBus.off(Events.PLAYBACK_SEEKED, onSeeked);
                    done();
                };

                eventBus.on(Events.PLAYBACK_SEEKED, onSeeked, this);
                videoModelMock.fireEvent('seeked');
            });

            it('should handle progress event', function (done) {
                let onProgress = function () {
                    eventBus.off(Events.PLAYBACK_PROGRESS, onProgress);
                    done();
                };

                eventBus.on(Events.PLAYBACK_PROGRESS, onProgress, this);
                videoModelMock.fireEvent('progress');
            });

            it('should handle ratechange event', function (done) {
                videoModelMock.playbackRate = 2;
                let onEvent = function (e) {
                    eventBus.off(Events.PLAYBACK_RATE_CHANGED, onEvent);

                    expect(e.playbackRate).to.equal(videoModelMock.playbackRate);
                    done();
                };

                eventBus.on(Events.PLAYBACK_RATE_CHANGED, onEvent, this);
                videoModelMock.fireEvent('ratechange');
            });

            it('should handle loadedmetadata event', function (done) {
                let onPlaybackMetaDataLoaded = function () {
                    eventBus.off(Events.PLAYBACK_METADATA_LOADED, onPlaybackMetaDataLoaded);
                    done();
                };

                eventBus.on(Events.PLAYBACK_METADATA_LOADED, onPlaybackMetaDataLoaded, this);
                videoModelMock.fireEvent('loadedmetadata');
            });

            it('should handle ended event', function (done) {
                let onEnded = function () {
                    eventBus.off(Events.PLAYBACK_ENDED, onEnded);
                    done();
                };

                eventBus.on(Events.PLAYBACK_ENDED, onEnded, this);
                videoModelMock.fireEvent('ended');
            });

            it('should handle error event', function (done) {
                let onError = function (e) {
                    eventBus.off(Events.PLAYBACK_ERROR, onError);

                    expect(e.error).to.equal('error');
                    done();
                };

                eventBus.on(Events.PLAYBACK_ERROR, onError, this);
                videoModelMock.fireEvent('error', [{target: { error: 'error'}}]);
            });
        });

    });
});
