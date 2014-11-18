MediaPlayer.rules.LiveEdgeBBCSearchRule = function () {
    "use strict";

    var SEARCH_TIME_SPAN = 600, // limits our search range to 10 minutes
        liveEdgeInitialSearchPosition = NaN,
        liveEdgeSearchRange = null,
        liveEdgeSearchStep = NaN,
        trackInfo = null,
        useBinarySearch = false,
        fragmentDuration = NaN,
        p = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT,
        finder,
        callback,

        findLiveEdge = function (searchTime, onSuccess, onError, request) {
            var self = this,
                req;
            if (request === null) {
                // request can be null because it is out of the generated list of request. In this case we need to
                // update the list and the DVRWindow
                // try to get request object again
                req = self.adapter.generateFragmentRequestForTime(finder.streamProcessor, trackInfo, searchTime);
                findLiveEdge.call(self, searchTime, onSuccess, onError, req);
            } else {
                var handler = function(sender, isExist, request) {
                    finder.fragmentLoader.unsubscribe(finder.fragmentLoader.eventList.ENAME_CHECK_FOR_EXISTENCE_COMPLETED, self, handler);
                    if (isExist) {
                        onSuccess.call(self, request, searchTime);
                    } else {
                        onError.call(self, request, searchTime);
                    }
                };

                finder.fragmentLoader.subscribe(finder.fragmentLoader.eventList.ENAME_CHECK_FOR_EXISTENCE_COMPLETED, self, handler);
                finder.fragmentLoader.checkForExistence(request);
            }
        },

        onSearchForFragmentFailed = function(request, lastSearchTime) {
            var searchTime,
                req,
                searchInterval;

            if (useBinarySearch) {
                binarySearch.call(this, false, lastSearchTime);
                return;
            }

            // we have not found any available fragments yet, update the search interval
            searchInterval = lastSearchTime - liveEdgeInitialSearchPosition;
            // we search forward and backward from the start position, increasing the search interval by the value of the half of the availability interavl - liveEdgeSearchStep
            searchTime = searchInterval > 0 ? (liveEdgeInitialSearchPosition - searchInterval) : (liveEdgeInitialSearchPosition + Math.abs(searchInterval) + liveEdgeSearchStep);

            // if the search time is out of the range bounds we have not be able to find live edge, assume initial position
            if (searchTime < liveEdgeSearchRange.start && searchTime > liveEdgeSearchRange.end) {
                console.log('I AM GIVING UP');
                callback(new MediaPlayer.rules.SwitchRequest(liveEdgeInitialSearchPosition, p));
            } else {
                // continue searching for a first available fragment
                req = this.adapter.getFragmentRequestForTime(finder.streamProcessor, trackInfo, searchTime);
                findLiveEdge.call(this, searchTime, onSearchForFragmentSucceeded, onSearchForFragmentFailed, req);
            }
        },

        onSearchForFragmentSucceeded = function (request, lastSearchTime) {
            var startTime = request.startTime,
                self = this,
                req,
                searchTime;

            if (!useBinarySearch) {
                // if the fragment duration is unknown we cannot use binary search because we will not be able to
                // decide when to stop the search, so let the start time of the current fragment be a liveEdge
                if (!trackInfo.fragmentDuration) {
                    console.log('I THINK IT IS AT (1) ' + startTime);
                    callback(new MediaPlayer.rules.SwitchRequest(startTime, p));
                    return;
                }
                useBinarySearch = true;
                liveEdgeSearchRange.end = startTime + (2 * liveEdgeSearchStep);

                //if the first request has succeeded we should check next fragment - if it does not exist we have found live edge,
                // otherwise start binary search to find live edge
                if (lastSearchTime === liveEdgeInitialSearchPosition) {
                    searchTime = lastSearchTime + fragmentDuration;
                    req = self.adapter.getFragmentRequestForTime(finder.streamProcessor, trackInfo, searchTime);
                    findLiveEdge.call(self, searchTime, function() {
                        binarySearch.call(self, true, searchTime);
                    }, function(){
                        console.log('I THINK IT IS AT (2) ' + searchTime);
                        callback(new MediaPlayer.rules.SwitchRequest(searchTime, p));
                    }, req);

                    return;
                }
            }

            binarySearch.call(this, true, lastSearchTime);
        },

        binarySearch = function(lastSearchSucceeded, lastSearchTime) {
            var isSearchCompleted,
                req,
                searchTime;

            if (lastSearchSucceeded) {
                liveEdgeSearchRange.start = lastSearchTime;
            } else {
                liveEdgeSearchRange.end = lastSearchTime;
            }

            isSearchCompleted = (Math.floor(liveEdgeSearchRange.end - liveEdgeSearchRange.start)) <= fragmentDuration;

            if (isSearchCompleted) {
                // search completed, we should take the time of the last found fragment. If the last search succeded we
                // take this time. Otherwise, we should subtract the time of the search step which is equal to fragment duaration
                console.log('DID THE LAST SEARCH SUCCEED? ' + lastSearchSucceeded);
                console.log('I THINK IT IS AT (3) ' + (lastSearchSucceeded ? lastSearchTime : (lastSearchTime - fragmentDuration)));
                callback(new MediaPlayer.rules.SwitchRequest((lastSearchSucceeded ? lastSearchTime : (lastSearchTime - fragmentDuration)), p));
            } else {
                // update the search time and continue searching
                searchTime = ((liveEdgeSearchRange.start + liveEdgeSearchRange.end) / 2);
                req = this.adapter.getFragmentRequestForTime(finder.streamProcessor, trackInfo, searchTime);
                findLiveEdge.call(this, searchTime, onSearchForFragmentSucceeded, onSearchForFragmentFailed, req);
            }
        };

    return {
        metricsExt: undefined,
        adapter: undefined,

        setFinder: function(liveEdgeFinder) {
            finder = liveEdgeFinder;
        },

        execute: function(context, callbackFunc) {
            var self = this,
                request,
                DVRWindow;

            callback = callbackFunc;
            trackInfo = finder.streamProcessor.getCurrentTrack();
            fragmentDuration = trackInfo.fragmentDuration;
            DVRWindow = trackInfo.DVRWindow;

            // start position of the search, it is supposed to be a live edge - the last available fragment for the current mpd
            // Possibly Bad Assumption By Lloyd[tm]: If it's live, we'll go with now for the end of the DVRWindow
            // As DVRWindow.end for a 24hr rewind window seems to be ~70000s out
            // As a minimum @todo this needs to not use local time
            //liveEdgeInitialSearchPosition = DVRWindow.end;
            liveEdgeInitialSearchPosition = Date.now() / 1000;
            console.log('HELLO ' + DVRWindow.end);
            console.log('GOODBYE ' + Date.now())
            if (trackInfo.useCalculatedLiveEdgeTime) {
                callback(new MediaPlayer.rules.SwitchRequest(liveEdgeInitialSearchPosition, p));
                return;
            }

            // we should search for a live edge in a time range which is limited by SEARCH_TIME_SPAN.
            liveEdgeSearchRange = {start: Math.max(0, (liveEdgeInitialSearchPosition - SEARCH_TIME_SPAN)), end: liveEdgeInitialSearchPosition + SEARCH_TIME_SPAN};
            // we have to use half of the availability interval (window) as a search step to ensure that we find a fragment in the window
            liveEdgeSearchStep = Math.floor((DVRWindow.end - DVRWindow.start) / 2);
            if (liveEdgeSearchStep > liveEdgeSearchRange.end - liveEdgeSearchRange.start) {
                liveEdgeSearchStep = (liveEdgeSearchRange.end - liveEdgeSearchRange.start) / 10;
            }
            // start search from finding a request for the initial search time
            request = self.adapter.getFragmentRequestForTime(finder.streamProcessor, trackInfo, liveEdgeInitialSearchPosition);
            findLiveEdge.call(self, liveEdgeInitialSearchPosition, onSearchForFragmentSucceeded, onSearchForFragmentFailed, request);
        },

        reset: function() {
            liveEdgeInitialSearchPosition = NaN;
            liveEdgeSearchRange = null;
            liveEdgeSearchStep = NaN;
            trackInfo = null;
            useBinarySearch = false;
            fragmentDuration = NaN;
            finder = null;
        }
    };
};

MediaPlayer.rules.LiveEdgeBBCSearchRule.prototype = {
    constructor: MediaPlayer.rules.LiveEdgeBBCSearchRule
};