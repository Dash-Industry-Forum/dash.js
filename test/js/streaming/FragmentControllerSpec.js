describe("FragmentController", function () {
    var voHelper = window.Helpers.getVOHelper(),
        objectsHelper = window.Helpers.getObjectsHelper(),
        fragmentController = objectsHelper.getFragmentController();

    it("should process bytes array", function () {
        var bytes = new ArrayBuffer(612),
            expectedValue = new Uint8Array(bytes),
            result;

        result =  fragmentController.process(bytes);
        expect(result).toEqual(expectedValue);
    });

    it("should not create or return model without context", function () {
        var expectedValue = null;

        expect(fragmentController.getModel()).toEqual(expectedValue);
        expect(fragmentController.getModel(null)).toEqual(expectedValue);
    });

    it("should create or return model for a given context", function () {
        var context = {},
            model = fragmentController.getModel(context);

        expect(model).toBeDefined();
        expect(model).not.toBeNull();
    });

    it("should always return the same model for the context", function () {
        var context1 = 1,
            context2 = 2,
            model1 = fragmentController.getModel(context1),
            model2 = fragmentController.getModel(context2);

        expect(fragmentController.getModel(context1)).toEqual(model1);
        expect(fragmentController.getModel(context2)).toEqual(model2);
    });

    it("should detach model", function () {
        var context = {},
            model = fragmentController.getModel(context);

        fragmentController.detachModel(model);
        expect(fragmentController.getModel(context)).not.toEqual(model);
    });

    it("should identify an initialization segment", function () {
        var request = voHelper.getInitRequest();

        expect(fragmentController.isInitializationRequest(null)).toBeFalsy();
        expect(fragmentController.isInitializationRequest(request)).toBeTruthy();
        request.type = "unknown";
        expect(fragmentController.isInitializationRequest(null)).toBeFalsy();
        request.type = undefined;
        expect(fragmentController.isInitializationRequest(null)).toBeFalsy();
    });
});