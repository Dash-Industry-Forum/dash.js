describe("RepresentationController", function () {
    var helper = window.Helpers.getSpecHelper(),
        objHelper = window.Helpers.getObjectsHelper(),
        mpdHelper = window.Helpers.getMpdHelper(),
        testType = "video",
        voHelper = window.Helpers.getVOHelper(),
        adaptation = voHelper.getDummyRepresentation(testType).adaptation,
        mpd = mpdHelper.getMpd("static"),
        data = mpd.Period_asArray[0].AdaptationSet_asArray[0],
        representationCtrl = objHelper.getRepresentationController(),
        indexHandler = objHelper.getIndexHandler(testType),
        onDataUpdateStartedEventName = Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_STARTED;

    representationCtrl.manifestModel.setValue(mpd);
    representationCtrl.indexHandler = indexHandler;

    it("should not contain data before it is set", function () {
        expect(representationCtrl.getData()).toEqual(null);
    });

    describe("when data update started", function () {
        var spy,
            observer;

        beforeEach(function () {
            observer = {};
            spy = jasmine.createSpy('spy');

            observer[onDataUpdateStartedEventName] = function(sender) {
                spy(onDataUpdateStartedEventName);
            };

            representationCtrl.subscribe(onDataUpdateStartedEventName, observer);
            representationCtrl.updateData(data, adaptation, testType);
        });

        afterEach(function () {
            representationCtrl.unsubscribe(onDataUpdateStartedEventName, observer);
        });

        it("should fire dataUpdateStarted event when new data is set", function () {
            expect(spy).toHaveBeenCalledWith(onDataUpdateStartedEventName);
        });
    });

    describe("when data update completed", function () {
        beforeEach(function (done) {
            representationCtrl.updateData(data, adaptation, testType);
            setTimeout(function(){
                done();
            }, helper.getExecutionDelay());
        });

        it("should return the data that was set", function () {
            expect(representationCtrl.getData()).toEqual(data);
        });

        it("should return correct data index", function () {
            var expectedValue = 0;

            expect(representationCtrl.getDataIndex()).toEqual(expectedValue);
        });

        it("should return correct representation for quality", function () {
            var quality = 0,
                expectedValue = 0;

            expect(representationCtrl.getRepresentationForQuality(quality).index).toEqual(expectedValue);
        });
    });
});