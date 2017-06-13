// jshint ignore:start

import SpecHelper from './helpers/SpecHelper';
import VideoElementMock from './mocks/VideoElementMock';
import StreamControllerMock from './mocks/StreamControllerMock';
import CapabilitiesMock from './mocks/CapabilitiesMock';
import PlaybackControllerMock from './mocks/PlaybackControllerMock';
import MediaPlayer from './../../src/streaming/MediaPlayer';
import MediaPlayerModelMock from './mocks//MediaPlayerModelMock';

const expect = require('chai').expect;

describe.only("MediaPlayer", function () {

    before(function () {
        global.dashjs = {};
    });

    let NOT_INITIALIZED_ERROR_MSG = "MediaPlayer not initialized!";
    let PLAYBACK_NOT_INITIALIZED_ERROR = 'You must first call initialize() to init playback before calling this method';
    let ELEMENT_NOT_ATTACHED_ERROR = 'You must first call attachView() to set the video element before calling this method';

    const specHelper = new SpecHelper();
    let dummyUrl = specHelper.getDummyUrl();

    // init mock
    let videoElementMock = new VideoElementMock;
    let capaMock = CapabilitiesMock().getInstance();
    let streamControllerMock = StreamControllerMock().getInstance();
    let playbackControllerMock = PlaybackControllerMock().getInstance();
    let mediaPlayerModel = MediaPlayerModelMock().getInstance();
    let player;

    beforeEach(function () {
        player = MediaPlayer().create();

        // to avoid unwanted log
        let debug = player.getDebug();
        expect(debug).to.exist;
        debug.setLogToBrowserConsole(false);

        player.setConfig({
            streamController: streamControllerMock,
            capabilities: capaMock,
            playbackController: playbackControllerMock,
            mediaPlayerModel: mediaPlayerModel
        });
    });

    afterEach(function () {
        player = null;
    });

    describe("Init Functions", function () {
        describe("When it is not initialized", function () {
            it("Method isReady should return false", function () {
                let isReady = player.isReady();
                expect(isReady).to.be.false;
            });
        });

        describe("When it is initializing", function () {
            it("Method initialize should not initialize if MSE is not supported", function () {
                capaMock.setMediaSourceSupported(false);
                player.initialize(videoElementMock, dummyUrl, false);

                let isReady = player.isReady();
                expect(isReady).to.be.false;

                capaMock.setMediaSourceSupported(true);
            });

            it("Method initialize should not initialize if MSE is not supported", function () {
                capaMock.setMediaSourceSupported(false);
                let playerError = function (e) {
                    player.off('error', playerError);

                    let isReady = player.isReady();
                    expect(isReady).to.be.false;

                    // reinit mock
                    capaMock.setMediaSourceSupported(true);
                }

                player.on('error', playerError, this);
                player.initialize(videoElementMock, dummyUrl, false);
            });
        });

        describe("When it is initialized", function () {
            beforeEach(function () {
                player.initialize(videoElementMock, dummyUrl, false);
            });
            it("Method isReady should return false", function () {
                let isReady = player.isReady();
                expect(isReady).to.be.true;
            });
        });
    });

    describe("Playback Functions", function () {
        describe("When it is not initialized", function () {
            it("Method play should throw an exception", function () {
                expect(player.play).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });

            it("Method pause should throw an exception", function () {
                expect(player.pause).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });

            it("Method isPaused should throw an exception", function () {
                expect(player.isPaused).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });

            it("Method seek should throw an exception", function () {
                expect(player.seek).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });

            it("Method isSeeking should throw an exception", function () {
                expect(player.isSeeking).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });

            it("Method isDynamic should throw an exception", function () {
                expect(player.isDynamic).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });

            it("Method setMute should throw an exception", function () {
                expect(player.setMute).to.throw(ELEMENT_NOT_ATTACHED_ERROR);
            });

            it("Method isMuted should throw an exception", function () {
                expect(player.isMuted).to.throw(ELEMENT_NOT_ATTACHED_ERROR);
            });

            it("Method setVolume should throw an exception", function () {
                expect(player.setVolume).to.throw(ELEMENT_NOT_ATTACHED_ERROR);
            });

            it("Method getVolume should throw an exception", function () {
                expect(player.getVolume).to.throw(ELEMENT_NOT_ATTACHED_ERROR);
            });

            it("Method time should throw an exception", function () {
                expect(player.time).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });

            it("Method duration should throw an exception", function () {
                expect(player.duration).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });

            it("Method timeAsUTC should throw an exception", function () {
                expect(player.timeAsUTC).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });

            it("Method durationAsUTC should throw an exception", function () {
                expect(player.durationAsUTC).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });
        });

        describe("When it is initialized", function () {
            beforeEach(function () {
                playbackControllerMock.reset();
                videoElementMock.reset();
                player.initialize(videoElementMock, dummyUrl, false);
            });

            it("Method play should start playing", function () {
                let isPlaying = playbackControllerMock.isPlaying();
                expect(isPlaying).to.be.false;

                player.play();

                isPlaying = playbackControllerMock.isPlaying();
                expect(isPlaying).to.be.true;
            });
            it("Method pause should pause playback", function () {
                let paused = playbackControllerMock.isPaused();
                expect(paused).to.be.false;

                player.pause();

                paused = playbackControllerMock.isPaused();
                expect(paused).to.be.true;
            });

            it("Method isPaused should return pause state", function () {
                player.play();

                let paused = player.isPaused();
                expect(paused).to.be.false;

                player.pause();

                paused = player.isPaused();
                expect(paused).to.be.true;

                player.play();

                paused = player.isPaused();
                expect(paused).to.be.false;
            });

            it("Method seek should seek", function () {
                let isSeeking = playbackControllerMock.isSeeking();
                expect(isSeeking).to.be.false;

                player.seek();

                isSeeking = playbackControllerMock.isSeeking();
                expect(isSeeking).to.be.true;
            });

            it("Method isSeeking should return seek state", function () {
                let isSeeking = player.isSeeking();
                expect(isSeeking).to.be.false;

                player.seek();

                isSeeking = player.isSeeking();
                expect(isSeeking).to.be.true;
            });

            it("Method isDynamic should get dynamic value", function () {
                let isDynamic = player.isDynamic();
                expect(isDynamic).to.be.false;

                playbackControllerMock.setisDynamic(true);
                isDynamic = player.isDynamic();
                expect(isDynamic).to.be.true;

            });

            it("Method setMute should change mute value of video element", function () {
                let isMuted = videoElementMock.muted;
                expect(isMuted).to.be.false;

                player.setMute(true);
                isMuted = videoElementMock.muted;
                expect(isMuted).to.be.true;

                player.setMute(false);
                isMuted = videoElementMock.muted;
                expect(isMuted).to.be.false;
            });

            it("Method isMuted should return mute state", function () {
                let isMuted = player.isMuted();
                expect(isMuted).to.be.false;

                player.setMute(true);
                isMuted = player.isMuted();
                expect(isMuted).to.be.true;

                player.setMute(false);
                isMuted = player.isMuted();
                expect(isMuted).to.be.false;
            });

            it("Method setVolume should change volume value of video element", function () {
                let volume = videoElementMock.volume;
                expect(volume).to.equal(0);

                player.setVolume(15);
                volume = videoElementMock.volume;
                expect(volume).to.equal(15);

                player.setVolume(4);
                volume = videoElementMock.volume;
                expect(volume).to.equal(4);
            });

            it("Method getVolume should return mute state", function () {
                let volume = player.getVolume();
                expect(volume).to.equal(0);

                player.setVolume(15);
                volume = player.getVolume();
                expect(volume).to.equal(15);

                player.setVolume(4);
                volume = player.getVolume();
                expect(volume).to.equal(4);
            });

            it("Method time should return time of playback", function () {
                let time = player.time();
                expect(time).to.equal(0);

                videoElementMock.currentTime = 15;
                time = player.time();
                expect(time).to.equal(15);

                videoElementMock.currentTime = 4;
                time = player.time();
                expect(time).to.equal(4);
            });

            it("Method duration should return duration of playback", function () {
                let duration = player.duration();
                expect(duration).to.equal(0);

                videoElementMock.duration = 15;
                duration = player.duration();
                expect(duration).to.equal(15);

                videoElementMock.duration = 4;
                duration = player.duration();
                expect(duration).to.equal(4);
            });
            //
            //            it("Method timeAsUTC should throw an exception", function () {});
            //
            //            it("Method durationAsUTC should throw an exception", function () {});
        });

    });

    describe("AutoBitrate Functions", function () {
        describe("When it is not initialized", function () {
            it("Method getQualityFor should throw an exception", function () {
                expect(player.getQualityFor).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });

            it("Method setQualityFor should throw an exception", function () {
                expect(player.setQualityFor).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });

            it("Method getInitialBitrateFor should throw an exception", function () {
                expect(player.getInitialBitrateFor).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });
        });
    });

    describe("Media Player Configuration Functions", function () {
        afterEach(function() {
            mediaPlayerModel.reset();
        })

        it("should configure autoplay", function () {
            let autoplay = player.getAutoPlay();
            expect(autoplay).to.be.true;

            player.setAutoPlay(false);
            autoplay = player.getAutoPlay();
            expect(autoplay).to.be.false;
        });

        it("should configure LiveDelayFragmentCount", function () {
            let liveDelayFragmentCount = mediaPlayerModel.getLiveDelayFragmentCount();
            expect(liveDelayFragmentCount).to.equal(4);

            player.setLiveDelayFragmentCount(5);

            liveDelayFragmentCount = mediaPlayerModel.getLiveDelayFragmentCount();
            expect(liveDelayFragmentCount).to.equal(5);
        });

        it("should configure LiveDelay", function () {
            let livedelay = mediaPlayerModel.getLiveDelay();
            expect(livedelay).to.be.undefined

            livedelay = player.getLiveDelay();
            expect(livedelay).to.be.undefined

            player.setLiveDelay(5);

            livedelay = mediaPlayerModel.getLiveDelay();
            expect(livedelay).to.equal(5);

            livedelay = player.getLiveDelay();
            expect(livedelay).to.equal(5);
        });

        it("should configure useSuggestedPresentationDelay", function () {
            let useSuggestedPresentationDelay = mediaPlayerModel.getUseSuggestedPresentationDelay();
            expect(useSuggestedPresentationDelay).to.be.false

            player.useSuggestedPresentationDelay(true);

            useSuggestedPresentationDelay = mediaPlayerModel.getUseSuggestedPresentationDelay();
            expect(useSuggestedPresentationDelay).to.be.true
        });

        it("should configure LastBitrateCachingInfo", function () {
            let lastBitrateCachingInfo = mediaPlayerModel.getLastBitrateCachingInfo();
            expect(lastBitrateCachingInfo.enabled).to.be.true;
            expect(lastBitrateCachingInfo.ttl).to.equal(360000);

            player.enableLastBitrateCaching(false, 10000);

            lastBitrateCachingInfo = mediaPlayerModel.getLastBitrateCachingInfo();
            expect(lastBitrateCachingInfo.enabled).to.be.false;
            expect(lastBitrateCachingInfo.ttl).to.equal(10000);
        });

        it("should configure lastMediaSettingsCaching", function () {
            let lastMediaSettingsCaching = mediaPlayerModel.getLastMediaSettingsCachingInfo();
            expect(lastMediaSettingsCaching.enabled).to.be.true;
            expect(lastMediaSettingsCaching.ttl).to.equal(360000);

            player.enableLastMediaSettingsCaching(false, 10000);

            lastMediaSettingsCaching = mediaPlayerModel.getLastMediaSettingsCachingInfo();
            expect(lastMediaSettingsCaching.enabled).to.be.false;
            expect(lastMediaSettingsCaching.ttl).to.equal(10000);
        });

        it("should configure scheduleWhilePaused", function () {
            let scheduleWhilePaused = mediaPlayerModel.getScheduleWhilePaused();
            expect(scheduleWhilePaused).to.be.true;

            scheduleWhilePaused = player.getScheduleWhilePaused();
            expect(scheduleWhilePaused).to.be.true;

            player.setScheduleWhilePaused(false);

            scheduleWhilePaused = mediaPlayerModel.getScheduleWhilePaused();
            expect(scheduleWhilePaused).to.be.false;

            scheduleWhilePaused = player.getScheduleWhilePaused();
            expect(scheduleWhilePaused).to.be.false;
        });

        it("should configure fastSwitchEnabled", function () {
            let fastSwitchEnabled = mediaPlayerModel.getFastSwitchEnabled();
            expect(fastSwitchEnabled).to.be.false;

            fastSwitchEnabled = player.getFastSwitchEnabled();
            expect(fastSwitchEnabled).to.be.false;

            player.setFastSwitchEnabled(true);

            fastSwitchEnabled = mediaPlayerModel.getFastSwitchEnabled();
            expect(fastSwitchEnabled).to.be.true;

            fastSwitchEnabled = player.getFastSwitchEnabled();
            expect(fastSwitchEnabled).to.be.true;
        });

        it("should configure bufferOccupancyABR", function () {
            let bufferOccupancyABR = mediaPlayerModel.getBufferOccupancyABREnabled();
            expect(bufferOccupancyABR).to.be.false;

            player.enableBufferOccupancyABR(true);

            bufferOccupancyABR = mediaPlayerModel.getBufferOccupancyABREnabled();
            expect(bufferOccupancyABR).to.be.true;
        });

        it("should configure useDefaultABRRules", function () {
            let useDefaultABRRules = mediaPlayerModel.getUseDefaultABRRules();
            expect(useDefaultABRRules).to.be.true;

            player.useDefaultABRRules(false);

            useDefaultABRRules = mediaPlayerModel.getUseDefaultABRRules();
            expect(useDefaultABRRules).to.be.false;
        });

        it("should manage custom ABR rules", function () {
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

            player.removeAllABRCustomRule();

            customRules = mediaPlayerModel.getABRCustomRules();
            expect(customRules.length).to.equal(0);
        });

        it("should manage UTC timing sources", function () {
            let utcTimingSources = mediaPlayerModel.getUTCTimingSources();
            expect(utcTimingSources.length).to.equal(0);

            player.addUTCTimingSource('urn:mpeg:dash:utc:http-head:2014', 'http://time.akamai.com');
            player.addUTCTimingSource('urn:mpeg:dash:utc:http-iso:2014', 'http://time.akamai.com')

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

        it("should configure useManifestDateHeaderTimeSource", function () {
            let useManifestDateHeaderTimeSource = mediaPlayerModel.getUseManifestDateHeaderTimeSource();
            expect(useManifestDateHeaderTimeSource).to.be.true;

            player.enableManifestDateHeaderTimeSource(false);

            useManifestDateHeaderTimeSource = mediaPlayerModel.getUseManifestDateHeaderTimeSource();
            expect(useManifestDateHeaderTimeSource).to.be.false;
        });

        it("should configure BufferToKeep", function () {
            let BufferToKeep = mediaPlayerModel.getBufferToKeep();
            expect(BufferToKeep).to.equal(30);

            player.setBufferToKeep(50);

            BufferToKeep = mediaPlayerModel.getBufferToKeep();
            expect(BufferToKeep).to.equal(50);
        });

        it("should configure BufferPruningInterval", function () {
            let BufferPruningInterval = mediaPlayerModel.getBufferPruningInterval();
            expect(BufferPruningInterval).to.equal(30);

            player.setBufferPruningInterval(50);

            BufferPruningInterval = mediaPlayerModel.getBufferPruningInterval();
            expect(BufferPruningInterval).to.equal(50);
        });

        it("should configure StableBufferTime", function () {
            let StableBufferTime = mediaPlayerModel.getStableBufferTime();
            expect(StableBufferTime).to.equal(12); // fast switch enabled

            player.setStableBufferTime(50);

            StableBufferTime = mediaPlayerModel.getStableBufferTime();
            expect(StableBufferTime).to.equal(50);
        });

        it("should configure BufferTimeAtTopQuality", function () {
            let BufferTimeAtTopQuality = mediaPlayerModel.getBufferTimeAtTopQuality();
            expect(BufferTimeAtTopQuality).to.equal(30);

            player.setBufferTimeAtTopQuality(50);

            BufferTimeAtTopQuality = mediaPlayerModel.getBufferTimeAtTopQuality();
            expect(BufferTimeAtTopQuality).to.equal(50);
        });

        it("should configure BufferTimeAtTopQualityLongForm", function () {
            let BufferTimeAtTopQualityLongForm = mediaPlayerModel.getBufferTimeAtTopQualityLongForm();
            expect(BufferTimeAtTopQualityLongForm).to.equal(60);

            player.setBufferTimeAtTopQualityLongForm(50);

            BufferTimeAtTopQualityLongForm = mediaPlayerModel.getBufferTimeAtTopQualityLongForm();
            expect(BufferTimeAtTopQualityLongForm).to.equal(50);
        });

        it("should configure LongFormContentDurationThreshold", function () {
            let LongFormContentDurationThreshold = mediaPlayerModel.getLongFormContentDurationThreshold();
            expect(LongFormContentDurationThreshold).to.equal(600);

            player.setLongFormContentDurationThreshold(50);

            LongFormContentDurationThreshold = mediaPlayerModel.getLongFormContentDurationThreshold();
            expect(LongFormContentDurationThreshold).to.equal(50);
        });

        it("should configure RichBufferThreshold", function () {
            let RichBufferThreshold = mediaPlayerModel.getRichBufferThreshold();
            expect(RichBufferThreshold).to.equal(20);

            player.setRichBufferThreshold(50);

            RichBufferThreshold = mediaPlayerModel.getRichBufferThreshold();
            expect(RichBufferThreshold).to.equal(50);
        });

        it("should configure BandwidthSafetyFactor", function () {
            let BandwidthSafetyFactor = mediaPlayerModel.getBandwidthSafetyFactor();
            expect(BandwidthSafetyFactor).to.equal(0.9);

            BandwidthSafetyFactor = player.getBandwidthSafetyFactor();
            expect(BandwidthSafetyFactor).to.equal(0.9);

            player.setBandwidthSafetyFactor(0.1);

            BandwidthSafetyFactor = mediaPlayerModel.getBandwidthSafetyFactor();
            expect(BandwidthSafetyFactor).to.equal(0.1);

            BandwidthSafetyFactor = player.getBandwidthSafetyFactor();
            expect(BandwidthSafetyFactor).to.equal(0.1);
        });

        it("should configure AbandonLoadTimeout", function () {
            let AbandonLoadTimeout = mediaPlayerModel.getAbandonLoadTimeout();
            expect(AbandonLoadTimeout).to.equal(10000);

            player.setAbandonLoadTimeout(50);

            AbandonLoadTimeout = mediaPlayerModel.getAbandonLoadTimeout();
            expect(AbandonLoadTimeout).to.equal(50);
        });

        it("should configure FragmentLoaderRetryAttempts", function () {
            let FragmentLoaderRetryAttempts = mediaPlayerModel.getFragmentRetryAttempts();
            expect(FragmentLoaderRetryAttempts).to.equal(3);

            player.setFragmentLoaderRetryAttempts(50);

            FragmentLoaderRetryAttempts = mediaPlayerModel.getFragmentRetryAttempts();
            expect(FragmentLoaderRetryAttempts).to.equal(50);
        });

        it("should configure FragmentLoaderRetryInterval", function () {
            let FragmentLoaderRetryInterval = mediaPlayerModel.getFragmentRetryInterval();
            expect(FragmentLoaderRetryInterval).to.equal(1000);

            player.setFragmentLoaderRetryInterval(50);

            FragmentLoaderRetryInterval = mediaPlayerModel.getFragmentRetryInterval();
            expect(FragmentLoaderRetryInterval).to.equal(50);
        });

        it("should configure ManifestLoaderRetryAttempts", function () {
            let ManifestLoaderRetryAttempts = mediaPlayerModel.getManifestRetryAttempts();
            expect(ManifestLoaderRetryAttempts).to.equal(3);

            player.setManifestLoaderRetryAttempts(50);

            ManifestLoaderRetryAttempts = mediaPlayerModel.getManifestRetryAttempts();
            expect(ManifestLoaderRetryAttempts).to.equal(50);
        });

        it("should configure ManifestLoaderRetryInterval", function () {
            let ManifestLoaderRetryInterval = mediaPlayerModel.getManifestRetryInterval();
            expect(ManifestLoaderRetryInterval).to.equal(500);

            player.setManifestLoaderRetryInterval(50);

            ManifestLoaderRetryInterval = mediaPlayerModel.getManifestRetryInterval();
            expect(ManifestLoaderRetryInterval).to.equal(50);
        });

        it("should configure XHRWithCredentials", function () {
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

    describe("Text Management Functions", function () {});

    describe("Video Element Management Functions", function () {
        describe("When it is not initialized", function () {
            it("Method attachView should throw an exception when attaching a view", function () {
                expect(player.attachView).to.throw(NOT_INITIALIZED_ERROR_MSG);
            });

            it("Method getVideoElement should throw an exception", function () {
                expect(player.getVideoElement).to.throw(ELEMENT_NOT_ATTACHED_ERROR);
            });
        });
    });

    describe("Stream and Track Management Functions", function () {});

    describe("Protection Management Functions", function () {});

    describe("Tools Functions", function () {
        describe("When it is not initialized", function () {
            it("Method attachSource should throw an exception", function () {
                expect(player.attachSource).to.throw(NOT_INITIALIZED_ERROR_MSG);
            });
        });
    });



    describe("Playback Functions", function () {});

    describe("AutoBitrate Functions", function () {});

    describe("Metrics Functions", function () {

        describe("When it is initialized", function () {
            beforeEach(function () {
                player.initialize(videoElementMock, dummyUrl, false);
            });

            it("Method getDashMetrics should return dash metrics", function () {
                let metricsExt = player.getDashMetrics();
                expect(metricsExt).to.exist;
            });

            it("Method getMetricsFor should return no metrics", function () {
                let audioMetrics = player.getMetricsFor("audio"),
                    videoMetrics = player.getMetricsFor("video");

                expect(audioMetrics).to.be.null;
                expect(videoMetrics).to.be.null;
            });
        });
    });

    describe("Text Management Functions", function () {});

    describe("Video Element Management Functions", function () {});

    describe("Stream and Track Management Functions", function () {});

    describe("Protection Management Functions", function () {});

    describe("Tools Functions", function () {});

});
