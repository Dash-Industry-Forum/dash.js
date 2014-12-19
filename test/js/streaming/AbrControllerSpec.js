describe("AbrController", function () {
    var helper = window.Helpers.getSpecHelper(),
        objectsHelper = window.Helpers.getObjectsHelper(),
        abrCtrl = objectsHelper.getAbrController(),
        testedType = "video",
        defaultQuality = helper.getDefaultQuality(),
        trackCtrl = objectsHelper.getTrackController(testedType),
        onDataUpdateCompletedEventName = Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED,
        onTopQualityIndexChangedEventName = MediaPlayer.dependencies.AbrController.eventList.ENAME_TOP_QUALITY_INDEX_CHANGED,
        dummyAdaptation = window.Helpers.getMpdHelper().getAdaptationWithSegmentTemplate(testedType),
        dummyRepresentation = window.Helpers.getVOHelper().getDummyRepresentation(testedType),
        streamInfo = {id: "id1"},
        repsCount = dummyAdaptation.Representation_asArray.length;

    it("should have a handler for RepcresentationController.onDataUpdateCompleted event", function () {
        expect(typeof(abrCtrl[onDataUpdateCompletedEventName])).toBe("function");
    });

    describe("when data update completed", function () {
        var eventDelay = helper.getExecutionDelay();

        beforeEach(function () {
            jasmine.clock().install();

            setTimeout(function(){
                abrCtrl[onDataUpdateCompletedEventName]({sender: trackCtrl, data:{data: dummyAdaptation, currentRepresentation: dummyRepresentation}});
            }, eventDelay);
        });

        afterEach(function(){
            jasmine.clock().uninstall();
        });

        it("should update top quality index", function () {
            var dummyObserver = {},
                expectedTopQuality = repsCount - 1,
                actualTopQuality = NaN;

            dummyObserver[onTopQualityIndexChangedEventName] = function(e){
                actualTopQuality = e.data.maxIndex;
            };

            abrCtrl.subscribe(onTopQualityIndexChangedEventName, dummyObserver);

            jasmine.clock().tick(eventDelay + 1);

            expect(actualTopQuality).toEqual(expectedTopQuality);
        });

        it("should set a quality in a range between zero and a top quality index", function () {
            jasmine.clock().tick(eventDelay + 1);

            var testQuality = 1,
                newQuality;
            abrCtrl.setPlaybackQuality(testedType, streamInfo, testQuality);
            newQuality = abrCtrl.getQualityFor(testedType, streamInfo);
            expect(newQuality).toEqual(testQuality);
        });

        it("should throw an exception when attempting to set not a number value for a quality", function () {
            jasmine.clock().tick(eventDelay + 1);

            var testQuality = "a";
            expect(abrCtrl.setPlaybackQuality.bind(abrCtrl, testedType, streamInfo, testQuality)).toThrow("argument is not an integer");
            testQuality = null;
            expect(abrCtrl.setPlaybackQuality.bind(abrCtrl, testedType, streamInfo, testQuality)).toThrow("argument is not an integer");
            testQuality = 2.5;
            expect(abrCtrl.setPlaybackQuality.bind(abrCtrl, testedType, streamInfo, testQuality)).toThrow("argument is not an integer");
            testQuality = {};
            expect(abrCtrl.setPlaybackQuality.bind(abrCtrl, testedType, streamInfo, testQuality)).toThrow("argument is not an integer");
        });

        it("should ignore an attempt to set a negative quality value", function () {
            jasmine.clock().tick(eventDelay + 1);

            var negativeQuality = -1,
                oldQuality = abrCtrl.getQualityFor(testedType, streamInfo),
                newQuality;
            abrCtrl.setPlaybackQuality(testedType, streamInfo, negativeQuality);
            newQuality = abrCtrl.getQualityFor(testedType, streamInfo);
            expect(newQuality).toEqual(oldQuality);
        });

        it("should ignore an attempt to set a quality greater than top quality index", function () {
            jasmine.clock().tick(eventDelay + 1);

            var greaterThanTopQualityValue = repsCount,
                oldQuality = abrCtrl.getQualityFor(testedType, streamInfo),
                newQuality;
            abrCtrl.setPlaybackQuality(testedType, streamInfo, greaterThanTopQualityValue);
            newQuality = abrCtrl.getQualityFor(testedType, streamInfo);
            expect(newQuality).toEqual(oldQuality);
        });

        it("should restore a default quality value after reset", function () {
            jasmine.clock().tick(eventDelay + 1);

            var newQuality,
                testQuality = 1;
            abrCtrl.setPlaybackQuality(testedType, streamInfo, testQuality);
            abrCtrl.reset();
            newQuality = abrCtrl.getQualityFor(testedType, streamInfo);
            expect(newQuality).toEqual(defaultQuality);
        });
    });
});