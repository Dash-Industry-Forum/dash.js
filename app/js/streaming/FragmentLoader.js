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

    var doLoad = function (request) {
            var req = new XMLHttpRequest(),
                deferred = Q.defer(),
                httpRequestMetrics = null,
                firstProgress = true,
                needFailureReport = true,
                self = this;

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

                    deferred.resolve({
                        data: bytes,
                        request: request
                    });
                };

                req.onloadend = req.onerror = function () {
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

                    self.errHandler.downloadError("content", request.url, req);

                    deferred.reject(req);
                };

                req.send();

                return deferred.promise;
        };

    return {
        metricsModel: undefined,
        errHandler: undefined,
        debug: undefined,

        load: function (req) {

            if (!req) {
                return Q.when(null);
            }

            return doLoad.call(this, req);
        }
    };
};

MediaPlayer.dependencies.FragmentLoader.prototype = {
    constructor: MediaPlayer.dependencies.FragmentLoader
};