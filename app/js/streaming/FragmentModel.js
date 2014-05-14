/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 * 
 * Copyright (c) 2013, Digital Primates
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

MediaPlayer.dependencies.FragmentModel = function () {
    "use strict";

    var context,
        executedRequests = [],
        pendingRequests = [],
        loadingRequests = [],

        LOADING_REQUEST_THRESHOLD = 2,
        isLoadingPostponed = false,

        loadCurrentFragment = function(request) {
            var self = this;

            // We are about to start loading the fragment, so execute the corresponding callback
            self.notify(self.eventList.ENAME_FRAGMENT_LOADING_STARTED, request);
            self.fragmentLoader.load(request);
        },

        sortRequestsByProperty = function(requestsArray, sortProp) {
            var compare = function (req1, req2){
                if (req1[sortProp] < req2[sortProp]) return -1;
                if (req1[sortProp] > req2[sortProp]) return 1;
                return 0;
            };

            requestsArray.sort(compare);

        },

        removeExecutedRequest = function(request) {
            var idx = executedRequests.indexOf(request);

            if (idx !== -1) {
                executedRequests.splice(idx, 1);
            }
        },

        onLoadingCompleted = function(sender, request, response, error) {
            if (response && !error) {
                loadingRequests.splice(loadingRequests.indexOf(request), 1);
                executedRequests.push(request);
                this.notify(this.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, request, response);
            } else {
                loadingRequests.splice(loadingRequests.indexOf(request), 1);
                this.notify(this.eventList.ENAME_FRAGMENT_LOADING_FAILED, request);
            }
        },

        onBufferLevelOutrun = function() {
            isLoadingPostponed = true;
        },

        onBufferLevelBalanced = function() {
            isLoadingPostponed = false;
        };

    return {
        system: undefined,
        debug: undefined,
        eventList: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        setup: function() {
            this.bufferLevelOutrun = onBufferLevelOutrun;
            this.bufferLevelBalanced = onBufferLevelBalanced;
            this.loadingCompleted = onLoadingCompleted;
        },

        setLoader: function(value) {
            this.fragmentLoader = value;
        },

        setContext: function(value) {
            context = value;
        },

        getContext: function() {
            return context;
        },

        addRequest: function(value) {
            if (value) {
                pendingRequests.push(value);
                sortRequestsByProperty.call(this, pendingRequests, "index");
            }
        },

        isFragmentLoadedOrPending: function(request) {
            var isLoaded = false,
                ln = executedRequests.length,
                req;

            // First, check if the fragment has already been loaded
            for (var i = 0; i < ln; i++) {
                req = executedRequests[i];
                if (request.startTime === req.startTime || ((req.action === "complete") && request.action === req.action)) {
                    //self.debug.log(request.streamType + " Fragment already loaded for time: " + request.startTime);
                    if (request.url === req.url) {
                        //self.debug.log(request.streamType + " Fragment url already loaded: " + request.url);
                        isLoaded = true;
                        break;
                    } else {
                        // remove overlapping segement of a different quality
                        removeExecutedRequest(request);
                    }
                }
            }

            // if it has not been loaded check if it is going to be loaded
            if (!isLoaded) {
                for (i = 0, ln = pendingRequests.length; i < ln; i += 1) {
                    req = pendingRequests[i];
                    if ((request.url === req.url) && (request.startTime === req.startTime)) {
                        isLoaded = true;
                    }
                }
            }

            if (!isLoaded) {
                for (i = 0, ln = loadingRequests.length; i < ln; i += 1) {
                    req = loadingRequests[i];
                    if ((request.url === req.url) && (request.startTime === req.startTime)) {
                        isLoaded = true;
                    }
                }
            }

            return isLoaded;
        },

        isReady: function() {
            return context.isReady();
        },

        getPendingRequests: function() {
            return pendingRequests;
        },

        getLoadingRequests: function() {
            return loadingRequests;
        },

        getLoadingTime: function() {
            var loadingTime = 0,
                req,
                i;

            // get the latest loaded request and calculate its loading time. In case requestEndDate/firstByteDate properties
            // have not been set (e.g. for a request with action='complete') we should get the previous request.
            for (i = executedRequests.length - 1; i >= 0; i -= 1) {
                req = executedRequests[i];

                if ((req.requestEndDate instanceof Date) && (req.firstByteDate instanceof Date)) {
                    loadingTime = req.requestEndDate.getTime() - req.firstByteDate.getTime();
                    break;
                }
            }

            return loadingTime;
        },

        getExecutedRequestForTime: function(time) {
            var lastIdx = executedRequests.length - 1,
                start = NaN,
                end = NaN,
                req = null,
                i;

            // loop through the executed requests and pick the one for which the playback interval matches the given time
            for (i = lastIdx; i >= 0; i -=1) {
                req = executedRequests[i];
                start = req.startTime;
                end = start + req.duration;
                if (!isNaN(start) && !isNaN(end) && (time > start) && (time < end)) {
                    return req;
                }
            }

            return null;
        },

        getExecutedRequestForQualityAndIndex: function(quality, index) {
            var lastIdx = executedRequests.length - 1,
                req = null,
                i;

            for (i = lastIdx; i >= 0; i -=1) {
                req = executedRequests[i];
                if ((req.quality === quality) && (req.index === index)) {
                    return req;
                }
            }

            return null;
        },

        removeExecutedRequest: function(request) {
            removeExecutedRequest.call(this, request);
        },

        removeExecutedRequestsBeforeTime: function(time) {
            var lastIdx = executedRequests.length - 1,
                start = NaN,
                req = null,
                i;

            // loop through the executed requests and remove the ones for which startTime is less than the given time
            for (i = lastIdx; i >= 0; i -=1) {
                req = executedRequests[i];
                start = req.startTime;
                if (!isNaN(start) && (start < time)) {
                    removeExecutedRequest.call(this, req);
                }
            }
        },

        cancelPendingRequests: function() {
            pendingRequests = [];
        },

        abortRequests: function() {
            this.fragmentLoader.abort();

            for (var i = 0, ln = loadingRequests.length; i < ln; i += 1) {
                this.removeExecutedRequest(loadingRequests[i]);
            }

            loadingRequests = [];
        },

        executeCurrentRequest: function() {
            var self = this,
                currentRequest;

            if (pendingRequests.length === 0 || isLoadingPostponed) return;

            if (loadingRequests.length >= LOADING_REQUEST_THRESHOLD) {
                // too many requests have been loading, do nothing until some of them are loaded or aborted
                return;
            }

            // take the next request to execute and remove it from the list of pending requests
            currentRequest = pendingRequests.shift();

            switch (currentRequest.action) {
                case "complete":
                    // Stream has completed, execute the correspoinding callback
                    executedRequests.push(currentRequest);
                    self.notify(self.eventList.ENAME_STREAM_COMPLETED, currentRequest);
                    break;
                case "download":
                    loadingRequests.push(currentRequest);
                    loadCurrentFragment.call(self, currentRequest);
                    break;
                default:
                    this.debug.log("Unknown request action.");
                    if (currentRequest.deferred) {
                        currentRequest.deferred.reject();
                        currentRequest.deferred = null;
                    } else {
                        self.notify(self.eventList.ENAME_FRAGMENT_LOADING_FAILED, currentRequest);
                    }
            }
        }
    };
};

MediaPlayer.dependencies.FragmentModel.prototype = {
    constructor: MediaPlayer.dependencies.FragmentModel
};