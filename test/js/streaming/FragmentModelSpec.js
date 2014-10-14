describe("FragmentModel", function () {
    var helper = window.Helpers.getSpecHelper(),
        voHelper = window.Helpers.getVOHelper(),
        objectsHelper = window.Helpers.getObjectsHelper(),
        context,
        fragmentModel = objectsHelper.getFragmentModel(),
        initRequest = voHelper.getInitRequest(),
        mediaRequest = voHelper.getMediaRequest(),
        loader = objectsHelper.getFragmentLoader(),
        loadingCompletedEventName = loader.eventList.ENAME_LOADING_COMPLETED,
        completeRequest = voHelper.getCompleteRequest(),
        timeout = helper.getTimeoutDelay();

    it("should have listener for loadingCompleted event", function () {
        expect(typeof fragmentModel[loadingCompletedEventName]).toEqual("function");
    });

    it("should not be postponed after creation", function () {
        expect(fragmentModel.getIsPostponed()).toBeFalsy();
    });

    it("should not have any loading, pending, executed or rejected requests", function () {
        var expectedValue = 0;

        expect(fragmentModel.getPendingRequests().length).toEqual(expectedValue);
        expect(fragmentModel.getLoadingRequests().length).toEqual(expectedValue);
        expect(fragmentModel.getExecutedRequests().length).toEqual(expectedValue);
        expect(fragmentModel.getRejectedRequests().length).toEqual(expectedValue);
    });

    describe("when a request has been added", function () {
        beforeEach(function () {
            fragmentModel = objectsHelper.getFragmentModel();
            context = {streamProcessor:{getType:function(){return "video";}}};
            fragmentModel.setContext(context);
            fragmentModel.addRequest(initRequest);
            fragmentModel.addRequest(mediaRequest);
        });

        it("should not add duplicated requests", function () {
            expect(fragmentModel.addRequest(initRequest)).toBeFalsy();
            expect(fragmentModel.addRequest(mediaRequest)).toBeFalsy();
        });

        it("should detect duplicated requests", function () {
            expect(fragmentModel.isFragmentLoadedOrPending(initRequest)).toBeTruthy();
            expect(fragmentModel.isFragmentLoadedOrPending(mediaRequest)).toBeTruthy();
        });

        it("should return pending requests", function () {
            var expectedValue = 2,
                pendingRequests = fragmentModel.getPendingRequests();

            expect(pendingRequests.length).toEqual(expectedValue);
        });

        it("should be able to cancel pending requests", function () {
            var expectedValue = 0,
                pendingRequests;

            fragmentModel.cancelPendingRequests();
            pendingRequests = fragmentModel.getPendingRequests();
            expect(pendingRequests.length).toEqual(expectedValue);
        });

        it("should fire streamCompleted event for a complete request", function () {
            var observer = {},
                isFired = false;

            observer[fragmentModel.eventList.ENAME_STREAM_COMPLETED] = function(sender, request) {
                isFired = true;
            };

            fragmentModel.subscribe(fragmentModel.eventList.ENAME_STREAM_COMPLETED, observer);

            expect(fragmentModel.getPendingRequests().length).toBe(2);
            fragmentModel.addRequest(completeRequest);
            expect(fragmentModel.getPendingRequests().length).toBe(3);
            fragmentModel.executeRequest(completeRequest);

            expect(fragmentModel.getLoadingRequests().length).toBe(0);
            expect(fragmentModel.getPendingRequests().length).toBe(2);
            expect(fragmentModel.getExecutedRequests().length).toBe(1);

            waitsFor(function (/*argument*/) {
                return isFired;
            }, 'Timeout', timeout);

            runs(function() {
                expect(isFired).toBeTruthy();
            });
        });

        describe("when a request has been passed for executing", function () {
            var loader = {load: function(){}, abort: function(){}},
                isCompleted = false;

            beforeEach(function () {
                isCompleted = false;
                fragmentModel.setLoader(loader);

                setTimeout(function(){
                    fragmentModel.executeRequest(initRequest);
                    fragmentModel.executeRequest(mediaRequest);
                    isCompleted = true;
                }, helper.getExecutionDelay());
            });

            it("should fire loadingStarted event a request", function () {
                var observer = {},
                    isFired;

                observer[fragmentModel.eventList.ENAME_FRAGMENT_LOADING_STARTED] = function(sender, request) {
                    isFired = true;
                };

                fragmentModel.subscribe(fragmentModel.eventList.ENAME_FRAGMENT_LOADING_STARTED, observer);

                waitsFor(function (/*argument*/) {
                    return isCompleted;
                }, 'Timeout', timeout);

                runs(function() {
                    expect(isFired).toBeTruthy();
                });
            });

            it("should remove the request from pending requests", function () {
                waitsFor(function (/*argument*/) {
                    return isCompleted;
                }, 'Timeout', timeout);

                runs(function() {
                    var expectedValue = 0,
                        pendingRequests = fragmentModel.getPendingRequests();
                    expect(pendingRequests.length).toEqual(expectedValue);
                });
            });

            it("should add the request to loading requests", function () {
                waitsFor(function (/*argument*/) {
                    return isCompleted;
                }, 'Timeout', timeout);

                runs(function() {
                    var expectedValue = 2,
                        loadingRequests = fragmentModel.getLoadingRequests();

                    expect(loadingRequests.length).toEqual(expectedValue);
                });
            });

            it("should be able to abort loading requests", function () {
                waitsFor(function (/*argument*/) {
                    return isCompleted;
                }, 'Timeout', timeout);

                runs(function() {
                    var expectedValue = 0,
                        loadingRequests;
                    fragmentModel.abortRequests();
                    loadingRequests = fragmentModel.getLoadingRequests();
                    expect(loadingRequests.length).toEqual(expectedValue);
                });
            });
        });
    });
});