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
window["dash"] = window["dash"]||{};
/**
 *
 * @constructor
 */
dash.SegmentLoader = function() {
	var me=this;
    /** @type {*} */
    me.onBytesLoaded=function(a,b){};
    /** @type {boolean} */
    me.loading=false;
    /** @type {dash.vo.SegmentRequest} */
    me.lastRequest=null;
    /** @type {Array.<dash.vo.SegmentRequest>} */
    me.requests = [];
    /** @type {XMLHttpRequest} */
	me.xhr = new XMLHttpRequest();
	me.xhr.responseType = "arraybuffer";
	me.xhr.addEventListener("load",me.onLoad.bind(me),false);
	me.xhr.addEventListener("error",me.onError.bind(me),false);
};

dash.SegmentLoader.prototype = {
    /**
     * @private
     * @param {Event} e
     */
	onLoad: function(e) {
		var bytes = e.currentTarget.response;
        this.loadNext();
		this.onBytesLoaded(bytes,this.lastRequest);
	},
    /**
     * @private
     * @param {Event} e
     */
	onError: function(e) {
		alert("load error");
	},
    /**
     * @private
     */
	loadNext: function() {
		this.lastRequest = this.requests.shift();
		if(this.lastRequest != null) {
			this.loading = true;
			this.xhr.open("GET",this.lastRequest.url);
            if(this.lastRequest.endRange)
            {
                this.xhr.setRequestHeader("Range", "bytes="+this.lastRequest.startRange+"-"+this.lastRequest.endRange);
            }
			this.xhr.send(null);
		} else this.loading = false;
	},
    /**
     * Cancels all pending requests and clears the loading queue.
     */
	abort: function() {
		this.xhr.abort();
		this.requests = [];
		this.lastRequest = null;
		this.loading = false;
	},
    /**
     * Add a url to the loading queue.
     * @param {dash.vo.SegmentRequest|null} request
     */
	load: function(request) {
        if(request==null) return;
		this.requests.push(request);
		if(!this.loading) this.loadNext();
	}
};