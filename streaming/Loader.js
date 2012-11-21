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
window["streaming"] = window["streaming"] || {};
/**
 *
 * @constructor
 */
streaming.Loader = function ()
{
    /**
     * @private
     * @type {*} */
    this.onBytesLoaded = function (a, b) { };
    /**
     * @private
     * @type {boolean} */
    this.loading = false;
    /**
     * @private
     * @type {dash.vo.SegmentRequest} */
    this.lastRequest = null;
    /**
     * @private
     * @type {Array.<dash.vo.SegmentRequest>} */
    this.requests = [];
    /**
     * @private
     * @type {XMLHttpRequest} */
    this.xhr = new XMLHttpRequest();
    this.xhr.responseType = "arraybuffer";
    this.xhr.addEventListener("load", this.onLoad.bind(this), false);
    this.xhr.addEventListener("error", this.onError.bind(this), false);
};

streaming.Loader.prototype =
{
    /**
     * @private
     * @param {Event} e
     */
    onLoad: function (e)
    {
        var bytes = e.currentTarget.response;
        this.lastRequest.requestEndDate = new Date();
        this.onBytesLoaded(bytes, this.lastRequest);
        
        // load the next
        this.loadNext();
    },
    
    /**
     * @private
     * @param {Event} e
     */
    onError: function (e)
    {
        alert("load error");
    },
    
    /**
     * @private
     */
    loadNext: function ()
    {
        this.lastRequest = this.requests.shift();
        if (this.lastRequest != null)
        {
            this.lastRequest.requestStartDate = new Date();
            this.loading = true;
            this.xhr.open("GET", this.lastRequest.url);
            if (this.lastRequest.endRange)
            {
                this.xhr.setRequestHeader("Range", "bytes=" + this.lastRequest.startRange + "-" + this.lastRequest.endRange);
            }
            this.xhr.send(null);
        }
        else
        {
            this.loading = false;
        }
    },
    
    /**
     * Cancels all pending requests and clears the loading queue.
     */
    abort: function ()
    {
        this.xhr.abort();
        this.requests = [];
        this.lastRequest = null;
        this.loading = false;
    },
    
    /**
     * Add a url to the loading queue.
     * @param {dash.vo.SegmentRequest|null} request
     */
    load: function (request)
    {
        if (request == null)
            return;

        this.requests.push(request);

        if (!this.loading)
            this.loadNext();
    }
};