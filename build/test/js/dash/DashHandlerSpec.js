describe("DashHandler", function () {
    var helper = window.Helpers.getSpecHelper(),
        objHelper = window.Helpers.getObjectsHelper(),
        timelineConverter = objHelper.getTimelineConverter(),
        testType = "video",
        indexHandler = objHelper.getIndexHandler(),
        representation = window.Helpers.getVOHelper().getDummyRepresentation(testType);
    it("should generate an init segment for a representation", function () {
        var initRequest = indexHandler.getInitRequest(representation);

        expect(initRequest).toBeDefined();
        expect(initRequest).not.toBeNull();
    });
});