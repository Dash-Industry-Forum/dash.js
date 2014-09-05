describe("AbrController", function () {
    var helper = window.Helpers.getSpecHelper(),
        objectsHelper = window.Helpers.getObjectsHelper(),
        abrCtrl = objectsHelper.getAbrController(),
        testedType = "video",
        defaultQuality = helper.getDefaultQuality(),
        representationCtrl = objectsHelper.getRepresentationController(testedType),
        onDataUpdateCompletedEventName = representationCtrl.eventList.ENAME_DATA_UPDATE_COMPLETED,
        onTopQualityIndexChangedEventName = abrCtrl.eventList.ENAME_TOP_QUALITY_INDEX_CHANGED,
        dummyAdaptation = window.Helpers.getMpdHelper().getAdaptationWithSegmentTemplate(testedType),
        repsCount = dummyAdaptation.Representation_asArray.length;

    it("should have a handler for RepcresentationController.onDataUpdateCompleted event", function () {
        expect(typeof(abrCtrl[onDataUpdateCompletedEventName])).toBe("function");
    });

    describe("when data update completed", function () {
        var updateCompleted,
            eventDelay = helper.getExecutionDelay(),
            timeoutDelay = helper.getTimeoutDelay();

        beforeEach(function () {
            updateCompleted = false;

            setTimeout(function(){
                abrCtrl[onDataUpdateCompletedEventName](representationCtrl, dummyAdaptation);
                updateCompleted = true;
            }, eventDelay);
        });

        it("should update top quality index", function () {
            var dummyObserver = {},
                expectedTopQuality = repsCount - 1,
                actualTopQuality;

            dummyObserver[onTopQualityIndexChangedEventName] = function(sender, type, topQualityValue){
                actualTopQuality = topQualityValue;
            };

            abrCtrl.subscribe(onTopQualityIndexChangedEventName, dummyObserver);

            waitsFor(function (/*argument*/) {
                return updateCompleted;
            }, 'Timeout', timeoutDelay);

            runs(function() {
                expect(actualTopQuality).toEqual(expectedTopQuality);
            });
        });

        it("should set a quality in a range between zero and a top quality index", function () {
            waitsFor(function (/*argument*/) {
                return updateCompleted;
            }, 'Timeout', timeoutDelay);

            runs(function() {
                var testQuality = 1,
                    newQuality;
                abrCtrl.setPlaybackQuality(testedType, testQuality);
                newQuality = abrCtrl.getQualityFor(testedType);
                expect(newQuality).toEqual(testQuality);
            });
        });

        it("should throw an exception when attempting to set not a number value for a quality", function () {
            waitsFor(function (/*argument*/) {
                return updateCompleted;
            }, 'Timeout', timeoutDelay);

            runs(function() {
                var testQuality = "a";
                expect(abrCtrl.setPlaybackQuality.bind(abrCtrl, testQuality)).toThrow("argument is not an integer");
                testQuality = null;
                expect(abrCtrl.setPlaybackQuality.bind(abrCtrl, testQuality)).toThrow("argument is not an integer");
                testQuality = 2.5;
                expect(abrCtrl.setPlaybackQuality.bind(abrCtrl, testQuality)).toThrow("argument is not an integer");
                testQuality = {};
                expect(abrCtrl.setPlaybackQuality.bind(abrCtrl, testQuality)).toThrow("argument is not an integer");
            });
        });

        it("should ignore an attempt to set a negative quality value", function () {
            waitsFor(function (/*argument*/) {
                return updateCompleted;
            }, 'Timeout', timeoutDelay);

            runs(function() {
                var negativeQuality = -1,
                    oldQuality = abrCtrl.getQualityFor(testedType),
                    newQuality;
                abrCtrl.setPlaybackQuality(testedType, negativeQuality);
                newQuality = abrCtrl.getQualityFor(testedType);
                expect(newQuality).toEqual(oldQuality);
            });
        });

        it("should ignore an attempt to set a quality greater than top quality index", function () {
            waitsFor(function (/*argument*/) {
                return updateCompleted;
            }, 'Timeout', timeoutDelay);

            runs(function() {
                var greaterThanTopQualityValue = repsCount,
                    oldQuality = abrCtrl.getQualityFor(testedType),
                    newQuality;
                abrCtrl.setPlaybackQuality(testedType, greaterThanTopQualityValue);
                newQuality = abrCtrl.getQualityFor(testedType);
                expect(newQuality).toEqual(oldQuality);
            });
        });

        it("should restore a default quality value after reset", function () {
            waitsFor(function (/*argument*/) {
                return updateCompleted;
            }, 'Timeout', timeoutDelay);

            runs(function() {
                var newQuality,
                    testQuality = 1;
                abrCtrl.setPlaybackQuality(testedType, testQuality);
                abrCtrl.reset();
                newQuality = abrCtrl.getQualityFor(testedType);
                expect(newQuality).toEqual(defaultQuality);
            });
        });
    });
});