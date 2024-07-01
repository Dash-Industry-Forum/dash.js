/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
import FactoryMaker from '../../core/FactoryMaker.js';
import Utils from '../../core/Utils.js';

/**
 * @module XHRLoader
 * @ignore
 * @description Manages download of resources via HTTP.
 */
function XHRLoader() {

    let instance;
    let xhr;

    /**
     * Load request
     * @param {CommonMediaRequest} httpRequest
     * @param {CommonMediaResponse} httpResponse
     */
    function load(httpRequest, httpResponse) {
        xhr = new XMLHttpRequest();
        xhr.open(httpRequest.method, httpRequest.url, true);

        if (httpRequest.responseType) {
            xhr.responseType = httpRequest.responseType;
        }

        if (httpRequest.headers) {
            for (let header in httpRequest.headers) {
                let value = httpRequest.headers[header];
                if (value) {
                    xhr.setRequestHeader(header, value);
                }
            }
        }

        xhr.withCredentials = httpRequest.credentials === 'include';
        xhr.timeout = httpRequest.timeout;

        xhr.onload = function() {
            httpResponse.url = this.responseURL;
            httpResponse.status = this.status;
            httpResponse.statusText = this.statusText;
            httpResponse.headers = Utils.parseHttpHeaders(this.getAllResponseHeaders());
            httpResponse.data = this.response;
        }
        xhr.onloadend = httpRequest.customData.onloadend;
        xhr.onprogress = httpRequest.customData.onprogress;
        xhr.onabort = httpRequest.customData.onabort;
        xhr.ontimeout = httpRequest.customData.ontimeout;

        xhr.send();

        httpRequest.customData.abort = abort.bind(this);
        return true;
    }

    function abort() {
        xhr.onloadend = xhr.onerror = xhr.onprogress = null; // Ignore events from aborted requests.
        xhr.abort();
    }

    function getXhr() {
        return xhr
    }

    instance = {
        load,
        abort,
        getXhr
    };

    return instance;
}

XHRLoader.__dashjs_factory_name = 'XHRLoader';

const factory = FactoryMaker.getClassFactory(XHRLoader);
export default factory;
