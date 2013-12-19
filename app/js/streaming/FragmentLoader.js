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
MediaPlayer.dependencies.FragmentLoader = function () {
    "use strict";

    var RETRY_ATTEMPTS = 3,
        RETRY_INTERVAL = 500,
        xhrs = [],

        doLoad = function (request, remainingAttempts) {
            var req = new XMLHttpRequest(),
                httpRequestMetrics = null,
                firstProgress = true,
                needFailureReport = true,
                self = this;

                xhrs.push(req);
                request.requestStartDate = new Date();
                request.firstByteDate = request.requestStartDate;

                req.open("GET", request.url, true);
                req.responseType = "arraybuffer";
/*
                req.setRequestHeader("Cache-Control", "no-cache");
                req.setRequestHeader("Pragma", "no-cache");
                req.setRequestHeader("If-Modified-Since", "Sat, 1 Jan 2000 00:00:00 GMT");
*/
                if (request.range) {
                    req.setRequestHeader("Range", "bytes=" + request.range);
                }

                req.onprogress = function (event) {
                    if (firstProgress) {
                        firstProgress = false;
                        if (!event.lengthComputable || (event.lengthComputable && event.total != event.loaded)) {
                            request.firstByteDate = new Date();
                        }
                    }
                };

                req.onload = function () {
                    if (req.status < 200 || req.status > 299)
                    {
                      return;
                    }
                    needFailureReport = false;

                    request.requestEndDate = new Date();

                    var currentTime = request.requestEndDate,
                        bytes = req.response,
                        latency = (request.firstByteDate.getTime() - request.requestStartDate.getTime()),
                        download = (request.requestEndDate.getTime() - request.firstByteDate.getTime()),
                        total = (request.requestEndDate.getTime() - request.requestStartDate.getTime());

                    self.debug.log("segment loaded: (" + req.status + ", " + latency + "ms, " + download + "ms, " + total + "ms) " + request.url);

                    httpRequestMetrics = self.metricsModel.addHttpRequest(request.streamType,
                                                                          null,
                                                                          request.type,
                                                                          request.url,
                                                                          null,
                                                                          request.range,
                                                                          request.requestStartDate,
                                                                          request.firstByteDate,
                                                                          request.requestEndDate,
                                                                          req.status,
                                                                          null,
                                                                          request.duration);

                    self.metricsModel.appendHttpTrace(httpRequestMetrics,
                                                      currentTime,
                                                      new Date().getTime() - currentTime.getTime(),
                                                      [bytes.byteLength]);

                    request.deferred.resolve({
                        data: bytes,
                        request: request
                    });
                };

                req.onloadend = req.onerror = function () {
                    if (xhrs.indexOf(req) === -1) {
                        return;
                    } else {
                        xhrs.splice(xhrs.indexOf(req), 1);
                    }

                    if (!needFailureReport)
                    {
                      return;
                    }
                    needFailureReport = false;

                    request.requestEndDate = new Date();

                    var latency = (request.firstByteDate.getTime() - request.requestStartDate.getTime()),
                        download = (request.requestEndDate.getTime() - request.firstByteDate.getTime()),
                        total = (request.requestEndDate.getTime() - request.requestStartDate.getTime());

                    self.debug.log("segment loaded: (" + req.status + ", " + latency + "ms, " + download + "ms, " + total + "ms) " + request.url);

                    httpRequestMetrics = self.metricsModel.addHttpRequest(request.streamType,
                                                                          null,
                                                                          request.type,
                                                                          request.url,
                                                                          null,
                                                                          request.range,
                                                                          request.requestStartDate,
                                                                          request.firstByteDate,
                                                                          request.requestEndDate,
                                                                          req.status,
                                                                          null,
                                                                          request.duration);

                    if (remainingAttempts > 0) {
                        self.debug.log("Failed loading segment: " + request.url + ", retry in " + RETRY_INTERVAL + "ms" + " attempts: " + remainingAttempts);
                        remainingAttempts--;
                        setTimeout(function() {
                            doLoad.call(self, request, remainingAttempts);
                        }, RETRY_INTERVAL);
                    } else {
                        self.debug.log("Failed loading segment: " + request.url + " no retry attempts left");
                        self.errHandler.downloadError("content", request.url, req);
                        request.deferred.reject(req);
                    }
                };

                req.send();
        },

        checkForExistence = function(request, remainingAttempts) {
            var req = new XMLHttpRequest(),
                isSuccessful = false,
                self = this;

            req.open("HEAD", request.url, true);

            req.onload = function () {
                if (req.status < 200 || req.status > 299) return;

                isSuccessful = true;

                request.deferred.resolve(request);
            };

            req.onloadend = req.onerror = function () {
                if (isSuccessful) return;

                if (remainingAttempts > 0) {
                    remainingAttempts--;
                    setTimeout(function() {
                        checkForExistence.call(self, request, remainingAttempts);
                    }, RETRY_INTERVAL);
                } else {
                    request.deferred.reject(req);
                }
            };

            req.send();
        };

    return {
        metricsModel: undefined,
        errHandler: undefined,
        debug: undefined,

        load: function (req) {

            if (!req) {
                return Q.when(null);
            }

            req.deferred = Q.defer();
            doLoad.call(this, req, RETRY_ATTEMPTS);

            return req.deferred.promise;
        },

        checkForExistence: function(req) {
            if (!req) {
                return Q.when(null);
            }

            req.deferred = Q.defer();
            checkForExistence.call(this, req, RETRY_ATTEMPTS);

            return req.deferred.promise;
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

MediaPlayer.dependencies.FragmentLoader.prototype = {
    constructor: MediaPlayer.dependencies.FragmentLoader
};