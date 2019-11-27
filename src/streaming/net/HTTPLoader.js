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
import XHRLoader from './XHRLoader';
import FetchLoader from './FetchLoader';
import { HTTPRequest } from '../vo/metrics/HTTPRequest';
import FactoryMaker from '../../core/FactoryMaker';
import Errors from '../../core/errors/Errors';
import DashJSError from '../vo/DashJSError';

/**
 * @module HTTPLoader
 * @ignore
 * @description Manages download of resources via HTTP.
 * @param {Object} cfg - dependancies from parent
 */
function HTTPLoader(cfg) {

    cfg = cfg || {};

    const context = this.context;
    const errHandler = cfg.errHandler;
    const dashMetrics = cfg.dashMetrics;
    const mediaPlayerModel = cfg.mediaPlayerModel;
    const requestModifier = cfg.requestModifier;
    const boxParser = cfg.boxParser;
    const useFetch = cfg.useFetch || false;

    let instance,
        requests,
        delayedRequests,
        retryRequests,
        downloadErrorToRequestTypeMap;

    function setup() {
        requests = [];
        delayedRequests = [];
        retryRequests = [];

        downloadErrorToRequestTypeMap = {
            [HTTPRequest.MPD_TYPE]: Errors.DOWNLOAD_ERROR_ID_MANIFEST_CODE,
            [HTTPRequest.XLINK_EXPANSION_TYPE]: Errors.DOWNLOAD_ERROR_ID_XLINK_CODE,
            [HTTPRequest.INIT_SEGMENT_TYPE]: Errors.DOWNLOAD_ERROR_ID_INITIALIZATION_CODE,
            [HTTPRequest.MEDIA_SEGMENT_TYPE]: Errors.DOWNLOAD_ERROR_ID_CONTENT_CODE,
            [HTTPRequest.INDEX_SEGMENT_TYPE]: Errors.DOWNLOAD_ERROR_ID_CONTENT_CODE,
            [HTTPRequest.BITSTREAM_SWITCHING_SEGMENT_TYPE]: Errors.DOWNLOAD_ERROR_ID_CONTENT_CODE,
            [HTTPRequest.OTHER_TYPE]: Errors.DOWNLOAD_ERROR_ID_CONTENT_CODE
        };
    }

    function internalLoad(config, remainingAttempts) {
        const request = config.request;
        const traces = [];
        let firstProgress = true;
        let needFailureReport = true;
        let requestStartTime = new Date();
        let lastTraceTime = requestStartTime;
        let lastTraceReceivedCount = 0;
        let httpRequest;

        if (!requestModifier || !dashMetrics || !errHandler) {
            throw new Error('config object is not correct or missing');
        }

        const handleLoaded = function (success) {
            needFailureReport = false;

            request.requestStartDate = requestStartTime;
            request.requestEndDate = new Date();
            request.firstByteDate = request.firstByteDate || requestStartTime;

            if (!request.checkExistenceOnly) {
                dashMetrics.addHttpRequest(request, httpRequest.response ? httpRequest.response.responseURL : null,
                                           httpRequest.response ? httpRequest.response.status : null,
                                           httpRequest.response && httpRequest.response.getAllResponseHeaders ? httpRequest.response.getAllResponseHeaders() :
                                           httpRequest.response ? httpRequest.response.responseHeaders : [],
                                           success ? traces : null);

                if (request.type === HTTPRequest.MPD_TYPE) {
                    dashMetrics.addManifestUpdate(request.type, request.requestStartDate, request.requestEndDate);
                }
            }
        };

        const onloadend = function () {
            if (requests.indexOf(httpRequest) === -1) {
                return;
            } else {
                requests.splice(requests.indexOf(httpRequest), 1);
            }

            if (needFailureReport) {
                handleLoaded(false);

                if (remainingAttempts > 0) {
                    remainingAttempts--;
                    let retryRequest = { config: config };
                    retryRequests.push(retryRequest);
                    retryRequest.timeout = setTimeout(function () {
                        if (retryRequests.indexOf(retryRequest) === -1) {
                            return;
                        } else {
                            retryRequests.splice(retryRequests.indexOf(retryRequest), 1);
                        }
                        internalLoad(config, remainingAttempts);
                    }, mediaPlayerModel.getRetryIntervalsForType(request.type));
                } else {
                    errHandler.error(new DashJSError(downloadErrorToRequestTypeMap[request.type], request.url + ' is not available', {request: request, response: httpRequest.response}));

                    if (config.error) {
                        config.error(request, 'error', httpRequest.response.statusText);
                    }

                    if (config.complete) {
                        config.complete(request, httpRequest.response.statusText);
                    }
                }
            }
        };

        const progress = function (event) {
            const currentTime = new Date();

            if (firstProgress) {
                firstProgress = false;
                if (!event.lengthComputable ||
                    (event.lengthComputable && event.total !== event.loaded)) {
                    request.firstByteDate = currentTime;
                }
            }

            if (event.lengthComputable) {
                request.bytesLoaded = event.loaded;
                request.bytesTotal = event.total;
            }

            if (!event.noTrace) {
                traces.push({
                    s: lastTraceTime,
                    d: event.time ? event.time : currentTime.getTime() - lastTraceTime.getTime(),
                    b: [event.loaded ? event.loaded - lastTraceReceivedCount : 0]
                });

                lastTraceTime = currentTime;
                lastTraceReceivedCount = event.loaded;
            }

            if (config.progress && event) {
                config.progress(event);
            }
        };

        const onload = function () {
            if (httpRequest.response.status >= 200 && httpRequest.response.status <= 299) {
                handleLoaded(true);

                if (config.success) {
                    config.success(httpRequest.response.response, httpRequest.response.statusText, httpRequest.response.responseURL);
                }

                if (config.complete) {
                    config.complete(request, httpRequest.response.statusText);
                }
            }
        };

        const onabort = function () {
            if (config.abort) {
                config.abort(request);
            }
        };

        let loader;
        if (useFetch && window.fetch && request.responseType === 'arraybuffer' && request.type === HTTPRequest.MEDIA_SEGMENT_TYPE) {
            loader = FetchLoader(context).create({
                requestModifier: requestModifier,
                boxParser: boxParser
            });
        } else {
            loader = XHRLoader(context).create({
                requestModifier: requestModifier
            });
        }

        const modifiedUrl = requestModifier.modifyRequestURL(request.url);
        const verb = request.checkExistenceOnly ? HTTPRequest.HEAD : HTTPRequest.GET;
        const withCredentials = mediaPlayerModel.getXHRWithCredentialsForType(request.type);

        httpRequest = {
            url: modifiedUrl,
            method: verb,
            withCredentials: withCredentials,
            request: request,
            onload: onload,
            onend: onloadend,
            onerror: onloadend,
            progress: progress,
            onabort: onabort,
            loader: loader
        };

        // Adds the ability to delay single fragment loading time to control buffer.
        let now = new Date().getTime();
        if (isNaN(request.delayLoadingTime) || now >= request.delayLoadingTime) {
            // no delay - just send
            requests.push(httpRequest);
            loader.load(httpRequest);
        } else {
            // delay
            let delayedRequest = { httpRequest: httpRequest };
            delayedRequests.push(delayedRequest);
            delayedRequest.delayTimeout = setTimeout(function () {
                if (delayedRequests.indexOf(delayedRequest) === -1) {
                    return;
                } else {
                    delayedRequests.splice(delayedRequests.indexOf(delayedRequest), 1);
                }
                try {
                    requestStartTime = new Date();
                    lastTraceTime = requestStartTime;
                    requests.push(delayedRequest.httpRequest);
                    loader.load(delayedRequest.httpRequest);
                } catch (e) {
                    delayedRequest.httpRequest.onerror();
                }
            }, (request.delayLoadingTime - now));
        }
    }

    /**
     * Initiates a download of the resource described by config.request
     * @param {Object} config - contains request (FragmentRequest or derived type), and callbacks
     * @memberof module:HTTPLoader
     * @instance
     */
    function load(config) {
        if (config.request) {
            internalLoad(
                config,
                mediaPlayerModel.getRetryAttemptsForType(
                    config.request.type
                )
            );
        } else {
            if (config.error) {
                config.error(config.request, 'error');
            }
        }
    }

    /**
     * Aborts any inflight downloads
     * @memberof module:HTTPLoader
     * @instance
     */
    function abort() {
        retryRequests.forEach(t => {
            clearTimeout(t.timeout);
            // abort request in order to trigger LOADING_ABANDONED event
            if (t.config.request && t.config.abort) {
                t.config.abort(t.config.request);
            }
        });
        retryRequests = [];

        delayedRequests.forEach(x => clearTimeout(x.delayTimeout));
        delayedRequests = [];

        requests.forEach(x => {
            // abort will trigger onloadend which we don't want
            // when deliberately aborting inflight requests -
            // set them to undefined so they are not called
            x.onloadend = x.onerror = x.onprogress = undefined;
            x.loader.abort(x);
        });
        requests = [];
    }

    instance = {
        load: load,
        abort: abort
    };

    setup();

    return instance;
}

HTTPLoader.__dashjs_factory_name = 'HTTPLoader';

const factory = FactoryMaker.getClassFactory(HTTPLoader);
export default factory;
