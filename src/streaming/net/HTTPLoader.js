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
import XHRLoader from './XHRLoader.js';
import FetchLoader from './FetchLoader.js';
import {HTTPRequest} from '../vo/metrics/HTTPRequest.js';
import FactoryMaker from '../../core/FactoryMaker.js';
import DashJSError from '../vo/DashJSError.js';
import CmsdModel from '../models/CmsdModel.js';
import Utils from '../../core/Utils.js';
import Debug from '../../core/Debug.js';
import EventBus from '../../core/EventBus.js';
import Events from '../../core/events/Events.js';
import Settings from '../../core/Settings.js';
import Constants from '../constants/Constants.js';
import CustomParametersModel from '../models/CustomParametersModel.js';
import CommonAccessTokenController from '../controllers/CommonAccessTokenController.js';
import ExtUrlQueryInfoController from '../controllers/ExtUrlQueryInfoController.js';
import CommonMediaRequest from '../vo/CommonMediaRequest.js';
import CommonMediaResponse from '../vo/CommonMediaResponse.js';

/**
 * @module HTTPLoader
 * @ignore
 * @description Manages download of resources via HTTP.
 * @param {Object} cfg - dependencies from parent
 */
function HTTPLoader(cfg) {

    cfg = cfg || {};

    const context = this.context;
    const errHandler = cfg.errHandler;
    const dashMetrics = cfg.dashMetrics;
    const mediaPlayerModel = cfg.mediaPlayerModel;
    const boxParser = cfg.boxParser;
    const errors = cfg.errors;
    const requestTimeout = cfg.requestTimeout || 0;
    const eventBus = EventBus(context).getInstance();
    const settings = Settings(context).getInstance();

    let instance,
        httpRequests,
        delayedRequests,
        retryRequests,
        downloadErrorToRequestTypeMap,
        cmsdModel,
        xhrLoader,
        fetchLoader,
        customParametersModel,
        commonAccessTokenController,
        extUrlQueryInfoController,
        logger;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        httpRequests = [];
        delayedRequests = [];
        retryRequests = [];
        cmsdModel = CmsdModel(context).getInstance();
        customParametersModel = CustomParametersModel(context).getInstance();
        commonAccessTokenController = CommonAccessTokenController(context).getInstance();
        extUrlQueryInfoController = ExtUrlQueryInfoController(context).getInstance();

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

    function setConfig(config) {
        if (!config) {
            return;
        }

        if (config.commonAccessTokenController) {
            commonAccessTokenController = config.commonAccessTokenController
        }

        if (config.extUrlQueryInfoController) {
            extUrlQueryInfoController = config.extUrlQueryInfoController;
        }
    }

    /**
     * Initiates a download of the resource described by config.request.
     * @param {Object} config - contains request (FragmentRequest or derived type), and callbacks
     * @memberof module:HTTPLoader
     * @instance
     */
    function load(config) {
        if (config.request) {
            const retryAttempts = mediaPlayerModel.getRetryAttemptsForType(config.request.type);
            return _internalLoad(config, retryAttempts);
        } else {
            if (config.error) {
                config.error(config.request, 'error');
            }
            return Promise.resolve();
        }
    }

    /**
     * Initiates or re-initiates a download of the resource
     * @param {object} config
     * @param {number} remainingAttempts
     * @private
     */
    function _internalLoad(config, remainingAttempts) {

        /**
         * Fired when a request has completed, whether successfully (after load) or unsuccessfully (after abort, timeout or error).
         */
        const _onloadend = function () {
            _onRequestEnd();
        };

        /**
         * Fired when a request has started to load data.
         * @param event
         */
        const _onprogress = function (event) {
            const currentTime = new Date();

            // If we did not transfer all data yet and this is the first time we are getting a progress event we use this time as firstByteDate.
            if (firstProgress) {
                firstProgress = false;
                // event.loaded: the amount of data currently transferred
                // event.total: the total amount of data to be transferred.
                // If lengthComputable is false within the XMLHttpRequestProgressEvent, that means the server never sent a Content-Length header in the response.
                if (!event.lengthComputable ||
                    (event.lengthComputable && event.total !== event.loaded)) {
                    requestObject.firstByteDate = currentTime;
                    commonMediaResponse.resourceTiming.responseStart = currentTime.getTime();
                }
            }

            // lengthComputable indicating if the resource concerned by the ProgressEvent has a length that can be calculated. If not, the ProgressEvent.total property has no significant value.
            if (event.lengthComputable) {
                requestObject.bytesLoaded = commonMediaResponse.length = event.loaded;
                requestObject.bytesTotal = commonMediaResponse.resourceTiming.encodedBodySize = event.total;
                commonMediaResponse.length = event.total;
                commonMediaResponse.resourceTiming.encodedBodySize = event.loaded;
            }

            if (!event.noTrace) {
                traces.push({
                    s: lastTraceTime,
                    d: event.time ? event.time : currentTime.getTime() - lastTraceTime.getTime(),
                    b: [event.loaded ? event.loaded - lastTraceReceivedCount : 0], // event.loaded: When downloading a resource using HTTP, this value is specified in bytes (not bits), and only represents the part of the content itself, not headers and other overhead
                    t: event.throughput
                });

                requestObject.traces = traces;
                lastTraceTime = currentTime;
                lastTraceReceivedCount = event.loaded;
            }

            if (progressTimeout) {
                clearTimeout(progressTimeout);
                progressTimeout = null;
            }

            if (settings.get().streaming.fragmentRequestProgressTimeout > 0) {
                progressTimeout = setTimeout(function () {
                    // No more progress => abort request and treat as an error
                    logger.warn('Abort request ' + commonMediaRequest.url + ' due to progress timeout');
                    loader.abort(commonMediaRequest);
                    _onloadend();
                }, settings.get().streaming.fragmentRequestProgressTimeout);
            }

            if (config.progress && event) {
                config.progress(event);
            }
        };

        /**
         * Fired when a request has been aborted, for example because the program called XMLHttpRequest.abort().
         */
        const _onabort = function () {
            _onRequestEnd(true)
        };

        /**
         * Fired when progress is terminated due to preset time expiring.
         * @param event
         */
        const _ontimeout = function (event) {
            let timeoutMessage;
            // We know how much we already downloaded by looking at the timeout event
            if (event.lengthComputable) {
                let percentageComplete = (event.loaded / event.total) * 100;
                timeoutMessage = 'Request timeout: loaded: ' + event.loaded + ', out of: ' + event.total + ' : ' + percentageComplete.toFixed(3) + '% Completed';
            } else {
                timeoutMessage = 'Request timeout: non-computable download size';
            }
            logger.warn(timeoutMessage);
        };

        const _onRequestEnd = function (aborted = false) {
            // Remove the request from our list of requests
            if (httpRequests.indexOf(commonMediaRequest) !== -1) {
                httpRequests.splice(httpRequests.indexOf(commonMediaRequest), 1);
            }

            if (progressTimeout) {
                clearTimeout(progressTimeout);
                progressTimeout = null;
            }

            commonAccessTokenController.processResponseHeaders(commonMediaResponse);

            _updateRequestTimingInfo();
            _updateResourceTimingInfo();

            _applyResponseInterceptors(commonMediaResponse).then((_httpResponse) => {
                commonMediaResponse = _httpResponse;

                _addHttpRequestMetric(commonMediaRequest, commonMediaResponse, traces);

                // Ignore aborted requests
                if (aborted) {
                    if (config.abort) {
                        config.abort(requestObject);
                    }
                    return;
                }

                if (requestObject.type === HTTPRequest.MPD_TYPE) {
                    dashMetrics.addManifestUpdate(requestObject);
                    eventBus.trigger(Events.MANIFEST_LOADING_FINISHED, { requestObject });
                }

                if (commonMediaResponse.status >= 200 && commonMediaResponse.status <= 299 && commonMediaResponse.data) {
                    if (config.success) {
                        config.success(commonMediaResponse.data, commonMediaResponse.statusText, commonMediaResponse.url);
                    }

                    if (config.complete) {
                        config.complete(requestObject, commonMediaResponse.statusText);
                    }
                } else {
                    // If we get a 404 to a media segment we should check the client clock again and perform a UTC sync in the background.
                    try {
                        if (commonMediaResponse.status === 404 && settings.get().streaming.utcSynchronization.enableBackgroundSyncAfterSegmentDownloadError && requestObject.type === HTTPRequest.MEDIA_SEGMENT_TYPE) {
                            // Only trigger a sync if the loading failed for the first time
                            const initialNumberOfAttempts = mediaPlayerModel.getRetryAttemptsForType(HTTPRequest.MEDIA_SEGMENT_TYPE);
                            if (initialNumberOfAttempts === remainingAttempts) {
                                eventBus.trigger(Events.ATTEMPT_BACKGROUND_SYNC);
                            }
                        }
                    } catch (e) {
                    }

                    _retriggerRequest();
                }
            });
        };

        const _updateRequestTimingInfo = function () {
            requestObject.startDate = requestStartTime;
            requestObject.endDate = new Date();
            requestObject.firstByteDate = requestObject.firstByteDate || requestStartTime;
        }

        const _updateResourceTimingInfo = function () {
            commonMediaResponse.resourceTiming.responseEnd = Date.now();

            // If enabled the ResourceTimingApi we add the corresponding information to the request object.
            // These values are more accurate and can be used by the ThroughputController later
            _addResourceTimingValues(commonMediaRequest, commonMediaResponse);
        }

        const _loadRequest = function (loader, httpRequest, httpResponse) {
            return new Promise((resolve) => {
                _applyRequestInterceptors(httpRequest).then((_httpRequest) => {
                    httpRequest = _httpRequest;
                    httpResponse.request = httpRequest;
                    httpRequest.customData.onloadend = _onloadend;
                    httpRequest.customData.onprogress = _onprogress;
                    httpRequest.customData.onabort = _onabort;
                    httpRequest.customData.ontimeout = _ontimeout;

                    httpResponse.resourceTiming.startTime = Date.now();
                    loader.load(httpRequest, httpResponse);
                    resolve();
                });
            });
        }

        /**
         * Retriggers the request in case we did not exceed the number of retry attempts
         * @private
         */
        const _retriggerRequest = function () {
            if (remainingAttempts > 0) {
                remainingAttempts--;
                if (config && config.request) {
                    config.request.retryAttempts += 1;
                }
                let retryRequest = { config: config };
                retryRequests.push(retryRequest);
                retryRequest.timeout = setTimeout(function () {
                    if (retryRequests.indexOf(retryRequest) === -1) {
                        return;
                    } else {
                        retryRequests.splice(retryRequests.indexOf(retryRequest), 1);
                    }
                    _internalLoad(config, remainingAttempts);
                }, mediaPlayerModel.getRetryIntervalsForType(requestObject.type));
            } else {
                if (requestObject.type === HTTPRequest.MSS_FRAGMENT_INFO_SEGMENT_TYPE) {
                    return;
                }

                errHandler.error(new DashJSError(downloadErrorToRequestTypeMap[requestObject.type], requestObject.url + ' is not available', {
                    request: requestObject,
                    response: commonMediaResponse
                }));

                if (config.error) {
                    config.error(requestObject, 'error', commonMediaResponse.statusText, commonMediaResponse);
                }

                if (config.complete) {
                    config.complete(requestObject, commonMediaResponse.statusText);
                }
            }
        }

        // Main code after inline functions
        const requestObject = config.request;
        const traces = [];
        let firstProgress, requestStartTime, lastTraceTime, lastTraceReceivedCount, progressTimeout;

        let commonMediaRequest;
        let commonMediaResponse;

        requestObject.bytesLoaded = NaN;
        requestObject.bytesTotal = NaN;
        requestObject.firstByteDate = null;
        requestObject.traces = [];
        firstProgress = true;
        requestStartTime = new Date();
        lastTraceTime = requestStartTime;
        lastTraceReceivedCount = 0;
        progressTimeout = null;

        if (!dashMetrics || !errHandler) {
            throw new Error('config object is not correct or missing');
        }

        const loaderInformation = _getLoader(requestObject);
        const loader = loaderInformation.loader;
        requestObject.fileLoaderType = loaderInformation.fileLoaderType;

        requestObject.headers = {};
        _updateRequestUrlAndHeaders(requestObject);
        if (requestObject.range) {
            requestObject.headers['Range'] = 'bytes=' + requestObject.range;
        }
        const withCredentials = customParametersModel.getXHRWithCredentialsForType(requestObject.type);


        commonMediaRequest = new CommonMediaRequest({
            url: requestObject.url,
            method: HTTPRequest.GET,
            responseType: requestObject.responseType,
            headers: requestObject.headers,
            credentials: withCredentials ? 'include' : 'omit',
            timeout: requestTimeout,
            customData: { request: requestObject }
        });

        commonMediaResponse = new CommonMediaResponse({
            request: commonMediaRequest,
            resourceTiming: {
                startTime: Date.now(),
                encodedBodySize: 0
            },
            status: 0
        });

        // Adds the ability to delay single fragment loading time to control buffer.
        let now = new Date().getTime();
        if (isNaN(requestObject.delayLoadingTime) || now >= requestObject.delayLoadingTime) {
            // no delay - just send
            httpRequests.push(commonMediaRequest);
            return _loadRequest(loader, commonMediaRequest, commonMediaResponse);
        } else {
            // delay
            let delayedRequest = {
                httpRequest: commonMediaRequest,
                httpResponse: commonMediaResponse
            };
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
                    httpRequests.push(delayedRequest.httpRequest);
                    _loadRequest(loader, delayedRequest.httpRequest, delayedRequest.httpResponse);
                } catch (e) {
                    delayedRequest.httpRequest.onloadend();
                }
            }, (requestObject.delayLoadingTime - now));

            return Promise.resolve();
        }
    }

    function _applyRequestInterceptors(httpRequest) {
        const interceptors = customParametersModel.getRequestInterceptors();
        if (!interceptors) {
            return Promise.resolve(httpRequest);
        }

        return interceptors.reduce((prev, next) => {
            return prev.then((request) => {
                return next(request);
            });
        }, Promise.resolve(httpRequest));
    }

    function _applyResponseInterceptors(response) {
        const interceptors = customParametersModel.getResponseInterceptors();
        if (!interceptors) {
            return Promise.resolve(response);
        }

        return interceptors.reduce((prev, next) => {
            return prev.then(resp => {
                return next(resp);
            });
        }, Promise.resolve(response));
    }

    function _addHttpRequestMetric(httpRequest, httpResponse, traces) {
        const requestObject = httpRequest.customData.request;
        const cmsd = settings.get().streaming.cmsd && settings.get().streaming.cmsd.enabled ? cmsdModel.parseResponseHeaders(httpResponse.headers, requestObject.mediaType) : null;
        dashMetrics.addHttpRequest(requestObject, httpResponse.url, httpResponse.status, httpResponse.headers, traces, cmsd);
    }

    /**
     * Adds the values from the Resource Timing API, see https://developer.mozilla.org/en-US/docs/Web/API/Resource_Timing_API/Using_the_Resource_Timing_API
     * @param requestObject
     * @private
     */
    function _addResourceTimingValues(httpRequest, httpResponse) {
        if (!settings.get().streaming.abr.throughput.useResourceTimingApi) {
            return;
        }
        // Check performance support. We do not support range requests, needs to figure out how to find the right resource here.
        if (typeof performance === 'undefined' || httpRequest.range) {
            return;
        }

        // Get a list of "resource" performance entries
        const resources = performance.getEntriesByType('resource');
        if (resources === undefined || resources.length <= 0) {
            return;
        }

        // Find the right resource
        let i = 0;
        let resource = null;
        while (i < resources.length) {
            if (resources[i].name === httpRequest.url) {
                resource = resources[i];
                break;
            }
            i += 1;
        }

        // Check if PerformanceResourceTiming values are usable
        // Note: to allow seeing cross-origin timing information, the Timing-Allow-Origin HTTP response header needs to be set
        // See https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming#cross-origin_timing_information
        if (!_areResourceTimingValuesUsable(resource)) {
            return;
        }

        httpRequest.customData.request.resourceTimingValues = resource;

        // Update CommonMediaResponse Resource Timing info
        httpResponse.resourceTiming.startTime = resource.startTime;
        httpResponse.resourceTiming.encodedBodySize = resource.encodedBodySize;
        httpResponse.resourceTiming.responseStart = resource.startTime;
        httpResponse.resourceTiming.responseEnd = resource.responseEnd;
        httpResponse.resourceTiming.duration = resource.duration;
    }

    /**
     * Checks if we got usable ResourceTimingAPI values
     * @param httpRequest
     * @returns {boolean}
     * @private
     */
    function _areResourceTimingValuesUsable(resource) {
        return resource &&
            !isNaN(resource.responseStart) && resource.responseStart > 0 &&
            !isNaN(resource.responseEnd) && resource.responseEnd > 0 &&
            !isNaN(resource.transferSize) && resource.transferSize > 0
    }

    /**
     * Returns either the FetchLoader or the XHRLoader depending on the request type and playback mode.
     * @param {object} request
     * @return {*}
     * @private
     */
    function _getLoader(request) {
        let loader;
        let fileLoaderType;

        if (request.hasOwnProperty('availabilityTimeComplete') && request.availabilityTimeComplete === false && window.fetch && request.responseType === 'arraybuffer' && request.type === HTTPRequest.MEDIA_SEGMENT_TYPE) {
            if (!fetchLoader) {
                fetchLoader = FetchLoader(context).create();
                fetchLoader.setConfig({
                    dashMetrics,
                    boxParser
                });
            }
            loader = fetchLoader;
            fileLoaderType = Constants.FILE_LOADER_TYPES.FETCH;
        } else {
            if (!xhrLoader) {
                xhrLoader = XHRLoader(context).create();
            }
            loader = xhrLoader;
            fileLoaderType = Constants.FILE_LOADER_TYPES.XHR;
        }

        return { loader, fileLoaderType };
    }

    /**
     * Updates the request url and headers according to CMCD and content steering (pathway cloning)
     * @param request
     * @private
     */
    function _updateRequestUrlAndHeaders(request) {
        if (request.retryAttempts === 0) {
            _addExtUrlQueryParameters(request);
        }
        _addPathwayCloningParameters(request);
        _addCommonAccessToken(request);
    }

    function _addExtUrlQueryParameters(request) {
        // Add ExtUrlQueryInfo parameters
        let finalQueryString = extUrlQueryInfoController.getFinalQueryString(request);
        if (finalQueryString) {
            request.url = Utils.addAdditionalQueryParameterToUrl(request.url, finalQueryString);
        }
    }

    function _addPathwayCloningParameters(request) {
        // Add queryParams that came from pathway cloning
        if (request.queryParams) {
            const queryParams = Object.keys(request.queryParams).map((key) => {
                return {
                    key,
                    value: request.queryParams[key]
                }
            })
            request.url = Utils.addAdditionalQueryParameterToUrl(request.url, queryParams);
        }
    }

    function _addCommonAccessToken(request) {
        const commonAccessToken = commonAccessTokenController.getCommonAccessTokenForUrl(request.url)
        if (commonAccessToken) {
            request.headers[Constants.COMMON_ACCESS_TOKEN_HEADER] = commonAccessToken
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

        httpRequests.forEach(req => {
            const reqData = req.customData
            if (!reqData) {
                return
            }
            // MSS patch: ignore FragmentInfo requests
            if (reqData.request && reqData.request.type === HTTPRequest.MSS_FRAGMENT_INFO_SEGMENT_TYPE) {
                return;
            }

            // abort will trigger onloadend which we don't want
            // when deliberately aborting inflight requests -
            // set them to undefined so they are not called
            reqData.onloadend = reqData.onprogress = undefined;
            if (reqData.abort) {
                reqData.abort();
            }
        });
        httpRequests = [];
    }

    function resetInitialSettings() {
        if (xhrLoader) {
            xhrLoader.resetInitialSettings();
        }
    }

    function reset() {
        httpRequests = [];
        delayedRequests = [];
        retryRequests = [];
        if (xhrLoader) {
            xhrLoader.reset();
        }
        if (fetchLoader) {
            fetchLoader.reset();
        }
        xhrLoader = null;
        fetchLoader = null;
    }

    instance = {
        abort,
        load,
        reset,
        resetInitialSettings,
        setConfig,
    };

    setup();

    return instance;
}

HTTPLoader.__dashjs_factory_name = 'HTTPLoader';

const factory = FactoryMaker.getClassFactory(HTTPLoader);
export default factory;
