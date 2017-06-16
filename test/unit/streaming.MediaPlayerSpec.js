// jshint ignore:start

import SpecHelper from './helpers/SpecHelper';
import VideoElementMock from './mocks/VideoElementMock';
import StreamControllerMock from './mocks/StreamControllerMock';
import CapabilitiesMock from './mocks/CapabilitiesMock';
import PlaybackControllerMock from './mocks/PlaybackControllerMock';
import AbrControllerMock from './mocks/AbrControllerMock';
import MediaPlayer from './../../src/streaming/MediaPlayer';
import MediaPlayerModelMock from './mocks//MediaPlayerModelMock';
import MediaControllerMock from './mocks/MediaControllerMock';
import ObjectUtils from './../../src/streaming/utils/ObjectUtils';

const expect = require('chai').expect;

describe("MediaPlayer", function () {

    before(function () {
        global.dashjs = {};
    });
    after(function () {
        delete global.dashjs;
    });

    let NOT_INITIALIZED_ERROR_MSG = "MediaPlayer not initialized!";
    let PLAYBACK_NOT_INITIALIZED_ERROR = 'You must first call initialize() to init playback before calling this method';
    let ELEMENT_NOT_ATTACHED_ERROR = 'You must first call attachView() to set the video element before calling this method';

    const specHelper = new SpecHelper();
    let dummyUrl = specHelper.getDummyUrl();

    // init mock
    let videoElementMock = new VideoElementMock();
    let capaMock = new CapabilitiesMock();
    let streamControllerMock = new StreamControllerMock();
    let abrControllerMock = new AbrControllerMock();
    let playbackControllerMock = new PlaybackControllerMock();
    let mediaPlayerModel = new MediaPlayerModelMock();
    let mediaControllerMock = new MediaControllerMock();
    let objectUtils = ObjectUtils(context).getInstance();
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
            mediaPlayerModel: mediaPlayerModel,
            abrController: abrControllerMock,
            mediaController: mediaControllerMock
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

                playbackControllerMock.setIsDynamic(true);
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
        afterEach(function () {
            abrControllerMock.reset();
        })
        it("should configure MaxAllowedBitrateFor", function () {
            let MaxAllowedBitrateFor = abrControllerMock.getMaxAllowedBitrateFor('audio');
            expect(isNaN(MaxAllowedBitrateFor)).to.be.true;

            MaxAllowedBitrateFor = player.getMaxAllowedBitrateFor('audio');
            expect(isNaN(MaxAllowedBitrateFor)).to.be.true;

            player.setMaxAllowedBitrateFor('audio', 5);

            MaxAllowedBitrateFor = abrControllerMock.getMaxAllowedBitrateFor('audio');
            expect(MaxAllowedBitrateFor).to.equal(5);

            MaxAllowedBitrateFor = player.getMaxAllowedBitrateFor('audio');
            expect(MaxAllowedBitrateFor).to.equal(5);
        });

        it("should configure MinAllowedBitrateFor", function () {
            let MinAllowedBitrateFor = abrControllerMock.getMinAllowedBitrateFor('audio');
            expect(isNaN(MinAllowedBitrateFor)).to.be.true;

            MinAllowedBitrateFor = player.getMinAllowedBitrateFor('audio');
            expect(isNaN(MinAllowedBitrateFor)).to.be.true;

            player.setMinAllowedBitrateFor('audio', 5);

            MinAllowedBitrateFor = abrControllerMock.getMinAllowedBitrateFor('audio');
            expect(MinAllowedBitrateFor).to.equal(5);

            MinAllowedBitrateFor = player.getMinAllowedBitrateFor('audio');
            expect(MinAllowedBitrateFor).to.equal(5);
        });

        it("should configure MaxAllowedRepresentationRatioFor", function () {
            let MaxAllowedRepresentationRatioFor = abrControllerMock.getMaxAllowedRepresentationRatioFor('audio');
            expect(MaxAllowedRepresentationRatioFor).to.equal(1);

            MaxAllowedRepresentationRatioFor = player.getMaxAllowedRepresentationRatioFor('audio');
            expect(MaxAllowedRepresentationRatioFor).to.equal(1);

            player.setMaxAllowedRepresentationRatioFor('audio', 5);

            MaxAllowedRepresentationRatioFor = abrControllerMock.getMaxAllowedRepresentationRatioFor('audio');
            expect(MaxAllowedRepresentationRatioFor).to.equal(5);

            MaxAllowedRepresentationRatioFor = player.getMaxAllowedRepresentationRatioFor('audio');
            expect(MaxAllowedRepresentationRatioFor).to.equal(5);
        });

        it("should update portal size", function () {
            let elementHeight = abrControllerMock.getElementHeight();
            let elementWidth = abrControllerMock.getElementWidth();
            let windowResizeEventCalled = abrControllerMock.getWindowResizeEventCalled();

            expect(elementHeight).to.be.undefined;
            expect(elementWidth).to.be.undefined;
            expect(windowResizeEventCalled).to.be.false;

            player.updatePortalSize();

            elementHeight = abrControllerMock.getElementHeight();
            elementWidth = abrControllerMock.getElementWidth();
            windowResizeEventCalled = abrControllerMock.getWindowResizeEventCalled();

            expect(elementHeight).to.equal(10);
            expect(elementWidth).to.equal(10);
            expect(windowResizeEventCalled).to.be.true;
        });

        it("should configure bitrate according to playback area size", function () {
            let limitBitrateByPortal = abrControllerMock.getLimitBitrateByPortal();
            expect(limitBitrateByPortal).to.be.false;

            limitBitrateByPortal = player.getLimitBitrateByPortal();
            expect(limitBitrateByPortal).to.be.false;

            player.setLimitBitrateByPortal(true);

            limitBitrateByPortal = abrControllerMock.getLimitBitrateByPortal();
            expect(limitBitrateByPortal).to.be.true;

            limitBitrateByPortal = player.getLimitBitrateByPortal();
            expect(limitBitrateByPortal).to.be.true;
        });

        it("should configure usePixelRatioInLimitBitrateByPortal", function () {
            let UsePixelRatioInLimitBitrateByPortal = abrControllerMock.getUsePixelRatioInLimitBitrateByPortal();
            expect(UsePixelRatioInLimitBitrateByPortal).to.be.false;

            UsePixelRatioInLimitBitrateByPortal = player.getUsePixelRatioInLimitBitrateByPortal();
            expect(UsePixelRatioInLimitBitrateByPortal).to.be.false;

            player.setUsePixelRatioInLimitBitrateByPortal(true);

            UsePixelRatioInLimitBitrateByPortal = abrControllerMock.getUsePixelRatioInLimitBitrateByPortal();
            expect(UsePixelRatioInLimitBitrateByPortal).to.be.true;

            UsePixelRatioInLimitBitrateByPortal = player.getUsePixelRatioInLimitBitrateByPortal();
            expect(UsePixelRatioInLimitBitrateByPortal).to.be.true;
        });

        it("should configure initialRepresentationRatioFor", function () {
            let initialRepresentationRatioFor = abrControllerMock.getInitialRepresentationRatioFor('video');
            expect(initialRepresentationRatioFor).to.be.null;

            initialRepresentationRatioFor = player.getInitialRepresentationRatioFor('video');
            expect(initialRepresentationRatioFor).to.be.null;

            player.setInitialRepresentationRatioFor('video', 10);

            initialRepresentationRatioFor = abrControllerMock.getInitialRepresentationRatioFor('video');
            expect(initialRepresentationRatioFor).to.equal(10);

            initialRepresentationRatioFor = player.getInitialRepresentationRatioFor('video');
            expect(initialRepresentationRatioFor).to.equal(10);
        });

        it("should configure AutoSwitchBitrateForType", function () {
            let AutoSwitchBitrateFor = abrControllerMock.getAutoSwitchBitrateFor('video');
            expect(AutoSwitchBitrateFor).to.be.true;

            player.setAutoSwitchQualityFor('video', false);

            AutoSwitchBitrateFor = abrControllerMock.getAutoSwitchBitrateFor('video');
            expect(AutoSwitchBitrateFor).to.be.false;
        });

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

        describe("When it is initialized", function () {

            beforeEach(function () {
                player.initialize(videoElementMock, dummyUrl, false);
            });

            it("should configure quality for type", function () {
                let qualityFor = abrControllerMock.getQualityFor('video', {
                    id: 'dummyId'
                });
                expect(qualityFor).to.equal(AbrControllerMock.QUALITY_DEFAULT);

                qualityFor = player.getQualityFor('video');
                expect(qualityFor).to.equal(AbrControllerMock.QUALITY_DEFAULT);

                player.setQualityFor('video', 10);

                qualityFor = abrControllerMock.getQualityFor('video', {
                    id: 'dummyId'
                });
                expect(qualityFor).to.equal(10);

                qualityFor = player.getQualityFor('video');
                expect(qualityFor).to.equal(10);
            });

            it("should configure initial bitrate for type", function () {
                let initialBitrateFor = abrControllerMock.getInitialBitrateFor('video');
                expect(initialBitrateFor).to.be.null;

                initialBitrateFor = player.getInitialBitrateFor('video');
                expect(initialBitrateFor).to.be.null;

                player.setInitialBitrateFor('video', 10);

                initialBitrateFor = abrControllerMock.getInitialBitrateFor('video');
                expect(initialBitrateFor).to.equal(10);

                initialBitrateFor = player.getInitialBitrateFor('video');
                expect(initialBitrateFor).to.equal(10);
            });
        });
    });

    describe("Media Player Configuration Functions", function () {
        afterEach(function () {
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

    describe("Text Management Functions", function () {

        describe("When it is not initialized", function () {
            it("Method setTextTrack should throw an exception", function () {
                expect(player.setTextTrack).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });
        });
    });

    describe("Video Element Management Functions", function () {
        describe("When it is not initialized", function () {
            it("Method attachView should throw an exception when attaching a view", function () {
                expect(player.attachView).to.throw(NOT_INITIALIZED_ERROR_MSG);
            });

            it("Method getVideoElement should throw an exception", function () {
                expect(player.getVideoElement).to.throw(ELEMENT_NOT_ATTACHED_ERROR);
            });

            it("Method attachVideoContainer should throw an exception", function () {
                expect(player.getVideoElement).to.throw(ELEMENT_NOT_ATTACHED_ERROR);
            });

            it("Method attachTTMLRenderingDiv should throw an exception", function () {
                expect(player.getVideoElement).to.throw(ELEMENT_NOT_ATTACHED_ERROR);
            });
        });
        describe("When it is initialized", function () {
            beforeEach(function () {
                player.initialize(videoElementMock, dummyUrl, false);
            });

            it("Method getVideoElement should return video element", function () {

                let element = player.getVideoElement();
                let areEquals = objectUtils.areEqual(element, videoElementMock);
                expect(areEquals).to.be.true;
            });

            it("should be able to attach video container", function () {

                let videoContainer = player.getVideoContainer();
                expect(videoContainer).to.be.undefined;

                let myVideoContainer = {
                    videoContainer: 'videoContainer'
                };
                player.attachVideoContainer(myVideoContainer);

                videoContainer = player.getVideoContainer();
                let areEquals = objectUtils.areEqual(myVideoContainer, videoContainer);
                expect(areEquals).to.be.true;
            });

            it("should be able to attach view", function () {

                let element = player.getVideoElement();
                let objectUtils = ObjectUtils(context).getInstance();
                let areEquals = objectUtils.areEqual(element, videoElementMock);
                expect(areEquals).to.be.true;

                let myNewView = {
                    view: 'view'
                };

                player.attachView(myNewView);

                element = player.getVideoElement();

                areEquals = objectUtils.areEqual(element, myNewView);
                expect(areEquals).to.be.true;
            });

            it("should be able to attach TTML renderer div", function () {

                let ttmlRenderer = player.getTTMLRenderingDiv();
                expect(ttmlRenderer).to.be.undefined;

                let myTTMLRenderer = {
                    style: {}
                };

                player.attachTTMLRenderingDiv(myTTMLRenderer);

                ttmlRenderer = player.getTTMLRenderingDiv();
                let areEquals = objectUtils.areEqual(ttmlRenderer, myTTMLRenderer);
                expect(areEquals).to.be.true;
            });
        });
    });

    describe("Stream and Track Management Functions", function () {
        describe("When it is not initialized", function () {
            it("Method getBitrateInfoListFor should throw an exception", function () {
                expect(player.getBitrateInfoListFor).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });

            it("Method getStreamsFromManifest should throw an exception", function () {
                expect(player.getStreamsFromManifest).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });

            it("Method getTracksFor should throw an exception", function () {
                expect(player.getTracksFor).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });

            it("Method getTracksForTypeFromManifest should throw an exception", function () {
                expect(player.getTracksForTypeFromManifest).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });

            it("Method getCurrentTrackFor should throw an exception", function () {
                expect(player.getCurrentTrackFor).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });

            it("Method setCurrentTrack should throw an exception", function () {
                expect(player.setCurrentTrack).to.throw(PLAYBACK_NOT_INITIALIZED_ERROR);
            });
        });

        describe("When it is initialized", function () {
            beforeEach(function () {
                player.initialize(videoElementMock, dummyUrl, false);
            });

            it("Method getBitrateInfoListFor should return bitrate info list", function () {
                let bitrateList = player.getBitrateInfoListFor();
                expect(bitrateList.length).to.equal(2);
            });

            it("Method getTracksFor should return tracks", function () {
                let tracks = player.getTracksFor();
                expect(tracks.length).to.equal(2);
            });

            it("Method getCurrentTrackFor should return current track", function () {
                let track = player.getCurrentTrackFor();
                expect(track).to.equal('track');
            });

            it("should configure initial media settings", function () {
                let initialSettings = player.getInitialMediaSettingsFor('audio');
                expect(initialSettings).to.not.exist;

                player.setInitialMediaSettingsFor('audio', 'settings');

                initialSettings = player.getInitialMediaSettingsFor('audio');
                expect(initialSettings).to.equal('settings');
            });

            it("should set current track", function () {
                let currentTrack = mediaControllerMock.isCurrentTrack('audio');
                expect(currentTrack).to.be.false;

                player.setCurrentTrack('audio');

                currentTrack = mediaControllerMock.isCurrentTrack('audio');
                expect(currentTrack).to.be.true;
            });

            it("should configure track switch mode", function () {
                let trackSwitchMode = player.getTrackSwitchModeFor('audio');
                expect(trackSwitchMode).to.not.exist;

                player.setTrackSwitchModeFor('audio', 'switch');

                trackSwitchMode = player.getTrackSwitchModeFor('audio');
                expect(trackSwitchMode).to.equal('switch');
            });

            it("should configure selection mode for initial track", function () {
                let selectionMode = player.getSelectionModeForInitialTrack();
                expect(selectionMode).to.not.exist;

                player.setSelectionModeForInitialTrack('mode');

                selectionMode = player.getSelectionModeForInitialTrack();
                expect(selectionMode).to.equal('mode');
            });
        });
    });

    describe("Protection Management Functions", function () {});

    describe("Tools Functions", function () {
        describe("When it is not initialized", function () {
            it("Method attachSource should throw an exception", function () {
                expect(player.attachSource).to.throw(NOT_INITIALIZED_ERROR_MSG);
            });
        });
    });

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

});
