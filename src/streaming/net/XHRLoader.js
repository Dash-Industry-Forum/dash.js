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
import { modifyRequest } from '../utils/RequestModifier.js';

/**
 * @module XHRLoader
 * @ignore
 * @description Manages download of resources via HTTP.
 * @param {Object} cfg - dependencies from parent
 */
function XHRLoader(cfg) {

    cfg = cfg || {};
    const requestModifier = cfg.requestModifier;

    let instance;

    function load(httpLoaderRequest) {
        if (requestModifier && requestModifier.modifyRequest) {
            modifyRequest(httpLoaderRequest, requestModifier)
                .then(() => _request(httpLoaderRequest));
        }
        else {
            _request(httpLoaderRequest);
        }
    }

    function _request(httpLoaderRequest) {
        // Variables will be used in the callback functions
        const requestStartTime = new Date();
        const request = httpLoaderRequest.request;

        let xhr = new XMLHttpRequest();
        xhr.open(httpLoaderRequest.method, httpLoaderRequest.url, true);

        if (request.responseType) {
            xhr.responseType = request.responseType;
        }

        if (request.range) {
            xhr.setRequestHeader('Range', 'bytes=' + request.range);
        }

        if (!request.startDate) {
            request.startDate = requestStartTime;
        }

        if (requestModifier && requestModifier.modifyRequestHeader) {
            xhr = requestModifier.modifyRequestHeader(xhr, {
                url: httpLoaderRequest.url
            });
        }

        if (httpLoaderRequest.headers) {
            for (let header in httpLoaderRequest.headers) {
                let value = httpLoaderRequest.headers[header];
                if (value) {
                    xhr.setRequestHeader(header, value);
                }
            }
        }

        xhr.withCredentials = httpLoaderRequest.withCredentials;

        xhr.onload = httpLoaderRequest.onload;
        xhr.onloadend = httpLoaderRequest.onloadend;
        xhr.onerror = httpLoaderRequest.onerror;
        xhr.onprogress = httpLoaderRequest.progress;
        xhr.onabort = httpLoaderRequest.onabort;
        xhr.ontimeout = httpLoaderRequest.ontimeout;
        xhr.timeout = httpLoaderRequest.timeout;

        xhr.send();

        httpLoaderRequest.response = xhr;
    }

    function abort(request) {
        const x = request.response;
        x.onloadend = x.onerror = x.onprogress = undefined; //Ignore events from aborted requests.
        x.abort();
    }

    instance = {
        load,
        abort
    };

    return instance;
}

XHRLoader.__dashjs_factory_name = 'XHRLoader';

const factory = FactoryMaker.getClassFactory(XHRLoader);
export default factory;
