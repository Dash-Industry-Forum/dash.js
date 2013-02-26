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
 * copyright Digital Primates 2012
 */
MediaPlayer.dependencies.FragmentLoader = function () {
    "use strict";

    var requests = [],
        lastRequest = null,
        loading = false,
        
        loadNext = function () {
            var req = new XMLHttpRequest();

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
                    var bytes = req.response;
                    lastRequest.requestEndDate = new Date();
                    lastRequest.deferred.resolve({
                        data: bytes,
                        request: lastRequest
                    });
                    loadNext();
                };
                
                req.onerror = function () {
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
                loadNext();
            }
            
            return deferred.promise;
        };

    return {
        getLoading: function () {
            return loading;
        },
        
        load: function (req) {
            if (!req) {
                return;
            }
            
            return loadRequest(req);
        }
    };
};

MediaPlayer.dependencies.FragmentLoader.prototype = {
    constructor: MediaPlayer.dependencies.FragmentLoader
};