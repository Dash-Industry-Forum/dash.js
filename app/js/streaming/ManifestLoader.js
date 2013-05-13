/*
 *
 * The copyright in this software is being made available under the BSD
 * License, included below. This software may be subject to other third party
 * and contributor rights, including patent rights, and no such rights are
 * granted under this license.
 * 
 * Copyright (c) 2013, Dash Industry Forum
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 * •  Neither the name of the Dash Industry Forum nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS”
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.dependencies.ManifestLoader = function () {
    "use strict";

    var parseBaseUrl = function (url) {
            var base = null;

            if (url.indexOf("/") !== -1) {
                base = url.substring(0, url.lastIndexOf("/") + 1);
            }

            return base;
        },

        load = function (url) {
            var baseUrl = parseBaseUrl(url),
                deferred = Q.defer(),
                request = new XMLHttpRequest(),
                requestTime = new Date(),
                loaded = false,
                self = this;

            this.debug.log("Start loading manifest: " + url);

            request.open("GET", url, true);

            request.onloadend = function (e) {
                if (!loaded) {
                    deferred.reject("Error loading manifest.");
                }
            };

            request.onload = function () {
                loaded = true;

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

                self.parser.parse(request.responseText, baseUrl).then(
                    function (manifest) {
                        manifest.mpdUrl = url;
                        deferred.resolve(manifest);
                    }
                );
            };

            request.onerror = function () {
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

                deferred.reject("Error loading manifest.");
            };

            request.send();

            return deferred.promise;
        };

    return {
        debug: undefined,
        parser: undefined,
        metricsModel: undefined,
        load: load
    };
};

MediaPlayer.dependencies.ManifestLoader.prototype = {
    constructor: MediaPlayer.dependencies.ManifestLoader
};


