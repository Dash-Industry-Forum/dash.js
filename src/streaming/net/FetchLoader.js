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

import FactoryMaker from '../../core/FactoryMaker';

/**
* @module FetchLoader
* @description Manages download of resources via HTTP using fetch.
* @param {Object} cfg - dependencies from parent
*/
function FetchLoader(cfg) {

    cfg = cfg || {};
    const requestModifier = cfg.requestModifier;

    let instance;

    function load(httpRequest) {

        // Variables will be used in the callback functions
        let firstProgress = true; /*jshint ignore:line*/
        let needFailureReport = true; /*jshint ignore:line*/
        let requestStartTime = new Date();
        let lastTraceTime = requestStartTime; /*jshint ignore:line*/
        let lastTraceReceivedCount = 0; /*jshint ignore:line*/

        let request = httpRequest.request;

        const headers = new Headers(); /*jshint ignore:line*/
        if (request.range) {
            headers.append('Range', 'bytes=' + request.range);
        }

        if (!request.requestStartDate) {
            request.requestStartDate = requestStartTime;
        }

        if (requestModifier) {
            // modifyRequestHeader expects a XMLHttpRequest object so,
            // to keep backward compatibility, we should expose a setRequestHeader method
            // TODO: Remove RequestModifier dependency on XMLHttpRequest object and define
            // a more generic way to intercept/modify requests
            requestModifier.modifyRequestHeader({
                setRequestHeader: function (header, value) {
                    headers.append(header, value);
                }
            });
        }

        let abortController;
        if (typeof window.AbortController === 'function') {
            abortController = new AbortController(); /*jshint ignore:line*/
            httpRequest.abortController = abortController;
        }

        const reqOptions = {
            method: httpRequest.method,
            headers: headers,
            credentials: httpRequest.withCredentials ? 'include' : undefined,
            signal: abortController ? abortController.signal : undefined
        };

        fetch(httpRequest.url, reqOptions).then(function (response) {
            if (!httpRequest.response) {
                httpRequest.response = {};
            }
            httpRequest.response.status = response.status;
            httpRequest.response.statusText = response.statusText;
            httpRequest.response.responseURL = response.url;

            if (!response.ok) {
                httpRequest.onerror();
            }

            let responseHeaders = '';
            for (const key of response.headers.keys()) {
                responseHeaders += key + ': ' + response.headers.get(key) + '\n';
            }
            httpRequest.response.responseHeaders = responseHeaders;

            const totalBytes = parseInt(response.headers.get('Content-Length'), 10);

            if (!response.body) {
                // Fetch returning a ReadableStream response body is not currently supported by all browsers.
                // Browser compatibility: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
                // If it is not supported, returning the whole segment when it's ready (as xhr)
                return response.arrayBuffer().then(function (buffer) {
                    httpRequest.response.response = buffer;
                    const event = {
                        loaded: buffer.byteLength,
                        total: buffer.byteLength
                    };
                    httpRequest.progress(event);
                    httpRequest.onload();
                    httpRequest.onend();
                    return;
                });
            }

            let bytesReceived = 0;
            let dataArray;

            httpRequest.reader = response.body.getReader();

            const processResult = function ({ value, done }) {
                if (done) {
                    if (dataArray) {
                        httpRequest.response.response = dataArray.buffer;
                    }
                    httpRequest.onload();
                    httpRequest.onend();
                    return;
                }
                bytesReceived += value.length;

                // Same structure as https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequestEventTarget/onprogress
                const event = {
                    loaded: isNaN(totalBytes) ? value.length : bytesReceived,
                    total: isNaN(totalBytes) ? value.length : totalBytes
                };
                // Returning data on the following loop so that when it's done it sends data
                // This also avoids a problem with subtitles
                if (dataArray && dataArray.length > 0) {
                    // Cloning data so that it's not overwritten while looping
                    event.data = dataArray.slice(0).buffer;
                }
                httpRequest.progress(event);
                // [dataArray, remaining] = processData(value, remaining);
                dataArray = value;

                return httpRequest.reader.read().then(processResult);

            };
            return httpRequest.reader.read().then(processResult);
        });
    }

    function abort(request) {
        if (request.abortController) {
            // For firefox and edge
            request.abortController.abort();
        } else if (request.reader) {
            // For Chrome
            request.reader.cancel();
        }
    }

    instance = {
        load: load,
        abort: abort
    };

    return instance;
}

FetchLoader.__dashjs_factory_name = 'FetchLoader';

const factory = FactoryMaker.getClassFactory(FetchLoader);
export default factory;