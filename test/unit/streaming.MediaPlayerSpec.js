// jshint ignore:start

import SpecHelper from './helpers/SpecHelper';
import StreamControllerMock from './mocks/StreamControllerMock'
import CapabilitiesMock from './mocks/CapabilitiesMock'
import MediaPlayer from './../../src/streaming/MediaPlayer';

const expect = require('chai').expect;

describe("MediaPlayer", function () {

    before(function () {
        global.dashjs = {};
    });

    let NOT_INITIALIZED_ERROR_MSG = "MediaPlayer not initialized!";
    let PLAYBACK_NOT_INITIALIZED_ERROR = 'You must first call initialize() to init playback before calling this method';
    let ELEMENT_NOT_ATTACHED_ERROR = 'You must first call attachView() to set the video element before calling this method';

    const specHelper = new SpecHelper();
    let dummyView = specHelper.getDummyView();
    let dummyUrl = specHelper.getDummyUrl();

    // init mock
    let capaMock = CapabilitiesMock().getInstance();
    let streamControllerMock = StreamControllerMock().getInstance();
    let player;

    beforeEach(function () {
        player = MediaPlayer().create();
        // to avoid unwanted log
        player.getDebug().setLogToBrowserConsole(false);
        player.setConfig({
            streamController: streamControllerMock,
            capabilities: capaMock
        });
    });

    afterEach(function () {
        player = null;
    });

    describe("Init Functions", function () {
        describe("When it is not initialized", function () {
            it("Method isReady should return false", function () {
                var isReady = player.isReady();
                expect(isReady).to.be.false;
            });
        });

        describe("When it is initializing", function () {
            it("Method initialize should not initialize if MSE is not supported", function () {
                capaMock.setMediaSourceSupported(false);
                player.initialize(dummyView, dummyUrl, false);

                var isReady = player.isReady();
                expect(isReady).to.be.false;

                capaMock.setMediaSourceSupported(true);
            });

            it("Method initialize should not initialize if MSE is not supported", function () {
                capaMock.setMediaSourceSupported(false);
                let playerError = function (e) {
                    player.off('error', playerError);

                    var isReady = player.isReady();
                    expect(isReady).to.be.false;

                    // reinit mock
                    capaMock.setMediaSourceSupported(true);
                }

                player.on('error', playerError, this);
                player.initialize(dummyView, dummyUrl, false);
            });
        });

        describe("When it is initialized", function () {
            beforeEach(function () {
                player.initialize(dummyView, dummyUrl, false);
            });
            it("Method isReady should return false", function () {
                var isReady = player.isReady();
                expect(isReady).to.be.true;
            });

            it("Method getDebug should return debug object", function () {
                var debug = player.getDebug();
                expect(debug).to.exist;
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

    describe("Media Player Configuration Functions", function () {});

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
                player.initialize(dummyView, dummyUrl, false);
            });

            it("Method getDashMetrics should return dash metrics", function () {
                var metricsExt = player.getDashMetrics();
                expect(metricsExt).to.exist;
            });

            it("Method getMetricsFor should return no metrics", function () {
                var audioMetrics = player.getMetricsFor("audio"),
                    videoMetrics = player.getMetricsFor("video");

                expect(audioMetrics).to.be.null;
                expect(videoMetrics).to.be.null;
            });
        });
    });

    describe("Media Player Configuration Functions", function () {});

    describe("Text Management Functions", function () {});

    describe("Video Element Management Functions", function () {});

    describe("Stream and Track Management Functions", function () {});

    describe("Protection Management Functions", function () {});

    describe("Tools Functions", function () {});

});
