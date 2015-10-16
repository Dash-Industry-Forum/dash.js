describe("DashHandler", function () {
    var objHelper = window.Helpers.getObjectsHelper(),
        testType = "video",
        indexHandler = objHelper.getIndexHandler(testType),
        representation = window.Helpers.getVOHelper().getDummyRepresentation(testType);
    it("should generate an init segment for a representation", function () {
        var initRequest = indexHandler.getInitRequest(representation);

        expect(initRequest).toBeDefined();
        expect(initRequest).not.toBeNull();
    });
});