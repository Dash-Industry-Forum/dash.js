describe("TimelineConverter", function () {
    var helper = window.Helpers.getSpecHelper(),
        objHelper = window.Helpers.getObjectsHelper(),
        timelineConverter = objHelper.getTimelineConverter(),
        liveEdgeFinder = objHelper.getLiveEdgeFinder(),
        testActualLiveEdge = 100,
        searchTime = 0,
        testType = "video",
        representation = window.Helpers.getVOHelper().getDummyRepresentation(testType),
        onLiveEdgeFoundEventName = MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED;

        liveEdgeFinder.streamProcessor.getCurrentTrack = function() {
            return representation;
        };

        liveEdgeFinder.streamProcessor.getStreamInfo = function() {
            return {manifestInfo: {loadedTime: representation.adaptation.period.mpd.manifest.loadedTime}};
        };

    it("should have a handler for LiveEdgeFinder.onLiveEdgeFound event", function () {
        expect(typeof(timelineConverter[onLiveEdgeFoundEventName])).toBe("function");
    });

    it("should calculate timestamp offset", function () {
        var expectedValue = -10;

        expect(timelineConverter.calcMSETimeOffset(representation)).toEqual(expectedValue);
    });

    it("should set an expected live edge", function () {
        var expectedValue = 10;

        timelineConverter.setExpectedLiveEdge(expectedValue);
        expect(timelineConverter.getExpectedLiveEdge()).toEqual(expectedValue);
    });

    it("should calculate presentation time from media time", function () {
        var expectedValue = 0,
            mediaTime = 10;

        expect(timelineConverter.calcPresentationTimeFromMediaTime(mediaTime, representation)).toEqual(expectedValue);
    });

    it("should calculate media time from representation time", function () {
        var expectedValue = 10,
            representationTime = 0;

        expect(timelineConverter.calcMediaTimeFromPresentationTime(representationTime, representation)).toEqual(expectedValue);
    });

    it("should calculate presentation time from wall-clock time", function () {
        //representation.adaptation.period.start = 10;
        //representation.adaptation.period.mpd.manifest.type = "static";
        var expectedValue = 10,
            wallClock = new Date(helper.getUnixTime().getTime() + expectedValue * 1000);
        expect(timelineConverter.calcPresentationTimeFromWallTime(wallClock, representation.adaptation.period)).toEqual(expectedValue);
    });

    it("should calculate availability window for static mpd", function () {
        //representation.adaptation.period.start = 0;
        //representation.adaptation.period.duration = 100;
        //representation.adaptation.period.mpd.manifest.type = "static";
        var expectedValue = representation.adaptation.period.start,
            isDynamic = false,
            range = timelineConverter.calcSegmentAvailabilityRange(representation, isDynamic);

        expect(range.start).toEqual(expectedValue);
        expectedValue = 100;
        expect(range.end).toEqual(expectedValue);
    });

    describe("when the live edge is found", function () {
        var updateCompleted,
            eventDelay = helper.getExecutionDelay();

        beforeEach(function (done) {
            updateCompleted = false;
            timelineConverter.setExpectedLiveEdge(100);

            setTimeout(function(){
                timelineConverter[onLiveEdgeFoundEventName]({sender: liveEdgeFinder, data: {liveEdge: testActualLiveEdge, searchTime: searchTime}});
                updateCompleted = true;
                done();
            }, eventDelay);
        });

        it("should set isTimeSyncCompleted", function () {
            expect(timelineConverter.isTimeSyncCompleted()).toBeTruthy();
        });

        it("should calculate availability window for dynamic mpd", function () {
            //representation.adaptation.period.start = 0;
            //representation.adaptation.period.duration = 100;
            //representation.adaptation.period.mpd.manifest.type = "static";
            representation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);
            timelineConverter.setExpectedLiveEdge(100);

            var expectedValue = 0,
                isDynamic = true,
                range = timelineConverter.calcSegmentAvailabilityRange(representation, isDynamic);

            expect(range.start).toEqual(expectedValue);
            expectedValue = 10;
            expect(range.end).toEqual(expectedValue);
        });
    });
});