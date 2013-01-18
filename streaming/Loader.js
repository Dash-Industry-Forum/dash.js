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
Stream.modules.Loader = (function () {
    "use strict";

    var Constr;

    Constr = function () {
        this.onBytesLoaded = function (a, b) { };
        this.loading = false;
        this.lastRequest = null;
        this.requests = [];
        this.xhr = new XMLHttpRequest();
        this.xhr.responseType = "arraybuffer";
        this.xhr.addEventListener("load", this.onLoad.bind(this), false);
        this.xhr.addEventListener("error", this.onError.bind(this), false);
    };

    Constr.prototype = {
        constructor: Stream.modules.Loader,

        loadNext: function () {
            this.lastRequest = this.requests.shift();
            if (this.lastRequest !== null && this.lastRequest !== undefined) {
                this.lastRequest.requestStartDate = new Date();
                this.loading = true;
                this.xhr.open("GET", this.lastRequest.url);
                if (this.lastRequest.endRange) {
                    this.xhr.setRequestHeader("Range", "bytes=" + this.lastRequest.startRange + "-" + this.lastRequest.endRange);
                }
                this.xhr.send(null);
            } else {
                this.loading = false;
            }
        },

        onLoad: function (e) {
            var bytes = e.currentTarget.response;
            this.lastRequest.requestEndDate = new Date();
            this.onBytesLoaded(bytes, this.lastRequest);

            // load the next
            this.loadNext();
        },

        onError: function (e) {
            alert("load error");
        },

        setOnBytesLoadedHandler: function (func) {
            this.onBytesLoaded = func;
        },

        getLoading: function () {
            return this.loading;
        },

        abort: function () {
            this.xhr.abort();
            this.requests = [];
            this.lastRequest = null;
            this.loading = false;
        },

        load: function (request) {
            if (this.request === null) {
                return;
            }

            this.requests.push(request);

            if (!this.loading) {
                this.loadNext();
            }
        }
    };

    return Constr;
}());