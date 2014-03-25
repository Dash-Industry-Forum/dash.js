
MediaPlayer.dependencies.LiveEdgeFinder = function () {
    "use strict";

    var SEARCH_TIME_SPAN = 12 * 60 * 60, // set the time span that limits our search range to a 12 hours in seconds
        deferredLiveEdge = null,
        liveEdgeInitialSearchPosition = NaN,
        liveEdgeSearchRange = null,
        liveEdgeSearchStep = NaN,
        currentRepresentation = null,
        useBinarySearch = false,
        fragmentDuration = NaN,

        searchForLiveEdge = function (representation, indexHandler, fragmentController) {
            var self = this,
                availabilityRange; // all segments are supposed to be available in this interval

            self.indexHandler = indexHandler;
            self.fragmentController = fragmentController;
            currentRepresentation = representation;
            fragmentDuration = currentRepresentation.segmentDuration;
            availabilityRange = currentRepresentation.segmentAvailabilityRange; // all segments are supposed to be available in this interval

            // start position of the search, it is supposed to be a live edge - the last available segment for the current mpd
            liveEdgeInitialSearchPosition = availabilityRange.end;
            // we should search for a live edge in a time range which is limited by SEARCH_TIME_SPAN.
            liveEdgeSearchRange = {start: Math.max(0, (liveEdgeInitialSearchPosition - SEARCH_TIME_SPAN)), end: liveEdgeInitialSearchPosition + SEARCH_TIME_SPAN};
            // we have to use half of the availability interval (window) as a search step to ensure that we find a segment in the window
            liveEdgeSearchStep = Math.floor((availabilityRange.end - availabilityRange.start) / 2);
            // start search from finding a request for the initial search time
            self.indexHandler.getSegmentRequestForTime(currentRepresentation, liveEdgeInitialSearchPosition).then(findLiveEdge.bind(self, liveEdgeInitialSearchPosition, onSearchForSegmentSucceeded, onSearchForSegmentFailed));

            deferredLiveEdge = Q.defer();

            return deferredLiveEdge.promise;
        },

        findLiveEdge = function (searchTime, onSuccess, onError, request) {
            var self = this;
            if (request === null) {
                // request can be null because it is out of the generated list of request. In this case we need to
                // update the list and the segmentAvailabilityRange
                currentRepresentation.segments = null;
                currentRepresentation.segmentAvailabilityRange = {start: searchTime - liveEdgeSearchStep, end: searchTime + liveEdgeSearchStep};
                // try to get request object again
                self.indexHandler.getSegmentRequestForTime(currentRepresentation, searchTime).then(findLiveEdge.bind(self, searchTime, onSuccess, onError));
            } else {
                self.fragmentController.isFragmentExists(request).then(
                    function(isExist) {
                        if (isExist) {
                            onSuccess.call(self, request, searchTime);
                        } else {
                            onError.call(self, request, searchTime);
                        }
                    }
                );
            }
        },

        onSearchForSegmentFailed = function(request, lastSearchTime) {
            var searchTime,
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
                this.system.notify("segmentLoadingFailed");
            } else {
                // continue searching for a first available segment
                this.indexHandler.getSegmentRequestForTime(currentRepresentation, searchTime).then(findLiveEdge.bind(this, searchTime, onSearchForSegmentSucceeded, onSearchForSegmentFailed));
            }
        },

        onSearchForSegmentSucceeded = function (request, lastSearchTime) {
            var startTime = request.startTime,
                self = this,
                searchTime;

            if (!useBinarySearch) {
                // if the fragment duration is unknown we cannot use binary search because we will not be able to
                // decide when to stop the search, so let the start time of the current segment be a liveEdge
                if (!fragmentDuration) {
                    deferredLiveEdge.resolve(startTime);
                    return;
                }
                useBinarySearch = true;
                liveEdgeSearchRange.end = startTime + (2 * liveEdgeSearchStep);

                //if the first request has succeeded we should check next segment - if it does not exist we have found live edge,
                // otherwise start binary search to find live edge
                if (lastSearchTime === liveEdgeInitialSearchPosition) {
                    searchTime = lastSearchTime + fragmentDuration;
                    this.indexHandler.getSegmentRequestForTime(currentRepresentation, searchTime).then(findLiveEdge.bind(self, searchTime, function() {
                        binarySearch.call(self, true, searchTime);
                    }, function(){
                        deferredLiveEdge.resolve(searchTime);
                    }));

                    return;
                }
            }

            binarySearch.call(this, true, lastSearchTime);
        },

        binarySearch = function(lastSearchSucceeded, lastSearchTime) {
            var isSearchCompleted,
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
                deferredLiveEdge.resolve(lastSearchSucceeded ? lastSearchTime : (lastSearchTime - fragmentDuration));
            } else {
                // update the search time and continue searching
                searchTime = ((liveEdgeSearchRange.start + liveEdgeSearchRange.end) / 2);
                this.indexHandler.getSegmentRequestForTime(currentRepresentation, searchTime).then(findLiveEdge.bind(this, searchTime, onSearchForSegmentSucceeded, onSearchForSegmentFailed));
            }
        };

    return {
        searchForLiveEdge: searchForLiveEdge,

        abortSearch: function() {
            if (deferredLiveEdge) {
                deferredLiveEdge.reject();
                deferredLiveEdge = null;
            }

            liveEdgeInitialSearchPosition = NaN;
            liveEdgeSearchRange = null;
            liveEdgeSearchStep = NaN;
            currentRepresentation = null;
            useBinarySearch = false;
            fragmentDuration = NaN;
        }
    };
};

MediaPlayer.dependencies.LiveEdgeFinder.prototype = {
    constructor: MediaPlayer.dependencies.LiveEdgeFinder
};