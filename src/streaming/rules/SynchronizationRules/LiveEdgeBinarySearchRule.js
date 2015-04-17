/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.rules.LiveEdgeBinarySearchRule = function () {
    "use strict";

    var SEARCH_TIME_SPAN = 12 * 60 * 60, // set the time span that limits our search range to a 12 hours in seconds
        liveEdgeInitialSearchPosition = NaN,
        liveEdgeSearchRange = null,
        liveEdgeSearchStep = NaN,
        trackInfo = null,
        useBinarySearch = false,
        fragmentDuration = NaN,
        p = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT,
        callback,
        fragmentLoader,
        streamProcessor,

        findLiveEdge = function (searchTime, onSuccess, onError, request) {
            var self = this,
                req;
            if (request === null) {
                // request can be null because it is out of the generated list of request. In this case we need to
                // update the list and the DVRWindow
                // try to get request object again
                req = self.adapter.generateFragmentRequestForTime(streamProcessor, trackInfo, searchTime);
                findLiveEdge.call(self, searchTime, onSuccess, onError, req);
            } else {
                var handler = function(e) {
                    fragmentLoader.unsubscribe(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_CHECK_FOR_EXISTENCE_COMPLETED, self, handler);
                    if (e.data.exists) {
                        onSuccess.call(self, e.data.request, searchTime);
                    } else {
                        onError.call(self, e.data.request, searchTime);
                    }
                };

                fragmentLoader.subscribe(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_CHECK_FOR_EXISTENCE_COMPLETED, self, handler);
                fragmentLoader.checkForExistence(request);
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

            // if the search time is out of the range bounds we have not be able to find live edge, stop trying
            if (searchTime < liveEdgeSearchRange.start && searchTime > liveEdgeSearchRange.end) {
                callback(new MediaPlayer.rules.SwitchRequest(null, p));
            } else {
                // continue searching for a first available fragment
                req = this.adapter.getFragmentRequestForTime(streamProcessor, trackInfo, searchTime, {ignoreIsFinished: true});
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
                    callback(new MediaPlayer.rules.SwitchRequest(startTime, p));
                    return;
                }
                useBinarySearch = true;
                liveEdgeSearchRange.end = startTime + (2 * liveEdgeSearchStep);

                //if the first request has succeeded we should check next fragment - if it does not exist we have found live edge,
                // otherwise start binary search to find live edge
                if (lastSearchTime === liveEdgeInitialSearchPosition) {
                    searchTime = lastSearchTime + fragmentDuration;
                    req = self.adapter.getFragmentRequestForTime(streamProcessor, trackInfo, searchTime, {ignoreIsFinished: true});
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
                // search completed, we should take the time of the last found fragment. If the last search succeded we
                // take this time. Otherwise, we should subtract the time of the search step which is equal to fragment duaration
                callback(new MediaPlayer.rules.SwitchRequest((lastSearchSucceeded ? lastSearchTime : (lastSearchTime - fragmentDuration)), p));
            } else {
                // update the search time and continue searching
                searchTime = ((liveEdgeSearchRange.start + liveEdgeSearchRange.end) / 2);
                req = this.adapter.getFragmentRequestForTime(streamProcessor, trackInfo, searchTime, {ignoreIsFinished: true});
                findLiveEdge.call(this, searchTime, onSearchForFragmentSucceeded, onSearchForFragmentFailed, req);
            }
        };

    return {
        metricsExt: undefined,
        adapter: undefined,
        timelineConverter: undefined,

        execute: function(context, callbackFunc) {
            var self = this,
                request,
                DVRWindow; // all fragments are supposed to be available in this interval

            callback = callbackFunc;
            streamProcessor = context.getStreamProcessor();
            fragmentLoader = streamProcessor.getFragmentLoader();
            trackInfo = context.getTrackInfo();
            fragmentDuration = trackInfo.fragmentDuration;
            DVRWindow = trackInfo.DVRWindow; // all fragments are supposed to be available in this interval

            // start position of the search, it is supposed to be a live edge - the last available fragment for the current mpd
            liveEdgeInitialSearchPosition = DVRWindow.end;

            if (trackInfo.useCalculatedLiveEdgeTime) {
                //By default an expected live edge is the end of the last segment.
                // A calculated live edge ('end' property of a range returned by TimelineConverter.calcSegmentAvailabilityRange)
                // is used as an initial point for finding the actual live edge.
                // But for SegmentTimeline mpds (w/o a negative @r) the end of the
                // last segment is the actual live edge. At the same time, calculated live edge is an expected live edge.
                // Thus, we need to switch an expected live edge and actual live edge for SegmentTimelne streams.
                var actualLiveEdge = self.timelineConverter.getExpectedLiveEdge();
                self.timelineConverter.setExpectedLiveEdge(liveEdgeInitialSearchPosition);
                callback(new MediaPlayer.rules.SwitchRequest(actualLiveEdge, p));
                return;
            }

            // we should search for a live edge in a time range which is limited by SEARCH_TIME_SPAN.
            liveEdgeSearchRange = {start: Math.max(0, (liveEdgeInitialSearchPosition - SEARCH_TIME_SPAN)), end: liveEdgeInitialSearchPosition + SEARCH_TIME_SPAN};
            // we have to use half of the availability interval (window) as a search step to ensure that we find a fragment in the window
            liveEdgeSearchStep = Math.floor((DVRWindow.end - DVRWindow.start) / 2);
            // start search from finding a request for the initial search time
            request = self.adapter.getFragmentRequestForTime(streamProcessor, trackInfo, liveEdgeInitialSearchPosition, {ignoreIsFinished: true});
            findLiveEdge.call(self, liveEdgeInitialSearchPosition, onSearchForFragmentSucceeded, onSearchForFragmentFailed, request);
        },

        reset: function() {
            liveEdgeInitialSearchPosition = NaN;
            liveEdgeSearchRange = null;
            liveEdgeSearchStep = NaN;
            trackInfo = null;
            useBinarySearch = false;
            fragmentDuration = NaN;
            streamProcessor = null;
            fragmentLoader = null;
        }
    };
};

MediaPlayer.rules.LiveEdgeBinarySearchRule.prototype = {
    constructor: MediaPlayer.rules.LiveEdgeBinarySearchRule
};
