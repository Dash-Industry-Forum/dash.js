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
import Debug from '../../core/Debug';
import URLLoader from '../../streaming/net/URLLoader';
import Errors from '../../core/errors/Errors';
import ContentSteeringRequest from '../vo/ContentSteeringRequest';
import ContentSteeringResponse from '../vo/ContentSteeringResponse';
import DashConstants from '../constants/DashConstants';
import MediaPlayerEvents from '../../streaming/MediaPlayerEvents';
import Events from '../../core/events/Events';
import Constants from '../../streaming/constants/Constants';
import Utils from '../../core/Utils';
import URLUtils from '../../streaming/utils/URLUtils';

const QUERY_PARAMETER_KEYS = {
    THROUGHPUT: '_DASH_throughput',
    PATHWAY: '_DASH_pathway',
    URL: 'url'
}

function ContentSteeringController() {
    const context = this.context;
    const urlUtils = URLUtils(context).getInstance();

    let instance,
        logger,
        currentSteeringResponseData,
        activeStreamInfo,
        currentSelectedServiceLocation,
        nextRequestTimer,
        urlLoader,
        errHandler,
        dashMetrics,
        mediaPlayerModel,
        manifestModel,
        requestModifier,
        abrController,
        eventBus,
        adapter;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        _resetInitialSettings();
    }

    function setConfig(config) {
        if (!config) return;

        if (config.adapter) {
            adapter = config.adapter;
        }
        if (config.errHandler) {
            errHandler = config.errHandler;
        }
        if (config.dashMetrics) {
            dashMetrics = config.dashMetrics;
        }
        if (config.mediaPlayerModel) {
            mediaPlayerModel = config.mediaPlayerModel;
        }
        if (config.requestModifier) {
            requestModifier = config.requestModifier;
        }
        if (config.manifestModel) {
            manifestModel = config.manifestModel;
        }
        if (config.abrController) {
            abrController = config.abrController;
        }
        if (config.eventBus) {
            eventBus = config.eventBus;
        }
    }

    function initialize() {
        urlLoader = URLLoader(context).create({
            errHandler,
            dashMetrics,
            mediaPlayerModel,
            requestModifier,
            errors: Errors
        });
        eventBus.on(MediaPlayerEvents.PERIOD_SWITCH_COMPLETED, _onPeriodSwitchCompleted, instance);
        eventBus.on(Events.FRAGMENT_LOADING_STARTED, _onFragmentLoadingStarted, instance);
    }

    function _onPeriodSwitchCompleted(e) {
        if (e && e.toStreamInfo) {
            activeStreamInfo = e.toStreamInfo;
        }
    }

    function _onFragmentLoadingStarted(e) {
        if (e && e.request && e.request.serviceLocation) {
            currentSelectedServiceLocation = e.request.serviceLocation;
        }
    }

    function getSteeringDataFromManifest() {
        const manifest = manifestModel.getValue()
        return adapter.getContentSteering(manifest);
    }

    function shouldQueryBeforeStart() {
        const steeringDataFromManifest = getSteeringDataFromManifest();
        return steeringDataFromManifest && steeringDataFromManifest.queryBeforeStart;
    }

    function loadSteeringData() {
        return new Promise((resolve) => {
            try {
                const steeringDataFromManifest = getSteeringDataFromManifest();
                if (!steeringDataFromManifest || !steeringDataFromManifest.serverUrl) {
                    resolve();
                    return;
                }

                const url = _getSteeringServerUrl(steeringDataFromManifest);
                const request = new ContentSteeringRequest(url);
                urlLoader.load({
                    request: request,
                    success: (data) => {
                        _handleSteeringResponse(data);
                        eventBus.trigger(MediaPlayerEvents.CONTENT_STEERING_REQUEST_COMPLETED, {
                            currentSteeringResponseData,
                            url
                        });
                        resolve();
                    },
                    error: (e) => {
                        _handleSteeringResponseError(e);
                        resolve(e);
                    }
                });
            } catch (e) {
                resolve(e);
            }
        })
    }

    function _getSteeringServerUrl(steeringDataFromManifest) {
        let url = steeringDataFromManifest.proxyServerUrl ? steeringDataFromManifest.proxyServerUrl : steeringDataFromManifest.serverUrl;
        if (currentSteeringResponseData && currentSteeringResponseData.reloadUri) {
            if (urlUtils.isRelative(currentSteeringResponseData.reloadUri)) {
                url = urlUtils.resolve(currentSteeringResponseData.reloadUri, steeringDataFromManifest.serverUrl);
            } else {
                url = currentSteeringResponseData.reloadUri;
            }
        }

        const additionalQueryParameter = [];

        // Add throughput value to list of query parameters
        if (activeStreamInfo) {
            const isDynamic = adapter.getIsDynamic();
            const mediaType = adapter.getAllMediaInfoForType(activeStreamInfo, Constants.VIDEO).length > 0 ? Constants.VIDEO : Constants.AUDIO;
            const throughputHistory = abrController.getThroughputHistory();
            const throughput = throughputHistory ? throughputHistory.getAverageThroughput(mediaType, isDynamic) : NaN;
            if (!isNaN(throughput)) {
                additionalQueryParameter.push({ key: QUERY_PARAMETER_KEYS.THROUGHPUT, value: throughput * 1000 });
            }
        }

        // Ass pathway parameter/currently selected service location to list of query parameters
        if (currentSelectedServiceLocation) {
            additionalQueryParameter.push({ key: QUERY_PARAMETER_KEYS.PATHWAY, value: currentSelectedServiceLocation });
        }

        // If we use the value in proxyServerUrl we add the original url as query parameter
        if (steeringDataFromManifest.proxyServerUrl && steeringDataFromManifest.proxyServerUrl === url && steeringDataFromManifest.serverUrl) {
            additionalQueryParameter.push({
                key: QUERY_PARAMETER_KEYS.URL,
                value: encodeURI(steeringDataFromManifest.serverUrl)
            })
        }

        url = Utils.addAditionalQueryParameterToUrl(url, additionalQueryParameter);
        return url;
    }


    function _handleSteeringResponse(data) {
        if (!data || !data[DashConstants.CONTENT_STEERING_RESPONSE.VERSION] || parseInt(data[DashConstants.CONTENT_STEERING_RESPONSE.VERSION]) !== 1) {
            return;
        }

        // Update the data for other classes to use
        currentSteeringResponseData = new ContentSteeringResponse();
        currentSteeringResponseData.version = data[DashConstants.CONTENT_STEERING_RESPONSE.VERSION];

        if (data[DashConstants.CONTENT_STEERING_RESPONSE.TTL] && !isNaN(data[DashConstants.CONTENT_STEERING_RESPONSE.TTL])) {
            currentSteeringResponseData.ttl = data[DashConstants.CONTENT_STEERING_RESPONSE.TTL];
        }
        if (data[DashConstants.CONTENT_STEERING_RESPONSE.RELOAD_URI]) {
            currentSteeringResponseData.reloadUri = data[DashConstants.CONTENT_STEERING_RESPONSE.RELOAD_URI]
        }
        if (data[DashConstants.CONTENT_STEERING_RESPONSE.SERVICE_LOCATION_PRIORITY]) {
            currentSteeringResponseData.serviceLocationPriority = data[DashConstants.CONTENT_STEERING_RESPONSE.SERVICE_LOCATION_PRIORITY]
        }

        _startSteeringRequestTimer();
    }

    function _startSteeringRequestTimer() {
        // Start timer for next request
        if (currentSteeringResponseData && currentSteeringResponseData.ttl && !isNaN(currentSteeringResponseData.ttl)) {
            if (nextRequestTimer) {
                clearTimeout(nextRequestTimer);
            }
            nextRequestTimer = setTimeout(() => {
                loadSteeringData();
            }, currentSteeringResponseData.ttl * 1000);
        }
    }

    function stopSteeringRequestTimer() {
        if (nextRequestTimer) {
            clearTimeout(nextRequestTimer);
        }
        nextRequestTimer = null;
    }

    function _handleSteeringResponseError(e) {
        logger.warn(`Error fetching data from content steering server`, e);
        _startSteeringRequestTimer();
    }

    function getCurrentSteeringResponseData() {
        return currentSteeringResponseData;
    }

    function reset() {
        _resetInitialSettings();
        eventBus.off(MediaPlayerEvents.PERIOD_SWITCH_COMPLETED, _onPeriodSwitchCompleted, instance);
        eventBus.off(Events.FRAGMENT_LOADING_STARTED, _onFragmentLoadingStarted, instance);
    }

    function _resetInitialSettings() {
        currentSteeringResponseData = null;
        activeStreamInfo = null;
        currentSelectedServiceLocation = null;
        stopSteeringRequestTimer()
    }


    instance = {
        reset,
        setConfig,
        loadSteeringData,
        getCurrentSteeringResponseData,
        shouldQueryBeforeStart,
        getSteeringDataFromManifest,
        stopSteeringRequestTimer,
        initialize
    };

    setup();

    return instance;
}

ContentSteeringController.__dashjs_factory_name = 'ContentSteeringController';
export default FactoryMaker.getSingletonFactory(ContentSteeringController);
