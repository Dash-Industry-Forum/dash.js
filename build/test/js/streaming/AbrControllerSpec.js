describe("AbrController", function () {
    var helper = window.Helpers.getSpecHelper(),
        objectsHelper = window.Helpers.getObjectsHelper(),
        abrCtrl = objectsHelper.getAbrController(),
        testedType = "video",
        defaultQuality = helper.getDefaultQuality(),
        dummyMediaInfo = window.Helpers.getVOHelper().getDummyMediaInfo("video"),
        streamInfo = {id: "id1"},
        trackCount = dummyMediaInfo.trackCount;

    dummyMediaInfo.streamInfo = streamInfo;

    it("should update top quality index", function () {
        var expectedTopQuality = trackCount - 1,
            actualTopQuality;

        actualTopQuality = abrCtrl.updateTopQualityIndex(dummyMediaInfo);

        expect(actualTopQuality).toEqual(expectedTopQuality);
    });

    it("should set a quality in a range between zero and a top quality index", function () {
        var testQuality = 1,
            newQuality;

        abrCtrl.setPlaybackQuality(testedType, streamInfo, testQuality);
        newQuality = abrCtrl.getQualityFor(testedType, streamInfo);
        expect(newQuality).toEqual(testQuality);
    });

    it("should throw an exception when attempting to set not a number value for a quality", function () {
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
        var negativeQuality = -1,
            oldQuality = abrCtrl.getQualityFor(testedType, streamInfo),
            newQuality;
        abrCtrl.setPlaybackQuality(testedType, streamInfo, negativeQuality);
        newQuality = abrCtrl.getQualityFor(testedType, streamInfo);
        expect(newQuality).toEqual(oldQuality);
    });

    it("should ignore an attempt to set a quality greater than top quality index", function () {
        var greaterThanTopQualityValue = trackCount,
            oldQuality = abrCtrl.getQualityFor(testedType, streamInfo),
            newQuality;
        abrCtrl.setPlaybackQuality(testedType, streamInfo, greaterThanTopQualityValue);
        newQuality = abrCtrl.getQualityFor(testedType, streamInfo);
        expect(newQuality).toEqual(oldQuality);
    });

    it("should restore a default quality value after reset", function () {
        var newQuality,
            testQuality = 1;
        abrCtrl.setPlaybackQuality(testedType, streamInfo, testQuality);
        abrCtrl.reset();
        newQuality = abrCtrl.getQualityFor(testedType, streamInfo);
        expect(newQuality).toEqual(defaultQuality);
    });

    it("should compose a list of available bitrates", function () {
        var expectedBitrates = dummyMediaInfo.bitrateList,
            actualBitrates = abrCtrl.getBitrateList(dummyMediaInfo),
            item,
            match;

        match = expectedBitrates.filter(function(val, idx/*, arr*/) {
            item = actualBitrates[idx];

            return (item && (item.qualityIndex === idx) && (item.bitrate === val) && (item.mediaType === dummyMediaInfo.type));
        });

        expect(match.length).toEqual(expectedBitrates.length);
    });
});