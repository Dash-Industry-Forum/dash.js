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
import CmsdModel from '../models/CmsdModel';
import Utils from '../../core/Utils';
import Debug from '../../core/Debug';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import Settings from '../../core/Settings';
import Constants from '../constants/Constants';
import CustomParametersModel from '../models/CustomParametersModel';
import HttpLoaderRequest from '../vo/HttpLoaderRequest';

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
    const requestModifier = cfg.requestModifier;
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
        cmcdModel,
        cmsdModel,
        xhrLoader,
        fetchLoader,
        customParametersModel,
        logger;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        httpRequests = [];
        delayedRequests = [];
        retryRequests = [];
        cmcdModel = CmcdModel(context).getInstance();
        cmsdModel = CmsdModel(context).getInstance();
        customParametersModel = CustomParametersModel(context).getInstance();

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

    /**
     * Initiates a download of the resource described by config.request.
     * @param {Object} config - contains request (FragmentRequest or derived type), and callbacks
     * @memberof module:HTTPLoader
     * @instance
     */
    function load(config) {
        if (config.request) {
            const retryAttempts = mediaPlayerModel.getRetryAttemptsForType(config.request.type);
            _internalLoad(config, retryAttempts);
        } else {
            if (config.error) {
                config.error(config.request, 'error');
            }
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
         * Fired when a request has completed, whether successfully (after load) or unsuccessfully (after abort or error).
         */
        const _onloadend = function () {
            // Remove the request from our list of requests
            if (httpRequests.indexOf(httpRequest) !== -1) {
                httpRequests.splice(httpRequests.indexOf(httpRequest), 1);
            }

            if (progressTimeout) {
                clearTimeout(progressTimeout);
                progressTimeout = null;
            }
        };

        /**
         * Fired when a request has started to load data.
         * @param event
         */
        const _progress = function (event) {
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
                }
            }

            // lengthComputable indicating if the resource concerned by the ProgressEvent has a length that can be calculated. If not, the ProgressEvent.total property has no significant value.
            if (event.lengthComputable) {
                requestObject.bytesLoaded = event.loaded;
                requestObject.bytesTotal = event.total;
            }

            if (!event.noTrace) {
                traces.push({
                    s: lastTraceTime,
                    d: event.time ? event.time : currentTime.getTime() - lastTraceTime.getTime(),
                    b: [event.loaded ? event.loaded - lastTraceReceivedCount : 0], // event.loaded: When downloading a resource using HTTP, this value is specified in bytes (not bits), and only represents the part of the content itself, not headers and other overhead
                    t: event.throughput
                });

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
                    logger.warn('Abort request ' + httpRequest.url + ' due to progress timeout');
                    httpRequest.response.onabort = null;
                    httpRequest.loader.abort(httpRequest);
                    _onloadend();
                }, settings.get().streaming.fragmentRequestProgressTimeout);
            }

            if (config.progress && event) {
                config.progress(event);
            }
        };

        /**
         * Fired when an XMLHttpRequest transaction completes.
         * This includes status codes such as 404. We handle errors in the _onError function.
         */
        const _onload = function () {
            if (httpRequest.response.status >= 200 && httpRequest.response.status <= 299) {
                _handleLoaded(true, requestObject, httpRequest, traces, requestStartTime, fileLoaderType);

                if (config.success) {
                    config.success(httpRequest.response.response, httpRequest.response.statusText, httpRequest.response.responseURL);
                }

                if (config.complete) {
                    config.complete(requestObject, httpRequest.response.statusText);
                }

            } else {
                _onerror();
            }
        };

        /**
         * Fired when a request has been aborted, for example because the program called XMLHttpRequest.abort().
         */
        const _onabort = function () {
            _addHttpRequestMetric(requestObject, requestStartTime, fileLoaderType, httpRequest, true, traces);
            if (progressTimeout) {
                clearTimeout(progressTimeout);
                progressTimeout = null;
            }
            if (config.abort) {
                config.abort(requestObject);
            }
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
            _addHttpRequestMetric(requestObject, requestStartTime, fileLoaderType, httpRequest, true, traces);
            _retriggerRequest();
        };

        /**
         * Fired when the request encountered an error.
         */
        const _onerror = function () {
            _handleLoaded(false, requestObject, httpRequest, traces, requestStartTime, fileLoaderType);

            // If we get a 404 to a media segment we should check the client clock again and perform a UTC sync in the background.
            try {
                if (httpRequest.response.status === 404 && settings.get().streaming.utcSynchronization.enableBackgroundSyncAfterSegmentDownloadError && requestObject.type === HTTPRequest.MEDIA_SEGMENT_TYPE) {
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

        /**
         * Retriggers the request in case we did not exceed the number of retry attempts
         * @private
         */
        const _retriggerRequest = function () {
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
                    _internalLoad(config, remainingAttempts);
                }, mediaPlayerModel.getRetryIntervalsForType(requestObject.type));
            } else {
                if (requestObject.type === HTTPRequest.MSS_FRAGMENT_INFO_SEGMENT_TYPE) {
                    return;
                }

                errHandler.error(new DashJSError(downloadErrorToRequestTypeMap[requestObject.type], requestObject.url + ' is not available', {
                    request: requestObject,
                    response: httpRequest.response
                }));

                if (config.error) {
                    config.error(requestObject, 'error', httpRequest.response.statusText, httpRequest.response);
                }

                if (config.complete) {
                    config.complete(requestObject, httpRequest.response.statusText);
                }
            }
        }

        // Main code after inline functions
        const requestObject = config.request;
        const traces = [];
        let firstProgress, requestStartTime, lastTraceTime, lastTraceReceivedCount, fileLoaderType, httpRequest,
            progressTimeout;

        requestObject.bytesLoaded = NaN;
        requestObject.bytesTotal = NaN;
        requestObject.firstByteDate = null;
        firstProgress = true;
        requestStartTime = new Date();
        lastTraceTime = requestStartTime;
        lastTraceReceivedCount = 0;
        fileLoaderType = '';
        progressTimeout = null;

        if (!requestModifier || !dashMetrics || !errHandler) {
            throw new Error('config object is not correct or missing');
        }

        const loaderInformation = _getLoader(requestObject);
        const loader = loaderInformation.loader;
        fileLoaderType = loaderInformation.fileLoaderType;
        const modifiedRequestParams = _getModifiedRequestHeaderAndUrl(requestObject);
        requestObject.url = modifiedRequestParams.url;
        const method = requestObject.checkExistenceOnly ? HTTPRequest.HEAD : HTTPRequest.GET;
        const withCredentials = customParametersModel.getXHRWithCredentialsForType(requestObject.type);

        httpRequest = new HttpLoaderRequest({
            url: modifiedRequestParams.url,
            method,
            withCredentials,
            request: requestObject,
            onload: _onload,
            onloadend: _onloadend,
            onerror: _onerror,
            progress: _progress,
            onabort: _onabort,
            ontimeout: _ontimeout,
            loader,
            timeout: requestTimeout,
            headers: modifiedRequestParams.headers
        });

        // Adds the ability to delay single fragment loading time to control buffer.
        let now = new Date().getTime();
        if (isNaN(requestObject.delayLoadingTime) || now >= requestObject.delayLoadingTime) {
            // no delay - just send
            httpRequests.push(httpRequest);
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
                    httpRequests.push(delayedRequest.httpRequest);
                    loader.load(delayedRequest.httpRequest);
                } catch (e) {
                    delayedRequest.httpRequest.onerror();
                }
            }, (requestObject.delayLoadingTime - now));
        }
    }

    /**
     * Function to be called after the request has been loaded. Either successfully or unsuccesfully
     * @param {boolean} success
     * @param {object} requestObject
     * @param {object} httpRequest
     * @param {array} traces
     * @param {date} requestStartTime
     * @param {string} fileLoaderType
     * @private
     */
    function _handleLoaded(success, requestObject, httpRequest, traces, requestStartTime, fileLoaderType) {
        // If enabled the ResourceTimingApi we add the corresponding information to the request object.
        // These values are more accurate and can be used by the ThroughputController later
        if (settings.get().streaming.abr.throughput.useResourceTimingApi) {
            _addResourceTimingValues(requestObject);
        }

        if (!requestObject.checkExistenceOnly) {
            _addHttpRequestMetric(requestObject, requestStartTime, fileLoaderType, httpRequest, success, traces);

            if (requestObject.type === HTTPRequest.MPD_TYPE) {
                dashMetrics.addManifestUpdate(requestObject);
                eventBus.trigger(Events.MANIFEST_LOADING_FINISHED, { requestObject });
            }
        }
    }

    function _addHttpRequestMetric(requestObject, requestStartTime, fileLoaderType, httpRequest, success, traces) {
        requestObject.startDate = requestStartTime;
        requestObject.endDate = new Date();
        requestObject.firstByteDate = requestObject.firstByteDate || requestStartTime;
        requestObject.fileLoaderType = fileLoaderType;

        const responseUrl = httpRequest.response ? httpRequest.response.responseURL : null;
        const responseStatus = httpRequest.response ? httpRequest.response.status : null;
        const responseHeaders = httpRequest.response && httpRequest.response.getAllResponseHeaders ? httpRequest.response.getAllResponseHeaders() :
            httpRequest.response ? httpRequest.response.responseHeaders : null;

        const cmsd = responseHeaders && settings.get().streaming.cmsd && settings.get().streaming.cmsd.enabled ? cmsdModel.parseResponseHeaders(responseHeaders, requestObject.mediaType) : null;
        dashMetrics.addHttpRequest(requestObject, responseUrl, responseStatus, responseHeaders, success ? traces : null, cmsd);
    }

    /**
     * Adds the values from the Resource Timing API, see https://developer.mozilla.org/en-US/docs/Web/API/Resource_Timing_API/Using_the_Resource_Timing_API
     * @param requestObject
     * @private
     */
    function _addResourceTimingValues(requestObject) {
        // Check performance support. We do not support range requests, needs to figure out how to find the right resource here.
        if (typeof performance === 'undefined' || requestObject.range) {
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
            if (resources[i].name === requestObject.url) {
                resource = resources[i];
                break;
            }
            i += 1;
        }

        requestObject.resourceTimingValues = resource;
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
                    requestModifier,
                    boxParser
                });
            }
            loader = fetchLoader;
            fileLoaderType = Constants.FILE_LOADER_TYPES.FETCH;
        } else {
            if (!xhrLoader) {
                xhrLoader = XHRLoader(context).create({
                    requestModifier
                });
            }
            loader = xhrLoader;
            fileLoaderType = Constants.FILE_LOADER_TYPES.XHR;
        }

        return { loader, fileLoaderType };
    }

    /**
     * Modifies the request headers and the request url. Uses the requestModifier and the CMCDModel
     * @param request
     * @return {{headers: null, url}}
     * @private
     */
    function _getModifiedRequestHeaderAndUrl(request) {
        let url;
        let headers = null;

        url = requestModifier.modifyRequestURL ? requestModifier.modifyRequestURL(request.url) : request.url;

        if (settings.get().streaming.cmcd && settings.get().streaming.cmcd.enabled) {
            const cmcdMode = settings.get().streaming.cmcd.mode;
            if (cmcdMode === Constants.CMCD_MODE_QUERY) {
                const additionalQueryParameter = _getAdditionalQueryParameter(request);
                url = Utils.addAditionalQueryParameterToUrl(url, additionalQueryParameter);
            } else if (cmcdMode === Constants.CMCD_MODE_HEADER) {
                headers = cmcdModel.getHeaderParameters(request);
            }
        }

        // Add queryParams that came from pathway cloning
        if (request.queryParams) {
            const queryParams = Object.keys(request.queryParams).map((key) => {
                return {
                    key,
                    value: request.queryParams[key]
                }
            })
            url = Utils.addAditionalQueryParameterToUrl(url, queryParams);
        }

        return {
            url,
            headers
        }
    }

    /**
     * Generates the additional query parameters to be appended to the request url
     * @param {object} request
     * @return {array}
     * @private
     */
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

        httpRequests.forEach(x => {
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
        httpRequests = [];
    }

    instance = {
        load,
        abort
    };

    setup();

    return instance;
}

HTTPLoader.__dashjs_factory_name = 'HTTPLoader';

const factory = FactoryMaker.getClassFactory(HTTPLoader);
export default factory;
