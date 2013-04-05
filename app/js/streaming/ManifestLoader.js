/*
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * author Digital Primates
 * copyright dash-if 2012
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


