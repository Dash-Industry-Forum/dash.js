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
MediaPlayer.dependencies.ManifestLoader = function () {
    "use strict";

    var RETRY_ATTEMPTS = 3,
        RETRY_INTERVAL = 500,
        deferred = null,


    parseBaseUrl = function (url) {
            var base = null;

            if (url.indexOf("/") !== -1)
            {
                if (url.indexOf("?") !== -1) {
                    url = url.substring(0, url.indexOf("?"));
                }
                base = url.substring(0, url.lastIndexOf("/") + 1);
            }

            return base;
        },

        doLoad = function (url, remainingAttempts) {
            var baseUrl = parseBaseUrl(url),
                request = new XMLHttpRequest(),
                requestTime = new Date(),
                mpdLoadedTime = null,
                needFailureReport = true,
                onload = null,
                report = null,
                self = this;


            onload = function () {
                if (request.status < 200 || request.status > 299)
                {
                  return;
                }
                needFailureReport = false;
                mpdLoadedTime = new Date();

                self.tokenAuthentication.checkRequestHeaderForToken(request);
                self.metricsModel.addHttpRequest("stream",
                                                 null,
                                                 "MPD",
                                                 url,
                                                 null,
                                                 null,
                                                 requestTime,
                                                 mpdLoadedTime,
                                                 request.status,
                                                 null,
                                                 null);

                self.parser.parse(request.responseText, baseUrl).then(
                    function (manifest) {
                        manifest.mpdUrl = url;
                        manifest.mpdLoadedTime = mpdLoadedTime;
                        self.metricsModel.addManifestUpdate("stream", manifest.type, requestTime, mpdLoadedTime, manifest.availabilityStartTime);
                        deferred.resolve(manifest);
                    },
                    function () {
                        deferred.reject(request);
                    }
                );
            };

            report = function () {
                if (!needFailureReport)
                {
                  return;
                }
                needFailureReport = false;

                self.metricsModel.addHttpRequest("stream",
                                                 null,
                                                 "MPD",
                                                 url,
                                                 null,
                                                 null,
                                                 requestTime,
                                                 new Date(),
                                                 request.status,
                                                 null,
                                                 null);
                if (remainingAttempts > 0) {
                    self.debug.log("Failed loading manifest: " + url + ", retry in " + RETRY_INTERVAL + "ms" + " attempts: " + remainingAttempts);
                    remainingAttempts--;
                    setTimeout(function() {
                        doLoad.call(self, url, remainingAttempts);
                    }, RETRY_INTERVAL);
                } else {
                    self.debug.log("Failed loading manifest: " + url + " no retry attempts left");
                    self.errHandler.downloadError("manifest", url, request);
                    deferred.reject(request);
                }
            };

            try {
                //this.debug.log("Start loading manifest: " + url);
                request.onload = onload;
                request.onloadend = report;
                request.onerror = report;
                request.open("GET", url, true);
                request.send();
            } catch(e) {
                request.onerror();
            }
        };

    return {
        debug: undefined,
        parser: undefined,
        errHandler: undefined,
        metricsModel: undefined,
        tokenAuthentication:undefined,
        load: function(url) {
            deferred = Q.defer();
            doLoad.call(this, url, RETRY_ATTEMPTS);

            return deferred.promise;
        }
    };
};

MediaPlayer.dependencies.ManifestLoader.prototype = {
    constructor: MediaPlayer.dependencies.ManifestLoader
};


