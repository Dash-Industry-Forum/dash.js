describe("FragmentModel", function () {
    var helper = window.Helpers.getSpecHelper(),
        voHelper = window.Helpers.getVOHelper(),
        objectsHelper = window.Helpers.getObjectsHelper(),
        context,
        fragmentModel = objectsHelper.getFragmentModel(),
        initRequest = voHelper.getInitRequest(),
        mediaRequest = voHelper.getMediaRequest(),
        loader = objectsHelper.getFragmentLoader(),
        loadingCompletedEventName = MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_LOADING_COMPLETED,
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

        expect(fragmentModel.getRequests({state: MediaPlayer.dependencies.FragmentModel.states.PENDING}).length).toEqual(expectedValue);
        expect(fragmentModel.getRequests({state: MediaPlayer.dependencies.FragmentModel.states.LOADING}).length).toEqual(expectedValue);
        expect(fragmentModel.getRequests({state: MediaPlayer.dependencies.FragmentModel.states.EXECUTED}).length).toEqual(expectedValue);
        expect(fragmentModel.getRequests({state: MediaPlayer.dependencies.FragmentModel.states.REJECTED}).length).toEqual(expectedValue);
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
                pendingRequests = fragmentModel.getRequests({state: MediaPlayer.dependencies.FragmentModel.states.PENDING});

            expect(pendingRequests.length).toEqual(expectedValue);
        });

        it("should be able to cancel pending requests", function () {
            var expectedValue = 0,
                pendingRequests;

            fragmentModel.cancelPendingRequests();
            pendingRequests = fragmentModel.getRequests({state: MediaPlayer.dependencies.FragmentModel.states.PENDING});
            expect(pendingRequests.length).toEqual(expectedValue);
        });

        it("should fire streamCompleted event for a complete request", function () {
            var observer = {},
                isFired = false;

            observer[MediaPlayer.dependencies.FragmentModel.eventList.ENAME_STREAM_COMPLETED] = function(/*e*/) {
                isFired = true;
            };

            fragmentModel.subscribe(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_STREAM_COMPLETED, observer);

            expect(fragmentModel.getRequests({state: MediaPlayer.dependencies.FragmentModel.states.PENDING}).length).toBe(2);
            fragmentModel.addRequest(completeRequest);
            expect(fragmentModel.getRequests({state: MediaPlayer.dependencies.FragmentModel.states.PENDING}).length).toBe(3);
            fragmentModel.executeRequest(completeRequest);

            expect(fragmentModel.getRequests({state: MediaPlayer.dependencies.FragmentModel.states.LOADING}).length).toBe(0);
            expect(fragmentModel.getRequests({state: MediaPlayer.dependencies.FragmentModel.states.PENDING}).length).toBe(2);
            expect(fragmentModel.getRequests({state: MediaPlayer.dependencies.FragmentModel.states.EXECUTED}).length).toBe(1);

            expect(isFired).toBeTruthy();
        });

        describe("when a request has been passed for executing", function () {
            var loader = {load: function(){}, abort: function(){}},
                delay = helper.getExecutionDelay(),
                isCompleted = false;

            beforeEach(function () {
                isCompleted = false;
                fragmentModel.setLoader(loader);
                jasmine.clock().install();

                setTimeout(function(){
                    fragmentModel.executeRequest(initRequest);
                    fragmentModel.executeRequest(mediaRequest);
                    isCompleted = true;
                }, delay);
            });

            afterEach(function(){
                jasmine.clock().uninstall();
            });

            it("should fire loadingStarted event a request", function () {
                var observer = {},
                    isFired = false;

                observer[MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_STARTED] = function(/*e*/) {
                    isFired = true;
                };

                fragmentModel.subscribe(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_STARTED, observer);

                jasmine.clock().tick(delay + 1);

                expect(isFired).toBeTruthy();
            });

            it("should remove the request from pending requests", function () {
                jasmine.clock().tick(delay + 1);

                var expectedValue = 0,
                    pendingRequests = fragmentModel.getRequests({state: MediaPlayer.dependencies.FragmentModel.states.PENDING});
                expect(pendingRequests.length).toEqual(expectedValue);
            });

            it("should add the request to loading requests", function () {
                jasmine.clock().tick(delay + 1);

                var expectedValue = 2,
                    loadingRequests = fragmentModel.getRequests({state: MediaPlayer.dependencies.FragmentModel.states.LOADING});

                expect(loadingRequests.length).toEqual(expectedValue);
            });

            it("should be able to abort loading requests", function () {
                jasmine.clock().tick(delay + 1);

                var expectedValue = 0,
                    loadingRequests;
                fragmentModel.abortRequests();
                loadingRequests = fragmentModel.getRequests({state: MediaPlayer.dependencies.FragmentModel.states.LOADING});
                expect(loadingRequests.length).toEqual(expectedValue);
            });
        });
    });
});