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
import {HTTPRequest} from './vo/metrics/HTTPRequest';
import FactoryMaker from '../core/FactoryMaker';
import MediaPlayerModel from './models/MediaPlayerModel';
import ErrorHandler from './utils/ErrorHandler.js';

/**
 * @module XHRLoader
 * @description Manages download of resources via HTTP.
 * @param {Object} cfg - dependancies from parent
 */
function XHRLoader(cfg) {
    const context = this.context;

    //const log = Debug(context).getInstance().log;
    const mediaPlayerModel = MediaPlayerModel(context).getInstance();

    const errHandler = cfg.errHandler;
    const metricsModel = cfg.metricsModel;
    const requestModifier = cfg.requestModifier;

    let instance;
    let xhrs;
    let delayedXhrs;
    let retryTimers;
    let downloadErrorToRequestTypeMap;

    function setup() {
        xhrs = [];
        delayedXhrs = [];
        retryTimers = [];

        downloadErrorToRequestTypeMap = {
            [HTTPRequest.MPD_TYPE]:                         ErrorHandler.DOWNLOAD_ERROR_ID_MANIFEST,
            [HTTPRequest.XLINK_EXPANSION_TYPE]:             ErrorHandler.DOWNLOAD_ERROR_ID_XLINK,
            [HTTPRequest.INIT_SEGMENT_TYPE]:                ErrorHandler.DOWNLOAD_ERROR_ID_INITIALIZATION,
            [HTTPRequest.MEDIA_SEGMENT_TYPE]:               ErrorHandler.DOWNLOAD_ERROR_ID_CONTENT,
            [HTTPRequest.INDEX_SEGMENT_TYPE]:               ErrorHandler.DOWNLOAD_ERROR_ID_CONTENT,
            [HTTPRequest.BITSTREAM_SWITCHING_SEGMENT_TYPE]: ErrorHandler.DOWNLOAD_ERROR_ID_CONTENT,
            [HTTPRequest.OTHER_TYPE]:                       ErrorHandler.DOWNLOAD_ERROR_ID_CONTENT
        };
    }

    function internalLoad(config, remainingAttempts) {

        var request = config.request;
        var xhr = new XMLHttpRequest();
        var traces = [];
        var firstProgress = true;
        var needFailureReport = true;
        const requestStartTime = new Date();
        var lastTraceTime = requestStartTime;
        var lastTraceReceivedCount = 0;

        const handleLoaded = function (success) {
            needFailureReport = false;

            request.requestStartDate = requestStartTime;
            request.requestEndDate = new Date();
            request.firstByteDate = request.firstByteDate || requestStartTime;

            if (!request.checkExistenceOnly) {
                metricsModel.addHttpRequest(
                    request.mediaType,
                    null,
                    request.type,
                    request.url,
                    xhr.responseURL || null,
                    request.serviceLocation || null,
                    request.range || null,
                    request.requestStartDate,
                    request.firstByteDate,
                    request.requestEndDate,
                    xhr.status,
                    request.duration,
                    xhr.getAllResponseHeaders(),
                    success ? traces : null
                );
            }
        };

        const onloadend = function () {
            if (xhrs.indexOf(xhr) === -1) {
                return;
            } else {
                xhrs.splice(xhrs.indexOf(xhr), 1);
            }

            if (needFailureReport) {
                handleLoaded(false);

                if (remainingAttempts > 0) {
                    remainingAttempts--;
                    retryTimers.push(
                        setTimeout(function () {
                            internalLoad(config, remainingAttempts);
                        }, mediaPlayerModel.getRetryIntervalForType(request.type))
                    );
                } else {
                    errHandler.downloadError(
                        downloadErrorToRequestTypeMap[request.type],
                        request.url,
                        request
                    );

                    if (config.error) {
                        config.error(request, 'error', xhr.statusText);
                    }

                    if (config.complete) {
                        config.complete(request, xhr.statusText);
                    }
                }
            }
        };

        const progress = function (event) {
            var currentTime = new Date();

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

            traces.push({
                s: lastTraceTime,
                d: currentTime.getTime() - lastTraceTime.getTime(),
                b: [event.loaded ? event.loaded - lastTraceReceivedCount : 0]
            });

            lastTraceTime = currentTime;
            lastTraceReceivedCount = event.loaded;

            if (config.progress) {
                config.progress();
            }
        };

        const onload = function () {
            if (xhr.status >= 200 && xhr.status <= 299) {
                handleLoaded(true);

                if (config.success) {
                    config.success(xhr.response, xhr.statusText, xhr);
                }

                if (config.complete) {
                    config.complete(request, xhr.statusText);
                }
            }
        };

        try {
            const modifiedUrl = requestModifier.modifyRequestURL(request.url);
            const verb = request.checkExistenceOnly ? 'HEAD' : 'GET';

            xhr.open(verb, modifiedUrl, true);

            if (request.responseType) {
                xhr.responseType = request.responseType;
            }

            if (request.range) {
                xhr.setRequestHeader('Range', 'bytes=' + request.range);
            }

            if (!request.requestStartDate) {
                request.requestStartDate = requestStartTime;
            }

            xhr = requestModifier.modifyRequestHeader(xhr);

            xhr.withCredentials = mediaPlayerModel.getXHRWithCredentials();

            xhr.onload = onload;
            xhr.onloadend = onloadend;
            xhr.onerror = onloadend;
            xhr.onprogress = progress;

            // Adds the ability to delay single fragment loading time to control buffer.
            let now = new Date().getTime();
            if (isNaN(request.delayLoadingTime) || now >= request.delayLoadingTime) {
                // no delay - just send xhr

                xhrs.push(xhr);
                xhr.send();
            } else {
                // delay
                let delayedXhr = {xhr: xhr};
                delayedXhrs.push(delayedXhr);
                delayedXhr.delayTimeout = setTimeout(function () {
                    if (delayedXhrs.indexOf(delayedXhr) === -1) {
                        return;
                    } else {
                        delayedXhrs.splice(delayedXhrs.indexOf(delayedXhr), 1);
                    }
                    try {
                        xhrs.push(delayedXhr.xhr);
                        delayedXhr.xhr.send();
                    } catch (e) {
                        delayedXhr.xhr.onerror();
                    }
                }, (request.delayLoadingTime - now));
            }

        } catch (e) {
            xhr.onerror();
        }
    }

    /**
     * Initiates a download of the resource described by config.request
     * @param {Object} config - contains request (FragmentRequest or derived type), and callbacks
     * @memberof module:XHRLoader
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
        }
    }

    /**
     * Aborts any inflight downloads
     * @memberof module:XHRLoader
     * @instance
     */
    function abort() {
        retryTimers.forEach(t => clearTimeout(t));
        retryTimers = [];

        delayedXhrs.forEach(x => clearTimeout(x.delayTimeout));
        delayedXhrs = [];

        xhrs.forEach(x => {
            // abort will trigger onloadend which we don't want
            // when deliberately aborting inflight requests -
            // set them to undefined so they are not called
            x.onloadend = x.onerror = x.onprogress = undefined;
            x.abort();
        });
        xhrs = [];
    }

    instance = {
        load: load,
        abort: abort
    };

    setup();

    return instance;
}

XHRLoader.__dashjs_factory_name = 'XHRLoader';

const factory = FactoryMaker.getClassFactory(XHRLoader);
export default factory;
