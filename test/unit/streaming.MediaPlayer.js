import SpecHelper from './helpers/SpecHelper';
import VideoElementMock from './mocks/VideoElementMock';
import StreamControllerMock from './mocks/StreamControllerMock';
import CapabilitiesMock from './mocks/CapabilitiesMock';
import PlaybackControllerMock from './mocks/PlaybackControllerMock';
import AbrControllerMock from './mocks/AbrControllerMock';
import MediaPlayer from './../../src/streaming/MediaPlayer';
import VideoModel from './../../src/streaming/models/VideoModel';
import MediaPlayerModelMock from './mocks//MediaPlayerModelMock';
import MediaControllerMock from './mocks/MediaControllerMock';
import ObjectUtils from './../../src/streaming/utils/ObjectUtils';
import Constants from '../../src/streaming/constants/Constants';
import Settings from '../../src/core/Settings';

const expect = require('chai').expect;
const ELEMENT_NOT_ATTACHED_ERROR = 'You must first call attachView() to set the video element before calling this method';
const PLAYBACK_NOT_INITIALIZED_ERROR = 'You must first call initialize() and set a valid source and view before calling this method';
const STREAMING_NOT_INITIALIZED_ERROR = 'You must first call initialize() and set a source before calling this method';
const MEDIA_PLAYER_NOT_INITIALIZED_ERROR = 'MediaPlayer not initialized!';

describe('MediaPlayer', function () {

    before(function () {
        global.dashjs = {};
    });
    after(function () {
        delete global.dashjs;
    });

    const context = {};
    const specHelper = new SpecHelper();
    let dummyUrl = specHelper.getDummyUrl();

    // init mock
    const videoElementMock = new VideoElementMock();
    const capaMock = new CapabilitiesMock();
    const streamControllerMock = new StreamControllerMock();
    const abrControllerMock = new AbrControllerMock();
    const playbackControllerMock = new PlaybackControllerMock();
    const mediaPlayerModel = new MediaPlayerModelMock();
    const mediaControllerMock = new MediaControllerMock();
    const objectUtils = ObjectUtils(context).getInstance();
    const settings = Settings(context).getInstance();
    let player;

    beforeEach(function () {
        player = MediaPlayer().create();

        // to avoid unwanted log
        const debug = player.getDebug();
        expect(debug).to.exist; // jshint ignore:line

        player.setConfig({
            streamController: streamControllerMock,
            capabilities: capaMock,
            playbackController: playbackControllerMock,
            mediaPlayerModel: mediaPlayerModel,
            abrController: abrControllerMock,
            mediaController: mediaControllerMock,
            settings: settings
        });
    });

    afterEach(function () {
        player = null;
        settings.reset();
    });

    describe('Init Functions', function () {
        describe('When it is not initialized', function () {
            it('Method isReady should return false', function () {
                const isReady = player.isReady();
                expect(isReady).to.be.false; // jshint ignore:line
            });
        });

        describe('When it is initializing', function () {
            it('Method initialize should not initialize if MSE is not supported', function () {
                capaMock.setMediaSourceSupported(false);
                player.initialize(videoElementMock, dummyUrl, false);

                const isReady = player.isReady();
                expect(isReady).to.be.false; // jshint ignore:line

                capaMock.setMediaSourceSupported(true);
            });

            it('Method initialize should send an error if MSE is not supported', function (done) {
                capaMock.setMediaSourceSupported(false);
                const playerError = function (/*e*/) {
                    player.off('error', playerError);

                    const isReady = player.isReady();
                    expect(isReady).to.be.false; // jshint ignore:line

                    // reinit mock
                    capaMock.setMediaSourceSupported(true);
                    done();
                };

                player.on('error', playerError, this);
                player.initialize(videoElementMock, dummyUrl, false);
            });
        });

        describe('When it is initialized', function () {
            beforeEach(function () {
                player.initialize(videoElementMock, dummyUrl, false);
            });
            it('Method isReady should return true', function () {
                const isReady = player.isReady();
                expect(isReady).to.be.true; // jshint ignore:line
            });
        });
    });

    describe('Playback Functions', function () {
        describe('When it is not initialized', function () {
            it('Method play should throw an exception', function () {
                expect(player.play).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });

            it('Method pause should throw an exception', function () {
                expect(player.pause).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });

            it('Method isPaused should throw an exception', function () {
                expect(player.isPaused).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });

            it('Method seek should throw an exception', function () {
                expect(player.seek).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });

            it('Method isSeeking should throw an exception', function () {
                expect(player.isSeeking).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });

            it('Method isDynamic should throw an exception', function () {
                expect(player.isDynamic).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });

            it('Method setPlaybackRate should throw an exception', function () {
                expect(player.setPlaybackRate).to.throw(ELEMENT_NOT_ATTACHED_ERROR);
            });

            it('Method getPlaybackRate should throw an exception', function () {
                expect(player.getPlaybackRate).to.throw(ELEMENT_NOT_ATTACHED_ERROR);
            });

            it('Method setMute should throw an exception', function () {
                expect(player.setMute.bind(player, true)).to.throw(ELEMENT_NOT_ATTACHED_ERROR);
            });

            it('Method isMuted should throw an exception', function () {
                expect(player.isMuted).to.throw(ELEMENT_NOT_ATTACHED_ERROR);
            });

            it('Method setVolume should throw an exception', function () {
                expect(player.setVolume.bind(player, 0.6)).to.throw(ELEMENT_NOT_ATTACHED_ERROR);
            });

            it('Method getVolume should throw an exception', function () {
                expect(player.getVolume).to.throw(ELEMENT_NOT_ATTACHED_ERROR);
            });

            it('Method time should throw an exception', function () {
                expect(player.time).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });

            it('Method duration should throw an exception', function () {
                expect(player.duration).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });

            it('Method timeAsUTC should throw an exception', function () {
                expect(player.timeAsUTC).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });

            it('Method durationAsUTC should throw an exception', function () {
                expect(player.durationAsUTC).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });

        });

        describe('When it is initialized', function () {
            beforeEach(function () {
                playbackControllerMock.reset();
                videoElementMock.reset();
                player.initialize(videoElementMock, dummyUrl, false);
            });

            it('Method getDVRWindowSize should return 0', function () {
                let dvrWindowSize = player.getDVRWindowSize();
                expect(dvrWindowSize).equal(0); // jshint ignore:line
            });

            it('Method getDVRSeekOffset should return 0', function () {
                let dvrSeekOffset = player.getDVRSeekOffset();
                expect(dvrSeekOffset).equal(0); // jshint ignore:line
            });

            it('Method play should start playing', function () {
                let isPlaying = playbackControllerMock.isPlaying();
                expect(isPlaying).to.be.false; // jshint ignore:line

                player.play();

                isPlaying = playbackControllerMock.isPlaying();
                expect(isPlaying).to.be.true; // jshint ignore:line
            });

            it('Method pause should pause playback', function () {
                let paused = playbackControllerMock.isPaused();
                expect(paused).to.be.false; // jshint ignore:line

                player.pause();

                paused = playbackControllerMock.isPaused();
                expect(paused).to.be.true; // jshint ignore:line
            });

            it('Method isPaused should return pause state', function () {
                player.play();

                let paused = player.isPaused();
                expect(paused).to.be.false; // jshint ignore:line

                player.pause();

                paused = player.isPaused();
                expect(paused).to.be.true; // jshint ignore:line

                player.play();

                paused = player.isPaused();
                expect(paused).to.be.false; // jshint ignore:line
            });

            it('Method seek should throw an exception', function () {
                let isSeeking = playbackControllerMock.isSeeking();
                expect(isSeeking).to.be.false; // jshint ignore:line

                expect(player.seek).to.throw(Constants.BAD_ARGUMENT_ERROR);

                isSeeking = playbackControllerMock.isSeeking();
                expect(isSeeking).to.be.false; // jshint ignore:line

                expect(player.seek.bind(player, NaN)).to.throw(Constants.BAD_ARGUMENT_ERROR);

                isSeeking = playbackControllerMock.isSeeking();
                expect(isSeeking).to.be.false; // jshint ignore:line
            });

            it('Method setMute should throw an exception', function () {
                let isMuted = player.isMuted();
                expect(isMuted).to.be.false; // jshint ignore:line

                expect(player.setMute.bind(player, 1)).to.throw(Constants.BAD_ARGUMENT_ERROR);

                isMuted = player.isMuted();
                expect(isMuted).to.be.false; // jshint ignore:line
            });

            it('Method setVolume should throw an exception', function () {
                expect(player.setVolume.bind(player, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
            });

            it('Method setAutoPlay should throw an exception', function () {
                expect(player.setAutoPlay.bind(player, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
                expect(player.setAutoPlay.bind(player, 12)).to.throw(Constants.BAD_ARGUMENT_ERROR);
            });

            it('Method isDynamic should get dynamic value', function () {
                let isDynamic = player.isDynamic();
                expect(isDynamic).to.be.false; // jshint ignore:line

                playbackControllerMock.setIsDynamic(true);
                isDynamic = player.isDynamic();
                expect(isDynamic).to.be.true; // jshint ignore:line
            });

            it('Method setPlaybackRate should change playback value of video element', function () {
                let playbackRate = videoElementMock.playbackRate;
                expect(playbackRate).to.equal(0);

                const newPlaybackRate = 5;
                player.setPlaybackRate(newPlaybackRate);
                playbackRate = videoElementMock.playbackRate;
                expect(playbackRate).to.equal(newPlaybackRate);
            });

            it('Method getPlaybackRate should return video element playback rate', function () {
                const elementPlayBackRate = videoElementMock.playbackRate;
                const playerPlayBackRate = player.getPlaybackRate();
                expect(playerPlayBackRate).to.equal(elementPlayBackRate);
            });

            it('Method setMute should change mute value of video element', function () {
                let isMuted = videoElementMock.muted;
                expect(isMuted).to.be.false; // jshint ignore:line

                player.setMute(true);
                isMuted = videoElementMock.muted;
                expect(isMuted).to.be.true; // jshint ignore:line

                player.setMute(false);
                isMuted = videoElementMock.muted;
                expect(isMuted).to.be.false; // jshint ignore:line
            });

            it('Method isMuted should return mute state', function () {
                let isMuted = player.isMuted();
                expect(isMuted).to.be.false; // jshint ignore:line

                player.setMute(true);
                isMuted = player.isMuted();
                expect(isMuted).to.be.true; // jshint ignore:line

                player.setMute(false);
                isMuted = player.isMuted();
                expect(isMuted).to.be.false; // jshint ignore:line
            });

            it('Method setVolume should change volume value of video element', function () {
                let volume = videoElementMock.volume;
                expect(volume).to.equal(0);

                player.setVolume(0.5);
                volume = videoElementMock.volume;
                expect(volume).to.equal(0.5);

                player.setVolume(0.4);
                volume = videoElementMock.volume;
                expect(volume).to.equal(0.4);
            });

            it('Method getVolume should return mute state', function () {
                let volume = player.getVolume();
                expect(volume).to.equal(0);

                player.setVolume(0.2);
                volume = player.getVolume();
                expect(volume).to.equal(0.2);

                player.setVolume(0.6);
                volume = player.getVolume();
                expect(volume).to.equal(0.6);
            });

            it('Method time should return time of playback', function () {
                let time = player.time();
                expect(time).to.equal(0);

                videoElementMock.currentTime = 15;
                time = player.time();
                expect(time).to.equal(15);

                videoElementMock.currentTime = 4;
                time = player.time();
                expect(time).to.equal(4);
            });

            it('Method duration should return duration of playback', function () {
                let duration = player.duration();
                expect(duration).to.equal(0);

                videoElementMock.duration = 15;
                duration = player.duration();
                expect(duration).to.equal(15);

                videoElementMock.duration = 4;
                duration = player.duration();
                expect(duration).to.equal(4);
            });
        });
    });

    describe('AbrController Functions', function () {
        afterEach(function () {
            abrControllerMock.reset();
            settings.reset();
        });
        it('should configure MaxAllowedBitrateFor', function () {
            let maxAllowedBitrateFor = player.getSettings().streaming.abr.maxBitrate.audio;
            expect(maxAllowedBitrateFor === -1).to.be.true; // jshint ignore:line

            player.updateSettings({
                'streaming': {
                    'abr': {
                        'maxBitrate': {
                            'audio': 5
                        }
                    }
                }
            });

            maxAllowedBitrateFor = player.getSettings().streaming.abr.maxBitrate.audio;
            expect(maxAllowedBitrateFor).to.equal(5);
        });

        it('should configure MinAllowedBitrateFor', function () {
            let minAllowedBitrateFor = player.getSettings().streaming.abr.minBitrate.audio;
            expect(minAllowedBitrateFor === -1).to.be.true; // jshint ignore:line

            player.updateSettings({
                'streaming': {
                    'abr': {
                        'minBitrate': {
                            'audio': 5
                        }
                    }
                }
            });

            minAllowedBitrateFor = player.getSettings().streaming.abr.minBitrate.audio;
            expect(minAllowedBitrateFor).to.equal(5);
        });

        it('should configure MaxAllowedRepresentationRatioFor', function () {
            let maxAllowedRepresentationRatioFor = player.getSettings().streaming.abr.maxRepresentationRatio.audio;
            expect(maxAllowedRepresentationRatioFor).to.equal(1);

            player.updateSettings({
                'streaming': {
                    'abr': {
                        'maxRepresentationRatio': {
                            'audio': 5
                        }
                    }
                }
            });

            maxAllowedRepresentationRatioFor = player.getSettings().streaming.abr.maxRepresentationRatio.audio;
            expect(maxAllowedRepresentationRatioFor).to.equal(5);
        });

        it('should update portal size', function () {
            let elementHeight = abrControllerMock.getElementHeight();
            let elementWidth = abrControllerMock.getElementWidth();
            let windowResizeEventCalled = abrControllerMock.getWindowResizeEventCalled();

            expect(elementHeight).to.be.undefined; // jshint ignore:line
            expect(elementWidth).to.be.undefined; // jshint ignore:line
            expect(windowResizeEventCalled).to.be.false; // jshint ignore:line

            player.updatePortalSize();

            elementHeight = abrControllerMock.getElementHeight();
            elementWidth = abrControllerMock.getElementWidth();
            windowResizeEventCalled = abrControllerMock.getWindowResizeEventCalled();

            expect(elementHeight).to.equal(10);
            expect(elementWidth).to.equal(10);
            expect(windowResizeEventCalled).to.be.true; // jshint ignore:line
        });

        it('should configure bitrate according to playback area size', function () {
            let limitBitrateByPortal = player.getSettings().streaming.abr.limitBitrateByPortal;
            expect(limitBitrateByPortal).to.be.false; // jshint ignore:line

            player.updateSettings({
                'streaming': {
                    'abr': {
                        'limitBitrateByPortal': true
                    }
                }
            });

            limitBitrateByPortal = player.getSettings().streaming.abr.limitBitrateByPortal;
            expect(limitBitrateByPortal).to.be.true; // jshint ignore:line
        });

        it('should configure usePixelRatioInLimitBitrateByPortal', function () {
            let UsePixelRatioInLimitBitrateByPortal = player.getSettings().streaming.abr.usePixelRatioInLimitBitrateByPortal;
            expect(UsePixelRatioInLimitBitrateByPortal).to.be.false; // jshint ignore:line

            player.updateSettings({
                'streaming': {
                    'abr': {
                        'usePixelRatioInLimitBitrateByPortal': true
                    }
                }
            });

            UsePixelRatioInLimitBitrateByPortal = player.getSettings().streaming.abr.usePixelRatioInLimitBitrateByPortal;
            expect(UsePixelRatioInLimitBitrateByPortal).to.be.true; // jshint ignore:line
        });

        it('should configure initialRepresentationRatioFor', function () {
            let initialRepresentationRatioFor = player.getSettings().streaming.abr.initialRepresentationRatio.video;
            expect(initialRepresentationRatioFor).to.equal(-1); // jshint ignore:line

            player.updateSettings({
                'streaming': {
                    'abr': {
                        'initialRepresentationRatio': {
                            'video': 10
                        }
                    }
                }
            });

            initialRepresentationRatioFor = player.getSettings().streaming.abr.initialRepresentationRatio.video;
            expect(initialRepresentationRatioFor).to.equal(10);
        });

        it('should not set setAutoSwitchBitrateFor value if it\'s not a boolean type', function () {
            let autoSwitchBitrateForVideo = player.getSettings().streaming.abr.autoSwitchBitrate.video;
            expect(autoSwitchBitrateForVideo).to.be.true; // jshint ignore:line

            player.updateSettings({
                'streaming': {
                    'abr': {
                        'autoSwitchBitrate': {
                            'video': false
                        }
                    }
                }
            });

            autoSwitchBitrateForVideo = player.getSettings().streaming.abr.autoSwitchBitrate.video;

            expect(autoSwitchBitrateForVideo).to.be.false; // jshint ignore:line
        });

        it('Method getAverageThroughput should return 0 when throughputHistory is not set up', function () {
            const averageThroughput = player.getAverageThroughput(Constants.VIDEO);
            expect(averageThroughput).to.equal(0);
        });

        it('Method getAverageThroughput should value computed from ThroughputHistory', function () {
            const AVERAGE_THROUGHPUT = 2000;
            abrControllerMock.throughputHistory = {
                getAverageThroughput: function () {
                    return AVERAGE_THROUGHPUT;
                }
            };
            const averageThroughput = player.getAverageThroughput(Constants.VIDEO);
            expect(averageThroughput).to.equal(AVERAGE_THROUGHPUT);
        });

        describe('When it is not initialized', function () {
            it('Method getQualityFor should throw an exception', function () {
                expect(player.getQualityFor).to.throw(STREAMING_NOT_INITIALIZED_ERROR);
            });

            it('Method setQualityFor should throw an exception', function () {
                expect(player.setQualityFor).to.throw(STREAMING_NOT_INITIALIZED_ERROR);
            });
        });

        describe('When it is initialized', function () {
            beforeEach(function () {
                player.initialize(videoElementMock, dummyUrl, false);
            });

            it('should configure quality for type', function () {
                let qualityFor = abrControllerMock.getQualityFor('video', {
                    id: 'DUMMY_STREAM-01'
                });
                expect(qualityFor).to.equal(abrControllerMock.QUALITY_DEFAULT());

                qualityFor = player.getQualityFor('video');
                expect(qualityFor).to.equal(abrControllerMock.QUALITY_DEFAULT());

                player.setQualityFor('video', 10);

                qualityFor = abrControllerMock.getQualityFor('video', {
                    id: 'DUMMY_STREAM-01'
                });
                expect(qualityFor).to.equal(10);

                qualityFor = player.getQualityFor('video');
                expect(qualityFor).to.equal(10);
            });

            it('Method getTopBitrateInfoFor should return null when type is undefined', function () {
                const topBitrateInfo = player.getTopBitrateInfoFor();
                expect(topBitrateInfo).to.be.null; // jshint ignore:line
            });
        });
    });

    describe('Media Player Configuration Functions', function () {
        afterEach(function () {
            mediaPlayerModel.reset();
            settings.reset();
        });

        it('should configure autoplay', function () {
            let autoplay = player.getAutoPlay();
            expect(autoplay).to.be.true; // jshint ignore:line

            player.setAutoPlay(false);
            autoplay = player.getAutoPlay();
            expect(autoplay).to.be.false; // jshint ignore:line
        });

        it('should configure LiveDelayFragmentCount', function () {
            let liveDelayFragmentCount = player.getSettings().streaming.delay.liveDelayFragmentCount;
            expect(liveDelayFragmentCount).to.be.NaN; // jshint ignore:line

            player.updateSettings({ 'streaming': { 'delay': { 'liveDelayFragmentCount': 5 } } });

            liveDelayFragmentCount = player.getSettings().streaming.delay.liveDelayFragmentCount;
            expect(liveDelayFragmentCount).to.equal(5);
        });

        it('should configure liveDelay', function () {
            let liveDelay = player.getSettings().streaming.delay.liveDelay;
            expect(liveDelay).to.be.NaN; // jshint ignore:line

            player.updateSettings({ 'streaming': { 'delay': { 'liveDelay': 10 } } });

            liveDelay = player.getSettings().streaming.delay.liveDelay;
            expect(liveDelay).to.equal(10);
        });

        it('should configure useSuggestedPresentationDelay', function () {
            let useSuggestedPresentationDelay = player.getSettings().streaming.delay.useSuggestedPresentationDelay;
            expect(useSuggestedPresentationDelay).to.be.true; // jshint ignore:line

            player.updateSettings({ 'streaming': { 'delay': { 'useSuggestedPresentationDelay': false } } });

            useSuggestedPresentationDelay = player.getSettings().streaming.delay.useSuggestedPresentationDelay;
            expect(useSuggestedPresentationDelay).to.be.false; // jshint ignore:line
        });

        it('should configure scheduleWhilePaused', function () {
            let scheduleWhilePaused = player.getSettings().streaming.scheduling.scheduleWhilePaused;
            expect(scheduleWhilePaused).to.be.true; // jshint ignore:line

            player.updateSettings({ 'streaming': { scheduling: { 'scheduleWhilePaused': false } } });

            scheduleWhilePaused = player.getSettings().streaming.scheduling.scheduleWhilePaused;
            expect(scheduleWhilePaused).to.be.false; // jshint ignore:line
        });

        it('should configure fastSwitchEnabled', function () {
            let fastSwitchEnabled = player.getSettings().streaming.buffer.fastSwitchEnabled;
            expect(fastSwitchEnabled).to.be.true; // jshint ignore:line

            player.updateSettings({ 'streaming': { 'buffer': { 'fastSwitchEnabled': false } } });

            fastSwitchEnabled = player.getSettings().streaming.buffer.fastSwitchEnabled;
            expect(fastSwitchEnabled).to.be.false; // jshint ignore:line
        });

        it('should configure useDefaultABRRules', function () {
            let useDefaultABRRules = player.getSettings().streaming.abr.useDefaultABRRules;
            expect(useDefaultABRRules).to.be.true; // jshint ignore:line

            player.updateSettings({ 'streaming': { 'abr': { 'useDefaultABRRules': false } } });


            useDefaultABRRules = player.getSettings().streaming.abr.useDefaultABRRules;
            expect(useDefaultABRRules).to.be.false; // jshint ignore:line
        });

        it('should manage custom ABR rules', function () {
            let customRules = mediaPlayerModel.getABRCustomRules();
            expect(customRules.length).to.equal(0);

            player.addABRCustomRule('custom', 'testRule', {});

            customRules = mediaPlayerModel.getABRCustomRules();
            expect(customRules.length).to.equal(1);
            expect(customRules[0].rulename).to.equal('testRule');

            player.addABRCustomRule('custom', 'testRule2', {});
            player.addABRCustomRule('custom', 'testRule3', {});
            customRules = mediaPlayerModel.getABRCustomRules();
            expect(customRules.length).to.equal(3);

            player.removeABRCustomRule('testRule');

            customRules = mediaPlayerModel.getABRCustomRules();
            expect(customRules.length).to.equal(2);

            player.removeABRCustomRule();

            customRules = mediaPlayerModel.getABRCustomRules();
            expect(customRules.length).to.equal(0);
        });

        it('should manage UTC timing sources', function () {
            let utcTimingSources = mediaPlayerModel.getUTCTimingSources();
            expect(utcTimingSources.length).to.equal(0);

            player.addUTCTimingSource('urn:mpeg:dash:utc:http-head:2014', 'http://time.akamai.com');
            player.addUTCTimingSource('urn:mpeg:dash:utc:http-iso:2014', 'http://time.akamai.com');

            utcTimingSources = mediaPlayerModel.getUTCTimingSources();
            expect(utcTimingSources.length).to.equal(2);

            player.removeUTCTimingSource('urn:mpeg:dash:utc:http-head:2014', 'http://time.akamai.com');

            utcTimingSources = mediaPlayerModel.getUTCTimingSources();
            expect(utcTimingSources.length).to.equal(1);

            player.clearDefaultUTCTimingSources();
            utcTimingSources = mediaPlayerModel.getUTCTimingSources();
            expect(utcTimingSources.length).to.equal(0);

            player.restoreDefaultUTCTimingSources();
            utcTimingSources = mediaPlayerModel.getUTCTimingSources();
            expect(utcTimingSources.length).to.equal(1);
        });

        it('should configure useManifestDateHeaderTimeSource', function () {
            let useManifestDateHeaderTimeSource = player.getSettings().streaming.utcSynchronization.useManifestDateHeaderTimeSource;
            expect(useManifestDateHeaderTimeSource).to.be.true; // jshint ignore:line

            player.updateSettings({ 'streaming': { utcSynchronization: { 'useManifestDateHeaderTimeSource': false } } });

            useManifestDateHeaderTimeSource = player.getSettings().streaming.utcSynchronization.useManifestDateHeaderTimeSource;
            expect(useManifestDateHeaderTimeSource).to.be.false; // jshint ignore:line
        });

        it('should configure BufferToKeep', function () {
            let BufferToKeep = player.getSettings().streaming.buffer.bufferToKeep;
            expect(BufferToKeep).to.equal(20);

            player.updateSettings({ 'streaming': { 'buffer': { 'bufferToKeep': 50 } } });

            BufferToKeep = player.getSettings().streaming.buffer.bufferToKeep;
            expect(BufferToKeep).to.equal(50);
        });

        it('should configure BufferPruningInterval', function () {
            let BufferPruningInterval = player.getSettings().streaming.buffer.bufferPruningInterval;
            expect(BufferPruningInterval).to.equal(10);

            player.updateSettings({ 'streaming': { 'buffer': { 'bufferPruningInterval': 50 } } });

            BufferPruningInterval = player.getSettings().streaming.buffer.bufferPruningInterval;
            expect(BufferPruningInterval).to.equal(50);
        });

        it('should configure StableBufferTime', function () {
            let StableBufferTime = player.getSettings().streaming.buffer.stableBufferTime;
            expect(StableBufferTime).to.equal(12);
        });

        it('should configure BufferTimeAtTopQuality', function () {
            let BufferTimeAtTopQuality = player.getSettings().streaming.buffer.bufferTimeAtTopQuality;
            expect(BufferTimeAtTopQuality).to.equal(30);

            player.updateSettings({ 'streaming': { 'buffer': { 'bufferTimeAtTopQuality': 50 } } });

            BufferTimeAtTopQuality = player.getSettings().streaming.buffer.bufferTimeAtTopQuality;
            expect(BufferTimeAtTopQuality).to.equal(50);
        });

        it('should configure BufferTimeAtTopQualityLongForm', function () {
            let bufferTimeAtTopQualityLongForm = player.getSettings().streaming.buffer.bufferTimeAtTopQualityLongForm;
            expect(bufferTimeAtTopQualityLongForm).to.equal(60);

            player.updateSettings({ 'streaming': { 'buffer': { 'bufferTimeAtTopQualityLongForm': 50 } } });

            bufferTimeAtTopQualityLongForm = player.getSettings().streaming.buffer.bufferTimeAtTopQualityLongForm;
            expect(bufferTimeAtTopQualityLongForm).to.equal(50);
        });

        it('should configure LongFormContentDurationThreshold', function () {
            let LongFormContentDurationThreshold = player.getSettings().streaming.buffer.longFormContentDurationThreshold;
            expect(LongFormContentDurationThreshold).to.equal(600);

            player.updateSettings({ 'streaming': { 'buffer': { 'longFormContentDurationThreshold': 50 } } });

            LongFormContentDurationThreshold = player.getSettings().streaming.buffer.longFormContentDurationThreshold;
            expect(LongFormContentDurationThreshold).to.equal(50);
        });

        it('should configure cacheLoadThresholds', function () {
            let cacheLoadThresholdForVideo = player.getSettings().streaming.cacheLoadThresholds[Constants.VIDEO];
            expect(cacheLoadThresholdForVideo).to.equal(50);

            player.updateSettings({ 'streaming': { 'cacheLoadThresholds': { 'video': 10 } } });

            cacheLoadThresholdForVideo = player.getSettings().streaming.cacheLoadThresholds[Constants.VIDEO];
            expect(cacheLoadThresholdForVideo).to.equal(10);

            let cacheLoadThresholdForAudio = player.getSettings().streaming.cacheLoadThresholds[Constants.AUDIO];
            expect(cacheLoadThresholdForAudio).to.equal(5);

            player.updateSettings({ 'streaming': { 'cacheLoadThresholds': { 'audio': 2 } } });

            cacheLoadThresholdForAudio = player.getSettings().streaming.cacheLoadThresholds[Constants.AUDIO];
            expect(cacheLoadThresholdForAudio).to.equal(2);
        });

        it('should configure jumpGap feature', function () {
            let jumpGaps = player.getSettings().streaming.gaps.jumpGaps;
            expect(jumpGaps).to.equal(true);

            player.updateSettings({ 'streaming': { 'gaps': { 'jumpGaps': false } } });

            jumpGaps = player.getSettings().streaming.gaps.jumpGaps;
            expect(jumpGaps).to.equal(false);

            let smallGapLimit = player.getSettings().streaming.gaps.smallGapLimit;
            expect(smallGapLimit).to.equal(1.5);

            player.updateSettings({ 'streaming': { 'gaps': { 'smallGapLimit': 0.5 } } });

            smallGapLimit = player.getSettings().streaming.gaps.smallGapLimit;
            expect(smallGapLimit).to.equal(0.5);

            let jumpLargeGaps = player.getSettings().streaming.gaps.jumpLargeGaps;
            expect(jumpLargeGaps).to.be.true;

            player.updateSettings({ 'streaming': { 'gaps': { 'jumpLargeGaps': false } } });

            jumpLargeGaps = player.getSettings().streaming.gaps.jumpLargeGaps;
            expect(jumpLargeGaps).to.be.false;
        });

        it('should configure manifestUpdateRetryInterval', function () {
            let manifestUpdateRetryInterval = player.getSettings().streaming.manifestUpdateRetryInterval;
            expect(manifestUpdateRetryInterval).to.equal(100);

            player.updateSettings({ 'streaming': { 'manifestUpdateRetryInterval': 200 } });

            manifestUpdateRetryInterval = player.getSettings().streaming.manifestUpdateRetryInterval;
            expect(manifestUpdateRetryInterval).to.equal(200);
        });

        it('should configure BandwidthSafetyFactor', function () {
            let bandwidthSafetyFactor = player.getSettings().streaming.abr.bandwidthSafetyFactor;
            expect(bandwidthSafetyFactor).to.equal(0.9);

            player.updateSettings({
                'streaming': {
                    'abr': {
                        'bandwidthSafetyFactor': 0.1
                    }
                }
            });

            bandwidthSafetyFactor = player.getSettings().streaming.abr.bandwidthSafetyFactor;
            expect(bandwidthSafetyFactor).to.equal(0.1);
        });

        it('should configure AbandonLoadTimeout', function () {
            let AbandonLoadTimeout = player.getSettings().streaming.abandonLoadTimeout;
            expect(AbandonLoadTimeout).to.equal(10000);

            player.updateSettings({
                'streaming': {
                    'abandonLoadTimeout': 50
                }
            });

            AbandonLoadTimeout = player.getSettings().streaming.abandonLoadTimeout;
            expect(AbandonLoadTimeout).to.equal(50);
        });

        it('should configure XHRWithCredentials', function () {
            let XHRWithCredentials = mediaPlayerModel.getXHRWithCredentialsForType('GET');
            expect(XHRWithCredentials).to.equal(false);

            XHRWithCredentials = player.getXHRWithCredentialsForType('GET');
            expect(XHRWithCredentials).to.equal(false);

            player.setXHRWithCredentialsForType('GET', true);

            XHRWithCredentials = mediaPlayerModel.getXHRWithCredentialsForType('GET');
            expect(XHRWithCredentials).to.equal(true);

            XHRWithCredentials = player.getXHRWithCredentialsForType('GET');
            expect(XHRWithCredentials).to.equal(true);
        });
    });

    describe('Text Management Functions', function () {
        describe('When it is not initialized', function () {
            it('Method setTextTrack should throw an exception', function () {
                expect(player.setTextTrack).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });

            it('Method enableText should return false', function () {
                const enabled = player.enableText();
                expect(enabled).to.be.false; // jshint ignore:line
            });

            it('Method isTextEnabled should return false', function () {
                const enabled = player.isTextEnabled();
                expect(enabled).to.be.false; // jshint ignore:line
            });


        });
    });

    describe('Video Element Management Functions', function () {
        describe('When it is not initialized', function () {
            it('Method attachView should throw an exception when attaching a view', function () {
                expect(player.attachView).to.throw(MEDIA_PLAYER_NOT_INITIALIZED_ERROR);
            });

            it('Method getVideoElement should throw an exception', function () {
                expect(player.getVideoElement).to.throw(ELEMENT_NOT_ATTACHED_ERROR);
            });

            it('Method attachTTMLRenderingDiv should throw an exception', function () {
                expect(player.getVideoElement).to.throw(ELEMENT_NOT_ATTACHED_ERROR);
            });
        });

        describe('When it is initialized', function () {
            beforeEach(function () {
                player.initialize(videoElementMock, dummyUrl, false);
            });

            it('Method getVideoElement should return video element', function () {

                const element = player.getVideoElement();
                const areEquals = objectUtils.areEqual(element, videoElementMock);
                expect(areEquals).to.be.true; // jshint ignore:line
            });

            it('should be able to attach view', function () {
                let element = player.getVideoElement();
                const objectUtils = ObjectUtils(context).getInstance();
                let areEquals = objectUtils.areEqual(element, videoElementMock);
                expect(areEquals).to.be.true; // jshint ignore:line

                const myNewView = new VideoElementMock();

                player.attachView(myNewView);

                element = player.getVideoElement();

                areEquals = objectUtils.areEqual(element, myNewView);
                expect(areEquals).to.be.true; // jshint ignore:line
            });

            it('should be able to attach TTML renderer div', function () {
                let ttmlRenderer = player.getTTMLRenderingDiv();
                expect(ttmlRenderer).to.be.undefined; // jshint ignore:line

                const myTTMLRenderer = {
                    style: {}
                };

                player.attachTTMLRenderingDiv(myTTMLRenderer);

                ttmlRenderer = player.getTTMLRenderingDiv();
                const areEquals = objectUtils.areEqual(ttmlRenderer, myTTMLRenderer);
                expect(areEquals).to.be.true; // jshint ignore:line
            });

            it('Method attachView should throw an exception when attaching a view which is not VIDEO or AUDIO DOM element', function () {
                player.attachView(null);
                const myNewView = {
                    view: 'view'
                };

                expect(player.attachView.bind(player, myNewView)).to.throw(VideoModel.VIDEO_MODEL_WRONG_ELEMENT_TYPE);
            });
        });
    });

    describe('Stream and Track Management Functions', function () {
        describe('When it is not initialized', function () {
            it('Method getBitrateInfoListFor should throw an exception', function () {
                expect(player.getBitrateInfoListFor).to.throw('You must first call initialize() and set a source before calling this method');
            });

            it('Method getStreamsFromManifest should throw an exception', function () {
                expect(player.getStreamsFromManifest).to.throw('You must first call initialize() and set a source before calling this method');
            });

            it('Method getTracksFor should throw an exception', function () {
                expect(player.getTracksFor).to.throw('You must first call initialize() and set a source before calling this method');
            });

            it('Method getTracksForTypeFromManifest should throw an exception', function () {
                expect(player.getTracksForTypeFromManifest).to.throw('You must first call initialize() and set a source before calling this method');
            });

            it('Method getCurrentTrackFor should throw an exception', function () {
                expect(player.getCurrentTrackFor).to.throw('You must first call initialize() and set a source before calling this method');
            });

            it('Method setCurrentTrack should throw an exception', function () {
                expect(player.setCurrentTrack).to.throw('You must first call initialize() and set a source before calling this method');
            });

            it('Method setInitialMediaSettingsFor should throw an exception', function () {
                expect(player.setInitialMediaSettingsFor).to.throw(MEDIA_PLAYER_NOT_INITIALIZED_ERROR);
            });

            it('Method getInitialMediaSettingsFor should throw an exception', function () {
                expect(player.getInitialMediaSettingsFor).to.throw(MEDIA_PLAYER_NOT_INITIALIZED_ERROR);
            });

            it('Method getCurrentLiveLatency should throw an exception', function () {
                expect(player.getCurrentLiveLatency).to.throw(MEDIA_PLAYER_NOT_INITIALIZED_ERROR);
            });
        });
    });

    describe('Stream and Track Management Functions', function () {
        describe('When it is not initialized', function () {
        });

        describe('When it is initialized', function () {
            beforeEach(function () {
                mediaControllerMock.reset();
                player.initialize(videoElementMock, dummyUrl, false);
                mediaControllerMock.addTrack('track1');
                mediaControllerMock.addTrack('track2');
                mediaControllerMock.setTrack('track1');
            });

            it('Method getBitrateInfoListFor should return bitrate info list', function () {
                const bitrateList = player.getBitrateInfoListFor();
                expect(bitrateList.length).to.equal(2);
            });

            it('Method getTracksFor should return tracks', function () {
                const tracks = player.getTracksFor();
                expect(tracks.length).to.equal(2);
            });

            it('Method getCurrentTrackFor should return current track', function () {
                const track = player.getCurrentTrackFor();
                expect(track).to.equal('track1');
            });

            it('should configure initial media settings', function () {
                let initialSettings = player.getInitialMediaSettingsFor('audio');
                expect(initialSettings).to.not.exist; // jshint ignore:line

                player.setInitialMediaSettingsFor('audio', 'settings');

                initialSettings = player.getInitialMediaSettingsFor('audio');
                expect(initialSettings).to.equal('settings');

                player.setInitialMediaSettingsFor('text', { lang: 'en', role: 'caption' });
                initialSettings = player.getInitialMediaSettingsFor('text');
                expect(initialSettings).to.exist; // jshint ignore:line
                expect(initialSettings.lang).to.equal('en');
                expect(initialSettings.role).to.equal('caption');

            });

            it('should set current track', function () {
                let currentTrack = mediaControllerMock.isCurrentTrack('audio');
                expect(currentTrack).to.be.false; // jshint ignore:line

                player.setCurrentTrack('audio');

                currentTrack = mediaControllerMock.isCurrentTrack('audio');
                expect(currentTrack).to.be.true; // jshint ignore:line
            });
        });
    });

    describe('Protection Management Functions', function () {
    });

    describe('Tools Functions', function () {
        describe('When it is not initialized', function () {
            it('Method attachSource should throw an exception', function () {
                expect(player.attachSource).to.throw(MediaPlayer.NOT_INITIALIZED_ERROR_MSG);
            });
        });
    });

    describe('Metrics Functions', function () {
        describe('When it is initialized', function () {
            beforeEach(function () {
                player.initialize(videoElementMock, dummyUrl, false);
            });

            it('Method getDashMetrics should return dash metrics', function () {
                const metricsExt = player.getDashMetrics();
                expect(metricsExt).to.exist; // jshint ignore:line
            });

            it('Method getBufferLength should return 0 when no type is defined', function () {
                const bufferLength = player.getBufferLength();
                expect(bufferLength).to.equals(0); // jshint ignore:line
            });

            it('Method getBufferLength should return NaN when type is Muxed', function () {
                const bufferLength = player.getBufferLength(Constants.MUXED);
                expect(bufferLength).to.be.NaN; // jshint ignore:line
            });

            it('Method getBufferLength should return NaN when type is Video', function () {
                const bufferLength = player.getBufferLength(Constants.VIDEO);
                expect(bufferLength).to.be.NaN; // jshint ignore:line
            });
        });
    });
});
