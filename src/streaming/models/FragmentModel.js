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

        removeExecutedRequest = function(request) {
            var idx = executedRequests.indexOf(request);

            if (idx !== -1) {
                executedRequests.splice(idx, 1);
            }
        },

        getRequestForTime = function(arr, time) {
            var lastIdx = arr.length - 1,
                THRESHOLD = 0.001,
                start = NaN,
                end = NaN,
                req = null,
                i;

            // loop through the executed requests and pick the one for which the playback interval matches the given time
            for (i = lastIdx; i >= 0; i -=1) {
                req = arr[i];
                start = req.startTime;
                end = start + req.duration;
                if ((!isNaN(start) && !isNaN(end) && ((time + THRESHOLD) >= start) && (time < end)) || (isNaN(start) && isNaN(time))) {
                    return req;
                }
            }

            return null;
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

            addSchedulingInfoMetrics.call(this, request, error ? MediaPlayer.vo.metrics.SchedulingInfo.FAILED_STATE : MediaPlayer.vo.metrics.SchedulingInfo.EXECUTED_STATE);
            this.notify(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, {request: request, response: response}, error);
        },

        onBytesRejected = function(e) {
            var req = this.getExecutedRequestForQualityAndIndex(e.data.quality, e.data.index);
            // if request for an unappropriate quality has not been removed yet, do it now
            if (req) {
                this.removeExecutedRequest(req);
                // if index is not a number it means that this is a media fragment, so we should
                // request the fragment for the same time but with an appropriate quality
                // If this is init fragment do nothing, because it will be requested in loadInitialization method
                if (!isNaN(e.data.index)) {
                    rejectedRequests.push(req);
                    addSchedulingInfoMetrics.call(this, req, MediaPlayer.vo.metrics.SchedulingInfo.REJECTED_STATE);
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
        debug: undefined,
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
            addSchedulingInfoMetrics.call(this, value, MediaPlayer.vo.metrics.SchedulingInfo.PENDING_STATE);

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
                            //self.debug.log(request.mediaType + " Fragment already loaded for time: " + request.startTime);
                            isLoaded = true;
                            break;
                        }
                    }

                    return isLoaded;
                };

            return (check(pendingRequests) || check(loadingRequests) || check(executedRequests));
        },

        getPendingRequests: function() {
            return pendingRequests;
        },

        getLoadingRequests: function() {
            return loadingRequests;
        },

        getExecutedRequests: function() {
            return executedRequests;
        },

        getRejectedRequests: function() {
            return rejectedRequests;
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
            return getRequestForTime(executedRequests, time);
        },

        getPendingRequestForTime: function(time) {
            return getRequestForTime(pendingRequests, time);
        },

        getLoadingRequestForTime: function(time) {
            return getRequestForTime(loadingRequests, time);
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
                addSchedulingInfoMetrics.call(self, request, MediaPlayer.vo.metrics.SchedulingInfo.CANCELED_STATE);
            });

            return canceled;
        },

        abortRequests: function() {
            this.fragmentLoader.abort();

            for (var i = 0, ln = loadingRequests.length; i < ln; i += 1) {
                this.removeExecutedRequest(loadingRequests[i]);
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
                    addSchedulingInfoMetrics.call(self, request, MediaPlayer.vo.metrics.SchedulingInfo.EXECUTED_STATE);
                    self.notify(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_STREAM_COMPLETED, {request: request});
                    break;
                case "download":
                    loadingRequests.push(request);
                    addSchedulingInfoMetrics.call(self, request, MediaPlayer.vo.metrics.SchedulingInfo.LOADING_STATE);
                    loadCurrentFragment.call(self, request);
                    break;
                default:
                    this.debug.log("Unknown request action.");
            }
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