MediaPlayer.rules.LiveEdgeBinarySearchRule = function () {
    "use strict";

    var SEARCH_TIME_SPAN = 12 * 60 * 60, // set the time span that limits our search range to a 12 hours in seconds
        liveEdgeInitialSearchPosition = NaN,
        liveEdgeSearchRange = null,
        liveEdgeSearchStep = NaN,
        currentRepresentation = null,
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
                // update the list and the segmentAvailabilityRange
                currentRepresentation.segments = null;
                currentRepresentation.segmentAvailabilityRange = {start: searchTime - liveEdgeSearchStep, end: searchTime + liveEdgeSearchStep};
                // try to get request object again
                req = finder.indexHandler.getSegmentRequestForTime(currentRepresentation, searchTime);
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

        onSearchForSegmentFailed = function(request, lastSearchTime) {
            var searchTime,
                req,
                searchInterval;

            if (useBinarySearch) {
                binarySearch.call(this, false, lastSearchTime);
                return;
            }

            // we have not found any available segments yet, update the search interval
            searchInterval = lastSearchTime - liveEdgeInitialSearchPosition;
            // we search forward and backward from the start position, increasing the search interval by the value of the half of the availability interavl - liveEdgeSearchStep
            searchTime = searchInterval > 0 ? (liveEdgeInitialSearchPosition - searchInterval) : (liveEdgeInitialSearchPosition + Math.abs(searchInterval) + liveEdgeSearchStep);

            // if the search time is out of the range bounds we have not be able to find live edge, stop trying
            if (searchTime < liveEdgeSearchRange.start && searchTime > liveEdgeSearchRange.end) {
                callback(new MediaPlayer.rules.SwitchRequest(null, p));
            } else {
                // continue searching for a first available segment
                req = finder.indexHandler.getSegmentRequestForTime(currentRepresentation, searchTime);
                findLiveEdge.call(this, searchTime, onSearchForSegmentSucceeded, onSearchForSegmentFailed, req);
            }
        },

        onSearchForSegmentSucceeded = function (request, lastSearchTime) {
            var startTime = request.startTime,
                self = this,
                req,
                searchTime;

            if (!useBinarySearch) {
                // if the fragment duration is unknown we cannot use binary search because we will not be able to
                // decide when to stop the search, so let the start time of the current segment be a liveEdge
                if (!currentRepresentation.segmentDuration) {
                    callback(new MediaPlayer.rules.SwitchRequest(startTime, p));
                    return;
                }
                useBinarySearch = true;
                liveEdgeSearchRange.end = startTime + (2 * liveEdgeSearchStep);

                //if the first request has succeeded we should check next segment - if it does not exist we have found live edge,
                // otherwise start binary search to find live edge
                if (lastSearchTime === liveEdgeInitialSearchPosition) {
                    searchTime = lastSearchTime + fragmentDuration;
                    req = finder.indexHandler.getSegmentRequestForTime(currentRepresentation, searchTime);
                    findLiveEdge.call(self, searchTime, function() {
                        binarySearch.call(self, true, searchTime);
                    }, function(){
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
                // search completed, we should take the time of the last found segment. If the last search succeded we
                // take this time. Otherwise, we should subtract the time of the search step which is equal to fragment duaration
                callback(new MediaPlayer.rules.SwitchRequest((lastSearchSucceeded ? lastSearchTime : (lastSearchTime - fragmentDuration)), p));
            } else {
                // update the search time and continue searching
                searchTime = ((liveEdgeSearchRange.start + liveEdgeSearchRange.end) / 2);
                req = finder.indexHandler.getSegmentRequestForTime(currentRepresentation, searchTime);
                findLiveEdge.call(this, searchTime, onSearchForSegmentSucceeded, onSearchForSegmentFailed, req);
            }
        };

    return {
        metricsExt: undefined,
        manifestExt: undefined,

        setFinder: function(liveEdgeFinder) {
            finder = liveEdgeFinder;
        },

        execute: function(streamType, periodId, callbackFunc/*, current*/) {
            var self = this,
                request,
                availabilityRange; // all segments are supposed to be available in this interval

            callback = callbackFunc;
            currentRepresentation = finder.streamProcessor.getCurrentRepresentation();
            fragmentDuration = currentRepresentation.segmentDuration;
            availabilityRange = currentRepresentation.segmentAvailabilityRange; // all segments are supposed to be available in this interval

            // start position of the search, it is supposed to be a live edge - the last available segment for the current mpd
            liveEdgeInitialSearchPosition = availabilityRange.end;

            if (currentRepresentation.useCalculatedLiveEdgeTime) {
                callback(new MediaPlayer.rules.SwitchRequest(liveEdgeInitialSearchPosition, p));
                return;
            }

            // we should search for a live edge in a time range which is limited by SEARCH_TIME_SPAN.
            liveEdgeSearchRange = {start: Math.max(0, (liveEdgeInitialSearchPosition - SEARCH_TIME_SPAN)), end: liveEdgeInitialSearchPosition + SEARCH_TIME_SPAN};
            // we have to use half of the availability interval (window) as a search step to ensure that we find a segment in the window
            liveEdgeSearchStep = Math.floor((availabilityRange.end - availabilityRange.start) / 2);
            // start search from finding a request for the initial search time
            request = finder.indexHandler.getSegmentRequestForTime(currentRepresentation, liveEdgeInitialSearchPosition);
            findLiveEdge.call(self, liveEdgeInitialSearchPosition, onSearchForSegmentSucceeded, onSearchForSegmentFailed, request);
        },

        reset: function() {
            liveEdgeInitialSearchPosition = NaN;
            liveEdgeSearchRange = null;
            liveEdgeSearchStep = NaN;
            currentRepresentation = null;
            useBinarySearch = false;
            fragmentDuration = NaN;
            finder = null;
        }
    };
};

MediaPlayer.rules.LiveEdgeBinarySearchRule.prototype = {
    constructor: MediaPlayer.rules.LiveEdgeBinarySearchRule
};