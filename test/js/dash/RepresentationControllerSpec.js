describe("RepresentationController", function () {
    var helper = window.Helpers.getSpecHelper(),
        objHelper = window.Helpers.getObjectsHelper(),
        mpdHelper = window.Helpers.getMpdHelper(),
        testType = "video",
        voHelper = window.Helpers.getVOHelper(),
        timeoutDelay = helper.getTimeoutDelay(),
        period = voHelper.getDummyPeriod(),
        mpd = mpdHelper.getMpd("static"),
        data = mpd.Period_asArray[0].AdaptationSet_asArray[0],
        representationCtrl = objHelper.getRepresentationController(),
        indexHandler = objHelper.getIndexHandler(),
        onDataUpdateStartedEventName = representationCtrl.eventList.ENAME_DATA_UPDATE_STARTED,
        onDataUpdateCompletedEventName = representationCtrl.eventList.ENAME_DATA_UPDATE_COMPLETED;

    representationCtrl.manifestModel.setValue(mpd);
    representationCtrl.indexHandler = indexHandler;

    it("should not contain data before it is set", function () {
        expect(representationCtrl.getData()).toEqual(null);
    });

    describe("when data update started", function () {
        var isCompleted = false;

        beforeEach(function () {
            setTimeout(function(){
                representationCtrl.updateData(data, period, testType);
            }, helper.getExecutionDelay());
        });

        beforeEach(function () {
            isCompleted = false;
        });

        it("should fire dataUpdateStarted event when new data is set", function () {
            var observer = {};

            observer[onDataUpdateStartedEventName] = function(sender) {
                isCompleted = true;
            };

            representationCtrl.subscribe(onDataUpdateStartedEventName, observer);

            waitsFor(function (/*argument*/) {
                return isCompleted;
            }, 'Timeout', timeoutDelay);

            runs(function() {
                expect(isCompleted).toBeTruthy();
            });
        });

        it("should fire dataUpdateCompleted event when new data is set", function () {
            var observer = {};

            observer[onDataUpdateCompletedEventName] = function(sender) {
                isCompleted = true;
            };

            representationCtrl.subscribe(onDataUpdateCompletedEventName, observer);

            waitsFor(function (/*argument*/) {
                return isCompleted;
            }, 'Timeout', timeoutDelay);

            runs(function() {
                expect(isCompleted).toBeTruthy();
            });
        });

    });

    describe("when data update completed", function () {
        var updatedCompleted = false;

        beforeEach(function () {
            representationCtrl.updateData(data, period, testType);
            setTimeout(function(){
                updatedCompleted = true;
            }, helper.getExecutionDelay());
        });

        it("should return the data that was set", function () {
            waitsFor(function (/*argument*/) {
                return updatedCompleted;
            }, 'Timeout', timeoutDelay);

            runs(function() {
                expect(representationCtrl.getData()).toEqual(data);
            });
        });

        it("should return correct data index", function () {
            var expectedValue = 0;

            waitsFor(function (/*argument*/) {
                return updatedCompleted;
            }, 'Timeout', timeoutDelay);

            runs(function() {
                expect(representationCtrl.getDataIndex()).toEqual(expectedValue);
            });
        });

        it("should return correct representation for quality", function () {
            var quality = 0,
                expectedValue = 0;

            waitsFor(function (/*argument*/) {
                return updatedCompleted;
            }, 'Timeout', timeoutDelay);

            runs(function() {
                expect(representationCtrl.getRepresentationForQuality(quality).index).toEqual(expectedValue);
            });
        });
    });
});