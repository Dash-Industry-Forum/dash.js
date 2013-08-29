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

    var requests = [],
        lastRequest = null,
        loading = false,

        loadNext = function () {
            var req = new XMLHttpRequest(),
                httpRequestMetrics = null,
                firstProgress = true,
                loaded = false,
                self = this;

            if (requests.length > 0) {
                lastRequest = requests.shift();
                lastRequest.requestStartDate = new Date();
                lastRequest.firstByteDate = lastRequest.requestStartDate;
                loading = true;

                req.open("GET", lastRequest.url, true);
                req.responseType = "arraybuffer";
/*
                req.setRequestHeader("Cache-Control", "no-cache");
                req.setRequestHeader("Pragma", "no-cache");
                req.setRequestHeader("If-Modified-Since", "Sat, 1 Jan 2000 00:00:00 GMT");
*/
                if (lastRequest.range) {
                    req.setRequestHeader("Range", "bytes=" + lastRequest.range);
                }

                req.onprogress = function (event) {
                    if (firstProgress) {
                        firstProgress = false;
                        if (!event.lengthComputable || (event.lengthComputable && event.total != event.loaded)) {
                            lastRequest.firstByteDate = new Date();
                        }
                    }
                };

                req.onload = function () {
                    if (req.status < 200 || req.status > 299)
                    {
                      return;
                    }
                    loaded = true;
                    lastRequest.requestEndDate = new Date();

                    var currentTime = lastRequest.requestEndDate,
                        bytes = req.response,
                        latency = (lastRequest.firstByteDate.getTime() - lastRequest.requestStartDate.getTime()),
                        download = (lastRequest.requestEndDate.getTime() - lastRequest.firstByteDate.getTime()),
                        total = (lastRequest.requestEndDate.getTime() - lastRequest.requestStartDate.getTime());

                    self.debug.log("segment loaded: (" + req.status + ", " + latency + "ms, " + download + "ms, " + total + "ms) " + lastRequest.url);

                    httpRequestMetrics = self.metricsModel.addHttpRequest(lastRequest.streamType,
                                                                          null,
                                                                          lastRequest.type,
                                                                          lastRequest.url,
                                                                          null,
                                                                          lastRequest.range,
                                                                          lastRequest.requestStartDate,
                                                                          lastRequest.firstByteDate,
                                                                          lastRequest.requestEndDate,
                                                                          req.status,
                                                                          null,
                                                                          lastRequest.duration);

                    self.metricsModel.appendHttpTrace(httpRequestMetrics,
                                                      currentTime,
                                                      new Date().getTime() - currentTime.getTime(),
                                                      [bytes.byteLength]);

                    lastRequest.deferred.resolve({
                        data: bytes,
                        request: lastRequest
                    });

                    lastRequest.deferred = null;
                    lastRequest = null;
                    req = null;

                    loadNext.call(self);
                };

                req.onloadend = req.onerror = function () {
                    if (loaded)
                    {
                      return;
                    }

                    lastRequest.requestEndDate = new Date();

                    var latency = (lastRequest.firstByteDate.getTime() - lastRequest.requestStartDate.getTime()),
                        download = (lastRequest.requestEndDate.getTime() - lastRequest.firstByteDate.getTime()),
                        total = (lastRequest.requestEndDate.getTime() - lastRequest.requestStartDate.getTime());

                    self.debug.log("segment loaded: (" + req.status + ", " + latency + "ms, " + download + "ms, " + total + "ms) " + lastRequest.url);

                    httpRequestMetrics = self.metricsModel.addHttpRequest(lastRequest.streamType,
                                                                          null,
                                                                          lastRequest.type,
                                                                          lastRequest.url,
                                                                          null,
                                                                          lastRequest.range,
                                                                          lastRequest.requestStartDate,
                                                                          lastRequest.firstByteDate,
                                                                          lastRequest.requestEndDate,
                                                                          req.status,
                                                                          null,
                                                                          lastRequest.duration);
                    lastRequest.deferred.reject("Error loading fragment.");

                    loadNext.call(self);
                };

                req.send();
            } else {
                loading = false;
            }
        },

        loadRequest = function (req) {
            var deferred = Q.defer();

            req.deferred = deferred;

            requests.push(req);

            if (!loading) {
                loadNext.call(this);
            }

            return deferred.promise;
        };

    return {
        metricsModel: undefined,
        debug: undefined,

        getLoading: function () {
            return loading;
        },

        load: function (req) {
            var promise = null;

            if (!req) {
                return;
            }

            promise = loadRequest.call(this, req);
            return promise;
        }
    };
};

MediaPlayer.dependencies.FragmentLoader.prototype = {
    constructor: MediaPlayer.dependencies.FragmentLoader
};