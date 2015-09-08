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
MediaPlayer.dependencies.FragmentLoader = function () {
    "use strict";

    var RETRY_ATTEMPTS = MediaPlayer.dependencies.FragmentLoader.RETRY_ATTEMPTS,
        RETRY_INTERVAL = MediaPlayer.dependencies.FragmentLoader.RETRY_INTERVAL,
        xhrs = [],

        doLoad = function (request, remainingAttempts) {
            var req = new XMLHttpRequest(),
                traces = [],
                firstProgress = true,
                needFailureReport = true,
                lastTraceTime = null,
                self = this,
                handleLoaded = function(requestVO, succeeded) {
                    needFailureReport = false;

                    var currentTime = new Date(),
                        bytes = req.response,
                        latency,
                        download,
                        httpRequestMetrics = null;

                    traces.push({
                        s: currentTime,
                        d: currentTime.getTime() - lastTraceTime.getTime(),
                        b: [bytes ? bytes.byteLength : 0]
                    });

                    if (!requestVO.firstByteDate) {
                        requestVO.firstByteDate = requestVO.requestStartDate;
                    }
                    requestVO.requestEndDate = currentTime;

                    latency = (requestVO.firstByteDate.getTime() - requestVO.requestStartDate.getTime());
                    download = (requestVO.requestEndDate.getTime() - requestVO.firstByteDate.getTime());

                    self.log((succeeded ? "loaded " : "failed ") + requestVO.mediaType + ":" + requestVO.type + ":" + requestVO.startTime + " (" + req.status + ", " + latency + "ms, " + download + "ms)");

                    httpRequestMetrics = self.metricsModel.addHttpRequest(
                        request.mediaType,
                        null,
                        request.type,
                        request.url,
                        req.responseURL || null,
                        request.range,
                        request.requestStartDate,
                        requestVO.firstByteDate,
                        requestVO.requestEndDate,
                        req.status,
                        request.duration,
                        req.getAllResponseHeaders()
                    );

                    if (succeeded) {
                        // trace is only for successful requests
                        traces.forEach(function (trace) {
                            self.metricsModel.appendHttpTrace(httpRequestMetrics,
                                                              trace.s,
                                                              trace.d,
                                                              trace.b);
                        });
                    }
                };

                xhrs.push(req);
                request.requestStartDate = new Date();

                traces.push({
                    s: request.requestStartDate,
                    d: 0,
                    b: [0]
                });

                lastTraceTime = request.requestStartDate;

                req.open("GET", self.requestModifierExt.modifyRequestURL(request.url), true);
                req.responseType = "arraybuffer";
                req = self.requestModifierExt.modifyRequestHeader(req);
/*
                req.setRequestHeader("Cache-Control", "no-cache");
                req.setRequestHeader("Pragma", "no-cache");
                req.setRequestHeader("If-Modified-Since", "Sat, 1 Jan 2000 00:00:00 GMT");
*/
                if (request.range) {
                    req.setRequestHeader("Range", "bytes=" + request.range);
                }

                req.onprogress = function (event) {
                    var currentTime = new Date();
                    if (firstProgress) {
                        firstProgress = false;
                        if (!event.lengthComputable || (event.lengthComputable && event.total != event.loaded)) {
                            request.firstByteDate = currentTime;
                        }
                    }

                    if (event.lengthComputable) {
                        request.bytesLoaded = event.loaded;
                        request.bytesTotal = event.total;
                    }

                    traces.push({
                        s: currentTime,
                        d: currentTime.getTime() - lastTraceTime.getTime(),
                        b: [req.response ? req.response.byteLength : 0]
                    });

                    lastTraceTime = currentTime;
                    self.notify(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_LOADING_PROGRESS, {request: request});
                };

                req.onload = function () {
                    if (req.status < 200 || req.status > 299) return;

                    handleLoaded(request, true);
                    self.notify(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_LOADING_COMPLETED, {request: request, response: req.response});
                };

                req.onloadend = req.onerror = function () {
                    if (xhrs.indexOf(req) === -1) {
                        return;
                    } else {
                        xhrs.splice(xhrs.indexOf(req), 1);
                    }

                    if (!needFailureReport) return;

                    handleLoaded(request, false);

                    if (remainingAttempts > 0) {
                        self.log("Failed loading fragment: " + request.mediaType + ":" + request.type + ":" + request.startTime + ", retry in " + RETRY_INTERVAL + "ms" + " attempts: " + remainingAttempts);
                        remainingAttempts--;
                        setTimeout(function() {
                            doLoad.call(self, request, remainingAttempts);
                        }, RETRY_INTERVAL);
                    } else {
                        self.log("Failed loading fragment: " + request.mediaType + ":" + request.type + ":" + request.startTime + " no retry attempts left");
                        self.errHandler.downloadError("content", request.url, req);
                        self.notify(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_LOADING_COMPLETED, {request: request, bytes: null}, new MediaPlayer.vo.Error(null, "failed loading fragment", null));
                    }
                };

                req.send();
        },

        checkForExistence = function(request) {
            var self = this,
                req = new XMLHttpRequest(),
                isSuccessful = false;

            req.open("HEAD", request.url, true);

            req.onload = function () {
                if (req.status < 200 || req.status > 299) return;

                isSuccessful = true;

                self.notify(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_CHECK_FOR_EXISTENCE_COMPLETED, {request: request, exists: true});
            };

            req.onloadend = req.onerror = function () {
                if (isSuccessful) return;

                self.notify(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_CHECK_FOR_EXISTENCE_COMPLETED, {request: request, exists: false});
            };

            req.send();
        };

    return {
        metricsModel: undefined,
        errHandler: undefined,
        log: undefined,
        requestModifierExt:undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        load: function (req) {

            if (!req) {
                this.notify(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_LOADING_COMPLETED, {request: req, bytes: null}, new MediaPlayer.vo.Error(null, "request is null", null));
            } else {
                doLoad.call(this, req, RETRY_ATTEMPTS);
            }
        },

        checkForExistence: function(req) {
            if (!req) {
                this.notify(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_CHECK_FOR_EXISTENCE_COMPLETED, {request: req, exists: false});
                return;
            }

            checkForExistence.call(this, req);
        },

        abort: function() {
            var i,
                req,
                ln = xhrs.length;

            for (i = 0; i < ln; i +=1) {
                req = xhrs[i];
                xhrs[i] = null;
                req.abort();
                req = null;
            }

            xhrs = [];
        }
    };
};

MediaPlayer.dependencies.FragmentLoader.RETRY_ATTEMPTS = 3;
MediaPlayer.dependencies.FragmentLoader.RETRY_INTERVAL = 500;

MediaPlayer.dependencies.FragmentLoader.prototype = {
    constructor: MediaPlayer.dependencies.FragmentLoader
};

MediaPlayer.dependencies.FragmentLoader.eventList = {
    ENAME_LOADING_COMPLETED: "loadingCompleted",
    ENAME_LOADING_PROGRESS: "loadingProgress",
    ENAME_CHECK_FOR_EXISTENCE_COMPLETED: "checkForExistenceCompleted"
};
