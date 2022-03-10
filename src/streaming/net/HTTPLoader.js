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
import {HTTPRequest} from '../vo/metrics/HTTPRequest';
import FactoryMaker from '../../core/FactoryMaker';
import DashJSError from '../vo/DashJSError';
import CmcdModel from '../models/CmcdModel';
import Utils from '../../core/Utils';
import Debug from '../../core/Debug';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import Settings from '../../core/Settings';
import Constants from '../constants/Constants';
import LowLatencyThroughputModel from '../models/LowLatencyThroughputModel';

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
    const errors = cfg.errors;
    const requestTimeout = cfg.requestTimeout || 0;
    const eventBus = EventBus(context).getInstance();
    const settings = Settings(context).getInstance();

    let instance,
        requests,
        delayedRequests,
        retryRequests,
        downloadErrorToRequestTypeMap,
        cmcdModel,
        lowLatencyThroughputModel,
        logger;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        requests = [];
        delayedRequests = [];
        retryRequests = [];
        cmcdModel = CmcdModel(context).getInstance();
        lowLatencyThroughputModel = LowLatencyThroughputModel(context).getInstance();

        downloadErrorToRequestTypeMap = {
            [HTTPRequest.MPD_TYPE]: errors.DOWNLOAD_ERROR_ID_MANIFEST_CODE,
            [HTTPRequest.XLINK_EXPANSION_TYPE]: errors.DOWNLOAD_ERROR_ID_XLINK_CODE,
            [HTTPRequest.INIT_SEGMENT_TYPE]: errors.DOWNLOAD_ERROR_ID_INITIALIZATION_CODE,
            [HTTPRequest.MEDIA_SEGMENT_TYPE]: errors.DOWNLOAD_ERROR_ID_CONTENT_CODE,
            [HTTPRequest.INDEX_SEGMENT_TYPE]: errors.DOWNLOAD_ERROR_ID_CONTENT_CODE,
            [HTTPRequest.BITSTREAM_SWITCHING_SEGMENT_TYPE]: errors.DOWNLOAD_ERROR_ID_CONTENT_CODE,
            [HTTPRequest.OTHER_TYPE]: errors.DOWNLOAD_ERROR_ID_CONTENT_CODE
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
                const responseUrl = httpRequest.response ? httpRequest.response.responseURL : null;
                const responseStatus = httpRequest.response ? httpRequest.response.status : null;
                const responseHeaders = httpRequest.response && httpRequest.response.getAllResponseHeaders ? httpRequest.response.getAllResponseHeaders() :
                    httpRequest.response ? httpRequest.response.responseHeaders : [];

                dashMetrics.addHttpRequest(request, responseUrl, responseStatus, responseHeaders, success ? traces : null);

                if (request.type === HTTPRequest.MPD_TYPE) {
                    dashMetrics.addManifestUpdate(request);
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

                    // If we get a 404 to a media segment we should check the client clock again and perform a UTC sync in the background.
                    try {
                        if (settings.get().streaming.utcSynchronization.enableBackgroundSyncAfterSegmentDownloadError && request.type === HTTPRequest.MEDIA_SEGMENT_TYPE) {
                            // Only trigger a sync if the loading failed for the first time
                            const initialNumberOfAttempts = mediaPlayerModel.getRetryAttemptsForType(HTTPRequest.MEDIA_SEGMENT_TYPE);
                            if (initialNumberOfAttempts === remainingAttempts) {
                                eventBus.trigger(Events.ATTEMPT_BACKGROUND_SYNC);
                            }
                        }
                    } catch (e) {

                    }

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
                    if (request.type === HTTPRequest.MSS_FRAGMENT_INFO_SEGMENT_TYPE) {
                        return;
                    }

                    errHandler.error(new DashJSError(downloadErrorToRequestTypeMap[request.type], request.url + ' is not available', {
                        request: request,
                        response: httpRequest.response
                    }));

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
                    b: [event.loaded ? event.loaded - lastTraceReceivedCount : 0],
                    t: event.throughput
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

        const ontimeout = function (event) {
            let timeoutMessage;
            if (event.lengthComputable) {
                let percentageComplete = (event.loaded / event.total) * 100;
                timeoutMessage = 'Request timeout: loaded: ' + event.loaded + ', out of: ' + event.total + ' : ' + percentageComplete.toFixed(3) + '% Completed';
            } else {
                timeoutMessage = 'Request timeout: non-computable download size';
            }
            logger.warn(timeoutMessage);
        };

        let loader;
        if (settings.get().streaming.lowLatencyEnabled && window.fetch && request.responseType === 'arraybuffer' && request.type === HTTPRequest.MEDIA_SEGMENT_TYPE) {
            loader = FetchLoader(context).create({
                requestModifier: requestModifier,
                lowLatencyThroughputModel,
                boxParser: boxParser
            });
            loader.setup({
                dashMetrics
            });
        } else {
            loader = XHRLoader(context).create({
                requestModifier: requestModifier
            });
        }

        let headers = null;
        let modifiedUrl = requestModifier.modifyRequestURL(request.url);
        if (settings.get().streaming.cmcd && settings.get().streaming.cmcd.enabled) {
            const cmcdMode = settings.get().streaming.cmcd.mode;
            if (cmcdMode === Constants.CMCD_MODE_QUERY) {
                const additionalQueryParameter = _getAdditionalQueryParameter(request);
                modifiedUrl = Utils.addAditionalQueryParameterToUrl(modifiedUrl, additionalQueryParameter);
            } else if (cmcdMode === Constants.CMCD_MODE_HEADER) {
                headers = cmcdModel.getHeaderParameters(request);
            }
        }
        request.url = modifiedUrl;
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
            ontimeout: ontimeout,
            loader: loader,
            timeout: requestTimeout,
            headers: headers
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

    function _getAdditionalQueryParameter(request) {
        try {
            const additionalQueryParameter = [];
            const cmcdQueryParameter = cmcdModel.getQueryParameter(request);

            if (cmcdQueryParameter) {
                additionalQueryParameter.push(cmcdQueryParameter);
            }

            return additionalQueryParameter;
        } catch (e) {
            return [];
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
            // MSS patch: ignore FragmentInfo requests
            if (x.request.type === HTTPRequest.MSS_FRAGMENT_INFO_SEGMENT_TYPE) {
                return;
            }

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
