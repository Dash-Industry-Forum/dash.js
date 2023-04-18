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
import Utils from '../../core/Utils';
import URLUtils from '../../streaming/utils/URLUtils';

const QUERY_PARAMETER_KEYS = {
    THROUGHPUT: '_DASH_throughput',
    PATHWAY: '_DASH_pathway',
    URL: 'url'
};

const THROUGHPUT_SAMPLES = 4;

function ContentSteeringController() {
    const context = this.context;
    const urlUtils = URLUtils(context).getInstance();

    let instance,
        logger,
        currentSteeringResponseData,
        serviceLocationList,
        throughputList,
        nextRequestTimer,
        urlLoader,
        errHandler,
        dashMetrics,
        mediaPlayerModel,
        manifestModel,
        requestModifier,
        serviceDescriptionController,
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
        if (config.serviceDescriptionController) {
            serviceDescriptionController = config.serviceDescriptionController;
        }
        if (config.eventBus) {
            eventBus = config.eventBus;
        }
    }

    /**
     * Initialize the steering controller by instantiating classes and registering observer callback
     */
    function initialize() {
        urlLoader = URLLoader(context).create({
            errHandler,
            dashMetrics,
            mediaPlayerModel,
            requestModifier,
            errors: Errors
        });
        eventBus.on(MediaPlayerEvents.FRAGMENT_LOADING_STARTED, _onFragmentLoadingStarted, instance);
        eventBus.on(MediaPlayerEvents.MANIFEST_LOADING_STARTED, _onManifestLoadingStarted, instance);
        eventBus.on(MediaPlayerEvents.THROUGHPUT_MEASUREMENT_STORED, _onThroughputMeasurementStored, instance);

    }

    /**
     *
     * @param {object} e
     * @private
     */
    function _onFragmentLoadingStarted(e) {
        _addToServiceLocationList(e, 'baseUrl');
    }

    /**
     *
     * @param {object} e
     * @private
     */
    function _onManifestLoadingStarted(e) {
        _addToServiceLocationList(e, 'location')
    }

    function _onThroughputMeasurementStored(e) {
        if (!e || !e.httpRequest || !e.httpRequest._serviceLocation || isNaN(e.throughput)) {
            return;
        }
        const serviceLocation = e.httpRequest._serviceLocation;
        if (!throughputList[serviceLocation]) {
            throughputList[serviceLocation] = [];
        }
        throughputList[serviceLocation].push(e.throughput * 1000)
        if (throughputList[serviceLocation].length > THROUGHPUT_SAMPLES) {
            throughputList[serviceLocation].shift();
        }
    }

    /**
     * Adds a new service location entry to our list
     * @param {object} e
     * @param {string} type
     * @private
     */
    function _addToServiceLocationList(e, type) {
        if (e && e.request && e.request.serviceLocation) {
            const serviceLocation = e.request.serviceLocation;
            if (serviceLocationList[type].all.indexOf(serviceLocation) === -1) {
                serviceLocationList[type].all.push(serviceLocation)
            }
            serviceLocationList[type].current = serviceLocation;
        }
    }

    function getSteeringDataFromManifest() {
        const manifest = manifestModel.getValue()
        let contentSteeringData = adapter.getContentSteering(manifest);

        if (!contentSteeringData) {
            contentSteeringData = serviceDescriptionController.getServiceDescriptionSettings().contentSteering;
        }

        return contentSteeringData;
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
                    error: (e, error, statusText, response) => {
                        _handleSteeringResponseError(e, response);
                        resolve(e);
                    },
                    complete: () => {
                        // Clear everything except for the current entry
                        serviceLocationList.baseUrl.all = _clearServiceLocationListAfterSteeringRequest(serviceLocationList.baseUrl);
                        serviceLocationList.location.all = _clearServiceLocationListAfterSteeringRequest(serviceLocationList.location);
                    }
                });
            } catch (e) {
                resolve(e);
            }
        })
    }

    function _clearServiceLocationListAfterSteeringRequest(data) {
        if (!data.all || data.all.length === 0 || !data.current) {
            return [];
        }
        return data.all.filter((entry) => {
            return entry === data.current;
        })
    }

    function _getSteeringServerUrl(steeringDataFromManifest) {
        let url = steeringDataFromManifest.serverUrl;
        if (currentSteeringResponseData && currentSteeringResponseData.reloadUri) {
            if (urlUtils.isRelative(currentSteeringResponseData.reloadUri)) {
                url = urlUtils.resolve(currentSteeringResponseData.reloadUri, steeringDataFromManifest.serverUrl);
            } else {
                url = currentSteeringResponseData.reloadUri;
            }
        }

        const additionalQueryParameter = [];


        const serviceLocations = serviceLocationList.baseUrl.all.concat(serviceLocationList.location.all);
        if (serviceLocations.length > 0) {

            // Add pathway parameter/currently selected service location to list of query parameters
            let pathwayString = serviceLocations.toString();
            additionalQueryParameter.push({
                key: QUERY_PARAMETER_KEYS.PATHWAY,
                value: `"${pathwayString}"`
            });

            // Add throughput for each service location in pathway parameter
            let throughputString = serviceLocations.reduce((acc, curr) => {
                const throughput = _calculateThroughputForServiceLocation(curr);
                return `${acc}${throughput},`;
            }, '')
            // Remove last comma at the end
            throughputString = throughputString.replace(/,\s*$/, '');
            additionalQueryParameter.push({ key: QUERY_PARAMETER_KEYS.THROUGHPUT, value: throughputString });
        }

        url = Utils.addAditionalQueryParameterToUrl(url, additionalQueryParameter);
        return url;
    }

    function _calculateThroughputForServiceLocation(serviceLocation) {
        if (!serviceLocation || !throughputList[serviceLocation] || throughputList[serviceLocation].length === 0) {
            return -1;
        }

        return throughputList[serviceLocation].reduce((acc, curr) => {
            return acc + curr;
        }) / throughputList[serviceLocation].length;
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
        if (data[DashConstants.CONTENT_STEERING_RESPONSE.PATHWAY_PRIORITY]) {
            currentSteeringResponseData.pathwayPriority = data[DashConstants.CONTENT_STEERING_RESPONSE.PATHWAY_PRIORITY]
        }
        if (data[DashConstants.CONTENT_STEERING_RESPONSE.PATHWAY_CLONES]) {
            currentSteeringResponseData.pathwayClones = data[DashConstants.CONTENT_STEERING_RESPONSE.PATHWAY_CLONES]
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

    function _handleSteeringResponseError(e, response) {
        try {
            logger.warn(`Error fetching data from content steering server`, e);
            const statusCode = response.status;

            switch (statusCode) {
                // 410 response code. Stop steering
                case 410:
                    break;
                // 429 Too Many Requests. Replace existing TTL value with Retry-After header if present
                case 429:
                    const retryAfter = response && response.getResponseHeader ? response.getResponseHeader('retry-after') : null;
                    if (retryAfter !== null) {
                        if (!currentSteeringResponseData) {
                            currentSteeringResponseData = {};
                        }
                        currentSteeringResponseData.ttl = parseInt(retryAfter);
                    }
                    _startSteeringRequestTimer();
                    break;
                default:
                    _startSteeringRequestTimer();
                    break;
            }
        } catch (e) {
            logger.error(e);
        }
    }

    function getCurrentSteeringResponseData() {
        return currentSteeringResponseData;
    }

    function reset() {
        _resetInitialSettings();
        eventBus.off(MediaPlayerEvents.FRAGMENT_LOADING_STARTED, _onFragmentLoadingStarted, instance);
        eventBus.off(MediaPlayerEvents.MANIFEST_LOADING_STARTED, _onManifestLoadingStarted, instance);
        eventBus.off(MediaPlayerEvents.THROUGHPUT_MEASUREMENT_STORED, _onThroughputMeasurementStored, instance);
    }

    function _resetInitialSettings() {
        currentSteeringResponseData = null;
        throughputList = {};
        serviceLocationList = {
            baseUrl: {
                current: null,
                all: []
            },
            location: {
                current: null,
                all: []
            }
        };
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
