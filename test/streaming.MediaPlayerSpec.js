describe("MediaPlayer", function () {
    /*var NOT_INITIALIZED_ERROR_MSG = "MediaPlayer not initialized!",
        MISSING_VIEW_OR_SOURCE_ERROR_MSG = "Missing view or source.",
        helper = window.Helpers.getSpecHelper(),
        objectsHelper = window.Helpers.getObjectsHelper(),
        isHtmlRunner = helper.isHtmlRunner(),
        dummyView = helper.getDummyView(),
        dummyUrl = helper.getDummyUrl(),
        player = objectsHelper.getNewMediaPlayerInstance();

    describe("when it is not initialized", function () {
        it("should not be ready", function () {
            var isReady = player.isReady();

            expect(isReady).toBeFalsy();
        });

        it("should throw an exception when attaching a source", function () {
            expect(player.attachSource).toThrow(NOT_INITIALIZED_ERROR_MSG);
        });

        it("should throw an exception when attaching a view", function () {
            expect(player.attachView).toThrow(NOT_INITIALIZED_ERROR_MSG);
        });

        it("should throw an exception when initiating playback", function () {
            expect(player.play).toThrow(NOT_INITIALIZED_ERROR_MSG);
        });

        it("should not have video model", function () {
            var videoModel = player.getVideoModel();

            expect(videoModel).toBeUndefined();
        });
    });

    describe("when it is initialized", function () {
        beforeEach(function () {
            player.startup();
        });

        it("should have metrics extensions", function () {
            var metricsExt = player.getDashMetrics();

            expect(metricsExt).toBeDefined();
            expect(metricsExt).not.toBeNull();
        });

        it("should have debug object", function () {
            var debug = player.getDebug();

            expect(debug).not.toBeNull();
            expect(debug).toBeDefined();
        });

        it("should not have metrics", function () {
            var audioMetrics = player.getMetricsFor("audio"),
                videoMetrics = player.getMetricsFor("video");

            expect(audioMetrics).toBeNull();
            expect(videoMetrics).toBeNull();
        });

        if(isHtmlRunner) {
            it("should throw an exception when initiating playback", function () {
                expect(player.play.bind(player)).toThrow(MISSING_VIEW_OR_SOURCE_ERROR_MSG);
            });
        }

        describe("when the view and the source are attached", function () {
            beforeEach(function () {
                player.attachView(dummyView);
                player.attachSource(dummyUrl);
            });

            it("should be ready", function () {
                var isReady = player.isReady();

                expect(isReady).toBeTruthy();
            });

            it("should have video model", function () {
                var videoModel = player.getVideoModel();

                expect(videoModel).toBeDefined();
                expect(videoModel).not.toBeNull();
            });
        });
    });*/
});