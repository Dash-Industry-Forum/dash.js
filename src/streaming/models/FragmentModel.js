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
        rejectedRequests = [],

        isLoadingPostponed = false,

        loadCurrentFragment = function(request) {
            var self = this;

            // We are about to start loading the fragment, so execute the corresponding callback
            self.notify(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_STARTED, {request: request});
            self.fragmentLoader.load(request);
        },

        removeRequest = function(arr, request) {
            var idx = arr.indexOf(request);

            if (idx !== -1) {
                arr.splice(idx, 1);
            }
        },

        getRequestForTime = function(arr, time, threshold) {
            var lastIdx = arr.length - 1,
                start = NaN,
                end = NaN,
                req = null,
                i;

            // loop through the executed requests and pick the one for which the playback interval matches the given time
            for (i = lastIdx; i >= 0; i -=1) {
                req = arr[i];
                start = req.startTime;
                end = start + req.duration;
                threshold = threshold || (req.duration / 2);
                if ((!isNaN(start) && !isNaN(end) && ((time + threshold) >= start) && ((time - threshold) < end)) || (isNaN(start) && isNaN(time))) {
                    return req;
                }
            }

            return null;
        },

        filterRequests = function(arr, filter) {
            if (!filter) return arr;

            // for time use a specific filtration function
            if (filter.hasOwnProperty("time")) {
                return [getRequestForTime.call(this, arr, filter.time, filter.threshold)];
            }

            return arr.filter(function(request/*, idx, arr*/) {
                for (var prop in filter) {
                    if (prop === "state") continue;

                    if (filter.hasOwnProperty(prop) && request[prop] != filter[prop]) return false;
                }

                return true;
            });
        },

        getRequestsForState = function(state) {
            var requests;

            switch (state) {
                case MediaPlayer.dependencies.FragmentModel.states.PENDING:
                    requests = pendingRequests;
                    break;
                case MediaPlayer.dependencies.FragmentModel.states.LOADING:
                    requests = loadingRequests;
                    break;
                case MediaPlayer.dependencies.FragmentModel.states.EXECUTED:
                    requests = executedRequests;
                    break;
                case MediaPlayer.dependencies.FragmentModel.states.REJECTED:
                    requests = rejectedRequests;
                    break;
                default:
                    requests = [];
            }

            return requests;
        },

        addSchedulingInfoMetrics = function(request, state) {
            if (!request) return;

            var mediaType = request.mediaType,
                now = new Date(),
                type = request.type,
                startTime = request.startTime,
                availabilityStartTime = request.availabilityStartTime,
                duration = request.duration,
                quality = request.quality,
                range = request.range;

            this.metricsModel.addSchedulingInfo(mediaType, now, type, startTime, availabilityStartTime, duration, quality, range, state);
        },

        onLoadingCompleted = function(e) {
            var request = e.data.request,
                response = e.data.response,
                error = e.error;

            loadingRequests.splice(loadingRequests.indexOf(request), 1);

            if (response && !error) {
                executedRequests.push(request);
            }

            addSchedulingInfoMetrics.call(this, request, error ? MediaPlayer.dependencies.FragmentModel.states.FAILED : MediaPlayer.dependencies.FragmentModel.states.EXECUTED);
            this.notify(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, {request: request, response: response}, error);
        },

        onBytesRejected = function(e) {
            var req = this.getRequests({state: MediaPlayer.dependencies.FragmentModel.states.EXECUTED, quality: e.data.quality, index: e.data.index})[0];
            // if request for an unappropriate quality has not been removed yet, do it now
            if (req) {
                removeRequest.call(this, executedRequests, req);
                // if index is not a number it means that this is a media fragment, so we should
                // request the fragment for the same time but with an appropriate quality
                // If this is init fragment do nothing, because it will be requested in loadInitialization method
                if (!isNaN(e.data.index)) {
                    rejectedRequests.push(req);
                    addSchedulingInfoMetrics.call(this, req, MediaPlayer.dependencies.FragmentModel.states.REJECTED);
                }
            }
        },

        onBufferLevelOutrun = function(/*e*/) {
            isLoadingPostponed = true;
        },

        onBufferLevelBalanced = function(/*e*/) {
            isLoadingPostponed = false;
        };

    return {
        system: undefined,
        log: undefined,
        metricsModel: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        setup: function() {
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN] = onBufferLevelOutrun;
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED] = onBufferLevelBalanced;
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_REJECTED] = onBytesRejected;
            this[MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_LOADING_COMPLETED] = onLoadingCompleted;
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

        getIsPostponed: function() {
            return isLoadingPostponed;
        },

        addRequest: function(value) {
            if (!value || this.isFragmentLoadedOrPending(value)) return false;

            pendingRequests.push(value);
            addSchedulingInfoMetrics.call(this, value, MediaPlayer.dependencies.FragmentModel.states.PENDING);

            return true;
        },

        isFragmentLoadedOrPending: function(request) {
            var isEqualComplete = function(req1, req2) {
                    return ((req1.action === "complete") && (req1.action === req2.action));
                },

                isEqualMedia = function(req1, req2) {
                    return ((req1.url === req2.url) && (req1.startTime === req2.startTime));
                },

                isEqualInit = function(req1, req2) {
                    return isNaN(req1.index) && isNaN(req2.index) && (req1.quality === req2.quality);
                },

                check = function(arr) {
                    var req,
                        isLoaded = false,
                        ln = arr.length,
                        i;

                    for (i = 0; i < ln; i += 1) {
                        req = arr[i];

                        if (isEqualMedia(request, req) || isEqualInit(request, req) || isEqualComplete(request, req)) {
                            //self.log(request.mediaType + " Fragment already loaded for time: " + request.startTime);
                            isLoaded = true;
                            break;
                        }
                    }

                    return isLoaded;
                };

            return (check(pendingRequests) || check(loadingRequests) || check(executedRequests));
        },

        /**
         *
         * Gets an array of {@link MediaPlayer.vo.FragmentRequest} objects
         *
         * @param {object} filter The object with properties by which the method filters the requests to be returned.
         *  the only mandatory property is state, which must be a value from {@link MediaPlayer.dependencies.FragmentModel.states}
         *  other properties should match the properties of {@link MediaPlayer.vo.FragmentRequest}. E.g.:
         *  getRequests({state: MediaPlayer.dependencies.FragmentModel.states.EXECUTED, quality: 0}) - returns
         *  all the requests from executedRequests array where requests.quality = filter.quality
         *
         * @returns {Array}
         * @memberof FragmentModel#
         */
        getRequests: function(filter) {
            var requests = [],
                filteredRequests = [],
                states,
                ln = 1;

            if (!filter || !filter.state) return requests;

            if (filter.state instanceof Array) {
                ln = filter.state.length;
                states = filter.state;
            } else {
                states = [filter.state];
            }

            for(var i = 0; i < ln; i += 1) {
                requests = getRequestsForState.call(this, states[i]);
                filteredRequests = filteredRequests.concat(filterRequests.call(this, requests, filter));
            }

            return filteredRequests;
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

        removeExecutedRequest: function(request) {
            removeRequest.call(this, executedRequests, request);
        },

        removeRejectedRequest: function(request) {
            removeRequest.call(this, rejectedRequests, request);
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
                    removeRequest.call(this, executedRequests, req);
                }
            }
        },

        cancelPendingRequests: function(quality) {
            var self = this,
                reqs = pendingRequests,
                canceled = reqs;

            pendingRequests = [];

            if (quality !== undefined) {
                pendingRequests = reqs.filter(function(request) {
                    if (request.quality === quality) {
                        return false;
                    }

                    canceled.splice(canceled.indexOf(request), 1);
                    return true;
                });
            }

            canceled.forEach(function(request) {
                addSchedulingInfoMetrics.call(self, request, MediaPlayer.dependencies.FragmentModel.states.CANCELED);
            });

            return canceled;
        },

        abortRequests: function() {
            this.fragmentLoader.abort();

            for (var i = 0, ln = loadingRequests.length; i < ln; i += 1) {
                removeRequest.call(this, executedRequests, loadingRequests[i]);
            }

            loadingRequests = [];
        },

        executeRequest: function(request) {
            var self = this,
                idx = pendingRequests.indexOf(request);

            if (!request || idx === -1) return;

            pendingRequests.splice(idx, 1);

            switch (request.action) {
                case "complete":
                    // Stream has completed, execute the correspoinding callback
                    executedRequests.push(request);
                    addSchedulingInfoMetrics.call(self, request, MediaPlayer.dependencies.FragmentModel.states.EXECUTED);
                    self.notify(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_STREAM_COMPLETED, {request: request});
                    break;
                case "download":
                    loadingRequests.push(request);
                    addSchedulingInfoMetrics.call(self, request, MediaPlayer.dependencies.FragmentModel.states.LOADING);
                    loadCurrentFragment.call(self, request);
                    break;
                default:
                    this.log("Unknown request action.");
            }
        },

        reset: function() {
            this.abortRequests();
            this.cancelPendingRequests();
        }
    };
};

MediaPlayer.dependencies.FragmentModel.prototype = {
    constructor: MediaPlayer.dependencies.FragmentModel
};

MediaPlayer.dependencies.FragmentModel.eventList = {
    ENAME_STREAM_COMPLETED: "streamCompleted",
    ENAME_FRAGMENT_LOADING_STARTED: "fragmentLoadingStarted",
    ENAME_FRAGMENT_LOADING_COMPLETED: "fragmentLoadingCompleted"
};

/* Public Static Constants */
MediaPlayer.dependencies.FragmentModel.states = {
    PENDING: "pending",
    LOADING: "loading",
    EXECUTED: "executed",
    REJECTED: "rejected",
    CANCELED: "canceled",
    FAILED: "failed"
};