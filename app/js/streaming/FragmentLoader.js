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
MediaPlayer.dependencies.FragmentLoader = function () {
    "use strict";

    var requests = [],
        lastRequest = null,
        loading = false,

        loadNext = function () {
            var req = new XMLHttpRequest(),
                httpRequestMetrics = new MediaPlayer.vo.metrics.HTTPRequest(),
                self = this;

            if (requests.length > 0) {
                lastRequest = requests.shift();
                lastRequest.requestStartDate = new Date();
                loading = true;

                req.responseType = "arraybuffer";
                req.open("GET", lastRequest.url, true);
                if (lastRequest.range) {
                    req.setRequestHeader("Range", "bytes=" + lastRequest.range);
                }

                req.onload = function () {
                    var entry = new MediaPlayer.vo.metrics.HTTPRequest.Trace(),
                        currentTime = new Date(),
                        bytes = req.response;

                    entry.s = currentTime;
                    lastRequest.requestEndDate = currentTime;

                    httpRequestMetrics = self.metricsModel.addHttpRequest(lastRequest.streamType,
                                                                          null,
                                                                          lastRequest.type,
                                                                          lastRequest.url,
                                                                          null,
                                                                          lastRequest.range,
                                                                          lastRequest.requestStartDate,
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

                req.onerror = function () {
                    httpRequestMetrics = self.metricsModel.addHttpRequest(lastRequest.streamType,
                                                                          null,
                                                                          lastRequest.type,
                                                                          lastRequest.url,
                                                                          null,
                                                                          lastRequest.range,
                                                                          lastRequest.requestStartDate,
                                                                          new Date(),
                                                                          req.status,
                                                                          null,
                                                                          lastRequest.duration);
                    lastRequest.deferred.reject("Error loading fragment.");
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